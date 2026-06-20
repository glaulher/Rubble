import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from extractor import extract
from models.report import (
    ExtractedReport,
    ChecklistItem,
    ImageData,
    ImageAnalysis,
)


def _raw_to_report(raw: dict) -> ExtractedReport:
    checklist = [ChecklistItem(**item) for item in raw.get("checklist", [])]
    nok_items = [ChecklistItem(**item) for item in raw.get("nok_items", [])]
    images = []
    for img in raw.get("images", []):
        analysis_raw = img.get("analysis", {})
        analysis = ImageAnalysis(
            brightness=analysis_raw.get("brightness", 0.0),
            dark_ratio=analysis_raw.get("dark_ratio", 0.0),
            light_ratio=analysis_raw.get("light_ratio", 0.0),
            too_dark=analysis_raw.get("too_dark", False),
            too_light=analysis_raw.get("too_light", False),
            width=analysis_raw.get("width", 0),
            height=analysis_raw.get("height", 0),
            error=analysis_raw.get("error"),
        )
        images.append(ImageData(
            num=img.get("num", 0),
            page=img.get("page", 0),
            orig_num=img.get("orig_num", 0),
            width=img.get("width", 0),
            height=img.get("height", 0),
            size_bytes=img.get("size_bytes", 0),
            path=img.get("path", ""),
            analysis=analysis,
        ))

    return ExtractedReport(
        fields=raw.get("fields", {}),
        checklist=checklist,
        nok_items=nok_items,
        measurements=raw.get("measurements", {}),
        missing_measurements=raw.get("missing_measurements", []),
        images=images,
        image_count=raw.get("image_count", 0),
        image_quality=raw.get("image_quality", "ok"),
        empty_fields=raw.get("empty_fields", []),
        photo_labels=raw.get("photo_labels", []),
        has_images=raw.get("has_images", False),
    )


class ExtractionService:
    def extract(self, pdf_path: str) -> tuple[ExtractedReport, str]:
        raw, tmpdir = extract(pdf_path)
        return _raw_to_report(raw), tmpdir
