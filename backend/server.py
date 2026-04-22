"""FastAPI entrypoint — wires routers + middleware. All routes live in ``routes/``."""
from __future__ import annotations

import logging
import os

from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

from deps import client, init_storage
from routes import apk as apk_routes
from routes import auth as auth_routes
from routes import projects as project_routes
from routes import singular as singular_routes
from routes import slack as slack_routes

app = FastAPI()
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"service": "singular-onboarding", "status": "ok"}


# Mount feature routers under /api
api_router.include_router(auth_routes.router)
api_router.include_router(project_routes.router)
api_router.include_router(apk_routes.router)
api_router.include_router(singular_routes.router)
api_router.include_router(slack_routes.router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    init_storage()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
