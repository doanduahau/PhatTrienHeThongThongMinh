"""Smoke test cho ML service (không cần database).

Chạy từ thư mục backend/ml-service::

    .\\venv\\Scripts\\python.exe -m pytest -q
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from ml_service.main import app


def test_health() -> None:
    with TestClient(app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_models_are_available() -> None:
    with TestClient(app) as client:
        response = client.get("/ready")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ready", payload["missing_models"]


def test_similar_products() -> None:
    with TestClient(app) as client:
        response = client.post("/recommend/similar", json={"product_id": 1, "top_n": 3})
    assert response.status_code == 200
    items = response.json()["items"]
    assert len(items) == 3
    assert all("product_id" in item and "score" in item for item in items)


def test_search_parse_only_returns_constraints() -> None:
    query = "chuột gaming không dây siêu nhẹ claw grip dưới 2 triệu"
    with TestClient(app) as client:
        response = client.post("/search/parse", json={"query": query})
    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "tim_kiem_san_pham"
    assert payload["should_query_db"] is True
    assert payload["hard_constraints"]["max_price"] == 2_000_000
    assert "sieu_nhe_under_60g" in payload["soft_tags"]


def test_search_parse_rejects_out_of_domain() -> None:
    with TestClient(app) as client:
        response = client.post("/search/parse", json={"query": "thời tiết hà nội hôm nay"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "ngoai_pham_vi"
    assert payload["should_query_db"] is False


def test_personalized_handles_unknown_user() -> None:
    with TestClient(app) as client:
        response = client.post("/recommend/personalized", json={"user_id": "khong-ton-tai", "top_n": 3})
    assert response.status_code == 200
    payload = response.json()
    assert payload["cold_start"] is True
    assert payload["items"] == []
