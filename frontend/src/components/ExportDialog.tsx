import React, { useState } from 'react';
import {
  Share2,
  Download,
  Printer,
  Users,
  BookmarkPlus,
  Trash2,
  CheckCircle2,
  Copy,
  Upload,
  X,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react';
import { CourseSection, TimetableDraft } from '../types/ffcs';
import { compareTwoTimetables, saveTimetableDraft } from '../lib/api';
import { BackupSlotSummary, TimetableSlotKey } from './BackupTimetableTabs';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'export' | 'share' | 'compare' | 'drafts';
  semester: string;
  campus: string;
  programme: string;
  curriculum: string;
  minCredits: number;
  targetCredits: number;
  maxCredits: number;
  selectedSectionIds: number[];
  lockedSectionIds: number[];
  selectedSections: CourseSection[];
  drafts: TimetableDraft[];
  slotSummaries: Record<TimetableSlotKey, BackupSlotSummary>;
  initialCompareIds?: number[];
  initialCompareLabel?: string;
  onLoadDraft: (draft: TimetableDraft) => void;
  onDeleteDraft: (id: number) => void;
  onRefreshDrafts: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  initialTab = 'export',
  semester,
  campus,
  programme,
  curriculum,
  minCredits,
  targetCredits,
  maxCredits,
  selectedSectionIds,
  lockedSectionIds,
  selectedSections,
  drafts,
  slotSummaries,
  initialCompareIds,
  initialCompareLabel,
  onLoadDraft,
  onDeleteDraft,
  onRefreshDrafts,
}) => {
  const [tab, setTab] = useState<'export' | 'share' | 'compare' | 'drafts'>(initialTab);
  const [draftName, setDraftName] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [savingShare, setSavingShare] = useState(false);

  // Friend / Secondary Timetable Comparison State
  const [friendName, setFriendName] = useState(initialCompareLabel || "Friend's Timetable");
  const [friendSectionIds, setFriendSectionIds] = useState<number[]>(
    initialCompareIds && initialCompareIds.length > 0
      ? initialCompareIds
      : slotSummaries.backup1.sectionIds
  );
  const [compareResult, setCompareResult] = useState<any | null>(null);
  const [comparing, setComparing] = useState(false);

  if (!isOpen) return null;

  // 1. Export Excel via Backend Endpoint
  const handleDownloadExcel = () => {
    const idsParam = selectedSectionIds.join(',');
    window.open(
      `/api/export/excel?section_ids=${encodeURIComponent(idsParam)}&campus=${encodeURIComponent(campus)}`,
      '_blank'
    );
  };

  // 2. Export Portable JSON File
  const handleDownloadJsonFile = () => {
    const payload = {
      app: 'VIT FFCS Guide',
      exportedAt: new Date().toISOString(),
      semester,
      campus,
      programme,
      curriculum,
      selected_section_ids: selectedSectionIds,
      locked_section_ids: lockedSectionIds,
      sections_summary: selectedSections.map((s) => ({
        id: s.id,
        course_code: s.course_code,
        course_title: s.course_title,
        course_type_code: s.course_type_code,
        slot_combination: s.slot_combination,
        faculty_name: s.faculty_name,
        venue: s.venue,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vit_ffcs_plan_${Date.now()}.ffcs.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 3. Persist Draft to SQLite Backend & Generate Real Share Link
  const handleCreateShareLink = async () => {
    setSavingShare(true);
    try {
      const saved = await saveTimetableDraft({
        name: draftName.trim() || `Shared Timetable (${new Date().toLocaleTimeString()})`,
        semester,
        campus,
        programme,
        curriculum,
        min_credits: minCredits,
        target_credits: targetCredits,
        max_credits: maxCredits,
        selected_section_ids: selectedSectionIds,
        locked_section_ids: lockedSectionIds,
        required_course_codes: Array.from(new Set(selectedSections.map((s) => s.course_code))),
        preferred_faculty: [],
        avoided_faculty: [],
        preferred_slots: [],
        avoided_slots: [],
        preferences: {},
      });
      const url = `${window.location.origin}${window.location.pathname}?share_draft=${saved.id}`;
      setShareUrl(url);
      onRefreshDrafts();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingShare(false);
    }
  };

  // 4. Import Friend's .ffcs.json file for comparison
  const handleImportFriendFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || '{}'));
        if (Array.isArray(parsed.selected_section_ids)) {
          setFriendSectionIds(parsed.selected_section_ids);
          setFriendName(file.name.replace('.ffcs.json', ''));
        }
      } catch (err) {
        console.error('Invalid friend timetable JSON:', err);
      }
    };
    reader.readAsText(file);
  };

  // 5. Run Side-by-Side Comparison via Backend
  const handleRunComparison = async (overrideFriendIds?: number[], overrideName?: string) => {
    const targetIds = overrideFriendIds ?? friendSectionIds;
    const targetName = overrideName ?? friendName;
    setComparing(true);
    try {
      const res = await compareTwoTimetables({
        student_a_name: 'My Primary Timetable',
        student_b_name: targetName,
        student_a_section_ids: selectedSectionIds,
        student_b_section_ids: targetIds,
        campus,
      });
      setCompareResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setComparing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[88vh] overflow-y-auto rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DADCE0] dark:border-[#3C4043] pb-3.5">
          <div>
            <h2 className="text-[19px] font-bold text-[#202124] dark:text-[#E3E3E3]">
              Share, Compare Timetables & Export
            </h2>
            <p className="text-[12px] text-[#5F6368] dark:text-[#9AA0A6]">
              Export to Excel/PDF, create a backend-persisted share link, or compare schedules side-by-side with a friend.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-[#5F6368] hover:bg-[#F1F3F4] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-[#DADCE0] dark:border-[#3C4043] pb-3">
          {[
            { id: 'export', label: 'Export PDF & Excel', icon: Download },
            { id: 'share', label: 'Share with a Friend', icon: Share2 },
            { id: 'compare', label: 'Compare Two Timetables', icon: Users },
            { id: 'drafts', label: `Saved Drafts (${drafts.length})`, icon: BookmarkPlus },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#E8F0FE] dark:bg-[#1E3A5F] text-[#1A73E8] dark:text-[#8AB4F8]'
                    : 'text-[#5F6368] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: EXPORT PDF / EXCEL / PRINT */}
        {tab === 'export' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/40 p-4 flex flex-col justify-between gap-4">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6F4EA] text-[#188038]">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-[15px] font-bold text-[#202124] dark:text-[#E3E3E3]">
                  Export to Excel (.xlsx)
                </h3>
                <p className="mt-1 text-[12px] text-[#5F6368] dark:text-[#9AA0A6]">
                  Downloads a formatted multi-sheet Excel workbook containing your weekly MON–SAT grid and selected course list.
                </p>
              </div>
              <button
                onClick={handleDownloadExcel}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#188038] hover:bg-[#137333] px-4 py-2 text-[12px] font-semibold text-white cursor-pointer"
              >
                <Download className="h-4 w-4" /> Download .xlsx Workbook
              </button>
            </div>

            <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/40 p-4 flex flex-col justify-between gap-4">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F0FE] text-[#1A73E8]">
                  <Printer className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-[15px] font-bold text-[#202124] dark:text-[#E3E3E3]">
                  Export to PDF / Print Layout
                </h3>
                <p className="mt-1 text-[12px] text-[#5F6368] dark:text-[#9AA0A6]">
                  Renders a crisp, print-optimized light-theme sheet suitable for saving as PDF or printing for FFCS registration day.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  setTimeout(() => window.print(), 200);
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] px-4 py-2 text-[12px] font-semibold text-white cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Print / Save as PDF
              </button>
            </div>

            <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/40 p-4 flex flex-col justify-between gap-4">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3E8FD] text-[#9334E6]">
                  <Calendar className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-[15px] font-bold text-[#202124] dark:text-[#E3E3E3]">
                  Portable Timetable File (.ffcs.json)
                </h3>
                <p className="mt-1 text-[12px] text-[#5F6368] dark:text-[#9AA0A6]">
                  Download a shareable file that your friends can import to compare common free slots and shared classes.
                </p>
              </div>
              <button
                onClick={handleDownloadJsonFile}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] hover:bg-[#F1F3F4] px-4 py-2 text-[12px] font-semibold text-[#202124] dark:text-[#E3E3E3] cursor-pointer"
              >
                <Download className="h-4 w-4" /> Download .ffcs.json
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SHARE TIMETABLE WITH A FRIEND */}
        {tab === 'share' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/40 p-5 space-y-3">
              <h3 className="text-[15px] font-bold text-[#202124] dark:text-[#E3E3E3]">
                Generate Persisted Share Link
              </h3>
              <p className="text-[12px] text-[#5F6368] dark:text-[#9AA0A6]">
                Saves your current {selectedSectionIds.length} selected sections to the database and creates a direct URL (`?share_draft=ID`) that loads this exact schedule.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Enter a title for your shared plan (e.g. Shriram Winter 26-27 Plan)"
                  className="flex-1 min-w-[240px] rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] px-3.5 py-2 text-[13px]"
                />
                <button
                  onClick={handleCreateShareLink}
                  disabled={savingShare || selectedSectionIds.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] px-4 py-2 text-[13px] font-semibold text-white cursor-pointer disabled:opacity-50"
                >
                  <Share2 className="h-4 w-4" />
                  <span>{savingShare ? 'Saving...' : 'Create Shareable Link'}</span>
                </button>
              </div>

              {shareUrl && (
                <div className="mt-3 rounded-xl border border-[#188038]/40 bg-[#E6F4EA] p-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[12px] font-mono font-semibold text-[#137333] break-all">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{shareUrl}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#188038] px-3 py-1 text-[11px] font-bold text-white cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copiedLink ? 'Copied!' : 'Copy URL'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: COMPARE TWO TIMETABLES SIDE BY SIDE */}
        {tab === 'compare' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/40 p-4 space-y-3">
              <div className="text-[13px] font-bold text-[#202124] dark:text-[#E3E3E3]">
                Choose a Timetable to Compare Against Your Primary Plan ({selectedSectionIds.length} sections)
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(['backup1', 'backup2', 'backup3'] as const).map((bKey) => {
                  const b = slotSummaries[bKey];
                  if (b.sectionIds.length === 0) return null;
                  return (
                    <button
                      key={bKey}
                      onClick={() => {
                        setFriendName(b.label);
                        setFriendSectionIds(b.sectionIds);
                        handleRunComparison(b.sectionIds, b.label);
                      }}
                      className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] hover:border-[#1A73E8] px-3 py-1.5 text-[12px] font-semibold cursor-pointer"
                    >
                      Compare with {b.label} ({b.courseCount}C)
                    </button>
                  );
                })}

                {drafts.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setFriendName(d.name);
                      setFriendSectionIds(d.selected_section_ids);
                      handleRunComparison(d.selected_section_ids, d.name);
                    }}
                    className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] hover:border-[#1A73E8] px-3 py-1.5 text-[12px] font-semibold cursor-pointer"
                  >
                    Compare with Draft: {d.name}
                  </button>
                ))}

                <label className="inline-flex items-center gap-1.5 rounded-xl border border-[#1A73E8] bg-[#E8F0FE] dark:bg-[#1E3A5F] px-3 py-1.5 text-[12px] font-semibold text-[#1A73E8] dark:text-[#8AB4F8] cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Import Friend's .ffcs.json</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportFriendFile}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => handleRunComparison()}
                  disabled={comparing || friendSectionIds.length === 0}
                  className="ml-auto rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] px-4 py-1.5 text-[12px] font-semibold text-white cursor-pointer disabled:opacity-50"
                >
                  {comparing ? 'Comparing...' : `Run Comparison (${friendName})`}
                </button>
              </div>
            </div>

            {compareResult && (
              <div className="space-y-4">
                {/* Summary Row: Shared Identical Classes & Common Free Slots */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="rounded-xl border border-[#188038]/30 bg-[#E6F4EA]/50 dark:bg-[#143321]/30 p-3.5">
                    <div className="text-[13px] font-bold text-[#137333] dark:text-[#81C995]">
                      Shared Identical Classes ({compareResult.shared_sections.length})
                    </div>
                    <div className="mt-2 space-y-1 text-[12px]">
                      {compareResult.shared_sections.length === 0 ? (
                        <span className="text-[#5F6368]">No identical course sections shared.</span>
                      ) : (
                        compareResult.shared_sections.map((s: CourseSection) => (
                          <div key={s.id} className="font-medium">
                            <strong className="font-mono">{s.course_code}</strong> ({s.slot_combination}) — {s.faculty_name} [{s.venue}]
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#1A73E8]/30 bg-[#E8F0FE]/50 dark:bg-[#1E3A5F]/30 p-3.5">
                    <div className="text-[13px] font-bold text-[#174EA6] dark:text-[#AECBFA]">
                      Common Free Periods (MON–FRI)
                    </div>
                    <div className="mt-2 space-y-1 text-[11px] font-mono">
                      {Object.entries(compareResult.common_free_periods || {}).map(
                        ([day, periods]: [string, any]) => (
                          <div key={day}>
                            <strong className="text-[#1A73E8]">{day}:</strong>{' '}
                            {periods.map((p: number) => `P${p}`).join(', ')}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Same Course, Different Sections */}
                {compareResult.same_course_different_section?.length > 0 && (
                  <div className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] p-3.5">
                    <div className="text-[13px] font-bold text-[#202124] dark:text-[#E3E3E3] mb-2">
                      Same Course, Different Faculty/Slot Sections ({compareResult.same_course_different_section.length})
                    </div>
                    <div className="space-y-1.5 text-[12px]">
                      {compareResult.same_course_different_section.map((diff: any, i: number) => (
                        <div
                          key={i}
                          className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-lg bg-[#F8F9FC] dark:bg-[#282A2C] p-2"
                        >
                          <div className="font-semibold">
                            <span className="font-mono text-[#1A73E8]">{diff.course_code}</span> [{diff.course_type_code}]
                          </div>
                          <div>
                            <span className="text-[#5F6368]">You:</span>{' '}
                            <strong>{diff.student_a_section.slot_combination}</strong> ({diff.student_a_section.faculty_name})
                          </div>
                          <div>
                            <span className="text-[#5F6368]">{compareResult.student_b_name}:</span>{' '}
                            <strong>{diff.student_b_section.slot_combination}</strong> ({diff.student_b_section.faculty_name})
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Schedule Conflicts Between the Two Students */}
                <div className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] p-3.5">
                  <div className="text-[13px] font-bold text-[#202124] dark:text-[#E3E3E3] mb-2">
                    Periods Where Both Have Different Classes ({compareResult.schedule_conflicts?.length || 0})
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-[11px]">
                    {(compareResult.schedule_conflicts || []).map((conf: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex flex-wrap items-center justify-between rounded bg-[#F8F9FC] dark:bg-[#282A2C] px-2.5 py-1"
                      >
                        <span className="font-mono font-bold text-[#D93025]">
                          {conf.day} P{conf.period} ({conf.time_range})
                        </span>
                        <span>
                          You: <strong>{conf.student_a_course}</strong> vs {compareResult.student_b_name}:{' '}
                          <strong>{conf.student_b_course}</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SAVED DRAFTS */}
        {tab === 'drafts' && (
          <div className="space-y-3">
            {drafts.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[#5F6368]">
                No saved drafts yet. Create one in the Share tab!
              </div>
            ) : (
              drafts.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/40 px-4 py-3"
                >
                  <div>
                    <div className="text-[14px] font-bold text-[#202124] dark:text-[#E3E3E3]">
                      {d.name}
                    </div>
                    <div className="text-[11px] text-[#5F6368]">
                      {d.selected_section_ids.length} sections • {d.semester} • Draft ID #{d.id}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onLoadDraft(d);
                        onClose();
                      }}
                      className="rounded-lg bg-[#1A73E8] hover:bg-[#1557B0] px-3 py-1.5 text-[12px] font-semibold text-white cursor-pointer"
                    >
                      Restore to Primary
                    </button>
                    <button
                      onClick={() => onDeleteDraft(d.id)}
                      className="rounded-lg p-1.5 text-[#5F6368] hover:text-[#D93025] cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
