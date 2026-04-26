"""Project / tasks / comments / share-link routes."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Dict

from fastapi import APIRouter, HTTPException, Request

from deps import db, get_current_user
from health import compute_health
from models import (
    ActionItemCreate,
    ActionItemUpdate,
    ChecklistUpdate,
    CommentIn,
    GoLiveDateUpdate,
    Project,
    ProjectCreate,
    TaskUpdate,
    ActionItem,
)
from template import build_default_phases

router = APIRouter()


# ---------- Project CRUD ----------
@router.get("/projects")
async def list_projects(request: Request):
    user = await get_current_user(request)
    docs = await db.projects.find({"user_id": user.user_id}, {"_id": 0}).to_list(500)
    runs = await db.test_runs.find(
        {"user_id": user.user_id},
        {"_id": 0, "project_id": 1, "kind": 1, "ok": 1},
    ).to_list(5000)
    apks = await db.apk_uploads.find(
        {"user_id": user.user_id},
        {"_id": 0, "project_id": 1, "audit": 1, "uploaded_at": 1},
    ).to_list(2000)
    out = []
    for d in docs:
        h = compute_health(d, runs, apks=apks)
        out.append({
            "id": d["id"], "name": d["name"], "customer": d.get("customer"),
            "platform": d.get("platform"), "created_at": d.get("created_at"),
            "tasks_total": h["tasks_total"], "tasks_closed": h["tasks_closed"],
            "progress": h["progress"], "health_score": h["score"],
            "health_grade": h["grade"], "blocked": h["blocked"],
            "apk_sdk_detected": h["apk_sdk_detected"], "apk_sdk_version": h["apk_sdk_version"],
        })
    return out


@router.post("/projects")
async def create_project(payload: ProjectCreate, request: Request):
    user = await get_current_user(request)
    phases = build_default_phases() if payload.apply_template else []
    project = Project(
        user_id=user.user_id, name=payload.name, customer=payload.customer,
        platform=payload.platform, phases=phases,
    )
    doc = project.model_dump()
    await db.projects.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/projects/{project_id}")
async def get_project(project_id: str, request: Request):
    user = await get_current_user(request)
    doc = await db.projects.find_one({"id": project_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Project not found")
    return doc


@router.get("/projects/{project_id}/health")
async def project_health(project_id: str, request: Request):
    user = await get_current_user(request)
    doc = await db.projects.find_one({"id": project_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Project not found")
    runs = await db.test_runs.find(
        {"user_id": user.user_id, "project_id": project_id}, {"_id": 0},
    ).to_list(2000)
    apks = await db.apk_uploads.find(
        {"user_id": user.user_id, "project_id": project_id}, {"_id": 0},
    ).to_list(500)
    return compute_health(doc, runs, detailed=True, apks=apks)


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.projects.delete_one({"id": project_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Project not found")
    await db.apk_uploads.delete_many({"project_id": project_id})
    await db.test_runs.delete_many({"project_id": project_id})
    await db.task_comments.delete_many({"project_id": project_id})
    await db.customer_contacts.delete_many({"project_id": project_id})
    await db.action_items.delete_many({"project_id": project_id})
    return {"ok": True}


@router.patch("/projects/{project_id}/keys")
async def update_keys(project_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    update = {k: v for k, v in body.items() if k in ("sdk_key", "api_key")}
    await db.projects.update_one(
        {"id": project_id, "user_id": user.user_id}, {"$set": update},
    )
    return {"ok": True}


# ---------- Share link ----------
@router.post("/projects/{project_id}/share")
async def create_share(project_id: str, request: Request):
    user = await get_current_user(request)
    proj = await db.projects.find_one({"id": project_id, "user_id": user.user_id}, {"_id": 0})
    if not proj:
        raise HTTPException(404, "Project not found")
    token = proj.get("share_token") or f"sh_{uuid.uuid4().hex[:24]}"
    await db.projects.update_one({"id": project_id}, {"$set": {"share_token": token}})
    return {"share_token": token}


@router.delete("/projects/{project_id}/share")
async def revoke_share(project_id: str, request: Request):
    user = await get_current_user(request)
    await db.projects.update_one(
        {"id": project_id, "user_id": user.user_id},
        {"$unset": {"share_token": ""}},
    )
    return {"ok": True}


@router.get("/public/share/{token}")
async def public_share_view(token: str):
    proj = await db.projects.find_one({"share_token": token}, {"_id": 0})
    if not proj:
        raise HTTPException(404, "Share link not found or revoked")
    runs = await db.test_runs.find({"project_id": proj["id"]}, {"_id": 0}).to_list(2000)
    apks = await db.apk_uploads.find({"project_id": proj["id"]}, {"_id": 0}).to_list(500)
    health = compute_health(proj, runs, detailed=True, apks=apks)
    comments = await db.task_comments.find({"project_id": proj["id"]}, {"_id": 0}).to_list(1000)
    by_task: Dict[str, list] = {}
    for c in comments:
        by_task.setdefault(c["task_id"], []).append(c)
    safe_phases = []
    for p in proj.get("phases", []):
        safe_tasks = []
        for t in p.get("tasks", []):
            safe_tasks.append({
                "id": t["id"], "title": t["title"], "owner": t.get("owner"),
                "status": t.get("status"), "priority": t.get("priority"),
                "checklist": [
                    {"id": c["id"], "label": c["label"], "done": c.get("done", False)}
                    for c in t.get("checklist", [])
                ],
                "comments": sorted(by_task.get(t["id"], []), key=lambda x: x["created_at"]),
            })
        safe_phases.append({
            "id": p["id"], "name": p["name"], "description": p.get("description"),
            "order": p.get("order", 0), "tasks": safe_tasks,
        })
    return {
        "name": proj["name"], "customer": proj.get("customer"),
        "platform": proj.get("platform"), "created_at": proj.get("created_at"),
        "phases": safe_phases, "health": health,
    }


@router.post("/public/share/{token}/comments")
async def add_public_comment(token: str, payload: CommentIn):
    proj = await db.projects.find_one({"share_token": token}, {"_id": 0})
    if not proj:
        raise HTTPException(404, "Share link not found")
    found = any(t["id"] == payload.task_id for p in proj.get("phases", []) for t in p.get("tasks", []))
    if not found:
        raise HTTPException(404, "Task not found")
    if not payload.body.strip() or not payload.author_name.strip():
        raise HTTPException(400, "Author and body required")
    rec = {
        "id": str(uuid.uuid4()),
        "project_id": proj["id"],
        "task_id": payload.task_id,
        "author_name": payload.author_name.strip()[:80],
        "body": payload.body.strip()[:2000],
        "source": "customer",
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.task_comments.insert_one(rec)
    rec.pop("_id", None)
    return rec


# ---------- Comments ----------
@router.get("/projects/{project_id}/comments")
async def list_comments(project_id: str, request: Request):
    user = await get_current_user(request)
    proj = await db.projects.find_one(
        {"id": project_id, "user_id": user.user_id}, {"_id": 0, "phases": 1, "id": 1},
    )
    if not proj:
        raise HTTPException(404, "Project not found")
    comments = await db.task_comments.find({"project_id": project_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    title_by_id = {t["id"]: t["title"] for p in proj.get("phases", []) for t in p.get("tasks", [])}
    for c in comments:
        c["task_title"] = title_by_id.get(c["task_id"], "(unknown task)")
    unread = sum(1 for c in comments if not c.get("read"))
    return {"comments": comments, "unread": unread, "total": len(comments)}


@router.patch("/projects/{project_id}/comments/{comment_id}")
async def mark_comment_read(project_id: str, comment_id: str, request: Request):
    user = await get_current_user(request)
    proj = await db.projects.find_one(
        {"id": project_id, "user_id": user.user_id}, {"_id": 0, "id": 1},
    )
    if not proj:
        raise HTTPException(404, "Project not found")
    await db.task_comments.update_one(
        {"id": comment_id, "project_id": project_id}, {"$set": {"read": True}},
    )
    return {"ok": True}


# ---------- Tasks ----------
@router.patch("/projects/{project_id}/tasks/{task_id}")
async def update_task(project_id: str, task_id: str, payload: TaskUpdate, request: Request):
    user = await get_current_user(request)
    doc = await db.projects.find_one({"id": project_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Project not found")
    updated = False
    for ph in doc["phases"]:
        for t in ph["tasks"]:
            if t["id"] == task_id:
                for k, v in payload.model_dump(exclude_none=True).items():
                    t[k] = v
                updated = True
                break
        if updated:
            break
    if not updated:
        raise HTTPException(404, "Task not found")
    await db.projects.update_one({"id": project_id}, {"$set": {"phases": doc["phases"]}})
    return {"ok": True}


@router.patch("/projects/{project_id}/tasks/{task_id}/checklist/{item_id}")
async def update_checklist(
    project_id: str, task_id: str, item_id: str, payload: ChecklistUpdate, request: Request,
):
    user = await get_current_user(request)
    doc = await db.projects.find_one({"id": project_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Project not found")
    for ph in doc["phases"]:
        for t in ph["tasks"]:
            if t["id"] == task_id:
                for c in t["checklist"]:
                    if c["id"] == item_id:
                        c["done"] = payload.done
    await db.projects.update_one({"id": project_id}, {"$set": {"phases": doc["phases"]}})
    return {"ok": True}


# ---------- Go Live date ----------

@router.put("/projects/{project_id}/go-live-date")
async def set_go_live_date(project_id: str, payload: GoLiveDateUpdate, request: Request):
    user = await get_current_user(request)
    doc = await db.projects.find_one({"id": project_id, "user_id": user.user_id}, {"_id": 0, "id": 1})
    if not doc:
        raise HTTPException(404, "Project not found")
    if payload.go_live_date is None:
        await db.projects.update_one({"id": project_id}, {"$unset": {"go_live_date": ""}})
    else:
        await db.projects.update_one({"id": project_id}, {"$set": {"go_live_date": payload.go_live_date}})
    return {"ok": True, "go_live_date": payload.go_live_date}


# ---------- Action items ----------

@router.get("/projects/{project_id}/action-items")
async def list_action_items(project_id: str, request: Request):
    user = await get_current_user(request)
    doc = await db.projects.find_one({"id": project_id, "user_id": user.user_id}, {"_id": 0, "id": 1})
    if not doc:
        raise HTTPException(404, "Project not found")
    items = await db.action_items.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)
    # Enrich with contact info for display
    contact_ids = list({i["assigned_to_contact_id"] for i in items if i.get("assigned_to_contact_id")})
    contact_map: dict = {}
    if contact_ids:
        contacts = await db.customer_contacts.find(
            {"contact_id": {"$in": contact_ids}}, {"_id": 0, "contact_id": 1, "name": 1, "email": 1}
        ).to_list(200)
        contact_map = {c["contact_id"]: c for c in contacts}
    for item in items:
        cid = item.get("assigned_to_contact_id")
        item["contact"] = contact_map.get(cid) if cid else None
    return items


@router.post("/projects/{project_id}/action-items", status_code=201)
async def create_action_item(project_id: str, payload: ActionItemCreate, request: Request):
    import os
    user = await get_current_user(request)
    doc = await db.projects.find_one(
        {"id": project_id, "user_id": user.user_id},
        {"_id": 0, "id": 1, "name": 1, "share_token": 1},
    )
    if not doc:
        raise HTTPException(404, "Project not found")
    item = ActionItem(project_id=project_id, **payload.model_dump())
    item_doc = item.model_dump()
    await db.action_items.insert_one(item_doc)
    item_doc.pop("_id", None)

    # Fire email + Slack alert to assigned contact (non-blocking)
    if payload.assigned_to_contact_id:
        contact = await db.customer_contacts.find_one(
            {"contact_id": payload.assigned_to_contact_id}, {"_id": 0}
        )
        if contact:
            from email_service import send_action_item_assigned
            from routes.slack import send_contact_alert
            project_name = doc.get("name", "your project")
            share_token = doc.get("share_token")
            share_url = (
                f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/share/{share_token}"
                if share_token else None
            )
            try:
                await send_action_item_assigned(
                    contact_email=contact["email"],
                    contact_name=contact["name"],
                    item_title=payload.title,
                    due_date=payload.due_date,
                    project_name=project_name,
                    share_url=share_url,
                )
            except Exception:
                pass
            try:
                await send_contact_alert(
                    contact=contact,
                    project_name=project_name,
                    item_title=payload.title,
                    due_date=payload.due_date,
                    share_url=share_url,
                )
            except Exception:
                pass

    return item_doc


@router.put("/projects/{project_id}/action-items/{item_id}")
async def update_action_item(
    project_id: str, item_id: str, payload: ActionItemUpdate, request: Request
):
    user = await get_current_user(request)
    doc = await db.projects.find_one({"id": project_id, "user_id": user.user_id}, {"_id": 0, "id": 1})
    if not doc:
        raise HTTPException(404, "Project not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    result = await db.action_items.update_one(
        {"item_id": item_id, "project_id": project_id},
        {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Action item not found")
    updated = await db.action_items.find_one({"item_id": item_id}, {"_id": 0})
    return updated


@router.delete("/projects/{project_id}/action-items/{item_id}")
async def delete_action_item(project_id: str, item_id: str, request: Request):
    user = await get_current_user(request)
    doc = await db.projects.find_one({"id": project_id, "user_id": user.user_id}, {"_id": 0, "id": 1})
    if not doc:
        raise HTTPException(404, "Project not found")
    result = await db.action_items.delete_one({"item_id": item_id, "project_id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Action item not found")
    return {"ok": True}
