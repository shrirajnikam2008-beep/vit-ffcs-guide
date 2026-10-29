import {
  ClashReport,
  Course,
  CourseSection,
  FacultyComparisonItem,
  ImportReport,
  OptimizerResponse,
  PeriodHeader,
  SlotOccurrence,
  TimetableDraft,
} from '../types/ffcs';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export interface BootstrapResponse {
  semester: string;
  campus: string;
  courses: Course[];
  all_sections: CourseSection[];
  slot_map: Record<string, SlotOccurrence[]>;
  period_headers: PeriodHeader[];
  import_report: ImportReport | null;
  drafts: TimetableDraft[];
}

export async function fetchBootstrap(campus = 'vellore'): Promise<BootstrapResponse> {
  const res = await fetch(`${API_BASE}/api/bootstrap?campus=${encodeURIComponent(campus)}&include_audit_rows=true`);
  if (!res.ok) throw new Error('Failed to load FFCS bootstrap data');
  return res.json();
}

export async function evaluateClashes(payload: {
  selected_section_ids: number[];
  locked_section_ids: number[];
  mandatory_course_codes: string[];
  min_credits: number;
  target_credits: number;
  max_credits: number;
  campus: string;
  allow_adjacent_lab_boundary: boolean;
}): Promise<ClashReport> {
  const res = await fetch(`${API_BASE}/api/clashes/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to evaluate clashes');
  return res.json();
}

export async function fetchFacultyComparison(
  courseCode: string,
  payload: {
    selected_section_ids: number[];
    locked_section_ids: number[];
    preferred_faculty: string[];
    avoided_faculty: string[];
    preferred_slots: string[];
    avoided_slots: string[];
    session_preference: string;
    campus: string;
    allow_adjacent_lab_boundary: boolean;
  }
): Promise<{ course_code: string; comparisons: FacultyComparisonItem[] }> {
  const res = await fetch(`${API_BASE}/api/recommendations/faculty/${encodeURIComponent(courseCode)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to compare faculty options');
  return res.json();
}

export async function generateOptimizedTimetables(payload: {
  required_course_codes: string[];
  locked_section_ids: number[];
  preferred_faculty: string[];
  avoided_faculty: string[];
  preferred_slots: string[];
  avoided_slots: string[];
  session_preference: string;
  avoid_8am: boolean;
  compact_schedule: boolean;
  fewer_campus_transitions: boolean;
  same_faculty_for_theory_lab: boolean;
  min_credits: number;
  target_credits: number;
  max_credits: number;
  campus: string;
  allow_adjacent_lab_boundary: boolean;
}): Promise<OptimizerResponse> {
  const res = await fetch(`${API_BASE}/api/optimizer/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to generate optimized timetables');
  return res.json();
}

export async function queryPlanningAssistant(payload: {
  question: string;
  selected_section_ids: number[];
  locked_section_ids: number[];
  campus: string;
}): Promise<{
  question: string;
  answer_markdown: string;
  referenced_courses: string[];
  recommended_section_ids: number[];
  data_basis: string;
}> {
  const res = await fetch(`${API_BASE}/api/assistant/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Assistant query failed');
  return res.json();
}

export async function previewWorkbookImport(
  file: File,
  customMappings?: Record<string, Record<string, string>>
): Promise<any> {
  const fd = new FormData();
  fd.append('file', file);
  if (customMappings) {
    fd.append('custom_mappings_json', JSON.stringify(customMappings));
  }
  const res = await fetch(`${API_BASE}/api/import/preview`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Failed to preview workbook');
  return res.json();
}

export async function commitWorkbookImport(
  file: File,
  customMappings?: Record<string, Record<string, string>>,
  clearExisting = true
): Promise<any> {
  const fd = new FormData();
  fd.append('file', file);
  if (customMappings) {
    fd.append('custom_mappings_json', JSON.stringify(customMappings));
  }
  fd.append('clear_existing', String(clearExisting));
  const res = await fetch(`${API_BASE}/api/import/commit`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Failed to commit workbook import');
  return res.json();
}

export async function resetDefaultWorkbook(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/import/reset-default`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset default workbook');
  return res.json();
}

export async function addCustomSlotMapping(payload: {
  campus: string;
  slot_code: string;
  day: string;
  period: number;
  start_time: string;
  end_time: string;
  slot_category: string;
  session: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/api/slot-mappings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to add custom slot mapping');
  return res.json();
}

export async function resetSlotMappings(): Promise<any> {
  const res = await fetch(`${API_BASE}/api/slot-mappings/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset slot mappings');
  return res.json();
}

export async function updateSectionOffering(
  sectionId: number,
  patch: {
    faculty_name?: string;
    slot_combination?: string;
    venue?: string;
    course_type_code?: string;
    is_active?: boolean;
  }
): Promise<any> {
  const res = await fetch(`${API_BASE}/api/sections/${sectionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Failed to update section');
  return res.json();
}

export async function saveTimetableDraft(payload: {
  id?: number;
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
}): Promise<any> {
  const res = await fetch(`${API_BASE}/api/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to save draft');
  return res.json();
}

export async function deleteTimetableDraft(draftId: number): Promise<any> {
  const res = await fetch(`${API_BASE}/api/drafts/${draftId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete draft');
  return res.json();
}

export async function fetchSharedDraft(draftId: number): Promise<TimetableDraft> {
  const res = await fetch(`${API_BASE}/api/drafts/${draftId}`);
  if (!res.ok) throw new Error('Shared timetable draft not found');
  return res.json();
}

export async function compareTwoTimetables(payload: {
  student_a_name: string;
  student_b_name: string;
  student_a_section_ids: number[];
  student_b_section_ids: number[];
  campus: string;
}): Promise<{
  student_a_name: string;
  student_b_name: string;
  shared_sections: CourseSection[];
  same_course_different_section: Array<{
    course_code: string;
    course_title: string;
    course_type_code: string;
    student_a_section: CourseSection;
    student_b_section: CourseSection;
  }>;
  common_free_periods: Record<string, number[]>;
  schedule_conflicts: Array<{
    day: string;
    period: number;
    time_range: string;
    student_a_course: string;
    student_a_faculty: string;
    student_b_course: string;
    student_b_faculty: string;
  }>;
}> {
  const res = await fetch(`${API_BASE}/api/timetables/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to compare timetables');
  return res.json();
}

export async function syncNo8amReviews(campus = 'vellore'): Promise<any> {
  const res = await fetch(`${API_BASE}/api/no8am/sync?campus=${encodeURIComponent(campus)}`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to sync with no8am.site');
  return res.json();
}
