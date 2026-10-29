import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  CopyCheck,
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Trash2,
} from 'lucide-react';

export type TimetableSlotKey = 'primary' | 'backup1' | 'backup2' | 'backup3';

export interface BackupSlotSummary {
  key: TimetableSlotKey;
  label: string;
  subtitle?: string;
  sectionIds: number[];
  lockedIds: number[];
  courseCount: number;
  credits: number;
  clashCount: number;
}

interface BackupTimetableTabsProps {
  activeSlotKey: TimetableSlotKey;
  onSelectSlotKey: (key: TimetableSlotKey) => void;
  slotSummaries: Record<TimetableSlotKey, BackupSlotSummary>;
  experimentMode: boolean;
  onToggleExperimentMode: () => void;
  onPromoteBackupToPrimary: (sourceKey: TimetableSlotKey) => void;
  onClearBackupSlot: (key: TimetableSlotKey) => void;
  onGenerateGenuineBackups: () => void;
  generatingBackups: boolean;
}

export const BackupTimetableTabs: React.FC<BackupTimetableTabsProps> = ({
  activeSlotKey,
  onSelectSlotKey,
  slotSummaries,
  experimentMode,
  onToggleExperimentMode,
  onPromoteBackupToPrimary,
  onClearBackupSlot,
  onGenerateGenuineBackups,
  generatingBackups,
}) => {
  const [confirmPromoteKey, setConfirmPromoteKey] = useState<TimetableSlotKey | null>(null);

  const tabs: TimetableSlotKey[] = ['primary', 'backup1', 'backup2', 'backup3'];
  const currentSummary = slotSummaries[activeSlotKey];

  return (
    <div className="no-print rounded-t-2xl border-b border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/60 px-4 pt-3 pb-2.5 flex flex-wrap items-center justify-between gap-3">
      {/* Left: Primary + Backup 1-3 Tabs */}
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Timetable Plan Tabs">
        {tabs.map((key) => {
          const item = slotSummaries[key];
          const isActive = activeSlotKey === key;
          const isEmpty = item.sectionIds.length === 0;

          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                onSelectSlotKey(key);
                setConfirmPromoteKey(null);
              }}
              className={`group flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-all duration-150 cursor-pointer border ${
                isActive
                  ? 'border-[#1A73E8] bg-white dark:bg-[#1E1F20] text-[#1A73E8] dark:text-[#8AB4F8] shadow-xs font-semibold'
                  : 'border-transparent bg-transparent text-[#5F6368] dark:text-[#9AA0A6] hover:bg-white/80 dark:hover:bg-[#1E1F20]/60 hover:text-[#202124] dark:hover:text-[#E3E3E3]'
              }`}
            >
              <Layers className={`h-3.5 w-3.5 ${isActive ? 'text-[#1A73E8]' : 'text-[#5F6368]'}`} />
              <span>{item.label}</span>

              {isEmpty ? (
                <span className="rounded-full bg-[#F1F3F4] dark:bg-[#3C4043] px-2 py-0.5 text-[10px] font-medium text-[#5F6368] dark:text-[#9AA0A6]">
                  Empty
                </span>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="rounded-full bg-[#E8F0FE] dark:bg-[#1E3A5F] px-2 py-0.5 text-[11px] font-semibold text-[#174EA6] dark:text-[#AECBFA] tabular-time">
                    {item.courseCount}C • {item.credits}Cr
                  </span>
                  {item.clashCount > 0 ? (
                    <span
                      title={`${item.clashCount} confirmed clash(es)`}
                      className="inline-flex items-center gap-0.5 rounded-full bg-[#FCE8E6] dark:bg-[#5C1E1B] px-1.5 py-0.5 text-[10px] font-bold text-[#D93025] dark:text-[#F28B82]"
                    >
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {item.clashCount}
                    </span>
                  ) : (
                    <span
                      title="Clash-free schedule"
                      className="inline-flex items-center rounded-full bg-[#E6F4EA] dark:bg-[#143321] p-0.5 text-[#188038] dark:text-[#81C995]"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Right: Backup Actions & Experimentation Mode */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Backup Experimentation Sandbox Toggle */}
        <button
          onClick={onToggleExperimentMode}
          title="Experiment with sections without modifying your saved Primary timetable"
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-medium transition-colors cursor-pointer ${
            experimentMode
              ? 'border-[#F9AB00] bg-[#FEF7E0] text-[#8F4E00] dark:bg-[#36290C] dark:text-[#FDD663] font-semibold'
              : 'border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4]'
          }`}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          <span>{experimentMode ? 'Sandbox Mode ON (Primary Protected)' : 'Sandbox Mode'}</span>
        </button>

        {/* Generate Genuine Alternate Backups Button */}
        <button
          onClick={onGenerateGenuineBackups}
          disabled={generatingBackups}
          title="Run the optimizer to populate Backup 1 (Best Fit), Backup 2 (Compact), and Backup 3 (Max Flexibility) with distinct clash-free schedules"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#1A73E8]/30 bg-[#E8F0FE] dark:bg-[#1E3A5F] hover:bg-[#D2E3FC] px-3 py-1.5 text-[12px] font-semibold text-[#1A73E8] dark:text-[#8AB4F8] transition-colors cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>{generatingBackups ? 'Optimizing Backups...' : 'Auto-Fill Backups 1–3'}</span>
        </button>

        {/* If currently viewing Backup 1-3 and it has sections, allow promoting to Primary */}
        {activeSlotKey !== 'primary' && currentSummary.sectionIds.length > 0 && (
          <>
            {confirmPromoteKey === activeSlotKey ? (
              <div className="flex items-center gap-1.5 rounded-xl border border-[#188038] bg-[#E6F4EA] dark:bg-[#143321] px-2.5 py-1 text-[12px]">
                <span className="font-semibold text-[#137333] dark:text-[#81C995]">
                  Replace Primary with {currentSummary.label}?
                </span>
                <button
                  onClick={() => {
                    onPromoteBackupToPrimary(activeSlotKey);
                    setConfirmPromoteKey(null);
                  }}
                  className="rounded-lg bg-[#188038] px-2 py-0.5 text-[11px] font-bold text-white hover:bg-[#137333] cursor-pointer"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmPromoteKey(null)}
                  className="rounded-lg px-1.5 py-0.5 text-[11px] text-[#5F6368] hover:text-[#202124] cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setConfirmPromoteKey(activeSlotKey)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#188038] hover:bg-[#137333] px-3 py-1.5 text-[12px] font-semibold text-white shadow-2xs transition-colors cursor-pointer"
                >
                  <CopyCheck className="h-3.5 w-3.5" />
                  <span>Copy to Primary Plan</span>
                </button>
                <button
                  onClick={() => onClearBackupSlot(activeSlotKey)}
                  title={`Clear ${currentSummary.label}`}
                  className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-1.5 text-[#5F6368] hover:text-[#D93025] transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
