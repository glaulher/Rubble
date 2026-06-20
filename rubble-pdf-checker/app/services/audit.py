import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.report import AuditFileResult
from store import ReferenceStore
from services.extraction import ExtractionService
from services.comparison import ComparisonService


class AuditService:
    def __init__(
        self,
        reference_store: ReferenceStore,
        extraction_service: ExtractionService | None = None,
        comparison_service: ComparisonService | None = None,
    ):
        self.store = reference_store
        self.extraction = extraction_service or ExtractionService()
        self.comparison = comparison_service or ComparisonService()

    def run_audit(
        self, pdf_path: str, photo_indices: list[int], ai_enabled: bool = True
    ) -> AuditFileResult:
        if not self.store.is_set():
            raise ValueError(
                "Nenhuma referência definida. Envie um PDF de referência primeiro."
            )

        audit_extracted, tmpdir = self.extraction.extract(pdf_path)
        try:
            reference = self.store.extracted
            selected_labels = (
                self.store.get_selected_labels(photo_indices)
                if photo_indices is not None
                else None
            )
            threshold = (
                self.store.get_threshold_for_indices(photo_indices)
                if photo_indices is not None
                else self.store.clip_min_score
            )

            result = self.comparison.build_result(
                reference, audit_extracted, threshold, selected_labels, ai_enabled
            )
            return result
        finally:
            import shutil
            shutil.rmtree(tmpdir, ignore_errors=True)
