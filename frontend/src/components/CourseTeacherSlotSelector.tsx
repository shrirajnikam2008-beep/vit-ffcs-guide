import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Star,
  ExternalLink,
  Trash2,
  ArrowRightLeft,
  Filter,
  Users,
  MapPin,
  BookOpen,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  ClashReport,
  Course,
  CourseSection,
  FacultyComparisonItem,
} from '../types/ffcs';
import { fetchFacultyComparison } from '../lib/api';
import { getSubjectColorStyle } from '../lib/subjectColors';

interface CourseTeacherSlotSelectorProps {
  courses: Course[];
  activeCourseCode: string;
  onSelectCourseCode: (code: string) => void;
  selectedSections: CourseSection[];
  selectedSectionIds: number[];
  clashReport: ClashReport | null;
  campus: string;
  lastUpdatedLabel: string;
  onSelectOrSwitchSection: (section: CourseSection) => void;
  onRemoveSection: (sectionId: number) => void;
}

export const CourseTeacherSlotSelector: React.FC<CourseTeacherSlotSelectorProps> = ({
  courses,
  activeCourseCode,
  onSelectCourseCode,
  selectedSections,
  selectedSectionIds,
  clashReport,
  campus,
  lastUpdatedLabel,
  onSelectOrSwitchSection,
  onRemoveSection,
}) => {
  const [courseSearch, setCourseSearch] = useState('');
  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('ALL');
  const [componentTab, setComponentTab] = useState<'ALL' | 'ETH' | 'ELA' | 'OC'>('ALL');
  const [clashFreeOnly, setClashFreeOnly] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [rankedItems, setRankedItems] = useState<FacultyComparisonItem[]>([]);
  const [loadingRanks, setLoadingRanks] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedSectionIds), [selectedSectionIds]);

  // Filter courses by search query (matches course code, title, or faculty name)
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

  // Reset teacher filter when switching active course
  useEffect(() => {
    setSelectedTeacherFilter('ALL');
    setComponentTab('ALL');
  }, [activeCourse?.course_code]);

  // Fetch live compatibility ranking whenever active course or selected timetable changes
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
      session_preference: 'balanced',
      campus,
      allow_adjacent_lab_boundary: true,
    })
      .then((res) => {
        if (!cancelled) {
          // Strict priority: Compatible sections ALWAYS rank above clashing sections
          const sorted = [...res.comparisons].sort((a, b) => {
            if (a.is_compatible !== b.is_compatible) {
              return a.is_compatible ? -1 : 1;
            }
            return b.score - a.score;
          });
          setRankedItems(sorted);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!cancelled) setLoadingRanks(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCourse?.course_code, selectedSectionIds, campus]);

  // Map section ID -> CourseSection object for activeCourse
  const activeCourseSectionMap = useMemo(() => {
    const map = new Map<number, CourseSection>();
    activeCourse?.sections.forEach((s) => map.set(s.id, s));
    return map;
  }, [activeCourse]);

  // Unique teachers available for the active course
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

    for (const item of rankedItems) {
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
  }, [activeCourse, rankedItems]);

  // Filtered section options for the active course
  const visibleSectionItems = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    return rankedItems.filter((item) => {
      if (componentTab !== 'ALL' && item.course_type_code !== componentTab) return false;
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
  }, [rankedItems, componentTab, selectedTeacherFilter, clashFreeOnly, teacherSearch, selectedSet]);

  // Check if all sections clash for the active component
  const allOptionsClash = useMemo(() => {
    if (rankedItems.length === 0) return false;
    return rankedItems.every((item) => !item.is_compatible);
  }, [rankedItems]);

  // Clashing section IDs from clashReport
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
    <div className="flex flex-col gap-4">
      {/* STEP 1: SEARCHABLE COURSE SELECTOR */}
      <div className="rounded-2xl border border-[#DADCE0] bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#1A73E8]" />
            <h2 className="text-[15px] font-bold text-[#202124]">
              1. Select Course
            </h2>
          </div>
          <span className="text-[11px] font-medium text-[#5F6368]">
            {courses.length} Courses Available
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#5F6368]" />
          <input
            type="text"
            value={courseSearch}
            onChange={(e) => setCourseSearch(e.target.value)}
            placeholder="Search course code (BACSE104), title (DSA), or teacher..."
            className="w-full rounded-[10px] border border-[#DADCE0] bg-[#F8F9FC] focus:bg-white pl-9 pr-3 py-2 text-[13px] text-[#202124] placeholder-[#5F6368] focus:border-[#1A73E8] focus:ring-2 focus:ring-[#AECBFA] focus:outline-none transition-all"
          />
        </div>

        {/* Scrollable Course Pills / List */}
        <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
          {filteredCourses.map((course) => {
            const isCurrent = activeCourse?.course_code === course.course_code;
            const pickedSecs = selectedSections.filter(
              (s) => s.course_code === course.course_code
            );
            const hasClash = pickedSecs.some((s) => clashingIdsSet.has(s.id));
            const color = getSubjectColorStyle(
              course.course_code,
              course.course_title,
              course.course_type,
              course.curriculum_category
            );

            return (
              <button
                key={course.course_code}
                onClick={() => onSelectCourseCode(course.course_code)}
                className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-[#1A73E8] bg-[#E8F0FE]/70 shadow-2xs'
                    : 'border-transparent hover:border-[#DADCE0] hover:bg-[#F8F9FC]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${color.badgeBg} ${color.badgeText}`}
                    >
                      {course.course_code}
                    </span>
                    <span className="truncate text-[13px] font-semibold text-[#202124]">
                      {course.course_title}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-[#5F6368]">
                    {course.credits} Credits • {course.curriculum_category} • {course.sections.length} options
                  </div>
                </div>

                {pickedSecs.length > 0 && (
                  <span
                    className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      hasClash
                        ? 'bg-[#FCE8E6] text-[#D93025]'
                        : 'bg-[#E6F4EA] text-[#188038]'
                    }`}
                  >
                    {hasClash ? (
                      <>
                        <AlertOctagon className="h-3 w-3" /> Clash
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3" /> Added ({pickedSecs.length})
                      </>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 2: SELECTED COURSE DETAILS, TEACHER SELECTOR & SLOT OPTIONS */}
      {activeCourse && (
        <div className="rounded-2xl border border-[#DADCE0] bg-white p-4 shadow-2xs space-y-3.5">
          {/* Selected Course Details Banner */}
          <div className="rounded-xl bg-[#F8F9FC] border border-[#DADCE0]/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[13px] font-bold text-[#1A73E8]">
                  {activeCourse.course_code}
                </span>
                <span className="rounded-md bg-[#E8F0FE] px-2 py-0.5 text-[11px] font-semibold text-[#174EA6]">
                  {activeCourse.credits} Credits
                </span>
                <span className="rounded-md bg-[#F1F3F4] px-2 py-0.5 text-[11px] font-medium text-[#5F6368]">
                  {activeCourse.curriculum_category} ({activeCourse.course_type})
                </span>
              </div>
              <button
                onClick={() => setCompareMode((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                  compareMode
                    ? 'border-[#1A73E8] bg-[#1A73E8] text-white'
                    : 'border-[#DADCE0] bg-white text-[#1A73E8] hover:bg-[#E8F0FE]/50'
                }`}
              >
                <Users className="h-3 w-3" />
                <span>{compareMode ? 'Standard View' : 'Compare Teachers'}</span>
              </button>
            </div>
            <h3 className="mt-1 text-[15px] font-bold text-[#202124]">
              {activeCourse.course_title}
            </h3>
          </div>

          {/* Component Type Tabs (ETH / ELA / OC) + Clash-Free Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg border border-[#DADCE0] bg-[#F1F3F4] p-0.5">
              {(['ALL', 'ETH', 'ELA', 'OC'] as const).map((tab) => {
                const count = rankedItems.filter((i) =>
                  tab === 'ALL' ? true : i.course_type_code === tab
                ).length;
                if (tab !== 'ALL' && count === 0) return null;
                return (
                  <button
                    key={tab}
                    onClick={() => setComponentTab(tab)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                      componentTab === tab
                        ? 'bg-white text-[#1A73E8] shadow-2xs'
                        : 'text-[#5F6368] hover:text-[#202124]'
                    }`}
                  >
                    {tab === 'ALL'
                      ? `All (${count})`
                      : tab === 'ETH'
                      ? `Theory ETH (${count})`
                      : tab === 'ELA'
                      ? `Lab ELA (${count})`
                      : `Online OC (${count})`}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setClashFreeOnly((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                clashFreeOnly
                  ? 'border-[#188038] bg-[#E6F4EA] text-[#137333]'
                  : 'border-[#DADCE0] bg-white text-[#5F6368] hover:text-[#202124]'
              }`}
            >
              <Filter className="h-3 w-3" />
              <span>Clash-Free Only</span>
            </button>
          </div>

          {/* Faculty Selector Pills + Search */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[12px] font-semibold text-[#202124]">
              <span>2. Filter by Teacher ({availableTeachers.length} faculty)</span>
              {selectedTeacherFilter !== 'ALL' && (
                <button
                  onClick={() => setSelectedTeacherFilter('ALL')}
                  className="text-[11px] font-semibold text-[#1A73E8] hover:underline cursor-pointer"
                >
                  Show All Teachers
                </button>
              )}
            </div>

            {/* Horizontal Teacher Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                onClick={() => setSelectedTeacherFilter('ALL')}
                className={`shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                  selectedTeacherFilter === 'ALL'
                    ? 'border-[#1A73E8] bg-[#1A73E8] text-white'
                    : 'border-[#DADCE0] bg-[#F8F9FC] text-[#5F6368] hover:text-[#202124]'
                }`}
              >
                All Teachers
              </button>
              {availableTeachers.map((t) => {
                const isSelected = selectedTeacherFilter === t.name;
                return (
                  <button
                    key={t.name}
                    onClick={() =>
                      setSelectedTeacherFilter(isSelected ? 'ALL' : t.name)
                    }
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#1A73E8] bg-[#E8F0FE] text-[#174EA6] font-semibold'
                        : t.compatibleCount > 0
                        ? 'border-[#DADCE0] bg-white text-[#202124] hover:border-[#1A73E8]'
                        : 'border-[#DADCE0] bg-[#F1F3F4] text-[#5F6368] opacity-75'
                    }`}
                  >
                    <span>{t.name}</span>
                    {t.avgRating !== null && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#B06000]">
                        ★{t.avgRating}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2 h-3.5 w-3.5 text-[#5F6368]" />
              <input
                type="text"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Filter teacher name, slot (e.g. A1, L31+L32), or venue..."
                className="w-full rounded-lg border border-[#DADCE0] bg-[#F8F9FC] focus:bg-white pl-8 pr-3 py-1.5 text-[12px] text-[#202124] focus:border-[#1A73E8] focus:outline-none"
              />
            </div>
          </div>

          {/* Warning if all sections clash */}
          {allOptionsClash && (
            <div className="rounded-xl border border-[#D93025]/40 bg-[#FCE8E6] p-3 text-[12px] text-[#A50E0E]">
              <div className="font-bold flex items-center gap-1.5">
                <AlertOctagon className="h-4 w-4 text-[#D93025]" />
                <span>All sections for {activeCourse.course_code} clash with your current timetable!</span>
              </div>
              <p className="mt-1 text-[11px]">
                Check the red conflict badges below to see which existing course causes the overlap, or switch that existing course to free up the slot.
              </p>
            </div>
          )}

          {/* STEP 3: SLOT & SECTION OPTIONS LIST (Ranked by Compatibility) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[12px] font-semibold text-[#202124]">
              <span>3. Select Teacher, Slot & Section ({visibleSectionItems.length} options)</span>
              <span className="text-[11px] font-normal text-[#5F6368]">
                Auto-ranked by clash compatibility
              </span>
            </div>

            {loadingRanks ? (
              <div className="py-6 text-center text-[12px] text-[#5F6368]">
                Checking slot compatibility...
              </div>
            ) : visibleSectionItems.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-[#5F6368]">
                No sections match your current filter.
              </div>
            ) : compareMode ? (
              /* Compact Teacher Comparison Table */
              <div className="max-h-80 overflow-y-auto rounded-xl border border-[#DADCE0]">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="sticky top-0 bg-[#F8F9FC] border-b border-[#DADCE0] font-bold text-[#5F6368]">
                    <tr>
                      <th className="py-2 px-2.5">Teacher & Review</th>
                      <th className="py-2 px-2">Slot & Venue</th>
                      <th className="py-2 px-2">Status</th>
                      <th className="py-2 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DADCE0]">
                    {visibleSectionItems.map((item) => {
                      const secObj = activeCourseSectionMap.get(item.section_id);
                      if (!secObj) return null;
                      const isPicked = selectedSet.has(item.section_id);
                      const isUnresolved = secObj.verification_status === 'UNRESOLVED';
                      const rev = item.faculty_review;

                      return (
                        <tr
                          key={item.section_id}
                          className={isPicked ? 'bg-[#E8F0FE]/60' : 'hover:bg-[#F8F9FC]'}
                        >
                          <td className="py-2 px-2.5">
                            <div className="font-bold text-[#202124]">{item.faculty_name}</div>
                            {rev && rev.total_reviews > 0 ? (
                              <span className="text-[10px] font-semibold text-[#B06000]">
                                ★ {rev.avg_rating}/5 ({rev.total_reviews} reviews)
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#5F6368]">No verified reviews</span>
                            )}
                          </td>
                          <td className="py-2 px-2 font-mono">
                            <span className="font-bold text-[#1A73E8]">{item.slot_combination}</span>
                            <div className="text-[10px] text-[#5F6368]">
                              {item.course_type_code} • {item.venue}
                            </div>
                          </td>
                          <td className="py-2 px-2">
                            {isUnresolved ? (
                              <span className="text-[#B06000] font-semibold">Unverified</span>
                            ) : item.is_compatible ? (
                              <span className="text-[#188038] font-semibold">No clash</span>
                            ) : (
                              <span className="text-[#D93025] font-semibold">
                                Clashes ({item.conflicts_with[0] || 'Slot overlap'})
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right">
                            <button
                              onClick={() => onSelectOrSwitchSection(secObj)}
                              className={`rounded-lg px-2 py-1 text-[11px] font-semibold cursor-pointer ${
                                isPicked
                                  ? 'bg-[#188038] text-white'
                                  : 'bg-[#1A73E8] text-white hover:bg-[#1557B0]'
                              }`}
                            >
                              {isPicked ? 'Selected' : 'Select'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Detailed Section Cards with Verified Reviews & Compatibility Reasons */
              <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                {visibleSectionItems.map((item) => {
                  const secObj = activeCourseSectionMap.get(item.section_id);
                  if (!secObj) return null;
                  const isPicked = selectedSet.has(item.section_id);
                  const isUnresolved = secObj.verification_status === 'UNRESOLVED';
                  const rev = item.faculty_review;

                  return (
                    <div
                      key={item.section_id}
                      className={`rounded-xl border p-3 transition-all ${
                        isPicked
                          ? 'border-[#1A73E8] bg-[#E8F0FE]/50 ring-1 ring-[#1A73E8]'
                          : isUnresolved
                          ? 'border-[#F9AB00]/60 bg-[#FEF7E0]/40'
                          : item.is_compatible
                          ? 'border-[#DADCE0] bg-white hover:border-[#1A73E8]/60'
                          : 'border-[#D93025]/30 bg-[#FCE8E6]/25'
                      }`}
                    >
                      {/* Top Row: Teacher Name, Slot, Venue, Clash Status Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[13px] font-bold text-[#202124]">
                              {item.faculty_name}
                            </span>
                            <span className="rounded bg-[#F1F3F4] px-1.5 py-0.5 text-[10px] font-bold text-[#202124]">
                              {item.course_type_code}
                            </span>
                          </div>

                          <div className="mt-1 flex items-center gap-2 font-mono text-[12px]">
                            <span className="rounded bg-[#E8F0FE] px-1.5 py-0.5 font-bold text-[#1A73E8]">
                              {item.slot_combination}
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#5F6368]">
                              <MapPin className="h-3 w-3" /> {item.venue}
                            </span>
                          </div>
                        </div>

                        {/* Clash Status Pill */}
                        <div className="shrink-0 text-right">
                          {isUnresolved ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF7E0] border border-[#F9AB00]/50 px-2 py-0.5 text-[10px] font-bold text-[#B06000]">
                              <AlertTriangle className="h-3 w-3" /> Unverified Mapping
                            </span>
                          ) : item.is_compatible ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F4EA] border border-[#188038]/30 px-2 py-0.5 text-[10px] font-bold text-[#188038]">
                              <CheckCircle2 className="h-3 w-3" /> No clash
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FCE8E6] border border-[#D93025]/30 px-2 py-0.5 text-[10px] font-bold text-[#D93025]">
                              <AlertOctagon className="h-3 w-3" /> Clash Detected
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Compact Verified Teacher Review Section */}
                      <div className="mt-2 rounded-lg bg-[#F8F9FC] border border-[#DADCE0]/60 px-2.5 py-1.5 text-[11px] flex flex-wrap items-center justify-between gap-2">
                        {rev && rev.total_reviews > 0 ? (
                          <div className="flex items-center gap-2 text-[#202124]">
                            <span className="inline-flex items-center gap-0.5 font-bold text-[#B06000]">
                              <Star className="h-3 w-3 fill-[#F9AB00] text-[#F9AB00]" />
                              {rev.avg_rating}/5
                            </span>
                            <span className="text-[#5F6368]">
                              ({rev.total_reviews} verified reviews • In {rev.cart_count} student carts)
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#5F6368]">
                            {rev?.no8am_id
                              ? `Verified profile (${rev.no8am_id}) • 0 reviews yet • In ${rev.cart_count} carts`
                              : 'No verified review profile available'}
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[#5F6368]">
                            Updated: {lastUpdatedLabel}
                          </span>
                          {rev?.profile_url && (
                            <a
                              href={rev.profile_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 font-semibold text-[#1A73E8] hover:underline"
                            >
                              Source <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Short Recommendation or Conflict Explanation + Select Button */}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p
                          className={`text-[11px] leading-snug ${
                            !item.is_compatible
                              ? 'text-[#D93025] font-medium'
                              : isUnresolved
                              ? 'text-[#8F4E00]'
                              : 'text-[#5F6368]'
                          }`}
                        >
                          {isUnresolved ? (
                            `Slot ${item.slot_combination} has no verified weekday/time mapping yet.`
                          ) : item.is_compatible ? (
                            <>
                              <Sparkles className="inline h-3 w-3 text-[#188038] mr-1" />
                              Recommended — fits your timetable, has no confirmed clashes, and satisfies {item.course_type_code}.
                            </>
                          ) : (
                            `Not recommended — conflicts with ${item.conflicts_with.join(', ')}. Choose a "No clash" teacher above.`
                          )}
                        </p>

                        <button
                          onClick={() => onSelectOrSwitchSection(secObj)}
                          className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                            isPicked
                              ? 'bg-[#188038] text-white hover:bg-[#137333]'
                              : item.is_compatible
                              ? 'bg-[#1A73E8] text-white hover:bg-[#1557B0]'
                              : 'border border-[#D93025]/50 bg-white text-[#D93025] hover:bg-[#FCE8E6]'
                          }`}
                        >
                          {isPicked ? 'Remove' : 'Select Slot'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: COMPACT LIST OF SELECTED COURSES BELOW SELECTORS */}
      <div className="rounded-2xl border border-[#DADCE0] bg-white p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between border-b border-[#DADCE0] pb-2">
          <span className="text-[14px] font-bold text-[#202124]">
            Selected Classes ({selectedSections.length})
          </span>
          <span className="rounded-full bg-[#E8F0FE] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#174EA6]">
            {clashReport?.total_credits ?? 0} Credits
          </span>
        </div>

        {selectedSections.length === 0 ? (
          <div className="py-4 text-center text-[12px] text-[#5F6368]">
            No classes selected yet. Pick a course and slot above to see it on the timetable.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
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
                  className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[12px] ${
                    hasClash
                      ? 'border-[#D93025] bg-[#FCE8E6]/60'
                      : 'border-[#DADCE0] bg-[#F8F9FC]'
                  }`}
                >
                  <div
                    onClick={() => onSelectCourseCode(sec.course_code)}
                    className="min-w-0 flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`rounded px-1.5 py-0.2 font-mono text-[10px] font-bold ${style.badgeBg} ${style.badgeText}`}
                      >
                        {sec.course_code}
                      </span>
                      <span className="rounded bg-white px-1 py-0.2 text-[10px] font-semibold text-[#5F6368]">
                        {sec.course_type_code}
                      </span>
                      <span className="font-mono font-bold text-[#1A73E8]">
                        {sec.slot_combination}
                      </span>
                      <span className="font-mono text-[11px] text-[#5F6368]">
                        ({sec.venue})
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-[11px] font-medium text-[#202124]">
                      {sec.faculty_name} — <span className="text-[#5F6368]">{sec.course_title}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onSelectCourseCode(sec.course_code)}
                      title="Change teacher or slot"
                      className="rounded-lg p-1.5 text-[#5F6368] hover:bg-white hover:text-[#1A73E8] cursor-pointer"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onRemoveSection(sec.id)}
                      title="Remove class"
                      className="rounded-lg p-1.5 text-[#5F6368] hover:bg-white hover:text-[#D93025] cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
