import React, { useState, useMemo } from 'react';
import {
  Lock,
  Unlock,
  Trash2,
  Users,
  ArrowRightLeft,
  ExternalLink,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Star,
  MapPin,
  Clock,
  FileSpreadsheet,
  X,
  Plus,
  Info,
} from 'lucide-react';
import {
  ClashReport,
  Course,
  CourseSection,
  PeriodHeader,
  SlotOccurrence,
} from '../types/ffcs';
import {
  CalendarViewMode,
  ClashFilterMode,
  SessionFilterMode,
} from './TimetableToolbar';
import { SlotHeader } from './SlotHeader';
import { TimetableClassCard } from './TimetableClassCard';
import { getSubjectColorStyle } from '../lib/subjectColors';

interface TimetableGridProps {
  courses: Course[];
  selectedSections: CourseSection[];
  lockedSectionIds: number[];
  periodHeaders: PeriodHeader[];
  slotMap: Record<string, SlotOccurrence[]>;
  clashReport: ClashReport | null;
  viewMode: CalendarViewMode;
  showVenues: boolean;
  fitToPage: boolean;
  sessionFilter: SessionFilterMode;
  clashFilter: ClashFilterMode;
  showSaturday: boolean;
  focusedDay: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
  onRemoveSection: (sectionId: number) => void;
  onToggleLock: (sectionId: number) => void;
  onSwitchSection: (oldSectionId: number, newSectionId: number) => void;
  onOpenFacultyComparison: (courseCode: string) => void;
  onClickEmptyCell: (day: string, period: number, slotHint: string) => void;
}

const ALL_DAYS: Array<{ code: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'; label: string; full: string }> = [
  { code: 'MON', label: 'MON', full: 'Monday' },
  { code: 'TUE', label: 'TUE', full: 'Tuesday' },
  { code: 'WED', label: 'WED', full: 'Wednesday' },
  { code: 'THU', label: 'THU', full: 'Thursday' },
  { code: 'FRI', label: 'FRI', full: 'Friday' },
  { code: 'SAT', label: 'SAT', full: 'Saturday' },
];

// Authoritative VIT Vellore slot cell placeholders
const VELLORE_CELL_PLACEHOLDERS: Record<string, Record<number, string>> = {
  MON: { 1: 'A1 / L1', 2: 'F1 / L2', 3: 'D1 / L3', 4: 'TB1 / L4', 5: 'TG1 / L5', 6: 'L6', 7: 'A2 / L31', 8: 'F2 / L32', 9: 'D2 / L33', 10: 'TB2 / L34', 11: 'TG2 / L35', 12: 'V3 / L36' },
  TUE: { 1: 'B1 / L7', 2: 'G1 / L8', 3: 'E1 / L9', 4: 'TC1 / L10', 5: 'TAA1 / L11', 6: 'L12', 7: 'B2 / L37', 8: 'G2 / L38', 9: 'E2 / L39', 10: 'TC2 / L40', 11: 'TAA2 / L41', 12: 'V4 / L42' },
  WED: { 1: 'C1 / L13', 2: 'A1 / L14', 3: 'F1 / L15', 4: 'V1 / TDD1 / L16', 5: 'V2 / L17', 6: 'L18', 7: 'C2 / L43', 8: 'A2 / L44', 9: 'F2 / L45', 10: 'TD2 / L46', 11: 'TBB2 / L47', 12: 'V5 / L48' },
  THU: { 1: 'D1 / L19', 2: 'B1 / L20', 3: 'G1 / L21', 4: 'TE1 / L22', 5: 'TCC1 / TBB1 / L23', 6: 'L24', 7: 'D2 / L49', 8: 'B2 / L50', 9: 'G2 / L51', 10: 'TE2 / L52', 11: 'TCC2 / L53', 12: 'V6 / L54' },
  FRI: { 1: 'E1 / L25', 2: 'C1 / L26', 3: 'TA1 / L27', 4: 'TF1 / L28', 5: 'TD1 / L29', 6: 'L30', 7: 'E2 / L55', 8: 'C2 / L56', 9: 'TA2 / L57', 10: 'TF2 / L58', 11: 'TDD2 / L59', 12: 'V7 / L60' },
  SAT: { 1: 'SAT-1', 2: 'SAT-2', 3: 'SAT-3', 4: 'SAT-4', 5: 'SAT-5', 6: 'SAT-6', 7: 'SAT-7', 8: 'SAT-8', 9: 'SAT-9', 10: 'SAT-10', 11: 'SAT-11', 12: 'SAT-12' },
};

interface CellEntry {
  section: CourseSection;
  occurrence: SlotOccurrence;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  courses,
  selectedSections,
  lockedSectionIds,
  periodHeaders,
  clashReport,
  viewMode,
  showVenues,
  fitToPage,
  sessionFilter,
  clashFilter,
  showSaturday,
  focusedDay,
  onRemoveSection,
  onToggleLock,
  onSwitchSection,
  onOpenFacultyComparison,
  onClickEmptyCell,
}) => {
  const [inspectedSection, setInspectedSection] = useState<CourseSection | null>(null);
  const [draggingSection, setDraggingSection] = useState<CourseSection | null>(null);

  const lockedSet = useMemo(() => new Set(lockedSectionIds), [lockedSectionIds]);

  // Identify confirmed clashing section IDs
  const clashingSectionIds = useMemo(() => {
    const s = new Set<number>();
    if (!clashReport) return s;
    for (const c of clashReport.clashes) {
      if (c.is_confirmed && c.severity === 'ERROR') {
        if (c.course_a_section_id) s.add(c.course_a_section_id);
        if (c.course_b_section_id) s.add(c.course_b_section_id);
      }
    }
    return s;
  }, [clashReport]);

  // Filter visible sections according to sessionFilter and clashFilter
  const filteredSections = useMemo(() => {
    return selectedSections.filter((sec) => {
      const hasClash = clashingSectionIds.has(sec.id);
      const isUnresolved = sec.verification_status === 'UNRESOLVED';

      if (clashFilter === 'no_clashes' && (hasClash || isUnresolved)) return false;
      if (clashFilter === 'confirmed_clashes' && !hasClash) return false;
      if (clashFilter === 'unresolved' && !isUnresolved) return false;

      if (sessionFilter === 'morning') {
        const occs = sec.parsed_slot?.occurrences ?? [];
        if (sec.course_type_code === 'ETH' && occs.some((o) => o.period > 6)) return false;
      } else if (sessionFilter === 'evening') {
        const occs = sec.parsed_slot?.occurrences ?? [];
        if (sec.course_type_code === 'ETH' && occs.some((o) => o.period <= 6)) return false;
      }
      return true;
    });
  }, [selectedSections, clashingSectionIds, clashFilter, sessionFilter]);

  // Build grid cell map: gridCells[day][period] -> CellEntry[]
  const { gridCells, nonGridSections } = useMemo(() => {
    const cells: Record<string, Record<number, CellEntry[]>> = {};
    for (const d of ALL_DAYS) {
      cells[d.code] = {};
      for (let p = 1; p <= 12; p++) {
        cells[d.code][p] = [];
      }
    }
    const nonGrid: CourseSection[] = [];

    for (const sec of filteredSections) {
      const occs = sec.parsed_slot?.occurrences ?? [];
      if (occs.length === 0) {
        nonGrid.push(sec);
      } else {
        for (const occ of occs) {
          if (cells[occ.day] && cells[occ.day][occ.period]) {
            cells[occ.day][occ.period].push({ section: sec, occurrence: occ });
          }
        }
      }
    }
    return { gridCells: cells, nonGridSections: nonGrid };
  }, [filteredSections]);

  // Compute valid drop target cells when dragging a section (strictly official VIT sections for that same course+component)
  const validDropTargetMap = useMemo(() => {
    const map: Record<string, CourseSection> = {};
    if (!draggingSection) return map;
    const parentCourse = courses.find((c) => c.course_code === draggingSection.course_code);
    if (!parentCourse) return map;

    const candidateSections = parentCourse.sections.filter(
      (s) =>
        s.is_active &&
        s.course_type_code === draggingSection.course_type_code &&
        s.id !== draggingSection.id
    );

    for (const cand of candidateSections) {
      for (const occ of cand.parsed_slot?.occurrences ?? []) {
        const key = `${occ.day}_${occ.period}`;
        if (!map[key]) {
          map[key] = cand;
        }
      }
    }
    return map;
  }, [draggingSection, courses]);

  // Visible days based on viewMode and showSaturday
  const visibleDays = useMemo(() => {
    const base = showSaturday ? ALL_DAYS : ALL_DAYS.slice(0, 5);
    if (viewMode === 'day') {
      return base.filter((d) => d.code === focusedDay);
    }
    if (viewMode === '3day') {
      const idx = Math.max(
        0,
        base.findIndex((d) => d.code === focusedDay)
      );
      return base.slice(idx, Math.min(base.length, idx + 3));
    }
    return base;
  }, [viewMode, showSaturday, focusedDay]);

  // Alternate official sections for inspected course modal
  const inspectedAlternatives = useMemo(() => {
    if (!inspectedSection) return [];
    const course = courses.find((c) => c.course_code === inspectedSection.course_code);
    if (!course) return [];
    return course.sections.filter(
      (s) => s.is_active && s.course_type_code === inspectedSection.course_type_code
    );
  }, [inspectedSection, courses]);

  const renderPeriodCell = (dayCode: string, periodNum: number) => {
    const entries = gridCells[dayCode]?.[periodNum] ?? [];
    const placeholder = VELLORE_CELL_PLACEHOLDERS[dayCode]?.[periodNum] ?? '';
    const dropKey = `${dayCode}_${periodNum}`;
    const validDropCandidate = validDropTargetMap[dropKey];
    const hasMultiCollision = entries.length > 1;

    return (
      <td
        key={`${dayCode}_${periodNum}`}
        onDragOver={(e) => {
          if (validDropCandidate) {
            e.preventDefault();
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (draggingSection && validDropCandidate) {
            onSwitchSection(draggingSection.id, validDropCandidate.id);
            setDraggingSection(null);
          }
        }}
        onClick={() => {
          if (entries.length === 0) {
            onClickEmptyCell(dayCode, periodNum, placeholder);
          }
        }}
        className={`relative border-b border-r border-[#DADCE0] dark:border-[#3C4043] p-2 align-top transition-colors ${
          fitToPage ? 'min-w-[122px] w-[122px] min-h-[104px]' : 'min-w-[156px] w-[156px] min-h-[122px]'
        } ${
          validDropCandidate
            ? 'bg-[#E6F4EA] dark:bg-[#143321]/70 ring-2 ring-inset ring-[#188038]'
            : hasMultiCollision
            ? 'bg-[#FCE8E6]/60 dark:bg-[#5C1E1B]/30'
            : entries.length === 0
            ? 'bg-white dark:bg-[#1E1F20] hover:bg-[#F8F9FC] dark:hover:bg-[#282A2C] cursor-pointer group'
            : 'bg-white dark:bg-[#1E1F20]'
        }`}
      >
        {/* Empty cell slot watermark + quick add icon on hover */}
        {entries.length === 0 && (
          <div className="flex h-full flex-col items-center justify-between py-1 text-center select-none">
            <span className="font-mono text-[10px] font-medium text-[#5F6368]/55 dark:text-[#9AA0A6]/45">
              {placeholder}
            </span>
            {validDropCandidate ? (
              <span className="rounded bg-[#188038] px-1.5 py-0.5 text-[9px] font-bold text-white">
                Drop: {validDropCandidate.slot_combination}
              </span>
            ) : (
              <span className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-0.5 rounded-md bg-[#E8F0FE] dark:bg-[#1E3A5F] px-1.5 py-0.5 text-[10px] font-semibold text-[#1A73E8] dark:text-[#8AB4F8] transition-opacity">
                <Plus className="h-2.5 w-2.5" /> Add
              </span>
            )}
          </div>
        )}

        {/* Render Class Cards inside Cell */}
        {entries.length > 0 && (
          <div className="space-y-1">
            {entries.map(({ section, occurrence }) => (
              <TimetableClassCard
                key={`${section.id}_${occurrence.slot_code}_${occurrence.period}`}
                section={section}
                occurrence={occurrence}
                isLocked={lockedSet.has(section.id)}
                hasConfirmedClash={clashingSectionIds.has(section.id) || hasMultiCollision}
                hasUnresolvedWarning={section.verification_status === 'UNRESOLVED'}
                showVenues={showVenues}
                compact={fitToPage}
                onClick={() => setInspectedSection(section)}
                onDragStartSection={(sec) => setDraggingSection(sec)}
                onDragEndSection={() => setDraggingSection(null)}
              />
            ))}
          </div>
        )}
      </td>
    );
  };

  return (
    <div className="bg-white dark:bg-[#1E1F20] rounded-b-2xl">
      {/* Drag-and-drop helper banner when dragging a class */}
      {draggingSection && (
        <div className="bg-[#E6F4EA] dark:bg-[#143321] border-b border-[#188038]/30 px-4 py-2 text-[12px] font-medium text-[#137333] dark:text-[#81C995] flex items-center justify-between">
          <span>
            Dragging <strong>{draggingSection.course_code}</strong> ({draggingSection.slot_combination}) — Green cells show official VIT sections you can drop onto.
          </span>
          <button
            onClick={() => setDraggingSection(null)}
            className="text-[11px] font-bold underline cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* VIEW 1: WEEK / 3-DAY / DAY GRID VIEW */}
      {(viewMode === 'week' || viewMode === '3day' || viewMode === 'day') && (
        <div className="overflow-x-auto">
          <table className="min-w-max w-full border-collapse">
            <SlotHeader periodHeaders={periodHeaders} fitToPage={fitToPage} />
            <tbody>
              {visibleDays.map((dayObj) => (
                <tr key={dayObj.code}>
                  {/* Sticky Left Day Label */}
                  <td className="sticky left-0 z-10 w-20 min-w-[78px] border-b border-r border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-2.5 py-3.5 text-center align-middle select-none shadow-[1px_0_0_0_#DADCE0]">
                    <div className="text-[13px] font-extrabold tracking-wider text-[#202124] dark:text-[#E3E3E3]">
                      {dayObj.label}
                    </div>
                    <div className="text-[11px] font-medium text-[#5F6368] dark:text-[#9AA0A6]">
                      {dayObj.full}
                    </div>
                  </td>

                  {/* Morning Periods 1..6 */}
                  {[1, 2, 3, 4, 5, 6].map((p) => renderPeriodCell(dayObj.code, p))}

                  {/* Separate Lunch Divider Cell */}
                  <td className="border-b border-r border-[#DADCE0] dark:border-[#3C4043] bg-[#F1F3F4]/80 dark:bg-[#282A2C]/80 text-center align-middle select-none">
                    <div className="text-[9px] font-bold tracking-widest text-[#5F6368]/60 uppercase">
                      •
                    </div>
                  </td>

                  {/* Afternoon Periods 7..12 */}
                  {[7, 8, 9, 10, 11, 12].map((p) => renderPeriodCell(dayObj.code, p))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 2: SCHEDULE AGENDA VIEW (Also ideal on mobile screens) */}
      {viewMode === 'schedule' && (
        <div className="p-4 space-y-4">
          {ALL_DAYS.slice(0, showSaturday ? 6 : 5).map((dayObj) => {
            const dayEntries: CellEntry[] = [];
            for (let p = 1; p <= 12; p++) {
              for (const item of gridCells[dayObj.code]?.[p] ?? []) {
                dayEntries.push(item);
              }
            }
            return (
              <div
                key={dayObj.code}
                className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/40 p-3"
              >
                <div className="flex items-center justify-between border-b border-[#DADCE0] dark:border-[#3C4043] pb-2 mb-2.5">
                  <span className="text-[14px] font-bold text-[#202124] dark:text-[#E3E3E3]">
                    {dayObj.full}
                  </span>
                  <span className="text-[12px] font-medium text-[#5F6368] dark:text-[#9AA0A6]">
                    {dayEntries.length} scheduled period(s)
                  </span>
                </div>

                {dayEntries.length === 0 ? (
                  <div className="py-3 text-center text-[12px] text-[#5F6368]">
                    No classes scheduled on {dayObj.full}.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {dayEntries.map(({ section, occurrence }, idx) => (
                      <TimetableClassCard
                        key={`${section.id}_${occurrence.period}_${idx}`}
                        section={section}
                        occurrence={occurrence}
                        isLocked={lockedSet.has(section.id)}
                        hasConfirmedClash={clashingSectionIds.has(section.id)}
                        hasUnresolvedWarning={section.verification_status === 'UNRESOLVED'}
                        showVenues={showVenues}
                        compact={false}
                        onClick={() => setInspectedSection(section)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: OFFICIAL VIT SLOT-LIST VIEW */}
      {viewMode === 'slotlist' && (
        <div className="p-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] text-[11px] font-bold uppercase tracking-wider text-[#5F6368]">
                <th className="py-2.5 px-3">Course Code</th>
                <th className="py-2.5 px-3">Course Title</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Official Slot</th>
                <th className="py-2.5 px-3">Faculty</th>
                <th className="py-2.5 px-3">Venue</th>
                <th className="py-2.5 px-3">Verified Schedule</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DADCE0] dark:divide-[#3C4043]">
              {filteredSections.map((sec) => {
                const hasClash = clashingSectionIds.has(sec.id);
                const isLocked = lockedSet.has(sec.id);
                const style = getSubjectColorStyle(
                  sec.course_code,
                  sec.course_title,
                  sec.course_type_code
                );
                return (
                  <tr
                    key={sec.id}
                    onClick={() => setInspectedSection(sec)}
                    className="hover:bg-[#F8F9FC] dark:hover:bg-[#282A2C] cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-[#1A73E8] dark:text-[#8AB4F8]">
                      {sec.course_code}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#202124] dark:text-[#E3E3E3]">
                      {sec.course_title}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${style.badgeBg} ${style.badgeText}`}
                      >
                        {sec.course_type_code}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#202124] dark:text-[#E3E3E3]">
                      {sec.slot_combination}
                    </td>
                    <td className="py-2.5 px-3 text-[#202124] dark:text-[#E3E3E3]">
                      {sec.faculty_name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#5F6368] dark:text-[#9AA0A6]">
                      {sec.venue}
                    </td>
                    <td className="py-2.5 px-3 text-[12px] text-[#5F6368] dark:text-[#9AA0A6] tabular-time">
                      {hasClash ? (
                        <span className="inline-flex items-center gap-1 rounded bg-[#FCE8E6] px-2 py-0.5 text-[11px] font-bold text-[#D93025]">
                          <AlertOctagon className="h-3 w-3" /> Confirmed Clash
                        </span>
                      ) : sec.parsed_slot?.occurrences?.length ? (
                        sec.parsed_slot.occurrences
                          .map((o) => `${o.day} ${o.start_time}–${o.end_time}`)
                          .join(', ')
                      ) : (
                        <span className="text-[#B06000]">Online / Unresolved ({sec.slot_combination})</span>
                      )}
                    </td>
                    <td
                      className="py-2.5 px-3 text-right space-x-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onToggleLock(sec.id)}
                        className="rounded p-1 text-[#5F6368] hover:bg-[#F1F3F4]"
                        title={isLocked ? 'Unlock section' : 'Lock section'}
                      >
                        {isLocked ? (
                          <Lock className="h-3.5 w-3.5 text-[#F29900]" />
                        ) : (
                          <Unlock className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => onRemoveSection(sec.id)}
                        disabled={isLocked}
                        className="rounded p-1 text-[#5F6368] hover:text-[#D93025] disabled:opacity-40"
                        title="Remove section"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Unresolved / Online / Asynchronous Courses Tray Below Grid */}
      {nonGridSections.length > 0 && (
        <div className="border-t border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/50 px-4 py-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">
            <Info className="h-3.5 w-3.5 text-[#1A73E8]" />
            <span>
              Online (OC) & Unresolved-Slot Courses ({nonGridSections.length}) — Not placed on clock grid without verified slot mapping:
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {nonGridSections.map((sec) => (
              <div
                key={sec.id}
                onClick={() => setInspectedSection(sec)}
                className="flex items-center gap-2.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] px-3 py-1.5 text-[12px] shadow-2xs hover:border-[#1A73E8] cursor-pointer"
              >
                <span className="font-mono font-bold text-[#1A73E8] dark:text-[#8AB4F8]">
                  {sec.course_code}
                </span>
                <span className="font-medium text-[#202124] dark:text-[#E3E3E3]">
                  {sec.course_title}
                </span>
                <span className="rounded bg-[#F1F3F4] dark:bg-[#3C4043] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">
                  Slot: {sec.slot_combination}
                </span>
                <span className="text-[11px] text-[#5F6368]">{sec.faculty_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COURSE / SECTION DETAIL POPOVER MODAL */}
      {inspectedSection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]"
          onClick={() => setInspectedSection(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#DADCE0] dark:border-[#3C4043] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[#E8F0FE] dark:bg-[#1E3A5F] px-2 py-0.5 font-mono text-[12px] font-bold text-[#1A73E8] dark:text-[#8AB4F8]">
                    {inspectedSection.course_code}
                  </span>
                  <span className="rounded-md bg-[#F1F3F4] dark:bg-[#282A2C] px-2 py-0.5 text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">
                    {inspectedSection.course_type_code}
                  </span>
                  {inspectedSection.verification_status === 'VERIFIED' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[11px] font-semibold text-[#188038]">
                      <CheckCircle2 className="h-3 w-3" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF7E0] px-2 py-0.5 text-[11px] font-semibold text-[#B06000]">
                      <AlertTriangle className="h-3 w-3" /> Unresolved Mapping
                    </span>
                  )}
                </div>
                <h3 className="mt-1.5 text-[18px] font-bold text-[#202124] dark:text-[#E3E3E3]">
                  {inspectedSection.course_title}
                </h3>
              </div>
              <button
                onClick={() => setInspectedSection(null)}
                className="rounded-lg p-1 text-[#5F6368] hover:bg-[#F1F3F4]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#F8F9FC] dark:bg-[#282A2C] p-3.5 text-[12px]">
              <div>
                <div className="text-[#5F6368] dark:text-[#9AA0A6]">Faculty Member</div>
                <div className="mt-0.5 font-semibold text-[#202124] dark:text-[#E3E3E3]">
                  {inspectedSection.faculty_name}
                </div>
                {inspectedSection.faculty_review?.no8am_id && (
                  <a
                    href={inspectedSection.faculty_review.profile_url || 'https://no8am.site'}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[#1A73E8] hover:underline"
                  >
                    <Star className="h-3 w-3" />
                    {inspectedSection.faculty_review.total_reviews > 0
                      ? `${inspectedSection.faculty_review.avg_rating}/5 (${inspectedSection.faculty_review.total_reviews} reviews)`
                      : 'Verified on no8am.site (0 reviews)'}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>

              <div>
                <div className="text-[#5F6368] dark:text-[#9AA0A6]">Slot & Venue</div>
                <div className="mt-0.5 font-mono font-bold text-[#202124] dark:text-[#E3E3E3]">
                  {inspectedSection.slot_combination} •{' '}
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="h-3 w-3 text-[#1A73E8]" /> {inspectedSection.venue}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[#5F6368]">
                  <FileSpreadsheet className="h-3 w-3" />
                  Source: {inspectedSection.source_sheet} (Row {inspectedSection.source_row})
                </div>
              </div>

              <div className="col-span-2 border-t border-[#DADCE0] dark:border-[#3C4043] pt-2">
                <div className="flex items-center gap-1 text-[#5F6368]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Scheduled Weekly Intervals:</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {inspectedSection.parsed_slot?.occurrences?.length ? (
                    inspectedSection.parsed_slot.occurrences.map((occ, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] px-2 py-0.5 font-mono text-[11px] text-[#202124] dark:text-[#E3E3E3] tabular-time"
                      >
                        {occ.day} P{occ.period} ({occ.start_time}–{occ.end_time}) [{occ.slot_code}]
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-[#B06000]">
                      No weekly clock intervals ({inspectedSection.slot_combination})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Switch Section Selector (Available Alternatives) */}
            <div>
              <div className="flex items-center justify-between text-[12px] font-semibold text-[#202124] dark:text-[#E3E3E3]">
                <span className="flex items-center gap-1.5">
                  <ArrowRightLeft className="h-3.5 w-3.5 text-[#1A73E8]" />
                  Switch to Another Official Section ({inspectedAlternatives.length} available)
                </span>
              </div>
              <div className="mt-2 max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {inspectedAlternatives.map((alt) => {
                  const isCurrent = alt.id === inspectedSection.id;
                  return (
                    <div
                      key={alt.id}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-[12px] ${
                        isCurrent
                          ? 'border-[#1A73E8] bg-[#E8F0FE]/60 dark:bg-[#1E3A5F]/40'
                          : 'border-[#DADCE0] dark:border-[#3C4043] hover:bg-[#F8F9FC] dark:hover:bg-[#282A2C]'
                      }`}
                    >
                      <div>
                        <span className="font-mono font-bold text-[#1A73E8] dark:text-[#8AB4F8]">
                          {alt.slot_combination}
                        </span>{' '}
                        • <span className="font-semibold">{alt.faculty_name}</span>{' '}
                        <span className="font-mono text-[11px] text-[#5F6368]">({alt.venue})</span>
                      </div>
                      {isCurrent ? (
                        <span className="text-[11px] font-bold text-[#1A73E8]">Selected</span>
                      ) : (
                        <button
                          onClick={() => {
                            onSwitchSection(inspectedSection.id, alt.id);
                            setInspectedSection(alt);
                          }}
                          className="rounded-lg bg-[#1A73E8] hover:bg-[#1557B0] px-2.5 py-1 text-[11px] font-semibold text-white cursor-pointer"
                        >
                          Switch
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#DADCE0] dark:border-[#3C4043] pt-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onToggleLock(inspectedSection.id)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] px-3 py-1.5 text-[12px] font-semibold text-[#202124] dark:text-[#E3E3E3] hover:bg-[#F1F3F4] cursor-pointer"
                >
                  {lockedSet.has(inspectedSection.id) ? (
                    <>
                      <Unlock className="h-3.5 w-3.5 text-[#F29900]" /> Unlock Section
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" /> Lock Section
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    const code = inspectedSection.course_code;
                    setInspectedSection(null);
                    onOpenFacultyComparison(code);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] px-3 py-1.5 text-[12px] font-semibold text-[#1A73E8] dark:text-[#8AB4F8] hover:bg-[#E8F0FE]/50 cursor-pointer"
                >
                  <Users className="h-3.5 w-3.5" /> Compare All Faculty
                </button>
              </div>

              <button
                onClick={() => {
                  onRemoveSection(inspectedSection.id);
                  setInspectedSection(null);
                }}
                disabled={lockedSet.has(inspectedSection.id)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#FCE8E6] hover:bg-[#F9D2CE] px-3 py-1.5 text-[12px] font-semibold text-[#D93025] disabled:opacity-40 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove from Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
