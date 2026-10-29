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
  Check,
  ChevronUp,
  ChevronDown,
  PanelLeftClose,
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
  onCollapsePanel?: () => void;
}

export const CourseTeacherSlotSelector: React.FC<CourseTeacherSlotSelectorProps> = ({
  courses,
  activeCourseCode,
  onSelectCourseCode,
  selectedSections,
  selectedSectionIds,
  clashReport,
  campus,
  onSelectOrSwitchSection,
  onRemoveSection,
  onCollapsePanel,
}) => {
  const [courseSearch, setCourseSearch] = useState('');
  const [showCourseSearchDropdown, setShowCourseSearchDropdown] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('ALL');
  const [componentTab, setComponentTab] = useState<'ALL' | 'ETH' | 'ELA' | 'OC'>('ALL');
  const [clashFreeOnly, setClashFreeOnly] = useState(false);
  const [rankedItems, setRankedItems] = useState<FacultyComparisonItem[]>([]);
  const [loadingRanks, setLoadingRanks] = useState(false);
  const [expandedConflictIds, setExpandedConflictIds] = useState<Record<number, boolean>>({});
  const [selectedTrayExpanded, setSelectedTrayExpanded] = useState(false);

  const selectedSet = useMemo(() => new Set(selectedSectionIds), [selectedSectionIds]);

  // Filter courses by search query
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
    <div className="h-full min-h-0 flex flex-col bg-white border-r border-[#DADCE0] overflow-hidden select-none">
      {/* 1. COMPACT FIXED HEADER: COURSE PICKER & FILTERS */}
      <div className="shrink-0 p-2.5 border-b border-[#DADCE0] space-y-2 bg-[#F8F9FC]/60">
        {/* Top Row: Title + Collapse Panel Button */}
        <div className="flex items-center justify-between gap-1">
          <span className="text-[12px] font-bold text-[#202124] tracking-tight">
            Course & Faculty Selector ({courses.length})
          </span>
          {onCollapsePanel && (
            <button
              onClick={onCollapsePanel}
              title="Collapse selector panel to maximize timetable space"
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-semibold text-[#5F6368] hover:bg-[#E8F0FE] hover:text-[#1A73E8] cursor-pointer"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
              <span>Collapse</span>
            </button>
          )}
        </div>

        {/* Course Dropdown + Quick Search Box */}
        <div className="grid grid-cols-12 gap-1.5 relative">
          <select
            aria-label="Choose Course"
            value={activeCourse?.course_code || ''}
            onChange={(e) => {
              onSelectCourseCode(e.target.value);
              setShowCourseSearchDropdown(false);
            }}
            className="col-span-7 rounded-lg border border-[#DADCE0] bg-white px-2 py-1 text-[11.5px] font-semibold text-[#202124] focus:border-[#1A73E8] focus:outline-none cursor-pointer truncate"
          >
            {courses.map((c) => {
              const count = selectedSections.filter((s) => s.course_code === c.course_code).length;
              return (
                <option key={c.course_code} value={c.course_code}>
                  {c.course_code} — {c.course_title} ({c.credits}Cr){count > 0 ? ` ✓[${count}]` : ''}
                </option>
              );
            })}
          </select>

          <div className="col-span-5 relative">
            <Search className="pointer-events-none absolute left-2 top-1.5 h-3 w-3 text-[#5F6368]" />
            <input
              type="text"
              value={courseSearch}
              onFocus={() => setShowCourseSearchDropdown(true)}
              onBlur={() => setTimeout(() => setShowCourseSearchDropdown(false), 180)}
              onChange={(e) => {
                setCourseSearch(e.target.value);
                setShowCourseSearchDropdown(true);
              }}
              placeholder="Find course..."
              className="w-full rounded-lg border border-[#DADCE0] bg-white pl-6 pr-2 py-1 text-[11px] text-[#202124] placeholder-[#5F6368] focus:border-[#1A73E8] focus:outline-none"
            />
          </div>

          {/* Instant Search Dropdown when typing */}
          {showCourseSearchDropdown && courseSearch.trim().length > 0 && (
            <div className="col-span-12 absolute top-8 left-0 right-0 z-30 max-h-48 overflow-y-auto rounded-lg border border-[#DADCE0] bg-white shadow-lg divide-y divide-[#DADCE0]/60">
              {filteredCourses.length === 0 ? (
                <div className="p-2 text-[11px] text-[#5F6368] text-center">No matching courses</div>
              ) : (
                filteredCourses.map((c) => (
                  <button
                    key={c.course_code}
                    onMouseDown={() => {
                      onSelectCourseCode(c.course_code);
                      setCourseSearch('');
                      setShowCourseSearchDropdown(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-left text-[11.5px] hover:bg-[#E8F0FE]/60 cursor-pointer"
                  >
                    <span className="truncate">
                      <strong className="font-mono text-[#1A73E8]">{c.course_code}</strong> — {c.course_title}
                    </span>
                    <span className="ml-2 shrink-0 text-[10px] text-[#5F6368]">{c.credits}Cr</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Horizontal Quick-Pick Course Strip */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {courses.map((c) => {
            const isActive = activeCourse?.course_code === c.course_code;
            const pickedCount = selectedSections.filter((s) => s.course_code === c.course_code).length;
            return (
              <button
                key={c.course_code}
                onClick={() => onSelectCourseCode(c.course_code)}
                title={`${c.course_code} — ${c.course_title} (${c.credits} Credits)`}
                className={`shrink-0 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors cursor-pointer ${
                  isActive
                    ? 'border-[#1A73E8] bg-[#1A73E8] text-white'
                    : pickedCount > 0
                    ? 'border-[#188038]/40 bg-[#E6F4EA] text-[#137333]'
                    : 'border-[#DADCE0] bg-white text-[#5F6368] hover:text-[#202124]'
                }`}
              >
                <span>{c.course_code}</span>
                {pickedCount > 0 && <Check className="h-2.5 w-2.5" />}
              </button>
            );
          })}
        </div>

        {/* Active Course Info + Component Tabs (ALL / ETH / ELA / OC) + Clash-Free Toggle */}
        {activeCourse && (
          <div className="rounded-lg border border-[#DADCE0] bg-white px-2.5 py-1.5 space-y-1.5">
            <div className="flex items-center justify-between gap-1.5">
              <div className="min-w-0 truncate">
                <span className="font-mono text-[11.5px] font-extrabold text-[#1A73E8] mr-1.5">
                  {activeCourse.course_code}
                </span>
                <span className="text-[12px] font-bold text-[#202124]">
                  {activeCourse.course_title}
                </span>
              </div>
              <span className="shrink-0 rounded bg-[#E8F0FE] px-1.5 py-0.5 text-[10px] font-bold text-[#174EA6]">
                {activeCourse.credits} Cr · {activeCourse.curriculum_category}
              </span>
            </div>

            <div className="flex items-center justify-between gap-1">
              <div className="inline-flex rounded-md border border-[#DADCE0] bg-[#F1F3F4] p-0.5">
                {(['ALL', 'ETH', 'ELA', 'OC'] as const).map((tab) => {
                  const count = rankedItems.filter((i) =>
                    tab === 'ALL' ? true : i.course_type_code === tab
                  ).length;
                  if (tab !== 'ALL' && count === 0) return null;
                  return (
                    <button
                      key={tab}
                      onClick={() => setComponentTab(tab)}
                      className={`rounded px-2 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                        componentTab === tab
                          ? 'bg-white text-[#1A73E8] shadow-2xs'
                          : 'text-[#5F6368] hover:text-[#202124]'
                      }`}
                    >
                      {tab === 'ALL' ? `All (${count})` : `${tab} (${count})`}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setClashFreeOnly((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold cursor-pointer ${
                  clashFreeOnly
                    ? 'border-[#188038] bg-[#E6F4EA] text-[#137333]'
                    : 'border-[#DADCE0] bg-white text-[#5F6368] hover:text-[#202124]'
                }`}
              >
                <Filter className="h-2.5 w-2.5" />
                <span>No-Clash Only</span>
              </button>
            </div>

            {/* Compact Teacher Filter Strip + Slot/Venue Filter Input */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              <button
                onClick={() => setSelectedTeacherFilter('ALL')}
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer ${
                  selectedTeacherFilter === 'ALL'
                    ? 'bg-[#1A73E8] text-white'
                    : 'bg-[#F1F3F4] text-[#5F6368] hover:text-[#202124]'
                }`}
              >
                All ({availableTeachers.length})
              </button>
              {availableTeachers.map((t) => {
                const isSelected = selectedTeacherFilter === t.name;
                return (
                  <button
                    key={t.name}
                    onClick={() => setSelectedTeacherFilter(isSelected ? 'ALL' : t.name)}
                    className={`shrink-0 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium cursor-pointer ${
                      isSelected
                        ? 'border-[#1A73E8] bg-[#E8F0FE] text-[#174EA6] font-bold'
                        : t.compatibleCount > 0
                        ? 'border-[#DADCE0] bg-white text-[#202124]'
                        : 'border-[#DADCE0] bg-[#F1F3F4] text-[#5F6368] opacity-70'
                    }`}
                  >
                    <span>{t.name}</span>
                    {t.avgRating !== null && (
                      <span className="text-[9.5px] font-bold text-[#B06000]">★{t.avgRating}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1.5 h-3 w-3 text-[#5F6368]" />
              <input
                type="text"
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Filter teacher, slot (L39+L40, A1), or venue (SJTG18, PRP329)..."
                className="w-full rounded-md border border-[#DADCE0] bg-[#F8F9FC] focus:bg-white pl-6 pr-2 py-1 text-[11px] text-[#202124] focus:border-[#1A73E8] focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. INDEPENDENTLY SCROLLABLE COMPACT TEACHER & SLOT ROWS (Only Scrollable Area in Left Panel) */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#DADCE0]/70">
        {loadingRanks ? (
          <div className="py-8 text-center text-[11.5px] text-[#5F6368]">
            Ranking teacher & slot options by compatibility...
          </div>
        ) : visibleSectionItems.length === 0 ? (
          <div className="py-8 px-3 text-center text-[11.5px] text-[#5F6368]">
            No teacher/slot options match your filter.
          </div>
        ) : (
          visibleSectionItems.map((item) => {
            const secObj = activeCourseSectionMap.get(item.section_id);
            if (!secObj) return null;
            const isPicked = selectedSet.has(item.section_id);
            const isUnresolved = secObj.verification_status === 'UNRESOLVED';
            const rev = item.faculty_review;
            const isConflictExpanded = Boolean(expandedConflictIds[item.section_id]);

            return (
              <div
                key={item.section_id}
                className={`px-2.5 py-2 transition-colors ${
                  isPicked
                    ? 'bg-[#E8F0FE]/60 border-l-[3px] border-l-[#1A73E8]'
                    : !item.is_compatible
                    ? 'bg-[#FCE8E6]/20 hover:bg-[#FCE8E6]/35'
                    : 'bg-white hover:bg-[#F8F9FC]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Left: 3-Line Compact Teacher + Slot/Venue + Clash/Review Info */}
                  <div className="min-w-0 flex-1">
                    {/* Line 1: PRIYA V · ELA */}
                    <div className="flex items-center gap-1.5 flex-wrap leading-tight">
                      <span className="text-[12px] font-bold text-[#202124] truncate">
                        {item.faculty_name}
                      </span>
                      <span className="text-[#5F6368] text-[10px]">·</span>
                      <span className="rounded bg-[#F1F3F4] px-1.5 py-0.2 font-mono text-[10px] font-bold text-[#202124]">
                        {item.course_type_code}
                      </span>
                    </div>

                    {/* Line 2: L39+L40 · SJTG18 */}
                    <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] leading-tight">
                      <span className="font-bold text-[#1A73E8]">{item.slot_combination}</span>
                      <span className="text-[#5F6368]">·</span>
                      <span className="font-semibold text-[#202124]">{item.venue}</span>
                    </div>

                    {/* Line 3: No clash · Verified review information (or compact red warning) */}
                    <div className="mt-0.5 flex items-center gap-1.5 flex-wrap text-[10.5px] leading-tight">
                      {isUnresolved ? (
                        <span className="inline-flex items-center gap-0.5 font-semibold text-[#B06000]">
                          <AlertTriangle className="h-2.5 w-2.5" /> Unverified slot
                        </span>
                      ) : item.is_compatible ? (
                        <span className="inline-flex items-center gap-0.5 font-semibold text-[#188038]">
                          <CheckCircle2 className="h-2.5 w-2.5" /> No clash
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-[#D93025]">
                          <AlertOctagon className="h-2.5 w-2.5 shrink-0" />
                          <span>
                            Clashes with {item.conflicts_with[0] || 'existing slot'}
                          </span>
                          {item.conflicts_with.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedConflictIds((prev) => ({
                                  ...prev,
                                  [item.section_id]: !prev[item.section_id],
                                }));
                              }}
                              className="underline text-[9.5px] font-bold text-[#A50E0E] cursor-pointer"
                            >
                              {isConflictExpanded ? 'Hide' : 'Details'}
                            </button>
                          )}
                        </span>
                      )}

                      <span className="text-[#5F6368]">·</span>

                      {rev && rev.total_reviews > 0 ? (
                        <span className="inline-flex items-center gap-0.5 font-semibold text-[#B06000]">
                          <Star className="h-2.5 w-2.5 fill-[#F9AB00] text-[#F9AB00]" />
                          {rev.avg_rating}/5 ({rev.total_reviews})
                        </span>
                      ) : rev?.no8am_id ? (
                        <span className="text-[#5F6368]">
                          Verified ({rev.cart_count} carts)
                        </span>
                      ) : (
                        <span className="text-[#5F6368]">No review</span>
                      )}

                      {rev?.profile_url && (
                        <a
                          href={rev.profile_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#1A73E8] hover:underline"
                        >
                          Source <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>

                    {/* Expanded Conflict Details (Only when clicked) */}
                    {!item.is_compatible && isConflictExpanded && (
                      <div className="mt-1 rounded bg-[#FCE8E6] px-2 py-1 text-[10px] text-[#A50E0E]">
                        Overlaps with: {item.conflicts_with.join('; ')}
                      </div>
                    )}
                  </div>

                  {/* Right: Compact [Select] / [Selected] Button */}
                  <button
                    onClick={() => onSelectOrSwitchSection(secObj)}
                    className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                      isPicked
                        ? 'bg-[#188038] text-white hover:bg-[#137333]'
                        : item.is_compatible
                        ? 'bg-[#1A73E8] text-white hover:bg-[#1557B0]'
                        : 'border border-[#D93025]/50 bg-white text-[#D93025] hover:bg-[#FCE8E6]'
                    }`}
                  >
                    {isPicked ? 'Selected ✓' : 'Select'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. COMPACT COLLAPSIBLE SELECTED CLASSES PREVIEW FOOTER (No Nested Permanent Scrollbar) */}
      <div className="shrink-0 border-t border-[#DADCE0] bg-[#F8F9FC] px-2.5 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setSelectedTrayExpanded((e) => !e)}
            className="flex items-center gap-1.5 text-[11.5px] font-bold text-[#202124] hover:text-[#1A73E8] cursor-pointer"
          >
            <span>Selected ({selectedSections.length} sections)</span>
            <span className="rounded-full bg-[#E8F0FE] px-1.5 py-0.2 font-mono text-[10px] font-bold text-[#174EA6]">
              {clashReport?.total_credits ?? 0} Cr
            </span>
            {selectedTrayExpanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-[#5F6368]" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5 text-[#5F6368]" />
            )}
          </button>

          <button
            onClick={() => setSelectedTrayExpanded((e) => !e)}
            className="text-[10.5px] font-semibold text-[#1A73E8] hover:underline cursor-pointer"
          >
            {selectedTrayExpanded ? 'Collapse' : 'Manage'}
          </button>
        </div>

        {/* Compact 1-Line Chip Strip when Collapsed */}
        {!selectedTrayExpanded && selectedSections.length > 0 && (
          <div className="mt-1 flex items-center gap-1 overflow-x-auto pb-0.5">
            {selectedSections.map((sec) => {
              const hasClash = clashingIdsSet.has(sec.id);
              return (
                <button
                  key={sec.id}
                  onClick={() => onSelectCourseCode(sec.course_code)}
                  title={`${sec.course_code} [${sec.course_type_code}] — ${sec.faculty_name} (${sec.venue} · ${sec.slot_combination})`}
                  className={`shrink-0 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9.5px] font-semibold cursor-pointer ${
                    hasClash
                      ? 'border-[#D93025] bg-[#FCE8E6] text-[#D93025]'
                      : 'border-[#DADCE0] bg-white text-[#202124] hover:border-[#1A73E8]'
                  }`}
                >
                  <span className="font-bold text-[#1A73E8]">{sec.course_code}</span>
                  <span className="text-[#5F6368]">{sec.course_type_code}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Expandable Selected Classes Drawer List */}
        {selectedTrayExpanded && (
          <div className="mt-1.5 max-h-44 overflow-y-auto divide-y divide-[#DADCE0]/60 rounded-lg border border-[#DADCE0] bg-white">
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
                  className={`flex items-center justify-between gap-1.5 px-2 py-1 text-[11px] ${
                    hasClash ? 'bg-[#FCE8E6]/60' : 'hover:bg-[#F8F9FC]'
                  }`}
                >
                  <div
                    onClick={() => onSelectCourseCode(sec.course_code)}
                    className="min-w-0 flex-1 cursor-pointer truncate"
                  >
                    <span
                      className={`rounded px-1 py-0.2 font-mono text-[9.5px] font-bold mr-1 ${style.badgeBg} ${style.badgeText}`}
                    >
                      {sec.course_code}·{sec.course_type_code}
                    </span>
                    <span className="font-semibold text-[#202124]">{sec.faculty_name}</span>{' '}
                    <span className="font-mono text-[10px] text-[#5F6368]">
                      ({sec.venue} · {sec.slot_combination})
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => onSelectCourseCode(sec.course_code)}
                      title="Change teacher or slot"
                      className="rounded p-1 text-[#5F6368] hover:text-[#1A73E8] cursor-pointer"
                    >
                      <ArrowRightLeft className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => onRemoveSection(sec.id)}
                      title="Remove class"
                      className="rounded p-1 text-[#5F6368] hover:text-[#D93025] cursor-pointer"
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
