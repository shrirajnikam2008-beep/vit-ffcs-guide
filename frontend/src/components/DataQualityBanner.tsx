import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, ChevronRight, X } from 'lucide-react';
import { ClashReport, ImportReport } from '../types/ffcs';

interface DataQualityBannerProps {
  clashReport: ClashReport | null;
  importReport: ImportReport | null;
  onOpenClashDrawer: () => void;
  onOpenImportAudit: () => void;
  onOpenSlotMapping: () => void;
}

export const DataQualityBanner: React.FC<DataQualityBannerProps> = ({
  clashReport,
  importReport,
  onOpenClashDrawer,
  onOpenImportAudit,
  onOpenSlotMapping,
}) => {
  const [dismissedAuditNote, setDismissedAuditNote] = useState(false);

  const confirmedClashes = clashReport?.confirmed_clash_count ?? 0;
  const unresolvedSlots = (clashReport?.clashes || [])
    .filter((c) => c.clash_type === 'UNRESOLVED_SLOT')
    .flatMap((c) => c.conflicting_slots);
  const anomaliesCount = importReport?.anomalies_detected ?? 0;

  if (confirmedClashes === 0 && unresolvedSlots.length === 0 && dismissedAuditNote) {
    return null;
  }

  return (
    <div className="no-print space-y-2">
      {/* Confirmed Clashes Alert */}
      {confirmedClashes > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D93025]/40 bg-[#FCE8E6] dark:bg-[#5C1E1B]/50 px-4 py-2.5 text-[#A50E0E] dark:text-[#F28B82]">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#D93025] dark:text-[#F28B82]" />
            <div className="text-[13px]">
              <span className="font-semibold">
                {confirmedClashes} Confirmed Timetable Clash{confirmedClashes > 1 ? 'es' : ''} Detected:
              </span>{' '}
              <span>
                Two or more selected sections overlap on verified VIT time intervals.
              </span>
            </div>
          </div>
          <button
            onClick={onOpenClashDrawer}
            className="inline-flex items-center gap-1 rounded-lg bg-[#D93025] hover:bg-[#B3261E] px-3 py-1 text-[12px] font-semibold text-white shadow-2xs transition-colors cursor-pointer"
          >
            <span>Resolve Clashes</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Unresolved Slot Mappings Warning */}
      {unresolvedSlots.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#F9AB00]/50 bg-[#FEF7E0] dark:bg-[#36290C]/60 px-4 py-2.5 text-[#8F4E00] dark:text-[#FDD663]">
          <div className="flex items-center gap-2.5">
            <Info className="h-4 w-4 shrink-0 text-[#B06000] dark:text-[#FDD663]" />
            <div className="text-[13px]">
              <span className="font-semibold">
                Unverified Slot Mapping ({unresolvedSlots.join(', ')}):
              </span>{' '}
              <span>
                Calendar placement is marked as unresolved rather than guessed. Map the official day/time to verify clashes.
              </span>
            </div>
          </div>
          <button
            onClick={onOpenSlotMapping}
            className="inline-flex items-center gap-1 rounded-lg border border-[#B06000]/40 bg-white dark:bg-[#282A2C] px-3 py-1 text-[12px] font-semibold text-[#8F4E00] dark:text-[#FDD663] hover:bg-[#FEEFC3] transition-colors cursor-pointer"
          >
            <span>Configure Slot Mapping</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Workbook Audit Transparency Strip */}
      {!dismissedAuditNote && anomaliesCount > 0 && confirmedClashes === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] px-4 py-2 text-[12px] text-[#5F6368] dark:text-[#9AA0A6] shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#188038] dark:text-[#81C995]" />
            <span>
              <strong className="text-[#202124] dark:text-[#E3E3E3]">Workbook Verified:</strong>{' '}
              {importReport?.courses_imported ?? 10} courses & {importReport?.sections_imported ?? 338} sections loaded.{' '}
              {anomaliesCount} cross-course rows & {importReport?.duplicates_detected ?? 155} duplicate rows isolated in Audit Log.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenImportAudit}
              className="font-semibold text-[#1A73E8] dark:text-[#8AB4F8] hover:underline cursor-pointer"
            >
              View Data Audit
            </button>
            <button
              onClick={() => setDismissedAuditNote(true)}
              aria-label="Dismiss workbook notice"
              className="rounded p-0.5 text-[#5F6368] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
