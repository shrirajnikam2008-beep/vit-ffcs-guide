import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  MapPin,
  RotateCcw,
  Download,
  Printer,
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  ArrowRightLeft,
  Save,
  FolderOpen,
  Clock,
  Database,
  Maximize2,
  Minimize2,
  FileText,
  LayoutGrid,
  ListFilter,
  Copy,
} from 'lucide-react';
import {
  ClashReport,
  Course,
  CourseSection,
  ImportReport,
  PeriodHeader,
  SlotOccurrence,
} from '../types/ffcs';
import {
  commitWorkbookImport,
  evaluateClashes,
  fetchBootstrap,
  syncNo8amReviews,
} from '../lib/api';
import {
  exportTimetablePdf,
  PdfContentMode,
  PdfPaperSize,
} from '../lib/pdfExporter';
import { CourseTeacherSlotSelector } from '../components/CourseTeacherSlotSelector';
import { TimetableGrid } from '../components/TimetableGrid';

const LOCAL_STORAGE_KEY = 'vit_ffcs_maker_saved_plans_v2';

type PlanSlotKey = 'primary' | 'backup1' | 'backup2';

const PLAN_LABELS: Record<PlanSlotKey, string> = {
  primary: 'Primary Timetable',
  backup1: 'Backup 1',
  backup2: 'Backup 2',
};

export const DashboardPage: React.FC = () => {
  // Header Academic Context
  const [campus, setCampus] = useState('vellore');
  const [semester, setSemester] = useState('Winter Semester 2026–27');
  const [showSaturday, setShowSaturday] = useState(false);

  // Readability & View Controls
  // Default to Detailed View (fitToPage = false) so full faculty names, course titles, and venues are visible immediately
  const [fitToPage, setFitToPage] = useState(false);
  const [isTimetableExpanded, setIsTimetableExpanded] = useState(false);
  const [gridViewMode, setGridViewMode] = useState<'week' | 'slotlist'>('week');

  // PDF Export Configuration State (Default: Landscape A3 + Both Pages)
  const [pdfPaperSize, setPdfPaperSize] = useState<PdfPaperSize>('a3');
  const [pdfContentMode, setPdfContentMode] = useState<PdfContentMode>('both');

  // Primary & Backup Timetable Plans State
  const [activePlanKey, setActivePlanKey] = useState<PlanSlotKey>('primary');
  const [planSectionsMap, setPlanSectionsMap] = useState<Record<PlanSlotKey, number[]>>({
    primary: [],
    backup1: [],
    backup2: [],
  });

  // Core Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [allSections, setAllSections] = useState<CourseSection[]>([]);
  const [slotMap, setSlotMap] = useState<Record<string, SlotOccurrence[]>>({});
  const [periodHeaders, setPeriodHeaders] = useState<PeriodHeader[]>([]);
  const [, setImportReport] = useState<ImportReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Data Source Transparency Status
  const [dataSourceStatus, setDataSourceStatus] = useState<
    'Cached (no8am.site + Workbook)' | 'Current (Live no8am.site Sync)' | 'Manually Imported (.xlsx/.csv)'
  >('Cached (no8am.site + Workbook)');
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string>('2026-10-29');
  const [syncingNo8am, setSyncingNo8am] = useState(false);

  // Active Course in Left Selector & Locked Section IDs
  const [activeCourseCode, setActiveCourseCode] = useState<string>('BAITE102');
  const [lockedSectionIds, setLockedSectionIds] = useState<number[]>([]);
  const [clashReport, setClashReport] = useState<ClashReport | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedSectionIds = planSectionsMap[activePlanKey] ?? [];

  const setSelectedSectionIdsForActivePlan = useCallback(
    (updater: number[] | ((prev: number[]) => number[])) => {
      setPlanSectionsMap((prevMap) => {
        const current = prevMap[activePlanKey] ?? [];
        const next = typeof updater === 'function' ? updater(current) : updater;
        return {
          ...prevMap,
          [activePlanKey]: next,
        };
      });
    },
    [activePlanKey]
  );

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3200);
  }, []);

  // Load Bootstrap Data
  const loadCatalogData = useCallback(async (campusCode: string, isInitial = false) => {
    setLoading(true);
    try {
      const data = await fetchBootstrap(campusCode);
      setCourses(data.courses);
      setAllSections(data.all_sections);
      setSlotMap(data.slot_map);
      setPeriodHeaders(data.period_headers);
      setImportReport(data.import_report);
      if (data.import_report?.imported_at) {
        setLastUpdatedLabel(data.import_report.imported_at.slice(0, 10));
      }

      if (isInitial) {
        const rawSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (rawSaved) {
          try {
            const parsed = JSON.parse(rawSaved);
            if (parsed.planSectionsMap && Array.isArray(parsed.planSectionsMap.primary) && parsed.planSectionsMap.primary.length > 0) {
              setPlanSectionsMap(parsed.planSectionsMap);
              if (parsed.activePlanKey) setActivePlanKey(parsed.activePlanKey);
              return;
            }
          } catch {
            // ignore corrupt localStorage
          }
        }

        // Build a comprehensive 6-course (12-section, 24-credit) clash-free starter timetable
        // testing long course titles, long faculty names, and PRP329, PRP408A, SJT122, SJTG18 venues
        const findSec = (code: string, typeCode: string, slotPrefix: string, venueFilter?: string) =>
          data.courses
            .find((c) => c.course_code === code)
            ?.sections.find(
              (s) =>
                s.course_type_code === typeCode &&
                s.slot_combination.startsWith(slotPrefix) &&
                (!venueFilter || s.venue === venueFilter)
            );

        const starterPrimary = [
          // 1. BACSE104 — Structured and Object-Oriented Programming (SJT102 + SJT122)
          findSec('BACSE104', 'ETH', 'A1', 'SJT102'),
          findSec('BACSE104', 'ELA', 'L37+L38+L43+L44', 'SJT122'),
          // 2. BAITE101 — Digital Logic Design and Computer Organization (MANGAYARKARASI R / KONGUVELE E)
          findSec('BAITE101', 'ETH', 'B1+TB1', 'SJT823'),
          findSec('BAITE101', 'ELA', 'L55+L56', 'SJT212'),
          // 3. BACHY105 — Applied Chemistry (PRP329 + PRP408A)
          findSec('BACHY105', 'ETH', 'C1+TC1', 'PRP329'),
          findSec('BACHY105', 'ELA', 'L49+L50', 'PRP408A'),
          // 4. BAMAT207 — Probability and Statistics (VENKATESWARLU B in PRP329)
          findSec('BAMAT207', 'ETH', 'D1+TD1', 'PRP329'),
          findSec('BAMAT207', 'ELA', 'L51+L52', 'PRP450'),
          // 5. BAITE103 — Principles of Software Engineering (KIRUBA THANGAM R)
          findSec('BAITE103', 'ETH', 'E1+TE1', 'SJTG14'),
          findSec('BAITE103', 'ELA', 'L33+L34', 'SJTG17'),
          // 6. BAITE102 — Data Structures and Algorithms (AGILANDEESWARL I + PRIYA V in SJTG18 · L39+L40)
          findSec('BAITE102', 'ETH', 'F1+TF1', 'SJT823'),
          findSec('BAITE102', 'ELA', 'L39+L40', 'SJTG18'),
        ]
          .filter((s): s is CourseSection => Boolean(s))
          .map((s) => s.id);

        // Also seed Backup 1 with an afternoon-theory alternative plan
        const starterBackup1 = [
          findSec('BACSE104', 'ETH', 'A2'),
          findSec('BACSE104', 'ELA', 'L9+L10+L23+L24', 'SJT122'),
          findSec('BAITE102', 'ETH', 'F2+TF2'),
          findSec('BAITE102', 'ELA', 'L19+L20'),
          findSec('BAMAT207', 'ETH', 'D2+TD2', 'PRP329'),
          findSec('BAMAT207', 'ELA', 'L11+L12'),
        ]
          .filter((s): s is CourseSection => Boolean(s))
          .map((s) => s.id);

        setPlanSectionsMap({
          primary: starterPrimary,
          backup1: starterBackup1,
          backup2: [],
        });
      }
    } catch (err) {
      console.error('Failed to load timetable data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogData(campus, planSectionsMap.primary.length === 0);
  }, [campus]);

  // Automatically persist selection changes to localStorage & evaluate clashes immediately
  useEffect(() => {
    let cancelled = false;
    if (
      planSectionsMap.primary.length > 0 ||
      planSectionsMap.backup1.length > 0 ||
      planSectionsMap.backup2.length > 0
    ) {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({
          campus,
          semester,
          activePlanKey,
          planSectionsMap,
          savedAt: new Date().toISOString(),
        })
      );
    }

    evaluateClashes({
      selected_section_ids: selectedSectionIds,
      locked_section_ids: lockedSectionIds,
      mandatory_course_codes: [],
      min_credits: 16,
      target_credits: 24,
      max_credits: 27,
      campus,
      allow_adjacent_lab_boundary: true,
    })
      .then((rep) => {
        if (!cancelled) setClashReport(rep);
      })
      .catch((err) => console.error('Clash detection error:', err));

    return () => {
      cancelled = true;
    };
  }, [selectedSectionIds, planSectionsMap, activePlanKey, lockedSectionIds, campus, semester]);

  // Map section ID -> CourseSection
  const sectionById = useMemo(() => {
    const map = new Map<number, CourseSection>();
    courses.forEach((c) => c.sections.forEach((s) => map.set(s.id, s)));
    allSections.forEach((s) => map.set(s.id, s));
    return map;
  }, [courses, allSections]);

  const selectedSections = useMemo(
    () =>
      selectedSectionIds
        .map((id) => sectionById.get(id))
        .filter((s): s is CourseSection => Boolean(s)),
    [selectedSectionIds, sectionById]
  );

  // Select or switch a teacher/slot for a course component (updates existing card in place, never duplicates!)
  const handleSelectOrSwitchSection = useCallback(
    (section: CourseSection) => {
      setSelectedSectionIdsForActivePlan((prev) => {
        if (prev.includes(section.id)) {
          showToast(`Removed ${section.course_code} (${section.slot_combination})`);
          return prev.filter((id) => id !== section.id);
        }
        const withoutSameComponent = prev.filter((id) => {
          const existing = sectionById.get(id);
          if (!existing) return false;
          if (
            existing.course_code === section.course_code &&
            existing.course_type_code === section.course_type_code
          ) {
            return false;
          }
          return true;
        });
        showToast(
          `Selected ${section.course_code} [${section.course_type_code}] — ${section.faculty_name} (${section.venue} · ${section.slot_combination})`
        );
        return [...withoutSameComponent, section.id];
      });
    },
    [sectionById, setSelectedSectionIdsForActivePlan, showToast]
  );

  // Switch a specific old section ID to a new section ID
  const handleSwitchSectionById = useCallback(
    (oldSectionId: number | null | undefined, newSectionId: number) => {
      const newSec = sectionById.get(newSectionId);
      if (!newSec) return;
      setSelectedSectionIdsForActivePlan((prev) => {
        const filtered = prev.filter((id) => {
          if (oldSectionId && id === oldSectionId) return false;
          const existing = sectionById.get(id);
          if (!existing) return false;
          if (
            existing.course_code === newSec.course_code &&
            existing.course_type_code === newSec.course_type_code
          ) {
            return false;
          }
          return true;
        });
        return Array.from(new Set([...filtered, newSectionId]));
      });
      showToast(
        `Resolved: Switched ${newSec.course_code} to ${newSec.faculty_name} (${newSec.venue} · ${newSec.slot_combination})`
      );
    },
    [sectionById, setSelectedSectionIdsForActivePlan, showToast]
  );

  const handleRemoveSection = useCallback(
    (sectionId: number) => {
      const sec = sectionById.get(sectionId);
      setSelectedSectionIdsForActivePlan((prev) => prev.filter((id) => id !== sectionId));
      if (sec) {
        showToast(`Removed ${sec.course_code} (${sec.slot_combination})`);
      }
    },
    [sectionById, setSelectedSectionIdsForActivePlan, showToast]
  );

  const handleToggleLock = useCallback((sectionId: number) => {
    setLockedSectionIds((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  }, []);

  const handleClearTimetable = () => {
    setSelectedSectionIdsForActivePlan([]);
    setLockedSectionIds([]);
    showToast(`Cleared ${PLAN_LABELS[activePlanKey]}`);
  };

  const handleClonePrimaryToActiveBackup = () => {
    if (activePlanKey === 'primary') {
      setPlanSectionsMap((prev) => ({
        ...prev,
        backup1: [...prev.primary],
      }));
      setActivePlanKey('backup1');
      showToast('Copied Primary Timetable into Backup 1');
    } else {
      setPlanSectionsMap((prev) => ({
        ...prev,
        [activePlanKey]: [...prev.primary],
      }));
      showToast(`Copied Primary Timetable into ${PLAN_LABELS[activePlanKey]}`);
    }
  };

  const handleSaveToLocal = () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        campus,
        semester,
        activePlanKey,
        planSectionsMap,
        savedAt: new Date().toISOString(),
      })
    );
    showToast('Saved all timetable plans to browser storage');
  };

  const handleRestoreFromLocal = () => {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      showToast('No saved local plan found');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed.planSectionsMap) {
        setPlanSectionsMap(parsed.planSectionsMap);
        showToast('Restored saved timetable plans from browser storage');
      }
    } catch {
      showToast('Could not read saved plan');
    }
  };

  // Sync public data & catalog from no8am.site
  const handleSyncNo8am = async () => {
    setSyncingNo8am(true);
    try {
      const res = await syncNo8amReviews(campus);
      await loadCatalogData(campus, false);
      setDataSourceStatus(
        res.status === 'current'
          ? 'Current (Live no8am.site Sync)'
          : 'Cached (no8am.site + Workbook)'
      );
      setLastUpdatedLabel(new Date().toISOString().slice(0, 10));
      showToast(res.message || 'Synced public course & professor data from no8am.site');
    } catch {
      showToast('Using cached no8am.site dataset');
    } finally {
      setSyncingNo8am(false);
    }
  };

  // CSV / XLSX Import Fallback
  const handleImportWorkbookFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await commitWorkbookImport(file, undefined, true);
      await loadCatalogData(campus, false);
      setDataSourceStatus('Manually Imported (.xlsx/.csv)');
      setLastUpdatedLabel(new Date().toISOString().slice(0, 10));
      showToast(`Imported ${res.courses_imported} courses from ${file.name}`);
    } catch {
      showToast('Failed to import workbook file');
    }
  };

  // Dedicated Direct PDF Export (Landscape A3 or A4, Visual / Detailed / Both)
  const handleDownloadPdf = (
    overrideContentMode?: PdfContentMode,
    action: 'download' | 'print' = 'download'
  ) => {
    const mode = overrideContentMode ?? pdfContentMode;
    exportTimetablePdf({
      paperSize: pdfPaperSize,
      contentMode: mode,
      planName: PLAN_LABELS[activePlanKey],
      semester,
      campus,
      showSaturday,
      courses,
      selectedSections,
      periodHeaders,
      clashReport,
      action,
    });
    showToast(
      action === 'print'
        ? `Opened ${PLAN_LABELS[activePlanKey]} (${pdfPaperSize.toUpperCase()} Landscape) for printing`
        : `Downloaded ${PLAN_LABELS[activePlanKey]} PDF (Landscape ${pdfPaperSize.toUpperCase()} • ${
            mode === 'both'
              ? 'Timetable + Class List'
              : mode === 'visual'
              ? 'Visual Grid'
              : 'Detailed Class List'
          })`
    );
  };

  // Export Excel
  const handleExportExcel = () => {
    const idsParam = selectedSectionIds.join(',');
    window.open(
      `/api/export/excel?section_ids=${encodeURIComponent(idsParam)}&campus=${encodeURIComponent(campus)}`,
      '_blank'
    );
  };

  // Active slot clashes & unresolved warnings
  const activeClashes = useMemo(
    () =>
      (clashReport?.clashes || []).filter(
        (c) =>
          c.is_confirmed ||
          c.clash_type === 'UNRESOLVED_SLOT_WARNING' ||
          c.clash_type === 'UNRESOLVED_SLOT'
      ),
    [clashReport]
  );

  const uniqueCourseCount = useMemo(
    () => new Set(selectedSections.map((s) => s.course_code)).size,
    [selectedSections]
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FC] text-[#202124]">
      {/* 1. COMPACT TOP HEADER WITH DEDICATED LANDSCAPE A3/A4 PDF EXPORT CONTROLS */}
      <header className="no-print sticky top-0 z-30 border-b border-[#DADCE0] bg-white px-4 lg:px-6 py-2.5 shadow-2xs">
        <div className="mx-auto max-w-[1760px] flex flex-wrap items-center justify-between gap-3">
          {/* Left: App Name, Campus Selector, Semester, Data Source Status */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1A73E8] text-white">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-[16px] font-bold tracking-tight text-[#202124] leading-none">
                  VIT FFCS Timetable Maker
                </h1>
                <span className="text-[11px] font-medium text-[#5F6368]">
                  No8AM Public Data & Verified Slot Engine
                </span>
              </div>
            </div>

            {/* Campus Selector */}
            <div className="flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#F8F9FC] px-2.5 py-1 text-[12px] font-medium">
              <MapPin className="h-3.5 w-3.5 text-[#188038]" />
              <select
                aria-label="Select Campus"
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                className="bg-transparent font-semibold text-[#202124] focus:outline-none cursor-pointer"
              >
                <option value="vellore">VIT Vellore</option>
                <option value="chennai">VIT Chennai</option>
              </select>
            </div>

            {/* Semester Selector */}
            <div className="flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#F8F9FC] px-2.5 py-1 text-[12px] font-medium">
              <Clock className="h-3.5 w-3.5 text-[#1A73E8]" />
              <select
                aria-label="Select Semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="bg-transparent font-semibold text-[#202124] focus:outline-none cursor-pointer"
              >
                <option value="Winter Semester 2026–27">Winter Semester 2026–27</option>
                <option value="Fall Semester 2026–27">Fall Semester 2026–27</option>
              </select>
            </div>

            {/* Data Source Status Badge + Sync / Upload Fallback */}
            <div className="hidden 2xl:flex items-center gap-1.5 rounded-lg border border-[#DADCE0] bg-[#F8F9FC] px-2.5 py-1 text-[11px] text-[#5F6368]">
              <Database className="h-3.5 w-3.5 text-[#1A73E8]" />
              <span>
                Data: <strong className="text-[#202124]">{dataSourceStatus}</strong> ({lastUpdatedLabel})
              </span>
              <button
                onClick={handleSyncNo8am}
                disabled={syncingNo8am}
                title="Sync public course & faculty review data from https://no8am.site"
                className="ml-1 inline-flex items-center gap-1 rounded bg-[#E8F0FE] px-1.5 py-0.5 font-semibold text-[#1A73E8] hover:bg-[#D2E3FC] cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${syncingNo8am ? 'animate-spin' : ''}`} />
                <span>{syncingNo8am ? 'Syncing...' : 'Sync No8AM'}</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Upload custom VIT course allocation .xlsx or .csv workbook"
                className="inline-flex items-center gap-1 rounded bg-white border border-[#DADCE0] px-1.5 py-0.5 font-semibold text-[#202124] hover:bg-[#F1F3F4] cursor-pointer"
              >
                <Upload className="h-3 w-3" />
                <span>Import .xlsx</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                onChange={handleImportWorkbookFile}
                className="hidden"
              />
            </div>
          </div>

          {/* Right: Dedicated PDF Export Controls + Save/Restore + Clear */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* PDF Format Selector: Landscape A3 (Default) / Landscape A4 */}
            <div className="flex items-center rounded-lg border border-[#DADCE0] bg-[#F8F9FC] px-2 py-1 text-[11.5px] font-medium">
              <span className="text-[#5F6368] mr-1">PDF Size:</span>
              <select
                aria-label="Select PDF Paper Format"
                value={pdfPaperSize}
                onChange={(e) => setPdfPaperSize(e.target.value as PdfPaperSize)}
                className="bg-transparent font-bold text-[#202124] focus:outline-none cursor-pointer"
              >
                <option value="a3">Landscape A3 (Default)</option>
                <option value="a4">Landscape A4 (Compact)</option>
              </select>
            </div>

            {/* PDF Content Mode Selector: Both Pages / Visual Timetable / Detailed Table */}
            <div className="flex items-center rounded-lg border border-[#DADCE0] bg-[#F8F9FC] px-2 py-1 text-[11.5px] font-medium">
              <span className="text-[#5F6368] mr-1">Pages:</span>
              <select
                aria-label="Select PDF Pages"
                value={pdfContentMode}
                onChange={(e) => setPdfContentMode(e.target.value as PdfContentMode)}
                className="bg-transparent font-bold text-[#202124] focus:outline-none cursor-pointer"
              >
                <option value="both">Both Pages (Grid + Class List)</option>
                <option value="visual">Visual Timetable Only</option>
                <option value="detailed">Detailed Class List Only</option>
              </select>
            </div>

            {/* Direct Download PDF Button */}
            <button
              onClick={() => handleDownloadPdf()}
              title="Directly generate and download formatted Landscape PDF"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1A73E8] hover:bg-[#1557B0] px-3 py-1.5 text-[12px] font-bold text-white shadow-2xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </button>

            {/* Export Detailed Class List PDF Button */}
            <button
              onClick={() => handleDownloadPdf('detailed', 'download')}
              title="Download Detailed Registered Class List PDF"
              className="inline-flex items-center gap-1 rounded-lg border border-[#DADCE0] bg-white hover:bg-[#F1F3F4] px-2.5 py-1.5 text-[12px] font-semibold text-[#202124] cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-[#1A73E8]" />
              <span>Detailed List PDF</span>
            </button>

            {/* Print Timetable (Formatted Landscape PDF Print) */}
            <button
              onClick={() => handleDownloadPdf(pdfContentMode, 'print')}
              title="Print formatted Landscape Timetable"
              className="inline-flex items-center gap-1 rounded-lg border border-[#DADCE0] bg-white hover:bg-[#F1F3F4] px-2.5 py-1.5 text-[12px] font-semibold text-[#202124] cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-[#5F6368]" />
              <span>Print</span>
            </button>

            {/* Excel Export */}
            <button
              onClick={handleExportExcel}
              title="Download timetable as Excel (.xlsx)"
              className="inline-flex items-center gap-1 rounded-lg border border-[#DADCE0] bg-white hover:bg-[#F1F3F4] px-2.5 py-1.5 text-[12px] font-medium text-[#202124] cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-[#188038]" />
              <span>Excel</span>
            </button>

            <button
              onClick={handleSaveToLocal}
              title="Save current timetable in browser storage"
              className="inline-flex items-center gap-1 rounded-lg border border-[#DADCE0] bg-white hover:bg-[#F1F3F4] px-2.5 py-1.5 text-[12px] font-medium text-[#202124] cursor-pointer"
            >
              <Save className="h-3.5 w-3.5 text-[#1A73E8]" />
              <span>Save</span>
            </button>

            <button
              onClick={handleRestoreFromLocal}
              title="Restore saved timetable from browser storage"
              className="inline-flex items-center gap-1 rounded-lg border border-[#DADCE0] bg-white hover:bg-[#F1F3F4] px-2.5 py-1.5 text-[12px] font-medium text-[#202124] cursor-pointer"
            >
              <FolderOpen className="h-3.5 w-3.5 text-[#5F6368]" />
              <span>Restore</span>
            </button>

            <button
              onClick={handleClearTimetable}
              title="Clear all classes from active timetable"
              className="inline-flex items-center gap-1 rounded-lg border border-[#D93025]/40 bg-[#FCE8E6]/60 hover:bg-[#FCE8E6] px-2.5 py-1.5 text-[12px] font-semibold text-[#D93025] cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE (Left Selector + Right Live Timetable, or Full-Width Expanded Timetable) */}
      <main className="mx-auto w-full max-w-[1760px] flex-1 px-4 lg:px-6 py-4">
        {loading ? (
          <div className="rounded-2xl border border-[#DADCE0] bg-white p-16 text-center space-y-3">
            <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-[#1A73E8] border-t-transparent" />
            <div className="text-[14px] font-semibold text-[#202124]">
              Loading VIT FFCS Courses, Teachers, and Verified Slot Mappings...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* LEFT PANEL: Course, Teacher & Slot Selector (Hidden when Timetable is in Full-Width Expanded Mode) */}
            {!isTimetableExpanded && (
              <div className="no-print lg:col-span-4 xl:col-span-4">
                <CourseTeacherSlotSelector
                  courses={courses}
                  activeCourseCode={activeCourseCode}
                  onSelectCourseCode={(code) => setActiveCourseCode(code)}
                  selectedSections={selectedSections}
                  selectedSectionIds={selectedSectionIds}
                  clashReport={clashReport}
                  campus={campus}
                  lastUpdatedLabel={lastUpdatedLabel}
                  onSelectOrSwitchSection={handleSelectOrSwitchSection}
                  onRemoveSection={handleRemoveSection}
                />
              </div>
            )}

            {/* RIGHT PANEL: Live Weekly Timetable Grid + Readability & Plan Controls */}
            <div
              className={`${
                isTimetableExpanded
                  ? 'lg:col-span-12'
                  : 'lg:col-span-8 xl:col-span-8'
              } space-y-3.5`}
            >
              {/* LIVE CLASH DETECTION & ALTERNATIVE SUGGESTIONS BANNER */}
              <div className="no-print">
                {activeClashes.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#188038]/30 bg-[#E6F4EA]/70 px-4 py-2.5 text-[13px] text-[#137333]">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#188038]" />
                      <span>
                        <strong>No clashes detected</strong> in{' '}
                        <strong>{PLAN_LABELS[activePlanKey]}</strong> — {uniqueCourseCount} course(s),{' '}
                        {selectedSections.length} section(s) ({clashReport?.total_credits ?? 0} Credits) verified against official VIT time slots.
                      </span>
                    </div>

                    {/* Primary / Backup Timetable Switcher Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                      {(['primary', 'backup1', 'backup2'] as PlanSlotKey[]).map((key) => {
                        const isActive = activePlanKey === key;
                        const count = planSectionsMap[key]?.length ?? 0;
                        return (
                          <button
                            key={key}
                            onClick={() => setActivePlanKey(key)}
                            className={`rounded-lg border px-2.5 py-1 font-bold transition-colors cursor-pointer ${
                              isActive
                                ? 'border-[#1A73E8] bg-[#1A73E8] text-white'
                                : 'border-[#DADCE0] bg-white text-[#5F6368] hover:text-[#202124]'
                            }`}
                          >
                            {PLAN_LABELS[key]} ({count})
                          </button>
                        );
                      })}
                      <button
                        onClick={handleClonePrimaryToActiveBackup}
                        title="Copy Primary Timetable into Backup plan"
                        className="inline-flex items-center gap-1 rounded-lg border border-[#DADCE0] bg-white hover:bg-[#F1F3F4] px-2 py-1 text-[11px] font-semibold text-[#202124] cursor-pointer"
                      >
                        <Copy className="h-3 w-3 text-[#1A73E8]" />
                        <span>Copy Primary → Backup</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeClashes.map((clash) => {
                      const isConfirmed = clash.is_confirmed && clash.severity === 'ERROR';
                      return (
                        <div
                          key={clash.clash_id}
                          className={`rounded-2xl border p-3.5 space-y-2.5 ${
                            isConfirmed
                              ? 'border-[#D93025] bg-[#FCE8E6]'
                              : 'border-[#F9AB00] bg-[#FEF7E0]'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {isConfirmed ? (
                                <AlertOctagon className="h-4 w-4 text-[#D93025]" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-[#B06000]" />
                              )}
                              <span
                                className={`text-[13px] font-bold ${
                                  isConfirmed ? 'text-[#A50E0E]' : 'text-[#8F4E00]'
                                }`}
                              >
                                {isConfirmed
                                  ? `Clash Detected: ${clash.course_a_code} (${clash.course_a_slot}) vs ${clash.course_b_code || ''} (${clash.course_b_slot || ''})`
                                  : `Unverified Slot Mapping: ${clash.course_a_code} (${clash.course_a_slot})`}
                              </span>
                            </div>

                            {clash.day && clash.time_interval && (
                              <span className="rounded-lg bg-white px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#D93025] tabular-time">
                                {clash.day} • {clash.time_interval}
                              </span>
                            )}
                          </div>

                          <div className="text-[12px] text-[#202124]">
                            {isConfirmed ? (
                              <>
                                <strong>{clash.course_a_code}</strong> ({clash.course_a_faculty}) and{' '}
                                <strong>{clash.course_b_code}</strong> ({clash.course_b_faculty}) overlap on{' '}
                                <strong>
                                  {clash.day} {clash.time_interval}
                                </strong>
                                .
                              </>
                            ) : (
                              clash.explanation
                            )}
                          </div>

                          {clash.suggested_alternatives.length > 0 && (
                            <div className="border-t border-[#D93025]/20 pt-2">
                              <div className="text-[11px] font-bold text-[#A50E0E] flex items-center gap-1 mb-1.5">
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                <span>
                                  Suggested Clash-Free Alternative Teachers & Sections (Click to switch immediately):
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {clash.suggested_alternatives.slice(0, 5).map((alt) => {
                                  const oldId =
                                    alt.course_code === clash.course_a_code
                                      ? clash.course_a_section_id
                                      : clash.course_b_section_id;
                                  return (
                                    <button
                                      key={alt.section_id}
                                      onClick={() =>
                                        handleSwitchSectionById(oldId, alt.section_id)
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#188038] bg-white hover:bg-[#E6F4EA] px-2.5 py-1 text-[11px] font-semibold text-[#137333] shadow-2xs transition-colors cursor-pointer"
                                    >
                                      <span className="font-mono font-bold text-[#1A73E8]">
                                        {alt.course_code}
                                      </span>
                                      <span>→</span>
                                      <span>{alt.faculty_name}</span>
                                      <span className="font-mono font-bold text-[#188038]">
                                        ({alt.slot_combination} • {alt.venue})
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

              {/* LIVE WEEKLY VIT TIMETABLE GRID CARD */}
              <div className="rounded-2xl border border-[#DADCE0] bg-white shadow-xs overflow-hidden print-surface">
                {/* TIMETABLE READABILITY & VIEW TOOLBAR */}
                <div className="border-b border-[#DADCE0] bg-[#F8F9FC] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-bold text-[#202124]">
                      {PLAN_LABELS[activePlanKey]} ({campus === 'vellore' ? 'VIT Vellore' : 'VIT Chennai'})
                    </span>
                    <span className="rounded-full bg-[#E8F0FE] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#174EA6]">
                      {uniqueCourseCount} Courses • {clashReport?.total_credits ?? 0} Credits
                    </span>
                    <span className="hidden xl:inline text-[11px] text-[#5F6368]">
                      • Scroll horizontally to inspect all 12 periods with full faculty & venue details
                    </span>
                  </div>

                  {/* Readability & View Controls */}
                  <div className="no-print flex flex-wrap items-center gap-1.5 text-[12px]">
                    {/* Detailed View vs Compact View */}
                    <div className="inline-flex rounded-lg border border-[#DADCE0] bg-white p-0.5">
                      <button
                        onClick={() => setFitToPage(false)}
                        className={`rounded-md px-2.5 py-1 text-[11.5px] font-bold transition-colors cursor-pointer ${
                          !fitToPage
                            ? 'bg-[#E8F0FE] text-[#1A73E8]'
                            : 'text-[#5F6368] hover:text-[#202124]'
                        }`}
                        title="Detailed View — Full faculty names, 2-line course titles, and prominent PRP/SJT venue codes"
                      >
                        Detailed View
                      </button>
                      <button
                        onClick={() => setFitToPage(true)}
                        className={`rounded-md px-2.5 py-1 text-[11.5px] font-bold transition-colors cursor-pointer ${
                          fitToPage
                            ? 'bg-[#E8F0FE] text-[#1A73E8]'
                            : 'text-[#5F6368] hover:text-[#202124]'
                        }`}
                        title="Compact View — Slightly narrower columns while keeping faculty & venue readable"
                      >
                        Compact View
                      </button>
                    </div>

                    {/* Grid vs Detailed Class List Table */}
                    <div className="inline-flex rounded-lg border border-[#DADCE0] bg-white p-0.5">
                      <button
                        onClick={() => setGridViewMode('week')}
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] font-bold transition-colors cursor-pointer ${
                          gridViewMode === 'week'
                            ? 'bg-[#E8F0FE] text-[#1A73E8]'
                            : 'text-[#5F6368] hover:text-[#202124]'
                        }`}
                      >
                        <LayoutGrid className="h-3 w-3" />
                        <span>Weekly Grid</span>
                      </button>
                      <button
                        onClick={() => setGridViewMode('slotlist')}
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] font-bold transition-colors cursor-pointer ${
                          gridViewMode === 'slotlist'
                            ? 'bg-[#E8F0FE] text-[#1A73E8]'
                            : 'text-[#5F6368] hover:text-[#202124]'
                        }`}
                      >
                        <ListFilter className="h-3 w-3" />
                        <span>Class List</span>
                      </button>
                    </div>

                    {/* Saturday Toggle */}
                    <button
                      onClick={() => setShowSaturday((s) => !s)}
                      className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-bold cursor-pointer ${
                        showSaturday
                          ? 'border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8]'
                          : 'border-[#DADCE0] bg-white text-[#5F6368] hover:text-[#202124]'
                      }`}
                    >
                      {showSaturday ? 'Mon–Sat' : '+ Saturday'}
                    </button>

                    {/* Expand Timetable Full Width Toggle */}
                    <button
                      onClick={() => setIsTimetableExpanded((e) => !e)}
                      title={
                        isTimetableExpanded
                          ? 'Restore split-screen view with Course/Teacher Selector on the left'
                          : 'Temporarily hide left panel to view Timetable across 100% of screen width'
                      }
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11.5px] font-bold cursor-pointer ${
                        isTimetableExpanded
                          ? 'border-[#1A73E8] bg-[#1A73E8] text-white'
                          : 'border-[#DADCE0] bg-white text-[#202124] hover:bg-[#F1F3F4]'
                      }`}
                    >
                      {isTimetableExpanded ? (
                        <>
                          <Minimize2 className="h-3.5 w-3.5" />
                          <span>Show Course Selector</span>
                        </>
                      ) : (
                        <>
                          <Maximize2 className="h-3.5 w-3.5 text-[#1A73E8]" />
                          <span>Expand Full Width</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <TimetableGrid
                  courses={courses}
                  selectedSections={selectedSections}
                  lockedSectionIds={lockedSectionIds}
                  periodHeaders={periodHeaders}
                  slotMap={slotMap}
                  clashReport={clashReport}
                  viewMode={gridViewMode}
                  showVenues={true}
                  fitToPage={fitToPage}
                  sessionFilter="all"
                  clashFilter="all"
                  showSaturday={showSaturday}
                  focusedDay="MON"
                  onRemoveSection={handleRemoveSection}
                  onToggleLock={handleToggleLock}
                  onSwitchSection={(oldId, newId) => handleSwitchSectionById(oldId, newId)}
                  onOpenFacultyComparison={(code) => {
                    setActiveCourseCode(code);
                    setIsTimetableExpanded(false);
                  }}
                  onClickEmptyCell={() => {
                    // Clicking an empty cell keeps focus on the left selector
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className="no-print fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-xl bg-[#202124] px-3.5 py-2 text-[12px] font-medium text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-[#81C995]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
