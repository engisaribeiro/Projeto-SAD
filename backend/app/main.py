from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.database import init_db

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=settings.description,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()
app.include_router(router, prefix="/api")


@app.get("/")
def read_root() -> dict:
    return {
        "app": settings.app_name,
        "version": settings.version,
        "docs": "/docs",
        "openapi": "/openapi.json",
    }
