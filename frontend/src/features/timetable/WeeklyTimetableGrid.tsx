import React, { useState } from 'react';
import {
  Calendar,
  List,
  Download,
  Printer,
  Lock,
  Unlock,
  X,
  AlertOctagon,
  AlertTriangle,
  Star,
  MapPin,
  Clock,
  ExternalLink,
  Info,
} from 'lucide-react';
import {
  ClashReport,
  CourseSection,
  PeriodHeader,
  SlotOccurrence,
} from '../../types/ffcs';

interface WeeklyTimetableGridProps {
  selectedSections: CourseSection[];
  lockedSectionIds: number[];
  periodHeaders: PeriodHeader[];
  slotMap: Record<string, SlotOccurrence[]>;
  clashReport: ClashReport | null;
  campus: string;
  onRemoveSection: (sectionId: number) => void;
  onToggleLock: (sectionId: number) => void;
}

const DAYS: Array<{ code: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT'; label: string }> = [
  { code: 'MON', label: 'MON' },
  { code: 'TUE', label: 'TUE' },
  { code: 'WED', label: 'WED' },
  { code: 'THU', label: 'THU' },
  { code: 'FRI', label: 'FRI' },
  { code: 'SAT', label: 'SAT' },
];

// Official VIT Vellore placeholder slot labels for empty cells
const VELLORE_CELL_PLACEHOLDERS: Record<string, Record<number, string>> = {
  MON: { 1: 'A1 / L1', 2: 'F1 / L2', 3: 'D1 / L3', 4: 'TB1 / L4', 5: 'TG1 / L5', 6: 'L6', 7: 'A2 / L31', 8: 'F2 / L32', 9: 'D2 / L33', 10: 'TB2 / L34', 11: 'TG2 / L35', 12: 'V3 / L36' },
  TUE: { 1: 'B1 / L7', 2: 'G1 / L8', 3: 'E1 / L9', 4: 'TC1 / L10', 5: 'TAA1 / L11', 6: 'L12', 7: 'B2 / L37', 8: 'G2 / L38', 9: 'E2 / L39', 10: 'TC2 / L40', 11: 'TAA2 / L41', 12: 'V4 / L42' },
  WED: { 1: 'C1 / L13', 2: 'A1 / L14', 3: 'F1 / L15', 4: 'V1 / TDD1 / L16', 5: 'V2 / L17', 6: 'L18', 7: 'C2 / L43', 8: 'A2 / L44', 9: 'F2 / L45', 10: 'TD2 / L46', 11: 'TBB2 / L47', 12: 'V5 / L48' },
  THU: { 1: 'D1 / L19', 2: 'B1 / L20', 3: 'G1 / L21', 4: 'TE1 / L22', 5: 'TCC1 / TBB1 / L23', 6: 'L24', 7: 'D2 / L49', 8: 'B2 / L50', 9: 'G2 / L51', 10: 'TE2 / L52', 11: 'TCC2 / L53', 12: 'V6 / L54' },
  FRI: { 1: 'E1 / L25', 2: 'C1 / L26', 3: 'TA1 / L27', 4: 'TF1 / L28', 5: 'TD1 / L29', 6: 'L30', 7: 'E2 / L55', 8: 'C2 / L56', 9: 'TA2 / L57', 10: 'TF2 / L58', 11: 'TDD2 / L59', 12: 'V7 / L60' },
  SAT: {},
};

interface CellEntry {
  section: CourseSection;
  occurrence: SlotOccurrence;
}

export const WeeklyTimetableGrid: React.FC<WeeklyTimetableGridProps> = ({
  selectedSections,
  lockedSectionIds,
  periodHeaders,
  clashReport,
  campus,
  onRemoveSection,
  onToggleLock,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [inspectedSection, setInspectedSection] = useState<CourseSection | null>(null);

  const lockedSet = new Set(lockedSectionIds);

  // Build lookup of cell entries: day -> period -> CellEntry[]
  const cellMap: Record<string, Record<number, CellEntry[]>> = {};
  for (const d of DAYS) {
    cellMap[d.code] = {};
    for (let p = 1; p <= 12; p++) {
      cellMap[d.code][p] = [];
    }
  }

  // Also check if any clash occurs on a given (day, period) or between two sections
  const clashingCellKeys = new Set<string>();
  const clashingSectionIds = new Set<number>();
  if (clashReport) {
    for (const c of clashReport.clashes) {
      if (c.is_confirmed && c.severity === 'ERROR') {
        if (c.day && c.period) {
          clashingCellKeys.add(`${c.day}-${c.period}`);
        }
        if (c.course_a_section_id) clashingSectionIds.add(c.course_a_section_id);
        if (c.course_b_section_id) clashingSectionIds.add(c.course_b_section_id);
      }
    }
  }

  const unresolvedSections: CourseSection[] = [];
  const onlineSections: CourseSection[] = [];

  for (const sec of selectedSections) {
    const pSlot = sec.parsed_slot;
    if (!pSlot || pSlot.status === 'UNRESOLVED') {
      unresolvedSections.push(sec);
      continue;
    }
    if (pSlot.status === 'ONLINE' || pSlot.occurrences.length === 0) {
      onlineSections.push(sec);
      continue;
    }
    for (const occ of pSlot.occurrences) {
      if (cellMap[occ.day] && cellMap[occ.day][occ.period]) {
        cellMap[occ.day][occ.period].push({ section: sec, occurrence: occ });
      }
    }
  }

  const handleDownloadExcel = () => {
    const ids = selectedSections.map((s) => s.id).join(',');
    window.open(
      `/api/export/timetable-excel?section_ids=${encodeURIComponent(ids)}&campus=${encodeURIComponent(campus)}`,
      '_blank'
    );
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 shadow-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-3 bg-slate-900/90">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-400" />
            Interactive VIT Weekly Timetable
          </h2>
          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-300">
            {selectedSections.length} Selected Component{selectedSections.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Weekly Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              Slot-List View
            </button>
          </div>

          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition cursor-pointer"
            title="Export timetable grid and selected courses to Excel (.xlsx)"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            Export Excel
          </button>

          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition cursor-pointer"
            title="Print or Save as PDF"
          >
            <Printer className="h-3.5 w-3.5 text-indigo-400" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Main Content: Grid or Slot-List */}
      {viewMode === 'grid' ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/90 text-[10px] text-slate-400">
                <th className="sticky left-0 z-10 bg-slate-950 px-2.5 py-2 font-bold text-slate-300 border-r border-slate-800 w-14">
                  DAY
                </th>
                {periodHeaders.slice(0, 6).map((ph) => (
                  <th
                    key={ph.period}
                    className="border-r border-slate-800/70 px-1.5 py-1.5 text-center min-w-[92px]"
                  >
                    <div className="font-bold text-indigo-300">{ph.label} (Theory)</div>
                    <div className="font-mono text-[9px] text-slate-300">{ph.theory_time}</div>
                    <div className="mt-0.5 font-mono text-[9px] text-emerald-400/90">
                      Lab: {ph.lab_time}
                    </div>
                  </th>
                ))}
                {/* Lunch Column */}
                <th className="border-r border-slate-800/70 bg-slate-950 px-1 py-1.5 text-center w-8">
                  <div className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">
                    LUNCH
                  </div>
                </th>
                {periodHeaders.slice(6, 12).map((ph) => (
                  <th
                    key={ph.period}
                    className="border-r border-slate-800/70 px-1.5 py-1.5 text-center min-w-[92px]"
                  >
                    <div className="font-bold text-indigo-300">{ph.label} (Theory)</div>
                    <div className="font-mono text-[9px] text-slate-300">{ph.theory_time}</div>
                    <div className="mt-0.5 font-mono text-[9px] text-emerald-400/90">
                      Lab: {ph.lab_time}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {DAYS.map((dayObj) => (
                <tr key={dayObj.code} className="hover:bg-slate-900/40">
                  <td className="sticky left-0 z-10 bg-slate-950 px-2.5 py-3 font-mono text-xs font-bold text-slate-300 border-r border-slate-800">
                    {dayObj.label}
                  </td>

                  {/* Forenoon Periods 1..6 */}
                  {[1, 2, 3, 4, 5, 6].map((period) => {
                    const entries = cellMap[dayObj.code][period] || [];
                    const hasClash =
                      entries.length > 1 || clashingCellKeys.has(`${dayObj.code}-${period}`);
                    const placeholder = VELLORE_CELL_PLACEHOLDERS[dayObj.code]?.[period] || '';

                    return (
                      <td
                        key={period}
                        className={`border-r border-slate-800/60 p-1 align-top h-20 transition ${
                          hasClash ? 'bg-rose-950/40 ring-1 ring-inset ring-rose-500/60' : ''
                        }`}
                      >
                        {entries.length === 0 ? (
                          <div className="flex h-full items-center justify-center text-center">
                            <span className="font-mono text-[10px] text-slate-700 select-none">
                              {placeholder}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {entries.map(({ section, occurrence }) => {
                              const isLab = occurrence.slot_category === 'LAB';
                              const isTut = occurrence.slot_category === 'TUTORIAL';
                              const isLocked = lockedSet.has(section.id);

                              let cardStyle =
                                'border-indigo-500/50 bg-indigo-950/70 text-indigo-100';
                              if (hasClash) {
                                cardStyle =
                                  'border-rose-500 bg-rose-950/90 text-rose-100 shadow-sm shadow-rose-500/20';
                              } else if (isLab) {
                                cardStyle =
                                  'border-emerald-500/50 bg-emerald-950/70 text-emerald-100';
                              } else if (isTut) {
                                cardStyle =
                                  'border-amber-500/50 bg-amber-950/60 text-amber-100';
                              }

                              return (
                                <div
                                  key={`${section.id}-${occurrence.slot_code}`}
                                  onClick={() => setInspectedSection(section)}
                                  className={`group relative cursor-pointer rounded-lg border p-1.5 text-[11px] leading-tight transition hover:brightness-110 ${cardStyle}`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-mono font-bold tracking-tight">
                                      {section.course_code}
                                    </span>
                                    <div className="flex items-center gap-0.5">
                                      {isLocked && (
                                        <Lock className="h-2.5 w-2.5 text-amber-300" />
                                      )}
                                      <span className="rounded bg-black/30 px-1 py-0.2 font-mono text-[9px] font-semibold">
                                        {occurrence.slot_code}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-0.5 truncate text-[10px] font-medium opacity-90">
                                    {section.course_title}
                                  </div>
                                  <div className="mt-1 flex items-center justify-between text-[9px] opacity-80">
                                    <span className="truncate max-w-[65px]">
                                      {section.faculty_name}
                                    </span>
                                    <span className="font-mono font-semibold">
                                      {section.venue}
                                    </span>
                                  </div>
                                  {hasClash && (
                                    <div className="mt-1 flex items-center gap-1 rounded bg-rose-500/30 px-1 py-0.5 text-[9px] font-bold text-rose-200">
                                      <AlertOctagon className="h-2.5 w-2.5 shrink-0" />
                                      <span>CLASH</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Lunch Divider */}
                  <td className="border-r border-slate-800/60 bg-slate-950/90 text-center align-middle">
                    <span className="text-[9px] font-mono text-slate-600">•</span>
                  </td>

                  {/* Afternoon Periods 7..12 */}
                  {[7, 8, 9, 10, 11, 12].map((period) => {
                    const entries = cellMap[dayObj.code][period] || [];
                    const hasClash =
                      entries.length > 1 || clashingCellKeys.has(`${dayObj.code}-${period}`);
                    const placeholder = VELLORE_CELL_PLACEHOLDERS[dayObj.code]?.[period] || '';

                    return (
                      <td
                        key={period}
                        className={`border-r border-slate-800/60 p-1 align-top h-20 transition ${
                          hasClash ? 'bg-rose-950/40 ring-1 ring-inset ring-rose-500/60' : ''
                        }`}
                      >
                        {entries.length === 0 ? (
                          <div className="flex h-full items-center justify-center text-center">
                            <span className="font-mono text-[10px] text-slate-700 select-none">
                              {placeholder}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {entries.map(({ section, occurrence }) => {
                              const isLab = occurrence.slot_category === 'LAB';
                              const isTut = occurrence.slot_category === 'TUTORIAL';
                              const isLocked = lockedSet.has(section.id);

                              let cardStyle =
                                'border-indigo-500/50 bg-indigo-950/70 text-indigo-100';
                              if (hasClash) {
                                cardStyle =
                                  'border-rose-500 bg-rose-950/90 text-rose-100 shadow-sm shadow-rose-500/20';
                              } else if (isLab) {
                                cardStyle =
                                  'border-emerald-500/50 bg-emerald-950/70 text-emerald-100';
                              } else if (isTut) {
                                cardStyle =
                                  'border-amber-500/50 bg-amber-950/60 text-amber-100';
                              }

                              return (
                                <div
                                  key={`${section.id}-${occurrence.slot_code}`}
                                  onClick={() => setInspectedSection(section)}
                                  className={`group relative cursor-pointer rounded-lg border p-1.5 text-[11px] leading-tight transition hover:brightness-110 ${cardStyle}`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-mono font-bold tracking-tight">
                                      {section.course_code}
                                    </span>
                                    <div className="flex items-center gap-0.5">
                                      {isLocked && (
                                        <Lock className="h-2.5 w-2.5 text-amber-300" />
                                      )}
                                      <span className="rounded bg-black/30 px-1 py-0.2 font-mono text-[9px] font-semibold">
                                        {occurrence.slot_code}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="mt-0.5 truncate text-[10px] font-medium opacity-90">
                                    {section.course_title}
                                  </div>
                                  <div className="mt-1 flex items-center justify-between text-[9px] opacity-80">
                                    <span className="truncate max-w-[65px]">
                                      {section.faculty_name}
                                    </span>
                                    <span className="font-mono font-semibold">
                                      {section.venue}
                                    </span>
                                  </div>
                                  {hasClash && (
                                    <div className="mt-1 flex items-center gap-1 rounded bg-rose-500/30 px-1 py-0.5 text-[9px] font-bold text-rose-200">
                                      <AlertOctagon className="h-2.5 w-2.5 shrink-0" />
                                      <span>CLASH</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Slot-List View */
        <div className="p-4">
          {selectedSections.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No sections selected yet. Select course offerings on the left or click{' '}
              <strong className="text-indigo-300">Generate Best Timetable</strong>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                    <th className="pb-2 font-semibold">Course</th>
                    <th className="pb-2 font-semibold">Type</th>
                    <th className="pb-2 font-semibold">Faculty & No8AM Rating</th>
                    <th className="pb-2 font-semibold">Slot Combination</th>
                    <th className="pb-2 font-semibold">Verified Schedule</th>
                    <th className="pb-2 font-semibold">Venue</th>
                    <th className="pb-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {selectedSections.map((sec) => {
                    const isLocked = lockedSet.has(sec.id);
                    const isClashing = clashingSectionIds.has(sec.id);
                    const occs = sec.parsed_slot?.occurrences || [];
                    return (
                      <tr key={sec.id} className="hover:bg-slate-800/30">
                        <td className="py-2.5 pr-3">
                          <div className="font-mono font-bold text-white">{sec.course_code}</div>
                          <div className="text-[11px] text-slate-400">{sec.course_title}</div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                              sec.course_type_code === 'ELA'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : sec.course_type_code === 'OC'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}
                          >
                            {sec.course_type_code}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <div className="font-medium text-slate-200">{sec.faculty_name}</div>
                          {sec.faculty_review?.avg_rating ? (
                            <div className="text-[10px] text-amber-400 flex items-center gap-1">
                              <Star className="h-3 w-3 fill-amber-400" />
                              <span>
                                {sec.faculty_review.avg_rating.toFixed(2)} ({sec.faculty_review.total_reviews} reviews)
                              </span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500">Unrated on No8AM</div>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 font-mono font-bold text-indigo-300">
                          {sec.slot_combination}
                          {isClashing && (
                            <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300 border border-rose-500/40">
                              CLASH
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-[11px] text-slate-300">
                          {sec.parsed_slot?.status === 'UNRESOLVED' ? (
                            <span className="text-amber-400 font-medium">
                              Unresolved ({sec.parsed_slot.explanation})
                            </span>
                          ) : occs.length === 0 ? (
                            <span className="text-sky-400">Online / Non-Timetabled</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {occs.map((o, i) => (
                                <span
                                  key={i}
                                  className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px]"
                                >
                                  {o.day} P{o.period} ({o.start_time}-{o.end_time})
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-slate-300">{sec.venue}</td>
                        <td className="py-2.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => onToggleLock(sec.id)}
                              className={`rounded p-1.5 transition ${
                                isLocked
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                              title={isLocked ? 'Unlock section' : 'Lock section'}
                            >
                              {isLocked ? (
                                <Lock className="h-3.5 w-3.5" />
                              ) : (
                                <Unlock className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => onRemoveSection(sec.id)}
                              className="rounded bg-slate-800 p-1.5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 transition"
                              title="Remove section"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Unresolved Slots & Online Courses Footer Bar (Never Guesses Times!) */}
      {(unresolvedSections.length > 0 || onlineSections.length > 0) && (
        <div className="border-t border-slate-800 bg-slate-950/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {unresolvedSections.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 font-semibold text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Unresolved / Unmapped Slots (Not placed at guessed times):
              </span>
              {unresolvedSections.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setInspectedSection(u)}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200 hover:bg-amber-500/20"
                >
                  <span className="font-mono font-bold">{u.course_code}</span>
                  <span>({u.course_type_code})</span>
                  <span className="font-mono underline">{u.slot_combination}</span>
                </button>
              ))}
            </div>
          )}

          {onlineSections.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 font-medium">Online / Non-Timetabled (OC):</span>
              {onlineSections.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setInspectedSection(o)}
                  className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-200 hover:bg-sky-500/20"
                >
                  <span className="font-mono font-bold">{o.course_code}</span>
                  <span>{o.faculty_name}</span>
                  <span className="rounded bg-sky-500/20 px-1 font-mono text-[10px]">OC</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inspected Class Details Modal */}
      {inspectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm no-print">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-indigo-400">
                    {inspectedSection.course_code}
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs font-semibold text-slate-200">
                    {inspectedSection.course_type_code}
                  </span>
                  <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    {inspectedSection.verification_status}
                  </span>
                </div>
                <h3 className="mt-1 text-base font-bold text-white">
                  {inspectedSection.course_title}
                </h3>
              </div>
              <button
                onClick={() => setInspectedSection(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Faculty Member:</span>
                  <span className="font-semibold text-white">{inspectedSection.faculty_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Original Imported Slot:</span>
                  <span className="font-mono font-bold text-indigo-300">
                    {inspectedSection.slot_combination}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" /> Venue:
                  </span>
                  <span className="font-mono font-semibold text-slate-200">
                    {inspectedSection.venue}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Info className="h-3.5 w-3.5 text-slate-500" /> Source Traceability:
                  </span>
                  <span className="font-mono text-[11px] text-slate-300">
                    Sheet "{inspectedSection.source_sheet}" • Row {inspectedSection.source_row}
                  </span>
                </div>
              </div>

              {/* Verified No8AM Faculty Metadata */}
              {inspectedSection.faculty_review && (
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-indigo-300">
                      No8AM.site Verified Faculty Profile
                    </span>
                    {inspectedSection.faculty_review.profile_url && (
                      <a
                        href={inspectedSection.faculty_review.profile_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] text-indigo-400 hover:underline"
                      >
                        View on no8am.site <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-slate-900/90 p-2">
                      <div className="text-[10px] text-slate-400">Avg Rating</div>
                      <div className="mt-0.5 font-mono font-bold text-amber-400">
                        {inspectedSection.faculty_review.avg_rating
                          ? `★ ${inspectedSection.faculty_review.avg_rating.toFixed(2)}/5`
                          : 'Unrated'}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-900/90 p-2">
                      <div className="text-[10px] text-slate-400">Reviews</div>
                      <div className="mt-0.5 font-mono font-bold text-white">
                        {inspectedSection.faculty_review.total_reviews}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-900/90 p-2">
                      <div className="text-[10px] text-slate-400">FFCS Carts</div>
                      <div className="mt-0.5 font-mono font-bold text-emerald-400">
                        {inspectedSection.faculty_review.cart_count}
                      </div>
                    </div>
                  </div>
                  {inspectedSection.faculty_review.department && (
                    <div className="mt-2 text-[11px] text-slate-400">
                      {inspectedSection.faculty_review.designation || 'Faculty'} •{' '}
                      {inspectedSection.faculty_review.department}
                    </div>
                  )}
                </div>
              )}

              {/* Scheduled Time Occurrences */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <div className="font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                  Verified Weekly Time Intervals
                </div>
                {inspectedSection.parsed_slot?.status === 'UNRESOLVED' ? (
                  <p className="text-amber-400 text-[11px]">
                    {inspectedSection.parsed_slot.explanation}
                  </p>
                ) : (inspectedSection.parsed_slot?.occurrences || []).length === 0 ? (
                  <p className="text-sky-400 text-[11px]">
                    Online Course (OC) — No physical classroom schedule.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {inspectedSection.parsed_slot?.occurrences.map((occ, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded bg-slate-900 px-2.5 py-1 font-mono text-[11px]"
                      >
                        <span className="font-bold text-indigo-300">{occ.slot_code}</span>
                        <span className="text-slate-200">
                          {occ.day} • Period {occ.period}
                        </span>
                        <span className="text-emerald-400">
                          {occ.start_time} – {occ.end_time}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  onToggleLock(inspectedSection.id);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  lockedSet.has(inspectedSection.id)
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {lockedSet.has(inspectedSection.id) ? (
                  <>
                    <Unlock className="h-3.5 w-3.5" /> Unlock Section
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" /> Lock Section
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  onRemoveSection(inspectedSection.id);
                  setInspectedSection(null);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-rose-600/20 border border-rose-500/40 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-600/30 transition"
              >
                <X className="h-3.5 w-3.5" /> Remove from Timetable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
