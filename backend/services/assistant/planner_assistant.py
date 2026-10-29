"""
VIT FFCS Guide Built-in Course Planning Assistant.
Answers student queries strictly using the imported course database, official slot mappings,
clash detection engine, and timetable optimizer. Never invents faculty names, times, or courses.
"""
from typing import Dict, List, Optional, Any
from backend.models.schemas import (
    AssistantQueryRequest,
    AssistantQueryResponse,
    CourseSchema,
    CourseSectionSchema,
    OptimizerRequest,
    SlotOccurrence,
)
from backend.services.slot_parser.engine import parse_slot_string
from backend.services.clash_detector.detector import (
    evaluate_timetable_clashes,
    sections_clash_pair,
)
from backend.services.timetable_optimizer.optimizer import generate_optimized_timetables

COURSE_ALIASES = {
    "dsa": "BAITE102",
    "data structures": "BAITE102",
    "dbms": "BAITE202",
    "database": "BAITE202",
    "dld": "BAITE101",
    "digital logic": "BAITE101",
    "soop": "BACSE104",
    "structured and object": "BACSE104",
    "oop": "BACSE104",
    "software engineering": "BAITE103",
    "pse": "BAITE103",
    "probability": "BAMAT207",
    "statistics": "BAMAT207",
    "chemistry": "BACHY105",
    "applied chemistry": "BACHY105",
    "german": "BAGER101",
    "india studies": "BAHUM101",
    "english": "BAENG101",
    "technical english": "BAENG101",
}

DAY_ALIASES = {
    "monday": "MON",
    "mon": "MON",
    "tuesday": "TUE",
    "tue": "TUE",
    "wednesday": "WED",
    "wed": "WED",
    "thursday": "THU",
    "thu": "THU",
    "friday": "FRI",
    "fri": "FRI",
}


def detect_mentioned_courses(
    q_lower: str, all_courses_map: Dict[str, CourseSchema]
) -> List[str]:
    found: List[str] = []
    for code, c in all_courses_map.items():
        if code.lower() in q_lower or c.course_title.lower() in q_lower:
            if code not in found:
                found.append(code)
    for alias, code in COURSE_ALIASES.items():
        if alias in q_lower and code in all_courses_map and code not in found:
            found.append(code)
    return found


def answer_planning_question(
    req: AssistantQueryRequest,
    all_courses_map: Dict[str, CourseSchema],
    all_sections_by_course: Dict[str, List[CourseSectionSchema]],
    slot_map: Dict[str, List[SlotOccurrence]],
) -> AssistantQueryResponse:
    q = req.question.strip()
    q_lower = q.lower()

    section_by_id: Dict[int, CourseSectionSchema] = {}
    for secs in all_sections_by_course.values():
        for s in secs:
            if s.parsed_slot is None:
                s.parsed_slot = parse_slot_string(s.slot_combination, slot_map)
            section_by_id[s.id] = s

    selected_sections = [section_by_id[sid] for sid in req.selected_section_ids if sid in section_by_id]
    clash_report = evaluate_timetable_clashes(
        selected_sections=selected_sections,
        all_courses_map=all_courses_map,
        all_sections_by_course=all_sections_by_course,
        slot_map=slot_map,
        locked_section_ids=req.locked_section_ids,
    )

    mentioned_codes = detect_mentioned_courses(q_lower, all_courses_map)

    # 1. Check for "missing slot mappings" or "unresolved" query
    if "missing slot" in q_lower or "unresolved" in q_lower or "unmapped" in q_lower:
        lines = ["### Courses & Offerings with Missing or Unresolved Slot Mappings\n"]
        ref_codes = []
        for code, course in sorted(all_courses_map.items()):
            secs = [s for s in all_sections_by_course.get(code, []) if s.is_active]
            unresolved_secs = [s for s in secs if s.parsed_slot and s.parsed_slot.status == "UNRESOLVED"]
            if unresolved_secs or course.verification_status == "MISSING_DATA":
                ref_codes.append(code)
                lines.append(f"- **{code} — {course.course_title}** (`{course.verification_status}`):")
                for us in unresolved_secs:
                    lines.append(
                        f"  - Section `#{us.id}` ({us.course_type_code}): Slot **`{us.slot_combination}`** | Faculty: `{us.faculty_name}` | Reason: {us.parsed_slot.explanation}"
                    )
        if not ref_codes:
            lines.append("All active courses currently have verified VIT slot mappings.")
        return AssistantQueryResponse(
            question=q,
            answer_markdown="\n".join(lines),
            referenced_courses=ref_codes,
        )

    # 2. Check for "suggest ... clash-free timetables" or "generate ... timetables"
    if ("suggest" in q_lower or "three" in q_lower or "generate" in q_lower) and "timetable" in q_lower:
        req_codes = list({s.course_code for s in selected_sections}) or mentioned_codes
        opt_res = generate_optimized_timetables(
            OptimizerRequest(
                required_course_codes=req_codes,
                locked_section_ids=req.locked_section_ids,
                campus=req.campus,
            ),
            all_courses_map,
            all_sections_by_course,
            slot_map,
        )
        if not opt_res.success:
            return AssistantQueryResponse(
                question=q,
                answer_markdown=(
                    f"### Unable to Generate Clash-Free Timetable\n\n"
                    f"**Reason:** {opt_res.message}\n\n"
                    + "\n".join(f"- {c}" for c in opt_res.conflicting_constraints)
                ),
                referenced_courses=req_codes,
            )

        lines = ["### Top 3 Clash-Free Timetable Recommendations\n"]
        rec_ids: List[int] = []
        for idx, rec in enumerate(opt_res.recommendations[:3], start=1):
            rating_str = f"{rec.avg_faculty_rating:.2f}/5.0" if rec.avg_faculty_rating else "N/A"
            lines.append(
                f"#### {idx}. {rec.profile_name} ({rec.profile_badge}) — Score: **{rec.total_score}** | Credits: **{rec.total_credits:.0f}** | Avg No8AM Rating: **{rating_str}**"
            )
            for reason in rec.reasons:
                lines.append(f"- *{reason}*")
            lines.append("- **Assigned Sections:**")
            for sec in rec.sections:
                lines.append(
                    f"  - `{sec.course_code}` ({sec.course_type_code}): **{sec.faculty_name}** — Slot `{sec.slot_combination}` ({sec.venue})"
                )
            lines.append("")
            if idx == 1:
                rec_ids = rec.selected_section_ids

        return AssistantQueryResponse(
            question=q,
            answer_markdown="\n".join(lines),
            referenced_courses=req_codes,
            recommended_section_ids=rec_ids,
        )

    # 3. Check for two-course compatibility query (e.g. "Which DSA sections do not clash with my DBMS lab?")
    if len(mentioned_codes) >= 2 and ("clash" in q_lower or "fit" in q_lower or "compatible" in q_lower):
        target_code = mentioned_codes[0]
        anchor_code = mentioned_codes[1]
        target_course = all_courses_map[target_code]
        anchor_course = all_courses_map[anchor_code]

        # Check if user has selected sections for anchor_code; otherwise check against all ELA/ETH of anchor_code
        selected_anchors = [s for s in selected_sections if s.course_code == anchor_code]
        if "lab" in q_lower:
            selected_anchors = [s for s in selected_anchors if s.course_type_code == "ELA"] or [
                s for s in all_sections_by_course.get(anchor_code, []) if s.is_active and s.course_type_code == "ELA"
            ]
        elif not selected_anchors:
            selected_anchors = [s for s in all_sections_by_course.get(anchor_code, []) if s.is_active]

        target_secs = [s for s in all_sections_by_course.get(target_code, []) if s.is_active]
        lines = [
            f"### {target_code} ({target_course.course_title}) Compatibility with {anchor_code} ({anchor_course.course_title})\n"
        ]
        anchor_desc = ", ".join(
            sorted({f"{a.slot_combination} ({a.faculty_name})" for a in selected_anchors[:6]})
        )
        lines.append(f"**Checked against {anchor_code} offering(s):** {anchor_desc}\n")

        compat_ids = []
        for tsec in target_secs:
            # A section is compatible if there is at least one anchor offering it does not clash with (or all if user selected specific ones)
            user_has_specific_anchor = any(s.course_code == anchor_code for s in selected_sections)
            if user_has_specific_anchor:
                clashes = [
                    a for a in selected_anchors if sections_clash_pair(tsec, a, slot_map)
                ]
                is_ok = len(clashes) == 0
            else:
                compat_anchors = [
                    a for a in selected_anchors if not sections_clash_pair(tsec, a, slot_map)
                ]
                is_ok = len(compat_anchors) > 0

            rev_str = (
                f"★ {tsec.faculty_review.avg_rating:.2f} ({tsec.faculty_review.total_reviews} revs)"
                if (tsec.faculty_review and tsec.faculty_review.avg_rating)
                else "Unrated on No8AM"
            )
            if is_ok:
                compat_ids.append(tsec.id)
                lines.append(
                    f"- **COMPATIBLE** `[#{tsec.id}]` **{tsec.faculty_name}** ({tsec.course_type_code}) — Slot **`{tsec.slot_combination}`** | Venue: `{tsec.venue}` | {rev_str}"
                )
            else:
                lines.append(
                    f"- **CLASHES** `[#{tsec.id}]` ~~{tsec.faculty_name}~~ ({tsec.course_type_code}) — Slot `{tsec.slot_combination}` | Venue: `{tsec.venue}`"
                )

        return AssistantQueryResponse(
            question=q,
            answer_markdown="\n".join(lines),
            referenced_courses=[target_code, anchor_code],
            recommended_section_ids=compat_ids,
        )

    # 4. Check for clash explanation or weekday clash resolution (e.g. "Why is this section marked as conflicting?" or "Which alternatives can resolve my Tuesday clash?")
    mentioned_day = next((d_code for word, d_code in DAY_ALIASES.items() if word in q_lower), None)
    if "why" in q_lower or "clash" in q_lower or "conflict" in q_lower or "resolve" in q_lower or mentioned_day:
        if mentioned_codes and len(mentioned_codes) == 1 and ("fit" in q_lower or "compatible" in q_lower or "do not clash" in q_lower):
            pass  # Handled in single-course fit block below
        else:
            relevant_clashes = clash_report.clashes
            if mentioned_day:
                relevant_clashes = [c for c in relevant_clashes if c.day == mentioned_day]

            lines = ["### Active Timetable Clash Analysis & Resolution Guide\n"]
            rec_ids = []
            if not relevant_clashes:
                if mentioned_day:
                    lines.append(
                        f"Your currently selected timetable has **0 confirmed clashes on {mentioned_day}**."
                    )
                else:
                    lines.append(
                        "Your currently selected timetable has **0 active clashes**. Every selected section has verified, non-overlapping VIT slot intervals."
                    )
                # Also explain how clashes are determined
                lines.append(
                    "\n**How sections are marked as conflicting:** A candidate section is flagged only when its official VIT day and period time interval (e.g., `B1` on `TUE P1 08:00-08:50` & `THU P2 09:00-09:50`, or `L7+L8` on `TUE P1-P2 08:00-09:40`) overlaps a currently selected or locked section."
                )
            else:
                for c in relevant_clashes:
                    lines.append(f"#### [{c.severity}] {c.clash_type.replace('_', ' ')}")
                    lines.append(f"- **Explanation:** {c.explanation}")
                    if c.suggested_alternatives:
                        lines.append("- **Compatible Alternatives to Resolve This Clash:**")
                        for alt in c.suggested_alternatives:
                            rec_ids.append(alt["section_id"])
                            r_str = f" (No8AM ★ {alt['avg_rating']:.2f})" if alt.get("avg_rating") else ""
                            lines.append(
                                f"  - Switch `{alt['course_code']}` ({alt['course_type_code']}) to **{alt['faculty_name']}** — Slot **`{alt['slot_combination']}`** at `{alt['venue']}`{r_str} `[Section #{alt['section_id']}]`"
                            )
                    lines.append("")

            return AssistantQueryResponse(
                question=q,
                answer_markdown="\n".join(lines),
                referenced_courses=mentioned_codes,
                recommended_section_ids=rec_ids,
            )

    # 5. Single course faculty listing or "fit my current timetable" query
    if mentioned_codes:
        c_code = mentioned_codes[0]
        course = all_courses_map[c_code]
        secs = [s for s in all_sections_by_course.get(c_code, []) if s.is_active]
        only_fitting = "fit" in q_lower or "compatible" in q_lower or "do not clash" in q_lower

        lines = [
            f"### {c_code} — {course.course_title} ({course.credits:.0f} Credits, {course.curriculum_category})\n"
        ]
        if only_fitting:
            lines.append("Showing sections compatible with your current timetable selection:\n")
        else:
            lines.append(f"Showing all **{len(secs)}** imported faculty offerings:\n")

        rec_ids = []
        for s in secs:
            comp_info = clash_report.section_compatibility.get(s.id, {})
            is_compat = comp_info.get("compatible", True)
            if only_fitting and not is_compat:
                continue

            rev = s.faculty_review
            rev_str = (
                f"No8AM: **★ {rev.avg_rating:.2f}/5** ({rev.total_reviews} reviews, {rev.cart_count} carts)"
                if (rev and rev.avg_rating is not None and rev.total_reviews > 0)
                else f"No8AM: Unrated ({rev.cart_count if rev else 0} carts)"
            )
            occ_str = ", ".join(
                f"{o.day} P{o.period} ({o.start_time}-{o.end_time})"
                for o in (s.parsed_slot.occurrences if s.parsed_slot else [])
            ) or "Online / Unscheduled"
            status_badge = "COMPATIBLE" if is_compat else f"CLASH ({', '.join(comp_info.get('conflicts_with', []))})"
            if is_compat:
                rec_ids.append(s.id)
            lines.append(
                f"- **`[{s.course_type_code}]` {s.faculty_name}** — Slot **`{s.slot_combination}`** ({occ_str}) | Venue: `{s.venue}` | {rev_str} | Status: **{status_badge}**"
            )

        if len(lines) == 2:
            lines.append("*No sections of this course fit your current timetable without changing an existing selection.*")

        return AssistantQueryResponse(
            question=q,
            answer_markdown="\n".join(lines),
            referenced_courses=[c_code],
            recommended_section_ids=rec_ids,
        )

    # 6. General summary fallback using live database stats
    lines = [
        "### VIT FFCS Guide Planning Summary\n",
        f"- **Imported Courses:** {len(all_courses_map)} courses ({', '.join(sorted(all_courses_map.keys()))})",
        f"- **Currently Selected Sections:** {len(selected_sections)} section(s) totaling **{clash_report.total_credits:.1f} credits**",
        f"- **Active Confirmed Clashes:** {clash_report.confirmed_clash_count}",
        f"- **Unresolved / Possible Clash Warnings:** {clash_report.possible_clash_count}",
        "\nTry asking specific questions such as:",
        "- *\"List every faculty option for Digital Logic Design.\"*",
        "- *\"Which Probability and Statistics sections fit my current timetable?\"*",
        "- *\"Which DSA sections do not clash with my Database Information Systems lab?\"*",
        "- *\"Suggest three clash-free timetables for my selected courses.\"*",
        "- *\"Show all courses with missing slot mappings.\"*",
    ]
    return AssistantQueryResponse(
        question=q,
        answer_markdown="\n".join(lines),
        referenced_courses=list(all_courses_map.keys()),
    )
