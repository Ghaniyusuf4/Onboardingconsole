"""Authentication routes — self-hosted Google OAuth (restricted to @singular.net)."""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import requests
from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.responses import RedirectResponse

from deps import db, get_current_user
from models import User

router = APIRouter()

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

# Must match the URI registered in Google Cloud Console
GOOGLE_REDIRECT_URI = os.environ.get(
    "GOOGLE_REDIRECT_URI",
    f"{os.environ.get('BACKEND_URL', 'http://localhost:8001')}/api/auth/callback/google",
)

ALLOWED_DOMAIN = "singular.net"


@router.get("/auth/google")
async def google_login():
    """Redirect browser to Google's OAuth consent screen."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(500, "GOOGLE_CLIENT_ID not configured")
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "hd": ALLOWED_DOMAIN,  # hint Google to show only @singular.net accounts
        "prompt": "select_account",
    }
    return RedirectResponse(url="https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params))


@router.get("/auth/callback/google")
async def google_callback(
    request: Request,
    code: str | None = None,
    error: str | None = None,
):
    """Handle Google OAuth callback, create session, redirect to frontend."""
    if error or not code:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=oauth_failed")

    # Exchange authorization code for tokens
    token_resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=20,
    )
    if token_resp.status_code != 200:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=token_exchange_failed")

    tokens = token_resp.json()
    access_token = tokens.get("access_token")
    if not access_token:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=no_access_token")

    # Fetch user profile
    userinfo_resp = requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=20,
    )
    if userinfo_resp.status_code != 200:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=userinfo_failed")

    userinfo = userinfo_resp.json()
    email: str = userinfo.get("email", "")

    # Enforce @singular.net domain
    if not email.endswith(f"@{ALLOWED_DOMAIN}"):
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=unauthorized_domain")

    name = userinfo.get("name", "")
    picture = userinfo.get("picture", "")

    # Upsert user in DB
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    # Create session
    session_token = f"sess_{uuid.uuid4().hex}"
    expires = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Redirect to frontend — put session_token in URL fragment so the frontend
    # can store it in localStorage and send it as a Bearer header (avoids
    # cross-port cookie issues in local dev).
    redirect = RedirectResponse(
        url=f"{FRONTEND_URL}/dashboard#session_token={session_token}",
        status_code=302,
    )
    # Also set the cookie for same-origin production deployments.
    redirect.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        path="/",
        httponly=True,
        secure=os.environ.get("ENV", "development") == "production",
        samesite="lax",
    )
    return redirect


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
