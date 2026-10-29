"""
Faculty Comparison and Section Recommendation Engine.
Compares available faculty options for a course using slot compatibility, lab compatibility,
venue proximity, component completion, user preferences, and verified no8am.site metrics.
"""
import re
from typing import Dict, List, Optional, Any
from backend.models.schemas import CourseSchema, CourseSectionSchema, SlotOccurrence
from backend.services.slot_parser.engine import parse_slot_string
from backend.services.clash_detector.detector import sections_clash_pair
from backend.services.no8am_scraper.service import normalize_faculty_name


def extract_building(venue: str) -> str:
    if not venue or venue.upper() in ("NIL", "TBA", "TBD"):
        return "ONLINE"
    m = re.match(r"^([A-Z]+)", venue.strip().upper())
    return m.group(1) if m else "OTHER"


def compare_faculty_for_course(
    course: CourseSchema,
    course_sections: List[CourseSectionSchema],
    selected_sections: List[CourseSectionSchema],
    locked_section_ids: List[int],
    slot_map: Dict[str, List[SlotOccurrence]],
    preferred_faculty: Optional[List[str]] = None,
    avoided_faculty: Optional[List[str]] = None,
    preferred_slots: Optional[List[str]] = None,
    avoided_slots: Optional[List[str]] = None,
    session_preference: str = "balanced",
    allow_adjacent_lab_boundary: bool = True,
) -> List[Dict[str, Any]]:
    pref_fac_norm = {normalize_faculty_name(f) for f in (preferred_faculty or [])}
    avoid_fac_norm = {normalize_faculty_name(f) for f in (avoided_faculty or [])}
    pref_slots_set = {s.strip().upper() for s in (preferred_slots or []) if s.strip()}
    avoid_slots_set = {s.strip().upper() for s in (avoided_slots or []) if s.strip()}
    locked_set = set(locked_section_ids or [])

    active_sections = [s for s in course_sections if s.is_active]
    for s in active_sections:
        if s.parsed_slot is None:
            s.parsed_slot = parse_slot_string(s.slot_combination, slot_map)

    # Check what components of this course are already selected
    selected_same_course = [s for s in selected_sections if s.course_code == course.course_code]
    selected_other_courses = [s for s in selected_sections if s.course_code != course.course_code]
    selected_types_in_course = {s.course_type_code for s in selected_same_course}

    eth_sections = [s for s in active_sections if s.course_type_code == "ETH"]
    ela_sections = [s for s in active_sections if s.course_type_code == "ELA"]

    comparisons: List[Dict[str, Any]] = []

    for sec in active_sections:
        p_slot = sec.parsed_slot
        norm_f = sec.normalized_faculty_name

        # 1. Check clash against other selected courses and same-course complement component
        clashes_other = []
        clashes_locked = False
        for other in selected_sections:
            if other.id == sec.id:
                continue
            # If comparing an alternative for the same component, only flag if that same component is locked
            if other.course_code == sec.course_code and other.course_type_code == sec.course_type_code:
                if other.id in locked_set:
                    clashes_locked = True
                    clashes_other.append(f"Locked {other.course_code} {other.course_type_code} ({other.faculty_name})")
                continue
            cols = sections_clash_pair(sec, other, slot_map, allow_adjacent_lab_boundary)
            if cols:
                if other.id in locked_set:
                    clashes_locked = True
                c0 = cols[0]
                clashes_other.append(
                    f"{other.course_code} {other.course_type_code} ({other.slot_combination} on {c0['day']} P{c0['period']})"
                )

        is_compatible = len(clashes_other) == 0 and p_slot.status != "UNRESOLVED"

        # 2. Check Lab / Theory complement compatibility within the same course
        complement_options = []
        same_faculty_complement = []
        if sec.course_type_code == "ETH" and ela_sections:
            for ela in ela_sections:
                if not sections_clash_pair(sec, ela, slot_map, allow_adjacent_lab_boundary):
                    # Also check if ela clashes with selected_other_courses
                    if not any(
                        sections_clash_pair(ela, o, slot_map, allow_adjacent_lab_boundary)
                        for o in selected_other_courses
                    ):
                        complement_options.append(ela)
                        if ela.normalized_faculty_name == norm_f:
                            same_faculty_complement.append(ela)
        elif sec.course_type_code == "ELA" and eth_sections:
            for eth in eth_sections:
                if not sections_clash_pair(sec, eth, slot_map, allow_adjacent_lab_boundary):
                    if not any(
                        sections_clash_pair(eth, o, slot_map, allow_adjacent_lab_boundary)
                        for o in selected_other_courses
                    ):
                        complement_options.append(eth)
                        if eth.normalized_faculty_name == norm_f:
                            same_faculty_complement.append(eth)

        completes_missing_component = (
            course.course_type == "ETL"
            and sec.course_type_code not in selected_types_in_course
            and len(selected_types_in_course) > 0
        )

        # 3. Check 8 AM classes & session convenience
        has_8am = any(occ.period in (1, 2) and occ.start_time == "08:00" for occ in p_slot.occurrences)
        session_label = p_slot.session_summary

        # 4. Compute recommendation score & transparent explanation
        score = 50.0
        reasons: List[str] = []

        if not is_compatible:
            score -= 100.0
            if p_slot.status == "UNRESOLVED":
                reasons.append(f"Unresolved slot '{sec.slot_combination}' cannot be verified on the timetable.")
            elif clashes_locked:
                reasons.append(f"Conflicts with your locked selection ({', '.join(clashes_other)}).")
            else:
                reasons.append(f"Conflicts with currently selected {', '.join(clashes_other)}.")
        else:
            score += 25.0
            reasons.append("Fits your current timetable with zero slot clashes")

        if completes_missing_component and is_compatible:
            score += 15.0
            reasons.append(f"completes the required {sec.course_type_code} component for {course.course_code}")

        if same_faculty_complement and is_compatible:
            score += 10.0
            comp_slots = ", ".join(c.slot_combination for c in same_faculty_complement[:2])
            reasons.append(f"offers a compatible same-faculty pair ({comp_slots})")
        elif complement_options and is_compatible:
            score += 5.0
            reasons.append(f"is compatible with {len(complement_options)} available complement section(s)")

        if norm_f in pref_fac_norm:
            score += 20.0
            reasons.append("matches your preferred faculty list")
        elif norm_f in avoid_fac_norm:
            score -= 30.0
            reasons.append("is marked as an avoided faculty member")

        if any(t in pref_slots_set for t in p_slot.tokens):
            score += 10.0
            reasons.append(f"uses your preferred slot ({sec.slot_combination})")
        if any(t in avoid_slots_set for t in p_slot.tokens):
            score -= 20.0
            reasons.append(f"uses an avoided slot ({sec.slot_combination})")

        if not has_8am and p_slot.status == "VERIFIED":
            score += 6.0
            reasons.append("avoids 8:00 AM morning classes")
        elif has_8am:
            score -= 4.0

        if session_preference == "morning_theory" and sec.course_type_code == "ETH" and session_label == "Morning":
            score += 8.0
            reasons.append("keeps your preferred morning theory schedule")
        elif session_preference == "evening_theory" and sec.course_type_code == "ETH" and session_label == "Evening":
            score += 8.0
            reasons.append("keeps your preferred afternoon/evening theory schedule")

        # Include verified No8AM rating only when total_reviews > 0
        rev = sec.faculty_review
        if rev and rev.avg_rating is not None and rev.total_reviews > 0:
            score += (rev.avg_rating - 3.0) * 6.0
            reasons.append(
                f"has a verified {rev.avg_rating:.2f}/5 rating ({rev.total_reviews} reviews, {rev.cart_count} carts) on no8am.site"
            )
        elif rev and rev.cart_count > 0:
            score += min(5.0, rev.cart_count * 0.1)

        if is_compatible:
            explanation = "Recommended because this section " + ", ".join(reasons[:4]) + "."
        else:
            explanation = "Not recommended: " + " ".join(reasons)

        comparisons.append(
            {
                "section_id": sec.id,
                "course_code": sec.course_code,
                "faculty_name": sec.faculty_name,
                "slot_combination": sec.slot_combination,
                "venue": sec.venue,
                "building": extract_building(sec.venue),
                "course_type_code": sec.course_type_code,
                "class_type": sec.class_type,
                "session": session_label,
                "has_8am": has_8am,
                "is_compatible": is_compatible,
                "clashes_locked": clashes_locked,
                "conflicts_with": clashes_other,
                "compatible_complement_count": len(complement_options),
                "same_faculty_complement_ids": [c.id for c in same_faculty_complement],
                "completes_missing_component": completes_missing_component,
                "is_preferred_faculty": norm_f in pref_fac_norm,
                "is_avoided_faculty": norm_f in avoid_fac_norm,
                "faculty_review": rev.model_dump() if rev else None,
                "score": round(score, 1),
                "recommendation_reason": explanation,
            }
        )

    comparisons.sort(key=lambda x: (x["is_compatible"], x["score"]), reverse=True)
    return comparisons
