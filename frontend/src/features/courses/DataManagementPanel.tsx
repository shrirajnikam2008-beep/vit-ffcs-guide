import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Database,
  Edit3,
  RotateCcw,
  Search,
} from 'lucide-react';
import {
  CourseSection,
  ImportReport,
  SlotOccurrence,
} from '../../types/ffcs';
import {
  commitWorkbookImport,
  previewWorkbookImport,
  resetDefaultWorkbook,
  syncNo8amReviews,
  updateSectionOffering,
} from '../../lib/api';

interface DataManagementPanelProps {
  importReport: ImportReport | null;
  allSections: CourseSection[];
  slotMap: Record<string, SlotOccurrence[]>;
  campus: string;
  onRefreshBootstrap: () => void;
}

export const DataManagementPanel: React.FC<DataManagementPanelProps> = ({
  importReport,
  allSections,
  campus,
  onRefreshBootstrap,
}) => {
  const [subTab, setSubTab] = useState<'import' | 'audit' | 'sections'>('import');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [customMappings, setCustomMappings] = useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Section inline editor state
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editFaculty, setEditFaculty] = useState('');
  const [editSlot, setEditSlot] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [sectionSearch, setSectionSearch] = useState('');
  const [showInactiveAudit, setShowInactiveAudit] = useState(true);

  const handlePreviewFile = async () => {
    if (!selectedFile) return;
    setBusy(true);
    try {
      const res = await previewWorkbookImport(selectedFile, customMappings);
      setPreviewData(res);
      setStatusMessage(`Previewed ${res.filename}: ${res.total_rows} rows across ${res.sheets.length} sheets.`);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleCommitFile = async () => {
    if (!selectedFile) return;
    setBusy(true);
    try {
      const res = await commitWorkbookImport(selectedFile, customMappings, true);
      setStatusMessage(
        `Imported ${res.courses_imported} courses & ${res.active_sections} active sections (${res.duplicates_detected} duplicates, ${res.anomalies_detected} anomalies isolated).`
      );
      setPreviewData(null);
      onRefreshBootstrap();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleResetDefault = async () => {
    setBusy(true);
    try {
      await resetDefaultWorkbook();
      setStatusMessage('Restored default VIT Winter Semester 2026–27 Course Allocation workbook.');
      onRefreshBootstrap();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleSyncNo8am = async () => {
    setBusy(true);
    try {
      const res = await syncNo8amReviews(campus);
      setStatusMessage(res.message || 'Synchronized faculty reviews from no8am.site.');
      onRefreshBootstrap();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSectionEdit = async (secId: number) => {
    setBusy(true);
    try {
      await updateSectionOffering(secId, {
        faculty_name: editFaculty,
        slot_combination: editSlot,
        venue: editVenue,
      });
      setEditingSectionId(null);
      setStatusMessage(`Updated section #${secId} and re-verified slot mapping.`);
      onRefreshBootstrap();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleSectionActive = async (sec: CourseSection) => {
    setBusy(true);
    try {
      await updateSectionOffering(sec.id, { is_active: !sec.is_active });
      onRefreshBootstrap();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const filteredSections = allSections.filter((s) => {
    if (!showInactiveAudit && !s.is_active) return false;
    const q = sectionSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      s.course_code.toLowerCase().includes(q) ||
      s.course_title.toLowerCase().includes(q) ||
      s.faculty_name.toLowerCase().includes(q) ||
      s.slot_combination.toLowerCase().includes(q) ||
      s.venue.toLowerCase().includes(q) ||
      s.source_sheet.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header & Sub-Navigation */}
      <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F0FE] dark:bg-[#1E3A5F] text-[#1A73E8] dark:text-[#8AB4F8]">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#202124] dark:text-[#E3E3E3]">
                Import Course Allocation Data & Transparency Audit
              </h2>
              <p className="text-[12px] text-[#5F6368] dark:text-[#9AA0A6]">
                Multi-worksheet Excel/CSV importer with column mapper, source row traceability, and anomaly isolation.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncNo8am}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] hover:bg-[#F1F3F4] px-3 py-1.5 text-[12px] font-semibold text-[#202124] dark:text-[#E3E3E3] cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#1A73E8]" /> Sync no8am.site Faculty
            </button>
            <button
              onClick={handleResetDefault}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] hover:bg-[#F1F3F4] px-3 py-1.5 text-[12px] font-semibold text-[#5F6368] hover:text-[#202124] cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reload Default Workbook
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-[#188038]/30 bg-[#E6F4EA] px-3.5 py-2 text-[12px] font-semibold text-[#137333]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Sub-Tabs */}
        <div className="flex flex-wrap gap-2 border-t border-[#DADCE0] dark:border-[#3C4043] pt-3">
          {[
            { id: 'import', label: '1. Upload & Column Mapping' },
            { id: 'audit', label: `2. Data Quality & Anomaly Report (${importReport?.issues?.length ?? 0})` },
            { id: 'sections', label: `3. Raw Section Browser & Inline Editor (${allSections.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id as any)}
              className={`rounded-xl px-3.5 py-2 text-[12px] font-semibold transition-colors cursor-pointer ${
                subTab === t.id
                  ? 'bg-[#E8F0FE] dark:bg-[#1E3A5F] text-[#1A73E8] dark:text-[#8AB4F8]'
                  : 'text-[#5F6368] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* SUBTAB 1: EXCEL / CSV UPLOAD & PREVIEW */}
      {subTab === 'import' && (
        <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-[#1A73E8]/50 bg-[#F8F9FC] dark:bg-[#282A2C]/40 p-5">
            <div className="space-y-1">
              <div className="text-[14px] font-bold text-[#202124] dark:text-[#E3E3E3]">
                Upload VIT Course Allocation Workbook (.xlsx or .csv)
              </div>
              <p className="text-[12px] text-[#5F6368] dark:text-[#9AA0A6]">
                Reads all worksheets, preserves exact slot strings, labels unnamed C1/C2 tables as Applied Chemistry, and flags duplicates/anomalies.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="text-[12px] text-[#5F6368] file:mr-3 file:rounded-lg file:border-0 file:bg-[#E8F0FE] file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-[#1A73E8] hover:file:bg-[#D2E3FC] cursor-pointer"
              />
              <button
                onClick={handlePreviewFile}
                disabled={!selectedFile || busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" /> Preview & Detect Columns
              </button>
              {previewData && (
                <button
                  onClick={handleCommitFile}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#188038] hover:bg-[#137333] px-4 py-2 text-[12px] font-semibold text-white cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Commit Import to Database
                </button>
              )}
            </div>
          </div>

          {/* Preview Worksheets & Column Mapping Override */}
          {previewData && (
            <div className="space-y-3">
              <div className="text-[14px] font-bold text-[#202124] dark:text-[#E3E3E3]">
                Worksheet Preview & Manual Column Mapper ({previewData.sheets.length} Sheets Detected)
              </div>
              {previewData.sheets.map((sh: any) => (
                <div
                  key={sh.sheet_name}
                  className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/40 p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[13px] text-[#1A73E8]">
                      Sheet: {sh.sheet_name} ({sh.row_count} rows)
                    </span>
                    <span className="rounded bg-white dark:bg-[#1E1F20] px-2 py-0.5 text-[11px] font-mono font-semibold">
                      Detected Kind: {sh.kind}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                    {Object.entries(sh.detected_mapping || {}).map(([fieldKey, colName]: [string, any]) => (
                      <div key={fieldKey}>
                        <label className="block font-semibold text-[#5F6368]">{fieldKey}</label>
                        <select
                          value={customMappings[sh.sheet_name]?.[fieldKey] ?? colName}
                          onChange={(e) =>
                            setCustomMappings((prev) => ({
                              ...prev,
                              [sh.sheet_name]: {
                                ...(prev[sh.sheet_name] || {}),
                                [fieldKey]: e.target.value,
                              },
                            }))
                          }
                          className="mt-0.5 w-full rounded border border-[#DADCE0] bg-white dark:bg-[#1E1F20] px-2 py-1"
                        >
                          <option value="">-- Unmapped --</option>
                          {sh.columns.map((c: string) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: DATA QUALITY & ANOMALY REPORT */}
      {subTab === 'audit' && (
        <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-5 shadow-xs space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="rounded-xl bg-[#F8F9FC] dark:bg-[#282A2C] p-3">
              <div className="text-[11px] text-[#5F6368]">Total Rows Read</div>
              <div className="mt-0.5 font-mono text-[18px] font-bold">{importReport?.total_rows_read ?? 441}</div>
            </div>
            <div className="rounded-xl bg-[#F8F9FC] dark:bg-[#282A2C] p-3">
              <div className="text-[11px] text-[#5F6368]">Courses Imported</div>
              <div className="mt-0.5 font-mono text-[18px] font-bold text-[#1A73E8]">
                {importReport?.courses_imported ?? 10}
              </div>
            </div>
            <div className="rounded-xl bg-[#F8F9FC] dark:bg-[#282A2C] p-3">
              <div className="text-[11px] text-[#5F6368]">Total Sections Imported</div>
              <div className="mt-0.5 font-mono text-[18px] font-bold text-[#188038]">
                {importReport?.sections_imported ?? 338}
              </div>
            </div>
            <div className="rounded-xl bg-[#F8F9FC] dark:bg-[#282A2C] p-3">
              <div className="text-[11px] text-[#5F6368]">Exact Duplicates</div>
              <div className="mt-0.5 font-mono text-[18px] font-bold text-[#5F6368]">
                {importReport?.duplicates_detected ?? 155}
              </div>
            </div>
            <div className="rounded-xl bg-[#F8F9FC] dark:bg-[#282A2C] p-3">
              <div className="text-[11px] text-[#5F6368]">Cross-Course Anomalies</div>
              <div className="mt-0.5 font-mono text-[18px] font-bold text-[#F9AB00]">
                {importReport?.anomalies_detected ?? 25}
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 pt-2">
            {(importReport?.issues || []).map((iss, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-3 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/40 px-3.5 py-2.5 text-[12px]"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[#F9AB00] mt-0.5" />
                  <div>
                    <span className="font-mono font-bold text-[#202124] dark:text-[#E3E3E3]">
                      [{iss.type}]
                    </span>{' '}
                    <span>{iss.message}</span>
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-[#5F6368]">
                  {iss.sheet} (Row {iss.row})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 3: RAW SECTION BROWSER & INLINE EDITOR */}
      {subTab === 'sections' && (
        <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-5 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#5F6368]" />
              <input
                type="text"
                value={sectionSearch}
                onChange={(e) => setSectionSearch(e.target.value)}
                placeholder="Search any imported row by course, faculty, slot, venue, or worksheet..."
                className="w-full rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] pl-9 pr-3 py-1.5 text-[12px]"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-[12px] font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={showInactiveAudit}
                onChange={(e) => setShowInactiveAudit(e.target.checked)}
                className="accent-[#1A73E8]"
              />
              <span>Include Duplicate & Anomaly Audit Rows ({allSections.length} total)</span>
            </label>
          </div>

          <div className="max-h-[480px] overflow-y-auto rounded-xl border border-[#DADCE0] dark:border-[#3C4043]">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead className="sticky top-0 bg-[#F8F9FC] dark:bg-[#282A2C] border-b border-[#DADCE0] dark:border-[#3C4043] text-[11px] font-bold uppercase text-[#5F6368]">
                <tr>
                  <th className="py-2 px-3">ID</th>
                  <th className="py-2 px-3">Course</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Slot</th>
                  <th className="py-2 px-3">Faculty</th>
                  <th className="py-2 px-3">Venue</th>
                  <th className="py-2 px-3">Source Sheet:Row</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DADCE0] dark:divide-[#3C4043]">
                {filteredSections.slice(0, 120).map((sec) => {
                  const isEditing = editingSectionId === sec.id;
                  return (
                    <tr key={sec.id} className={!sec.is_active ? 'opacity-60 bg-[#F8F9FC]' : ''}>
                      <td className="py-2 px-3 font-mono">#{sec.id}</td>
                      <td className="py-2 px-3 font-mono font-bold text-[#1A73E8]">
                        {sec.course_code}
                      </td>
                      <td className="py-2 px-3">{sec.course_type_code}</td>
                      <td className="py-2 px-3 font-mono font-bold">
                        {isEditing ? (
                          <input
                            value={editSlot}
                            onChange={(e) => setEditSlot(e.target.value)}
                            className="w-28 rounded border border-[#1A73E8] px-1.5 py-0.5"
                          />
                        ) : (
                          sec.slot_combination
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {isEditing ? (
                          <input
                            value={editFaculty}
                            onChange={(e) => setEditFaculty(e.target.value)}
                            className="w-40 rounded border border-[#1A73E8] px-1.5 py-0.5"
                          />
                        ) : (
                          sec.faculty_name
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono">
                        {isEditing ? (
                          <input
                            value={editVenue}
                            onChange={(e) => setEditVenue(e.target.value)}
                            className="w-24 rounded border border-[#1A73E8] px-1.5 py-0.5"
                          />
                        ) : (
                          sec.venue
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-[#5F6368]">
                        {sec.source_sheet}:{sec.source_row}
                      </td>
                      <td className="py-2 px-3">
                        <button
                          onClick={() => handleToggleSectionActive(sec)}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold cursor-pointer ${
                            sec.is_active
                              ? 'bg-[#E6F4EA] text-[#188038]'
                              : 'bg-[#F1F3F4] text-[#5F6368]'
                          }`}
                        >
                          {sec.is_active ? 'Active' : sec.is_anomaly ? 'Anomaly (Hidden)' : 'Duplicate'}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-right">
                        {isEditing ? (
                          <button
                            onClick={() => handleSaveSectionEdit(sec.id)}
                            className="rounded bg-[#188038] px-2 py-0.5 text-[11px] font-bold text-white cursor-pointer"
                          >
                            Save
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingSectionId(sec.id);
                              setEditFaculty(sec.faculty_name);
                              setEditSlot(sec.slot_combination);
                              setEditVenue(sec.venue);
                            }}
                            className="rounded p-1 text-[#5F6368] hover:text-[#1A73E8] cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
