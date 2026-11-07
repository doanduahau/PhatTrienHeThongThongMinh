"""Pydantic schema cho hợp đồng HTTP giữa backend và ML service.

ML chỉ trả về ``product_id`` + điểm số. Backend chịu trách nhiệm hydrate
giá/tồn kho/ảnh từ database để dữ liệu không bị cũ theo model.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class ScoredItem(BaseModel):
    product_id: str
    score: float = 0.0
    rank: int | None = None
    confidence: float | None = None
    lift: float | None = None
    support: float | None = None


class RecommendResponse(BaseModel):
    model: str
    version: str | None = None
    cold_start: bool = False
    items: list[ScoredItem] = Field(default_factory=list)


class SimilarRequest(BaseModel):
    product_id: str | int
    top_n: int = Field(default=8, ge=1, le=50)
    same_category_only: bool = False


class BundleRequest(BaseModel):
    product_ids: list[str | int] = Field(min_length=1, max_length=100)
    top_n: int = Field(default=6, ge=1, le=50)


class PersonalizedRequest(BaseModel):
    user_id: str | int
    top_n: int = Field(default=8, ge=1, le=50)


class SearchParseRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)


class FeaturedItem(BaseModel):
    product_id: str
    rank: int
    score: float


class FeaturedResponse(BaseModel):
    model: str = "rating_baseline"
    items: list[FeaturedItem] = Field(default_factory=list)


class ModelInfoResponse(BaseModel):
    models: list[dict]


class ReloadResponse(BaseModel):
    reloaded: bool
    models: list[dict]


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
