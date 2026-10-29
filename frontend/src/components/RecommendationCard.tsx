import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Eye,
  Scale,
  Check,
  Layers,
  AlertTriangle,
  X,
  Clock,
  ThumbsUp,
} from 'lucide-react';
import {
  Course,
  GeneratedTimetableOption,
  OptimizerResponse,
} from '../types/ffcs';
import { generateOptimizedTimetables } from '../lib/api';
import { TimetableSlotKey } from './BackupTimetableTabs';

interface RecommendationCardProps {
  profileTitle: string;
  profileSubtitle: string;
  option: GeneratedTimetableOption | null;
  preferredFaculty: string[];
  onPreview: (option: GeneratedTimetableOption) => void;
  onCompareWithPrimary: (option: GeneratedTimetableOption) => void;
  onApplyToPrimary: (sectionIds: number[]) => void;
  onSaveAsBackup: (targetBackup: TimetableSlotKey, sectionIds: number[]) => void;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  profileTitle,
  profileSubtitle,
  option,
  preferredFaculty,
  onPreview,
  onCompareWithPrimary,
  onApplyToPrimary,
  onSaveAsBackup,
}) => {
  const [savedBackupToast, setSavedBackupToast] = useState<string | null>(null);

  if (!option) {
    return (
      <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/40 p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-[16px] font-bold text-[#202124] dark:text-[#E3E3E3]">
            {profileTitle}
          </h3>
          <p className="mt-0.5 text-[12px] text-[#5F6368] dark:text-[#9AA0A6]">
            {profileSubtitle}
          </p>
        </div>
        <div className="my-6 text-center text-[12px] text-[#5F6368]">
          Click <strong>Generate Best Timetables</strong> to compute a verified clash-free combination for this profile.
        </div>
      </div>
    );
  }

  const uniqueCourses = new Set(option.sections.map((s) => s.course_code)).size;
  const prefLower = new Set(preferredFaculty.map((f) => f.toLowerCase()));
  const prefMatches = option.sections.filter((s) =>
    prefLower.has(s.faculty_name.toLowerCase())
  ).length;

  return (
    <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F0FE] dark:bg-[#1E3A5F] px-2.5 py-0.5 text-[11px] font-bold text-[#1A73E8] dark:text-[#8AB4F8]">
              <Sparkles className="h-3 w-3" />
              <span>{option.profile_name || profileTitle}</span>
            </div>
            <p className="mt-1 text-[12px] text-[#5F6368] dark:text-[#9AA0A6]">
              {profileSubtitle}
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-[18px] font-bold text-[#188038] dark:text-[#81C995]">
              {Math.round(option.total_score)} pts
            </div>
            <div className="text-[10px] font-semibold text-[#5F6368]">
              {option.profile_badge}
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="mt-3.5 grid grid-cols-3 gap-2 rounded-xl bg-[#F8F9FC] dark:bg-[#282A2C] p-3 text-center">
          <div>
            <div className="text-[10px] font-medium text-[#5F6368]">Courses / Cr</div>
            <div className="mt-0.5 font-mono text-[13px] font-bold text-[#202124] dark:text-[#E3E3E3]">
              {uniqueCourses}C • {option.total_credits}Cr
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium text-[#5F6368]">Clashes</div>
            <div className="mt-0.5 inline-flex items-center gap-1 font-mono text-[13px] font-bold text-[#188038]">
              <CheckCircle2 className="h-3.5 w-3.5" /> 0
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium text-[#5F6368]">Pref Matches</div>
            <div className="mt-0.5 inline-flex items-center gap-1 font-mono text-[13px] font-bold text-[#1A73E8] dark:text-[#8AB4F8]">
              <ThumbsUp className="h-3 w-3" /> {prefMatches}
            </div>
          </div>
        </div>

        {/* Trade-offs & Why Ranked Highly */}
        <div className="mt-3 space-y-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5F6368]">
            Optimization Rationale & Trade-offs
          </div>
          <ul className="space-y-1 text-[12px] text-[#202124] dark:text-[#E3E3E3]">
            {option.reasons.slice(0, 3).map((reason: string, i: number) => (
              <li key={i} className="flex items-start gap-1.5">
                <Check className="h-3.5 w-3.5 shrink-0 text-[#188038] mt-0.5" />
                <span>{reason}</span>
              </li>
            ))}
            <li className="flex items-start gap-1.5 text-[#5F6368] dark:text-[#9AA0A6]">
              <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Weekly gap hours: {option.gap_hours} • 8 AM classes: {option.early_8am_count}
              </span>
            </li>
          </ul>
        </div>

        {/* Compact Section Pills */}
        <div className="mt-3 flex flex-wrap gap-1">
          {option.sections.map((s) => (
            <span
              key={s.id}
              className="rounded-md border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-1.5 py-0.5 font-mono text-[10px] text-[#202124] dark:text-[#E3E3E3]"
              title={`${s.course_title} — ${s.faculty_name} (${s.venue})`}
            >
              <strong>{s.course_code}</strong>({s.course_type_code}): {s.slot_combination}
            </span>
          ))}
        </div>
      </div>

      {/* Actions Footer: Preview, Compare, Apply to Primary, Save as Backup */}
      <div className="space-y-2 border-t border-[#DADCE0] dark:border-[#3C4043] pt-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onPreview(option)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] hover:bg-[#F1F3F4] px-3 py-1.5 text-[12px] font-semibold text-[#202124] dark:text-[#E3E3E3] cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5 text-[#1A73E8]" /> Preview
          </button>
          <button
            onClick={() => onCompareWithPrimary(option)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] hover:bg-[#F1F3F4] px-3 py-1.5 text-[12px] font-semibold text-[#202124] dark:text-[#E3E3E3] cursor-pointer"
          >
            <Scale className="h-3.5 w-3.5 text-[#1A73E8]" /> Compare
          </button>
        </div>

        <button
          onClick={() => onApplyToPrimary(option.selected_section_ids)}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] px-3 py-2 text-[12px] font-semibold text-white shadow-2xs transition-colors cursor-pointer"
        >
          <Check className="h-4 w-4" /> Apply to Primary Timetable
        </button>

        <div className="flex items-center justify-between gap-1 pt-0.5">
          <span className="text-[11px] font-medium text-[#5F6368] flex items-center gap-1">
            <Layers className="h-3 w-3" /> Save as Backup:
          </span>
          <div className="flex items-center gap-1">
            {(['backup1', 'backup2', 'backup3'] as const).map((bKey, idx) => (
              <button
                key={bKey}
                onClick={() => {
                  onSaveAsBackup(bKey, option.selected_section_ids);
                  setSavedBackupToast(`Backup ${idx + 1}`);
                  setTimeout(() => setSavedBackupToast(null), 2000);
                }}
                className="rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] hover:border-[#1A73E8] hover:text-[#1A73E8] px-2 py-0.5 text-[11px] font-semibold text-[#202124] dark:text-[#E3E3E3] cursor-pointer"
              >
                B{idx + 1}
              </button>
            ))}
          </div>
        </div>

        {savedBackupToast && (
          <div className="text-center text-[11px] font-semibold text-[#188038]">
            Saved to {savedBackupToast}!
          </div>
        )}
      </div>
    </div>
  );
};

interface AiRecommendationsModalProps {
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
  onApplyToPrimary: (sectionIds: number[]) => void;
  onSaveAsBackup: (targetBackup: TimetableSlotKey, sectionIds: number[]) => void;
  onCompareWithPrimary: (option: GeneratedTimetableOption) => void;
}

export const AiRecommendationsModal: React.FC<AiRecommendationsModalProps> = ({
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
  onApplyToPrimary,
  onSaveAsBackup,
  onCompareWithPrimary,
}) => {
  const defaultCodes =
    selectedCourseCodes.length > 0
      ? selectedCourseCodes
      : ['BACSE104', 'BAITE101', 'BAITE102', 'BAMAT207', 'BACHY105', 'BAHUM101'];

  const [requiredCodes, setRequiredCodes] = useState<string[]>(defaultCodes);
  const [sessionPref, setSessionPref] = useState<'balanced' | 'morning_theory' | 'evening_theory'>('balanced');
  const [avoid8am, setAvoid8am] = useState(true);
  const [compactSchedule, setCompactSchedule] = useState(true);
  const [fewerTransitions, setFewerTransitions] = useState(true);
  const [sameFacultyPair, setSameFacultyPair] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizerResponse | null>(null);
  const [previewOption, setPreviewOption] = useState<GeneratedTimetableOption | null>(null);

  if (!isOpen) return null;

  const toggleCourseCode = (code: string) => {
    setRequiredCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleRunOptimizer = async () => {
    setLoading(true);
    setPreviewOption(null);
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const recs = result?.recommendations || [];
  const bestFitOpt = recs.find((r) => r.profile_id === 'best_fit') || recs[0] || null;
  const compactOpt = recs.find((r) => r.profile_id === 'compact') || recs[1] || null;
  const flexOpt = recs.find((r) => r.profile_id === 'flexible') || recs[2] || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#DADCE0] dark:border-[#3C4043] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1A73E8] text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[20px] font-bold text-[#202124] dark:text-[#E3E3E3]">
                AI Timetable Recommendations & Constraint Optimizer
              </h2>
              <p className="text-[13px] text-[#5F6368] dark:text-[#9AA0A6]">
                Generates verified, clash-free schedules across Best Fit, Compact Timetable, and Maximum Flexibility profiles.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#5F6368] hover:bg-[#F1F3F4] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Course & Constraint Selection Bar */}
        <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/50 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#5F6368]">
              1. Select Required Courses ({requiredCodes.length} selected)
            </span>
            <div className="flex flex-wrap items-center gap-3 text-[12px]">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={avoid8am}
                  onChange={(e) => setAvoid8am(e.target.checked)}
                  className="accent-[#1A73E8]"
                />
                <span>Avoid 8:00 AM Slots</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compactSchedule}
                  onChange={(e) => setCompactSchedule(e.target.checked)}
                  className="accent-[#1A73E8]"
                />
                <span>Minimize Long Gaps</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fewerTransitions}
                  onChange={(e) => setFewerTransitions(e.target.checked)}
                  className="accent-[#1A73E8]"
                />
                <span>Fewer Building Transitions</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sameFacultyPair}
                  onChange={(e) => setSameFacultyPair(e.target.checked)}
                  className="accent-[#1A73E8]"
                />
                <span>Prefer Same Faculty for Theory+Lab</span>
              </label>
              <select
                value={sessionPref}
                onChange={(e) => setSessionPref(e.target.value as any)}
                className="rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] px-2.5 py-1 text-[12px] font-semibold"
              >
                <option value="balanced">Balanced Sessions</option>
                <option value="morning_theory">Morning Theory Preferred</option>
                <option value="evening_theory">Evening Theory Preferred</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {courses.map((c) => {
              const active = requiredCodes.includes(c.course_code);
              return (
                <button
                  key={c.course_code}
                  onClick={() => toggleCourseCode(c.course_code)}
                  className={`rounded-xl border px-3 py-1.5 text-[12px] font-medium transition-all cursor-pointer ${
                    active
                      ? 'border-[#1A73E8] bg-[#E8F0FE] dark:bg-[#1E3A5F] text-[#174EA6] dark:text-[#AECBFA] font-semibold'
                      : 'border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] text-[#5F6368]'
                  }`}
                >
                  <span className="font-mono font-bold">{c.course_code}</span> • {c.course_title} ({c.credits}Cr)
                </button>
              );
            })}
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleRunOptimizer}
              disabled={loading || requiredCodes.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] px-5 py-2 text-[13px] font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>{loading ? 'Searching Valid Combinations...' : 'Generate Best Timetables'}</span>
            </button>
          </div>
        </div>

        {/* Infeasible Diagnostics Alert if no valid combination exists */}
        {result && !result.success && (
          <div className="rounded-2xl border border-[#D93025]/40 bg-[#FCE8E6] p-4 text-[#A50E0E] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[14px]">
              <AlertTriangle className="h-4 w-4 text-[#D93025]" />
              <span>{result.message || 'No Valid Clash-Free Combination Exists for Current Constraints'}</span>
            </div>
            <ul className="list-disc pl-5 text-[12px] space-y-1">
              {result.conflicting_constraints.map((d: string, i: number) => (
                <li key={i}>{d}</li>
              ))}
              {result.suggested_relaxations.map((r: string, i: number) => (
                <li key={`r_${i}`} className="font-semibold">
                  Suggestion: {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Three Profile Recommendation Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <RecommendationCard
            profileTitle="Best Fit"
            profileSubtitle="Balanced schedule convenience, faculty preferences & verified ratings"
            option={bestFitOpt}
            preferredFaculty={preferredFaculty}
            onPreview={(opt) => setPreviewOption(opt)}
            onCompareWithPrimary={(opt) => {
              onCompareWithPrimary(opt);
              onClose();
            }}
            onApplyToPrimary={(ids) => {
              onApplyToPrimary(ids);
              onClose();
            }}
            onSaveAsBackup={onSaveAsBackup}
          />

          <RecommendationCard
            profileTitle="Compact Timetable"
            profileSubtitle="Minimizes empty daily gaps and compresses campus transitions"
            option={compactOpt}
            preferredFaculty={preferredFaculty}
            onPreview={(opt) => setPreviewOption(opt)}
            onCompareWithPrimary={(opt) => {
              onCompareWithPrimary(opt);
              onClose();
            }}
            onApplyToPrimary={(ids) => {
              onApplyToPrimary(ids);
              onClose();
            }}
            onSaveAsBackup={onSaveAsBackup}
          />

          <RecommendationCard
            profileTitle="Maximum Flexibility"
            profileSubtitle="Keeps more alternative sections open and avoids bottleneck slots"
            option={flexOpt}
            preferredFaculty={preferredFaculty}
            onPreview={(opt) => setPreviewOption(opt)}
            onCompareWithPrimary={(opt) => {
              onCompareWithPrimary(opt);
              onClose();
            }}
            onApplyToPrimary={(ids) => {
              onApplyToPrimary(ids);
              onClose();
            }}
            onSaveAsBackup={onSaveAsBackup}
          />
        </div>

        {/* Inline Schedule Preview when user clicks "Preview" on any card */}
        {previewOption && (
          <div className="rounded-2xl border border-[#1A73E8] bg-[#F8F9FC] dark:bg-[#282A2C] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[14px] font-bold text-[#202124] dark:text-[#E3E3E3]">
                Previewing {previewOption.profile_name} ({previewOption.profile_badge}) — {previewOption.total_credits} Credits
              </div>
              <button
                onClick={() => setPreviewOption(null)}
                className="text-[12px] font-semibold text-[#5F6368] hover:text-[#202124]"
              >
                Close Preview
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {previewOption.sections.map((sec) => (
                <div
                  key={sec.id}
                  className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-2.5 text-[12px]"
                >
                  <div className="font-mono font-bold text-[#1A73E8]">
                    {sec.course_code} [{sec.course_type_code}] — {sec.slot_combination}
                  </div>
                  <div className="font-medium text-[#202124] dark:text-[#E3E3E3]">
                    {sec.course_title}
                  </div>
                  <div className="text-[11px] text-[#5F6368]">
                    {sec.faculty_name} • {sec.venue}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
