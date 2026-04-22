from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Header, UploadFile, File, Cookie
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
import uuid
import requests
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Mongo
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Object storage config
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
APP_NAME = "singular-onboarding"
storage_key: Optional[str] = None

def init_storage() -> Optional[str]:
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_KEY:
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json().get("storage_key")
        return storage_key
    except Exception as e:
        logging.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=180
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=120
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ============ Models ============
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

# ============ Onboarding Template ============
def build_default_phases() -> List[Phase]:
    template = [
        ("Platform Setup", "Account provisioning and team access", [
            ("Singular Account Provisioning", "Singular", "high", ["Team Management defined", "Agency Access defined"]),
            ("Analytics Data Connectors", "Solution Engineer", "high", ["Data connector alerts wired to Slack"]),
        ]),
        ("Configure Your Apps", "Verify app setup", [
            ("Verify setup in Apps page", "CSM", "high", ["App package names verified", "Bundle IDs verified"]),
        ]),
        ("Data Import & SDK Setup", "Historical import and SDK integration", [
            ("Device-Level Historical Data Import", "Solution Engineer", "high", ["File spec aligned", "Initial QA file delivered", "Delta file post-integration"]),
            ("SDK Documentation Review", "Solution Engineer", "medium", ["Requirements gathered"]),
            ("SDK Basic Integration", "Solution Engineer", "high", [
                "Sessions trigger validated via SDK console",
                "Install and Attribution validated via Export Logs",
                "Custom User ID method validated",
                "Revenue/IAP receipt events validated",
                "Deep Link & Deferred Deeplink callbacks validated",
                "SKAdNetwork SDK parameters validated",
                "Uninstall tracking & Global properties validated",
                "SDK QA across versions 4.2-4.11",
                "Google Play License Key added",
                "Push notifications session start logs",
                "Referral tracking validated",
                "Meta App ID configuration validated",
                "Tech enablement flag removed",
                "First app launch after Play Store live",
            ]),
        ]),
        ("SAN Partner Configuration", "Self-attributing networks setup", [
            ("Facebook (coordinated event switch)", "CSM", "high", ["Events imported for SKAN", "Advanced AEM setup"]),
            ("Google AdWords", "CSM", "high", ["AppsFlyer vs Singular numbers consistent", "AF vs Firebase discrepancy ratio consistent"]),
            ("Snapchat (coordinated event switch)", "CSM", "medium", ["Account linked", "Events mapped"]),
            ("Twitter", "CSM", "medium", ["Account linked"]),
            ("Apple Search Ads", "CSM", "medium", ["Account linked", "Token validated"]),
        ]),
        ("Reporting & Partner Configurations", "QA reports and dashboards", [
            ("SAN Configuration QA", "CSM", "high", ["KPI events mapped 24h after SDK trigger", "Custom dimensions defined"]),
            ("Configure Campaign Report", "CSM", "medium", ["Saved in Analytics > Pivot/Reports", "Dimensions/metrics validated with POC"]),
            ("Configure Creative Report", "Singular", "medium", ["Saved in Analytics > Creatives"]),
            ("Configure Dashboard", "Singular", "medium", ["Saved in Dashboards"]),
            ("Audiences", "CSM", "low", ["Partners list shared for Audience segments"]),
            ("Fraud Global Rules", "CSM", "low", ["Rules reviewed for app applicability"]),
            ("Fraud Custom Rules", "CSM", "low", ["City-level tracker data", "QR codes created", "Partner configs for all networks"]),
        ]),
        ("Data Output & Erasure", "GDPR and ETL setup", [
            ("Implement GDPR Erasure Mechanism", "Solution Engineer", "high", ["Partner configs created", "Validated via Export Logs"]),
            ("Configure ETL Data Destination", "Solution Engineer", "medium", ["Validated via support script"]),
            ("Reverse ETL Configuration", "Solution Engineer", "low", ["Destination wired", "Mappings validated"]),
        ]),
        ("Device-Level Historical Import", "File ingestion processing", [
            ("Historical Import File Provided", "Solution Engineer", "low", ["Document delivered", "Validated via ingestion techniques"]),
            ("Historical Import Processing", "Singular", "low", ["Job triggered", "Results validated"]),
        ]),
        ("SKAN Setup & Campaign Launch", "iOS SKAN model and launch", [
            ("SKAN Setup", "CSM", "low", ["AppsFlyer SKAN model shared", "Singular reviewed with POC"]),
            ("Configure SKAN model", "CSM", "low", ["Campaign setup expectations reviewed"]),
            ("Campaign Launch", "Customer", "low", ["Campaigns launched on SAN networks", "SAN attribution data validated"]),
        ]),
    ]
    phases = []
    for i, (pname, pdesc, tasks) in enumerate(template):
        phase = Phase(name=pname, description=pdesc, order=i)
        for tname, owner, priority, items in tasks:
            t = Task(title=tname, owner=owner, priority=priority, status="open",
                     checklist=[ChecklistItem(label=lbl) for lbl in items])
            phase.tasks.append(t)
        phases.append(phase)
    return phases

# ============ Health Score ============
def compute_health(project: dict, runs: list, detailed: bool = False) -> dict:
    pid = project["id"]
    total = sum(len(p.get("tasks", [])) for p in project.get("phases", []))
    closed = sum(1 for p in project.get("phases", []) for t in p.get("tasks", []) if t.get("status") == "closed")
    blocked = sum(1 for p in project.get("phases", []) for t in p.get("tasks", []) if t.get("status") == "blocked")
    progress = int((closed / total) * 100) if total else 0

    test_runs = [r for r in runs if r.get("project_id") == pid and r.get("kind") == "test_console"]
    attr_runs = [r for r in runs if r.get("project_id") == pid and r.get("kind") == "attribution"]
    sdk_pass = int((sum(1 for r in test_runs if r.get("ok")) / len(test_runs)) * 100) if test_runs else None
    attr_pass = int((sum(1 for r in attr_runs if r.get("ok")) / len(attr_runs)) * 100) if attr_runs else None

    if sdk_pass is None and attr_pass is None:
        score = progress
    else:
        s_sdk = sdk_pass if sdk_pass is not None else progress
        s_attr = attr_pass if attr_pass is not None else progress
        score = round(0.60 * progress + 0.25 * s_sdk + 0.15 * s_attr)
    if blocked > 0:
        score = max(0, score - min(20, blocked * 5))

    grade = "A" if score >= 85 else "B" if score >= 70 else "C" if score >= 50 else "D" if score >= 25 else "F"

    base = {
        "score": score, "grade": grade, "progress": progress,
        "tasks_total": total, "tasks_closed": closed, "blocked": blocked,
        "sdk_pass_rate": sdk_pass, "attribution_pass_rate": attr_pass,
        "sdk_runs": len(test_runs), "attribution_runs": len(attr_runs),
    }
    if detailed:
        base["breakdown"] = [
            {"label": "Phase progress", "weight": 60, "value": progress},
            {"label": "SDK test pass rate", "weight": 25,
             "value": sdk_pass if sdk_pass is not None else 0,
             "note": "no runs yet" if sdk_pass is None else f"{len(test_runs)} run(s)"},
            {"label": "Attribution pass rate", "weight": 15,
             "value": attr_pass if attr_pass is not None else 0,
             "note": "no runs yet" if attr_pass is None else f"{len(attr_runs)} run(s)"},
            {"label": "Blocked task penalty", "weight": 0,
             "value": -min(20, blocked * 5), "note": f"{blocked} blocked"},
        ]
    return base


# ============ Auth helpers ============
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

# ============ Auth endpoints ============
@api_router.post("/auth/session")
async def auth_session(request: Request, response: Response, x_session_id: str = Header(None)):
    if not x_session_id:
        body = await request.json()
        x_session_id = body.get("session_id")
    if not x_session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    r = requests.get(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": x_session_id}, timeout=20
    )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="OAuth session invalid")
    data = r.json()
    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": data.get("name", ""), "picture": data.get("picture", "")}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data.get("name", ""),
            "picture": data.get("picture", ""),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    expires = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": data["session_token"],
        "expires_at": expires.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    response.set_cookie(
        key="session_token", value=data["session_token"],
        max_age=7*24*60*60, path="/", httponly=True, secure=True, samesite="none"
    )
    return {"user_id": user_id, "email": email, "name": data.get("name", ""), "picture": data.get("picture", "")}

@api_router.get("/auth/me", response_model=User)
async def auth_me(request: Request):
    return await get_current_user(request)

@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}

# ============ Project endpoints ============
@api_router.get("/projects")
async def list_projects(request: Request):
    user = await get_current_user(request)
    docs = await db.projects.find({"user_id": user.user_id}, {"_id": 0}).to_list(500)
    # gather test run aggregates per project in one query
    runs = await db.test_runs.find({"user_id": user.user_id}, {"_id": 0, "project_id": 1, "kind": 1, "ok": 1}).to_list(5000)
    out = []
    for d in docs:
        h = compute_health(d, runs)
        out.append({
            "id": d["id"], "name": d["name"], "customer": d.get("customer"),
            "platform": d.get("platform"), "created_at": d.get("created_at"),
            "tasks_total": h["tasks_total"], "tasks_closed": h["tasks_closed"],
            "progress": h["progress"], "health_score": h["score"],
            "health_grade": h["grade"], "blocked": h["blocked"],
        })
    return out

@api_router.post("/projects")
async def create_project(payload: ProjectCreate, request: Request):
    user = await get_current_user(request)
    phases = build_default_phases() if payload.apply_template else []
    project = Project(user_id=user.user_id, name=payload.name, customer=payload.customer, platform=payload.platform, phases=phases)
    doc = project.model_dump()
    await db.projects.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, request: Request):
    user = await get_current_user(request)
    doc = await db.projects.find_one({"id": project_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Project not found")
    return doc

@api_router.get("/projects/{project_id}/health")
async def project_health(project_id: str, request: Request):
    user = await get_current_user(request)
    doc = await db.projects.find_one({"id": project_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Project not found")
    runs = await db.test_runs.find({"user_id": user.user_id, "project_id": project_id}, {"_id": 0}).to_list(2000)
    return compute_health(doc, runs, detailed=True)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, request: Request):
    user = await get_current_user(request)
    await db.projects.delete_one({"id": project_id, "user_id": user.user_id})
    await db.apk_uploads.delete_many({"project_id": project_id})
    await db.test_runs.delete_many({"project_id": project_id})
    return {"ok": True}

@api_router.patch("/projects/{project_id}/keys")
async def update_keys(project_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    update = {k: v for k, v in body.items() if k in ("sdk_key", "api_key")}
    await db.projects.update_one({"id": project_id, "user_id": user.user_id}, {"$set": update})
    return {"ok": True}

# ============ Share Link (read-only customer view) ============
@api_router.post("/projects/{project_id}/share")
async def create_share(project_id: str, request: Request):
    user = await get_current_user(request)
    proj = await db.projects.find_one({"id": project_id, "user_id": user.user_id}, {"_id": 0})
    if not proj:
        raise HTTPException(404, "Project not found")
    token = proj.get("share_token") or f"sh_{uuid.uuid4().hex[:24]}"
    await db.projects.update_one({"id": project_id}, {"$set": {"share_token": token}})
    return {"share_token": token}

@api_router.delete("/projects/{project_id}/share")
async def revoke_share(project_id: str, request: Request):
    user = await get_current_user(request)
    await db.projects.update_one(
        {"id": project_id, "user_id": user.user_id},
        {"$unset": {"share_token": ""}}
    )
    return {"ok": True}

@api_router.get("/public/share/{token}")
async def public_share_view(token: str):
    proj = await db.projects.find_one({"share_token": token}, {"_id": 0})
    if not proj:
        raise HTTPException(404, "Share link not found or revoked")
    runs = await db.test_runs.find({"project_id": proj["id"]}, {"_id": 0}).to_list(2000)
    health = compute_health(proj, runs, detailed=True)
    # Strip sensitive fields (sdk_key, api_key, user_id)
    safe_phases = []
    for p in proj.get("phases", []):
        safe_tasks = []
        for t in p.get("tasks", []):
            safe_tasks.append({
                "id": t["id"], "title": t["title"], "owner": t.get("owner"),
                "status": t.get("status"), "priority": t.get("priority"),
                "checklist": [{"id": c["id"], "label": c["label"], "done": c.get("done", False)} for c in t.get("checklist", [])],
            })
        safe_phases.append({
            "id": p["id"], "name": p["name"], "description": p.get("description"),
            "order": p.get("order", 0), "tasks": safe_tasks
        })
    return {
        "name": proj["name"], "customer": proj.get("customer"),
        "platform": proj.get("platform"), "created_at": proj.get("created_at"),
        "phases": safe_phases, "health": health,
    }

@api_router.patch("/projects/{project_id}/tasks/{task_id}")
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

@api_router.patch("/projects/{project_id}/tasks/{task_id}/checklist/{item_id}")
async def update_checklist(project_id: str, task_id: str, item_id: str, payload: ChecklistUpdate, request: Request):
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

# ============ APK Upload ============
@api_router.post("/projects/{project_id}/apk")
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
        result = put_object(storage_path, data, file.content_type or "application/vnd.android.package-archive")
        actual_path = result.get("path", storage_path)
    except Exception as e:
        logging.error(f"APK upload failed: {e}")
        raise HTTPException(500, f"Storage upload failed: {e}")
    rec = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "user_id": user.user_id,
        "filename": file.filename,
        "size": size,
        "storage_path": actual_path,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.apk_uploads.insert_one(rec)
    rec.pop("_id", None)
    return rec

@api_router.get("/projects/{project_id}/apks")
async def list_apks(project_id: str, request: Request):
    user = await get_current_user(request)
    docs = await db.apk_uploads.find({"project_id": project_id, "user_id": user.user_id}, {"_id": 0}).to_list(200)
    return docs

# ============ Singular APIs ============
@api_router.post("/singular/test-console")
async def singular_test_console(payload: TestRunCreate, request: Request):
    user = await get_current_user(request)
    sdk_key = payload.sdk_key
    if not sdk_key:
        raise HTTPException(400, "Missing SDK key")
    if not payload.device_id:
        raise HTTPException(400, "Missing device_id")
    # Singular Testing Console API - BETA. Endpoint per docs:
    # GET https://api.singular.net/api/v1/testing/start_session?sdk_key=...&device_id=...&platform=...
    try:
        r = requests.get(
            "https://api.singular.net/api/v1/testing/start_session",
            params={"sdk_key": sdk_key, "device_id": payload.device_id, "platform": payload.platform},
            timeout=20,
        )
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
        "status_code": r.status_code if 'r' in dir() and hasattr(r, 'status_code') else None,
        "ok": ok,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.test_runs.insert_one(log_entry)
    log_entry.pop("_id", None)
    return log_entry

@api_router.post("/singular/attribution")
async def singular_attribution(payload: AttributionQuery, request: Request):
    user = await get_current_user(request)
    # Attribution Details API: GET https://api.singular.net/api/v1/attribution
    params = {
        "api_key": payload.api_key,
        "platform": payload.platform,
        "device_id": payload.device_id,
        "device_id_type": payload.device_id_type,
    }
    if payload.app:
        params["app"] = payload.app
    try:
        r = requests.get("https://api.singular.net/api/v1/attribution", params=params, timeout=20)
        try:
            body = r.json()
        except Exception:
            body = {"raw": r.text}
        ok = r.status_code == 200
        status_code = r.status_code
    except Exception as e:
        body = {"error": str(e)}
        ok = False
        status_code = None
    rec = {
        "id": str(uuid.uuid4()),
        "user_id": user.user_id,
        "kind": "attribution",
        "request": {k: v for k, v in payload.model_dump().items() if k != "api_key"},
        "response": body,
        "status_code": status_code,
        "ok": ok,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.test_runs.insert_one(rec)
    rec.pop("_id", None)
    return rec

@api_router.get("/projects/{project_id}/test-runs")
async def list_test_runs(project_id: str, request: Request):
    user = await get_current_user(request)
    docs = await db.test_runs.find({"project_id": project_id, "user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

# ============ Health ============
@api_router.get("/")
async def root():
    return {"service": "singular-onboarding", "status": "ok"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    init_storage()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
