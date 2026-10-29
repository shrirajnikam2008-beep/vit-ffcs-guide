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
  lastUpdatedLabel,
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
  const [expandedRowDetails, setExpandedRowDetails] = useState<Record<number, boolean>>({});
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
    setComponentTab('ALL');
  }, [activeCourse?.course_code]);

  // Automatically rank compatible sections first
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
                      <strong className="font-mono text-[#1A73E8]">{c.course_code}</strong> — {c.course_title}
                    </span>
                    <span className="ml-1.5 shrink-0 text-[9.5px] text-[#64748B]">{c.credits}Cr</span>
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
                {c.course_code} — {c.course_title} ({c.credits}Cr){count > 0 ? ` ✓[${count}]` : ''}
              </option>
            );
          })}
        </select>

        {/* Horizontal Course Pill Strip */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {courses.map((c) => {
            const isActive = activeCourse?.course_code === c.course_code;
            const pickedCount = selectedSections.filter((s) => s.course_code === c.course_code).length;
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

        {/* Selected Course Compact Filters (Component Tabs + Faculty Selector + Slot Filter) */}
        {activeCourse && (
          <div className="pt-1 border-t border-[#CBD5E1]/70 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <div className="inline-flex rounded border border-[#CBD5E1] bg-white p-0.5">
                {(['ALL', 'ETH', 'ELA', 'OC'] as const).map((tab) => {
                  const count = rankedItems.filter((i) =>
                    tab === 'ALL' ? true : i.course_type_code === tab
                  ).length;
                  if (tab !== 'ALL' && count === 0) return null;
                  return (
                    <button
                      key={tab}
                      onClick={() => setComponentTab(tab)}
                      className={`rounded px-1.5 py-0.5 text-[9.5px] font-bold transition-colors cursor-pointer ${
                        componentTab === tab
                          ? 'bg-[#E8F0FE] text-[#1A73E8]'
                          : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      {tab === 'ALL' ? `All (${count})` : `${tab} (${count})`}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setClashFreeOnly((v) => !v)}
                className={`inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[9.5px] font-bold cursor-pointer ${
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
        ) : visibleSectionItems.length === 0 ? (
          <div className="py-6 px-2 text-center text-[11px] text-[#64748B]">
            No sections match your filter.
          </div>
        ) : (
          visibleSectionItems.map((item) => {
            const secObj = activeCourseSectionMap.get(item.section_id);
            if (!secObj) return null;
            const isPicked = selectedSet.has(item.section_id);
            const isUnresolved = secObj.verification_status === 'UNRESOLVED';
            const rev = item.faculty_review;
            const isExpanded = Boolean(expandedRowDetails[item.section_id]);

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
                <div className="flex items-center justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    {/* Row 1: Status Dot + Teacher Name + Type + Compact Review Preview */}
                    <div className="flex items-center gap-1 leading-tight">
                      {/* Status Dot: Green (No clash), Red (Confirmed clash), Amber (Unresolved) */}
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
                      <span className="shrink-0 rounded bg-[#F1F5F9] px-1 py-0.2 font-mono text-[9px] font-bold text-[#334155]">
                        {item.course_type_code}
                      </span>
                      {rev && rev.total_reviews > 0 && (
                        <span className="shrink-0 inline-flex items-center gap-0.5 text-[9.5px] font-bold text-[#B45309]">
                          <Star className="h-2.5 w-2.5 fill-[#F59E0B] text-[#F59E0B]" />
                          {rev.avg_rating}
                        </span>
                      )}
                    </div>

                    {/* Row 2: Slot · Venue · Concise Status + Optional Details Toggle */}
                    <div className="mt-0.5 flex items-center gap-1 flex-wrap font-mono text-[10px] leading-tight">
                      <span className="font-bold text-[#1A73E8]">{item.slot_combination}</span>
                      <span className="text-[#94A3B8]">·</span>
                      <span className="font-semibold text-[#1E293B]">{item.venue}</span>
                      <span className="text-[#94A3B8]">·</span>
                      {isUnresolved ? (
                        <span className="font-sans text-[9.5px] font-semibold text-[#B45309]">
                          Unresolved
                        </span>
                      ) : item.is_compatible ? (
                        <span className="font-sans text-[9.5px] font-semibold text-[#16A34A]">
                          No clash
                        </span>
                      ) : (
                        <span className="font-sans text-[9.5px] font-semibold text-[#DC2626]">
                          Clash ({item.conflicts_with[0]?.split(' ')[0] || 'Slot'})
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedRowDetails((prev) => ({
                            ...prev,
                            [item.section_id]: !prev[item.section_id],
                          }));
                        }}
                        className="ml-auto font-sans text-[9px] font-semibold text-[#64748B] hover:text-[#1A73E8] underline cursor-pointer"
                      >
                        {isExpanded ? 'Less' : 'Info'}
                      </button>
                    </div>

                    {/* On-Demand Expanded Review & Clash Details */}
                    {isExpanded && (
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
          })
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
