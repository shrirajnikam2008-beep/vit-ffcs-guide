"""
Pydantic schemas for request/response validation across VIT FFCS Guide API.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SlotOccurrence(BaseModel):
    slot_code: str
    day: str  # MON, TUE, WED, THU, FRI, SAT
    period: int
    start_time: str
    end_time: str
    slot_category: str  # THEORY, TUTORIAL, LAB
    session: str  # Morning, Evening
    source: str = "Official VIT Timetable"
    is_custom: bool = False


class ParsedSlotResult(BaseModel):
    raw_slot_string: str
    tokens: List[str]
    theory_tokens: List[str]
    tutorial_tokens: List[str]
    lab_tokens: List[str]
    online_tokens: List[str]
    unresolved_tokens: List[str]
    occurrences: List[SlotOccurrence]
    status: str  # VERIFIED, ONLINE, UNRESOLVED
    session_summary: str  # Morning, Evening, Mixed, Online, Unresolved
    explanation: Optional[str] = None


class FacultyReviewSchema(BaseModel):
    no8am_id: Optional[str] = None
    faculty_name: str
    normalized_name: str
    canonical_name: Optional[str] = None
    employee_id: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    email: Optional[str] = None
    photo_url: Optional[str] = None
    avg_rating: Optional[float] = None
    total_reviews: int = 0
    cart_count: int = 0
    search_count: int = 0
    campus: str = "vellore"
    source: str = "no8am.site"
    profile_url: Optional[str] = None
    verification_status: str = "VERIFIED"


class CourseSectionSchema(BaseModel):
    id: int
    course_code: str
    course_title: str
    faculty_name: str
    normalized_faculty_name: str
    slot_combination: str
    venue: str
    class_type: str  # theory, lab, tutorial, practical, online, other
    course_type_code: str  # ETH, ELA, OC, ETL
    batch: Optional[str] = None
    semester: str
    campus: str
    source_sheet: str
    source_row: int
    is_duplicate: bool = False
    is_anomaly: bool = False
    anomaly_note: Optional[str] = None
    is_active: bool = True
    verification_status: str = "VERIFIED"
    parsed_slot: Optional[ParsedSlotResult] = None
    faculty_review: Optional[FacultyReviewSchema] = None


class BatchPrescription(BaseModel):
    batch: str
    course_type: str
    lecture_slot: str
    lab_slot: str
    strength: Optional[int] = None


class CourseSchema(BaseModel):
    id: int
    course_code: str
    course_title: str
    semester: str
    campus: str
    curriculum_category: str
    credits: float
    course_type: str
    lecture_hours: int
    tutorial_hours: int
    practical_hours: int
    project_hours: int
    employee_school: Optional[str] = None
    prerequisites: Optional[str] = None
    theory_slots: List[str] = Field(default_factory=list)
    lab_slots: List[str] = Field(default_factory=list)
    batches: List[BatchPrescription] = Field(default_factory=list)
    verification_status: str = "VERIFIED"
    verification_note: Optional[str] = None
    source_sheet: Optional[str] = None
    source_row: Optional[int] = None
    sections: List[CourseSectionSchema] = Field(default_factory=list)


class ClashDetail(BaseModel):
    clash_id: str
    clash_type: str  # THEORY_VS_THEORY, THEORY_VS_LAB, LAB_VS_LAB, THEORY_VS_TUTORIAL, TUTORIAL_VS_TUTORIAL, COMBINED_SLOT_CLASH, DUPLICATE_COURSE_COMPONENT, INCOMPLETE_COMPONENT, CREDIT_LIMIT_VIOLATION, UNRESOLVED_SLOT_WARNING
    severity: str  # ERROR, WARNING
    is_confirmed: bool  # True for verified time overlap, False for possible clash from unresolved slots
    course_a_code: str
    course_a_title: str
    course_a_faculty: str
    course_a_section_id: Optional[int] = None
    course_a_slot: str
    course_a_venue: Optional[str] = None
    course_a_type: Optional[str] = None
    course_b_code: Optional[str] = None
    course_b_title: Optional[str] = None
    course_b_faculty: Optional[str] = None
    course_b_section_id: Optional[int] = None
    course_b_slot: Optional[str] = None
    course_b_venue: Optional[str] = None
    course_b_type: Optional[str] = None
    conflicting_slots: List[str] = Field(default_factory=list)
    day: Optional[str] = None
    time_interval: Optional[str] = None
    period: Optional[int] = None
    explanation: str
    suggested_alternatives: List[Dict[str, Any]] = Field(default_factory=list)


class ClashReportResponse(BaseModel):
    has_hard_clashes: bool
    confirmed_clash_count: int
    possible_clash_count: int
    warning_count: int
    total_credits: float
    min_credits: float
    target_credits: float
    max_credits: float
    clashes: List[ClashDetail]
    section_compatibility: Dict[int, Dict[str, Any]] = Field(default_factory=dict)


classClashCheckRequest = BaseModel


class ClashCheckRequest(BaseModel):
    selected_section_ids: List[int] = Field(default_factory=list)
    locked_section_ids: List[int] = Field(default_factory=list)
    mandatory_course_codes: List[str] = Field(default_factory=list)
    min_credits: float = 16.0
    target_credits: float = 21.0
    max_credits: float = 27.0
    campus: str = "vellore"
    allow_adjacent_lab_boundary: bool = True


class OptimizerRequest(BaseModel):
    required_course_codes: List[str] = Field(default_factory=list)
    locked_section_ids: List[int] = Field(default_factory=list)
    preferred_faculty: List[str] = Field(default_factory=list)
    avoided_faculty: List[str] = Field(default_factory=list)
    preferred_slots: List[str] = Field(default_factory=list)
    avoided_slots: List[str] = Field(default_factory=list)
    session_preference: str = "balanced"  # morning_theory, evening_theory, balanced
    avoid_8am: bool = True
    compact_schedule: bool = True
    fewer_campus_transitions: bool = True
    same_faculty_for_theory_lab: bool = False
    min_credits: float = 16.0
    target_credits: float = 21.0
    max_credits: float = 27.0
    campus: str = "vellore"
    allow_adjacent_lab_boundary: bool = True


class GeneratedTimetableOption(BaseModel):
    profile_id: str  # best_fit, compact, max_flexibility, alternative_1, etc.
    profile_name: str
    profile_badge: str
    total_score: float
    total_credits: float
    selected_section_ids: List[int]
    sections: List[CourseSectionSchema]
    reasons: List[str]
    daily_summary: Dict[str, int]
    gap_hours: int
    early_8am_count: int
    building_transitions: int
    avg_faculty_rating: Optional[float] = None
    flexibility_alternatives_count: int = 0
    unresolved_warnings: List[str] = Field(default_factory=list)


class OptimizerResponse(BaseModel):
    success: bool
    message: str
    recommendations: List[GeneratedTimetableOption] = Field(default_factory=list)
    conflicting_constraints: List[str] = Field(default_factory=list)
    suggested_relaxations: List[str] = Field(default_factory=list)


class AssistantQueryRequest(BaseModel):
    question: str
    selected_section_ids: List[int] = Field(default_factory=list)
    locked_section_ids: List[int] = Field(default_factory=list)
    campus: str = "vellore"


class AssistantQueryResponse(BaseModel):
    question: str
    answer_markdown: str
    referenced_courses: List[str] = Field(default_factory=list)
    recommended_section_ids: List[int] = Field(default_factory=list)
    data_basis: str = "Verified Imported Course Database & Official VIT Slot Engine"
