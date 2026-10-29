"""
Main FastAPI Application Entrypoint for VIT FFCS Guide.
Initializes database, seeds official VIT slot mappings, No8AM faculty reviews,
and the user's VIT Winter Semester 2026-27 workbook on startup.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.models.database import init_db, SessionLocal
from backend.services.slot_parser.engine import seed_slot_mappings_if_empty
from backend.services.no8am_scraper.service import seed_no8am_reviews_if_empty
from backend.services.course_import.importer import seed_default_workbook_if_empty
from backend.api.routes import router


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
