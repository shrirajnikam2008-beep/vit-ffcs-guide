import React, { useState, useMemo } from 'react';
import {
  Search,
  Check,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Star,
  Scale,
  ThumbsUp,
  Ban,
  ChevronDown,
  ChevronRight,
  X,
  Link2,
  Filter,
} from 'lucide-react';
import {
  ClashReport,
  Course,
  CourseSection,
} from '../types/ffcs';
import { getSubjectColorStyle } from '../lib/subjectColors';

interface CourseSelectionDrawerProps {
  isOpen?: boolean;
  isInlinePage?: boolean;
  onClose?: () => void;
  courses: Course[];
  selectedSectionIds: number[];
  lockedSectionIds: number[];
  clashReport: ClashReport | null;
  preferredFaculty: string[];
  avoidedFaculty: string[];
  initialSlotFilter?: string;
  onClearSlotFilter?: () => void;
  onToggleSection: (section: CourseSection) => void;
  onToggleLock: (sectionId: number) => void;
  onTogglePreferredFaculty: (facultyName: string) => void;
  onToggleAvoidedFaculty: (facultyName: string) => void;
  onOpenFacultyComparison: (courseCode: string) => void;
  onSelectPair: (ethId: number, elaId: number) => void;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'PCC', label: 'Programme Core (PCC)' },
  { id: 'UCC', label: 'University Core (UCC)' },
  { id: 'Programme Elective', label: 'Programme Electives' },
  { id: 'University Elective', label: 'University Electives' },
  { id: 'LAB_HAVING', label: 'Courses with Labs (ETL)' },
];

export const CourseSelectionDrawer: React.FC<CourseSelectionDrawerProps> = ({
  isOpen = true,
  isInlinePage = false,
  onClose,
  courses,
  selectedSectionIds,
  lockedSectionIds,
  preferredFaculty,
  avoidedFaculty,
  initialSlotFilter = '',
  onClearSlotFilter,
  onToggleSection,
  onToggleLock,
  onTogglePreferredFaculty,
  onToggleAvoidedFaculty,
  onOpenFacultyComparison,
  onSelectPair,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [compatFilter, setCompatFilter] = useState<'all' | 'compatible'>('all');
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({
    BACSE104: true,
    BAITE101: true,
    BAITE102: true,
    BAMAT207: true,
  });

  if (!isOpen && !isInlinePage) return null;

  const selectedSet = useMemo(() => new Set(selectedSectionIds), [selectedSectionIds]);
  const lockedSet = useMemo(() => new Set(lockedSectionIds), [lockedSectionIds]);
  const prefSet = useMemo(
    () => new Set(preferredFaculty.map((f) => f.toLowerCase())),
    [preferredFaculty]
  );
  const avoidSet = useMemo(
    () => new Set(avoidedFaculty.map((f) => f.toLowerCase())),
    [avoidedFaculty]
  );

  // Build occupied (day, period) intervals from currently selected sections
  const occupiedByOtherCourse = useMemo(() => {
    const map: Array<{
      courseCode: string;
      courseTypeCode: string;
      sectionId: number;
      day: string;
      period: number;
      slotCode: string;
    }> = [];
    for (const c of courses) {
      for (const s of c.sections) {
        if (selectedSet.has(s.id) && s.parsed_slot?.occurrences) {
          for (const occ of s.parsed_slot.occurrences) {
            map.push({
              courseCode: s.course_code,
              courseTypeCode: s.course_type_code,
              sectionId: s.id,
              day: occ.day,
              period: occ.period,
              slotCode: occ.slot_code,
            });
          }
        }
      }
    }
    return map;
  }, [courses, selectedSet]);

  // Check if a candidate section conflicts with any selected section of another course/component
  const checkSectionCompatibility = (sec: CourseSection): { compatible: boolean; reason?: string } => {
    const occs = sec.parsed_slot?.occurrences ?? [];
    for (const occ of occs) {
      const hit = occupiedByOtherCourse.find(
        (o) =>
          o.day === occ.day &&
          o.period === occ.period &&
          !(o.courseCode === sec.course_code && o.courseTypeCode === sec.course_type_code)
      );
      if (hit) {
        return {
          compatible: false,
          reason: `Clashes with ${hit.courseCode} (${hit.slotCode}) on ${occ.day} P${occ.period}`,
        };
      }
    }
    return { compatible: true };
  };

  const slotTokensFilter = useMemo(() => {
    if (!initialSlotFilter) return [];
    return initialSlotFilter
      .split('/')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);
  }, [initialSlotFilter]);

  const filteredCourses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return courses.filter((c) => {
      if (categoryFilter === 'LAB_HAVING') {
        if (c.practical_hours <= 0 && !c.sections.some((s) => s.course_type_code === 'ELA')) {
          return false;
        }
      } else if (categoryFilter !== 'ALL' && c.curriculum_category !== categoryFilter) {
        return false;
      }

      if (slotTokensFilter.length > 0) {
        const hasSlotMatch = c.sections.some((s) =>
          slotTokensFilter.some((tok) =>
            s.slot_combination.toUpperCase().split('+').includes(tok)
          )
        );
        if (!hasSlotMatch) return false;
      }

      if (!q) return true;
      if (
        c.course_code.toLowerCase().includes(q) ||
        c.course_title.toLowerCase().includes(q)
      ) {
        return true;
      }
      return c.sections.some(
        (s) =>
          s.faculty_name.toLowerCase().includes(q) ||
          s.slot_combination.toLowerCase().includes(q) ||
          s.venue.toLowerCase().includes(q)
      );
    });
  }, [courses, searchQuery, categoryFilter, slotTokensFilter]);

  const content = (
    <div className="flex h-full flex-col bg-white dark:bg-[#1E1F20]">
      {/* Header */}
      <div className="border-b border-[#DADCE0] dark:border-[#3C4043] px-5 py-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-bold text-[#202124] dark:text-[#E3E3E3]">
            Course Explorer & Section Picker
          </h2>
          <p className="text-[12px] text-[#5F6368] dark:text-[#9AA0A6]">
            Select theory (ETH) and lab (ELA) offerings. Clashes recalculate immediately.
          </p>
        </div>
        {!isInlinePage && onClose && (
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#5F6368] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search & Filter Controls */}
      <div className="border-b border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/50 px-5 py-3 space-y-2.5">
        {initialSlotFilter && (
          <div className="flex items-center justify-between rounded-xl border border-[#1A73E8]/30 bg-[#E8F0FE] dark:bg-[#1E3A5F] px-3 py-1.5 text-[12px] text-[#174EA6] dark:text-[#AECBFA]">
            <span>
              Filtering sections matching cell slot: <strong>{initialSlotFilter}</strong>
            </span>
            {onClearSlotFilter && (
              <button
                onClick={onClearSlotFilter}
                className="font-semibold underline cursor-pointer"
              >
                Show All Slots
              </button>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#5F6368]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by course code, title, faculty, slot, or venue..."
              className="w-full rounded-[10px] border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] pl-9 pr-3 py-1.5 text-[13px] text-[#202124] dark:text-[#E3E3E3] focus:border-[#1A73E8] focus:ring-2 focus:ring-[#AECBFA] focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter by Curriculum Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-[10px] border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] px-3 py-1.5 text-[12px] font-medium text-[#202124] dark:text-[#E3E3E3] focus:outline-none cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>

          <button
            onClick={() =>
              setCompatFilter((prev) => (prev === 'all' ? 'compatible' : 'all'))
            }
            className={`inline-flex items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
              compatFilter === 'compatible'
                ? 'border-[#188038] bg-[#E6F4EA] text-[#137333] font-semibold'
                : 'border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] text-[#5F6368]'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>{compatFilter === 'compatible' ? 'Compatible Only' : 'All Sections'}</span>
          </button>
        </div>
      </div>

      {/* Course Accordion List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredCourses.map((course) => {
          const isExpanded = Boolean(expandedCodes[course.course_code]) || Boolean(initialSlotFilter);
          const courseSelectedSecs = course.sections.filter((s) => selectedSet.has(s.id));
          const style = getSubjectColorStyle(
            course.course_code,
            course.course_title,
            course.course_type,
            course.curriculum_category
          );

          // Find same-faculty Theory + Lab pairs for 1-click pairing
          const ethSecs = course.sections.filter((s) => s.course_type_code === 'ETH');
          const elaSecs = course.sections.filter((s) => s.course_type_code === 'ELA');
          const sameFacultyPairs: Array<{ eth: CourseSection; ela: CourseSection }> = [];
          for (const eth of ethSecs) {
            for (const ela of elaSecs) {
              if (
                eth.normalized_faculty_name === ela.normalized_faculty_name &&
                !eth.faculty_name.startsWith('TBA')
              ) {
                if (
                  checkSectionCompatibility(eth).compatible &&
                  checkSectionCompatibility(ela).compatible
                ) {
                  sameFacultyPairs.push({ eth, ela });
                }
              }
            }
          }

          return (
            <div
              key={course.course_code}
              className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] shadow-2xs overflow-hidden"
            >
              {/* Course Card Header */}
              <div
                onClick={() =>
                  setExpandedCodes((prev) => ({
                    ...prev,
                    [course.course_code]: !isExpanded,
                  }))
                }
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-[#F8F9FC] dark:hover:bg-[#282A2C] cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#5F6368]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#5F6368]" />
                  )}
                  <span
                    className={`rounded-lg px-2 py-0.5 font-mono text-[12px] font-bold ${style.badgeBg} ${style.badgeText}`}
                  >
                    {course.course_code}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold text-[#202124] dark:text-[#E3E3E3]">
                      {course.course_title}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                      <span>{course.curriculum_category}</span>
                      <span>•</span>
                      <span className="font-semibold text-[#202124] dark:text-[#E3E3E3]">
                        {course.credits} Credits
                      </span>
                      <span>•</span>
                      <span>{course.course_type}</span>
                      <span>•</span>
                      <span>{course.sections.length} Sections</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {courseSelectedSecs.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F4EA] dark:bg-[#143321] px-2.5 py-0.5 text-[11px] font-semibold text-[#188038] dark:text-[#81C995]">
                      <Check className="h-3 w-3" />
                      {courseSelectedSecs.map((s) => `${s.course_type_code}:${s.slot_combination}`).join(', ')}
                    </span>
                  )}
                  <button
                    onClick={() => onOpenFacultyComparison(course.course_code)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] px-2.5 py-1 text-[11px] font-semibold text-[#1A73E8] dark:text-[#8AB4F8] hover:bg-[#E8F0FE]/50 cursor-pointer"
                  >
                    <Scale className="h-3 w-3" />
                    <span>Compare Faculty</span>
                  </button>
                </div>
              </div>

              {/* Expanded Sections Table */}
              {isExpanded && (
                <div className="border-t border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC]/60 dark:bg-[#282A2C]/30 p-3 space-y-3">
                  {/* Same-Faculty ETH+ELA Quick Pairs */}
                  {sameFacultyPairs.length > 0 && (
                    <div className="rounded-xl border border-[#1A73E8]/25 bg-[#E8F0FE]/50 dark:bg-[#1E3A5F]/30 p-2.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#174EA6] dark:text-[#AECBFA]">
                        <Link2 className="h-3.5 w-3.5" />
                        <span>1-Click Compatible Theory + Lab Pairs (Same Faculty):</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {sameFacultyPairs.slice(0, 6).map(({ eth, ela }) => {
                          const bothSelected = selectedSet.has(eth.id) && selectedSet.has(ela.id);
                          return (
                            <button
                              key={`${eth.id}_${ela.id}`}
                              onClick={() => onSelectPair(eth.id, ela.id)}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                                bothSelected
                                  ? 'border-[#1A73E8] bg-[#1A73E8] text-white font-semibold'
                                  : 'border-[#DADCE0] bg-white dark:bg-[#1E1F20] text-[#202124] dark:text-[#E3E3E3] hover:border-[#1A73E8]'
                              }`}
                            >
                              <span className="font-semibold">{eth.faculty_name}</span>
                              <span className="font-mono text-[10px] opacity-80">
                                ({eth.slot_combination} + {ela.slot_combination})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Individual Section Rows */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {course.sections
                      .filter((sec) => {
                        if (slotTokensFilter.length > 0) {
                          const match = slotTokensFilter.some((tok) =>
                            sec.slot_combination.toUpperCase().split('+').includes(tok)
                          );
                          if (!match) return false;
                        }
                        if (compatFilter === 'compatible') {
                          return checkSectionCompatibility(sec).compatible || selectedSet.has(sec.id);
                        }
                        return true;
                      })
                      .map((sec) => {
                        const isSelected = selectedSet.has(sec.id);
                        const isLocked = lockedSet.has(sec.id);
                        const compat = checkSectionCompatibility(sec);
                        const isPref = prefSet.has(sec.faculty_name.toLowerCase());
                        const isAvoid = avoidSet.has(sec.faculty_name.toLowerCase());

                        return (
                          <div
                            key={sec.id}
                            className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 transition-all ${
                              isSelected
                                ? 'border-[#1A73E8] bg-[#E8F0FE]/60 dark:bg-[#1E3A5F]/50 ring-1 ring-[#1A73E8]/40'
                                : !compat.compatible
                                ? 'border-[#DADCE0] dark:border-[#3C4043] bg-[#F1F3F4]/60 dark:bg-[#282A2C]/40 opacity-75'
                                : 'border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] hover:border-[#1A73E8]/60'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="rounded bg-[#F1F3F4] dark:bg-[#3C4043] px-1.5 py-0.5 text-[10px] font-bold text-[#202124] dark:text-[#E3E3E3]">
                                  {sec.course_type_code}
                                </span>
                                <span className="font-mono text-[12px] font-bold text-[#1A73E8] dark:text-[#8AB4F8]">
                                  {sec.slot_combination}
                                </span>
                                <span className="font-mono text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                                  • {sec.venue}
                                </span>
                                {sec.faculty_review && sec.faculty_review.total_reviews > 0 && (
                                  <span className="inline-flex items-center gap-0.5 rounded bg-[#FEF7E0] px-1.5 py-0.2 text-[10px] font-semibold text-[#B06000]">
                                    <Star className="h-2.5 w-2.5 fill-current" />
                                    {sec.faculty_review.avg_rating}
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 truncate text-[12px] font-semibold text-[#202124] dark:text-[#E3E3E3]">
                                {sec.faculty_name}
                              </div>

                              <div className="mt-0.5 flex items-center gap-1 text-[11px]">
                                {compat.compatible ? (
                                  <span className="inline-flex items-center gap-1 text-[#188038] dark:text-[#81C995]">
                                    <CheckCircle2 className="h-3 w-3" /> Compatible
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[#D93025] dark:text-[#F28B82]">
                                    <AlertTriangle className="h-3 w-3" /> {compat.reason}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions: Prefer/Avoid Faculty, Lock, Select */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => onTogglePreferredFaculty(sec.faculty_name)}
                                title="Mark faculty as Preferred"
                                className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                                  isPref
                                    ? 'bg-[#E6F4EA] text-[#188038]'
                                    : 'text-[#5F6368] hover:bg-[#F1F3F4]'
                                }`}
                              >
                                <ThumbsUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => onToggleAvoidedFaculty(sec.faculty_name)}
                                title="Mark faculty as Avoided"
                                className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                                  isAvoid
                                    ? 'bg-[#FCE8E6] text-[#D93025]'
                                    : 'text-[#5F6368] hover:bg-[#F1F3F4]'
                                }`}
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </button>

                              {isSelected && (
                                <button
                                  onClick={() => onToggleLock(sec.id)}
                                  title={isLocked ? 'Unlock section' : 'Lock section'}
                                  className="rounded-lg p-1.5 text-[#5F6368] hover:bg-[#F1F3F4] cursor-pointer"
                                >
                                  {isLocked ? (
                                    <Lock className="h-3.5 w-3.5 text-[#F29900]" />
                                  ) : (
                                    <Unlock className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}

                              <button
                                onClick={() => onToggleSection(sec)}
                                className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#1A73E8] text-white hover:bg-[#1557B0]'
                                    : 'border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E3E3E3] hover:border-[#1A73E8] hover:text-[#1A73E8]'
                                }`}
                              >
                                {isSelected ? 'Selected' : 'Select'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isInlinePage) {
    return (
      <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden shadow-xs">
        {content}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  );
};
