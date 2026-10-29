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
  Layers,
  ShieldAlert,
} from 'lucide-react';
import {
  ClashReport,
  Course,
  CourseSection,
} from '../../types/ffcs';

interface CourseSelectionPanelProps {
  courses: Course[];
  selectedSectionIds: number[];
  lockedSectionIds: number[];
  clashReport: ClashReport | null;
  preferredFaculty: string[];
  avoidedFaculty: string[];
  onToggleSection: (section: CourseSection) => void;
  onToggleLock: (sectionId: number) => void;
  onTogglePreferredFaculty: (facultyName: string) => void;
  onToggleAvoidedFaculty: (facultyName: string) => void;
  onOpenFacultyComparison: (courseCode: string) => void;
  onSelectPair: (ethId: number, elaId: number) => void;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Courses' },
  { id: 'PCC', label: 'Programme Core (PCC)' },
  { id: 'UCC', label: 'University Core (UCC)' },
  { id: 'Programme Elective', label: 'Programme Electives' },
  { id: 'University Elective', label: 'University Electives' },
  { id: 'LAB_HAVING', label: 'Courses with Labs (ETL/ELA)' },
];

export const CourseSelectionPanel: React.FC<CourseSelectionPanelProps> = ({
  courses,
  selectedSectionIds,
  lockedSectionIds,
  clashReport,
  preferredFaculty,
  avoidedFaculty,
  onToggleSection,
  onToggleLock,
  onTogglePreferredFaculty,
  onToggleAvoidedFaculty,
  onOpenFacultyComparison,
  onSelectPair,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [compatFilter, setCompatFilter] = useState<'all' | 'compatible' | 'clashes'>('all');
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({
    BACSE104: true,
    BAITE101: true,
    BAITE102: true,
  });

  const selectedSet = new Set(selectedSectionIds);
  const lockedSet = new Set(lockedSectionIds);
  const prefSet = new Set(preferredFaculty.map((f) => f.toLowerCase()));
  const avoidSet = new Set(avoidedFaculty.map((f) => f.toLowerCase()));

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
  }, [courses, searchQuery, categoryFilter]);

  const toggleExpand = (code: string) => {
    setExpandedCodes((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800/90 bg-slate-900/60 shadow-xl">
      {/* Search and Filter Controls */}
      <div className="border-b border-slate-800 p-4 space-y-3 bg-slate-900/90 rounded-t-2xl">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-indigo-400" />
            Course Catalog & Faculty Sections
          </h2>
          <span className="text-[11px] text-slate-400">
            {filteredCourses.length} of {courses.length} Courses
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by course code, title, faculty name, slot (e.g. A1, L43), or venue (SJT, PRP)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-700/80 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                categoryFilter === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Section Compatibility Filter */}
        <div className="flex items-center justify-between pt-1 text-[11px]">
          <span className="text-slate-400">Section View Filter:</span>
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5">
            {[
              { id: 'all', label: 'All Sections' },
              { id: 'compatible', label: 'Compatible Only' },
              { id: 'clashes', label: 'Show Clashes Only' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setCompatFilter(f.id as any)}
                className={`rounded-md px-2 py-0.5 font-medium transition cursor-pointer ${
                  compatFilter === f.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Course Accordion List */}
      <div className="divide-y divide-slate-800/70 max-h-[780px] overflow-y-auto">
        {filteredCourses.map((course) => {
          const isExpanded = !!expandedCodes[course.course_code];
          const courseSelectedSecs = course.sections.filter((s) => selectedSet.has(s.id));
          const hasEthSelected = courseSelectedSecs.some((s) => s.course_type_code === 'ETH');
          const hasElaSelected = courseSelectedSecs.some((s) => s.course_type_code === 'ELA');
          const hasOcSelected = courseSelectedSecs.some((s) => s.course_type_code === 'OC');

          const isComplete =
            course.course_type === 'OC'
              ? hasOcSelected
              : course.course_type === 'ETL'
              ? hasEthSelected && hasElaSelected
              : courseSelectedSecs.length > 0;

          const q = searchQuery.trim().toLowerCase();
          const filterSections = (secs: CourseSection[]) => {
            return secs.filter((s) => {
              const comp = clashReport?.section_compatibility?.[s.id];
              if (compatFilter === 'compatible' && comp && !comp.compatible && !selectedSet.has(s.id)) {
                return false;
              }
              if (compatFilter === 'clashes' && comp && comp.compatible) {
                return false;
              }
              if (!q) return true;
              if (
                course.course_code.toLowerCase().includes(q) ||
                course.course_title.toLowerCase().includes(q)
              ) {
                return true;
              }
              return (
                s.faculty_name.toLowerCase().includes(q) ||
                s.slot_combination.toLowerCase().includes(q) ||
                s.venue.toLowerCase().includes(q)
              );
            });
          };

          const ethSections = filterSections(
            course.sections.filter((s) => s.course_type_code === 'ETH')
          );
          const elaSections = filterSections(
            course.sections.filter((s) => s.course_type_code === 'ELA')
          );
          const ocSections = filterSections(
            course.sections.filter((s) => s.course_type_code === 'OC')
          );

          return (
            <div key={course.course_code} className="bg-slate-900/30">
              {/* Course Header */}
              <div className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-slate-800/40 transition">
                <button
                  onClick={() => toggleExpand(course.course_code)}
                  className="flex flex-1 items-start gap-2.5 text-left cursor-pointer"
                >
                  <div className="mt-0.5 text-slate-400">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-indigo-400">
                        {course.course_code}
                      </span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                        {course.curriculum_category}
                      </span>
                      <span className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                        {course.credits} Cr ({course.lecture_hours}-{course.tutorial_hours}-
                        {course.practical_hours})
                      </span>
                      {course.verification_status === 'MISSING_DATA' && (
                        <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                          Unresolved Batch Slots
                        </span>
                      )}
                      {course.verification_status === 'INFERRED' && (
                        <span className="rounded bg-sky-500/15 border border-sky-500/30 px-1.5 py-0.5 text-[10px] text-sky-300">
                          Inferred Code
                        </span>
                      )}
                      {isComplete && (
                        <span className="flex items-center gap-1 rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                          <Check className="h-3 w-3" /> Complete
                        </span>
                      )}
                      {!isComplete && courseSelectedSecs.length > 0 && (
                        <span className="rounded bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                          1/2 Component Selected
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-white truncate">
                      {course.course_title}
                    </div>
                    {courseSelectedSecs.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {courseSelectedSecs.map((sel) => (
                          <span
                            key={sel.id}
                            className="inline-flex items-center gap-1 rounded bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-[10px] text-indigo-200"
                          >
                            <span className="font-mono font-bold">{sel.course_type_code}:</span>
                            <span>{sel.faculty_name}</span>
                            <span className="font-mono text-indigo-300">
                              ({sel.slot_combination})
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => onOpenFacultyComparison(course.course_code)}
                  className="flex items-center gap-1 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1.5 text-[11px] font-medium text-indigo-300 hover:bg-indigo-500/20 transition shrink-0 cursor-pointer"
                  title="Compare all faculty options & recommendations side by side"
                >
                  <Scale className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Compare Faculty</span>
                </button>
              </div>

              {/* Expanded Sections List */}
              {isExpanded && (
                <div className="border-t border-slate-800/60 bg-slate-950/60 px-4 py-3 space-y-4">
                  {course.verification_note && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-200 flex items-start gap-2">
                      <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{course.verification_note}</span>
                    </div>
                  )}

                  {/* Theory (ETH) Sections */}
                  {ethSections.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-indigo-300">
                        <span>Embedded Theory (ETH) Sections ({ethSections.length})</span>
                        <span className="text-[10px] text-slate-500">Select 1 ETH section</span>
                      </div>
                      <div className="space-y-1.5">
                        {ethSections.map((sec) => (
                          <SectionRowItem
                            key={sec.id}
                            section={sec}
                            isSelected={selectedSet.has(sec.id)}
                            isLocked={lockedSet.has(sec.id)}
                            compat={clashReport?.section_compatibility?.[sec.id]}
                            isPreferredFac={prefSet.has(sec.faculty_name.toLowerCase())}
                            isAvoidedFac={avoidSet.has(sec.faculty_name.toLowerCase())}
                            onToggleSection={() => onToggleSection(sec)}
                            onToggleLock={() => onToggleLock(sec.id)}
                            onTogglePref={() => onTogglePreferredFaculty(sec.faculty_name)}
                            onToggleAvoid={() => onToggleAvoidedFaculty(sec.faculty_name)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lab (ELA) Sections */}
                  {elaSections.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-emerald-300">
                        <span>Embedded Lab (ELA) Sections ({elaSections.length})</span>
                        <span className="text-[10px] text-slate-500">Select 1 ELA section</span>
                      </div>
                      <div className="space-y-1.5">
                        {elaSections.map((sec) => (
                          <SectionRowItem
                            key={sec.id}
                            section={sec}
                            isSelected={selectedSet.has(sec.id)}
                            isLocked={lockedSet.has(sec.id)}
                            compat={clashReport?.section_compatibility?.[sec.id]}
                            isPreferredFac={prefSet.has(sec.faculty_name.toLowerCase())}
                            isAvoidedFac={avoidSet.has(sec.faculty_name.toLowerCase())}
                            onToggleSection={() => onToggleSection(sec)}
                            onToggleLock={() => onToggleLock(sec.id)}
                            onTogglePref={() => onTogglePreferredFaculty(sec.faculty_name)}
                            onToggleAvoid={() => onToggleAvoidedFaculty(sec.faculty_name)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Online (OC) Sections */}
                  {ocSections.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-sky-300">
                        <span>Online Course (OC) Faculty Options ({ocSections.length})</span>
                        <span className="text-[10px] text-slate-500">No slot clash</span>
                      </div>
                      <div className="space-y-1.5">
                        {ocSections.map((sec) => (
                          <SectionRowItem
                            key={sec.id}
                            section={sec}
                            isSelected={selectedSet.has(sec.id)}
                            isLocked={lockedSet.has(sec.id)}
                            compat={clashReport?.section_compatibility?.[sec.id]}
                            isPreferredFac={prefSet.has(sec.faculty_name.toLowerCase())}
                            isAvoidedFac={avoidSet.has(sec.faculty_name.toLowerCase())}
                            onToggleSection={() => onToggleSection(sec)}
                            onToggleLock={() => onToggleLock(sec.id)}
                            onTogglePref={() => onTogglePreferredFaculty(sec.faculty_name)}
                            onToggleAvoid={() => onToggleAvoidedFaculty(sec.faculty_name)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface SectionRowItemProps {
  section: CourseSection;
  isSelected: boolean;
  isLocked: boolean;
  compat?: {
    status: 'COMPATIBLE' | 'CLASH' | 'CLASH_LOCKED' | 'UNRESOLVED';
    compatible: boolean;
    conflicts_with: string[];
  };
  isPreferredFac: boolean;
  isAvoidedFac: boolean;
  onToggleSection: () => void;
  onToggleLock: () => void;
  onTogglePref: () => void;
  onToggleAvoid: () => void;
}

const SectionRowItem: React.FC<SectionRowItemProps> = ({
  section,
  isSelected,
  isLocked,
  compat,
  isPreferredFac,
  isAvoidedFac,
  onToggleSection,
  onToggleLock,
  onTogglePref,
  onToggleAvoid,
}) => {
  const status = compat?.status || 'COMPATIBLE';
  const conflicts = compat?.conflicts_with || [];
  const rev = section.faculty_review;

  let rowBorder = 'border-slate-800/90 bg-slate-900/70 hover:border-slate-700';
  if (isSelected) {
    rowBorder =
      status === 'CLASH' || status === 'CLASH_LOCKED'
        ? 'border-rose-500 bg-rose-950/30'
        : 'border-indigo-500 bg-indigo-950/30';
  } else if (status === 'CLASH' || status === 'CLASH_LOCKED') {
    rowBorder = 'border-rose-900/50 bg-slate-950/40 opacity-75';
  }

  return (
    <div
      className={`rounded-xl border p-2.5 text-xs transition flex flex-wrap items-center justify-between gap-2 ${rowBorder}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-white">{section.faculty_name}</span>

          {/* Verified No8AM Rating Badge */}
          {rev && rev.avg_rating !== null && rev.avg_rating !== undefined && rev.total_reviews > 0 ? (
            <span
              className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
              title={`Verified on no8am.site: ${rev.avg_rating.toFixed(2)}/5 across ${rev.total_reviews} reviews (${rev.cart_count} carts)`}
            >
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              {rev.avg_rating.toFixed(2)} ({rev.total_reviews})
            </span>
          ) : (
            <span
              className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400"
              title={rev ? `Unrated on no8am.site (${rev.cart_count} FFCS carts)` : 'No rating'}
            >
              No8AM: Unrated {rev && rev.cart_count > 0 ? `• ${rev.cart_count} carts` : ''}
            </span>
          )}

          {/* Faculty Preference Toggles */}
          <button
            onClick={onTogglePref}
            className={`rounded p-1 transition cursor-pointer ${
              isPreferredFac
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'text-slate-500 hover:text-emerald-400'
            }`}
            title="Mark faculty as Preferred"
          >
            <ThumbsUp className="h-3 w-3" />
          </button>
          <button
            onClick={onToggleAvoid}
            className={`rounded p-1 transition cursor-pointer ${
              isAvoidedFac
                ? 'bg-rose-500/20 text-rose-300'
                : 'text-slate-500 hover:text-rose-400'
            }`}
            title="Mark faculty as Avoided"
          >
            <Ban className="h-3 w-3" />
          </button>
        </div>

        {/* Slot, Venue & Compatibility Status */}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded bg-slate-950 px-1.5 py-0.5 font-mono font-bold text-indigo-300 border border-slate-800">
            {section.slot_combination}
          </span>
          <span className="font-mono text-slate-300">Venue: {section.venue}</span>

          {status === 'COMPATIBLE' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
              <CheckCircle2 className="h-3 w-3" /> Fits Timetable
            </span>
          )}
          {status === 'UNRESOLVED' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400">
              <AlertTriangle className="h-3 w-3" /> Unresolved Slot
            </span>
          )}
          {(status === 'CLASH' || status === 'CLASH_LOCKED') && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-400">
              <AlertTriangle className="h-3 w-3" />
              Clashes with {conflicts.join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isSelected && (
          <button
            onClick={onToggleLock}
            className={`rounded-lg p-1.5 border transition cursor-pointer ${
              isLocked
                ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title={isLocked ? 'Unlock preferred section' : 'Lock preferred section'}
          >
            {isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
          </button>
        )}

        <button
          onClick={onToggleSection}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
            isSelected
              ? 'bg-indigo-600 text-white hover:bg-rose-600'
              : status === 'CLASH_LOCKED'
              ? 'border border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50'
              : status === 'CLASH'
              ? 'border border-amber-500/40 bg-slate-800 text-amber-200 hover:bg-slate-700'
              : 'bg-slate-800 text-slate-200 hover:bg-indigo-600 hover:text-white'
          }`}
        >
          {isSelected ? 'Selected' : 'Select'}
        </button>
      </div>
    </div>
  );
};
