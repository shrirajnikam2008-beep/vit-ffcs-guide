import {
  Course,
  CourseSection,
  FacultyComparisonItem,
  SlotOccurrence,
} from '../types/ffcs';

/**
 * Single configurable afternoon threshold (in 24h HH:MM format and minutes from midnight).
 * Official VIT morning sessions run from 08:00 to 13:50 (Theory) / 13:20 (Lab).
 * Afternoon / Evening sessions begin at 14:00 (Period 7).
 */
export const AFTERNOON_THRESHOLD_TIME = '14:00';
export const AFTERNOON_THRESHOLD_MINUTES = 14 * 60; // 840 minutes (14:00)

export type SlotClassificationCategory =
  | 'Morning Theory'
  | 'Evening Theory'
  | 'Lab / Practical'
  | 'Mixed / Other'
  | 'Unclassified';

export type FacultySlotFilterKey = 'all' | 'morning' | 'evening' | 'labs' | 'mixed';

export type SchedulePreference = 'none' | 'morning' | 'evening';

export type RecommendationBadgeLabel =
  | 'Best Morning Fit'
  | 'Best Evening Fit'
  | 'No Clash'
  | 'Mixed Schedule'
  | 'Time Unverified'
  | 'Clash';

export interface TeachingPeriodInfo {
  slotCode: string;
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
  dayFull: string;
  period: number;
  startTime: string;
  endTime: string;
  slotCategory: 'THEORY' | 'TUTORIAL' | 'LAB';
  session: 'Morning' | 'Evening';
}

export interface SlotClassificationResult {
  rawSlot: string;
  normalizedTokens: string[];
  category: SlotClassificationCategory;
  shortLabel:
    | 'Morning Theory'
    | 'Evening Theory'
    | 'Morning Lab'
    | 'Evening Lab'
    | 'Mixed Lab'
    | 'Mixed / Other'
    | 'Time Unverified';
  session: 'Morning' | 'Evening' | 'Mixed' | 'Unknown';
  isVerified: boolean;
  hasTheory: boolean;
  hasLab: boolean;
  unresolvedTokens: string[];
  teachingPeriods: TeachingPeriodInfo[];
}

export interface FacultyCourseOfferingSummary {
  sectionId: number;
  courseCode: string;
  courseTitle: string;
  courseTypeCode: string;
  slotCombination: string;
  venue: string;
  classification: SlotClassificationResult;
}

export interface FacultyTeachingScheduleSummary {
  facultyName: string;
  normalizedFacultyName: string;
  semester: string;
  selectedCourseSections: FacultyCourseOfferingSummary[];
  otherCourseOfferings: FacultyCourseOfferingSummary[];
  isPartialDataset: boolean;
  disclaimer: string;
}

const DAY_FULL_NAMES: Record<string, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
};

const DAY_SORT_ORDER: Record<string, number> = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
};

/**
 * Converts a 24-hour "HH:MM" time string to minutes from midnight.
 * Returns null if the format is invalid.
 */
export function parseTimeToMinutes(timeStr: string | undefined | null): number | null {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
    return null;
  }
  const parts = timeStr.trim().split(':');
  if (parts.length !== 2) return null;
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

/**
 * Normalizes a raw slot token (trims whitespace, converts to uppercase).
 */
export function normalizeSlotToken(token: string): string {
  return (token || '').trim().toUpperCase();
}

/**
 * Normalizes and splits a combined slot string (e.g. "B1 + TB1", "L37+L38+L43+L44")
 * into unique, ordered uppercase tokens.
 */
export function parseNormalizedSlotTokens(slotCombination: string): string[] {
  if (!slotCombination || typeof slotCombination !== 'string') return [];
  const rawParts = slotCombination
    .split('+')
    .map((part) => normalizeSlotToken(part))
    .filter(Boolean);

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const part of rawParts) {
    if (!seen.has(part)) {
      seen.add(part);
      unique.push(part);
    }
  }
  return unique;
}

/**
 * Normalizes faculty names for matching across sections and courses.
 */
export function normalizeFacultyIdentifier(name: string): string {
  return (name || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

/**
 * Determines whether a single verified SlotOccurrence falls in the Morning or Evening
 * by checking its actual mapped start_time against AFTERNOON_THRESHOLD_MINUTES.
 * Never guesses from the trailing digit of the slot code.
 */
export function getOccurrenceSessionFromTime(
  occ: SlotOccurrence,
  afternoonThresholdMinutes: number = AFTERNOON_THRESHOLD_MINUTES
): 'Morning' | 'Evening' | null {
  const startMins = parseTimeToMinutes(occ.start_time);
  if (startMins === null) return null;
  return startMins < afternoonThresholdMinutes ? 'Morning' : 'Evening';
}

/**
 * Validates that a SlotOccurrence has a verified day, period, start_time, and end_time.
 */
export function isValidMappedOccurrence(occ: SlotOccurrence | undefined | null): occ is SlotOccurrence {
  if (!occ) return false;
  if (!DAY_FULL_NAMES[occ.day]) return false;
  if (typeof occ.period !== 'number' || occ.period < 1 || occ.period > 12) return false;
  const start = parseTimeToMinutes(occ.start_time);
  const end = parseTimeToMinutes(occ.end_time);
  if (start === null || end === null || end <= start) return false;
  return true;
}

/**
 * Returns deduplicated, chronologically sorted verified teaching periods for a single slot or combined slot string
 * using the authoritative VIT slot timetable mapping.
 */
export function getSlotTeachingPeriods(
  slotOrCombination: string,
  slotMap: Record<string, SlotOccurrence[]>,
  afternoonThresholdMinutes: number = AFTERNOON_THRESHOLD_MINUTES
): {
  periods: TeachingPeriodInfo[];
  unresolvedTokens: string[];
  isComplete: boolean;
} {
  const tokens = parseNormalizedSlotTokens(slotOrCombination);
  if (tokens.length === 0) {
    return { periods: [], unresolvedTokens: [], isComplete: false };
  }

  const unresolvedTokens: string[] = [];
  const periodMap = new Map<string, TeachingPeriodInfo>();

  for (const token of tokens) {
    // Reject ambiguous slash slots or placeholders
    if (
      token.includes('/') ||
      token.includes(' ') ||
      token === 'ANY' ||
      token === 'ANY SLOT' ||
      token === 'TBD' ||
      token === 'TBA' ||
      token === 'OC' ||
      token === 'NIL' ||
      token === 'NONE'
    ) {
      unresolvedTokens.push(token);
      continue;
    }

    const mappedOccurrences = slotMap[token];
    if (!mappedOccurrences || mappedOccurrences.length === 0) {
      unresolvedTokens.push(token);
      continue;
    }

    for (const occ of mappedOccurrences) {
      if (!isValidMappedOccurrence(occ)) {
        unresolvedTokens.push(token);
        continue;
      }
      const session = getOccurrenceSessionFromTime(occ, afternoonThresholdMinutes);
      if (!session) {
        unresolvedTokens.push(token);
        continue;
      }

      const dedupeKey = `${occ.day}_${occ.period}_${occ.start_time}_${occ.end_time}_${occ.slot_category}`;
      if (!periodMap.has(dedupeKey)) {
        periodMap.set(dedupeKey, {
          slotCode: occ.slot_code || token,
          day: occ.day,
          dayFull: DAY_FULL_NAMES[occ.day] || occ.day,
          period: occ.period,
          startTime: occ.start_time,
          endTime: occ.end_time,
          slotCategory: occ.slot_category,
          session,
        });
      }
    }
  }

  const sortedPeriods = Array.from(periodMap.values()).sort((a, b) => {
    const dayDiff = (DAY_SORT_ORDER[a.day] || 99) - (DAY_SORT_ORDER[b.day] || 99);
    if (dayDiff !== 0) return dayDiff;
    const startA = parseTimeToMinutes(a.startTime) ?? 0;
    const startB = parseTimeToMinutes(b.startTime) ?? 0;
    if (startA !== startB) return startA - startB;
    return a.period - b.period;
  });

  const isComplete = unresolvedTokens.length === 0 && sortedPeriods.length > 0;
  return {
    periods: sortedPeriods,
    unresolvedTokens,
    isComplete,
  };
}

/**
 * Classifies a single slot identifier (e.g., "A1", "A2", "L1", "TB1", "V3")
 * strictly using the authoritative VIT slot timetable mapping.
 */
export function classifySlot(
  slot: string,
  slotMap: Record<string, SlotOccurrence[]>,
  afternoonThresholdMinutes: number = AFTERNOON_THRESHOLD_MINUTES
): SlotClassificationResult {
  const normalized = normalizeSlotToken(slot);
  if (!normalized || normalized.includes('+')) {
    return classifyCombinedSlot(slot, slotMap, undefined, afternoonThresholdMinutes);
  }
  return classifyCombinedSlot(normalized, slotMap, undefined, afternoonThresholdMinutes);
}

/**
 * Classifies any single or combined slot string (e.g., "A1+TA1", "B2+TB2", "L37+L38", "A1+A2", "G1/G2")
 * into:
 * - 'Morning Theory'
 * - 'Evening Theory'
 * - 'Lab / Practical'
 * - 'Mixed / Other'
 * - 'Unclassified'
 *
 * Uses the official VIT slot timetable (`slotMap`) as the sole source of truth.
 */
export function classifyCombinedSlot(
  slotCombination: string,
  slotMap: Record<string, SlotOccurrence[]>,
  courseTypeCode?: string,
  afternoonThresholdMinutes: number = AFTERNOON_THRESHOLD_MINUTES
): SlotClassificationResult {
  const tokens = parseNormalizedSlotTokens(slotCombination);
  if (tokens.length === 0) {
    return {
      rawSlot: slotCombination || '',
      normalizedTokens: [],
      category: 'Unclassified',
      shortLabel: 'Time Unverified',
      session: 'Unknown',
      isVerified: false,
      hasTheory: false,
      hasLab: false,
      unresolvedTokens: [],
      teachingPeriods: [],
    };
  }

  const { periods, unresolvedTokens, isComplete } = getSlotTeachingPeriods(
    slotCombination,
    slotMap,
    afternoonThresholdMinutes
  );

  if (!isComplete || periods.length === 0) {
    return {
      rawSlot: slotCombination,
      normalizedTokens: tokens,
      category: 'Unclassified',
      shortLabel: 'Time Unverified',
      session: 'Unknown',
      isVerified: false,
      hasTheory: false,
      hasLab: false,
      unresolvedTokens: unresolvedTokens.length > 0 ? unresolvedTokens : tokens,
      teachingPeriods: periods,
    };
  }

  const hasLab = periods.some((p) => p.slotCategory === 'LAB');
  const hasTheory = periods.some(
    (p) => p.slotCategory === 'THEORY' || p.slotCategory === 'TUTORIAL'
  );
  const hasMorning = periods.some((p) => p.session === 'Morning');
  const hasEvening = periods.some((p) => p.session === 'Evening');

  const session: 'Morning' | 'Evening' | 'Mixed' =
    hasMorning && hasEvening ? 'Mixed' : hasMorning ? 'Morning' : 'Evening';

  const normalizedCourseType = (courseTypeCode || '').trim().toUpperCase();

  // Case 1: Combined Theory + Lab in the same slot string -> Mixed / Other
  if (hasTheory && hasLab) {
    return {
      rawSlot: slotCombination,
      normalizedTokens: tokens,
      category: 'Mixed / Other',
      shortLabel: 'Mixed / Other',
      session,
      isVerified: true,
      hasTheory: true,
      hasLab: true,
      unresolvedTokens: [],
      teachingPeriods: periods,
    };
  }

  // Case 2: Pure Lab / Practical slots (e.g. L1+L2, L37+L38+L43+L44)
  if (hasLab || normalizedCourseType === 'ELA' || normalizedCourseType === 'LAB') {
    const shortLabel =
      session === 'Morning'
        ? 'Morning Lab'
        : session === 'Evening'
        ? 'Evening Lab'
        : 'Mixed Lab';
    return {
      rawSlot: slotCombination,
      normalizedTokens: tokens,
      category: 'Lab / Practical',
      shortLabel,
      session,
      isVerified: true,
      hasTheory: false,
      hasLab: true,
      unresolvedTokens: [],
      teachingPeriods: periods,
    };
  }

  // Case 3: Theory / Tutorial slots with both Morning and Evening occurrences (e.g. A1+A2) -> Mixed / Other
  if (session === 'Mixed') {
    return {
      rawSlot: slotCombination,
      normalizedTokens: tokens,
      category: 'Mixed / Other',
      shortLabel: 'Mixed / Other',
      session: 'Mixed',
      isVerified: true,
      hasTheory: true,
      hasLab: false,
      unresolvedTokens: [],
      teachingPeriods: periods,
    };
  }

  // Case 4: Verified Morning Theory
  if (session === 'Morning') {
    return {
      rawSlot: slotCombination,
      normalizedTokens: tokens,
      category: 'Morning Theory',
      shortLabel: 'Morning Theory',
      session: 'Morning',
      isVerified: true,
      hasTheory: true,
      hasLab: false,
      unresolvedTokens: [],
      teachingPeriods: periods,
    };
  }

  // Case 5: Verified Evening Theory
  return {
    rawSlot: slotCombination,
    normalizedTokens: tokens,
    category: 'Evening Theory',
    shortLabel: 'Evening Theory',
    session: 'Evening',
    isVerified: true,
    hasTheory: true,
    hasLab: false,
    unresolvedTokens: [],
    teachingPeriods: periods,
  };
}

/**
 * Builds the verified teaching schedule for a faculty member across the imported dataset,
 * separating:
 * 1. The currently selected course's available sections taught by this faculty.
 * 2. Other course offerings in the imported catalog taught by the same faculty.
 *
 * Never claims or infers that a teacher is free during unlisted periods.
 */
export function getFacultyTeachingSchedule(
  facultyName: string,
  activeCourseCode: string,
  courses: Course[],
  slotMap: Record<string, SlotOccurrence[]>,
  semester: string = 'Winter Semester 2026–27'
): FacultyTeachingScheduleSummary {
  const targetNorm = normalizeFacultyIdentifier(facultyName);
  const selectedCourseSections: FacultyCourseOfferingSummary[] = [];
  const otherCourseOfferings: FacultyCourseOfferingSummary[] = [];

  for (const course of courses) {
    for (const sec of course.sections) {
      if (!sec.is_active) continue;
      const secNorm = normalizeFacultyIdentifier(
        sec.normalized_faculty_name || sec.faculty_name
      );
      if (secNorm !== targetNorm) continue;

      const classification = classifyCombinedSlot(
        sec.slot_combination,
        slotMap,
        sec.course_type_code
      );

      const entry: FacultyCourseOfferingSummary = {
        sectionId: sec.id,
        courseCode: sec.course_code,
        courseTitle: sec.course_title || course.course_title,
        courseTypeCode: sec.course_type_code,
        slotCombination: sec.slot_combination,
        venue: sec.venue,
        classification,
      };

      if (sec.course_code.toUpperCase() === (activeCourseCode || '').toUpperCase()) {
        selectedCourseSections.push(entry);
      } else {
        otherCourseOfferings.push(entry);
      }
    }
  }

  const hasUnverified = [...selectedCourseSections, ...otherCourseOfferings].some(
    (item) => !item.classification.isVerified
  );

  return {
    facultyName,
    normalizedFacultyName: targetNorm,
    semester,
    selectedCourseSections,
    otherCourseOfferings,
    isPartialDataset: true || hasUnverified,
    disclaimer:
      'Partial schedule based only on imported course offerings. Unlisted periods do not imply personal availability.',
  };
}

/**
 * Checks whether a classified section matches one of the 5 segmented filter buttons:
 * [ All ] [ Morning ] [ Evening ] [ Labs ] [ Mixed ]
 */
export function matchesFacultySlotFilter(
  classification: SlotClassificationResult,
  filterKey: FacultySlotFilterKey
): boolean {
  switch (filterKey) {
    case 'all':
      return true;
    case 'morning':
      return classification.category === 'Morning Theory';
    case 'evening':
      return classification.category === 'Evening Theory';
    case 'labs':
      return classification.category === 'Lab / Practical';
    case 'mixed':
      return (
        classification.category === 'Mixed / Other' ||
        classification.category === 'Unclassified'
      );
    default:
      return true;
  }
}

/**
 * Filters a list of faculty/section options by the selected Morning/Evening/Lab/Mixed category filter.
 */
export function filterFacultyOptions<T>(
  options: T[],
  filterKey: FacultySlotFilterKey,
  getClassification: (option: T) => SlotClassificationResult
): T[] {
  if (filterKey === 'all') return options;
  return options.filter((opt) => matchesFacultySlotFilter(getClassification(opt), filterKey));
}

/**
 * Computes exact option counts for each segmented filter button:
 * All | Morning | Evening | Labs | Mixed
 */
export function computeFacultyFilterCounts<T>(
  options: T[],
  getClassification: (option: T) => SlotClassificationResult
): Record<FacultySlotFilterKey, number> {
  const counts: Record<FacultySlotFilterKey, number> = {
    all: options.length,
    morning: 0,
    evening: 0,
    labs: 0,
    mixed: 0,
  };

  for (const opt of options) {
    const cls = getClassification(opt);
    if (cls.category === 'Morning Theory') {
      counts.morning += 1;
    } else if (cls.category === 'Evening Theory') {
      counts.evening += 1;
    } else if (cls.category === 'Lab / Practical') {
      counts.labs += 1;
    } else {
      counts.mixed += 1;
    }
  }

  return counts;
}

/**
 * Determines the recommendation label for a faculty/section option based on:
 * 1. Clash status (if clashing, never recommend as a valid selection)
 * 2. Slot verification status
 * 3. User's Morning/Evening schedule preference
 */
export function getOptionRecommendationBadge(
  isCompatible: boolean,
  classification: SlotClassificationResult,
  preference: SchedulePreference
): RecommendationBadgeLabel {
  if (!classification.isVerified) {
    return 'Time Unverified';
  }
  if (!isCompatible) {
    return 'Clash';
  }
  if (classification.category === 'Mixed / Other' || classification.session === 'Mixed') {
    return 'Mixed Schedule';
  }

  if (preference === 'morning') {
    if (
      classification.category === 'Morning Theory' ||
      (classification.category === 'Lab / Practical' && classification.session === 'Morning')
    ) {
      return 'Best Morning Fit';
    }
  } else if (preference === 'evening') {
    if (
      classification.category === 'Evening Theory' ||
      (classification.category === 'Lab / Practical' && classification.session === 'Evening')
    ) {
      return 'Best Evening Fit';
    }
  }

  return 'No Clash';
}

export interface RankedFacultyOption {
  item: FacultyComparisonItem;
  section: CourseSection;
  classification: SlotClassificationResult;
  recommendationLabel: RecommendationBadgeLabel;
  preferenceMatched: boolean;
  rankScore: number;
}

/**
 * Ranks faculty/section options according to the user's schedule preference without removing any options:
 * Priority 1: No timetable clashes (`is_compatible === true` and verified mapping)
 * Priority 2: Match with the selected Morning / Evening preference
 * Priority 3: Complete and verified slot mapping
 * Priority 4: Existing teacher review rating (if available) & base compatibility score
 */
export function rankFacultyOptions(
  items: FacultyComparisonItem[],
  sectionMap: Map<number, CourseSection>,
  slotMap: Record<string, SlotOccurrence[]>,
  preference: SchedulePreference
): RankedFacultyOption[] {
  const enriched: RankedFacultyOption[] = [];

  for (const item of items) {
    const section = sectionMap.get(item.section_id);
    if (!section) continue;

    const classification = classifyCombinedSlot(
      item.slot_combination,
      slotMap,
      item.course_type_code
    );

    const isClashFreeAndVerified = item.is_compatible && classification.isVerified;

    const matchesMorning =
      classification.category === 'Morning Theory' ||
      (classification.category === 'Lab / Practical' && classification.session === 'Morning');
    const matchesEvening =
      classification.category === 'Evening Theory' ||
      (classification.category === 'Lab / Practical' && classification.session === 'Evening');

    const preferenceMatched =
      preference === 'morning'
        ? matchesMorning
        : preference === 'evening'
        ? matchesEvening
        : false;

    const recommendationLabel = getOptionRecommendationBadge(
      item.is_compatible,
      classification,
      preference
    );

    const revRating =
      item.faculty_review && item.faculty_review.total_reviews > 0
        ? item.faculty_review.avg_rating ?? 0
        : 0;

    let rankScore = item.score;
    if (isClashFreeAndVerified) {
      rankScore += 1000;
    }
    if (isClashFreeAndVerified && preferenceMatched) {
      rankScore += 300;
    }
    if (classification.isVerified) {
      rankScore += 100;
    }
    rankScore += revRating * 10;

    enriched.push({
      item,
      section,
      classification,
      recommendationLabel,
      preferenceMatched,
      rankScore,
    });
  }

  enriched.sort((a, b) => {
    // 1. No timetable clashes (clash-free & verified first)
    const aValid = a.item.is_compatible && a.classification.isVerified ? 1 : 0;
    const bValid = b.item.is_compatible && b.classification.isVerified ? 1 : 0;
    if (aValid !== bValid) return bValid - aValid;

    // 2. Match with selected Morning / Evening preference (among valid non-clashing options, or among clashing options)
    if (preference !== 'none' && a.preferenceMatched !== b.preferenceMatched) {
      return a.preferenceMatched ? -1 : 1;
    }

    // 3. Complete and verified slot mapping
    const aVerified = a.classification.isVerified ? 1 : 0;
    const bVerified = b.classification.isVerified ? 1 : 0;
    if (aVerified !== bVerified) return bVerified - aVerified;

    // 4. Existing teacher review information & recommendation score
    const aRating =
      a.item.faculty_review && a.item.faculty_review.total_reviews > 0
        ? a.item.faculty_review.avg_rating ?? 0
        : 0;
    const bRating =
      b.item.faculty_review && b.item.faculty_review.total_reviews > 0
        ? b.item.faculty_review.avg_rating ?? 0
        : 0;
    if (Math.abs(aRating - bRating) > 0.01) {
      return bRating - aRating;
    }

    return b.rankScore - a.rankScore;
  });

  return enriched;
}
