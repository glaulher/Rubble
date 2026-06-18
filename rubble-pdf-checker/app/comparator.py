from . import extractor
from . import clip_validator


def compare(text: str, reference: dict) -> dict:
    fields = extractor.extract_fields(text)
    checklists = extractor.parse_checklists(text)
    measurements = extractor.parse_measurements(text)

    errors = []
    warnings = []

    for key in reference.get("required_fields", []):
        ref_val = reference.get("fields", {}).get(key, "")
        audit_val = fields.get(key, "")
        if not ref_val:
            continue
        if not audit_val or audit_val in ("NA", "0", ""):
            errors.append(f"Campo '{key}' está vazio (referência: {ref_val})")

    nok_items = [i for i in checklists if i["final"] == "NOK"]
    if nok_items:
        errors.append(f"Checklist com {len(nok_items)} itens NOK")

    for item in nok_items:
        errors.append(f"NOK: [{item['secao']}] {item['numero']} - {item['descricao']}")

    expected_measurements = reference.get("measurements", {})
    for key in expected_measurements:
        ref_val = expected_measurements[key]
        audit_val = measurements.get(key, "")
        if ref_val and not audit_val:
            errors.append(f"Medição '{key}' não preenchida")

    return {
        "fields": fields,
        "checklist": checklists,
        "nok_items": nok_items,
        "measurements": measurements,
        "errors": errors,
        "warnings": warnings
    }


def validate_images(audit_extracted: dict, reference: dict) -> list[dict]:
    labels = reference.get("photo_labels", [])
    if not labels:
        labels = audit_extracted.get("photo_labels", [])

    images = audit_extracted.get("images", [])
    if not images:
        return [{"num": 0, "error": "Nenhuma foto encontrada", "approved": False}]

    clip_results = clip_validator.validate_images_with_clip(images, labels)

    results = []
    for i, img in enumerate(images):
        basic_ok = img.get("size_bytes", 0) >= 10240
        analysis = img.get("analysis", {})
        histogram_ok = not analysis.get("too_dark", False) and not analysis.get("too_light", False)

        clip = {}
        if i < len(clip_results):
            clip = clip_results[i]

        issues = []
        if not basic_ok:
            issues.append("arquivo pequeno")
        if not histogram_ok:
            issues.append("problema de iluminacao")

        clip_ok = clip.get("approved", True) if clip.get("clip_available", True) else True
        if not clip_ok:
            issues.append(f"CLIP: score {clip.get('score', 0):.2f} abaixo de 0.5")

        label = labels[i] if i < len(labels) else f"Foto {i + 1}"

        results.append({
            "num": img["num"],
            "label": label,
            "size_bytes": img["size_bytes"],
            "basic_ok": basic_ok,
            "histogram_ok": histogram_ok,
            "clip_score": clip.get("score"),
            "clip_ok": clip_ok,
            "approved": basic_ok and histogram_ok and clip_ok,
            "issues": issues
        })

    return results


def compute_audit_result(reference: dict, audit_extracted: dict) -> dict:
    text = ""
    comparison = compare(text, audit_extracted) if False else {
        "nok_items": audit_extracted.get("nok_items", []),
        "errors": [],
        "warnings": []
    }

    comparison_result = compare_from_extracted(reference, audit_extracted)

    image_results = validate_images(audit_extracted, reference)

    all_errors = comparison_result["errors"][:]
    photo_issues = [img for img in image_results if not img["approved"]]
    if photo_issues:
        all_errors.append(f"{len(photo_issues)} foto(s) com problemas")

    return {
        "approved": len(all_errors) == 0,
        "errors": all_errors,
        "nok_items": comparison_result["nok_items"],
        "checklist": comparison_result["checklist"],
        "fields": comparison_result["fields"],
        "measurements": comparison_result["measurements"],
        "empty_fields": comparison_result["empty_fields"],
        "images": image_results,
        "photo_issues": photo_issues
    }


def compare_from_extracted(reference: dict, audit: dict) -> dict:
    errors = []
    warnings = []

    ref_fields = reference.get("fields", {})
    audit_fields = audit.get("fields", {})

    empty_fields = []
    for key in ref_fields:
        if not ref_fields[key]:
            continue
        audit_val = audit_fields.get(key, "")
        if not audit_val or audit_val in ("NA", "0", ""):
            empty_fields.append(key)
            errors.append(f"Campo '{key}' vazio (deveria: '{ref_fields[key]}')")

    nok_items = audit.get("nok_items", [])
    for item in nok_items:
        errors.append(f"NOK: [{item['secao']}] {item['numero']} - {item['descricao']}")

    ref_measurements = reference.get("measurements", {})
    audit_measurements = audit.get("measurements", {})
    for key in ref_measurements:
        if ref_measurements[key]:
            audit_val = audit_measurements.get(key, "")
            if not audit_val:
                errors.append(f"Medição '{key}' não preenchida")

    image_count = audit.get("image_count", 0)
    ref_image_count = reference.get("image_count", 0)
    if ref_image_count > 0 and image_count < ref_image_count:
        errors.append(f"Faltam {ref_image_count - image_count} foto(s) (esperado: {ref_image_count}, recebido: {image_count})")

    return {
        "errors": errors,
        "warnings": warnings,
        "nok_items": nok_items,
        "checklist": audit.get("checklist", []),
        "fields": audit_fields,
        "measurements": audit_measurements,
        "empty_fields": empty_fields
    }
