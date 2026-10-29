import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  ShieldCheck,
  Sliders,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ClashReport } from '../types/ffcs';

interface ClashCheckerPanelProps {
  clashReport: ClashReport | null;
  selectedSectionsCount: number;
  allowAdjacentLabBoundary: boolean;
  setAllowAdjacentLabBoundary: (v: boolean) => void;
  onReplaceSection: (oldSectionId: number | null | undefined, newSectionId: number) => void;
  isDrawer?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export const ClashCheckerPanel: React.FC<ClashCheckerPanelProps> = ({
  clashReport,
  selectedSectionsCount,
  allowAdjacentLabBoundary,
  setAllowAdjacentLabBoundary,
  onReplaceSection,
  isDrawer = false,
  isOpen = true,
  onClose,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'confirmed' | 'warnings'>('all');
  const [expandedResolveIds, setExpandedResolveIds] = useState<Record<string, boolean>>({});

  if (isDrawer && !isOpen) return null;

  const filteredClashes =
    clashReport?.clashes.filter((c) => {
      if (filterMode === 'confirmed') return c.is_confirmed && c.severity === 'ERROR';
      if (filterMode === 'warnings') return !c.is_confirmed || c.severity === 'WARNING';
      return true;
    }) ?? [];

  const innerContent = (
    <div className="flex h-full flex-col bg-white dark:bg-[#1E1F20]">
      {/* Header */}
      <div className="border-b border-[#DADCE0] dark:border-[#3C4043] px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              (clashReport?.confirmed_clash_count ?? 0) > 0
                ? 'bg-[#FCE8E6] text-[#D93025]'
                : 'bg-[#E6F4EA] text-[#188038]'
            }`}
          >
            {(clashReport?.confirmed_clash_count ?? 0) > 0 ? (
              <AlertOctagon className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[#202124] dark:text-[#E3E3E3]">
              Clash Checker & Interval Verifier
            </h2>
            <p className="text-[12px] text-[#5F6368] dark:text-[#9AA0A6]">
              Verifies theory, lab, tutorial, combined slots, and credit constraints.
            </p>
          </div>
        </div>

        {isDrawer && onClose && (
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#5F6368] hover:bg-[#F1F3F4] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Summary Strip & VTOP Boundary Rule Switch */}
      <div className="border-b border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/50 px-5 py-3 space-y-3">
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-2.5">
            <div className="text-[11px] font-medium text-[#5F6368]">Confirmed Clashes</div>
            <div
              className={`mt-0.5 font-mono text-[20px] font-bold ${
                (clashReport?.confirmed_clash_count ?? 0) > 0
                  ? 'text-[#D93025]'
                  : 'text-[#188038]'
              }`}
            >
              {clashReport?.confirmed_clash_count ?? 0}
            </div>
          </div>

          <div className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-2.5">
            <div className="text-[11px] font-medium text-[#5F6368]">Unverified / Warnings</div>
            <div className="mt-0.5 font-mono text-[20px] font-bold text-[#F9AB00]">
              {(clashReport?.possible_clash_count ?? 0) + (clashReport?.warning_count ?? 0)}
            </div>
          </div>

          <div className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-2.5">
            <div className="text-[11px] font-medium text-[#5F6368]">Validated Sections</div>
            <div className="mt-0.5 font-mono text-[20px] font-bold text-[#1A73E8] dark:text-[#8AB4F8]">
              {selectedSectionsCount}
            </div>
          </div>
        </div>

        {/* Filter pills + VTOP Period 4/5 Boundary Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-0.5">
            {[
              { id: 'all', label: 'All Issues' },
              { id: 'confirmed', label: 'Confirmed Only' },
              { id: 'warnings', label: 'Warnings & Unresolved' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterMode(tab.id as any)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterMode === tab.id
                    ? 'bg-[#1A73E8] text-white'
                    : 'text-[#5F6368] hover:text-[#202124]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setAllowAdjacentLabBoundary(!allowAdjacentLabBoundary)}
            title="In VIT Vellore, Period 4 Theory (11:00-11:50) and Period 5 Lab (11:40-12:30) share 10 clock minutes but are distinct VTOP periods."
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] px-2.5 py-1 text-[11px] font-medium text-[#5F6368] hover:text-[#202124] cursor-pointer"
          >
            <Sliders className="h-3 w-3 text-[#1A73E8]" />
            <span>
              VTOP P4/P5 Rule: {allowAdjacentLabBoundary ? 'Allowed (Official)' : 'Strict Clock'}
            </span>
          </button>
        </div>
      </div>

      {/* Clash Cards List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {!clashReport ? (
          <div className="py-12 text-center text-[13px] text-[#5F6368]">
            Evaluating timetable intervals...
          </div>
        ) : filteredClashes.length === 0 ? (
          <div className="rounded-2xl border border-[#188038]/30 bg-[#E6F4EA]/50 dark:bg-[#143321]/40 p-8 text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#188038] text-white">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-[16px] font-bold text-[#137333] dark:text-[#81C995]">
              Zero Confirmed Timetable Clashes!
            </h3>
            <p className="text-[13px] text-[#5F6368] dark:text-[#9AA0A6]">
              All <strong>{selectedSectionsCount}</strong> selected section(s) ({clashReport.total_credits} Credits) have been verified against official VIT time intervals with no overlapping slots.
            </p>
          </div>
        ) : (
          filteredClashes.map((clash) => {
            const isError = clash.is_confirmed && clash.severity === 'ERROR';
            const isResolveOpen = expandedResolveIds[clash.clash_id] ?? true;

            return (
              <div
                key={clash.clash_id}
                className={`rounded-2xl border p-4 space-y-3 ${
                  isError
                    ? 'border-[#D93025]/50 bg-[#FCE8E6]/40 dark:bg-[#5C1E1B]/30'
                    : 'border-[#F9AB00]/50 bg-[#FEF7E0]/50 dark:bg-[#36290C]/30'
                }`}
              >
                {/* Clash Type & Severity Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isError ? (
                      <AlertOctagon className="h-4 w-4 text-[#D93025]" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-[#B06000]" />
                    )}
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                        isError
                          ? 'bg-[#D93025] text-white'
                          : 'bg-[#F9AB00] text-[#202124]'
                      }`}
                    >
                      {clash.clash_type.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {clash.day && clash.time_interval && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#202124] dark:text-[#E3E3E3] tabular-time">
                      <Clock className="h-3 w-3 text-[#D93025]" />
                      {clash.day} • {clash.time_interval}
                    </span>
                  )}
                </div>

                {/* Course A vs Course B Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[12px] font-bold text-[#1A73E8] dark:text-[#8AB4F8]">
                        {clash.course_a_code}
                      </span>
                      <span className="rounded bg-[#F1F3F4] dark:bg-[#282A2C] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#202124] dark:text-[#E3E3E3]">
                        Slot: {clash.conflicting_slots[0] || 'N/A'}
                      </span>
                    </div>
                    <div className="mt-1 text-[13px] font-semibold text-[#202124] dark:text-[#E3E3E3]">
                      {clash.course_a_title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#5F6368]">
                      {clash.course_a_faculty || 'N/A'} • {clash.course_a_venue || 'N/A'}
                    </div>
                  </div>

                  {clash.course_b_code && (
                    <div className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[12px] font-bold text-[#D93025] dark:text-[#F28B82]">
                          {clash.course_b_code}
                        </span>
                        <span className="rounded bg-[#FCE8E6] dark:bg-[#5C1E1B] px-1.5 py-0.5 font-mono text-[11px] font-bold text-[#D93025] dark:text-[#F28B82]">
                          Slot: {clash.conflicting_slots[1] || clash.conflicting_slots[0] || 'N/A'}
                        </span>
                      </div>
                      <div className="mt-1 text-[13px] font-semibold text-[#202124] dark:text-[#E3E3E3]">
                        {clash.course_b_title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#5F6368]">
                        {clash.course_b_faculty} • {clash.course_b_venue}
                      </div>
                    </div>
                  )}
                </div>

                {/* Explanation */}
                <p className="text-[12px] leading-relaxed text-[#202124] dark:text-[#E3E3E3]">
                  {clash.explanation}
                </p>

                {/* Resolve Clash Action & Compatible Replacements */}
                <div className="border-t border-[#DADCE0] dark:border-[#3C4043] pt-2.5">
                  <button
                    onClick={() =>
                      setExpandedResolveIds((prev) => ({
                        ...prev,
                        [clash.clash_id]: !isResolveOpen,
                      }))
                    }
                    className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#1A73E8] dark:text-[#8AB4F8] hover:underline cursor-pointer"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    <span>
                      Resolve Clash ({clash.suggested_alternatives.length} compatible replacement section
                      {clash.suggested_alternatives.length === 1 ? '' : 's'})
                    </span>
                    {isResolveOpen ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {isResolveOpen && (
                    <div className="mt-2 space-y-1.5">
                      {clash.suggested_alternatives.length === 0 ? (
                        <div className="rounded-xl bg-white dark:bg-[#1E1F20] p-2.5 text-[12px] text-[#5F6368]">
                          No single-step replacement section found because all alternative slots for these courses also conflict with your locked or selected classes. Try unlocking a conflicting section or running the AI Timetable Optimizer.
                        </div>
                      ) : (
                        clash.suggested_alternatives.map((alt) => {
                          const targetOldId =
                            alt.course_code === clash.course_a_code
                              ? clash.course_a_section_id
                              : clash.course_b_section_id;
                          return (
                            <div
                              key={alt.section_id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] px-3 py-2 text-[12px]"
                            >
                              <div>
                                <span className="font-mono font-bold text-[#1A73E8] dark:text-[#8AB4F8]">
                                  {alt.course_code} [{alt.course_type_code}]
                                </span>{' '}
                                →{' '}
                                <span className="font-mono font-bold text-[#188038]">
                                  {alt.slot_combination}
                                </span>{' '}
                                • <span className="font-semibold">{alt.faculty_name}</span>{' '}
                                <span className="text-[#5F6368]">({alt.venue})</span>
                                <div className="text-[11px] text-[#5F6368]">
                                  Clash-free replacement option
                                </div>
                              </div>

                              <button
                                onClick={() => onReplaceSection(targetOldId, alt.section_id)}
                                className="rounded-lg bg-[#188038] hover:bg-[#137333] px-3 py-1 text-[11px] font-semibold text-white transition-colors cursor-pointer"
                              >
                                Switch & Resolve
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  if (!isDrawer) {
    return (
      <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden shadow-xs">
        {innerContent}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {innerContent}
      </div>
    </div>
  );
};
