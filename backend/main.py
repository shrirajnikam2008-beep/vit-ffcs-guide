"""
Main FastAPI Application Entrypoint for VIT FFCS Guide.
Initializes database, seeds official VIT slot mappings, No8AM faculty reviews,
and the user's VIT Winter Semester 2026-27 workbook on startup.
"""
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.models.database import init_db, SessionLocal
from backend.services.slot_parser.engine import seed_slot_mappings_if_empty
from backend.services.no8am_scraper.service import seed_no8am_reviews_if_empty
from backend.services.course_import.importer import seed_default_workbook_if_empty
from backend.api.routes import router

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        seed_slot_mappings_if_empty(db)
        seed_no8am_reviews_if_empty(db)
        seed_default_workbook_if_empty(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="VIT FFCS Guide — Smart Course Registration & Timetable Simulator API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "VIT FFCS Guide Backend"}


if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(FRONTEND_DIST / "index.html"))

