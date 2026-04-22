"""Pydantic models shared across routers."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None


class ChecklistItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    done: bool = False


class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    owner: Optional[str] = None
    status: str = "open"  # open, in_progress, blocked, closed
    priority: str = "medium"  # low, medium, high
    eta: Optional[str] = None
    comments: Optional[str] = None
    checklist: List[ChecklistItem] = Field(default_factory=list)


class Phase(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    order: int = 0
    tasks: List[Task] = Field(default_factory=list)


class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    customer: Optional[str] = None
    platform: str = "android"  # android | ios | both
    sdk_key: Optional[str] = None
    api_key: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    phases: List[Phase] = Field(default_factory=list)


class ProjectCreate(BaseModel):
    name: str
    customer: Optional[str] = None
    platform: str = "android"
    apply_template: bool = True


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    owner: Optional[str] = None
    eta: Optional[str] = None
    comments: Optional[str] = None
    title: Optional[str] = None


class ChecklistUpdate(BaseModel):
    done: bool


class TestRunCreate(BaseModel):
    project_id: str
    sdk_key: Optional[str] = None
    api_key: Optional[str] = None
    device_id: Optional[str] = None
    platform: str = "android"
    event_name: Optional[str] = None
    event_args: Optional[Dict[str, Any]] = None


class AttributionQuery(BaseModel):
    api_key: str
    device_id: str
    platform: str = "android"
    app: Optional[str] = None
    device_id_type: str = "advertising_id"  # advertising_id, idfa, idfv, android_id


class CommentIn(BaseModel):
    task_id: str
    author_name: str
    body: str
