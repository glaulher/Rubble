from clip_validator import validate_images_with_clip


def validate_images(audit_extracted: dict, reference: dict, clip_threshold: float = 0.5, selected_labels: list[str] = None) -> list[dict]:
    ref_labels = reference.get("photo_labels", [])
    if not ref_labels:
        ref_labels = audit_extracted.get("photo_labels", [])

    audit_labels = audit_extracted.get("photo_labels", [])
    audit_images = audit_extracted.get("images", [])

    if not audit_images:
        return [{"num": 0, "error": "Nenhuma foto encontrada", "approved": False}]

    if selected_labels is None:
        selected_labels = ref_labels

    def _match(label, candidates):
        """Match a label to a candidate by stripped lowercase."""
        clean = label.strip().lower()
        for i, c in enumerate(candidates):
            if c.strip().lower() == clean:
                return i
        return -1

    # Map selected labels → audit image positions
    matched_pairs = []
    matched_audit_indices = set()
    missing_labels = []

    for sel_label in selected_labels:
        idx = _match(sel_label, audit_labels)
        if idx == -1:
            missing_labels.append(sel_label)
        else:
            matched_pairs.append((sel_label, idx))
            matched_audit_indices.add(idx)

    # Validate matched pairs (CLIP + quality)
    results = []
    for sel_label, audit_idx in matched_pairs:
        img = audit_images[audit_idx]
        basic_ok = img.get("size_bytes", 0) >= 3072
        analysis = img.get("analysis", {})
        histogram_ok = not analysis.get("too_dark", False) and not analysis.get("too_light", False)

        clip_results = validate_images_with_clip([img], [sel_label])
        clip = clip_results[0] if clip_results else {}
        clip_score = clip.get("score", 0)
        clip_ok = clip_score >= clip_threshold

        issues = []
        if not basic_ok:
            issues.append("arquivo pequeno")
        if not histogram_ok:
            issues.append("problema de iluminacao")
        if not clip_ok:
            issues.append(f"CLIP: score {clip_score:.2f} abaixo de {clip_threshold:.4f}")

        results.append({
            "num": img["num"],
            "label": sel_label,
            "size_bytes": img["size_bytes"],
            "basic_ok": basic_ok,
            "histogram_ok": histogram_ok,
            "clip_score": clip_score,
            "clip_ok": clip_ok,
            "clip_threshold": clip_threshold,
            "approved": basic_ok and histogram_ok and clip_ok,
            "issues": issues
        })

    # Mark missing labels as failed
    for sel_label in missing_labels:
        results.append({
            "num": -1,
            "label": sel_label,
            "approved": False,
            "issues": ["foto não encontrada no relatório auditado"]
        })

    # Extra audit photos not in selected_labels — quality check only (no CLIP)
    for i, img in enumerate(audit_images):
        if i in matched_audit_indices:
            continue
        basic_ok = img.get("size_bytes", 0) >= 3072
        analysis = img.get("analysis", {})
        histogram_ok = not analysis.get("too_dark", False) and not analysis.get("too_light", False)

        label = audit_labels[i] if i < len(audit_labels) else f"Extra {i + 1}"
        issues = []
        if not basic_ok:
            issues.append("arquivo pequeno")
        if not histogram_ok:
            issues.append("problema de iluminacao")

        results.append({
            "num": img["num"],
            "label": label + " (extra)",
            "size_bytes": img["size_bytes"],
            "basic_ok": basic_ok,
            "histogram_ok": histogram_ok,
            "clip_score": None,
            "clip_ok": None,
            "clip_threshold": None,
            "approved": basic_ok and histogram_ok,
            "issues": issues
        })

    return results


def compute_audit_result(reference: dict, audit_extracted: dict, clip_threshold: float = 0.5, selected_labels: list[str] = None) -> dict:
    comparison_result = compare_from_extracted(reference, audit_extracted)

    image_results = validate_images(audit_extracted, reference, clip_threshold, selected_labels)

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

    REQUIRED_FIELDS = {"situacao_final", "realizada_por"}

    ref_fields = reference.get("fields", {})
    audit_fields = audit.get("fields", {})

    empty_fields = []
    for key in ref_fields:
        if not ref_fields[key]:
            continue
        audit_val = audit_fields.get(key, "")
        if not audit_val or audit_val in ("NA", "0", ""):
            empty_fields.append(key)
            if key in REQUIRED_FIELDS:
                errors.append(f"Campo '{key}' não preenchido (preenchido na referência)")

    if audit_fields.get("situacao_final", "").upper() == "NOK":
        errors.append("Situação final do relatório é NOK")

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
    if ref_image_count > 0 and image_count != ref_image_count:
        warnings.append(f"Diferença de fotos (referência: {ref_image_count}, auditado: {image_count})")

    return {
        "errors": errors,
        "warnings": warnings,
        "nok_items": nok_items,
        "checklist": audit.get("checklist", []),
        "fields": audit_fields,
        "measurements": audit_measurements,
        "empty_fields": empty_fields
    }
