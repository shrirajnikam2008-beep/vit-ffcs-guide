export interface SlotOccurrence {
  slot_code: string;
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
  period: number;
  start_time: string;
  end_time: string;
  slot_category: 'THEORY' | 'TUTORIAL' | 'LAB';
  session: 'Morning' | 'Evening';
  source: string;
  is_custom: boolean;
}

export interface ParsedSlotResult {
  raw_slot_string: string;
  tokens: string[];
  theory_tokens: string[];
  tutorial_tokens: string[];
  lab_tokens: string[];
  online_tokens: string[];
  unresolved_tokens: string[];
  occurrences: SlotOccurrence[];
  status: 'VERIFIED' | 'ONLINE' | 'UNRESOLVED';
  session_summary: string;
  explanation?: string | null;
}

export interface FacultyReview {
  no8am_id?: string | null;
  faculty_name: string;
  normalized_name: string;
  canonical_name?: string | null;
  employee_id?: string | null;
  department?: string | null;
  designation?: string | null;
  email?: string | null;
  photo_url?: string | null;
  avg_rating?: number | null;
  total_reviews: number;
  cart_count: number;
  search_count: number;
  campus: string;
  source: string;
  profile_url?: string | null;
  verification_status: string;
}

export interface CourseSection {
  id: number;
  course_code: string;
  course_title: string;
  faculty_name: string;
  normalized_faculty_name: string;
  slot_combination: string;
  venue: string;
  class_type: string;
  course_type_code: 'ETH' | 'ELA' | 'OC' | 'ETL' | string;
  batch?: string | null;
  semester: string;
  campus: string;
  source_sheet: string;
  source_row: number;
  is_duplicate: boolean;
  is_anomaly: boolean;
  anomaly_note?: string | null;
  is_active: boolean;
  verification_status: 'VERIFIED' | 'INFERRED' | 'UNRESOLVED' | string;
  parsed_slot?: ParsedSlotResult | null;
  faculty_review?: FacultyReview | null;
}

export interface BatchPrescription {
  batch: string;
  course_type: string;
  lecture_slot: string;
  lab_slot: string;
  strength?: number | null;
}

export interface Course {
  id: number;
  course_code: string;
  course_title: string;
  semester: string;
  campus: string;
  curriculum_category: string;
  credits: number;
  course_type: string;
  lecture_hours: number;
  tutorial_hours: number;
  practical_hours: number;
  project_hours: number;
  employee_school?: string | null;
  prerequisites?: string | null;
  theory_slots: string[];
  lab_slots: string[];
  batches: BatchPrescription[];
  verification_status: 'VERIFIED' | 'INFERRED' | 'MISSING_DATA' | string;
  verification_note?: string | null;
  source_sheet?: string | null;
  source_row?: number | null;
  sections: CourseSection[];
}

export interface SuggestedAlternative {
  section_id: number;
  course_code: string;
  faculty_name: string;
  slot_combination: string;
  venue: string;
  course_type_code: string;
  avg_rating?: number | null;
}

export interface ClashDetail {
  clash_id: string;
  clash_type: string;
  severity: 'ERROR' | 'WARNING';
  is_confirmed: boolean;
  course_a_code: string;
  course_a_title: string;
  course_a_faculty: string;
  course_a_section_id?: number | null;
  course_a_slot: string;
  course_a_venue?: string | null;
  course_a_type?: string | null;
  course_b_code?: string | null;
  course_b_title?: string | null;
  course_b_faculty?: string | null;
  course_b_section_id?: number | null;
  course_b_slot?: string | null;
  course_b_venue?: string | null;
  course_b_type?: string | null;
  conflicting_slots: string[];
  day?: string | null;
  time_interval?: string | null;
  period?: number | null;
  explanation: string;
  suggested_alternatives: SuggestedAlternative[];
}

export interface SectionCompatibilityInfo {
  section_id: number;
  is_selected: boolean;
  is_locked: boolean;
  status: 'COMPATIBLE' | 'CLASH' | 'CLASH_LOCKED' | 'UNRESOLVED';
  compatible: boolean;
  conflicts_with: string[];
}

export interface ClashReport {
  has_hard_clashes: boolean;
  confirmed_clash_count: number;
  possible_clash_count: number;
  warning_count: number;
  total_credits: number;
  min_credits: number;
  target_credits: number;
  max_credits: number;
  clashes: ClashDetail[];
  section_compatibility: Record<number, SectionCompatibilityInfo>;
}

export interface PeriodHeader {
  period: number;
  label: string;
  theory_time: string;
  lab_time: string;
  session: 'Morning' | 'Evening';
}

export interface GeneratedTimetableOption {
  profile_id: string;
  profile_name: string;
  profile_badge: string;
  total_score: number;
  total_credits: number;
  selected_section_ids: number[];
  sections: CourseSection[];
  reasons: string[];
  daily_summary: Record<string, number>;
  gap_hours: number;
  early_8am_count: number;
  building_transitions: number;
  avg_faculty_rating?: number | null;
  flexibility_alternatives_count: number;
  unresolved_warnings: string[];
}

export interface OptimizerResponse {
  success: boolean;
  message: string;
  recommendations: GeneratedTimetableOption[];
  conflicting_constraints: string[];
  suggested_relaxations: string[];
}

export interface FacultyComparisonItem {
  section_id: number;
  course_code: string;
  faculty_name: string;
  slot_combination: string;
  venue: string;
  building: string;
  course_type_code: string;
  class_type: string;
  session: string;
  has_8am: boolean;
  is_compatible: boolean;
  clashes_locked: boolean;
  conflicts_with: string[];
  compatible_complement_count: number;
  same_faculty_complement_ids: number[];
  completes_missing_component: boolean;
  is_preferred_faculty: boolean;
  is_avoided_faculty: boolean;
  faculty_review?: FacultyReview | null;
  score: number;
  recommendation_reason: string;
}

export interface ImportIssue {
  severity: 'INFO' | 'WARNING' | 'ERROR';
  type: string;
  sheet: string;
  row: number;
  message: string;
}

export interface ImportReport {
  id: number;
  filename: string;
  imported_at: string;
  sheets_detected: string[];
  total_rows_read: number;
  courses_imported: number;
  sections_imported: number;
  duplicates_detected: number;
  anomalies_detected: number;
  missing_fields_count: number;
  issues: ImportIssue[];
  raw_preview: Array<{
    sheet_name: string;
    kind: string;
    row_count: number;
    columns: string[];
    detected_mapping: Record<string, string>;
    sample_rows: Array<Record<string, any>>;
  }>;
}

export interface TimetableDraft {
  id: number;
  name: string;
  semester: string;
  campus: string;
  programme: string;
  curriculum: string;
  min_credits: number;
  target_credits: number;
  max_credits: number;
  selected_section_ids: number[];
  locked_section_ids: number[];
  required_course_codes: string[];
  preferred_faculty: string[];
  avoided_faculty: string[];
  preferred_slots: string[];
  avoided_slots: string[];
  preferences: Record<string, any>;
  updated_at: string;
}
