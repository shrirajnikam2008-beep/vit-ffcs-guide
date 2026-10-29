"""
Dedicated VIT FFCS Clash-Detection Engine.
Detects all 10 categories of timetable, component, credit, and unresolved-slot conflicts,
and computes compatible alternative sections for any clash.
"""
from typing import Dict, List, Optional, Set, Tuple, Any
from backend.models.schemas import (
    CourseSchema,
    CourseSectionSchema,
    ClashDetail,
    ClashReportResponse,
    SlotOccurrence,
)
from backend.services.slot_parser.engine import (
    parse_slot_string,
    occurrences_collide,
)


def determine_specific_clash_type(
    sec_a: CourseSectionSchema,
    occ_a: SlotOccurrence,
    sec_b: CourseSectionSchema,
    occ_b: SlotOccurrence,
) -> str:
    cat_a = occ_a.slot_category
    cat_b = occ_b.slot_category
    cats = {cat_a, cat_b}

    if cats == {"LAB"}:
        return "LAB_VS_LAB"
    if "LAB" in cats and ("THEORY" in cats or "TUTORIAL" in cats):
        return "THEORY_VS_LAB"
    if cats == {"TUTORIAL"}:
        return "TUTORIAL_VS_TUTORIAL"
    if cats == {"THEORY", "TUTORIAL"}:
        return "THEORY_VS_TUTORIAL"
    if "+" in sec_a.slot_combination or "+" in sec_b.slot_combination:
        return "COMBINED_SLOT_CLASH"
    return "THEORY_VS_THEORY"


def sections_clash_pair(
    sec_a: CourseSectionSchema,
    sec_b: CourseSectionSchema,
    slot_map: Dict[str, List[SlotOccurrence]],
    allow_adjacent_lab_boundary: bool = True,
) -> List[Dict[str, Any]]:
    """
    Compares two CourseSectionSchema instances using their verified time occurrences.
    Never flags two classes merely for sharing a string unless their verified time occurrences overlap.
    """
    parsed_a = sec_a.parsed_slot or parse_slot_string(sec_a.slot_combination, slot_map)
    parsed_b = sec_b.parsed_slot or parse_slot_string(sec_b.slot_combination, slot_map)

    collisions: List[Dict[str, Any]] = []
    seen_pairs: Set[Tuple[str, int, str, str]] = set()

    for occ_a in parsed_a.occurrences:
        for occ_b in parsed_b.occurrences:
            is_col, reason = occurrences_collide(occ_a, occ_b, allow_adjacent_lab_boundary)
            if is_col:
                dedup = (occ_a.day, occ_a.period, occ_a.slot_code, occ_b.slot_code)
                if dedup in seen_pairs:
                    continue
                seen_pairs.add(dedup)
                ctype = determine_specific_clash_type(sec_a, occ_a, sec_b, occ_b)
                collisions.append(
                    {
                        "clash_type": ctype,
                        "occ_a": occ_a,
                        "occ_b": occ_b,
                        "day": occ_a.day,
                        "period": occ_a.period,
                        "time_interval": f"{occ_a.start_time}-{occ_a.end_time}"
                        if occ_a.start_time == occ_b.start_time and occ_a.end_time == occ_b.end_time
                        else f"{occ_a.start_time}-{occ_a.end_time} vs {occ_b.start_time}-{occ_b.end_time}",
                        "conflicting_slots": sorted(list({occ_a.slot_code, occ_b.slot_code})),
                        "reason": reason,
                    }
                )
    return collisions


def find_compatible_alternatives(
    target_section: CourseSectionSchema,
    other_selected_sections: List[CourseSectionSchema],
    all_sections_for_course: List[CourseSectionSchema],
    slot_map: Dict[str, List[SlotOccurrence]],
    allow_adjacent_lab_boundary: bool = True,
    max_suggestions: int = 4,
) -> List[Dict[str, Any]]:
    """
    Finds alternative sections of the same course & component type (ETH/ELA/OC)
    that do not clash with any of `other_selected_sections`.
    """
    suggestions: List[Dict[str, Any]] = []
    for cand in all_sections_for_course:
        if not cand.is_active or cand.id == target_section.id:
            continue
        if cand.course_type_code != target_section.course_type_code:
            continue
        parsed_cand = cand.parsed_slot or parse_slot_string(cand.slot_combination, slot_map)
        if parsed_cand.status == "UNRESOLVED":
            continue

        clashes_with_others = False
        for other in other_selected_sections:
            if other.id == target_section.id:
                continue
            if sections_clash_pair(cand, other, slot_map, allow_adjacent_lab_boundary):
                clashes_with_others = True
                break

        if not clashes_with_others:
            rating = cand.faculty_review.avg_rating if cand.faculty_review else None
            suggestions.append(
                {
                    "section_id": cand.id,
                    "course_code": cand.course_code,
                    "faculty_name": cand.faculty_name,
                    "slot_combination": cand.slot_combination,
                    "venue": cand.venue,
                    "course_type_code": cand.course_type_code,
                    "avg_rating": rating,
                }
            )

    suggestions.sort(
        key=lambda x: (x["avg_rating"] is not None, x["avg_rating"] or 0.0),
        reverse=True,
    )
    return suggestions[:max_suggestions]


def evaluate_timetable_clashes(
    selected_sections: List[CourseSectionSchema],
    all_courses_map: Dict[str, CourseSchema],
    all_sections_by_course: Dict[str, List[CourseSectionSchema]],
    slot_map: Dict[str, List[SlotOccurrence]],
    locked_section_ids: Optional[List[int]] = None,
    mandatory_course_codes: Optional[List[str]] = None,
    min_credits: float = 16.0,
    target_credits: float = 21.0,
    max_credits: float = 27.0,
    allow_adjacent_lab_boundary: bool = True,
    compute_all_compatibilities: bool = True,
) -> ClashReportResponse:
    locked_set = set(locked_section_ids or [])
    mandatory_set = set(mandatory_course_codes or [])
    clashes: List[ClashDetail] = []
    clash_counter = 0

    def next_id(prefix: str) -> str:
        nonlocal clash_counter
        clash_counter += 1
        return f"{prefix}_{clash_counter}"

    # Ensure all selected sections have parsed_slot populated
    for sec in selected_sections:
        if sec.parsed_slot is None:
            sec.parsed_slot = parse_slot_string(sec.slot_combination, slot_map)

    # 1. Check Unresolved / Missing Slot Mappings on Selected Sections
    for sec in selected_sections:
        p_slot = sec.parsed_slot
        if p_slot and p_slot.status == "UNRESOLVED":
            clashes.append(
                ClashDetail(
                    clash_id=next_id("UNRES"),
                    clash_type="UNRESOLVED_SLOT_WARNING",
                    severity="WARNING",
                    is_confirmed=False,
                    course_a_code=sec.course_code,
                    course_a_title=sec.course_title,
                    course_a_faculty=sec.faculty_name,
                    course_a_section_id=sec.id,
                    course_a_slot=sec.slot_combination,
                    course_a_venue=sec.venue,
                    course_a_type=sec.course_type_code,
                    conflicting_slots=p_slot.unresolved_tokens,
                    explanation=(
                        f"Possible clash / unverified placement: {sec.course_code} ({sec.faculty_name}) uses "
                        f"slot '{sec.slot_combination}' which cannot be mapped to a verified day/time. "
                        f"{p_slot.explanation or ''}"
                    ),
                    suggested_alternatives=[],
                )
            )

    # 2. Check Pairwise Time/Slot Clashes and Duplicate Course Components
    n = len(selected_sections)
    for i in range(n):
        sec_a = selected_sections[i]
        for j in range(i + 1, n):
            sec_b = selected_sections[j]

            # Check duplicate course component registration (e.g. two ETH or two ELA for same course)
            if (
                sec_a.course_code == sec_b.course_code
                and sec_a.course_type_code == sec_b.course_type_code
            ):
                clashes.append(
                    ClashDetail(
                        clash_id=next_id("DUP"),
                        clash_type="DUPLICATE_COURSE_COMPONENT",
                        severity="ERROR",
                        is_confirmed=True,
                        course_a_code=sec_a.course_code,
                        course_a_title=sec_a.course_title,
                        course_a_faculty=sec_a.faculty_name,
                        course_a_section_id=sec_a.id,
                        course_a_slot=sec_a.slot_combination,
                        course_a_venue=sec_a.venue,
                        course_a_type=sec_a.course_type_code,
                        course_b_code=sec_b.course_code,
                        course_b_title=sec_b.course_title,
                        course_b_faculty=sec_b.faculty_name,
                        course_b_section_id=sec_b.id,
                        course_b_slot=sec_b.slot_combination,
                        course_b_venue=sec_b.venue,
                        course_b_type=sec_b.course_type_code,
                        conflicting_slots=[sec_a.slot_combination, sec_b.slot_combination],
                        explanation=(
                            f"Duplicate {sec_a.course_type_code} component selected for {sec_a.course_code} "
                            f"({sec_a.faculty_name} [{sec_a.slot_combination}] and "
                            f"{sec_b.faculty_name} [{sec_b.slot_combination}]). "
                            "Only one section per component type is permitted."
                        ),
                        suggested_alternatives=[],
                    )
                )

            # Check time-interval collisions
            pair_cols = sections_clash_pair(sec_a, sec_b, slot_map, allow_adjacent_lab_boundary)
            if pair_cols:
                # Group all colliding occurrences between sec_a and sec_b into clear clash entries
                others_for_a = [s for s in selected_sections if s.id != sec_a.id]
                others_for_b = [s for s in selected_sections if s.id != sec_b.id]
                alts = []
                if sec_b.id not in locked_set:
                    alts.extend(
                        find_compatible_alternatives(
                            sec_b,
                            others_for_b,
                            all_sections_by_course.get(sec_b.course_code, []),
                            slot_map,
                            allow_adjacent_lab_boundary,
                            max_suggestions=2,
                        )
                    )
                if sec_a.id not in locked_set:
                    alts.extend(
                        find_compatible_alternatives(
                            sec_a,
                            others_for_a,
                            all_sections_by_course.get(sec_a.course_code, []),
                            slot_map,
                            allow_adjacent_lab_boundary,
                            max_suggestions=2,
                        )
                    )

                for col in pair_cols:
                    clashes.append(
                        ClashDetail(
                            clash_id=next_id("CLASH"),
                            clash_type=col["clash_type"],
                            severity="ERROR",
                            is_confirmed=True,
                            course_a_code=sec_a.course_code,
                            course_a_title=sec_a.course_title,
                            course_a_faculty=sec_a.faculty_name,
                            course_a_section_id=sec_a.id,
                            course_a_slot=sec_a.slot_combination,
                            course_a_venue=sec_a.venue,
                            course_a_type=sec_a.course_type_code,
                            course_b_code=sec_b.course_code,
                            course_b_title=sec_b.course_title,
                            course_b_faculty=sec_b.faculty_name,
                            course_b_section_id=sec_b.id,
                            course_b_slot=sec_b.slot_combination,
                            course_b_venue=sec_b.venue,
                            course_b_type=sec_b.course_type_code,
                            conflicting_slots=col["conflicting_slots"],
                            day=col["day"],
                            time_interval=col["time_interval"],
                            period=col["period"],
                            explanation=(
                                f"{col['clash_type'].replace('_', ' ')}: "
                                f"{sec_a.course_code} ({sec_a.faculty_name}, {sec_a.slot_combination}, {sec_a.venue}) "
                                f"collides with {sec_b.course_code} ({sec_b.faculty_name}, {sec_b.slot_combination}, {sec_b.venue}) "
                                f"on {col['reason']}."
                            ),
                            suggested_alternatives=alts,
                        )
                    )

    # 3. Check Incomplete Course Components (e.g. ETL course missing ETH or ELA)
    by_course: Dict[str, List[CourseSectionSchema]] = {}
    for sec in selected_sections:
        by_course.setdefault(sec.course_code, []).append(sec)

    total_credits = 0.0
    for c_code, secs in by_course.items():
        course_obj = all_courses_map.get(c_code)
        c_credits = course_obj.credits if course_obj else 4.0
        total_credits += c_credits

        if course_obj and course_obj.course_type == "ETL":
            all_course_secs = [s for s in all_sections_by_course.get(c_code, []) if s.is_active]
            has_eth_available = any(s.course_type_code == "ETH" for s in all_course_secs)
            has_ela_available = any(s.course_type_code == "ELA" for s in all_course_secs)

            selected_types = {s.course_type_code for s in secs}
            if has_eth_available and "ETH" not in selected_types:
                eth_placeholder = next((s for s in all_course_secs if s.course_type_code == "ETH"), None)
                alts = (
                    find_compatible_alternatives(
                        eth_placeholder,
                        selected_sections,
                        all_course_secs,
                        slot_map,
                        allow_adjacent_lab_boundary,
                    )
                    if eth_placeholder
                    else []
                )
                clashes.append(
                    ClashDetail(
                        clash_id=next_id("INCOMP"),
                        clash_type="INCOMPLETE_COMPONENT",
                        severity="WARNING",
                        is_confirmed=True,
                        course_a_code=c_code,
                        course_a_title=course_obj.course_title,
                        course_a_faculty=secs[0].faculty_name,
                        course_a_section_id=secs[0].id,
                        course_a_slot=secs[0].slot_combination,
                        course_a_venue=secs[0].venue,
                        course_a_type=secs[0].course_type_code,
                        conflicting_slots=[secs[0].slot_combination],
                        explanation=(
                            f"{c_code} ({course_obj.course_title}) is an Embedded Theory + Lab (ETL) course, "
                            "but only the Lab (ELA) component is currently selected. Select a compatible Theory (ETH) section."
                        ),
                        suggested_alternatives=alts,
                    )
                )
            if has_ela_available and "ELA" not in selected_types:
                ela_placeholder = next((s for s in all_course_secs if s.course_type_code == "ELA"), None)
                alts = (
                    find_compatible_alternatives(
                        ela_placeholder,
                        selected_sections,
                        all_course_secs,
                        slot_map,
                        allow_adjacent_lab_boundary,
                    )
                    if ela_placeholder
                    else []
                )
                clashes.append(
                    ClashDetail(
                        clash_id=next_id("INCOMP"),
                        clash_type="INCOMPLETE_COMPONENT",
                        severity="WARNING",
                        is_confirmed=True,
                        course_a_code=c_code,
                        course_a_title=course_obj.course_title,
                        course_a_faculty=secs[0].faculty_name,
                        course_a_section_id=secs[0].id,
                        course_a_slot=secs[0].slot_combination,
                        course_a_venue=secs[0].venue,
                        course_a_type=secs[0].course_type_code,
                        conflicting_slots=[secs[0].slot_combination],
                        explanation=(
                            f"{c_code} ({course_obj.course_title}) is an Embedded Theory + Lab (ETL) course, "
                            "but only the Theory (ETH) component is currently selected. Select a compatible Lab (ELA) section."
                        ),
                        suggested_alternatives=alts,
                    )
                )

    # 4. Check Mandatory Courses Missing
    for m_code in sorted(mandatory_set):
        if m_code not in by_course and m_code in all_courses_map:
            c_obj = all_courses_map[m_code]
            clashes.append(
                ClashDetail(
                    clash_id=next_id("MAND"),
                    clash_type="MISSING_MANDATORY_COURSE",
                    severity="WARNING",
                    is_confirmed=True,
                    course_a_code=m_code,
                    course_a_title=c_obj.course_title,
                    course_a_faculty="Not Selected",
                    course_a_slot="None",
                    explanation=(
                        f"Mandatory course {m_code} ({c_obj.course_title}, {c_obj.credits} credits) "
                        "is required by your selection rules but has no sections added yet."
                    ),
                )
            )

    # 5. Check Credit-Limit Violations
    if total_credits > max_credits:
        clashes.append(
            ClashDetail(
                clash_id=next_id("CREDIT"),
                clash_type="CREDIT_LIMIT_VIOLATION",
                severity="ERROR",
                is_confirmed=True,
                course_a_code="CREDITS",
                course_a_title="Maximum Credit Limit Exceeded",
                course_a_faculty="N/A",
                course_a_slot=f"{total_credits} / {max_credits} Cr",
                explanation=(
                    f"Selected courses total {total_credits:.1f} credits, which exceeds your maximum credit limit "
                    f"of {max_credits:.1f} credits by {(total_credits - max_credits):.1f} credits."
                ),
            )
        )

    # 6. Compute compatibility status for every section across all courses against the current selection
    section_compatibility: Dict[int, Dict[str, Any]] = {}
    if compute_all_compatibilities:
        selected_ids = {s.id for s in selected_sections}
        for c_code, c_secs in all_sections_by_course.items():
            for cand in c_secs:
                if not cand.is_active:
                    continue
                if cand.parsed_slot is None:
                    cand.parsed_slot = parse_slot_string(cand.slot_combination, slot_map)

                is_sel = cand.id in selected_ids
                is_lck = cand.id in locked_set
                conflicts_with = []
                conflicts_with_locked = False

                for sel in selected_sections:
                    if sel.id == cand.id:
                        continue
                    # Ignore same-course same-component when checking if switching to `cand` is compatible!
                    if (
                        not is_sel
                        and sel.course_code == cand.course_code
                        and sel.course_type_code == cand.course_type_code
                    ):
                        if sel.id in locked_set:
                            conflicts_with_locked = True
                            conflicts_with.append(
                                f"Locked {sel.course_code} {sel.course_type_code} ({sel.faculty_name})"
                            )
                        continue

                    cols = sections_clash_pair(cand, sel, slot_map, allow_adjacent_lab_boundary)
                    if cols:
                        if sel.id in locked_set:
                            conflicts_with_locked = True
                        first_c = cols[0]
                        conflicts_with.append(
                            f"{sel.course_code} {sel.course_type_code} ({sel.faculty_name}, {sel.slot_combination} on {first_c['day']} P{first_c['period']})"
                        )

                status = "COMPATIBLE"
                if cand.parsed_slot.status == "UNRESOLVED":
                    status = "UNRESOLVED"
                elif conflicts_with_locked:
                    status = "CLASH_LOCKED"
                elif conflicts_with:
                    status = "CLASH"

                section_compatibility[cand.id] = {
                    "section_id": cand.id,
                    "is_selected": is_sel,
                    "is_locked": is_lck,
                    "status": status,
                    "compatible": len(conflicts_with) == 0 and cand.parsed_slot.status != "UNRESOLVED",
                    "conflicts_with": conflicts_with,
                }

    confirmed_errors = sum(1 for c in clashes if c.severity == "ERROR" and c.is_confirmed)
    possible_clashes = sum(1 for c in clashes if not c.is_confirmed)
    warnings = sum(1 for c in clashes if c.severity == "WARNING")

    return ClashReportResponse(
        has_hard_clashes=confirmed_errors > 0,
        confirmed_clash_count=confirmed_errors,
        possible_clash_count=possible_clashes,
        warning_count=warnings,
        total_credits=total_credits,
        min_credits=min_credits,
        target_credits=target_credits,
        max_credits=max_credits,
        clashes=clashes,
        section_compatibility=section_compatibility,
    )
