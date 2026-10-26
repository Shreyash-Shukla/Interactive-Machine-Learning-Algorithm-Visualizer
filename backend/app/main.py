"""Small stateless API: only authenticated calls can spend CPU on training."""

import os
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import JSONResponse

from app.ml.linear_regression import train
from app.schemas import LoginRequest, TrainRequest

MAX_BODY = 350_000
TOKEN_MINUTES = 30
_hasher = PasswordHasher()
_bearer = HTTPBearer(auto_error=False)
_attempts: dict[str, deque[float]] = defaultdict(deque)
_training_attempts: dict[str, deque[float]] = defaultdict(deque)
_rate_lock = threading.Lock()
_training_slot = threading.BoundedSemaphore(1)


def _config() -> tuple[str, str]:
    password_hash = os.getenv("ADMIN_PASSWORD_HASH", "")
    secret = os.getenv("JWT_SECRET", "")
    if not password_hash or len(secret) < 32:
        raise HTTPException(503, "Admin authentication is not configured")
    return password_hash, secret


def _limit(bucket: dict[str, deque[float]], key: str, count: int, window: int) -> None:
    now = time.monotonic()
    with _rate_lock:
        hits = bucket[key]
        while hits and hits[0] <= now - window:
            hits.popleft()
        if len(hits) >= count:
            raise HTTPException(429, "Too many requests. Please try again later")
        hits.append(now)


def _client(request: Request) -> str:
    # Do not trust user-supplied forwarding headers.
    return request.client.host if request.client else "unknown"


def require_admin(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(401, "Admin sign-in required", headers={"WWW-Authenticate": "Bearer"})
    _, secret = _config()
    try:
        payload = jwt.decode(credentials.credentials, secret, algorithms=["HS256"], options={"require": ["exp", "iat", "sub"]})
        if payload.get("sub") != "admin":
            raise ValueError("Invalid subject")
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(401, "Session expired or invalid. Please sign in again", headers={"WWW-Authenticate": "Bearer"}) from None
    return "admin"


app = FastAPI(title="ML Lab API", docs_url=None, redoc_url=None, openapi_url=None)
origins = [origin.strip().rstrip("/") for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=False,
                   allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])


@app.middleware("http")
async def enforce_body_size(request: Request, call_next):
    if request.url.path in ("/api/train", "/api/auth/login") and request.method == "POST":
        length = request.headers.get("content-length")
        if length and length.isdigit() and int(length) > MAX_BODY:
            return JSONResponse({"detail": "Request body is too large"}, status_code=413)
        body = await request.body()
        if len(body) > MAX_BODY:
            return JSONResponse({"detail": "Request body is too large"}, status_code=413)
    return await call_next(request)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/auth/login")
def login(payload: LoginRequest, request: Request):
    _limit(_attempts, _client(request), 5, 60)
    password_hash, secret = _config()
    try:
        valid = _hasher.verify(password_hash, payload.password)
    except (VerificationError, ValueError):
        valid = False
    if not valid:
        raise HTTPException(401, "Incorrect password")
    now = datetime.now(timezone.utc)
    token = jwt.encode({"sub": "admin", "iat": now, "exp": now + timedelta(minutes=TOKEN_MINUTES)}, secret, algorithm="HS256")
    return {"access_token": token, "token_type": "bearer", "expires_in": TOKEN_MINUTES * 60}


@app.get("/api/auth/me")
def me(_: str = Depends(require_admin)):
    return {"authenticated": True, "role": "admin"}


@app.post("/api/train")
def train_model(payload: TrainRequest, request: Request, _: str = Depends(require_admin)):
    _limit(_training_attempts, _client(request), 10, 60)
    if not _training_slot.acquire(blocking=False):
        raise HTTPException(429, "Training is busy. Please retry in a moment")
    try:
        return train(((point.x, point.y) for point in payload.points), payload.learning_rate, payload.epochs)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from None
    finally:
        _training_slot.release()
