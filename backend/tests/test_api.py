from datetime import datetime, timedelta, timezone

import jwt
import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient

from app.main import _attempts, _training_attempts, app


@pytest.fixture(autouse=True)
def configuration(monkeypatch):
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", PasswordHasher().hash("a-long-test-password"))
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-more-than-thirty-two-characters")
    _attempts.clear()
    _training_attempts.clear()


@pytest.fixture
def client():
    return TestClient(app)


def auth(client):
    response = client.post("/api/auth/login", json={"password": "a-long-test-password"})
    assert response.status_code == 200
    return {"Authorization": "Bearer " + response.json()["access_token"]}


def test_auth_and_training(client):
    data = {"points": [{"x": i, "y": 2*i + 1} for i in range(1, 6)]}
    assert client.get("/api/health").json() == {"status": "ok"}
    assert client.post("/api/train", json=data).status_code == 401
    assert client.post("/api/train", headers={"Authorization": "Bearer nonsense"}, json=data).status_code == 401
    assert client.post("/api/auth/login", json={"password": "wrong"}).status_code == 401
    headers = auth(client)
    assert client.get("/api/auth/me", headers=headers).status_code == 200
    response = client.post("/api/train", headers=headers, json=data)
    assert response.status_code == 200
    assert response.json()["final_slope"] == pytest.approx(2, rel=1e-4)


def test_expired_and_invalid_input(client):
    expired = jwt.encode({"sub": "admin", "iat": datetime.now(timezone.utc) - timedelta(hours=2),
                          "exp": datetime.now(timezone.utc) - timedelta(hours=1)},
                         "test-secret-that-is-more-than-thirty-two-characters", algorithm="HS256")
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer " + expired}).status_code == 401
    headers = auth(client)
    assert client.post("/api/train", headers=headers, json={"points": [{"x": 1, "y": 2}]*5001}).status_code == 422
    assert client.post("/api/train", headers=headers, json={"points": [{"x": 1, "y": 2}, {"x": "NaN", "y": 3}]}).status_code == 422
    assert client.post("/api/train", headers=headers, json={"points": [{"x": 1, "y": 2}, {"x": 1, "y": 3}]}).status_code == 422


def test_rate_and_body_limits(client):
    for _ in range(5):
        assert client.post("/api/auth/login", json={"password": "wrong"}).status_code == 401
    assert client.post("/api/auth/login", json={"password": "wrong"}).status_code == 429
    assert client.post("/api/train", content="x"*350001).status_code == 413


def test_training_rate_limit_and_cors(client):
    headers = auth(client)
    data = {"points": [{"x": 1, "y": 3}, {"x": 2, "y": 5}], "epochs": 100}
    for _ in range(10):
        assert client.post("/api/train", headers=headers, json=data).status_code == 200
    assert client.post("/api/train", headers=headers, json=data).status_code == 429
    allowed = client.options("/api/train", headers={"Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type"})
    assert allowed.headers["access-control-allow-origin"] == "http://localhost:5173"
    denied = client.options("/api/train", headers={"Origin": "https://untrusted.example",
        "Access-Control-Request-Method": "POST"})
    assert denied.status_code == 400


def test_kmeans_is_protected_and_validated(client):
    data = {"points": [{"x": 1, "y": 1}, {"x": 2, "y": 2},
                       {"x": 9, "y": 9}, {"x": 10, "y": 10}], "clusters": 2}
    assert client.post("/api/kmeans/train", json=data).status_code == 401
    headers = auth(client)
    response = client.post("/api/kmeans/train", json=data, headers=headers)
    assert response.status_code == 200
    assert response.json()["settings"]["clusters"] == 2
    assert len(response.json()["snapshots"][-1]["assignments"]) == 4
    assert client.post("/api/kmeans/train", json={**data, "clusters": 6}, headers=headers).status_code == 422
