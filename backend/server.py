"""FastAPI entrypoint — wires routers, middleware, and scheduler."""
from __future__ import annotations

import logging
import os

from fastapi import APIRouter, FastAPI, Request
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from deps import client, init_storage
from routes import apk as apk_routes
from routes import auth as auth_routes
from routes import contacts as contact_routes
from routes import projects as project_routes
from routes import singular as singular_routes
from routes import slack as slack_routes

app = FastAPI(title="Singular Onboarding Console", version="2.0.0")
api_router = APIRouter(prefix="/api")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


@api_router.api_route("/", methods=["GET", "HEAD"])
async def root():
    return {"service": "singular-onboarding", "status": "ok", "version": "2.0.0"}


# Mount feature routers under /api
api_router.include_router(auth_routes.router)
api_router.include_router(project_routes.router)
api_router.include_router(contact_routes.router)
api_router.include_router(apk_routes.router)
api_router.include_router(singular_routes.router)
api_router.include_router(slack_routes.router)

app.include_router(api_router)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    init_storage()
    try:
        from scheduler import start as start_scheduler
        start_scheduler()
    except Exception as e:
        logger.warning("Scheduler failed to start: %s", e)


@app.on_event("shutdown")
async def shutdown():
    try:
        from scheduler import stop as stop_scheduler
        stop_scheduler()
    except Exception:
        pass
    client.close()
