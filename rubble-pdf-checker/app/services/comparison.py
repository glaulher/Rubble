import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.report import (
    ExtractedReport,
    ComparisonResult,
    ImageValidationResult,
    AuditFileResult,
    ChecklistItem,
    ImageValidationResult,
)
from comparator import validate_images, compare_from_extracted
from clip_validator import validate_images_with_clip


class ComparisonService:
    def compare_extracted(
        self,
        reference: ExtractedReport,
        audit: ExtractedReport,
    ) -> ComparisonResult:
        raw = compare_from_extracted(
            reference.model_dump(),
            audit.model_dump(),
        )
        nok_items = [ChecklistItem(**item) for item in raw.get("nok_items", [])]
        return ComparisonResult(
            errors=raw.get("errors", []),
            warnings=raw.get("warnings", []),
            nok_items=nok_items,
            empty_fields=raw.get("empty_fields", []),
            fields=raw.get("fields", {}),
            checklist=[ChecklistItem(**item) for item in raw.get("checklist", [])],
            measurements=raw.get("measurements", {}),
        )

    def validate_images(
        self,
        audit_extracted: ExtractedReport,
        reference: ExtractedReport,
        clip_threshold: float = 0.5,
        selected_labels: list[str] | None = None,
    ) -> list[ImageValidationResult]:
        raw_results = validate_images(
            audit_extracted.model_dump(),
            reference.model_dump(),
            clip_threshold,
            selected_labels,
        )
        return [
            ImageValidationResult(
                num=r.get("num", 0),
                label=r.get("label", ""),
                approved=r.get("approved", False),
                issues=r.get("issues", []),
                clip_score=r.get("clip_score"),
                clip_ok=r.get("clip_ok"),
                clip_threshold=r.get("clip_threshold"),
                size_bytes=r.get("size_bytes", 0),
                basic_ok=r.get("basic_ok", True),
                histogram_ok=r.get("histogram_ok", True),
            )
            for r in raw_results
        ]

    def build_result(
        self,
        reference: ExtractedReport,
        audit: ExtractedReport,
        clip_threshold: float,
        selected_labels: list[str] | None,
        ai_enabled: bool = True,
    ) -> AuditFileResult:
        comparison = self.compare_extracted(reference, audit)
        if ai_enabled:
            image_results = self.validate_images(audit, reference, clip_threshold, selected_labels)
        else:
            image_results = self._basic_image_validation(audit)

        all_errors = comparison.errors[:]
        photo_issues = [img for img in image_results if not img.approved]
        if photo_issues:
            all_errors.append(f"{len(photo_issues)} foto(s) com problemas")

        return AuditFileResult(
            approved=len(all_errors) == 0,
            errors=all_errors,
            nok_items=comparison.nok_items,
            checklist=comparison.checklist,
            fields=comparison.fields,
            measurements=comparison.measurements,
            empty_fields=comparison.empty_fields,
            images=image_results,
            photo_issues=photo_issues,
        )

    def _basic_image_validation(
        self,
        audit: ExtractedReport,
    ) -> list[ImageValidationResult]:
        raw_results = validate_images(
            audit.model_dump(),
            audit.model_dump(),
            0.5,
            None,
        )
        return [
            ImageValidationResult(
                num=r.get("num", 0),
                label=r.get("label", ""),
                approved=r.get("basic_ok", True) and r.get("histogram_ok", True),
                issues=[x for x in r.get("issues", []) if "CLIP" not in x],
                clip_score=None,
                clip_ok=None,
                clip_threshold=None,
                size_bytes=r.get("size_bytes", 0),
                basic_ok=r.get("basic_ok", True),
                histogram_ok=r.get("histogram_ok", True),
            )
            for r in raw_results
        ]
