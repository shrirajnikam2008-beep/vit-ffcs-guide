import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { ClashReport } from '../../types/ffcs';

interface ClashDetectionPanelProps {
  clashReport: ClashReport | null;
  allowAdjacentLabBoundary: boolean;
  setAllowAdjacentLabBoundary: (v: boolean) => void;
  onReplaceSection: (oldSectionId: number | null | undefined, newSectionId: number) => void;
}

export const ClashDetectionPanel: React.FC<ClashDetectionPanelProps> = ({
  clashReport,
  allowAdjacentLabBoundary,
  setAllowAdjacentLabBoundary,
  onReplaceSection,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'confirmed' | 'warnings'>('all');

  if (!clashReport) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center text-xs text-slate-400">
        Evaluating timetable clashes...
      </div>
    );
  }

  const filteredClashes = clashReport.clashes.filter((c) => {
    if (filterMode === 'confirmed') return c.is_confirmed && c.severity === 'ERROR';
    if (filterMode === 'warnings') return !c.is_confirmed || c.severity === 'WARNING';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top KPI Cards & Rule Config */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">Confirmed Slot Clashes</div>
          <div
            className={`mt-1 font-mono text-2xl font-bold ${
              clashReport.confirmed_clash_count > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {clashReport.confirmed_clash_count}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Verified time-interval collisions
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">Possible Clashes (Unresolved Slots)</div>
          <div
            className={`mt-1 font-mono text-2xl font-bold ${
              clashReport.possible_clash_count > 0 ? 'text-amber-400' : 'text-slate-200'
            }`}
          >
            {clashReport.possible_clash_count}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Ambiguous or unmapped slot tokens
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs text-slate-400">Component & Credit Warnings</div>
          <div
            className={`mt-1 font-mono text-2xl font-bold ${
              clashReport.warning_count > 0 ? 'text-amber-300' : 'text-slate-200'
            }`}
          >
            {clashReport.warning_count}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Incomplete ETL pairs or missing courses
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
            <Sliders className="h-3.5 w-3.5" />
            Official VIT Timetable Rule
          </div>
          <label className="mt-2 flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={allowAdjacentLabBoundary}
              onChange={(e) => setAllowAdjacentLabBoundary(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 bg-slate-950 text-indigo-600"
            />
            <span>
              Allow VIT Period 4/5 (11:40–11:50) & Period 10/11 (17:40–17:50) adjacent theory/lab
              coexistence
            </span>
          </label>
        </div>
      </div>

      {/* Clash Report Body */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">
              Detailed Clash & Compatibility Verification Report
            </h2>
            <p className="text-xs text-slate-400">
              All collisions are verified against the authoritative VIT period-and-time mapping.
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
            {[
              { id: 'all', label: `All Issues (${clashReport.clashes.length})` },
              {
                id: 'confirmed',
                label: `Confirmed Errors (${clashReport.confirmed_clash_count})`,
              },
              { id: 'warnings', label: `Warnings & Unresolved (${clashReport.warning_count})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterMode(tab.id as any)}
                className={`rounded-md px-3 py-1 font-medium transition cursor-pointer ${
                  filterMode === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredClashes.length === 0 ? (
          <div className="py-12 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-emerald-400 mb-2" />
            <h3 className="text-sm font-bold text-white">
              Zero Clashes Detected in Current Filter
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              All verified class occurrences occupy non-overlapping time intervals.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredClashes.map((clash) => {
              const isError = clash.severity === 'ERROR';
              return (
                <div
                  key={clash.clash_id}
                  className={`rounded-xl border p-4 ${
                    isError
                      ? 'border-rose-500/40 bg-rose-950/20'
                      : 'border-amber-500/40 bg-amber-950/20'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isError ? (
                        <AlertOctagon className="h-4 w-4 text-rose-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                      )}
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                          isError
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {clash.clash_type.replace(/_/g, ' ')}
                      </span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                        {clash.is_confirmed
                          ? 'Confirmed Time Collision'
                          : 'Possible Clash (Unresolved Slot)'}
                      </span>
                      {clash.day && (
                        <span className="font-mono text-xs font-bold text-white">
                          {clash.day} {clash.period ? `• P${clash.period}` : ''} (
                          {clash.time_interval})
                        </span>
                      )}
                    </div>

                    {clash.conflicting_slots.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400">Conflicting Slots:</span>
                        {clash.conflicting_slots.map((s) => (
                          <span
                            key={s}
                            className="rounded bg-slate-900 border border-slate-700 px-2 py-0.5 font-mono text-xs font-bold text-rose-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Course A vs Course B */}
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400">
                        Course A
                      </div>
                      <div className="mt-0.5 font-semibold text-white">
                        {clash.course_a_code} — {clash.course_a_title}
                      </div>
                      <div className="mt-1 text-slate-300">
                        Faculty: <strong>{clash.course_a_faculty}</strong> • Slot:{' '}
                        <span className="font-mono text-indigo-300">{clash.course_a_slot}</span>
                        {clash.course_a_venue ? ` • Venue: ${clash.course_a_venue}` : ''}
                      </div>
                    </div>

                    {clash.course_b_code && (
                      <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2.5">
                        <div className="text-[10px] uppercase tracking-wider text-slate-400">
                          Course B
                        </div>
                        <div className="mt-0.5 font-semibold text-white">
                          {clash.course_b_code} — {clash.course_b_title}
                        </div>
                        <div className="mt-1 text-slate-300">
                          Faculty: <strong>{clash.course_b_faculty}</strong> • Slot:{' '}
                          <span className="font-mono text-indigo-300">{clash.course_b_slot}</span>
                          {clash.course_b_venue ? ` • Venue: ${clash.course_b_venue}` : ''}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="mt-2.5 text-xs text-slate-200">{clash.explanation}</p>

                  {/* Suggested Compatible Alternatives */}
                  {clash.suggested_alternatives.length > 0 && (
                    <div className="mt-3 border-t border-slate-800/80 pt-2.5">
                      <div className="text-[11px] font-semibold text-emerald-300 mb-1.5 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Suggested Clash-Free Alternatives:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {clash.suggested_alternatives.map((alt) => {
                          const targetOldId =
                            alt.course_code === clash.course_a_code
                              ? clash.course_a_section_id
                              : clash.course_b_section_id;
                          return (
                            <button
                              key={alt.section_id}
                              onClick={() => onReplaceSection(targetOldId, alt.section_id)}
                              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-900/50 transition cursor-pointer"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-400" />
                              <span>
                                Switch <strong>{alt.course_code}</strong> ({alt.course_type_code}) to{' '}
                                <strong>{alt.faculty_name}</strong> [{alt.slot_combination},{' '}
                                {alt.venue}]
                                {alt.avg_rating ? ` ★ ${alt.avg_rating.toFixed(2)}` : ''}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
