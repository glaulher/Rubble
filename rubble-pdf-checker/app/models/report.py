from __future__ import annotations
from pydantic import BaseModel, Field


class ChecklistItem(BaseModel):
    numero: str
    descricao: str
    secao: str = "Geral"
    inicial: str = ""
    final: str = ""


class ImageAnalysis(BaseModel):
    brightness: float = 0.0
    dark_ratio: float = 0.0
    light_ratio: float = 0.0
    too_dark: bool = False
    too_light: bool = False
    width: int = 0
    height: int = 0
    error: str | None = None


class ImageData(BaseModel):
    num: int
    page: int = 0
    orig_num: int = 0
    width: int = 0
    height: int = 0
    size_bytes: int = 0
    path: str = ""
    analysis: ImageAnalysis = Field(default_factory=ImageAnalysis)


class ExtractedReport(BaseModel):
    fields: dict[str, str] = Field(default_factory=dict)
    checklist: list[ChecklistItem] = Field(default_factory=list)
    nok_items: list[ChecklistItem] = Field(default_factory=list)
    measurements: dict[str, str] = Field(default_factory=dict)
    missing_measurements: list[str] = Field(default_factory=list)
    images: list[ImageData] = Field(default_factory=list)
    image_count: int = 0
    image_quality: str = "ok"
    empty_fields: list[str] = Field(default_factory=list)
    photo_labels: list[str] = Field(default_factory=list)
    has_images: bool = False


class ComparisonResult(BaseModel):
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    nok_items: list[ChecklistItem] = Field(default_factory=list)
    empty_fields: list[str] = Field(default_factory=list)
    fields: dict[str, str] = Field(default_factory=dict)
    checklist: list[ChecklistItem] = Field(default_factory=list)
    measurements: dict[str, str] = Field(default_factory=dict)


class ImageValidationResult(BaseModel):
    num: int
    label: str
    approved: bool
    issues: list[str] = Field(default_factory=list)
    clip_score: float | None = None
    clip_ok: bool | None = None
    clip_threshold: float | None = None
    size_bytes: int = 0
    basic_ok: bool = True
    histogram_ok: bool = True


class AuditFileResult(BaseModel):
    filename: str = ""
    approved: bool = False
    errors: list[str] = Field(default_factory=list)
    nok_items: list[ChecklistItem] = Field(default_factory=list)
    checklist: list[ChecklistItem] = Field(default_factory=list)
    fields: dict[str, str] = Field(default_factory=dict)
    measurements: dict[str, str] = Field(default_factory=dict)
    empty_fields: list[str] = Field(default_factory=list)
    images: list[ImageValidationResult] = Field(default_factory=list)
    photo_issues: list[ImageValidationResult] = Field(default_factory=list)


class ReferenceData(BaseModel):
    extracted: ExtractedReport
    clip_threshold: float = 0.5
    photo_scores: list[dict] = Field(default_factory=list)
