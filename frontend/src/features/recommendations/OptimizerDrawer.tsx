import React, { useState } from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Star,
  Clock,
  Building2,
  Layers,
  Check,
} from 'lucide-react';
import {
  Course,
  GeneratedTimetableOption,
  OptimizerResponse,
} from '../../types/ffcs';
import { generateOptimizedTimetables } from '../../lib/api';

interface OptimizerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  selectedCourseCodes: string[];
  lockedSectionIds: number[];
  preferredFaculty: string[];
  avoidedFaculty: string[];
  preferredSlots: string[];
  avoidedSlots: string[];
  minCredits: number;
  targetCredits: number;
  maxCredits: number;
  campus: string;
  allowAdjacentLabBoundary: boolean;
  onApplyTimetable: (sectionIds: number[]) => void;
}

export const OptimizerDrawer: React.FC<OptimizerDrawerProps> = ({
  isOpen,
  onClose,
  courses,
  selectedCourseCodes,
  lockedSectionIds,
  preferredFaculty,
  avoidedFaculty,
  preferredSlots,
  avoidedSlots,
  minCredits,
  targetCredits,
  maxCredits,
  campus,
  allowAdjacentLabBoundary,
  onApplyTimetable,
}) => {
  const defaultCodes =
    selectedCourseCodes.length > 0
      ? selectedCourseCodes
      : ['BACSE104', 'BAITE101', 'BAITE102', 'BAITE103', 'BAMAT207', 'BACHY105', 'BAHUM101'];

  const [requiredCodes, setRequiredCodes] = useState<string[]>(defaultCodes);
  const [sessionPref, setSessionPref] = useState<'balanced' | 'morning_theory' | 'evening_theory'>(
    'balanced'
  );
  const [avoid8am, setAvoid8am] = useState(true);
  const [compactSchedule, setCompactSchedule] = useState(true);
  const [fewerTransitions, setFewerTransitions] = useState(true);
  const [sameFacultyPair, setSameFacultyPair] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizerResponse | null>(null);

  if (!isOpen) return null;

  const toggleCourseCode = (code: string) => {
    setRequiredCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleRunOptimizer = async () => {
    setLoading(true);
    try {
      const res = await generateOptimizedTimetables({
        required_course_codes: requiredCodes,
        locked_section_ids: lockedSectionIds,
        preferred_faculty: preferredFaculty,
        avoided_faculty: avoidedFaculty,
        preferred_slots: preferredSlots,
        avoided_slots: avoidedSlots,
        session_preference: sessionPref,
        avoid_8am: avoid8am,
        compact_schedule: compactSchedule,
        fewer_campus_transitions: fewerTransitions,
        same_faculty_for_theory_lab: sameFacultyPair,
        min_credits: minCredits,
        target_credits: targetCredits,
        max_credits: maxCredits,
        campus,
        allow_adjacent_lab_boundary: allowAdjacentLabBoundary,
      });
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectedCreditsSum = courses
    .filter((c) => requiredCodes.includes(c.course_code))
    .reduce((acc, c) => acc + c.credits, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-amber-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Smart FFCS Timetable Generator & Multi-Profile Optimizer
              </h2>
              <p className="text-xs text-slate-400">
                Generates clash-free schedules ranked across Best Fit, Compact Timetable, and
                Maximum Flexibility profiles.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Column 1 & 2: Required Courses */}
            <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-white">
                  1. Select Required Courses to Schedule ({requiredCodes.length} selected •{' '}
                  <span className="text-indigo-400 font-mono">{selectedCreditsSum} Credits</span>)
                </span>
                <span className="text-[11px] text-slate-400">
                  Max Limit: {maxCredits} Credits
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {courses.map((c) => {
                  const checked = requiredCodes.includes(c.course_code);
                  return (
                    <label
                      key={c.course_code}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs cursor-pointer transition ${
                        checked
                          ? 'border-indigo-500/50 bg-indigo-950/30 text-white'
                          : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCourseCode(c.course_code)}
                          className="rounded border-slate-700 bg-slate-950 text-indigo-600"
                        />
                        <div className="truncate">
                          <span className="font-mono font-bold text-indigo-300">
                            {c.course_code}
                          </span>{' '}
                          — <span>{c.course_title}</span>
                        </div>
                      </div>
                      <span className="ml-2 shrink-0 font-mono text-[10px] text-slate-400">
                        {c.credits} Cr
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Column 3: Optimization Soft Preferences */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3 text-xs">
              <div className="font-bold text-white">2. Optimization Preferences</div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Theory Session Preference
                </label>
                <select
                  value={sessionPref}
                  onChange={(e) => setSessionPref(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-white"
                >
                  <option value="balanced">Balanced (Morning or Evening)</option>
                  <option value="morning_theory">Morning Theory (A1–G1) + Afternoon Labs</option>
                  <option value="evening_theory">Evening Theory (A2–G2) + Morning Labs</option>
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={avoid8am}
                    onChange={(e) => setAvoid8am(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600"
                  />
                  <span>Penalize 8:00 AM Period 1 classes</span>
                </label>

                <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compactSchedule}
                    onChange={(e) => setCompactSchedule(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600"
                  />
                  <span>Minimize idle gaps between classes</span>
                </label>

                <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fewerTransitions}
                    onChange={(e) => setFewerTransitions(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600"
                  />
                  <span>Minimize SJT ↔ PRP ↔ TT building transitions</span>
                </label>

                <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameFacultyPair}
                    onChange={(e) => setSameFacultyPair(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-600"
                  />
                  <span>Require same faculty for Theory & Lab (where offered)</span>
                </label>
              </div>

              <button
                onClick={handleRunOptimizer}
                disabled={loading || requiredCodes.length === 0}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 transition cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-amber-300" />
                {loading ? 'Searching Valid Combinations...' : 'Run Smart Timetable Generator'}
              </button>
            </div>
          </div>

          {/* Results Area */}
          {result && (
            <div className="space-y-4">
              {!result.success ? (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-5 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-rose-300">
                    <AlertTriangle className="h-5 w-5 text-rose-400" />
                    <span>{result.message}</span>
                  </div>
                  <div className="font-semibold text-slate-200 mt-2">Conflicting Constraints:</div>
                  <ul className="list-disc pl-5 space-y-1 text-rose-200">
                    {result.conflicting_constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                  {result.suggested_relaxations.length > 0 && (
                    <>
                      <div className="font-semibold text-emerald-300 mt-2">
                        Suggested Solutions:
                      </div>
                      <ul className="list-disc pl-5 space-y-1 text-emerald-200">
                        {result.suggested_relaxations.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-emerald-300 flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      {result.message}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Simulator Note: Applying a profile updates your planning workspace; it does
                      not submit to VTOP.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {result.recommendations.map((rec: GeneratedTimetableOption) => (
                      <div
                        key={rec.profile_id}
                        className="flex flex-col justify-between rounded-2xl border border-slate-700/90 bg-slate-950/90 p-4 shadow-xl"
                      >
                        <div>
                          {/* Profile Header */}
                          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                            <div>
                              <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300">
                                {rec.profile_badge}
                              </span>
                              <h3 className="mt-1.5 text-base font-bold text-white">
                                {rec.profile_name}
                              </h3>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400 uppercase">Score</div>
                              <div className="font-mono text-xl font-extrabold text-emerald-400">
                                {rec.total_score}
                              </div>
                            </div>
                          </div>

                          {/* KPI Metrics */}
                          <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-[11px]">
                            <div className="rounded-lg bg-slate-900 p-2">
                              <div className="text-[10px] text-slate-400">No8AM ★</div>
                              <div className="mt-0.5 font-mono font-bold text-amber-400 flex items-center justify-center gap-0.5">
                                <Star className="h-3 w-3 fill-amber-400" />
                                {rec.avg_faculty_rating ? rec.avg_faculty_rating.toFixed(2) : 'N/A'}
                              </div>
                            </div>
                            <div className="rounded-lg bg-slate-900 p-2">
                              <div className="text-[10px] text-slate-400">Gaps</div>
                              <div className="mt-0.5 font-mono font-bold text-white flex items-center justify-center gap-0.5">
                                <Clock className="h-3 w-3 text-indigo-400" />
                                {rec.gap_hours}p
                              </div>
                            </div>
                            <div className="rounded-lg bg-slate-900 p-2">
                              <div className="text-[10px] text-slate-400">8 AMs</div>
                              <div className="mt-0.5 font-mono font-bold text-slate-200">
                                {rec.early_8am_count}/wk
                              </div>
                            </div>
                            <div className="rounded-lg bg-slate-900 p-2">
                              <div className="text-[10px] text-slate-400">Backups</div>
                              <div className="mt-0.5 font-mono font-bold text-emerald-400 flex items-center justify-center gap-0.5">
                                <Layers className="h-3 w-3" />
                                {rec.flexibility_alternatives_count}
                              </div>
                            </div>
                          </div>

                          {/* Ranking Reasons */}
                          <div className="mt-3 space-y-1 text-[11px] text-slate-300">
                            {rec.reasons.map((r, idx) => (
                              <div key={idx} className="flex items-start gap-1.5">
                                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{r}</span>
                              </div>
                            ))}
                          </div>

                          {/* Daily Class Load Bar */}
                          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                            <div className="text-[10px] font-semibold text-slate-400 mb-1 flex items-center justify-between">
                              <span>Daily Class Periods (MON–FRI)</span>
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" /> {rec.building_transitions} Bldg
                                Transitions
                              </span>
                            </div>
                            <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px]">
                              {['MON', 'TUE', 'WED', 'THU', 'FRI'].map((d) => (
                                <div key={d} className="rounded bg-slate-950 py-1">
                                  <span className="text-slate-500">{d}:</span>{' '}
                                  <strong className="text-indigo-300">
                                    {rec.daily_summary[d] || 0}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Assigned Sections List */}
                          <div className="mt-3 max-h-52 overflow-y-auto space-y-1 pr-1">
                            {rec.sections.map((sec) => (
                              <div
                                key={sec.id}
                                className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/80 px-2.5 py-1.5 text-[11px]"
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-bold text-indigo-300">
                                      {sec.course_code}
                                    </span>
                                    <span className="rounded bg-slate-800 px-1 font-mono text-[9px] text-slate-300">
                                      {sec.course_type_code}
                                    </span>
                                    <span className="truncate font-medium text-white">
                                      {sec.faculty_name}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right font-mono text-[10px] shrink-0">
                                  <span className="font-bold text-emerald-300">
                                    {sec.slot_combination}
                                  </span>{' '}
                                  <span className="text-slate-400">({sec.venue})</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onApplyTimetable(rec.selected_section_ids);
                            onClose();
                          }}
                          className="mt-4 w-full rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition cursor-pointer"
                        >
                          Apply "{rec.profile_name}" Timetable
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
