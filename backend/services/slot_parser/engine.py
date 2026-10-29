"""
Authoritative VIT FFCS Slot-Parsing and Time-Interval Engine.

Rules:
1. Never guess weekday or time for unmapped or ambiguous slots (e.g., 'G1/G2', 'ANY SLOT', 'CUSTOM1').
2. Preserve original slot strings exactly alongside parsed tokens.
3. Support VIT Vellore and VIT Chennai official timetable mappings, plus custom user-defined overrides.
4. Distinguish confirmed time-interval clashes from possible clashes due to unresolved slot mappings.
"""
import re
from typing import Dict, List, Tuple, Optional, Any
from sqlalchemy.orm import Session
from backend.models.database import SlotMappingModel
from backend.models.schemas import SlotOccurrence, ParsedSlotResult

# Official VIT Vellore Period Times
VELLORE_THEORY_TIMES: Dict[int, Tuple[str, str]] = {
    1: ("08:00", "08:50"),
    2: ("09:00", "09:50"),
    3: ("10:00", "10:50"),
    4: ("11:00", "11:50"),
    5: ("12:00", "12:50"),
    6: ("13:00", "13:50"),
    7: ("14:00", "14:50"),
    8: ("15:00", "15:50"),
    9: ("16:00", "16:50"),
    10: ("17:00", "17:50"),
    11: ("18:00", "18:50"),
    12: ("18:51", "19:40"),
}

VELLORE_LAB_TIMES: Dict[int, Tuple[str, str]] = {
    1: ("08:00", "08:50"),
    2: ("08:51", "09:40"),
    3: ("09:51", "10:40"),
    4: ("10:41", "11:30"),
    5: ("11:40", "12:30"),
    6: ("12:31", "13:20"),
    7: ("14:00", "14:50"),
    8: ("14:51", "15:40"),
    9: ("15:51", "16:40"),
    10: ("16:41", "17:30"),
    11: ("17:40", "18:30"),
    12: ("18:31", "19:20"),
}

# Official VIT Chennai Period Times
CHENNAI_THEORY_TIMES: Dict[int, Tuple[str, str]] = {
    1: ("08:00", "08:50"),
    2: ("08:55", "09:45"),
    3: ("09:50", "10:40"),
    4: ("10:45", "11:35"),
    5: ("11:40", "12:30"),
    6: ("12:30", "13:20"),
    7: ("14:00", "14:50"),
    8: ("14:55", "15:45"),
    9: ("15:50", "16:40"),
    10: ("16:45", "17:35"),
    11: ("17:40", "18:30"),
    12: ("18:30", "19:20"),
}

CHENNAI_LAB_TIMES: Dict[int, Tuple[str, str]] = {
    1: ("08:00", "08:50"),
    2: ("08:50", "09:40"),
    3: ("09:50", "10:40"),
    4: ("10:40", "11:30"),
    5: ("11:40", "12:30"),
    6: ("12:30", "13:20"),
    7: ("14:00", "14:50"),
    8: ("14:50", "15:40"),
    9: ("15:50", "16:40"),
    10: ("16:40", "17:30"),
    11: ("17:40", "18:30"),
    12: ("18:30", "19:20"),
}

DAYS_ORDER = ["MON", "TUE", "WED", "THU", "FRI", "SAT"]


def classify_slot_token(token: str) -> str:
    """
    Classifies a single normalized slot token into:
    'LAB', 'TUTORIAL', 'THEORY', 'ONLINE', or 'UNRESOLVED'.
    """
    t = token.strip().upper()
    if not t:
        return "UNRESOLVED"
    if t in ("OC", "NIL", "ONLINE"):
        return "ONLINE"
    if "/" in t or " " in t or t in ("ANY", "ANY SLOT", "TBD", "TBA"):
        return "UNRESOLVED"
    if re.match(r"^L\d{1,2}$", t):
        return "LAB"
    if re.match(r"^T[A-G]{1,2}\d$", t):
        return "TUTORIAL"
    if re.match(r"^[A-G]\d$", t) or re.match(r"^V\d$", t) or re.match(r"^S\d{1,2}$", t):
        return "THEORY"
    return "UNRESOLVED"


def get_slot_session(token: str) -> str:
    t = token.strip().upper()
    if t.startswith("L") and t[1:].isdigit():
        num = int(t[1:])
        return "Morning" if num <= 30 else "Evening"
    if t.endswith("1") or t in ("V1", "V2", "S11", "S15"):
        return "Morning"
    if t.endswith("2") or t in ("V3", "V4", "V5", "V6", "V7", "S1", "S2", "S3", "S4"):
        return "Evening"
    return "Morning"


def build_default_slot_mappings(campus: str = "vellore") -> Dict[str, List[Dict[str, Any]]]:
    """
    Constructs the authoritative VIT Vellore or VIT Chennai slot-to-day-and-time mapping.
    """
    campus_key = "chennai" if "chennai" in campus.lower() else "vellore"
    th_times = CHENNAI_THEORY_TIMES if campus_key == "chennai" else VELLORE_THEORY_TIMES
    lb_times = CHENNAI_LAB_TIMES if campus_key == "chennai" else VELLORE_LAB_TIMES

    def mk(slot_code: str, day: str, period: int, is_lab: bool = False) -> Dict[str, Any]:
        cat = "LAB" if is_lab else classify_slot_token(slot_code)
        start_t, end_t = (lb_times if is_lab else th_times)[period]
        return {
            "campus": campus_key,
            "slot_code": slot_code,
            "day": day,
            "period": period,
            "start_time": start_t,
            "end_time": end_t,
            "slot_category": cat,
            "session": get_slot_session(slot_code),
            "source": f"Official VIT {campus_key.capitalize()} Timetable",
            "is_custom": False,
        }

    if campus_key == "vellore":
        mapping: Dict[str, List[Dict[str, Any]]] = {
            "A1": [mk("A1", "MON", 1), mk("A1", "WED", 2)],
            "TA1": [mk("TA1", "FRI", 3)],
            "TAA1": [mk("TAA1", "TUE", 5)],
            "B1": [mk("B1", "TUE", 1), mk("B1", "THU", 2)],
            "TB1": [mk("TB1", "MON", 4)],
            "TBB1": [mk("TBB1", "THU", 5)],
            "C1": [mk("C1", "WED", 1), mk("C1", "FRI", 2)],
            "TC1": [mk("TC1", "TUE", 4)],
            "TCC1": [mk("TCC1", "THU", 5)],
            "D1": [mk("D1", "MON", 3), mk("D1", "THU", 1)],
            "TD1": [mk("TD1", "FRI", 5)],
            "TDD1": [mk("TDD1", "WED", 4)],
            "E1": [mk("E1", "TUE", 3), mk("E1", "FRI", 1)],
            "TE1": [mk("TE1", "THU", 4)],
            "TEE1": [mk("TEE1", "TUE", 4)],
            "F1": [mk("F1", "MON", 2), mk("F1", "WED", 3)],
            "TF1": [mk("TF1", "FRI", 4)],
            "TFF1": [mk("TFF1", "THU", 5)],
            "G1": [mk("G1", "TUE", 2), mk("G1", "THU", 3)],
            "TG1": [mk("TG1", "MON", 5)],
            "TGG1": [mk("TGG1", "WED", 5)],
            "A2": [mk("A2", "MON", 7), mk("A2", "WED", 8)],
            "TA2": [mk("TA2", "FRI", 9)],
            "TAA2": [mk("TAA2", "TUE", 11)],
            "B2": [mk("B2", "TUE", 7), mk("B2", "THU", 8)],
            "TB2": [mk("TB2", "MON", 10)],
            "TBB2": [mk("TBB2", "WED", 11)],
            "C2": [mk("C2", "WED", 7), mk("C2", "FRI", 8)],
            "TC2": [mk("TC2", "TUE", 10)],
            "TCC2": [mk("TCC2", "THU", 11)],
            "D2": [mk("D2", "MON", 9), mk("D2", "THU", 7)],
            "TD2": [mk("TD2", "WED", 10)],
            "TDD2": [mk("TDD2", "FRI", 11)],
            "E2": [mk("E2", "TUE", 9), mk("E2", "FRI", 7)],
            "TE2": [mk("TE2", "THU", 10)],
            "TEE2": [mk("TEE2", "TUE", 10)],
            "F2": [mk("F2", "MON", 8), mk("F2", "WED", 9)],
            "TF2": [mk("TF2", "FRI", 10)],
            "TFF2": [mk("TFF2", "THU", 11)],
            "G2": [mk("G2", "TUE", 8), mk("G2", "THU", 9)],
            "TG2": [mk("TG2", "MON", 11)],
            "TGG2": [mk("TGG2", "WED", 11)],
            "V1": [mk("V1", "WED", 4)],
            "V2": [mk("V2", "WED", 5)],
            "V3": [mk("V3", "MON", 12)],
            "V4": [mk("V4", "TUE", 12)],
            "V5": [mk("V5", "WED", 12)],
            "V6": [mk("V6", "THU", 12)],
            "V7": [mk("V7", "FRI", 12)],
        }
    else:
        mapping = {
            "A1": [mk("A1", "MON", 1), mk("A1", "WED", 2)],
            "TA1": [mk("TA1", "FRI", 3)],
            "TAA1": [mk("TAA1", "TUE", 5)],
            "B1": [mk("B1", "TUE", 1), mk("B1", "THU", 2)],
            "TB1": [mk("TB1", "MON", 4)],
            "TBB1": [mk("TBB1", "WED", 5)],
            "C1": [mk("C1", "WED", 1), mk("C1", "FRI", 2)],
            "TC1": [mk("TC1", "TUE", 4)],
            "TCC1": [mk("TCC1", "THU", 5)],
            "D1": [mk("D1", "MON", 3), mk("D1", "THU", 1)],
            "TD1": [mk("TD1", "WED", 4)],
            "TDD1": [mk("TDD1", "FRI", 5)],
            "E1": [mk("E1", "TUE", 3), mk("E1", "FRI", 1)],
            "TE1": [mk("TE1", "THU", 4)],
            "F1": [mk("F1", "MON", 2), mk("F1", "WED", 3)],
            "TF1": [mk("TF1", "FRI", 4)],
            "G1": [mk("G1", "TUE", 2), mk("G1", "THU", 3)],
            "TG1": [mk("TG1", "MON", 5)],
            "A2": [mk("A2", "MON", 7), mk("A2", "WED", 8)],
            "TA2": [mk("TA2", "FRI", 9)],
            "TAA2": [mk("TAA2", "TUE", 11)],
            "B2": [mk("B2", "TUE", 7), mk("B2", "THU", 8)],
            "TB2": [mk("TB2", "MON", 10)],
            "TBB2": [mk("TBB2", "WED", 11)],
            "C2": [mk("C2", "WED", 7), mk("C2", "FRI", 8)],
            "TC2": [mk("TC2", "TUE", 10)],
            "TCC2": [mk("TCC2", "THU", 11)],
            "D2": [mk("D2", "MON", 9), mk("D2", "THU", 7)],
            "TD2": [mk("TD2", "WED", 10)],
            "TDD2": [mk("TDD2", "FRI", 11)],
            "E2": [mk("E2", "TUE", 9), mk("E2", "FRI", 7)],
            "TE2": [mk("TE2", "THU", 10)],
            "F2": [mk("F2", "MON", 8), mk("F2", "WED", 9)],
            "TF2": [mk("TF2", "FRI", 10)],
            "G2": [mk("G2", "TUE", 8), mk("G2", "THU", 9)],
            "TG2": [mk("TG2", "MON", 11)],
            "S1": [mk("S1", "TUE", 12)],
            "S2": [mk("S2", "THU", 12)],
            "S3": [mk("S3", "MON", 12)],
            "S4": [mk("S4", "WED", 12)],
            "S11": [mk("S11", "MON", 6)],
            "S15": [mk("S15", "FRI", 6)],
        }

    # Add L1..L60 Lab slots across MON..FRI
    weekdays = ["MON", "TUE", "WED", "THU", "FRI"]
    for d_idx, day in enumerate(weekdays):
        for p in range(1, 7):
            lab_num = d_idx * 6 + p
            code = f"L{lab_num}"
            mapping[code] = [mk(code, day, p, is_lab=True)]
        for p in range(7, 13):
            lab_num = 30 + d_idx * 6 + (p - 6)
            code = f"L{lab_num}"
            mapping[code] = [mk(code, day, p, is_lab=True)]

    return mapping


def seed_slot_mappings_if_empty(db: Session) -> None:
    existing = db.query(SlotMappingModel).count()
    if existing > 0:
        return
    for campus in ("vellore", "chennai"):
        default_map = build_default_slot_mappings(campus)
        for _, occ_list in default_map.items():
            for occ in occ_list:
                db.add(SlotMappingModel(**occ))
    db.commit()


def load_active_slot_map(db: Optional[Session] = None, campus: str = "vellore") -> Dict[str, List[SlotOccurrence]]:
    campus_key = "chennai" if "chennai" in campus.lower() else "vellore"
    if db is not None:
        rows = db.query(SlotMappingModel).filter(SlotMappingModel.campus == campus_key).all()
        if rows:
            result: Dict[str, List[SlotOccurrence]] = {}
            for r in rows:
                result.setdefault(r.slot_code.upper(), []).append(
                    SlotOccurrence(
                        slot_code=r.slot_code.upper(),
                        day=r.day.upper(),
                        period=r.period,
                        start_time=r.start_time,
                        end_time=r.end_time,
                        slot_category=r.slot_category,
                        session=r.session,
                        source=r.source,
                        is_custom=r.is_custom,
                    )
                )
            return result

    default_raw = build_default_slot_mappings(campus_key)
    return {
        k: [SlotOccurrence(**occ) for occ in v]
        for k, v in default_raw.items()
    }


def parse_slot_string(
    raw_slot_string: str,
    slot_map: Optional[Dict[str, List[SlotOccurrence]]] = None,
    campus: str = "vellore",
) -> ParsedSlotResult:
    """
    Parses a raw VIT slot string (e.g. 'B1+TB1', 'L41+L42+L49+L50', 'G1/G2', 'ANY SLOT', 'OC', 'NIL')
    into structured tokens, occurrences, and verification status.
    Never guesses day/time if a slot is ambiguous or missing from slot_map.
    """
    if slot_map is None:
        slot_map = load_active_slot_map(None, campus)

    preserved_raw = raw_slot_string if raw_slot_string is not None else ""
    cleaned = preserved_raw.strip()

    if not cleaned or cleaned.upper() in ("NIL", "OC", "NONE"):
        online_toks = [cleaned.upper()] if cleaned else []
        return ParsedSlotResult(
            raw_slot_string=preserved_raw,
            tokens=online_toks,
            theory_tokens=[],
            tutorial_tokens=[],
            lab_tokens=[],
            online_tokens=online_toks,
            unresolved_tokens=[],
            occurrences=[],
            status="ONLINE",
            session_summary="Online",
            explanation="Online / Non-timetabled course (no physical slot required).",
        )

    # Check if the string contains slash choices (e.g. 'G1/G2') or wildcard ('ANY SLOT')
    raw_parts = [p.strip() for p in cleaned.split("+") if p.strip()]
    tokens: List[str] = []
    theory_tokens: List[str] = []
    tutorial_tokens: List[str] = []
    lab_tokens: List[str] = []
    online_tokens: List[str] = []
    unresolved_tokens: List[str] = []
    occurrences: List[SlotOccurrence] = []
    explanations: List[str] = []

    for part in raw_parts:
        u_part = part.upper()
        tokens.append(u_part)
        if "/" in u_part:
            unresolved_tokens.append(u_part)
            explanations.append(
                f"Ambiguous choice slot '{u_part}' lists multiple alternatives without a fixed selection."
            )
            continue
        if u_part in ("ANY SLOT", "ANY", "TBD", "TBA"):
            unresolved_tokens.append(u_part)
            explanations.append(
                f"Placeholder slot '{u_part}' has no concrete day/time assignment in the imported sheet."
            )
            continue
        if u_part in ("OC", "NIL"):
            online_tokens.append(u_part)
            continue

        mapped_occs = slot_map.get(u_part)
        cat = classify_slot_token(u_part)
        if not mapped_occs:
            unresolved_tokens.append(u_part)
            explanations.append(
                f"Slot identifier '{u_part}' is not present in the verified VIT timetable mapping."
            )
            continue

        if cat == "LAB":
            lab_tokens.append(u_part)
        elif cat == "TUTORIAL":
            tutorial_tokens.append(u_part)
        else:
            theory_tokens.append(u_part)

        occurrences.extend(mapped_occs)

    if unresolved_tokens:
        status = "UNRESOLVED"
    elif online_tokens and not occurrences:
        status = "ONLINE"
    else:
        status = "VERIFIED"

    sessions = {occ.session for occ in occurrences}
    if status == "UNRESOLVED":
        session_summary = "Unresolved"
    elif status == "ONLINE":
        session_summary = "Online"
    elif len(sessions) == 1:
        session_summary = next(iter(sessions))
    elif len(sessions) > 1:
        session_summary = "Mixed"
    else:
        session_summary = "Unresolved"

    return ParsedSlotResult(
        raw_slot_string=preserved_raw,
        tokens=tokens,
        theory_tokens=theory_tokens,
        tutorial_tokens=tutorial_tokens,
        lab_tokens=lab_tokens,
        online_tokens=online_tokens,
        unresolved_tokens=unresolved_tokens,
        occurrences=occurrences,
        status=status,
        session_summary=session_summary,
        explanation=" ".join(explanations) if explanations else None,
    )


def time_to_minutes(t_str: str) -> Optional[int]:
    if not t_str or ":" not in t_str:
        return None
    try:
        h, m = t_str.strip().split(":")
        return int(h) * 60 + int(m)
    except ValueError:
        return None


def occurrences_collide(
    occ_a: SlotOccurrence,
    occ_b: SlotOccurrence,
    allow_adjacent_lab_boundary: bool = True,
) -> Tuple[bool, Optional[str]]:
    """
    Determines whether two verified SlotOccurrences collide on the timetable.
    Uses verified day, period, and start/end time intervals as the source of truth.
    Supports the official VIT Vellore timetable rule where Period 4 Theory (11:00-11:50)
    and Period 5 Lab (L5/L11/L17/L23/L29: 11:40-12:30) or Period 10 Theory (17:00-17:50)
    and Period 11 Lab (L35/L41/L47/L53/L59: 17:40-18:30) are distinct periods and allowed
    together when allow_adjacent_lab_boundary=True.
    """
    if occ_a.day != occ_b.day:
        return False, None

    # Same day and same period is always a direct period collision in VIT timetable
    if occ_a.period == occ_b.period:
        return (
            True,
            f"{occ_a.day} Period {occ_a.period} ({occ_a.start_time}-{occ_a.end_time} vs {occ_b.start_time}-{occ_b.end_time})",
        )

    # Check underlying scheduled time intervals
    start_a = time_to_minutes(occ_a.start_time)
    end_a = time_to_minutes(occ_a.end_time)
    start_b = time_to_minutes(occ_b.start_time)
    end_b = time_to_minutes(occ_b.end_time)

    if start_a is None or end_a is None or start_b is None or end_b is None:
        return False, None

    # Overlap condition: max(start_a, start_b) < min(end_a, end_b)
    overlap_start = max(start_a, start_b)
    overlap_end = min(end_a, end_b)
    if overlap_start < overlap_end:
        overlap_mins = overlap_end - overlap_start
        # Check VIT Official Adjacent Period 4/5 (11:40-11:50) and Period 10/11 (17:40-17:50) exception
        if allow_adjacent_lab_boundary and overlap_mins <= 10 and abs(occ_a.period - occ_b.period) == 1:
            periods = {occ_a.period, occ_b.period}
            cats = {occ_a.slot_category, occ_b.slot_category}
            if periods in ({4, 5}, {10, 11}) and "LAB" in cats and cats != {"LAB"}:
                return False, None

        return (
            True,
            f"{occ_a.day} {occ_a.start_time}-{occ_a.end_time} overlaps {occ_b.start_time}-{occ_b.end_time}",
        )

    return False, None
