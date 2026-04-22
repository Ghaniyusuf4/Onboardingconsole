"""Singular Testing Console + Attribution Details proxy routes."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

import requests
from fastapi import APIRouter, HTTPException, Request

from deps import db, get_current_user
from models import AttributionQuery, TestRunCreate

router = APIRouter()


@router.post("/singular/test-console")
async def singular_test_console(payload: TestRunCreate, request: Request):
    user = await get_current_user(request)
    sdk_key = payload.sdk_key
    if not sdk_key:
        raise HTTPException(400, "Missing SDK key")
    if not payload.device_id:
        raise HTTPException(400, "Missing device_id")
    # Singular Testing Console API (BETA)
    # GET https://api.singular.net/api/v1/testing/start_session?sdk_key=...&device_id=...&platform=...
    status_code = None
    try:
        r = requests.get(
            "https://api.singular.net/api/v1/testing/start_session",
            params={"sdk_key": sdk_key, "device_id": payload.device_id, "platform": payload.platform},
            timeout=20,
        )
        status_code = r.status_code
        ok = r.status_code == 200
        try:
            body = r.json()
        except Exception:
            body = {"raw": r.text}
    except Exception as e:
        ok = False
        body = {"error": str(e)}
    log_entry = {
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "project_id": payload.project_id,
        "kind": "test_console",
        "request": payload.model_dump(),
        "response": body,
        "status_code": status_code,
        "ok": ok,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.test_runs.insert_one(log_entry)
    log_entry.pop("_id", None)
    return log_entry


@router.post("/singular/attribution")
async def singular_attribution(payload: AttributionQuery, request: Request):
    user = await get_current_user(request)
    params = {
        "api_key": payload.api_key,
        "platform": payload.platform,
        "device_id": payload.device_id,
        "device_id_type": payload.device_id_type,
    }
    if payload.app:
        params["app"] = payload.app
    status_code = None
    try:
        r = requests.get("https://api.singular.net/api/v1/attribution", params=params, timeout=20)
        status_code = r.status_code
        try:
            body = r.json()
        except Exception:
            body = {"raw": r.text}
        ok = r.status_code == 200
    except Exception as e:
        body = {"error": str(e)}
        ok = False
    rec = {
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "kind": "attribution",
        "request": {k: v for k, v in payload.model_dump().items() if k != "api_key"},
        "response": body,
        "status_code": status_code,
        "ok": ok,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.test_runs.insert_one(rec)
    rec.pop("_id", None)
    return rec


@router.get("/projects/{project_id}/test-runs")
async def list_test_runs(project_id: str, request: Request):
    user = await get_current_user(request)
    docs = await db.test_runs.find(
        {"project_id": project_id, "user_id": user.user_id}, {"_id": 0},
    ).sort("created_at", -1).to_list(200)
    return docs
