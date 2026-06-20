from __future__ import annotations
import shutil
from dataclasses import dataclass, field
from typing import Optional

from models.report import ExtractedReport


@dataclass
class ReferenceStore:
    extracted: Optional[ExtractedReport] = None
    tmpdir: Optional[str] = None
    clip_min_score: float = 0.5
    photo_scores: list[dict] = field(default_factory=list)

    def set(
        self,
        extracted: ExtractedReport,
        tmpdir: str,
        clip_min_score: float,
        photo_scores: list[dict],
    ) -> None:
        self.cleanup()
        self.extracted = extracted
        self.tmpdir = tmpdir
        self.clip_min_score = clip_min_score
        self.photo_scores = photo_scores

    def is_set(self) -> bool:
        return self.extracted is not None

    def get_selected_labels(self, indices: list[int]) -> list[str]:
        if not self.extracted:
            return []
        labels = self.extracted.photo_labels
        return [labels[i] for i in indices if i < len(labels)]

    def get_threshold_for_indices(self, indices: list[int]) -> float:
        if not self.photo_scores or not indices:
            return self.clip_min_score
        scores = [
            ps["score"]
            for ps in self.photo_scores
            if ps.get("index") in indices
        ]
        return min(scores) if scores else self.clip_min_score

    def cleanup(self) -> None:
        if self.tmpdir:
            shutil.rmtree(self.tmpdir, ignore_errors=True)
            self.tmpdir = None
        self.extracted = None
        self.photo_scores = []
        self.clip_min_score = 0.5
