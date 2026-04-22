"""APK / AAB upload, listing and (re-)audit routes."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from apk_audit import audit as audit_apk_bytes
from deps import APP_NAME, db, get_current_user, get_object, put_object

router = APIRouter()


def _run_audit_safe(data: bytes, filename: str) -> dict:
    try:
        return audit_apk_bytes(data, filename)
    except Exception as e:
        logging.exception("APK audit failed")
        return {"errors": [f"Audit failed: {e}"], "has_singular_sdk": False, "findings": []}


@router.post("/projects/{project_id}/apk")
async def upload_apk(project_id: str, request: Request, file: UploadFile = File(...)):
    user = await get_current_user(request)
    proj = await db.projects.find_one({"id": project_id, "user_id": user.user_id}, {"_id": 0})
    if not proj:
        raise HTTPException(404, "Project not found")
    ext = file.filename.split(".")[-1] if "." in file.filename else "apk"
    storage_path = f"{APP_NAME}/apks/{user.user_id}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    size = len(data)
    try:
        result = put_object(
            storage_path, data,
            file.content_type or "application/vnd.android.package-archive",
        )
        actual_path = result.get("path", storage_path)
    except Exception as e:
        logging.error(f"APK upload failed: {e}")
        raise HTTPException(500, f"Storage upload failed: {e}")

    audit = _run_audit_safe(data, file.filename)

    rec = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "user_id": user.user_id,
        "filename": file.filename,
        "size": size,
        "storage_path": actual_path,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "audit": audit,
    }
    await db.apk_uploads.insert_one(rec)
    rec.pop("_id", None)
    return rec


@router.get("/projects/{project_id}/apks")
async def list_apks(project_id: str, request: Request):
    user = await get_current_user(request)
    docs = await db.apk_uploads.find(
        {"project_id": project_id, "user_id": user.user_id}, {"_id": 0},
    ).to_list(200)
    return docs


@router.post("/projects/{project_id}/apks/{apk_id}/re-audit")
async def re_audit_apk(project_id: str, apk_id: str, request: Request):
    """Re-download the APK from object storage and re-run the static audit.

    Useful for older uploads that predate the audit feature (no `audit` field),
    or after the audit logic itself is upgraded.
    """
    user = await get_current_user(request)
    apk = await db.apk_uploads.find_one(
        {"id": apk_id, "project_id": project_id, "user_id": user.user_id},
        {"_id": 0},
    )
    if not apk:
        raise HTTPException(404, "APK not found")
    try:
        data, _ct = get_object(apk["storage_path"])
    except Exception as e:
        logging.error(f"APK re-audit fetch failed: {e}")
        raise HTTPException(502, f"Failed to fetch APK from storage: {e}")
    audit = _run_audit_safe(data, apk.get("filename", ""))
    await db.apk_uploads.update_one(
        {"id": apk_id},
        {"$set": {"audit": audit, "audit_updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    apk["audit"] = audit
    apk["audit_updated_at"] = datetime.now(timezone.utc).isoformat()
    return apk


@router.post("/projects/{project_id}/apks/re-audit-missing")
async def re_audit_missing_apks(project_id: str, request: Request):
    """Bulk re-audit every APK in the project that does not yet have an `audit` block
    (or whose audit was produced by a crash / empty)."""
    user = await get_current_user(request)
    cursor = db.apk_uploads.find(
        {"project_id": project_id, "user_id": user.user_id}, {"_id": 0},
    )
    rescanned = 0
    skipped = 0
    failures: list[dict] = []
    async for apk in cursor:
        needs = not apk.get("audit") or not apk.get("audit", {}).get("findings")
        if not needs:
            skipped += 1
            continue
        try:
            data, _ct = get_object(apk["storage_path"])
            audit = _run_audit_safe(data, apk.get("filename", ""))
            await db.apk_uploads.update_one(
                {"id": apk["id"]},
                {"$set": {
                    "audit": audit,
                    "audit_updated_at": datetime.now(timezone.utc).isoformat(),
                }},
            )
            rescanned += 1
        except Exception as e:
            logging.exception("Bulk re-audit failed for one APK")
            failures.append({"id": apk["id"], "error": str(e)})
    return {"rescanned": rescanned, "skipped": skipped, "failures": failures}
