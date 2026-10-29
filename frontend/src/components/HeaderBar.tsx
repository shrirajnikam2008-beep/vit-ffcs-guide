import React, { useState } from 'react';
import {
  Calendar,
  Sparkles,
  Undo2,
  BookmarkPlus,
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
  MapPin,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { ClashReport, TimetableDraft } from '../types/ffcs';

interface HeaderBarProps {
  semester: string;
  setSemester: (v: string) => void;
  campus: string;
  setCampus: (v: string) => void;
  programme: string;
  setProgramme: (v: string) => void;
  curriculum: string;
  setCurriculum: (v: string) => void;
  minCredits: number;
  setMinCredits: (v: number) => void;
  targetCredits: number;
  setTargetCredits: (v: number) => void;
  maxCredits: number;
  setMaxCredits: (v: number) => void;
  clashReport: ClashReport | null;
  canUndo: boolean;
  onUndo: () => void;
  onClearAll: () => void;
  onOpenOptimizer: () => void;
  drafts: TimetableDraft[];
  onSaveDraft: (name: string) => void;
  onLoadDraft: (draft: TimetableDraft) => void;
  onDeleteDraft: (id: number) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  semester,
  setSemester,
  campus,
  setCampus,
  programme,
  setProgramme,
  curriculum,
  setCurriculum,
  minCredits,
  setMinCredits,
  targetCredits,
  setTargetCredits,
  maxCredits,
  setMaxCredits,
  clashReport,
  canUndo,
  onUndo,
  onClearAll,
  onOpenOptimizer,
  drafts,
  onSaveDraft,
  onLoadDraft,
  onDeleteDraft,
  activeTab,
  setActiveTab,
}) => {
  const [showDraftsMenu, setShowDraftsMenu] = useState(false);
  const [draftNameInput, setDraftNameInput] = useState('');
  const [showCreditConfig, setShowCreditConfig] = useState(false);

  const totalCredits = clashReport?.total_credits ?? 0;
  const confirmedClashes = clashReport?.confirmed_clash_count ?? 0;
  const possibleClashes = clashReport?.possible_clash_count ?? 0;
  const warningsCount = clashReport?.warning_count ?? 0;

  const creditPct = Math.min(100, Math.round((totalCredits / Math.max(1, maxCredits)) * 100));

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md no-print">
      <div className="mx-auto max-w-[1600px] px-4 py-3">
        {/* Top Row: Brand, Academic Context Selectors, Primary Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shadow-inner">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-white">
                  VIT FFCS Guide
                </h1>
                <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[11px] font-semibold text-indigo-300">
                  Simulator & Planner
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Smart Course Registration, Verified Slot Engine & No8AM Faculty Analytics
              </p>
            </div>
          </div>

          {/* Selectors: Semester, Campus, Programme */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              <select
                aria-label="Semester selector"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="bg-transparent font-medium text-slate-200 focus:outline-none"
              >
                <option value="Winter Semester 2026-27" className="bg-slate-900">
                  Winter Semester 2026–27
                </option>
                <option value="Fall Semester 2026-27" className="bg-slate-900">
                  Fall Semester 2026–27
                </option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              <select
                aria-label="Campus selector"
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                className="bg-transparent font-medium text-slate-200 focus:outline-none"
              >
                <option value="vellore" className="bg-slate-900">
                  VIT Vellore
                </option>
                <option value="chennai" className="bg-slate-900">
                  VIT Chennai
                </option>
              </select>
            </div>

            <div className="hidden xl:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-amber-400" />
              <select
                aria-label="Programme selector"
                value={programme}
                onChange={(e) => setProgramme(e.target.value)}
                className="bg-transparent font-medium text-slate-200 focus:outline-none"
              >
                <option value="B.Tech Information Technology (SCORE)" className="bg-slate-900">
                  B.Tech IT (SCORE)
                </option>
                <option value="B.Tech Computer Science & Engineering (SCOPE)" className="bg-slate-900">
                  B.Tech CSE (SCOPE)
                </option>
                <option value="B.Tech Electronics & Communication (SENSE)" className="bg-slate-900">
                  B.Tech ECE (SENSE)
                </option>
              </select>
              <span className="text-slate-600">|</span>
              <select
                aria-label="Curriculum selector"
                value={curriculum}
                onChange={(e) => setCurriculum(e.target.value)}
                className="bg-transparent text-slate-300 focus:outline-none"
              >
                <option value="FFCS 2026-27 Regular" className="bg-slate-900">
                  Curriculum 2026–27
                </option>
                <option value="FFCS Honors / Minor" className="bg-slate-900">
                  Honors / Minor
                </option>
              </select>
            </div>
          </div>

          {/* Right Controls: Credits, Clash Status Pill, Drafts, Undo, Generate Best Timetable */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Credit Meter */}
            <div className="relative">
              <button
                onClick={() => setShowCreditConfig(!showCreditConfig)}
                className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs hover:border-slate-700 transition"
                title="Configure Min, Target, and Max Credit Limits"
              >
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Credits:</span>
                    <span
                      className={`font-mono font-bold ${
                        totalCredits > maxCredits
                          ? 'text-rose-400'
                          : totalCredits >= minCredits
                          ? 'text-emerald-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {totalCredits} / {maxCredits}
                    </span>
                    <span className="text-[10px] text-slate-500">(Target {targetCredits})</span>
                  </div>
                  <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full transition-all ${
                        totalCredits > maxCredits
                          ? 'bg-rose-500'
                          : totalCredits >= minCredits
                          ? 'bg-emerald-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${creditPct}%` }}
                    />
                  </div>
                </div>
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {showCreditConfig && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl z-50 text-xs">
                  <div className="font-semibold text-slate-200 mb-2">Credit Constraints</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-400">Minimum Credits</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={minCredits}
                        onChange={(e) => setMinCredits(Number(e.target.value))}
                        className="w-16 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-right font-mono text-white"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-slate-400">Target Credits</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={targetCredits}
                        onChange={(e) => setTargetCredits(Number(e.target.value))}
                        className="w-16 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-right font-mono text-white"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-slate-400">Maximum Limit</label>
                      <input
                        type="number"
                        min={1}
                        max={35}
                        value={maxCredits}
                        onChange={(e) => setMaxCredits(Number(e.target.value))}
                        className="w-16 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-right font-mono text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Live Clash Status Badge */}
            <button
              onClick={() => setActiveTab('clashes')}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                confirmedClashes > 0
                  ? 'border-rose-500/50 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
                  : possibleClashes > 0 || warningsCount > 0
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
              }`}
            >
              {confirmedClashes > 0 ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                  <span>{confirmedClashes} Clash{confirmedClashes > 1 ? 'es' : ''}</span>
                </>
              ) : possibleClashes > 0 || warningsCount > 0 ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <span>{warningsCount} Warning{warningsCount > 1 ? 's' : ''}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>0 Clashes</span>
                </>
              )}
            </button>

            {/* Undo & Clear */}
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
              title="Undo last section selection change"
            >
              <Undo2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Undo</span>
            </button>

            <button
              onClick={onClearAll}
              className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-400 hover:text-rose-300 hover:border-rose-500/30 transition"
              title="Clear all selected sections"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>

            {/* Drafts Manager */}
            <div className="relative">
              <button
                onClick={() => setShowDraftsMenu(!showDraftsMenu)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 transition"
              >
                <FolderOpen className="h-3.5 w-3.5 text-indigo-400" />
                <span>Drafts ({drafts.length})</span>
              </button>

              {showDraftsMenu && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl z-50 text-xs">
                  <div className="font-semibold text-white mb-2">Save Current Timetable Draft</div>
                  <div className="flex gap-1.5 mb-3">
                    <input
                      type="text"
                      placeholder="e.g., Morning Theory Plan A"
                      value={draftNameInput}
                      onChange={(e) => setDraftNameInput(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-white focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (draftNameInput.trim()) {
                          onSaveDraft(draftNameInput.trim());
                          setDraftNameInput('');
                        }
                      }}
                      className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-500"
                    >
                      <BookmarkPlus className="h-3.5 w-3.5" />
                      Save
                    </button>
                  </div>

                  <div className="border-t border-slate-800 pt-2">
                    <div className="text-[11px] font-medium text-slate-400 mb-1.5">
                      Saved Drafts
                    </div>
                    {drafts.length === 0 ? (
                      <p className="text-slate-500 py-2 text-center">No saved drafts yet.</p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5">
                        {drafts.map((d) => (
                          <div
                            key={d.id}
                            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1.5"
                          >
                            <button
                              onClick={() => {
                                onLoadDraft(d);
                                setShowDraftsMenu(false);
                              }}
                              className="text-left flex-1 hover:text-indigo-300"
                            >
                              <div className="font-medium text-slate-200">{d.name}</div>
                              <div className="text-[10px] text-slate-500">
                                {d.selected_section_ids.length} sections • {d.campus}
                              </div>
                            </button>
                            <button
                              onClick={() => onDeleteDraft(d.id)}
                              className="p-1 text-slate-500 hover:text-rose-400"
                              title="Delete draft"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Prominent Generate Best Timetable Button */}
            <button
              onClick={onOpenOptimizer}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] transition cursor-pointer"
            >
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>Generate Best Timetable</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: 'planner', label: '1. Interactive Course & Timetable Planner' },
              {
                id: 'clashes',
                label: `2. Clash Detection & Resolution (${confirmedClashes + warningsCount})`,
              },
              { id: 'assistant', label: '3. FFCS Planning Assistant' },
              { id: 'data', label: '4. Excel Import, Slot Map & Data Audit' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`rounded-lg px-3 py-1.5 font-medium transition cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-500" /> Theory (ETH)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Lab (ELA)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Tutorial (T*1/T*2)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-rose-500" /> Clash Highlight
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
