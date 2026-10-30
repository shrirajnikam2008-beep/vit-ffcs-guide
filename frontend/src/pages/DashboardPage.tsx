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
  Copy,
  MoreHorizontal,
  PanelLeftOpen,
  BookOpen,
  Columns3,
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
const SESSION_LAYOUT_KEY = 'vit_ffcs_layout_prefs_v2';

type PlanSlotKey = 'primary' | 'backup1' | 'backup2';
type TimetableDisplayMode = 'compact' | 'detailed';

const PLAN_LABELS: Record<PlanSlotKey, string> = {
  primary: 'Primary',
  backup1: 'Backup 1',
  backup2: 'Backup 2',
};

export const DashboardPage: React.FC = () => {
  // Header Academic Context
  const [campus, setCampus] = useState('vellore');
  const [semester, setSemester] = useState('Winter Semester 2026–27');
  const [showSaturday, setShowSaturday] = useState(false);

  // Layout & Display Mode State (Persisted in sessionStorage)
  // Default: Compact Week ('compact') so all weekdays & 12 periods fit in a single laptop screen
  const [displayMode, setDisplayMode] = useState<TimetableDisplayMode>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION_LAYOUT_KEY) || '{}');
      if (saved.displayMode === 'compact' || saved.displayMode === 'detailed') {
        return saved.displayMode;
      }
    } catch {
      // ignore
    }
    return 'compact';
  });
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION_LAYOUT_KEY) || '{}');
      if (typeof saved.leftPanelWidth === 'number') {
        return Math.min(380, Math.max(260, saved.leftPanelWidth));
      }
    } catch {
      // ignore
    }
    return 296;
  });
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION_LAYOUT_KEY) || '{}');
      return Boolean(saved.isLeftCollapsed);
    } catch {
      return false;
    }
  });
  const [focusTimetableMode, setFocusTimetableMode] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [clashDrawerExpanded, setClashDrawerExpanded] = useState(false);

  // Persist layout state in sessionStorage
  useEffect(() => {
    sessionStorage.setItem(
      SESSION_LAYOUT_KEY,
      JSON.stringify({
        displayMode,
        leftPanelWidth,
        isLeftCollapsed,
      })
    );
  }, [displayMode, leftPanelWidth, isLeftCollapsed]);

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
  const [dataSourceStatus, setDataSourceStatus] = useState<'Cached' | 'Live Sync' | 'Imported'>(
    'Cached'
  );
  const [lastUpdatedLabel, setLastUpdatedLabel] = useState<string>('2026-10-29');
  const [syncingNo8am, setSyncingNo8am] = useState(false);

  // Active Course in Left Selector & Locked Section IDs
  const [activeCourseCode, setActiveCourseCode] = useState<string>('BAITE102');
  const [lockedSectionIds, setLockedSectionIds] = useState<number[]>([]);
  const [clashReport, setClashReport] = useState<ClashReport | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isResizingRef = useRef(false);

  // Drag-resize handler for Left Panel (260px - 380px)
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const nextWidth = Math.min(380, Math.max(260, e.clientX));
      setLeftPanelWidth(nextWidth);
    };
    const onMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

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
    }, 2800);
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
            if (
              parsed.planSectionsMap &&
              Array.isArray(parsed.planSectionsMap.primary) &&
              parsed.planSectionsMap.primary.length > 0
            ) {
              setPlanSectionsMap(parsed.planSectionsMap);
              if (parsed.activePlanKey) setActivePlanKey(parsed.activePlanKey);
              return;
            }
          } catch {
            // ignore corrupt localStorage
          }
        }

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
          findSec('BACSE104', 'ETH', 'A1', 'SJT102'),
          findSec('BACSE104', 'ELA', 'L37+L38+L43+L44', 'SJT122'),
          findSec('BAITE101', 'ETH', 'B1+TB1', 'SJT823'),
          findSec('BAITE101', 'ELA', 'L55+L56', 'SJT212'),
          findSec('BACHY105', 'ETH', 'C1+TC1', 'PRP329'),
          findSec('BACHY105', 'ELA', 'L49+L50', 'PRP408A'),
          findSec('BAMAT207', 'ETH', 'D1+TD1', 'PRP329'),
          findSec('BAMAT207', 'ELA', 'L51+L52', 'PRP450'),
          findSec('BAITE103', 'ETH', 'E1+TE1', 'SJTG14'),
          findSec('BAITE103', 'ELA', 'L33+L34', 'SJTG17'),
          findSec('BAITE102', 'ETH', 'F1+TF1', 'SJT823'),
          findSec('BAITE102', 'ELA', 'L39+L40', 'SJTG18'),
        ]
          .filter((s): s is CourseSection => Boolean(s))
          .map((s) => s.id);

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

  // Persist selection changes & evaluate clashes
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

  // Select or switch a teacher/slot for a course component (updates in place, never duplicates)
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
          `Selected ${section.course_code} · ${section.course_type_code} — ${section.faculty_name} (${section.venue} · ${section.slot_combination})`
        );
        return [...withoutSameComponent, section.id];
      });
    },
    [sectionById, setSelectedSectionIdsForActivePlan, showToast]
  );

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
        `Switched ${newSec.course_code} to ${newSec.faculty_name} (${newSec.venue} · ${newSec.slot_combination})`
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
    showToast(`Cleared ${PLAN_LABELS[activePlanKey]} Timetable`);
  };

  const handleClonePrimaryToActiveBackup = () => {
    if (activePlanKey === 'primary') {
      setPlanSectionsMap((prev) => ({
        ...prev,
        backup1: [...prev.primary],
      }));
      setActivePlanKey('backup1');
      showToast('Copied Primary into Backup 1');
    } else {
      setPlanSectionsMap((prev) => ({
        ...prev,
        [activePlanKey]: [...prev.primary],
      }));
      showToast(`Copied Primary into ${PLAN_LABELS[activePlanKey]}`);
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
    showToast('Saved timetable plans to browser storage');
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
        showToast('Restored saved timetable plans');
      }
    } catch {
      showToast('Could not read saved plan');
    }
  };

  const handleSyncNo8am = async () => {
    setSyncingNo8am(true);
    try {
      const res = await syncNo8amReviews(campus);
      await loadCatalogData(campus, false);
      setDataSourceStatus(res.status === 'current' ? 'Live Sync' : 'Cached');
      setLastUpdatedLabel(new Date().toISOString().slice(0, 10));
      showToast(res.message || 'Synced public course & professor data from no8am.site');
    } catch {
      showToast('Using cached no8am.site dataset');
    } finally {
      setSyncingNo8am(false);
    }
  };

  const handleImportWorkbookFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await commitWorkbookImport(file, undefined, true);
      await loadCatalogData(campus, false);
      setDataSourceStatus('Imported');
      setLastUpdatedLabel(new Date().toISOString().slice(0, 10));
      showToast(`Imported ${res.courses_imported} courses from ${file.name}`);
    } catch {
      showToast('Failed to import workbook file');
    }
  };

  // Dedicated PDF Export (Independent of compact website layout)
  const handleDownloadPdf = (
    overrideContentMode?: PdfContentMode,
    action: 'download' | 'print' = 'download'
  ) => {
    const mode = overrideContentMode ?? pdfContentMode;
    exportTimetablePdf({
      paperSize: pdfPaperSize,
      contentMode: mode,
      planName: `${PLAN_LABELS[activePlanKey]} Timetable`,
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
        ? `Opened Landscape ${pdfPaperSize.toUpperCase()} PDF for printing`
        : `Downloaded Landscape ${pdfPaperSize.toUpperCase()} PDF`
    );
  };

  const handleExportExcel = () => {
    const idsParam = selectedSectionIds.join(',');
    window.open(
      `/api/export/excel?section_ids=${encodeURIComponent(idsParam)}&campus=${encodeURIComponent(campus)}`,
      '_blank'
    );
  };

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

  // Derive TimetableGrid props from the 2 display modes ('compact' | 'detailed')
  const gridViewMode = 'week';
  const fitToPage = displayMode === 'compact';

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-[#F8F9FC] text-[#202124]">
      {/* 1. COMPACT STICKY TOP TOOLBAR (~44px height) */}
      {!focusTimetableMode ? (
        <header className="no-print shrink-0 border-b border-[#DADCE0] bg-white px-3 py-1 shadow-2xs z-30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Left: App Brand, Semester, Campus, Data Sync Status, Import Workbook */}
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1.5 mr-0.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1A73E8] text-white">
                  <Calendar className="h-3.5 w-3.5" />
                </div>
                <span className="text-[13px] font-bold tracking-tight text-[#202124]">
                  VIT FFCS Planner
                </span>
              </div>

              {/* Semester Selector */}
              <div className="flex items-center gap-1 rounded-md border border-[#DADCE0] bg-[#F8F9FC] px-2 py-0.5 text-[11px]">
                <Clock className="h-3 w-3 text-[#1A73E8]" />
                <select
                  aria-label="Select Semester"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="bg-transparent font-semibold text-[#202124] focus:outline-none cursor-pointer"
                >
                  <option value="Winter Semester 2026–27">Winter 2026–27</option>
                  <option value="Fall Semester 2026–27">Fall 2026–27</option>
                </select>
              </div>

              {/* Campus Selector */}
              <div className="flex items-center gap-1 rounded-md border border-[#DADCE0] bg-[#F8F9FC] px-2 py-0.5 text-[11px]">
                <MapPin className="h-3 w-3 text-[#188038]" />
                <select
                  aria-label="Select Campus"
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                  className="bg-transparent font-semibold text-[#202124] focus:outline-none cursor-pointer"
                >
                  <option value="vellore">Vellore</option>
                  <option value="chennai">Chennai</option>
                </select>
              </div>

              {/* Data Sync Status */}
              <div className="hidden md:flex items-center gap-1 rounded-md border border-[#DADCE0] bg-[#F8F9FC] px-2 py-0.5 text-[10.5px] text-[#5F6368]">
                <Database className="h-3 w-3 text-[#1A73E8]" />
                <span>
                  <strong className="text-[#202124]">{dataSourceStatus}</strong> ({lastUpdatedLabel})
                </span>
                <button
                  onClick={handleSyncNo8am}
                  disabled={syncingNo8am}
                  title="Sync public course & faculty review data from no8am.site"
                  className="ml-0.5 inline-flex items-center gap-0.5 rounded bg-[#E8F0FE] px-1.5 py-0.2 font-semibold text-[#1A73E8] hover:bg-[#D2E3FC] cursor-pointer"
                >
                  <RefreshCw className={`h-2.5 w-2.5 ${syncingNo8am ? 'animate-spin' : ''}`} />
                  <span>{syncingNo8am ? '...' : 'Sync'}</span>
                </button>
              </div>

              {/* Import Workbook */}
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Import VIT course allocation .xlsx or .csv workbook"
                className="inline-flex items-center gap-1 rounded-md border border-[#DADCE0] bg-white hover:bg-[#F1F3F4] px-2 py-0.5 text-[11px] font-semibold text-[#202124] cursor-pointer"
              >
                <Upload className="h-3 w-3 text-[#1A73E8]" />
                <span>Import Workbook</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                onChange={handleImportWorkbookFile}
                className="hidden"
              />
            </div>

            {/* Right: Download PDF, Save, Restore, Clear + Overflow Menu */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Download PDF */}
              <button
                onClick={() => handleDownloadPdf()}
                title={`Download formatted Landscape ${pdfPaperSize.toUpperCase()} PDF`}
                className="inline-flex items-center gap-1 rounded-md bg-[#1A73E8] hover:bg-[#1557B0] px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer"
              >
                <Download className="h-3 w-3" />
                <span>Download PDF</span>
              </button>

              {/* Save */}
              <button
                onClick={handleSaveToLocal}
                title="Save timetable plans"
                className="inline-flex items-center gap-1 rounded-md border border-[#DADCE0] bg-white hover:bg-[#F1F3F4] px-2 py-1 text-[11px] font-semibold text-[#202124] cursor-pointer"
              >
                <Save className="h-3 w-3 text-[#1A73E8]" />
                <span>Save</span>
              </button>

              {/* Restore */}
              <button
                onClick={handleRestoreFromLocal}
                title="Restore saved plans"
                className="inline-flex items-center gap-1 rounded-md border border-[#DADCE0] bg-white hover:bg-[#F1F3F4] px-2 py-1 text-[11px] font-semibold text-[#202124] cursor-pointer"
              >
                <FolderOpen className="h-3 w-3 text-[#5F6368]" />
                <span>Restore</span>
              </button>

              {/* Clear */}
              <button
                onClick={handleClearTimetable}
                title="Clear active timetable"
                className="inline-flex items-center gap-1 rounded-md border border-[#D93025]/40 bg-[#FCE8E6]/60 hover:bg-[#FCE8E6] px-2 py-1 text-[11px] font-semibold text-[#D93025] cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Clear</span>
              </button>

              {/* Overflow Menu for Secondary Options (PDF Size, PDF Layout, Print, Excel, Backup Plans) */}
              <div className="relative">
                <button
                  onClick={() => setShowOverflowMenu((o) => !o)}
                  title="PDF settings, Print, Excel export & Backup plans"
                  className="inline-flex items-center justify-center rounded-md border border-[#DADCE0] bg-white hover:bg-[#F1F3F4] p-1 text-[#5F6368] hover:text-[#202124] cursor-pointer"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {showOverflowMenu && (
                  <div
                    onMouseLeave={() => setShowOverflowMenu(false)}
                    className="absolute right-0 mt-1 w-56 rounded-xl border border-[#DADCE0] bg-white p-2 shadow-xl z-50 space-y-1.5 text-[11px]"
                  >
                    <div className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#5F6368]">
                      PDF Export Settings
                    </div>
                    <div className="flex items-center justify-between gap-2 px-1.5">
                      <span className="text-[#5F6368] font-medium">Page Size:</span>
                      <select
                        aria-label="PDF Size"
                        value={pdfPaperSize}
                        onChange={(e) => setPdfPaperSize(e.target.value as PdfPaperSize)}
                        className="rounded border border-[#DADCE0] bg-[#F8F9FC] px-1.5 py-0.5 font-semibold text-[#202124] focus:outline-none cursor-pointer"
                      >
                        <option value="a3">A3 Landscape</option>
                        <option value="a4">A4 Landscape</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between gap-2 px-1.5 pb-1 border-b border-[#E8EAED]">
                      <span className="text-[#5F6368] font-medium">Content:</span>
                      <select
                        aria-label="PDF Layout"
                        value={pdfContentMode}
                        onChange={(e) => setPdfContentMode(e.target.value as PdfContentMode)}
                        className="rounded border border-[#DADCE0] bg-[#F8F9FC] px-1.5 py-0.5 font-semibold text-[#202124] focus:outline-none cursor-pointer"
                      >
                        <option value="both">Grid + List (2p)</option>
                        <option value="visual">Visual Grid</option>
                        <option value="detailed">Detailed List</option>
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        setShowOverflowMenu(false);
                        handleDownloadPdf('detailed', 'download');
                      }}
                      className="w-full flex items-center gap-2 rounded-lg px-2 py-1 text-left font-medium text-[#202124] hover:bg-[#F8F9FC] cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-[#1A73E8]" />
                      <span>Export Detailed Class List</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowOverflowMenu(false);
                        handleDownloadPdf(pdfContentMode, 'print');
                      }}
                      className="w-full flex items-center gap-2 rounded-lg px-2 py-1 text-left font-medium text-[#202124] hover:bg-[#F8F9FC] cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5 text-[#5F6368]" />
                      <span>Print Landscape Timetable</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowOverflowMenu(false);
                        handleExportExcel();
                      }}
                      className="w-full flex items-center gap-2 rounded-lg px-2 py-1 text-left font-medium text-[#202124] hover:bg-[#F8F9FC] cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-[#188038]" />
                      <span>Export Excel (.xlsx)</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowOverflowMenu(false);
                        handleClonePrimaryToActiveBackup();
                      }}
                      className="w-full flex items-center gap-2 rounded-lg px-2 py-1 text-left font-medium text-[#202124] hover:bg-[#F8F9FC] cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5 text-[#1A73E8]" />
                      <span>Copy Primary → Backup</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      ) : null}

      {/* 2. MAIN SINGLE-SCREEN WORKSPACE (Fills Remaining Viewport Height) */}
      <main className="flex-1 min-h-0 min-w-0 flex flex-col lg:flex-row overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1A73E8] border-t-transparent" />
            <div className="text-[13px] font-semibold text-[#202124]">
              Loading VIT FFCS Courses, Faculty & Verified Slot Mappings...
            </div>
          </div>
        ) : (
          <>
            {/* LEFT PANEL: Compact Course & Faculty Selection (Default 296px, Resizable 260-380px, Collapsible to 36px Rail) */}
            {!focusTimetableMode && (
              <>
                {isLeftCollapsed ? (
                  <aside className="no-print shrink-0 w-[36px] border-r border-[#DADCE0] bg-white flex flex-col items-center py-2 gap-2.5 select-none">
                    <button
                      onClick={() => setIsLeftCollapsed(false)}
                      title="Expand Course & Faculty Selector"
                      className="rounded-md border border-[#DADCE0] bg-[#F8F9FC] hover:bg-[#E8F0FE] p-1 text-[#1A73E8] cursor-pointer"
                    >
                      <PanelLeftOpen className="h-3.5 w-3.5" />
                    </button>
                    <div
                      title={`${uniqueCourseCount} Selected Courses`}
                      className="flex flex-col items-center gap-0.5 text-[9.5px] font-bold text-[#202124]"
                    >
                      <BookOpen className="h-3 w-3 text-[#1A73E8]" />
                      <span>{uniqueCourseCount}C</span>
                    </div>
                    <div
                      title={`${clashReport?.total_credits ?? 0} Credits`}
                      className="rounded bg-[#E8F0FE] px-1 py-0.5 font-mono text-[9px] font-bold text-[#174EA6]"
                    >
                      {clashReport?.total_credits ?? 0}Cr
                    </div>
                  </aside>
                ) : (
                  <aside
                    style={{ '--panel-w': `${leftPanelWidth}px` } as React.CSSProperties}
                    className="no-print shrink-0 w-full lg:w-[var(--panel-w)] h-[420px] lg:h-full min-h-0 flex flex-col overflow-hidden"
                  >
                    <CourseTeacherSlotSelector
                      courses={courses}
                      activeCourseCode={activeCourseCode}
                      onSelectCourseCode={(code) => setActiveCourseCode(code)}
                      selectedSections={selectedSections}
                      selectedSectionIds={selectedSectionIds}
                      slotMap={slotMap}
                      clashReport={clashReport}
                      campus={campus}
                      semester={semester}
                      lastUpdatedLabel={lastUpdatedLabel}
                      onSelectOrSwitchSection={handleSelectOrSwitchSection}
                      onRemoveSection={handleRemoveSection}
                      onCollapsePanel={() => setIsLeftCollapsed(true)}
                    />
                  </aside>
                )}

                {/* Vertical Resizer Handle (Desktop) */}
                {!isLeftCollapsed && (
                  <div
                    onMouseDown={() => {
                      isResizingRef.current = true;
                      document.body.style.cursor = 'col-resize';
                      document.body.style.userSelect = 'none';
                    }}
                    title="Drag to resize Course & Faculty Selector panel (260px–380px)"
                    className="no-print hidden lg:block w-1 shrink-0 cursor-col-resize bg-transparent hover:bg-[#1A73E8]/40 transition-colors"
                  />
                )}
              </>
            )}

            {/* RIGHT PANEL: Weekly Timetable Workspace (Occupies All Remaining Horizontal & Vertical Space) */}
            <section className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-[#F8F9FC] p-1 lg:p-1.5 gap-1">
              {/* COMPACT TIMETABLE CONTROL BAR (Status/Clashes + Plan Tabs + 2 Viewing Modes + Focus Toggle) */}
              <div className="no-print shrink-0 rounded-lg border border-[#DADCE0] bg-white px-2 py-1 flex flex-wrap items-center justify-between gap-1.5 shadow-2xs">
                {/* Left: Plan Tabs + Clash/Credit Status */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {focusTimetableMode && (
                    <span className="text-[11.5px] font-bold text-[#202124] mr-1">
                      {semester} ({campus === 'vellore' ? 'VIT Vellore' : 'VIT Chennai'})
                    </span>
                  )}

                  {/* Plan Switcher */}
                  <div className="inline-flex rounded-md border border-[#DADCE0] bg-[#F1F3F4] p-0.5">
                    {(['primary', 'backup1', 'backup2'] as PlanSlotKey[]).map((key) => {
                      const isActive = activePlanKey === key;
                      const count = planSectionsMap[key]?.length ?? 0;
                      return (
                        <button
                          key={key}
                          onClick={() => setActivePlanKey(key)}
                          className={`rounded px-1.5 py-0.5 text-[10.5px] font-bold transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-white text-[#1A73E8] shadow-2xs'
                              : 'text-[#5F6368] hover:text-[#202124]'
                          }`}
                        >
                          {PLAN_LABELS[key]} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* Clash Status Summary Pill */}
                  {activeClashes.length === 0 ? (
                    <div className="inline-flex items-center gap-1 rounded-md border border-[#188038]/30 bg-[#E6F4EA]/80 px-2 py-0.5 text-[10.5px] font-semibold text-[#137333]">
                      <CheckCircle2 className="h-3 w-3 text-[#188038]" />
                      <span>
                        No clashes · {uniqueCourseCount} Courses ({selectedSections.length} sections) ·{' '}
                        <strong>{clashReport?.total_credits ?? 0} Cr</strong>
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setClashDrawerExpanded((v) => !v)}
                      className="inline-flex items-center gap-1 rounded-md border border-[#D93025] bg-[#FCE8E6] px-2 py-0.5 text-[10.5px] font-bold text-[#A50E0E] cursor-pointer"
                    >
                      <AlertOctagon className="h-3 w-3 text-[#D93025]" />
                      <span>
                        {activeClashes.length} Clash Warning(s) — Click to Resolve
                      </span>
                    </button>
                  )}
                </div>

                {/* Right: Two Simple Viewing Modes (Compact Week vs Detailed View) + Saturday + Focus Timetable */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <div className="inline-flex rounded-md border border-[#CBD5E1] bg-[#F1F5F9] p-0.5">
                    <button
                      onClick={() => setDisplayMode('compact')}
                      title="Compact Week (Default): Entire Mon–Fri timetable fits on one screen with Course, Faculty, and Location"
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10.5px] font-bold transition-colors cursor-pointer ${
                        displayMode === 'compact'
                          ? 'bg-white text-[#1A73E8] shadow-2xs'
                          : 'text-[#475569] hover:text-[#0F172A]'
                      }`}
                    >
                      <LayoutGrid className="h-3 w-3" />
                      <span>Compact Week</span>
                    </button>
                    <button
                      onClick={() => setDisplayMode('detailed')}
                      title="Detailed View: Larger class cards showing course codes, full titles, faculty names, venues, slots, and types"
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10.5px] font-bold transition-colors cursor-pointer ${
                        displayMode === 'detailed'
                          ? 'bg-white text-[#1A73E8] shadow-2xs'
                          : 'text-[#475569] hover:text-[#0F172A]'
                      }`}
                    >
                      <Columns3 className="h-3 w-3" />
                      <span>Detailed View</span>
                    </button>
                  </div>

                  {/* Saturday Toggle */}
                  <button
                    onClick={() => setShowSaturday((s) => !s)}
                    className={`rounded-md border px-2 py-0.5 text-[10.5px] font-bold cursor-pointer ${
                      showSaturday
                        ? 'border-[#1A73E8] bg-[#E8F0FE] text-[#1A73E8]'
                        : 'border-[#DADCE0] bg-white text-[#5F6368] hover:text-[#202124]'
                    }`}
                  >
                    {showSaturday ? 'Mon–Sat' : '+ Sat'}
                  </button>

                  {/* Quick Download PDF in Focus Mode */}
                  {focusTimetableMode && (
                    <button
                      onClick={() => handleDownloadPdf()}
                      className="inline-flex items-center gap-1 rounded-md bg-[#1A73E8] hover:bg-[#1557B0] px-2 py-0.5 text-[10.5px] font-bold text-white cursor-pointer"
                    >
                      <Download className="h-3 w-3" />
                      <span>PDF ({pdfPaperSize.toUpperCase()})</span>
                    </button>
                  )}

                  {/* Focus Timetable Mode Toggle */}
                  <button
                    onClick={() => setFocusTimetableMode((f) => !f)}
                    title={
                      focusTimetableMode
                        ? 'Return to normal workspace with Course Selector'
                        : 'Focus Timetable — Collapse left panel and maximize timetable'
                    }
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10.5px] font-bold transition-colors cursor-pointer ${
                      focusTimetableMode
                        ? 'border-[#1A73E8] bg-[#1A73E8] text-white'
                        : 'border-[#DADCE0] bg-white text-[#202124] hover:bg-[#F1F3F4]'
                    }`}
                  >
                    {focusTimetableMode ? (
                      <>
                        <Minimize2 className="h-3 w-3" />
                        <span>Exit Focus</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="h-3 w-3 text-[#1A73E8]" />
                        <span>Focus Timetable</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* COMPACT CLASH RESOLUTION DRAWER (Visible when clashes exist) */}
              {activeClashes.length > 0 && (
                <div className="no-print shrink-0 rounded-lg border border-[#D93025] bg-[#FCE8E6] px-3 py-1.5 text-[11.5px] space-y-1">
                  {activeClashes.map((clash) => {
                    const isConfirmed = clash.is_confirmed && clash.severity === 'ERROR';
                    return (
                      <div
                        key={clash.clash_id}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-1.5">
                          {isConfirmed ? (
                            <AlertOctagon className="h-3.5 w-3.5 text-[#D93025] shrink-0" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-[#B06000] shrink-0" />
                          )}
                          <span className="font-bold text-[#A50E0E]">
                            {isConfirmed
                              ? `${clash.course_a_code} (${clash.course_a_slot}) clashes with ${clash.course_b_code} (${clash.course_b_slot}) on ${clash.day} ${clash.time_interval}`
                              : clash.explanation}
                          </span>
                        </div>

                        {(clashDrawerExpanded || activeClashes.length <= 2) &&
                          clash.suggested_alternatives.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="text-[10.5px] font-bold text-[#A50E0E]">
                                Switch to:
                              </span>
                              {clash.suggested_alternatives.slice(0, 3).map((alt) => {
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
                                    className="inline-flex items-center gap-1 rounded border border-[#188038] bg-white hover:bg-[#E6F4EA] px-1.5 py-0.5 text-[10px] font-bold text-[#137333] cursor-pointer"
                                  >
                                    <span>{alt.course_code}</span>
                                    <span>→</span>
                                    <span>{alt.faculty_name}</span>
                                    <span className="font-mono">
                                      ({alt.slot_combination}·{alt.venue})
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* MAIN TIMETABLE GRID CONTAINER (Fills Remaining Workspace Height) */}
              <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-[#DADCE0] bg-white shadow-2xs overflow-hidden print-surface">
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
                    setIsLeftCollapsed(false);
                    setFocusTimetableMode(false);
                  }}
                  onClickEmptyCell={() => {
                    // Clicking an empty cell keeps focus on the left selector
                  }}
                />
              </div>
            </section>
          </>
        )}
      </main>

      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className="no-print fixed bottom-3 right-3 z-50 flex items-center gap-1.5 rounded-lg bg-[#202124] px-3 py-1.5 text-[11.5px] font-medium text-white shadow-lg">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#81C995]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
