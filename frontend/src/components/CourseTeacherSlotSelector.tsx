import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Star,
  ExternalLink,
  Trash2,
  ArrowRightLeft,
  Filter,
  Check,
  ChevronUp,
  ChevronDown,
  PanelLeftClose,
  Plus,
  Clock,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react';
import {
  ClashReport,
  Course,
  CourseSection,
  FacultyComparisonItem,
  SlotOccurrence,
} from '../types/ffcs';
import { fetchFacultyComparison } from '../lib/api';
import { getSubjectColorStyle } from '../lib/subjectColors';
import {
  computeFacultyFilterCounts,
  FacultySlotFilterKey,
  filterFacultyOptions,
  getFacultyTeachingSchedule,
  rankFacultyOptions,
  RecommendationBadgeLabel,
  SchedulePreference,
  SlotClassificationCategory,
} from '../lib/slotIntelligence';

interface CourseTeacherSlotSelectorProps {
  courses: Course[];
  activeCourseCode: string;
  onSelectCourseCode: (code: string) => void;
  selectedSections: CourseSection[];
  selectedSectionIds: number[];
  slotMap: Record<string, SlotOccurrence[]>;
  clashReport: ClashReport | null;
  campus: string;
  semester?: string;
  lastUpdatedLabel: string;
  onSelectOrSwitchSection: (section: CourseSection) => void;
  onRemoveSection: (sectionId: number) => void;
  onCollapsePanel?: () => void;
}

function getCategoryPillStyle(category: SlotClassificationCategory, session: string): string {
  if (category === 'Morning Theory') {
    return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
  }
  if (category === 'Evening Theory') {
    return 'bg-[#E0E7FF] text-[#1E40AF] border-[#C7D2FE]';
  }
  if (category === 'Lab / Practical') {
    return session === 'Morning'
      ? 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]'
      : 'bg-[#E0F2FE] text-[#075985] border-[#BAE6FD]';
  }
  if (category === 'Mixed / Other') {
    return 'bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]';
  }
  return 'bg-[#F1F5F9] text-[#475569] border-[#CBD5E1]';
}

function getRecommendationBadgeStyle(label: RecommendationBadgeLabel): string {
  switch (label) {
    case 'Best Morning Fit':
      return 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]';
    case 'Best Evening Fit':
      return 'bg-[#DBEAFE] text-[#1D4ED8] border-[#93C5FD]';
    case 'No Clash':
      return 'bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]';
    case 'Mixed Schedule':
      return 'bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]';
    case 'Time Unverified':
      return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
    case 'Clash':
      return 'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]';
  }
}

export const CourseTeacherSlotSelector: React.FC<CourseTeacherSlotSelectorProps> = ({
  courses,
  activeCourseCode,
  onSelectCourseCode,
  selectedSections,
  selectedSectionIds,
  slotMap,
  clashReport,
  campus,
  semester = 'Winter Semester 2026–27',
  lastUpdatedLabel,
  onSelectOrSwitchSection,
  onRemoveSection,
  onCollapsePanel,
}) => {
  const [courseSearch, setCourseSearch] = useState('');
  const [showCourseSearchDropdown, setShowCourseSearchDropdown] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('ALL');
  const [slotFilter, setSlotFilter] = useState<FacultySlotFilterKey>('all');
  const [schedulePreference, setSchedulePreference] = useState<SchedulePreference>('none');
  const [clashFreeOnly, setClashFreeOnly] = useState(false);
  const [rankedItems, setRankedItems] = useState<FacultyComparisonItem[]>([]);
  const [loadingRanks, setLoadingRanks] = useState(false);
  const [expandedRowDetails, setExpandedRowDetails] = useState<Record<number, boolean>>({});
  const [expandedTeachingSchedule, setExpandedTeachingSchedule] = useState<Record<number, boolean>>(
    {}
  );
  const [selectedTrayExpanded, setSelectedTrayExpanded] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedSectionIds), [selectedSectionIds]);

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.course_code.toLowerCase().includes(q) ||
        c.course_title.toLowerCase().includes(q) ||
        c.sections.some(
          (s) =>
            s.faculty_name.toLowerCase().includes(q) ||
            s.slot_combination.toLowerCase().includes(q)
        )
    );
  }, [courses, courseSearch]);

  const activeCourse = useMemo(
    () =>
      courses.find((c) => c.course_code === activeCourseCode) ||
      filteredCourses[0] ||
      courses[0] ||
      null,
    [courses, activeCourseCode, filteredCourses]
  );

  useEffect(() => {
    setSelectedTeacherFilter('ALL');
    setSlotFilter('all');
  }, [activeCourse?.course_code]);

  // Fetch compatibility & base scores from backend
  useEffect(() => {
    if (!activeCourse) return;
    let cancelled = false;
    setLoadingRanks(true);
    fetchFacultyComparison(activeCourse.course_code, {
      selected_section_ids: selectedSectionIds,
      locked_section_ids: [],
      preferred_faculty: [],
      avoided_faculty: [],
      preferred_slots: [],
      avoided_slots: [],
      session_preference:
        schedulePreference === 'morning'
          ? 'morning_theory'
          : schedulePreference === 'evening'
          ? 'evening_theory'
          : 'balanced',
      campus,
      allow_adjacent_lab_boundary: true,
    })
      .then((res) => {
        if (!cancelled) {
          setRankedItems(res.comparisons);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!cancelled) setLoadingRanks(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCourse?.course_code, selectedSectionIds, campus, schedulePreference]);

  const activeCourseSectionMap = useMemo(() => {
    const map = new Map<number, CourseSection>();
    activeCourse?.sections.forEach((s) => map.set(s.id, s));
    return map;
  }, [activeCourse]);

  // Rank and classify all options for the selected course using official slotMap and schedulePreference
  const classifiedAndRankedOptions = useMemo(
    () =>
      rankFacultyOptions(
        rankedItems,
        activeCourseSectionMap,
        slotMap,
        schedulePreference
      ),
    [rankedItems, activeCourseSectionMap, slotMap, schedulePreference]
  );

  const availableTeachers = useMemo(() => {
    if (!activeCourse) return [];
    const seen = new Map<
      string,
      {
        name: string;
        optionCount: number;
        compatibleCount: number;
        avgRating: number | null;
        totalReviews: number;
      }
    >();

    for (const opt of classifiedAndRankedOptions) {
      const { item } = opt;
      const existing = seen.get(item.faculty_name);
      const rev = item.faculty_review;
      const rating = rev && rev.total_reviews > 0 ? rev.avg_rating ?? null : null;
      if (!existing) {
        seen.set(item.faculty_name, {
          name: item.faculty_name,
          optionCount: 1,
          compatibleCount: item.is_compatible ? 1 : 0,
          avgRating: rating,
          totalReviews: rev?.total_reviews ?? 0,
        });
      } else {
        existing.optionCount += 1;
        if (item.is_compatible) existing.compatibleCount += 1;
      }
    }
    return Array.from(seen.values());
  }, [activeCourse, classifiedAndRankedOptions]);

  // Apply teacher dropdown, search query, and clash-free toggle first so filter counts reflect available options
  const searchFilteredOptions = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    return classifiedAndRankedOptions.filter(({ item }) => {
      if (selectedTeacherFilter !== 'ALL' && item.faculty_name !== selectedTeacherFilter) {
        return false;
      }
      if (clashFreeOnly && !item.is_compatible && !selectedSet.has(item.section_id)) {
        return false;
      }
      if (q) {
        if (
          !item.faculty_name.toLowerCase().includes(q) &&
          !item.slot_combination.toLowerCase().includes(q) &&
          !item.venue.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    classifiedAndRankedOptions,
    selectedTeacherFilter,
    clashFreeOnly,
    teacherSearch,
    selectedSet,
  ]);

  // Calculate exact counts for [ All ] [ Morning ] [ Evening ] [ Labs ] [ Mixed ]
  const slotFilterCounts = useMemo(
    () => computeFacultyFilterCounts(searchFilteredOptions, (opt) => opt.classification),
    [searchFilteredOptions]
  );

  // Final visible options after applying the Morning / Evening / Labs / Mixed segmented filter
  const visibleSectionOptions = useMemo(
    () => filterFacultyOptions(searchFilteredOptions, slotFilter, (opt) => opt.classification),
    [searchFilteredOptions, slotFilter]
  );

  const clashingIdsSet = useMemo(() => {
    const set = new Set<number>();
    for (const c of clashReport?.clashes || []) {
      if (c.is_confirmed && c.severity === 'ERROR') {
        if (c.course_a_section_id) set.add(c.course_a_section_id);
        if (c.course_b_section_id) set.add(c.course_b_section_id);
      }
    }
    return set;
  }, [clashReport]);

  return (
    <div className="h-full min-h-0 flex flex-col bg-white border-r border-[#CBD5E1] overflow-hidden select-none">
      {/* 1. COMPACT COURSE SEARCH & SELECTOR HEADER */}
      <div className="shrink-0 p-2 border-b border-[#CBD5E1] space-y-1.5 bg-[#F8FAFC]">
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#334155]">
            Course & Teacher Selector
          </span>
          {onCollapsePanel && (
            <button
              onClick={onCollapsePanel}
              title="Collapse selector panel"
              className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-semibold text-[#64748B] hover:bg-[#E8F0FE] hover:text-[#1A73E8] cursor-pointer"
            >
              <PanelLeftClose className="h-3 w-3" />
              <span>Hide</span>
            </button>
          )}
        </div>

        {/* Always-Visible Course Search Input */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1.5 h-3 w-3 text-[#64748B]" />
          <input
            type="text"
            value={courseSearch}
            onFocus={() => setShowCourseSearchDropdown(true)}
            onBlur={() => setTimeout(() => setShowCourseSearchDropdown(false), 180)}
            onChange={(e) => {
              setCourseSearch(e.target.value);
              setShowCourseSearchDropdown(true);
            }}
            placeholder="Search course code, title, or teacher..."
            className="w-full rounded-md border border-[#CBD5E1] bg-white pl-6 pr-2 py-1 text-[11px] text-[#0F172A] placeholder-[#64748B] focus:border-[#1A73E8] focus:outline-none"
          />

          {/* Instant Search Dropdown */}
          {showCourseSearchDropdown && courseSearch.trim().length > 0 && (
            <div className="absolute top-7 left-0 right-0 z-30 max-h-48 overflow-y-auto rounded-md border border-[#CBD5E1] bg-white shadow-lg divide-y divide-[#CBD5E1]/60">
              {filteredCourses.length === 0 ? (
                <div className="p-2 text-[10.5px] text-[#64748B] text-center">No matching courses</div>
              ) : (
                filteredCourses.map((c) => (
                  <button
                    key={c.course_code}
                    onMouseDown={() => {
                      onSelectCourseCode(c.course_code);
                      setCourseSearch('');
                      setShowCourseSearchDropdown(false);
                    }}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-left text-[11px] hover:bg-[#E8F0FE]/60 cursor-pointer"
                  >
                    <span className="truncate">
                      <strong className="font-mono text-[#1A73E8]">{c.course_code}</strong> —{' '}
                      {c.course_title}
                    </span>
                    <span className="ml-1.5 shrink-0 text-[9.5px] text-[#64748B]">
                      {c.credits}Cr
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Course Selector Dropdown */}
        <select
          aria-label="Choose Course"
          value={activeCourse?.course_code || ''}
          onChange={(e) => onSelectCourseCode(e.target.value)}
          className="w-full rounded-md border border-[#CBD5E1] bg-white px-2 py-1 text-[11px] font-semibold text-[#0F172A] focus:border-[#1A73E8] focus:outline-none cursor-pointer truncate"
        >
          {courses.map((c) => {
            const count = selectedSections.filter((s) => s.course_code === c.course_code).length;
            return (
              <option key={c.course_code} value={c.course_code}>
                {c.course_code} — {c.course_title} ({c.credits}Cr)
                {count > 0 ? ` ✓[${count}]` : ''}
              </option>
            );
          })}
        </select>

        {/* Horizontal Course Pill Strip */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {courses.map((c) => {
            const isActive = activeCourse?.course_code === c.course_code;
            const pickedCount = selectedSections.filter(
              (s) => s.course_code === c.course_code
            ).length;
            return (
              <button
                key={c.course_code}
                onClick={() => onSelectCourseCode(c.course_code)}
                title={`${c.course_code} — ${c.course_title} (${c.credits} Credits)`}
                className={`shrink-0 inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 font-mono text-[9.5px] font-bold transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[#1A73E8] bg-[#1A73E8] text-white'
                    : pickedCount > 0
                    ? 'border-[#188038]/40 bg-[#E6F4EA] text-[#137333]'
                    : 'border-[#CBD5E1] bg-white text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                <span>{c.course_code}</span>
                {pickedCount > 0 && <Check className="h-2.5 w-2.5" />}
              </button>
            );
          })}
        </div>

        {/* Selected Course Compact Filters (Morning/Evening/Labs/Mixed + Preference + Faculty Search) */}
        {activeCourse && (
          <div className="pt-1 border-t border-[#CBD5E1]/70 space-y-1">
            {/* Segmented Filter: [ All ] [ Morning ] [ Evening ] [ Labs ] [ Mixed ] */}
            <div className="flex flex-wrap items-center gap-0.5 rounded border border-[#CBD5E1] bg-white p-0.5">
              {(
                [
                  { key: 'all', label: 'All' },
                  { key: 'morning', label: 'Morning' },
                  { key: 'evening', label: 'Evening' },
                  { key: 'labs', label: 'Labs' },
                  { key: 'mixed', label: 'Mixed' },
                ] as Array<{ key: FacultySlotFilterKey; label: string }>
              ).map(({ key, label }) => {
                const count = slotFilterCounts[key];
                const active = slotFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSlotFilter(key)}
                    className={`flex-1 min-w-fit rounded px-1 py-0.5 text-[9.5px] font-bold transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#1A73E8] text-white shadow-2xs'
                        : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Smart Schedule Preference Selector + No-Clash Filter */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <Clock className="h-3 w-3 text-[#1A73E8] shrink-0" />
                <select
                  aria-label="Schedule Preference"
                  value={schedulePreference}
                  onChange={(e) =>
                    setSchedulePreference(e.target.value as SchedulePreference)
                  }
                  className="flex-1 min-w-0 rounded border border-[#CBD5E1] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#0F172A] focus:border-[#1A73E8] focus:outline-none cursor-pointer truncate"
                >
                  <option value="none">Preference: No Preference</option>
                  <option value="morning">Prefer Morning Classes</option>
                  <option value="evening">Prefer Evening Classes</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setClashFreeOnly((v) => !v)}
                className={`shrink-0 inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[9.5px] font-bold cursor-pointer ${
                  clashFreeOnly
                    ? 'border-[#188038] bg-[#E6F4EA] text-[#137333]'
                    : 'border-[#CBD5E1] bg-white text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                <Filter className="h-2.5 w-2.5" />
                <span>No Clash</span>
              </button>
            </div>

            {/* Faculty Selector Dropdown + Quick Slot/Venue Search */}
            <div className="grid grid-cols-12 gap-1">
              <select
                aria-label="Filter by Faculty"
                value={selectedTeacherFilter}
                onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                className="col-span-6 rounded border border-[#CBD5E1] bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-[#0F172A] focus:border-[#1A73E8] focus:outline-none cursor-pointer truncate"
              >
                <option value="ALL">All Teachers ({availableTeachers.length})</option>
                {availableTeachers.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                    {t.avgRating !== null ? ` (★${t.avgRating})` : ''}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Slot / venue..."
                className="col-span-6 rounded border border-[#CBD5E1] bg-white px-2 py-0.5 text-[10.5px] text-[#0F172A] placeholder-[#64748B] focus:border-[#1A73E8] focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. COMPACT SELECTABLE TEACHER & SECTION ROWS (Only Scrollable List) */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#CBD5E1]/70">
        {loadingRanks ? (
          <div className="py-6 text-center text-[11px] text-[#64748B]">
            Ranking compatible sections...
          </div>
        ) : visibleSectionOptions.length === 0 ? (
          <div className="py-6 px-2 text-center text-[11px] text-[#64748B]">
            No sections match your filter.
          </div>
        ) : (
          visibleSectionOptions.map(
            ({ item, section: secObj, classification, recommendationLabel }) => {
              const isPicked = selectedSet.has(item.section_id);
              const isUnresolved =
                secObj.verification_status === 'UNRESOLVED' || !classification.isVerified;
              const rev = item.faculty_review;
              const isInfoExpanded = Boolean(expandedRowDetails[item.section_id]);
              const isScheduleExpanded = Boolean(expandedTeachingSchedule[item.section_id]);

              // Compute full faculty teaching schedule on demand when expanded
              const facultySchedule = isScheduleExpanded
                ? getFacultyTeachingSchedule(
                    item.faculty_name,
                    activeCourse?.course_code || item.course_code,
                    courses,
                    slotMap,
                    semester
                  )
                : null;

              return (
                <div
                  key={item.section_id}
                  onClick={() => onSelectOrSwitchSection(secObj)}
                  className={`px-2 py-1.5 transition-colors cursor-pointer ${
                    isPicked
                      ? 'bg-[#E8F0FE]/70 border-l-[3px] border-l-[#1A73E8]'
                      : !item.is_compatible
                      ? 'bg-[#FCE8E6]/20 hover:bg-[#FCE8E6]/35'
                      : 'bg-white hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      {/* Row 1: Status Dot + Faculty Name + Morning/Evening/Lab Category Pill + Review Rating */}
                      <div className="flex items-center gap-1 flex-wrap leading-tight">
                        <span
                          title={
                            isUnresolved
                              ? 'Amber: Slot mapping unresolved'
                              : item.is_compatible
                              ? 'Green: No confirmed clash'
                              : 'Red: Confirmed clash'
                          }
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            isUnresolved
                              ? 'bg-[#F59E0B]'
                              : item.is_compatible
                              ? 'bg-[#16A34A]'
                              : 'bg-[#DC2626]'
                          }`}
                        />
                        <span className="truncate text-[11px] font-bold text-[#0F172A]">
                          {item.faculty_name}
                        </span>
                        <span
                          className={`shrink-0 rounded border px-1 py-0.2 text-[9px] font-bold ${getCategoryPillStyle(
                            classification.category,
                            classification.session
                          )}`}
                        >
                          {classification.shortLabel}
                        </span>
                        {rev && rev.total_reviews > 0 && (
                          <span className="shrink-0 inline-flex items-center gap-0.5 text-[9.5px] font-bold text-[#B45309]">
                            <Star className="h-2.5 w-2.5 fill-[#F59E0B] text-[#F59E0B]" />
                            {rev.avg_rating}
                          </span>
                        )}
                      </div>

                      {/* Row 2: Slot · Venue · Type · Recommendation Badge */}
                      <div className="flex items-center gap-1 flex-wrap font-mono text-[10px] leading-tight">
                        <span className="font-bold text-[#1A73E8]">
                          Slot: {item.slot_combination}
                        </span>
                        <span className="text-[#94A3B8]">·</span>
                        <span className="font-semibold text-[#1E293B]">
                          Venue: {item.venue || 'TBA'}
                        </span>
                        <span className="rounded bg-[#F1F5F9] px-1 py-0.2 text-[8.5px] font-bold text-[#334155]">
                          {item.course_type_code}
                        </span>
                        <span
                          className={`font-sans rounded border px-1 py-0.2 text-[8.5px] font-bold ${getRecommendationBadgeStyle(
                            recommendationLabel
                          )}`}
                        >
                          {recommendationLabel === 'Clash'
                            ? `Clash (${item.conflicts_with[0]?.split(' ')[0] || 'Slot'})`
                            : recommendationLabel}
                        </span>
                      </div>

                      {/* Row 3: Verified Teaching Day & Time Schedule (Below Slot & Venue) */}
                      <div className="pt-0.5 text-[9.5px] leading-[1.25] text-[#334155]">
                        {classification.isVerified &&
                        classification.teachingPeriods.length > 0 ? (
                          <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                            {classification.teachingPeriods.map((tp, idx) => (
                              <span
                                key={`${tp.day}_${tp.period}_${idx}`}
                                className="inline-flex items-center gap-0.5 font-medium text-[#1E293B]"
                              >
                                <span className="font-semibold text-[#0F172A]">
                                  {tp.dayFull}
                                </span>
                                <span className="text-[#64748B]">|</span>
                                <span className="font-mono text-[9px] text-[#334155]">
                                  {tp.startTime}–{tp.endTime}
                                </span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-medium text-[#B45309]">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            <span>Time unavailable</span>
                          </span>
                        )}
                      </div>

                      {/* Row 4: Action Links for Teaching Schedule & Review Info */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedTeachingSchedule((prev) => ({
                              ...prev,
                              [item.section_id]: !prev[item.section_id],
                            }));
                          }}
                          className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-[#1A73E8] hover:underline cursor-pointer"
                        >
                          <CalendarDays className="h-2.5 w-2.5" />
                          <span>
                            {isScheduleExpanded ? 'Hide Schedule' : 'Teaching Schedule'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRowDetails((prev) => ({
                              ...prev,
                              [item.section_id]: !prev[item.section_id],
                            }));
                          }}
                          className="text-[9px] font-semibold text-[#64748B] hover:text-[#1A73E8] underline cursor-pointer"
                        >
                          {isInfoExpanded ? 'Less Info' : 'Reviews & Clash Info'}
                        </button>
                      </div>

                      {/* Expandable Section 1: Verified Teacher Teaching Schedule Intelligence */}
                      {isScheduleExpanded && facultySchedule && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 rounded border border-[#CBD5E1] bg-[#F8FAFC] p-1.5 text-[9.5px] text-[#1E293B] space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-1 border-b border-[#CBD5E1]/70 pb-1">
                            <span className="font-bold text-[#0F172A]">
                              {facultySchedule.facultyName} — Verified Teaching Assignments
                            </span>
                            <span className="rounded bg-[#FEF3C7] px-1 py-0.2 text-[8.5px] font-bold text-[#92400E]">
                              Partial (Imported Data)
                            </span>
                          </div>

                          {/* Group A: Selected Course's Available Sections taught by this Faculty */}
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-wide text-[#475569]">
                              {activeCourse?.course_code} Sections ({facultySchedule.selectedCourseSections.length})
                            </div>
                            <div className="mt-0.5 space-y-1">
                              {facultySchedule.selectedCourseSections.map((secEntry) => (
                                <div
                                  key={secEntry.sectionId}
                                  className="rounded border border-[#E2E8F0] bg-white px-1.5 py-1"
                                >
                                  <div className="flex items-center justify-between gap-1 font-mono text-[9px]">
                                    <span className="font-bold text-[#1A73E8]">
                                      {secEntry.slotCombination} ({secEntry.courseTypeCode})
                                    </span>
                                    <span className="text-[#334155]">
                                      Venue: {secEntry.venue || 'TBA'}
                                    </span>
                                    <span className="font-sans font-semibold text-[#475569]">
                                      {secEntry.classification.shortLabel}
                                    </span>
                                  </div>
                                  {secEntry.classification.isVerified &&
                                  secEntry.classification.teachingPeriods.length > 0 ? (
                                    <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-[#334155]">
                                      {secEntry.classification.teachingPeriods.map((p, i) => (
                                        <span key={i}>
                                          {p.dayFull} | {p.startTime}–{p.endTime} ({p.slotCode})
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="mt-0.5 text-[9px] text-[#B45309]">
                                      Time unavailable
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Group B: Other Course Offerings by the Same Faculty */}
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-wide text-[#475569]">
                              Other Imported Course Offerings ({facultySchedule.otherCourseOfferings.length})
                            </div>
                            {facultySchedule.otherCourseOfferings.length === 0 ? (
                              <div className="mt-0.5 text-[9px] text-[#64748B]">
                                No other course offerings listed for this faculty in the imported dataset.
                              </div>
                            ) : (
                              <div className="mt-0.5 space-y-1">
                                {facultySchedule.otherCourseOfferings.map((otherEntry) => (
                                  <div
                                    key={otherEntry.sectionId}
                                    className="rounded border border-[#E2E8F0] bg-white px-1.5 py-1"
                                  >
                                    <div className="flex items-center justify-between gap-1 text-[9px]">
                                      <span className="font-bold text-[#0F172A]">
                                        {otherEntry.courseCode} ({otherEntry.courseTypeCode})
                                      </span>
                                      <span className="font-mono font-bold text-[#1A73E8]">
                                        {otherEntry.slotCombination} · {otherEntry.venue || 'TBA'}
                                      </span>
                                    </div>
                                    {otherEntry.classification.isVerified &&
                                    otherEntry.classification.teachingPeriods.length > 0 ? (
                                      <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[8.5px] text-[#475569]">
                                        {otherEntry.classification.teachingPeriods.map((p, i) => (
                                          <span key={i}>
                                            {p.dayFull} | {p.startTime}–{p.endTime}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="mt-0.5 text-[8.5px] text-[#B45309]">
                                        Time unavailable
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="text-[8.5px] italic text-[#64748B]">
                            {facultySchedule.disclaimer}
                          </div>
                        </div>
                      )}

                      {/* Expandable Section 2: Reviews & Clash Details */}
                      {isInfoExpanded && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 rounded bg-[#F8FAFC] border border-[#CBD5E1]/70 px-1.5 py-1 text-[9.5px] text-[#334155] space-y-0.5"
                        >
                          {!item.is_compatible && item.conflicts_with.length > 0 && (
                            <div className="font-semibold text-[#DC2626]">
                              Conflicts with: {item.conflicts_with.join(', ')}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span>
                              {rev && rev.total_reviews > 0
                                ? `Rating: ★${rev.avg_rating}/5 (${rev.total_reviews} reviews · ${rev.cart_count} carts)`
                                : rev?.no8am_id
                                ? `Verified on no8am.site (0 reviews · ${rev.cart_count} carts)`
                                : `No review profile (${lastUpdatedLabel})`}
                            </span>
                            {rev?.profile_url && (
                              <a
                                href={rev.profile_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-0.5 font-semibold text-[#1A73E8] hover:underline"
                              >
                                no8am <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Clear Add / Remove Action Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOrSwitchSection(secObj);
                      }}
                      className={`shrink-0 inline-flex items-center gap-0.5 rounded px-2 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                        isPicked
                          ? 'bg-[#16A34A] text-white hover:bg-[#DC2626]'
                          : item.is_compatible
                          ? 'bg-[#1A73E8] text-white hover:bg-[#1557B0]'
                          : 'border border-[#DC2626]/40 bg-white text-[#DC2626] hover:bg-[#FCE8E6]'
                      }`}
                    >
                      {isPicked ? (
                        <span>Remove</span>
                      ) : (
                        <>
                          <Plus className="h-2.5 w-2.5" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            }
          )
        )}
      </div>

      {/* 3. COLLAPSIBLE SELECTED COURSES LIST AT BOTTOM */}
      <div className="shrink-0 border-t border-[#CBD5E1] bg-[#F8FAFC] px-2 py-1.5">
        <div className="flex items-center justify-between gap-1">
          <button
            onClick={() => setSelectedTrayExpanded((e) => !e)}
            className="flex items-center gap-1 text-[11px] font-bold text-[#0F172A] hover:text-[#1A73E8] cursor-pointer"
          >
            <span>Selected ({selectedSections.length})</span>
            <span className="rounded bg-[#E8F0FE] px-1.5 py-0.2 font-mono text-[9.5px] font-bold text-[#174EA6]">
              {clashReport?.total_credits ?? 0} Cr
            </span>
            {selectedTrayExpanded ? (
              <ChevronDown className="h-3 w-3 text-[#64748B]" />
            ) : (
              <ChevronUp className="h-3 w-3 text-[#64748B]" />
            )}
          </button>

          <button
            onClick={() => setSelectedTrayExpanded((e) => !e)}
            className="text-[10px] font-semibold text-[#1A73E8] hover:underline cursor-pointer"
          >
            {selectedTrayExpanded ? 'Hide' : 'Show List'}
          </button>
        </div>

        {/* Expandable Selected Courses List with Visible Remove Buttons */}
        {selectedTrayExpanded && (
          <div className="mt-1.5 max-h-40 overflow-y-auto divide-y divide-[#CBD5E1]/60 rounded border border-[#CBD5E1] bg-white">
            {selectedSections.map((sec) => {
              const hasClash = clashingIdsSet.has(sec.id);
              const style = getSubjectColorStyle(
                sec.course_code,
                sec.course_title,
                sec.course_type_code
              );
              return (
                <div
                  key={sec.id}
                  className={`flex items-center justify-between gap-1 px-1.5 py-1 text-[10.5px] ${
                    hasClash ? 'bg-[#FCE8E6]/60' : 'hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div
                    onClick={() => onSelectCourseCode(sec.course_code)}
                    className="min-w-0 flex-1 cursor-pointer truncate"
                  >
                    <span
                      className={`rounded px-1 py-0.2 font-mono text-[9px] font-bold mr-1 ${style.badgeBg} ${style.badgeText}`}
                    >
                      {sec.course_code}·{sec.course_type_code}
                    </span>
                    <span className="font-semibold text-[#0F172A]">{sec.faculty_name}</span>{' '}
                    <span className="font-mono text-[9.5px] text-[#64748B]">({sec.venue})</span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => onSelectCourseCode(sec.course_code)}
                      title="Change teacher or slot"
                      className="rounded p-0.5 text-[#64748B] hover:text-[#1A73E8] cursor-pointer"
                    >
                      <ArrowRightLeft className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onRemoveSection(sec.id)}
                      title="Remove class"
                      className="rounded px-1 py-0.5 text-[9.5px] font-bold text-[#DC2626] hover:bg-[#FCE8E6] cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
