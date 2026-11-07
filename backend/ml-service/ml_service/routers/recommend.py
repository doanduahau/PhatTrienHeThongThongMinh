"""Router HTTP cho các khối gợi ý."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from ml_service.model_store import ModelNotReady, store
from ml_service.schemas import (
    BundleRequest,
    PersonalizedRequest,
    RecommendResponse,
    ScoredItem,
    SimilarRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/recommend", tags=["recommend"])


def _version_of(model_key: str) -> str | None:
    for info in store.info():
        if info["key"] == model_key:
            manifest = info.get("manifest") or {}
            return manifest.get("version") or info.get("modified_at")
    return None


@router.post("/similar", response_model=RecommendResponse)
def recommend_similar(payload: SimilarRequest) -> RecommendResponse:
    try:
        recommender = store.get("similar")
    except ModelNotReady as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        raw = recommender.recommend(
            payload.product_id,
            top_n=payload.top_n,
            same_category_only=payload.same_category_only,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    items = [
        ScoredItem(product_id=str(row["product_id"]), score=float(row["similarity_score"]))
        for row in raw
    ]
    return RecommendResponse(
        model="cosine_similarity",
        version=_version_of("similar"),
        items=items,
    )


@router.post("/bundles", response_model=RecommendResponse)
def recommend_bundles(payload: BundleRequest) -> RecommendResponse:
    try:
        recommender = store.get("bundles")
    except ModelNotReady as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    raw = recommender.recommend(payload.product_ids, top_n=payload.top_n)
    items = [
        ScoredItem(
            product_id=str(row["product_id"]),
            score=float(row["confidence"]),
            confidence=float(row["confidence"]),
            lift=float(row["lift"]),
            support=float(row["support"]),
        )
        for row in raw
    ]
    return RecommendResponse(
        model="fp_growth",
        version=_version_of("bundles"),
        items=items,
    )


@router.post("/personalized", response_model=RecommendResponse)
def recommend_personalized(payload: PersonalizedRequest) -> RecommendResponse:
    try:
        recommender = store.get("personalized")
    except ModelNotReady as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    user_id = str(payload.user_id)
    # Người dùng mới: backend sẽ tự fallback sang bảng xếp hạng phổ biến.
    if user_id not in recommender.user_profiles:
        return RecommendResponse(
            model="cosine_kmeans",
            version=_version_of("personalized"),
            cold_start=True,
            items=[],
        )

    raw = recommender.recommend(user_id, top_n=payload.top_n)
    items = [
        ScoredItem(product_id=str(row["product_id"]), score=float(row["match_score"]))
        for row in raw
    ]
    return RecommendResponse(
        model="cosine_kmeans",
        version=_version_of("personalized"),
        items=items,
    )
