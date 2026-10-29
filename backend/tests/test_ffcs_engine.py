"""
Automated Test Suite for VIT FFCS Guide Backend Engine.
Covers all 13 required test scenarios in Section 14:
1. Slot token parsing
2. Combined slot parsing
3. Identical-slot conflicts
4. Different-slot non-conflicts
5. Theory/lab conflicts
6. Tutorial conflicts
7. Multiple faculty sections & duplicate component detection
8. Locked selections
9. Credit limits
10. Missing / unresolved slot mappings
11. Alternative-section recommendations
12. Timetable generation (valid multi-profile and infeasible diagnostics)
13. Excel import with missing fields, unnamed Applied Chemistry table, duplicates, and anomalies
"""
import io
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models.database import Base
from backend.models.schemas import (
    CourseSchema,
    CourseSectionSchema,
    OptimizerRequest,
    AssistantQueryRequest,
)
from backend.services.slot_parser.engine import (
    load_active_slot_map,
    parse_slot_string,
    classify_slot_token,
    seed_slot_mappings_if_empty,
)
from backend.services.clash_detector.detector import (
    sections_clash_pair,
    evaluate_timetable_clashes,
)
from backend.services.timetable_optimizer.optimizer import generate_optimized_timetables
from backend.services.recommendation_engine.recommender import compare_faculty_for_course
from backend.services.course_import.importer import (
    preview_workbook_bytes,
    import_workbook_to_db,
    seed_default_workbook_if_empty,
)
from backend.services.no8am_scraper.service import seed_no8am_reviews_if_empty
from backend.services.assistant.planner_assistant import answer_planning_question
from backend.api.routes import build_hydrated_state


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, future=True)
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine, future=True)
    session = TestingSession()
    seed_slot_mappings_if_empty(session)
    seed_no8am_reviews_if_empty(session)
    seed_default_workbook_if_empty(session)
    try:
        yield session
    finally:
        session.close()


def make_section(
    sec_id: int,
    code: str,
    title: str,
    faculty: str,
    slot: str,
    venue: str = "SJT101",
    ctype: str = "ETH",
) -> CourseSectionSchema:
    class_type = "lab" if ctype == "ELA" else ("online" if ctype == "OC" else "theory")
    return CourseSectionSchema(
        id=sec_id,
        course_code=code,
        course_title=title,
        faculty_name=faculty,
        normalized_faculty_name=faculty.lower(),
        slot_combination=slot,
        venue=venue,
        class_type=class_type,
        course_type_code=ctype,
        semester="Winter Semester 2026-27",
        campus="VIT Vellore",
        source_sheet="Test",
        source_row=sec_id,
    )


def test_1_slot_token_parsing():
    slot_map = load_active_slot_map(None, "vellore")
    assert classify_slot_token("A1") == "THEORY"
    assert classify_slot_token("TB1") == "TUTORIAL"
    assert classify_slot_token("TAA1") == "TUTORIAL"
    assert classify_slot_token("L43") == "LAB"
    assert classify_slot_token("OC") == "ONLINE"
    assert classify_slot_token("G1/G2") == "UNRESOLVED"
    assert classify_slot_token("ANY SLOT") == "UNRESOLVED"

    p_a1 = parse_slot_string("A1", slot_map)
    assert p_a1.status == "VERIFIED"
    assert p_a1.theory_tokens == ["A1"]
    assert len(p_a1.occurrences) == 2
    days = {o.day for o in p_a1.occurrences}
    assert days == {"MON", "WED"}


def test_2_combined_slot_parsing():
    slot_map = load_active_slot_map(None, "vellore")
    p_lab = parse_slot_string("L41+L42+L49+L50", slot_map)
    assert p_lab.raw_slot_string == "L41+L42+L49+L50"
    assert p_lab.status == "VERIFIED"
    assert p_lab.lab_tokens == ["L41", "L42", "L49", "L50"]
    assert len(p_lab.occurrences) == 4
    assert p_lab.session_summary == "Evening"

    p_th = parse_slot_string("B1+TB1", slot_map)
    assert p_th.status == "VERIFIED"
    assert p_th.theory_tokens == ["B1"]
    assert p_th.tutorial_tokens == ["TB1"]
    assert len(p_th.occurrences) == 3  # TUE P1, THU P2, MON P4


def test_3_identical_slot_conflicts():
    slot_map = load_active_slot_map(None, "vellore")
    s1 = make_section(1, "BACSE104", "SOOP", "RAMALINGAM M", "A1", "SJT102", "ETH")
    s2 = make_section(2, "BACSE104", "SOOP", "VELLINGIRI J", "A1", "SJT715", "ETH")
    cols = sections_clash_pair(s1, s2, slot_map)
    assert len(cols) == 2  # Collides on both MON P1 and WED P2
    assert cols[0]["clash_type"] == "THEORY_VS_THEORY"


def test_4_different_slot_non_conflicts_and_adjacent_lab_rule():
    slot_map = load_active_slot_map(None, "vellore")
    s_a1 = make_section(1, "BACSE104", "SOOP", "RAMALINGAM M", "A1", "SJT102", "ETH")
    s_b1 = make_section(2, "BAITE101", "DLD", "CHERUKULA MADHU", "B1+TB1", "SJT824", "ETH")
    assert sections_clash_pair(s_a1, s_b1, slot_map) == []

    # Test VIT Official Adjacent Period 4 Theory (TB1: MON 11:00-11:50) vs Period 5-6 Lab (L5+L6: MON 11:40-13:20)
    s_l5 = make_section(3, "BAMAT207", "Prob & Stats", "KAVITHA K", "L5+L6", "PRP119", "ELA")
    assert sections_clash_pair(s_b1, s_l5, slot_map, allow_adjacent_lab_boundary=True) == []
    # When strict clock-minute mode is enforced (allow_adjacent_lab_boundary=False), 11:40-11:50 overlaps!
    strict_cols = sections_clash_pair(s_b1, s_l5, slot_map, allow_adjacent_lab_boundary=False)
    assert len(strict_cols) == 1


def test_5_theory_vs_lab_conflicts():
    slot_map = load_active_slot_map(None, "vellore")
    # D1 occurs on MON P3 and THU P1 (08:00-08:50). L19+L20 occurs on THU P1 & P2 (08:00-09:40).
    s_d1 = make_section(1, "BAMAT207", "Prob & Stats", "VENKATESWARLU B", "D1+TD1", "PRP329", "ETH")
    s_l19 = make_section(2, "BACHY105", "Applied Chemistry", "BUVANESWARI G", "L19+L20", "PRP408A", "ELA")
    cols = sections_clash_pair(s_d1, s_l19, slot_map)
    assert len(cols) >= 1
    assert cols[0]["clash_type"] == "THEORY_VS_LAB"
    assert cols[0]["day"] == "THU"
    assert cols[0]["period"] == 1


def test_6_tutorial_conflicts_across_different_labels():
    slot_map = load_active_slot_map(None, "vellore")
    # In VIT Vellore, TBB1 and TCC1 have different labels but BOTH occur on THU Period 5 (12:00-12:50)!
    s_tbb1 = make_section(1, "COURSE1", "Course 1", "FAC A", "TBB1", "SJT101", "ETH")
    s_tcc1 = make_section(2, "BAGER101", "German Level I", "ABHIJIT KR DARBEY", "TCC1", "SJT324", "ETH")
    cols = sections_clash_pair(s_tbb1, s_tcc1, slot_map)
    assert len(cols) == 1
    assert cols[0]["clash_type"] == "TUTORIAL_VS_TUTORIAL"
    assert cols[0]["day"] == "THU"
    assert cols[0]["period"] == 5


def test_7_multiple_faculty_sections_and_duplicate_component(db_session):
    courses_map, sections_by_course, slot_map = build_hydrated_state(db_session)
    soop_eth = [s for s in sections_by_course["BACSE104"] if s.course_type_code == "ETH" and s.is_active]
    assert len(soop_eth) >= 8

    # Selecting two ETH sections of BACSE104 triggers DUPLICATE_COURSE_COMPONENT
    report = evaluate_timetable_clashes(
        selected_sections=[soop_eth[0], soop_eth[1]],
        all_courses_map=courses_map,
        all_sections_by_course=sections_by_course,
        slot_map=slot_map,
    )
    assert report.has_hard_clashes is True
    assert any(c.clash_type == "DUPLICATE_COURSE_COMPONENT" for c in report.clashes)


def test_8_locked_selections(db_session):
    courses_map, sections_by_course, slot_map = build_hydrated_state(db_session)
    dld_eth = next(s for s in sections_by_course["BAITE101"] if s.slot_combination == "B1+TB1" and s.is_active)

    opt_res = generate_optimized_timetables(
        OptimizerRequest(
            required_course_codes=["BAITE101", "BAITE102"],
            locked_section_ids=[dld_eth.id],
        ),
        courses_map,
        sections_by_course,
        slot_map,
    )
    assert opt_res.success is True
    for rec in opt_res.recommendations:
        assert dld_eth.id in rec.selected_section_ids


def test_9_credit_limits(db_session):
    courses_map, sections_by_course, slot_map = build_hydrated_state(db_session)
    s1 = next(s for s in sections_by_course["BACSE104"] if s.course_type_code == "ETH" and s.is_active)
    s2 = next(s for s in sections_by_course["BAITE101"] if s.course_type_code == "ETH" and s.is_active)
    # BACSE104 (4 Cr) + BAITE101 (4 Cr) = 8 Cr > max_credits=6.0
    report = evaluate_timetable_clashes(
        selected_sections=[s1, s2],
        all_courses_map=courses_map,
        all_sections_by_course=sections_by_course,
        slot_map=slot_map,
        max_credits=6.0,
    )
    assert report.has_hard_clashes is True
    assert any(c.clash_type == "CREDIT_LIMIT_VIOLATION" for c in report.clashes)


def test_10_missing_and_unresolved_slot_mappings(db_session):
    courses_map, sections_by_course, slot_map = build_hydrated_state(db_session)
    # BAENG101 has G1/G2 and ANY SLOT
    eng_secs = sections_by_course["BAENG101"]
    assert len(eng_secs) >= 2
    for es in eng_secs:
        assert es.parsed_slot.status == "UNRESOLVED"
        assert es.parsed_slot.occurrences == []  # Never guesses weekday or time!

    report = evaluate_timetable_clashes(
        selected_sections=[eng_secs[0]],
        all_courses_map=courses_map,
        all_sections_by_course=sections_by_course,
        slot_map=slot_map,
    )
    assert report.possible_clash_count >= 1
    assert any(
        c.clash_type == "UNRESOLVED_SLOT_WARNING" and c.is_confirmed is False
        for c in report.clashes
    )


def test_11_alternative_section_recommendations(db_session):
    courses_map, sections_by_course, slot_map = build_hydrated_state(db_session)
    # Create a deliberate Theory vs Lab clash: BAMAT207 D1+TD1 (THU P1) + BACHY105 L19+L20 (THU P1-P2)
    mat_d1 = next(s for s in sections_by_course["BAMAT207"] if s.slot_combination == "D1+TD1" and s.is_active)
    chy_l19 = next(s for s in sections_by_course["BACHY105"] if s.slot_combination == "L19+L20" and s.is_active)

    report = evaluate_timetable_clashes(
        selected_sections=[mat_d1, chy_l19],
        all_courses_map=courses_map,
        all_sections_by_course=sections_by_course,
        slot_map=slot_map,
        locked_section_ids=[mat_d1.id],  # Lock mat_d1 so suggestions target BACHY105 ELA
    )
    th_lab_clash = next(c for c in report.clashes if c.clash_type == "THEORY_VS_LAB")
    assert len(th_lab_clash.suggested_alternatives) > 0
    for alt in th_lab_clash.suggested_alternatives:
        assert alt["course_code"] == "BACHY105"
        assert alt["slot_combination"] != "L19+L20"

    # Also test faculty comparison engine
    comps = compare_faculty_for_course(
        course=courses_map["BACHY105"],
        course_sections=sections_by_course["BACHY105"],
        selected_sections=[mat_d1],
        locked_section_ids=[mat_d1.id],
        slot_map=slot_map,
    )
    assert len(comps) > 0
    l19_comp = next(c for c in comps if c["section_id"] == chy_l19.id)
    assert l19_comp["is_compatible"] is False


def test_12_timetable_generation_valid_and_infeasible(db_session):
    courses_map, sections_by_course, slot_map = build_hydrated_state(db_session)
    # 12a. Valid generation across all 7 core/UCC courses (25 credits)
    req_valid = OptimizerRequest(
        required_course_codes=[
            "BACSE104",
            "BAITE101",
            "BAITE102",
            "BAITE103",
            "BAMAT207",
            "BACHY105",
            "BAHUM101",
        ],
        max_credits=27.0,
    )
    res_valid = generate_optimized_timetables(req_valid, courses_map, sections_by_course, slot_map)
    assert res_valid.success is True
    assert len(res_valid.recommendations) == 3
    profile_ids = [r.profile_id for r in res_valid.recommendations]
    assert profile_ids == ["best_fit", "compact", "max_flexibility"]

    # Verify every recommended timetable has 0 confirmed clashes
    for rec in res_valid.recommendations:
        rep = evaluate_timetable_clashes(
            selected_sections=rec.sections,
            all_courses_map=courses_map,
            all_sections_by_course=sections_by_course,
            slot_map=slot_map,
            compute_all_compatibilities=False,
        )
        assert rep.confirmed_clash_count == 0
        assert rep.total_credits == 25.0

    # 12b. Infeasible generation: lock two conflicting sections (D1+TD1 in BAMAT207 and D1+TD1 in BAITE202)
    s_mat_d1 = next(s for s in sections_by_course["BAMAT207"] if s.slot_combination == "D1+TD1" and s.is_active)
    s_db_d1 = next(s for s in sections_by_course["BAITE202"] if s.slot_combination == "D1+TD1" and s.is_active)
    res_infeasible = generate_optimized_timetables(
        OptimizerRequest(
            required_course_codes=["BAMAT207", "BAITE202"],
            locked_section_ids=[s_mat_d1.id, s_db_d1.id],
        ),
        courses_map,
        sections_by_course,
        slot_map,
    )
    assert res_infeasible.success is False
    assert len(res_infeasible.conflicting_constraints) > 0
    assert len(res_infeasible.suggested_relaxations) > 0


def test_13_excel_import_with_missing_and_duplicate_fields_and_assistant(db_session):
    # Create a custom CSV with unnamed Applied Chemistry row, missing venue, and duplicate row
    csv_content = """Course,Slot Detail,Venue,Faculty,Course Type
,C1+TC1,PRP329,SASIKUMAR S,ETH
,C1+TC1,PRP329,SASIKUMAR S,ETH
Applied Chemistry,L21+L22,,BARNALI MAITI,ELA
"""
    preview = preview_workbook_bytes(csv_content.encode("utf-8"), "test_import.csv")
    issue_types = {i["type"] for i in preview["issues"]}
    assert "UNNAMED_COURSE_ASSIGNED" in issue_types
    assert "DUPLICATE_ROW" in issue_types
    assert "MISSING_VENUE" in issue_types

    # Also test built-in planning assistant queries
    courses_map, sections_by_course, slot_map = build_hydrated_state(db_session)
    ans1 = answer_planning_question(
        AssistantQueryRequest(question="Which DSA sections do not clash with my DBMS lab?"),
        courses_map,
        sections_by_course,
        slot_map,
    )
    assert "BAITE102" in ans1.referenced_courses
    assert "BAITE202" in ans1.referenced_courses
    assert len(ans1.recommended_section_ids) > 0

    ans2 = answer_planning_question(
        AssistantQueryRequest(question="Show all courses with missing slot mappings."),
        courses_map,
        sections_by_course,
        slot_map,
    )
    assert "BAENG101" in ans2.referenced_courses


def test_14_no8am_reviews_and_teacher_switch_workflow(db_session):
    from backend.services.no8am_scraper.service import merge_no8am_catalog_into_db

    courses_map, sections_by_course, slot_map = build_hydrated_state(db_session)

    # 1. Verify verified no8am.site faculty review metadata on BACSE104 sections
    soop_secs = [s for s in sections_by_course["BACSE104"] if s.is_active]
    assert len(soop_secs) > 0
    for s in soop_secs:
        assert s.faculty_review is not None
        assert s.faculty_review.no8am_id is not None
        assert s.faculty_review.profile_url.startswith("https://no8am.site/professors/")
        # Never fabricates ratings when total_reviews == 0
        if s.faculty_review.total_reviews == 0:
            assert s.faculty_review.avg_rating is None

    # 2. Select teacher A for BACSE104 ETH, then switch to teacher B: verify no duplicate ETH component
    eth_options = [s for s in soop_secs if s.course_type_code == "ETH"]
    teacher_a = eth_options[0]
    teacher_b = next(s for s in eth_options if s.faculty_name != teacher_a.faculty_name)

    # Simulate replacement on teacher switch
    active_selection = [teacher_a]
    active_selection = [
        s for s in active_selection
        if not (s.course_code == teacher_b.course_code and s.course_type_code == teacher_b.course_type_code)
    ] + [teacher_b]
    assert len(active_selection) == 1
    assert active_selection[0].id == teacher_b.id

    # 3. Verify compatibility ranking separates scheduling compatibility from teacher reviews
    # Lock BAMAT207 D1+TD1 (THU P1) and check BACHY105 lab rankings: L19+L20 (THU P1-P2) must be marked incompatible
    mat_d1 = next(s for s in sections_by_course["BAMAT207"] if s.slot_combination == "D1+TD1" and s.is_active)
    comparisons = compare_faculty_for_course(
        course=courses_map["BACHY105"],
        course_sections=sections_by_course["BACHY105"],
        selected_sections=[mat_d1],
        locked_section_ids=[mat_d1.id],
        slot_map=slot_map,
    )
    clashing_l19 = [c for c in comparisons if c["slot_combination"] == "L19+L20"]
    compatible_labs = [c for c in comparisons if c["course_type_code"] == "ELA" and c["is_compatible"]]
    assert len(clashing_l19) > 0
    assert all(c["is_compatible"] is False for c in clashing_l19)
    assert len(compatible_labs) > 0

    # 4. Verify merging public no8am.site catalog deduplicates cleanly
    merged = merge_no8am_catalog_into_db(db_session, campus="vellore")
    assert merged["courses_added"] >= 50
    # Second call should add 0 duplicates
    merged_again = merge_no8am_catalog_into_db(db_session, campus="vellore")
    assert merged_again["courses_added"] == 0
    assert merged_again["sections_added"] == 0

