"""
Smart FFCS Timetable Generator & Multi-Profile Optimizer.
Searches section combinations across required courses, enforces hard constraints,
and ranks distinct solutions across three profiles:
1. Best Fit (Balanced timetable & faculty preferences)
2. Compact Timetable (Minimize idle gaps & building transitions)
3. Maximum Flexibility (Maximize alternative backup sections per slot)
"""
from typing import Dict, List, Optional, Set, Tuple, Any
from backend.models.schemas import (
    CourseSchema,
    CourseSectionSchema,
    GeneratedTimetableOption,
    OptimizerRequest,
    OptimizerResponse,
    SlotOccurrence,
)
from backend.services.slot_parser.engine import parse_slot_string
from backend.services.clash_detector.detector import sections_clash_pair
from backend.services.no8am_scraper.service import normalize_faculty_name
from backend.services.recommendation_engine.recommender import extract_building


def compute_schedule_metrics(
    sections: List[CourseSectionSchema],
    all_sections_by_course: Dict[str, List[CourseSectionSchema]],
    slot_map: Dict[str, List[SlotOccurrence]],
    allow_adjacent_lab_boundary: bool = True,
) -> Dict[str, Any]:
    """
    Computes daily class counts, idle gap periods, 8 AM class count,
    building transitions (e.g. SJT <-> PRP <-> TT on the same day),
    average verified faculty rating, and flexibility count.
    """
    daily_periods: Dict[str, List[Tuple[int, str]]] = {
        d: [] for d in ["MON", "TUE", "WED", "THU", "FRI", "SAT"]
    }
    early_8am = 0
    ratings: List[float] = []
    unresolved_warnings: List[str] = []

    for sec in sections:
        p_slot = sec.parsed_slot or parse_slot_string(sec.slot_combination, slot_map)
        if p_slot.status == "UNRESOLVED":
            unresolved_warnings.append(
                f"{sec.course_code} ({sec.faculty_name}) has unresolved slot '{sec.slot_combination}'."
            )
        bldg = extract_building(sec.venue)
        for occ in p_slot.occurrences:
            if occ.day in daily_periods:
                daily_periods[occ.day].append((occ.period, bldg))
            if occ.start_time == "08:00":
                early_8am += 1

        if sec.faculty_review and sec.faculty_review.avg_rating is not None and sec.faculty_review.total_reviews > 0:
            ratings.append(sec.faculty_review.avg_rating)

    gap_hours = 0
    building_transitions = 0
    daily_summary: Dict[str, int] = {}

    for day, p_list in daily_periods.items():
        daily_summary[day] = len(p_list)
        if len(p_list) <= 1:
            continue
        p_sorted = sorted(p_list, key=lambda x: x[0])
        for idx in range(len(p_sorted) - 1):
            p_curr, b_curr = p_sorted[idx]
            p_next, b_next = p_sorted[idx + 1]
            # Ignore lunch break between Period 6 and Period 7 as an idle gap
            if p_curr <= 6 and p_next >= 7:
                gap = (6 - p_curr) + (p_next - 7)
            else:
                gap = max(0, p_next - p_curr - 1)
            gap_hours += gap
            if b_curr != "ONLINE" and b_next != "ONLINE" and b_curr != b_next:
                building_transitions += 1

    # Compute flexibility: how many alternative sections across all selected courses remain compatible
    flex_count = 0
    for sec in sections:
        c_secs = all_sections_by_course.get(sec.course_code, [])
        others = [s for s in sections if s.id != sec.id]
        for cand in c_secs:
            if not cand.is_active or cand.id == sec.id or cand.course_type_code != sec.course_type_code:
                continue
            p_cand = cand.parsed_slot or parse_slot_string(cand.slot_combination, slot_map)
            if p_cand.status == "UNRESOLVED":
                continue
            if not any(sections_clash_pair(cand, o, slot_map, allow_adjacent_lab_boundary) for o in others):
                flex_count += 1

    avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else None
    return {
        "daily_summary": daily_summary,
        "gap_hours": gap_hours,
        "early_8am_count": early_8am,
        "building_transitions": building_transitions,
        "avg_faculty_rating": avg_rating,
        "flexibility_alternatives_count": flex_count,
        "unresolved_warnings": unresolved_warnings,
    }


def generate_optimized_timetables(
    request: OptimizerRequest,
    all_courses_map: Dict[str, CourseSchema],
    all_sections_by_course: Dict[str, List[CourseSectionSchema]],
    slot_map: Dict[str, List[SlotOccurrence]],
) -> OptimizerResponse:
    locked_ids = set(request.locked_section_ids or [])
    pref_fac_norm = {normalize_faculty_name(f) for f in (request.preferred_faculty or [])}
    avoid_fac_norm = {normalize_faculty_name(f) for f in (request.avoided_faculty or [])}
    pref_slots = {s.strip().upper() for s in (request.preferred_slots or []) if s.strip()}
    avoid_slots = {s.strip().upper() for s in (request.avoided_slots or []) if s.strip()}

    # 1. Identify all locked sections and ensure their courses are in required_course_codes
    section_by_id: Dict[int, CourseSectionSchema] = {}
    for c_code, secs in all_sections_by_course.items():
        for s in secs:
            if s.parsed_slot is None:
                s.parsed_slot = parse_slot_string(s.slot_combination, slot_map)
            section_by_id[s.id] = s

    locked_sections = [section_by_id[sid] for sid in locked_ids if sid in section_by_id]

    # Check if locked sections conflict with each other
    for i in range(len(locked_sections)):
        for j in range(i + 1, len(locked_sections)):
            sa, sb = locked_sections[i], locked_sections[j]
            if sa.course_code == sb.course_code and sa.course_type_code == sb.course_type_code:
                return OptimizerResponse(
                    success=False,
                    message="Locked selections contain duplicate components for the same course.",
                    conflicting_constraints=[
                        f"Locked sections {sa.course_code} ({sa.faculty_name}) and {sb.course_code} ({sb.faculty_name}) both occupy component {sa.course_type_code}."
                    ],
                    suggested_relaxations=["Unlock one of the duplicate course sections and run the optimizer again."],
                )
            cols = sections_clash_pair(sa, sb, slot_map, request.allow_adjacent_lab_boundary)
            if cols:
                return OptimizerResponse(
                    success=False,
                    message="Two or more locked sections directly clash with each other.",
                    conflicting_constraints=[
                        f"Locked {sa.course_code} ({sa.faculty_name}, {sa.slot_combination}) clashes with locked {sb.course_code} ({sb.faculty_name}, {sb.slot_combination}) on {cols[0]['reason']}."
                    ],
                    suggested_relaxations=[
                        f"Unlock either {sa.course_code} ({sa.slot_combination}) or {sb.course_code} ({sb.slot_combination})."
                    ],
                )

    required_codes: List[str] = []
    for c in request.required_course_codes:
        if c in all_courses_map and c not in required_codes:
            required_codes.append(c)
    for ls in locked_sections:
        if ls.course_code in all_courses_map and ls.course_code not in required_codes:
            required_codes.append(ls.course_code)

    if not required_codes:
        # Default to core courses with verified sections if user didn't specify any
        required_codes = [
            code
            for code, c in sorted(all_courses_map.items())
            if c.verification_status == "VERIFIED" and code in ("BACSE104", "BAITE101", "BAITE102", "BAITE103", "BAMAT207", "BACHY105", "BAHUM101")
        ]

    total_credits = sum(all_courses_map[c].credits for c in required_codes if c in all_courses_map)
    if total_credits > request.max_credits:
        return OptimizerResponse(
            success=False,
            message=f"Selected required courses total {total_credits:.1f} credits, exceeding max credit limit ({request.max_credits:.1f}).",
            conflicting_constraints=[
                f"Required courses ({', '.join(required_codes)}) sum to {total_credits:.1f} credits > max limit {request.max_credits:.1f} credits."
            ],
            suggested_relaxations=[
                f"Increase your maximum credit limit to at least {int(total_credits)} credits, or remove one course from Required Courses."
            ],
        )

    # 2. Build required component tasks: List of (course_code, component_type, candidate_sections)
    tasks: List[Tuple[str, str, List[CourseSectionSchema]]] = []
    for code in required_codes:
        c_obj = all_courses_map[code]
        active_secs = [s for s in all_sections_by_course.get(code, []) if s.is_active]

        # Determine required component types present in active_secs
        eth_secs = [s for s in active_secs if s.course_type_code == "ETH"]
        ela_secs = [s for s in active_secs if s.course_type_code == "ELA"]
        oc_secs = [s for s in active_secs if s.course_type_code == "OC"]

        components_needed: List[Tuple[str, List[CourseSectionSchema]]] = []
        if eth_secs:
            components_needed.append(("ETH", eth_secs))
        if ela_secs:
            components_needed.append(("ELA", ela_secs))
        if oc_secs and not eth_secs and not ela_secs:
            components_needed.append(("OC", oc_secs))

        for comp_type, cand_list in components_needed:
            locked_for_comp = [
                ls for ls in locked_sections if ls.course_code == code and ls.course_type_code == comp_type
            ]
            if locked_for_comp:
                tasks.append((code, comp_type, locked_for_comp))
            else:
                # Filter out unresolved slots if verified ones exist
                verified_cands = [s for s in cand_list if s.parsed_slot and s.parsed_slot.status != "UNRESOLVED"]
                usable_cands = verified_cands if verified_cands else cand_list

                # Pre-score candidates so branch-and-bound explores high-quality sections first
                def cand_priority(sec: CourseSectionSchema) -> float:
                    sc = 0.0
                    if sec.normalized_faculty_name in pref_fac_norm:
                        sc += 30.0
                    if sec.normalized_faculty_name in avoid_fac_norm:
                        sc -= 40.0
                    if sec.parsed_slot:
                        if any(t in pref_slots for t in sec.parsed_slot.tokens):
                            sc += 15.0
                        if any(t in avoid_slots for t in sec.parsed_slot.tokens):
                            sc -= 25.0
                        if request.avoid_8am and not any(o.start_time == "08:00" for o in sec.parsed_slot.occurrences):
                            sc += 8.0
                        if request.session_preference == "morning_theory" and sec.course_type_code == "ETH" and sec.parsed_slot.session_summary == "Morning":
                            sc += 10.0
                        elif request.session_preference == "evening_theory" and sec.course_type_code == "ETH" and sec.parsed_slot.session_summary == "Evening":
                            sc += 10.0
                    if sec.faculty_review and sec.faculty_review.avg_rating:
                        sc += sec.faculty_review.avg_rating * 3.0
                    return sc

                usable_cands_sorted = sorted(usable_cands, key=cand_priority, reverse=True)
                tasks.append((code, comp_type, usable_cands_sorted))

    # Order tasks: ETH first, then ELA, then OC last; tie-break by fewest unique slot combinations
    def task_sort_key(t: Tuple[str, str, List[CourseSectionSchema]]) -> Tuple[int, int, int]:
        _, comp_type, cands = t
        type_order = 0 if comp_type == "ETH" else (1 if comp_type == "ELA" else 2)
        unique_slots = len({c.slot_combination for c in cands})
        return (type_order, unique_slots, len(cands))

    tasks.sort(key=task_sort_key)

    valid_combinations: List[List[CourseSectionSchema]] = []
    MAX_SOLUTIONS_POOL = 250
    nodes_visited = 0
    MAX_NODES = 25000

    # Track which task depth failed most often if no solution exists
    deepest_reached = -1
    blocking_task_info: Optional[Tuple[str, str]] = None

    def backtrack(idx: int, current: List[CourseSectionSchema]) -> None:
        nonlocal nodes_visited, deepest_reached, blocking_task_info
        if len(valid_combinations) >= MAX_SOLUTIONS_POOL or nodes_visited >= MAX_NODES:
            return
        if idx > deepest_reached:
            deepest_reached = idx
            if idx < len(tasks):
                blocking_task_info = (tasks[idx][0], tasks[idx][1])

        if idx == len(tasks):
            valid_combinations.append(list(current))
            return

        c_code, comp_type, cands = tasks[idx]
        existing_same_course = next((s for s in current if s.course_code == c_code), None)

        # Group candidates by slot_combination so we test slot compatibility once per unique slot
        # and only branch on the top representative faculty for each compatible slot
        by_slot: Dict[str, List[CourseSectionSchema]] = {}
        for c in cands:
            by_slot.setdefault(c.slot_combination, []).append(c)

        # Order slot groups: if existing_same_course is present, prioritize slot groups that contain same faculty
        slot_groups = list(by_slot.items())
        if existing_same_course:
            slot_groups.sort(
                key=lambda kv: any(
                    s.normalized_faculty_name == existing_same_course.normalized_faculty_name
                    for s in kv[1]
                ),
                reverse=True,
            )

        for slot_str, group_secs in slot_groups:
            nodes_visited += 1
            if nodes_visited >= MAX_NODES:
                break

            # Test slot compatibility once using the first section in the slot group
            probe = group_secs[0]
            if any(
                sections_clash_pair(probe, chosen, slot_map, request.allow_adjacent_lab_boundary)
                for chosen in current
            ):
                continue

            # Select up to 2 best faculty representatives for this compatible slot (plus same-faculty match if any)
            reps: List[CourseSectionSchema] = []
            if existing_same_course:
                same_f = [
                    s
                    for s in group_secs
                    if s.normalized_faculty_name == existing_same_course.normalized_faculty_name
                ]
                reps.extend(same_f[:1])
                if request.same_faculty_for_theory_lab and any(
                    c.normalized_faculty_name == existing_same_course.normalized_faculty_name
                    for c in cands
                ) and not same_f:
                    continue

            for s in group_secs:
                if s not in reps and len(reps) < (1 if comp_type == "OC" else 2):
                    reps.append(s)

            for cand in reps:
                current.append(cand)
                backtrack(idx + 1, current)
                current.pop()
                if len(valid_combinations) >= MAX_SOLUTIONS_POOL:
                    return

    backtrack(0, [])

    if not valid_combinations:
        # Diagnose why no valid combination was found
        conflicts = []
        relaxations = []
        if blocking_task_info:
            b_code, b_comp = blocking_task_info
            b_title = all_courses_map[b_code].course_title if b_code in all_courses_map else b_code
            conflicts.append(
                f"Could not place {b_code} ({b_title}) [{b_comp}] without clashing against earlier course selections or locked sections."
            )
            relaxations.append(
                f"Unlock any locked sections that share slots with {b_code} ({b_comp}), or disable strict same-faculty pairing."
            )
        else:
            conflicts.append("No clash-free section assignment exists for the selected combination of courses and locks.")
            relaxations.append("Try unlocking locked sections or removing one elective course.")

        return OptimizerResponse(
            success=False,
            message="No clash-free timetable exists under the current hard constraints.",
            conflicting_constraints=conflicts,
            suggested_relaxations=relaxations,
        )

    # 3. Score every valid combination under the 3 profiles
    scored_pool: List[Dict[str, Any]] = []
    for comb in valid_combinations:
        metrics = compute_schedule_metrics(
            comb, all_sections_by_course, slot_map, request.allow_adjacent_lab_boundary
        )

        # Base preference score
        pref_score = 60.0
        pref_hits = 0
        avoid_hits = 0
        same_fac_pairs = 0

        by_c: Dict[str, List[CourseSectionSchema]] = {}
        for s in comb:
            by_c.setdefault(s.course_code, []).append(s)
            if s.normalized_faculty_name in pref_fac_norm:
                pref_score += 12.0
                pref_hits += 1
            if s.normalized_faculty_name in avoid_fac_norm:
                pref_score -= 18.0
                avoid_hits += 1
            if s.parsed_slot:
                if any(t in pref_slots for t in s.parsed_slot.tokens):
                    pref_score += 8.0
                if any(t in avoid_slots for t in s.parsed_slot.tokens):
                    pref_score -= 14.0
                if request.session_preference == "morning_theory" and s.course_type_code == "ETH" and s.parsed_slot.session_summary == "Morning":
                    pref_score += 6.0
                elif request.session_preference == "evening_theory" and s.course_type_code == "ETH" and s.parsed_slot.session_summary == "Evening":
                    pref_score += 6.0

        for c_code, c_list in by_c.items():
            if len(c_list) == 2 and c_list[0].normalized_faculty_name == c_list[1].normalized_faculty_name:
                same_fac_pairs += 1
                pref_score += 4.0

        rating_bonus = ((metrics["avg_faculty_rating"] or 3.5) - 3.0) * 12.0
        early_penalty = metrics["early_8am_count"] * (5.0 if request.avoid_8am else 1.5)
        gap_penalty = metrics["gap_hours"] * 3.5
        trans_penalty = metrics["building_transitions"] * (3.0 if request.fewer_campus_transitions else 1.0)
        flex_bonus = min(25.0, metrics["flexibility_alternatives_count"] * 0.7)

        best_fit_score = round(
            min(99.5, max(10.0, pref_score + rating_bonus - early_penalty - gap_penalty * 0.5 - trans_penalty * 0.5 + flex_bonus * 0.3)),
            1,
        )
        compact_score = round(
            min(99.5, max(10.0, 92.0 - gap_penalty * 1.4 - trans_penalty * 1.3 - early_penalty * 0.8 + rating_bonus * 0.4)),
            1,
        )
        flex_score = round(
            min(99.5, max(10.0, 65.0 + flex_bonus * 1.4 + pref_score * 0.25 - gap_penalty * 0.3)),
            1,
        )

        scored_pool.append(
            {
                "comb": comb,
                "ids_key": tuple(sorted(s.id for s in comb)),
                "metrics": metrics,
                "pref_hits": pref_hits,
                "avoid_hits": avoid_hits,
                "same_fac_pairs": same_fac_pairs,
                "best_fit_score": best_fit_score,
                "compact_score": compact_score,
                "flex_score": flex_score,
            }
        )

    used_keys: Set[Tuple[int, ...]] = set()
    recommendations: List[GeneratedTimetableOption] = []

    profile_configs = [
        (
            "best_fit",
            "Best Fit",
            "Balanced & Faculty Optimal",
            "best_fit_score",
        ),
        (
            "compact",
            "Compact Timetable",
            "Minimal Gaps & Travel",
            "compact_score",
        ),
        (
            "max_flexibility",
            "Maximum Flexibility",
            "Most Backup Options",
            "flex_score",
        ),
    ]

    for p_id, p_name, p_badge, score_key in profile_configs:
        sorted_candidates = sorted(scored_pool, key=lambda x: x[score_key], reverse=True)
        chosen = next((item for item in sorted_candidates if item["ids_key"] not in used_keys), sorted_candidates[0])
        used_keys.add(chosen["ids_key"])
        m = chosen["metrics"]

        reasons = [
            f"Zero confirmed slot clashes across {len(chosen['comb'])} class components ({total_credits:.0f} credits)."
        ]
        if p_id == "best_fit":
            if m["avg_faculty_rating"]:
                reasons.append(f"High average No8AM verified faculty rating of {m['avg_faculty_rating']:.2f}/5.0.")
            if chosen["same_fac_pairs"] > 0:
                reasons.append(f"Pairs same faculty for Theory & Lab in {chosen['same_fac_pairs']} course(s).")
            if m["early_8am_count"] <= 2:
                reasons.append(f"Keeps 8:00 AM morning sessions low ({m['early_8am_count']} period(s)/week).")
        elif p_id == "compact":
            reasons.append(f"Minimizes idle wait time to {m['gap_hours']} gap period(s) across the entire week.")
            reasons.append(f"Limits cross-building transitions (SJT/PRP/TT) to {m['building_transitions']}.")
        elif p_id == "max_flexibility":
            reasons.append(
                f"Preserves {m['flexibility_alternatives_count']} compatible backup faculty sections if seats fill up during FFCS."
            )
            if m["avg_faculty_rating"]:
                reasons.append(f"Maintains a {m['avg_faculty_rating']:.2f}/5.0 average faculty rating.")

        recommendations.append(
            GeneratedTimetableOption(
                profile_id=p_id,
                profile_name=p_name,
                profile_badge=p_badge,
                total_score=chosen[score_key],
                total_credits=total_credits,
                selected_section_ids=[s.id for s in chosen["comb"]],
                sections=chosen["comb"],
                reasons=reasons,
                daily_summary=m["daily_summary"],
                gap_hours=m["gap_hours"],
                early_8am_count=m["early_8am_count"],
                building_transitions=m["building_transitions"],
                avg_faculty_rating=m["avg_faculty_rating"],
                flexibility_alternatives_count=m["flexibility_alternatives_count"],
                unresolved_warnings=m["unresolved_warnings"],
            )
        )

    return OptimizerResponse(
        success=True,
        message=f"Generated {len(recommendations)} optimized clash-free timetable profiles from {len(valid_combinations)} valid combinations.",
        recommendations=recommendations,
    )
