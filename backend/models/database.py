"""
Database configuration and SQLAlchemy ORM models for VIT FFCS Guide.
Supports SQLite out-of-the-box with a clean migration path to PostgreSQL via DATABASE_URL.
"""
import os
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    Text,
    DateTime,
    create_engine,
)
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SQLITE_PATH = os.path.join(BASE_DIR, "data", "vit_ffcs_guide.db")
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH}")

# Clean migration path for PostgreSQL (Render/Heroku style postgres:// URLs)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)

Base = declarative_base()


class CourseModel(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    course_code = Column(String(32), unique=True, index=True, nullable=False)
    course_title = Column(String(255), index=True, nullable=False)
    semester = Column(String(64), default="Winter Semester 2026-27", nullable=False)
    campus = Column(String(64), default="VIT Vellore", nullable=False)
    curriculum_category = Column(String(64), default="PCC", nullable=False)  # UCC, PCC, PE, UE, Lab, etc.
    credits = Column(Float, default=4.0, nullable=False)
    course_type = Column(String(32), default="ETL", nullable=False)  # ETL, ETH, ELA, OC
    lecture_hours = Column(Integer, default=3, nullable=False)
    tutorial_hours = Column(Integer, default=0, nullable=False)
    practical_hours = Column(Integer, default=2, nullable=False)
    project_hours = Column(Integer, default=0, nullable=False)
    employee_school = Column(String(64), nullable=True)
    prerequisites = Column(String(255), nullable=True)
    theory_slots_json = Column(Text, default="[]", nullable=False)
    lab_slots_json = Column(Text, default="[]", nullable=False)
    batches_json = Column(Text, default="[]", nullable=False)
    verification_status = Column(String(32), default="VERIFIED", nullable=False)  # VERIFIED, INFERRED, MISSING_DATA
    verification_note = Column(Text, nullable=True)
    source_sheet = Column(String(128), nullable=True)
    source_row = Column(Integer, nullable=True)


class CourseSectionModel(Base):
    __tablename__ = "course_sections"

    id = Column(Integer, primary_key=True, index=True)
    course_code = Column(String(32), index=True, nullable=False)
    course_title = Column(String(255), index=True, nullable=False)
    faculty_name = Column(String(128), index=True, nullable=False)
    normalized_faculty_name = Column(String(128), index=True, nullable=False)
    slot_combination = Column(String(128), nullable=False)  # Preserved exact string as imported
    venue = Column(String(64), nullable=False)
    class_type = Column(String(32), nullable=False)  # theory, lab, tutorial, practical, online, other
    course_type_code = Column(String(32), nullable=False)  # ETH, ELA, OC, ETL
    batch = Column(String(32), nullable=True)
    semester = Column(String(64), default="Winter Semester 2026-27", nullable=False)
    campus = Column(String(64), default="VIT Vellore", nullable=False)
    source_sheet = Column(String(128), nullable=False)
    source_row = Column(Integer, nullable=False)
    is_duplicate = Column(Boolean, default=False, nullable=False)
    is_anomaly = Column(Boolean, default=False, nullable=False)
    anomaly_note = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    verification_status = Column(String(32), default="VERIFIED", nullable=False)  # VERIFIED, INFERRED, UNRESOLVED


class FacultyReviewModel(Base):
    __tablename__ = "faculty_reviews"

    id = Column(Integer, primary_key=True, index=True)
    no8am_id = Column(String(32), index=True, nullable=True)
    faculty_name = Column(String(128), index=True, nullable=False)
    normalized_name = Column(String(128), unique=True, index=True, nullable=False)
    canonical_name = Column(String(128), nullable=True)
    employee_id = Column(String(32), nullable=True)
    department = Column(String(128), nullable=True)
    designation = Column(String(128), nullable=True)
    email = Column(String(128), nullable=True)
    photo_url = Column(String(512), nullable=True)
    avg_rating = Column(Float, nullable=True)  # Only set when total_reviews > 0 from verified source
    total_reviews = Column(Integer, default=0, nullable=False)
    cart_count = Column(Integer, default=0, nullable=False)
    search_count = Column(Integer, default=0, nullable=False)
    campus = Column(String(32), default="vellore", nullable=False)
    source = Column(String(64), default="no8am.site", nullable=False)
    profile_url = Column(String(255), nullable=True)
    verification_status = Column(String(32), default="VERIFIED", nullable=False)


class SlotMappingModel(Base):
    __tablename__ = "slot_mappings"

    id = Column(Integer, primary_key=True, index=True)
    campus = Column(String(32), index=True, default="vellore", nullable=False)
    slot_code = Column(String(32), index=True, nullable=False)
    day = Column(String(16), nullable=False)  # MON, TUE, WED, THU, FRI, SAT
    period = Column(Integer, nullable=False)  # 1..12
    start_time = Column(String(16), nullable=False)  # e.g. "08:00"
    end_time = Column(String(16), nullable=False)    # e.g. "08:50"
    slot_category = Column(String(32), nullable=False)  # THEORY, TUTORIAL, LAB
    session = Column(String(16), nullable=False)  # Morning, Evening
    source = Column(String(128), default="Official VIT Timetable (VTOP / No8AM Verified)", nullable=False)
    is_custom = Column(Boolean, default=False, nullable=False)


class TimetableDraftModel(Base):
    __tablename__ = "timetable_drafts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    semester = Column(String(64), default="Winter Semester 2026-27", nullable=False)
    campus = Column(String(64), default="VIT Vellore", nullable=False)
    programme = Column(String(128), default="B.Tech Information Technology (SCORE)", nullable=False)
    curriculum = Column(String(64), default="FFCS 2026-27 Regular", nullable=False)
    min_credits = Column(Float, default=16.0, nullable=False)
    target_credits = Column(Float, default=21.0, nullable=False)
    max_credits = Column(Float, default=27.0, nullable=False)
    selected_section_ids_json = Column(Text, default="[]", nullable=False)
    locked_section_ids_json = Column(Text, default="[]", nullable=False)
    required_course_codes_json = Column(Text, default="[]", nullable=False)
    preferred_faculty_json = Column(Text, default="[]", nullable=False)
    avoided_faculty_json = Column(Text, default="[]", nullable=False)
    preferred_slots_json = Column(Text, default="[]", nullable=False)
    avoided_slots_json = Column(Text, default="[]", nullable=False)
    preferences_json = Column(Text, default="{}", nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)


class ImportBatchLogModel(Base):
    __tablename__ = "import_batch_logs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    imported_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    sheets_detected_json = Column(Text, default="[]", nullable=False)
    total_rows_read = Column(Integer, default=0, nullable=False)
    courses_imported = Column(Integer, default=0, nullable=False)
    sections_imported = Column(Integer, default=0, nullable=False)
    duplicates_detected = Column(Integer, default=0, nullable=False)
    anomalies_detected = Column(Integer, default=0, nullable=False)
    missing_fields_count = Column(Integer, default=0, nullable=False)
    issues_json = Column(Text, default="[]", nullable=False)
    raw_preview_json = Column(Text, default="{}", nullable=False)


def init_db():
    os.makedirs(os.path.dirname(DEFAULT_SQLITE_PATH), exist_ok=True)
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
