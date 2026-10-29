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
import { TimetableLegend } from './TimetableLegend';
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
  fitToPage: boolean; // true = Compact Week (Default), false = Detailed View
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
  MON: { 1: 'A1/L1', 2: 'F1/L2', 3: 'D1/L3', 4: 'TB1/L4', 5: 'TG1/L5', 6: 'L6', 7: 'A2/L31', 8: 'F2/L32', 9: 'D2/L33', 10: 'TB2/L34', 11: 'TG2/L35', 12: 'V3/L36' },
  TUE: { 1: 'B1/L7', 2: 'G1/L8', 3: 'E1/L9', 4: 'TC1/L10', 5: 'TAA1/L11', 6: 'L12', 7: 'B2/L37', 8: 'G2/L38', 9: 'E2/L39', 10: 'TC2/L40', 11: 'TAA2/L41', 12: 'V4/L42' },
  WED: { 1: 'C1/L13', 2: 'A1/L14', 3: 'F1/L15', 4: 'V1/L16', 5: 'V2/L17', 6: 'L18', 7: 'C2/L43', 8: 'A2/L44', 9: 'F2/L45', 10: 'TD2/L46', 11: 'TBB2/L47', 12: 'V5/L48' },
  THU: { 1: 'D1/L19', 2: 'B1/L20', 3: 'G1/L21', 4: 'TE1/L22', 5: 'TCC1/L23', 6: 'L24', 7: 'D2/L49', 8: 'B2/L50', 9: 'G2/L51', 10: 'TE2/L52', 11: 'TCC2/L53', 12: 'V6/L54' },
  FRI: { 1: 'E1/L25', 2: 'C1/L26', 3: 'TA1/L27', 4: 'TF1/L28', 5: 'TD1/L29', 6: 'L30', 7: 'E2/L55', 8: 'C2/L56', 9: 'TA2/L57', 10: 'TF2/L58', 11: 'TDD2/L59', 12: 'V7/L60' },
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
        className={`relative border-b border-r border-[#CBD5E1] align-stretch transition-colors ${
          fitToPage ? 'p-[3px]' : 'p-2 min-w-[176px] w-[176px] h-[142px]'
        } ${
          validDropCandidate
            ? 'bg-[#E6F4EA] ring-2 ring-inset ring-[#188038]'
            : hasMultiCollision
            ? 'bg-[#FCE8E6]/60'
            : entries.length === 0
            ? 'bg-white hover:bg-[#F8FAFC]'
            : 'bg-white'
        }`}
      >
        {/* Empty cell slot watermark */}
        {entries.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center select-none">
            <span className="font-mono text-[9px] font-medium text-[#94A3B8] whitespace-nowrap">
              {placeholder}
            </span>
            {validDropCandidate && (
              <span className="mt-0.5 rounded bg-[#188038] px-1 py-0.5 text-[8px] font-bold text-white whitespace-nowrap">
                Drop: {validDropCandidate.slot_combination}
              </span>
            )}
          </div>
        )}

        {/* Render Class Cards inside Cell */}
        {entries.length > 0 && (
          <div className={entries.length === 1 ? 'h-full' : 'space-y-1'}>
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
    <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
      {/* Drag-and-drop helper banner */}
      {draggingSection && (
        <div className="shrink-0 bg-[#E6F4EA] border-b border-[#188038]/30 px-3 py-1 text-[11px] font-medium text-[#137333] flex items-center justify-between">
          <span>
            Dragging <strong>{draggingSection.course_code}</strong> ({draggingSection.slot_combination}) — Green cells show official VIT sections you can drop onto.
          </span>
          <button
            onClick={() => setDraggingSection(null)}
            className="text-[10.5px] font-bold underline cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* WEEKLY TIMETABLE GRID (Compact Week fits 100% without scrolling; Detailed View expands with scroll) */}
      {(viewMode === 'week' || viewMode === '3day' || viewMode === 'day') && (
        <div
          className={`flex-1 min-h-0 ${
            fitToPage ? 'overflow-x-auto lg:overflow-hidden' : 'overflow-auto'
          }`}
        >
          <table
            className={`w-full border-collapse ${
              fitToPage ? 'table-fixed h-full min-w-[760px] lg:min-w-0' : 'min-w-max'
            }`}
          >
            <SlotHeader periodHeaders={periodHeaders} fitToPage={fitToPage} />
            <tbody>
              {visibleDays.map((dayObj) => (
                <tr
                  key={dayObj.code}
                  className={
                    fitToPage
                      ? visibleDays.length === 5
                        ? 'h-1/5'
                        : 'h-1/6'
                      : 'h-[142px]'
                  }
                >
                  {/* Sticky Left Day Column — Never Wraps Letter-by-Letter */}
                  <td
                    className={`sticky left-0 z-10 border-b border-r border-[#CBD5E1] bg-[#F8FAFC] text-center align-middle select-none whitespace-nowrap shadow-[1px_0_0_0_#CBD5E1] ${
                      fitToPage ? 'w-[54px] min-w-[54px] px-1 py-1' : 'w-[104px] min-w-[104px] px-2.5 py-2'
                    }`}
                  >
                    <div className="text-[11px] font-extrabold tracking-wide text-[#0F172A] whitespace-nowrap">
                      {fitToPage ? dayObj.label : dayObj.full}
                    </div>
                  </td>

                  {/* Morning Periods 1..6 */}
                  {[1, 2, 3, 4, 5, 6].map((p) => renderPeriodCell(dayObj.code, p))}

                  {/* Dedicated Lunch Break Column */}
                  <td
                    className={`border-b border-r border-[#CBD5E1] bg-[#F1F5F9]/75 text-center align-middle select-none whitespace-nowrap ${
                      fitToPage ? 'w-[22px] min-w-[22px] px-0.5' : 'w-[42px] min-w-[42px] px-1'
                    }`}
                  >
                    <span className="font-mono text-[8.5px] font-bold uppercase text-[#64748B]">
                      {fitToPage ? '•' : 'LUNCH'}
                    </span>
                  </td>

                  {/* Afternoon Periods 7..12 */}
                  {[7, 8, 9, 10, 11, 12].map((p) => renderPeriodCell(dayObj.code, p))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend shown in Detailed View */}
      {!fitToPage && (
        <TimetableLegend
          selectedSections={filteredSections}
          onSelectSection={(sec) => setInspectedSection(sec)}
        />
      )}

      {/* Compact Unresolved / Online Courses Bar */}
      {nonGridSections.length > 0 && (
        <div className="shrink-0 border-t border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-1 flex flex-wrap items-center gap-1.5 text-[10.5px]">
          <span className="inline-flex items-center gap-1 font-semibold text-[#475569]">
            <Info className="h-3 w-3 text-[#1A73E8]" />
            Online / Unmapped ({nonGridSections.length}):
          </span>
          {nonGridSections.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setInspectedSection(sec)}
              className="inline-flex items-center gap-1 rounded border border-[#CBD5E1] bg-white px-1.5 py-0.5 text-[10px] hover:border-[#1A73E8] cursor-pointer"
            >
              <span className="font-mono font-bold text-[#1A73E8]">{sec.course_code}</span>
              <span className="font-medium text-[#0F172A]">{sec.faculty_name}</span>
              <span className="font-mono text-[9.5px] text-[#64748B]">({sec.slot_combination})</span>
            </button>
          ))}
        </div>
      )}

      {/* CLICK POPUP MODAL: Reveals Full Course Title & Code, Faculty, Venue, Official Slots, Type, Day/Time, Clash Status & Actions */}
      {inspectedSection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]"
          onClick={() => setInspectedSection(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#CBD5E1] bg-white p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#CBD5E1] pb-2.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-[#E8F0FE] px-2 py-0.5 font-mono text-[11.5px] font-bold text-[#1A73E8]">
                    {inspectedSection.course_code}
                  </span>
                  <span className="rounded bg-[#F1F5F9] px-2 py-0.5 text-[10.5px] font-semibold text-[#475569]">
                    {inspectedSection.course_type_code}
                  </span>
                  {clashingSectionIds.has(inspectedSection.id) ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FCE8E6] px-2 py-0.5 text-[10.5px] font-semibold text-[#D93025]">
                      <AlertOctagon className="h-3 w-3" /> Confirmed Clash
                    </span>
                  ) : inspectedSection.verification_status === 'VERIFIED' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F4EA] px-2 py-0.5 text-[10.5px] font-semibold text-[#188038]">
                      <CheckCircle2 className="h-3 w-3" /> No Clash
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF7E0] px-2 py-0.5 text-[10.5px] font-semibold text-[#B45309]">
                      <AlertTriangle className="h-3 w-3" /> Unresolved Mapping
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-[16px] font-bold text-[#0F172A]">
                  {inspectedSection.course_title}
                </h3>
              </div>
              <button
                onClick={() => setInspectedSection(null)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F1F5F9] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-2.5 rounded-xl bg-[#F8FAFC] p-3 text-[11.5px]">
              <div>
                <div className="text-[#64748B]">Faculty Member</div>
                <div className="mt-0.5 font-bold text-[#0F172A]">
                  {inspectedSection.faculty_name}
                </div>
                {inspectedSection.faculty_review?.no8am_id && (
                  <a
                    href={inspectedSection.faculty_review.profile_url || 'https://no8am.site'}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] text-[#1A73E8] hover:underline"
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
                <div className="text-[#64748B]">Official Slot & Venue</div>
                <div className="mt-0.5 font-mono font-bold text-[#0F172A]">
                  {inspectedSection.slot_combination} ·{' '}
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="h-3 w-3 text-[#1A73E8]" /> {inspectedSection.venue}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[10.5px] text-[#64748B]">
                  <FileSpreadsheet className="h-3 w-3" />
                  Source: {inspectedSection.source_sheet} (Row {inspectedSection.source_row})
                </div>
              </div>

              <div className="col-span-2 border-t border-[#CBD5E1] pt-2">
                <div className="flex items-center gap-1 text-[#64748B]">
                  <Clock className="h-3 w-3" />
                  <span>Exact Day & Time Schedule:</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {inspectedSection.parsed_slot?.occurrences?.length ? (
                    inspectedSection.parsed_slot.occurrences.map((occ, i) => (
                      <span
                        key={i}
                        className="rounded border border-[#CBD5E1] bg-white px-1.5 py-0.5 font-mono text-[10.5px] text-[#0F172A] tabular-time"
                      >
                        {occ.day} P{occ.period} ({occ.start_time}–{occ.end_time}) [{occ.slot_code}]
                      </span>
                    ))
                  ) : (
                    <span className="text-[10.5px] text-[#B45309]">
                      No weekly clock intervals ({inspectedSection.slot_combination})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Switch Section Selector */}
            <div>
              <div className="flex items-center justify-between text-[11.5px] font-semibold text-[#0F172A]">
                <span className="flex items-center gap-1.5">
                  <ArrowRightLeft className="h-3.5 w-3.5 text-[#1A73E8]" />
                  Change Teacher or Slot ({inspectedAlternatives.length} available)
                </span>
              </div>
              <div className="mt-1.5 max-h-44 overflow-y-auto divide-y divide-[#CBD5E1] rounded-xl border border-[#CBD5E1]">
                {inspectedAlternatives.map((alt) => {
                  const isCurrent = alt.id === inspectedSection.id;
                  return (
                    <div
                      key={alt.id}
                      className={`flex items-center justify-between px-2.5 py-1.5 text-[11.5px] ${
                        isCurrent ? 'bg-[#E8F0FE]/60' : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="min-w-0 truncate">
                        <span className="font-mono font-bold text-[#1A73E8]">
                          {alt.slot_combination}
                        </span>{' '}
                        · <span className="font-semibold text-[#0F172A]">{alt.faculty_name}</span>{' '}
                        <span className="font-mono text-[10.5px] text-[#64748B]">({alt.venue})</span>
                      </div>
                      {isCurrent ? (
                        <span className="text-[10.5px] font-bold text-[#1A73E8] shrink-0">
                          Selected
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            onSwitchSection(inspectedSection.id, alt.id);
                            setInspectedSection(alt);
                          }}
                          className="rounded bg-[#1A73E8] hover:bg-[#1557B0] px-2 py-0.5 text-[10.5px] font-semibold text-white cursor-pointer shrink-0"
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
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#CBD5E1] pt-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => onToggleLock(inspectedSection.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] px-2.5 py-1 text-[11.5px] font-semibold text-[#0F172A] hover:bg-[#F1F5F9] cursor-pointer"
                >
                  {lockedSet.has(inspectedSection.id) ? (
                    <>
                      <Unlock className="h-3 w-3 text-[#D97706]" /> Unlock
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3" /> Lock
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    const code = inspectedSection.course_code;
                    setInspectedSection(null);
                    onOpenFacultyComparison(code);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] px-2.5 py-1 text-[11.5px] font-semibold text-[#1A73E8] hover:bg-[#E8F0FE]/50 cursor-pointer"
                >
                  <Users className="h-3 w-3" /> View in Left Panel
                </button>
              </div>

              <button
                onClick={() => {
                  onRemoveSection(inspectedSection.id);
                  setInspectedSection(null);
                }}
                disabled={lockedSet.has(inspectedSection.id)}
                className="inline-flex items-center gap-1 rounded-lg bg-[#FCE8E6] hover:bg-[#F9D2CE] px-2.5 py-1 text-[11.5px] font-semibold text-[#D93025] disabled:opacity-40 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
