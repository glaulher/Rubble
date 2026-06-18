import os
import logging

logger = logging.getLogger(__name__)

_model = None
_processor = None


def _load_model():
    global _model, _processor
    if _model is not None:
        return _model, _processor

    try:
        from transformers import CLIPProcessor, CLIPModel
        logger.info("Carregando modelo CLIP...")
        model_name = os.getenv("CLIP_MODEL", "openai/clip-vit-base-patch32")
        _model = CLIPModel.from_pretrained(model_name)
        _processor = CLIPProcessor.from_pretrained(model_name)
        _model.eval()
        logger.info("Modelo CLIP carregado com sucesso")
        return _model, _processor
    except Exception as e:
        logger.warning(f"Falha ao carregar CLIP: {e}. Usando fallback sem CLIP.")
        return None, None


def validate_images_with_clip(images: list, photo_labels: list[str]) -> list[dict]:
    model, processor = _load_model()
    if model is None or processor is None:
        return [{"clip_available": False} for _ in images]

    results = []
    for i, img_info in enumerate(images):
        img_path = img_info.get("path", "")
        if not img_path or not os.path.exists(img_path):
            results.append({
                "num": img_info["num"],
                "score": 0.0,
                "label": "",
                "error": "Arquivo nao encontrado"
            })
            continue

        label = photo_labels[i] if i < len(photo_labels) else f"Foto {i + 1}"
        candidate_labels = [label, f"foto em branco", f"imagem de equipamento"]

        try:
            from PIL import Image as PILImage
            image = PILImage.open(img_path).convert("RGB")
            inputs = processor(
                text=candidate_labels,
                images=image,
                return_tensors="pt",
                padding=True
            )
            outputs = model(**inputs)
            logits_per_image = outputs.logits_per_image
            probs = logits_per_image.softmax(dim=1)
            score = round(float(probs[0][0]), 4)

            results.append({
                "num": img_info["num"],
                "score": score,
                "label": label,
                "approved": score >= 0.5
            })
        except Exception as e:
            results.append({
                "num": img_info["num"],
                "score": 0.0,
                "label": label,
                "error": str(e)
            })

    return results
