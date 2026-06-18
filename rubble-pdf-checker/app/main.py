import os
import uuid
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from extractor import extract
from comparator import compute_audit_result, compare_from_extracted
from clip_validator import _load_model

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TEMP_DIR = Path("/tmp/pdf-audit")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILES = 10
MAX_FILE_SIZE = 10 * 1024 * 1024

_reference = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando PDF Checker...")
    try:
        _load_model()
    except Exception as e:
        logger.warning(f"Modelo CLIP não carregado no startup: {e}")
    yield
    logger.info("Encerrando PDF Checker...")


app = FastAPI(title="PDF Checker", version="1.0.0", lifespan=lifespan)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "clip_loaded": True,
        "reference_set": _reference is not None
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
    try:
        temp_path.write_bytes(content)
        result = extract(str(temp_path))
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Erro ao extrair PDF: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao processar PDF")
    finally:
        if temp_path.exists():
            temp_path.unlink()


@app.post("/set-reference")
async def set_reference(file: UploadFile = File(...)):
    global _reference
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Apenas arquivos PDF são aceitos")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"Arquivo excede {MAX_FILE_SIZE // 1024 // 1024}MB")

    file_id = str(uuid.uuid4())
    temp_path = TEMP_DIR / f"{file_id}.pdf"
    try:
        temp_path.write_bytes(content)
        extracted = extract(str(temp_path))

        _reference = extracted

        return {
            "success": True,
            "message": "Referência definida com sucesso",
            "reference": {
                "fields": extracted["fields"],
                "checklist_count": len(extracted["checklist"]),
                "image_count": extracted["image_count"],
                "photo_labels": extracted["photo_labels"],
                "nok_items": extracted["nok_items"]
            }
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
async def audit_pdfs(files: list[UploadFile] = File(...)):
    global _reference
    if _reference is None:
        raise HTTPException(status_code=400, detail="Nenhuma referência definida. Envie um PDF de referência primeiro.")

    if len(files) > MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Máximo de {MAX_FILES} arquivos por vez")

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
                "photo_issues": []
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
                "photo_issues": []
            })
            continue

        file_id = str(uuid.uuid4())
        temp_path = TEMP_DIR / f"{file_id}.pdf"
        try:
            temp_path.write_bytes(content)
            extracted = extract(str(temp_path))
            result = compute_audit_result(_reference, extracted)
            result["filename"] = file.filename
            results.append(result)
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
                "photo_issues": []
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
                "photo_issues": []
            })
        finally:
            if temp_path.exists():
                temp_path.unlink()

    return {
        "success": True,
        "total": len(results),
        "approved": sum(1 for r in results if r["approved"]),
        "rejected": sum(1 for r in results if not r["approved"]),
        "results": results
    }
