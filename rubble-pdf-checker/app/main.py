import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

import shutil
import uuid
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException

from store import ReferenceStore
from services.extraction import ExtractionService
from services.comparison import ComparisonService
from services.audit import AuditService
from clip_validator import _load_model, validate_images_with_clip

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TEMP_DIR = Path("/tmp/pdf-audit")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILES_AI = 10
MAX_FILES_NO_AI = 30
MAX_FILE_SIZE = 10 * 1024 * 1024

reference_store = ReferenceStore()
extraction_service = ExtractionService()
comparison_service = ComparisonService()
audit_service = AuditService(reference_store, extraction_service, comparison_service)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando PDF Checker...")
    try:
        _load_model()
    except Exception as e:
        logger.warning(f"Modelo CLIP não carregado no startup: {e}")
    yield
    logger.info("Encerrando PDF Checker...")
    reference_store.cleanup()


app = FastAPI(title="PDF Checker", version="2.0.0", lifespan=lifespan)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "clip_loaded": True,
        "reference_set": reference_store.is_set(),
        "clip_threshold": reference_store.clip_min_score,
    }


@app.post("/extract")
async def extract_pdf(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são aceitos")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"Arquivo excede {MAX_FILE_SIZE // 1024 // 1024}MB")

    file_id = str(uuid.uuid4())
    temp_path = TEMP_DIR / f"{file_id}.pdf"
    tmpdir = None
    try:
        temp_path.write_bytes(content)
        extracted, tmpdir = extraction_service.extract(str(temp_path))
        return extracted.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Erro ao extrair PDF: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao processar PDF")
    finally:
        if tmpdir:
            shutil.rmtree(tmpdir, ignore_errors=True)
        if temp_path.exists():
            temp_path.unlink()


@app.post("/set-reference")
async def set_reference(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são aceitos")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"Arquivo excede {MAX_FILE_SIZE // 1024 // 1024}MB")

    file_id = str(uuid.uuid4())
    temp_path = TEMP_DIR / f"{file_id}.pdf"
    try:
        temp_path.write_bytes(content)
        extracted, tmpdir = extraction_service.extract(str(temp_path))

        ref_clip_results = validate_images_with_clip(
            extracted.model_dump()["images"], extracted.photo_labels
        )
        ref_scores = [r.get("score", 1.0) for r in ref_clip_results if "score" in r]
        clip_min_score = min(ref_scores) if ref_scores else 0.5

        photo_scores = []
        labels = extracted.photo_labels
        for i, r in enumerate(ref_clip_results):
            photo_scores.append({
                "index": i,
                "label": labels[i] if i < len(labels) else f"Foto {i + 1}",
                "score": r.get("score", 0),
                "approved": r.get("score", 0) >= clip_min_score,
            })

        reference_store.set(extracted, tmpdir, clip_min_score, photo_scores)

        return {
            "success": True,
            "message": "Referência definida com sucesso",
            "clip_threshold": clip_min_score,
            "reference": {
                "fields": extracted.fields,
                "checklist_count": len(extracted.checklist),
                "image_count": extracted.image_count,
                "photo_labels": extracted.photo_labels,
                "photo_scores": photo_scores,
                "nok_items": [item.model_dump() for item in extracted.nok_items],
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Erro ao definir referência: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao processar PDF de referência")
    finally:
        if temp_path.exists():
            temp_path.unlink()


@app.post("/audit")
async def audit_pdfs(
    files: list[UploadFile] = File(...),
    photo_indices: str = Form(""),
    ai_enabled: str = Form("true"),
):
    if not reference_store.is_set():
        raise HTTPException(status_code=400, detail="Nenhuma referência definida. Envie um PDF de referência primeiro.")

    use_ai = ai_enabled != "false"
    max_files = MAX_FILES_AI if use_ai else MAX_FILES_NO_AI
    if len(files) > max_files:
        raise HTTPException(status_code=400, detail=f"Máximo de {max_files} arquivos por vez")

    valid_indices = None
    if photo_indices:
        try:
            valid_indices = [int(x.strip()) for x in photo_indices.split(",") if x.strip()]
        except ValueError:
            pass

    results = []
    for file in files:
        if not file.filename:
            continue
        if not file.filename.lower().endswith(".pdf"):
            results.append({
                "filename": file.filename,
                "approved": False,
                "errors": [f"Arquivo não é PDF"],
                "nok_items": [],
                "checklist": [],
                "fields": {},
                "measurements": {},
                "empty_fields": [],
                "images": [],
                "photo_issues": [],
            })
            continue

        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            results.append({
                "filename": file.filename,
                "approved": False,
                "errors": [f"Arquivo excede {MAX_FILE_SIZE // 1024 // 1024}MB"],
                "nok_items": [],
                "checklist": [],
                "fields": {},
                "measurements": {},
                "empty_fields": [],
                "images": [],
                "photo_issues": [],
            })
            continue

        file_id = str(uuid.uuid4())
        temp_path = TEMP_DIR / f"{file_id}.pdf"
        try:
            temp_path.write_bytes(content)
            result = audit_service.run_audit(str(temp_path), valid_indices, use_ai)
            result_dict = result.model_dump()
            result_dict["filename"] = file.filename
            results.append(result_dict)
        except ValueError as e:
            results.append({
                "filename": file.filename,
                "approved": False,
                "errors": [str(e)],
                "nok_items": [],
                "checklist": [],
                "fields": {},
                "measurements": {},
                "empty_fields": [],
                "images": [],
                "photo_issues": [],
            })
        except Exception as e:
            logger.exception(f"Erro ao auditar {file.filename}: {e}")
            results.append({
                "filename": file.filename,
                "approved": False,
                "errors": ["Erro interno ao processar PDF"],
                "nok_items": [],
                "checklist": [],
                "fields": {},
                "measurements": {},
                "empty_fields": [],
                "images": [],
                "photo_issues": [],
            })
        finally:
            if temp_path.exists():
                temp_path.unlink()

    return {
        "success": True,
        "total": len(results),
        "approved": sum(1 for r in results if r["approved"]),
        "rejected": sum(1 for r in results if not r["approved"]),
        "clip_threshold": reference_store.clip_min_score,
        "results": results,
    }
