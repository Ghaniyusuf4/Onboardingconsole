"""Customer contact routes — manage external contacts per onboarding project."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from deps import db, get_current_user
from models import CustomerContact, CustomerContactCreate, CustomerContactUpdate

router = APIRouter()


async def _assert_project_owner(project_id: str, user_id: str) -> dict:
    doc = await db.projects.find_one({"id": project_id, "user_id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Project not found")
    return doc


@router.get("/projects/{project_id}/contacts")
async def list_contacts(project_id: str, request: Request):
    user = await get_current_user(request)
    await _assert_project_owner(project_id, user.user_id)
    docs = await db.customer_contacts.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    return docs


@router.post("/projects/{project_id}/contacts", status_code=201)
async def create_contact(project_id: str, payload: CustomerContactCreate, request: Request):
    user = await get_current_user(request)
    await _assert_project_owner(project_id, user.user_id)
    contact = CustomerContact(project_id=project_id, **payload.model_dump())
    doc = contact.model_dump()
    await db.customer_contacts.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/projects/{project_id}/contacts/{contact_id}")
async def update_contact(
    project_id: str, contact_id: str, payload: CustomerContactUpdate, request: Request
):
    user = await get_current_user(request)
    await _assert_project_owner(project_id, user.user_id)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(400, "No fields to update")
    result = await db.customer_contacts.update_one(
        {"contact_id": contact_id, "project_id": project_id},
        {"$set": updates},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Contact not found")
    doc = await db.customer_contacts.find_one(
        {"contact_id": contact_id}, {"_id": 0}
    )
    return doc


@router.delete("/projects/{project_id}/contacts/{contact_id}")
async def delete_contact(project_id: str, contact_id: str, request: Request):
    user = await get_current_user(request)
    await _assert_project_owner(project_id, user.user_id)
    result = await db.customer_contacts.delete_one(
        {"contact_id": contact_id, "project_id": project_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(404, "Contact not found")
    return {"ok": True}
