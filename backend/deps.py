"""Shared dependencies: MongoDB client, auth, object storage (S3/local), Slack signature verification."""
from __future__ import annotations

import hashlib
import hmac
import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from dotenv import load_dotenv
from fastapi import HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient

from models import User

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# --- Mongo ---
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# --- Object storage (S3 or local fallback for dev) ---
S3_BUCKET = os.environ.get("S3_BUCKET", "")
S3_REGION = os.environ.get("AWS_REGION", "us-east-1")
LOCAL_STORAGE_DIR = ROOT_DIR / "local_storage"


def init_storage() -> None:
    if not S3_BUCKET:
        LOCAL_STORAGE_DIR.mkdir(exist_ok=True)
        logging.info("Object storage: local filesystem (set S3_BUCKET for S3)")
    else:
        logging.info(f"Object storage: S3 bucket '{S3_BUCKET}' in {S3_REGION}")


def _s3() -> boto3.client:
    return boto3.client("s3", region_name=S3_REGION)


def put_object(path: str, data: bytes, content_type: str) -> dict:
    if S3_BUCKET:
        try:
            _s3().put_object(Bucket=S3_BUCKET, Key=path, Body=data, ContentType=content_type)
            return {"url": f"https://{S3_BUCKET}.s3.{S3_REGION}.amazonaws.com/{path}"}
        except (BotoCoreError, ClientError) as e:
            logging.error(f"S3 put failed: {e}")
            raise
    # Local dev fallback
    dest = LOCAL_STORAGE_DIR / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return {"url": f"/api/apk/local/{path}"}


def get_object(path: str):
    if S3_BUCKET:
        try:
            resp = _s3().get_object(Bucket=S3_BUCKET, Key=path)
            return resp["Body"].read(), resp["ContentType"]
        except (BotoCoreError, ClientError) as e:
            logging.error(f"S3 get failed: {e}")
            raise
    # Local dev fallback
    dest = LOCAL_STORAGE_DIR / path
    if not dest.exists():
        raise FileNotFoundError(f"Local file not found: {path}")
    return dest.read_bytes(), "application/octet-stream"


# --- Auth ---
async def get_current_user(request: Request) -> User:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            token = auth.split(" ", 1)[1]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = sess["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user_doc = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)


# --- Slack signature ---
SLACK_SIGNING_SECRET = os.environ.get("SLACK_SIGNING_SECRET", "")


def verify_slack_signature(timestamp: str, body: bytes, signature: str) -> bool:
    """Verify Slack request signature. Returns True if valid OR if no secret configured (dev mode)."""
    if not SLACK_SIGNING_SECRET:
        return True  # dev mode — accept all
    if not timestamp or not signature:
        return False
    try:
        if abs(time.time() - int(timestamp)) > 60 * 5:
            return False  # replay protection
    except Exception:
        return False
    base = f"v0:{timestamp}:{body.decode('utf-8')}".encode("utf-8")
    digest = hmac.new(SLACK_SIGNING_SECRET.encode("utf-8"), base, hashlib.sha256).hexdigest()
    expected = f"v0={digest}"
    return hmac.compare_digest(expected, signature)
