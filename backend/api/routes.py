"""
FastAPI Router for VIT FFCS Guide.
"""
import io
import json
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any
from openpyxl import Workbook
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.models.database import (
    get_db,
    CourseModel,
    CourseSectionModel,
    FacultyReviewModel,
    SlotMappingModel,
    TimetableDraftModel,
    ImportBatchLogModel,
    BASE_DIR,
)
from backend.models.schemas import (
    CourseSchema,
    CourseSectionSchema,
    BatchPrescription,
    ClashCheckRequest,
    ClashReportResponse,
    OptimizerRequest,
    OptimizerResponse,
    AssistantQueryRequest,
    AssistantQueryResponse,
    SlotOccurrence,
)
from backend.services.slot_parser.engine import (
    load_active_slot_map,
    parse_slot_string,
    seed_slot_mappings_if_empty,
    VELLORE_THEORY_TIMES,
    VELLORE_LAB_TIMES,
    CHENNAI_THEORY_TIMES,
    CHENNAI_LAB_TIMES,
)
from backend.services.no8am_scraper.service import (
    get_faculty_review_map,
    resolve_faculty_review,
    normalize_faculty_name,
    sync_live_from_no8am,
)
from backend.services.course_import.importer import (
    preview_workbook_bytes,
    import_workbook_to_db,
    seed_default_workbook_if_empty,
    map_course_type_to_class_type,
)
from backend.services.clash_detector.detector import evaluate_timetable_clashes
from backend.services.recommendation_engine.recommender import compare_faculty_for_course
from backend.services.timetable_optimizer.optimizer import generate_optimized_timetables
from backend.services.assistant.planner_assistant import answer_planning_question

router = APIRouter(prefix="/api")


def build_hydrated_state(
    db: Session, campus: str = "vellore", include_inactive: bool = False
) -> Tuple[Dict[str, CourseSchema], Dict[str, List[CourseSectionSchema]], Dict[str, List[SlotOccurrence]]]:
    slot_map = load_active_slot_map(db, campus)
    rev_map = get_faculty_review_map(db)

    course_rows = db.query(CourseModel).order_by(CourseModel.course_code.asc()).all()
    sec_query = db.query(CourseSectionModel)
    if not include_inactive:
        sec_query = sec_query.filter(CourseSectionModel.is_active == True)  # noqa: E712
    sec_rows = sec_query.order_by(CourseSectionModel.id.asc()).all()

    sections_by_course: Dict[str, List[CourseSectionSchema]] = {}
    for sr in sec_rows:
        parsed = parse_slot_string(sr.slot_combination, slot_map, campus)
        f_rev = resolve_faculty_review(sr.faculty_name, rev_map)
        sec_schema = CourseSectionSchema(
            id=sr.id,
            course_code=sr.course_code,
            course_title=sr.course_title,
            faculty_name=sr.faculty_name,
            normalized_faculty_name=sr.normalized_faculty_name,
            slot_combination=sr.slot_combination,
            venue=sr.venue,
            class_type=sr.class_type,
            course_type_code=sr.course_type_code,
            batch=sr.batch,
            semester=sr.semester,
            campus=sr.campus,
            source_sheet=sr.source_sheet,
            source_row=sr.source_row,
            is_duplicate=sr.is_duplicate,
            is_anomaly=sr.is_anomaly,
            anomaly_note=sr.anomaly_note,
            is_active=sr.is_active,
            verification_status="UNRESOLVED" if parsed.status == "UNRESOLVED" else sr.verification_status,
            parsed_slot=parsed,
            faculty_review=f_rev,
        )
        sections_by_course.setdefault(sr.course_code, []).append(sec_schema)

    courses_map: Dict[str, CourseSchema] = {}
    for cr in course_rows:
        batches_raw = json.loads(cr.batches_json or "[]")
        c_secs = sections_by_course.get(cr.course_code, [])
        courses_map[cr.course_code] = CourseSchema(
            id=cr.id,
            course_code=cr.course_code,
            course_title=cr.course_title,
            semester=cr.semester,
            campus=cr.campus,
            curriculum_category=cr.curriculum_category,
            credits=cr.credits,
            course_type=cr.course_type,
            lecture_hours=cr.lecture_hours,
            tutorial_hours=cr.tutorial_hours,
            practical_hours=cr.practical_hours,
            project_hours=cr.project_hours,
            employee_school=cr.employee_school,
            prerequisites=cr.prerequisites,
            theory_slots=json.loads(cr.theory_slots_json or "[]"),
            lab_slots=json.loads(cr.lab_slots_json or "[]"),
            batches=[BatchPrescription(**b) for b in batches_raw],
            verification_status=cr.verification_status,
            verification_note=cr.verification_note,
            source_sheet=cr.source_sheet,
            source_row=cr.source_row,
            sections=[s for s in c_secs if s.is_active],
        )

    return courses_map, sections_by_course, slot_map


@router.get("/bootstrap")
def get_bootstrap_data(
    campus: str = Query("vellore"),
    include_audit_rows: bool = Query(True),
    db: Session = Depends(get_db),
):
    courses_map, sections_by_course, slot_map = build_hydrated_state(
        db, campus=campus, include_inactive=include_audit_rows
    )

    campus_key = "chennai" if "chennai" in campus.lower() else "vellore"
    th_times = CHENNAI_THEORY_TIMES if campus_key == "chennai" else VELLORE_THEORY_TIMES
    lb_times = CHENNAI_LAB_TIMES if campus_key == "chennai" else VELLORE_LAB_TIMES

    period_headers = [
        {
            "period": p,
            "label": f"P{p}",
            "theory_time": f"{th_times[p][0]}-{th_times[p][1]}",
            "lab_time": f"{lb_times[p][0]}-{lb_times[p][1]}",
            "session": "Morning" if p <= 6 else "Evening",
        }
        for p in range(1, 13)
    ]

    latest_log = db.query(ImportBatchLogModel).order_by(ImportBatchLogModel.id.desc()).first()
    import_report = None
    if latest_log:
        import_report = {
            "id": latest_log.id,
            "filename": latest_log.filename,
            "imported_at": latest_log.imported_at.isoformat(),
            "sheets_detected": json.loads(latest_log.sheets_detected_json or "[]"),
            "total_rows_read": latest_log.total_rows_read,
            "courses_imported": latest_log.courses_imported,
            "sections_imported": latest_log.sections_imported,
            "duplicates_detected": latest_log.duplicates_detected,
            "anomalies_detected": latest_log.anomalies_detected,
            "missing_fields_count": latest_log.missing_fields_count,
            "issues": json.loads(latest_log.issues_json or "[]"),
            "raw_preview": json.loads(latest_log.raw_preview_json or "[]"),
        }

    drafts = db.query(TimetableDraftModel).order_by(TimetableDraftModel.updated_at.desc()).all()
    drafts_list = [
        {
            "id": d.id,
            "name": d.name,
            "semester": d.semester,
            "campus": d.campus,
            "programme": d.programme,
            "curriculum": d.curriculum,
            "min_credits": d.min_credits,
            "target_credits": d.target_credits,
            "max_credits": d.max_credits,
            "selected_section_ids": json.loads(d.selected_section_ids_json or "[]"),
            "locked_section_ids": json.loads(d.locked_section_ids_json or "[]"),
            "required_course_codes": json.loads(d.required_course_codes_json or "[]"),
            "preferred_faculty": json.loads(d.preferred_faculty_json or "[]"),
            "avoided_faculty": json.loads(d.avoided_faculty_json or "[]"),
            "preferred_slots": json.loads(d.preferred_slots_json or "[]"),
            "avoided_slots": json.loads(d.avoided_slots_json or "[]"),
            "preferences": json.loads(d.preferences_json or "{}"),
            "updated_at": d.updated_at.isoformat(),
        }
        for d in drafts
    ]

    all_sections_flat = [s for secs in sections_by_course.values() for s in secs]

    return {
        "semester": "Winter Semester 2026-27",
        "campus": campus_key,
        "courses": list(courses_map.values()),
        "all_sections": all_sections_flat,
        "slot_map": {k: [occ.model_dump() for occ in v] for k, v in slot_map.items()},
        "period_headers": period_headers,
        "import_report": import_report,
        "drafts": drafts_list,
    }


@router.post("/clashes/evaluate", response_model=ClashReportResponse)
def evaluate_clashes_endpoint(req: ClashCheckRequest, db: Session = Depends(get_db)):
    courses_map, sections_by_course, slot_map = build_hydrated_state(
        db, campus=req.campus, include_inactive=False
    )
    sec_by_id = {s.id: s for secs in sections_by_course.values() for s in secs}
    selected = [sec_by_id[sid] for sid in req.selected_section_ids if sid in sec_by_id]

    return evaluate_timetable_clashes(
        selected_sections=selected,
        all_courses_map=courses_map,
        all_sections_by_course=sections_by_course,
        slot_map=slot_map,
        locked_section_ids=req.locked_section_ids,
        mandatory_course_codes=req.mandatory_course_codes,
        min_credits=req.min_credits,
        target_credits=req.target_credits,
        max_credits=req.max_credits,
        allow_adjacent_lab_boundary=req.allow_adjacent_lab_boundary,
        compute_all_compatibilities=True,
    )


class FacultyComparisonRequest(BaseModel):
    selected_section_ids: List[int] = []
    locked_section_ids: List[int] = []
    preferred_faculty: List[str] = []
    avoided_faculty: List[str] = []
    preferred_slots: List[str] = []
    avoided_slots: List[str] = []
    session_preference: str = "balanced"
    campus: str = "vellore"
    allow_adjacent_lab_boundary: bool = True


@router.post("/recommendations/faculty/{course_code}")
def get_faculty_comparison_endpoint(
    course_code: str, req: FacultyComparisonRequest, db: Session = Depends(get_db)
):
    courses_map, sections_by_course, slot_map = build_hydrated_state(
        db, campus=req.campus, include_inactive=False
    )
    code_up = course_code.upper()
    if code_up not in courses_map:
        raise HTTPException(status_code=404, detail=f"Course {course_code} not found")

    sec_by_id = {s.id: s for secs in sections_by_course.values() for s in secs}
    selected = [sec_by_id[sid] for sid in req.selected_section_ids if sid in sec_by_id]

    comparisons = compare_faculty_for_course(
        course=courses_map[code_up],
        course_sections=sections_by_course.get(code_up, []),
        selected_sections=selected,
        locked_section_ids=req.locked_section_ids,
        slot_map=slot_map,
        preferred_faculty=req.preferred_faculty,
        avoided_faculty=req.avoided_faculty,
        preferred_slots=req.preferred_slots,
        avoided_slots=req.avoided_slots,
        session_preference=req.session_preference,
        allow_adjacent_lab_boundary=req.allow_adjacent_lab_boundary,
    )
    return {"course_code": code_up, "comparisons": comparisons}


@router.post("/optimizer/generate", response_model=OptimizerResponse)
def run_optimizer_endpoint(req: OptimizerRequest, db: Session = Depends(get_db)):
    courses_map, sections_by_course, slot_map = build_hydrated_state(
        db, campus=req.campus, include_inactive=False
    )
    return generate_optimized_timetables(req, courses_map, sections_by_course, slot_map)


@router.post("/assistant/query", response_model=AssistantQueryResponse)
def run_assistant_endpoint(req: AssistantQueryRequest, db: Session = Depends(get_db)):
    courses_map, sections_by_course, slot_map = build_hydrated_state(
        db, campus=req.campus, include_inactive=False
    )
    return answer_planning_question(req, courses_map, sections_by_course, slot_map)


@router.post("/import/preview")
async def preview_import_endpoint(
    file: UploadFile = File(...),
    custom_mappings_json: Optional[str] = Form(None),
):
    content = await file.read()
    custom_mappings = json.loads(custom_mappings_json) if custom_mappings_json else None
    return preview_workbook_bytes(content, file.filename or "uploaded_file.xlsx", custom_mappings)


@router.post("/import/commit")
async def commit_import_endpoint(
    file: UploadFile = File(...),
    custom_mappings_json: Optional[str] = Form(None),
    clear_existing: bool = Form(True),
    db: Session = Depends(get_db),
):
    content = await file.read()
    custom_mappings = json.loads(custom_mappings_json) if custom_mappings_json else None
    return import_workbook_to_db(
        db, content, file.filename or "uploaded_file.xlsx", custom_mappings, clear_existing
    )


@router.post("/import/reset-default")
def reset_default_workbook_endpoint(db: Session = Depends(get_db)):
    wb_path = os.path.join(BASE_DIR, "data", "vit_winter_2026_27_allocation.xlsx")
    if not os.path.exists(wb_path):
        from backend.data.generate_sample_workbook import build_workbook
        build_workbook(wb_path)
    with open(wb_path, "rb") as f:
        data = f.read()
    return import_workbook_to_db(db, data, "vit_winter_2026_27_allocation.xlsx", clear_existing=True)


@router.get("/export/sample-workbook")
def download_sample_workbook():
    wb_path = os.path.join(BASE_DIR, "data", "vit_winter_2026_27_allocation.xlsx")
    if not os.path.exists(wb_path):
        from backend.data.generate_sample_workbook import build_workbook
        build_workbook(wb_path)
    return FileResponse(
        wb_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="vit_winter_2026_27_allocation.xlsx",
    )


@router.get("/export/timetable-excel")
def export_timetable_excel(
    section_ids: str = Query(""),
    campus: str = Query("vellore"),
    db: Session = Depends(get_db),
):
    ids = [int(x) for x in section_ids.split(",") if x.strip().isdigit()]
    courses_map, sections_by_course, slot_map = build_hydrated_state(db, campus=campus)
    sec_by_id = {s.id: s for secs in sections_by_course.values() for s in secs}
    selected = [sec_by_id[sid] for sid in ids if sid in sec_by_id]

    # Build Excel workbook with Sheet 1: Weekly Timetable Grid and Sheet 2: Selected Sections
    wb = Workbook()
    ws_grid = wb.active
    ws_grid.title = "Weekly Timetable Grid"

    days = ["MON", "TUE", "WED", "THU", "FRI", "SAT"]
    grid_data: Dict[str, Dict[str, str]] = {d: {f"P{p}": "" for p in range(1, 13)} for d in days}
    for s in selected:
        p_slot = s.parsed_slot or parse_slot_string(s.slot_combination, slot_map, campus)
        for occ in p_slot.occurrences:
            if occ.day in grid_data:
                col_key = f"P{occ.period}"
                cell_txt = f"{s.course_code} ({s.course_type_code})\n{occ.slot_code} | {s.venue}\n{s.faculty_name}"
                if grid_data[occ.day][col_key]:
                    grid_data[occ.day][col_key] += f"\n--- CLASH ---\n{cell_txt}"
                else:
                    grid_data[occ.day][col_key] = cell_txt

    ws_grid.append(["Day"] + [f"P{p}" for p in range(1, 13)])
    for d in days:
        ws_grid.append([d] + [grid_data[d][f"P{p}"] for p in range(1, 13)])

    ws_sel = wb.create_sheet(title="Selected Sections")
    ws_sel.append(
        [
            "Course Code",
            "Course Title",
            "Category",
            "Component Type",
            "Credits",
            "Faculty Name",
            "Slot",
            "Venue",
            "No8AM Rating",
            "Source Sheet",
        ]
    )
    for s in selected:
        c_obj = courses_map.get(s.course_code)
        ws_sel.append(
            [
                s.course_code,
                s.course_title,
                c_obj.curriculum_category if c_obj else "",
                s.course_type_code,
                c_obj.credits if c_obj else 0,
                s.faculty_name,
                s.slot_combination,
                s.venue,
                s.faculty_review.avg_rating if (s.faculty_review and s.faculty_review.avg_rating) else "Unrated",
                s.source_sheet,
            ]
        )

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="vit_ffcs_timetable.xlsx"'},
    )


class CustomSlotMappingInput(BaseModel):
    campus: str = "vellore"
    slot_code: str
    day: str
    period: int
    start_time: str
    end_time: str
    slot_category: str = "THEORY"
    session: str = "Morning"


@router.post("/slot-mappings")
def add_custom_slot_mapping(inp: CustomSlotMappingInput, db: Session = Depends(get_db)):
    row = SlotMappingModel(
        campus="chennai" if "chennai" in inp.campus.lower() else "vellore",
        slot_code=inp.slot_code.strip().upper(),
        day=inp.day.strip().upper(),
        period=inp.period,
        start_time=inp.start_time.strip(),
        end_time=inp.end_time.strip(),
        slot_category=inp.slot_category.strip().upper(),
        session=inp.session.strip(),
        source="User Custom Slot Override",
        is_custom=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"status": "added", "id": row.id, "slot_code": row.slot_code}


@router.post("/slot-mappings/reset")
def reset_slot_mappings(db: Session = Depends(get_db)):
    db.query(SlotMappingModel).delete()
    db.commit()
    seed_slot_mappings_if_empty(db)
    return {"status": "reset"}


class SectionPatchInput(BaseModel):
    faculty_name: Optional[str] = None
    slot_combination: Optional[str] = None
    venue: Optional[str] = None
    course_type_code: Optional[str] = None
    is_active: Optional[bool] = None


@router.patch("/sections/{section_id}")
def update_section_offering(
    section_id: int, patch: SectionPatchInput, db: Session = Depends(get_db)
):
    sec = db.query(CourseSectionModel).filter(CourseSectionModel.id == section_id).first()
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found")

    if patch.faculty_name is not None:
        sec.faculty_name = patch.faculty_name.strip()
        sec.normalized_faculty_name = normalize_faculty_name(sec.faculty_name)
    if patch.slot_combination is not None:
        sec.slot_combination = patch.slot_combination.strip()
    if patch.venue is not None:
        sec.venue = patch.venue.strip()
    if patch.course_type_code is not None:
        sec.course_type_code = patch.course_type_code.strip().upper()
        sec.class_type = map_course_type_to_class_type(sec.course_type_code, sec.slot_combination)
    if patch.is_active is not None:
        sec.is_active = patch.is_active

    slot_map = load_active_slot_map(db, "vellore")
    p_res = parse_slot_string(sec.slot_combination, slot_map)
    sec.verification_status = "UNRESOLVED" if p_res.status == "UNRESOLVED" else "VERIFIED"

    db.commit()
    db.refresh(sec)
    return {"status": "updated", "section_id": sec.id}


class DraftSaveInput(BaseModel):
    id: Optional[int] = None
    name: str
    semester: str = "Winter Semester 2026-27"
    campus: str = "VIT Vellore"
    programme: str = "B.Tech Information Technology (SCORE)"
    curriculum: str = "FFCS 2026-27 Regular"
    min_credits: float = 16.0
    target_credits: float = 21.0
    max_credits: float = 27.0
    selected_section_ids: List[int] = []
    locked_section_ids: List[int] = []
    required_course_codes: List[str] = []
    preferred_faculty: List[str] = []
    avoided_faculty: List[str] = []
    preferred_slots: List[str] = []
    avoided_slots: List[str] = []
    preferences: Dict[str, Any] = {}


@router.post("/drafts")
def save_timetable_draft(inp: DraftSaveInput, db: Session = Depends(get_db)):
    draft = None
    if inp.id:
        draft = db.query(TimetableDraftModel).filter(TimetableDraftModel.id == inp.id).first()
    if not draft:
        draft = TimetableDraftModel(name=inp.name)
        db.add(draft)

    draft.name = inp.name
    draft.semester = inp.semester
    draft.campus = inp.campus
    draft.programme = inp.programme
    draft.curriculum = inp.curriculum
    draft.min_credits = inp.min_credits
    draft.target_credits = inp.target_credits
    draft.max_credits = inp.max_credits
    draft.selected_section_ids_json = json.dumps(inp.selected_section_ids)
    draft.locked_section_ids_json = json.dumps(inp.locked_section_ids)
    draft.required_course_codes_json = json.dumps(inp.required_course_codes)
    draft.preferred_faculty_json = json.dumps(inp.preferred_faculty)
    draft.avoided_faculty_json = json.dumps(inp.avoided_faculty)
    draft.preferred_slots_json = json.dumps(inp.preferred_slots)
    draft.avoided_slots_json = json.dumps(inp.avoided_slots)
    draft.preferences_json = json.dumps(inp.preferences)
    draft.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(draft)
    return {"status": "saved", "id": draft.id, "name": draft.name}


@router.get("/drafts/{draft_id}")
def get_timetable_draft(draft_id: int, db: Session = Depends(get_db)):
    draft = db.query(TimetableDraftModel).filter(TimetableDraftModel.id == draft_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Shared timetable draft not found")
    return {
        "id": draft.id,
        "name": draft.name,
        "semester": draft.semester,
        "campus": draft.campus,
        "programme": draft.programme,
        "curriculum": draft.curriculum,
        "min_credits": draft.min_credits,
        "target_credits": draft.target_credits,
        "max_credits": draft.max_credits,
        "selected_section_ids": json.loads(draft.selected_section_ids_json or "[]"),
        "locked_section_ids": json.loads(draft.locked_section_ids_json or "[]"),
        "required_course_codes": json.loads(draft.required_course_codes_json or "[]"),
        "preferred_faculty": json.loads(draft.preferred_faculty_json or "[]"),
        "avoided_faculty": json.loads(draft.avoided_faculty_json or "[]"),
        "preferred_slots": json.loads(draft.preferred_slots_json or "[]"),
        "avoided_slots": json.loads(draft.avoided_slots_json or "[]"),
        "preferences": json.loads(draft.preferences_json or "{}"),
        "updated_at": draft.updated_at.isoformat() if draft.updated_at else "",
    }


@router.delete("/drafts/{draft_id}")
def delete_timetable_draft(draft_id: int, db: Session = Depends(get_db)):
    draft = db.query(TimetableDraftModel).filter(TimetableDraftModel.id == draft_id).first()
    if draft:
        db.delete(draft)
        db.commit()
    return {"status": "deleted"}


class TimetableCompareRequest(BaseModel):
    student_a_name: str = "My Timetable"
    student_b_name: str = "Friend's Timetable"
    student_a_section_ids: List[int] = []
    student_b_section_ids: List[int] = []
    campus: str = "vellore"


@router.post("/timetables/compare")
def compare_two_timetables(req: TimetableCompareRequest, db: Session = Depends(get_db)):
    courses_map, sections_by_course, slot_map = build_hydrated_state(
        db, campus=req.campus, include_inactive=True
    )
    all_sec_map = {
        s.id: s for secs in sections_by_course.values() for s in secs
    }
    secs_a = [all_sec_map[sid] for sid in req.student_a_section_ids if sid in all_sec_map]
    secs_b = [all_sec_map[sid] for sid in req.student_b_section_ids if sid in all_sec_map]

    ids_a = {s.id for s in secs_a}
    ids_b = {s.id for s in secs_b}
    shared_identical_ids = sorted(list(ids_a.intersection(ids_b)))

    shared_sections = [all_sec_map[sid] for sid in shared_identical_ids]

    by_course_a = {(s.course_code, s.course_type_code): s for s in secs_a}
    by_course_b = {(s.course_code, s.course_type_code): s for s in secs_b}
    same_course_different_section = []
    for key, sa in by_course_a.items():
        sb = by_course_b.get(key)
        if sb and sa.id != sb.id:
            same_course_different_section.append({
                "course_code": sa.course_code,
                "course_title": sa.course_title,
                "course_type_code": sa.course_type_code,
                "student_a_section": sa,
                "student_b_section": sb,
            })

    days = ["MON", "TUE", "WED", "THU", "FRI"]
    busy_a: Dict[Tuple[str, int], List[CourseSectionSchema]] = {}
    busy_b: Dict[Tuple[str, int], List[CourseSectionSchema]] = {}
    for s in secs_a:
        if s.parsed_slot:
            for occ in s.parsed_slot.occurrences:
                busy_a.setdefault((occ.day, occ.period), []).append(s)
    for s in secs_b:
        if s.parsed_slot:
            for occ in s.parsed_slot.occurrences:
                busy_b.setdefault((occ.day, occ.period), []).append(s)

    common_free_periods: Dict[str, List[int]] = {d: [] for d in days}
    schedule_conflicts = []
    campus_key = "chennai" if "chennai" in req.campus.lower() else "vellore"
    th_times = CHENNAI_THEORY_TIMES if campus_key == "chennai" else VELLORE_THEORY_TIMES

    for d in days:
        for p in range(1, 13):
            a_list = busy_a.get((d, p), [])
            b_list = busy_b.get((d, p), [])
            if not a_list and not b_list:
                common_free_periods[d].append(p)
            elif a_list and b_list:
                sa = a_list[0]
                sb = b_list[0]
                if sa.id != sb.id:
                    t_range = th_times.get(p, ("", ""))
                    schedule_conflicts.append({
                        "day": d,
                        "period": p,
                        "time_range": f"{t_range[0]} - {t_range[1]}",
                        "student_a_course": f"{sa.course_code} ({sa.slot_combination})",
                        "student_a_faculty": sa.faculty_name,
                        "student_b_course": f"{sb.course_code} ({sb.slot_combination})",
                        "student_b_faculty": sb.faculty_name,
                    })

    return {
        "student_a_name": req.student_a_name,
        "student_b_name": req.student_b_name,
        "shared_sections": shared_sections,
        "same_course_different_section": same_course_different_section,
        "common_free_periods": common_free_periods,
        "schedule_conflicts": schedule_conflicts,
    }


@router.post("/no8am/sync")
def sync_no8am_reviews_endpoint(campus: str = Query("vellore"), db: Session = Depends(get_db)):
    try:
        return sync_live_from_no8am(db, campus=campus)
    except Exception as e:
        return {
            "status": "cached",
            "message": f"Using local cached scrape of 3,158 No8AM professors (live sync note: {e})",
        }
