"""Kiểm tra quản trị CSV/model với thư mục và model thử nghiệm riêng."""

from pathlib import Path

from fastapi.testclient import TestClient

from src import datasets
from src.config import settings
from src.main import app
from src.model_store import ModelSpec, ModelStore
from src.routers import admin


def test_dataset_lifecycle(monkeypatch, tmp_path):
    monkeypatch.setattr(datasets, "DATA_DIR", tmp_path)
    monkeypatch.setattr(settings, "internal_token", "test-ml-token")
    headers = {"X-Internal-Token": "test-ml-token"}
    upload = {**headers, "Content-Type": "application/octet-stream"}
    client = TestClient(app)

    content = b"id,name\n1,Synthetic\n"
    (tmp_path / "cosine.csv").write_bytes(content)
    url = "/admin/datasets/uploaded/cosine.csv"

    assert client.get("/admin/datasets").status_code == 401
    assert client.put(url, content=content).status_code == 401
    assert client.put(url, content=b"id,name\n1\n", headers=upload).status_code == 400
    assert client.put("/admin/datasets/uploaded/data.zip", content=content, headers=upload).status_code == 400

    assert client.put(url, content=content, headers=upload).json()["scope"] == "uploaded"
    assert client.put(url, content=b"id\n2\n", headers=upload).status_code == 409

    response = client.get(url, headers=headers)
    assert response.content == content
    assert response.headers["content-disposition"] == 'attachment; filename="cosine.csv"'
    assert [item["scope"] for item in client.get("/admin/datasets", headers=headers).json()["datasets"]] == [
        "original", "uploaded",
    ]

    assert client.delete("/admin/datasets/original/cosine.csv", headers=headers).status_code == 405
    assert client.delete(url, headers=headers).status_code == 200
    assert client.get(url, headers=headers).status_code == 404
    assert (tmp_path / "cosine.csv").read_bytes() == content


def test_reload_one_keeps_last_working_model(monkeypatch, tmp_path):
    monkeypatch.setattr(settings, "internal_token", "test-ml-token")
    monkeypatch.setattr("src.model_store.ROOT_DIR", tmp_path)
    model_path = tmp_path / "first.joblib"
    other_path = tmp_path / "second.joblib"
    model_path.write_text("1")
    other_path.write_text("2")

    def load(path: Path):
        return int(path.read_text())

    store = ModelStore((
        ModelSpec("first", "First model", model_path, load),
        ModelSpec("second", "Second model", other_path, load),
    ))
    monkeypatch.setattr(admin, "store", store)
    client = TestClient(app, headers={"X-Internal-Token": "test-ml-token"})
    store.preload()

    model_path.write_text("invalid")
    failure = client.post("/admin/reload?key=first").json()
    assert failure["reloaded"] is False
    assert failure["models"][0]["error"]
    assert store.get("first") == 1
    assert store.get("second") == 2

    model_path.write_text("3")
    other_path.write_text("4")
    assert client.post("/admin/reload?key=first").json()["reloaded"] is True
    assert store.get("first") == 3
    assert store.get("second") == 2
    assert client.post("/admin/reload?key=unknown").status_code == 404
