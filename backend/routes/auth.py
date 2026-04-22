"""Authentication routes — Emergent-managed Google OAuth."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import requests
from fastapi import APIRouter, Header, HTTPException, Request, Response

from deps import db, get_current_user
from models import User

router = APIRouter()


@router.post("/auth/session")
async def auth_session(request: Request, response: Response, x_session_id: str = Header(None)):
    if not x_session_id:
        body = await request.json()
        x_session_id = body.get("session_id")
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    r = requests.get(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": x_session_id}, timeout=20,
    )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="OAuth session invalid")
    data = r.json()
    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", ""), "picture": data.get("picture", "")}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    expires = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": data["session_token"],
        "expires_at": expires.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie(
        key="session_token", value=data["session_token"],
        max_age=7 * 24 * 60 * 60, path="/", httponly=True, secure=True, samesite="none",
    )
    return {"user_id": user_id, "email": email, "name": data.get("name", ""), "picture": data.get("picture", "")}


@router.get("/auth/me", response_model=User)
async def auth_me(request: Request):
    return await get_current_user(request)


@router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}
