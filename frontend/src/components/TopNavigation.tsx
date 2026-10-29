import React, { useState, useMemo } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  User,
  Undo2,
  Share2,
  AlertTriangle,
  CheckCircle2,
  FileWarning,
  X,
  GraduationCap,
} from 'lucide-react';
import { ClashReport, Course, ImportReport } from '../types/ffcs';
import { SemesterSelector } from './SemesterSelector';

interface TopNavigationProps {
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
  courses: Course[];
  clashReport: ClashReport | null;
  importReport: ImportReport | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  canUndo: boolean;
  onUndo: () => void;
  onOpenShareExport: () => void;
  onQuickSelectCourse: (courseCode: string) => void;
  onOpenClashChecker: () => void;
  onOpenImportAudit: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
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
  courses,
  clashReport,
  importReport,
  darkMode,
  onToggleDarkMode,
  canUndo,
  onUndo,
  onOpenShareExport,
  onQuickSelectCourse,
  onOpenClashChecker,
  onOpenImportAudit,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const confirmedClashes = clashReport?.confirmed_clash_count ?? 0;
  const unresolvedCount = clashReport?.possible_clash_count ?? 0;
  const importIssuesCount = importReport?.issues?.length ?? 0;
  const totalNotifications =
    confirmedClashes + unresolvedCount + (importIssuesCount > 0 ? 1 : 0);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return courses
      .filter(
        (c) =>
          c.course_code.toLowerCase().includes(q) ||
          c.course_title.toLowerCase().includes(q) ||
          c.sections.some(
            (s) =>
              s.faculty_name.toLowerCase().includes(q) ||
              s.slot_combination.toLowerCase().includes(q) ||
              s.venue.toLowerCase().includes(q)
          )
      )
      .slice(0, 6);
  }, [courses, searchQuery]);

  return (
    <header className="no-print sticky top-0 z-30 h-16 border-b border-[#DADCE0] dark:border-[#3C4043] bg-white/95 dark:bg-[#1E1F20]/95 backdrop-blur-xs px-4 lg:px-6 flex items-center justify-between gap-4">
      {/* Left: Semester & Campus Selector */}
      <div className="flex items-center gap-3">
        <SemesterSelector
          semester={semester}
          onChangeSemester={setSemester}
          campus={campus}
          onChangeCampus={setCampus}
        />
      </div>

      {/* Center: Global Search for Courses, Faculty, Slots & Venues */}
      <div className="relative flex-1 max-w-md">
        <div className="relative flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-[#5F6368] dark:text-[#9AA0A6]" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setShowSearchDropdown(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            placeholder="Search courses (BAITE102), faculty, slots (A1+TA1), or venue..."
            className="w-full rounded-[10px] border border-[#DADCE0] dark:border-[#3C4043] bg-[#F1F3F4] dark:bg-[#282A2C] focus:bg-white dark:focus:bg-[#1E1F20] pl-9 pr-8 py-1.5 text-[13px] text-[#202124] dark:text-[#E3E3E3] placeholder-[#5F6368] dark:placeholder-[#9AA0A6] focus:border-[#1A73E8] focus:ring-2 focus:ring-[#AECBFA] focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowSearchDropdown(false);
              }}
              className="absolute right-2.5 text-[#5F6368] hover:text-[#202124]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Popover */}
        {showSearchDropdown && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-11 z-50 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-2 shadow-lg">
            {searchResults.length === 0 ? (
              <div className="px-3 py-4 text-center text-[12px] text-[#5F6368]">
                No courses or faculty matching "{searchQuery}"
              </div>
            ) : (
              <div className="space-y-1">
                <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#5F6368]">
                  Matching Courses & Faculty
                </div>
                {searchResults.map((course) => (
                  <button
                    key={course.course_code}
                    onClick={() => {
                      onQuickSelectCourse(course.course_code);
                      setShowSearchDropdown(false);
                    }}
                    className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] transition-colors cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px] font-bold text-[#1A73E8] dark:text-[#8AB4F8]">
                          {course.course_code}
                        </span>
                        <span className="truncate text-[13px] font-medium text-[#202124] dark:text-[#E3E3E3]">
                          {course.course_title}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                        {course.sections.length} offerings • {course.credits} Credits •{' '}
                        {course.curriculum_category}
                      </div>
                    </div>
                    <span className="rounded-md bg-[#E8F0FE] dark:bg-[#1E3A5F] px-2 py-0.5 text-[11px] font-semibold text-[#1A73E8] dark:text-[#8AB4F8]">
                      Inspect
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls: Undo, Share/Export, Notifications, Theme Toggle, Profile */}
      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo last timetable change"
          className={`inline-flex items-center gap-1.5 rounded-[10px] border border-[#DADCE0] dark:border-[#3C4043] px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
            canUndo
              ? 'bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E3E3E3] hover:bg-[#F1F3F4] cursor-pointer'
              : 'bg-[#F8F9FC] dark:bg-[#1E1F20] text-[#5F6368]/40 cursor-not-allowed'
          }`}
        >
          <Undo2 className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Undo</span>
        </button>

        <button
          onClick={onOpenShareExport}
          title="Share Timetable, Compare with Friend, or Export PDF/Excel"
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] hover:bg-[#F1F3F4] dark:hover:bg-[#3C4043] px-3 py-1.5 text-[12px] font-medium text-[#202124] dark:text-[#E3E3E3] transition-colors cursor-pointer"
        >
          <Share2 className="h-3.5 w-3.5 text-[#1A73E8] dark:text-[#8AB4F8]" />
          <span className="hidden sm:inline">Share & Export</span>
        </button>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications((prev) => !prev);
              setShowProfileMenu(false);
            }}
            aria-label="Notifications and Warnings"
            className="relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] hover:bg-[#F1F3F4] text-[#5F6368] dark:text-[#9AA0A6] transition-colors cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {totalNotifications > 0 && (
              <span
                className={`absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                  confirmedClashes > 0 ? 'bg-[#D93025]' : 'bg-[#F9AB00]'
                }`}
              >
                {totalNotifications}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#DADCE0] dark:border-[#3C4043] pb-2">
                <span className="text-[13px] font-semibold text-[#202124] dark:text-[#E3E3E3]">
                  System & Clash Notifications
                </span>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[#5F6368] hover:text-[#202124]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2.5 space-y-2 max-h-72 overflow-y-auto">
                {confirmedClashes > 0 ? (
                  <div className="rounded-xl border border-[#D93025]/30 bg-[#FCE8E6]/60 dark:bg-[#5C1E1B]/40 p-2.5">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-[#D93025] dark:text-[#F28B82]">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{confirmedClashes} Confirmed Timetable Clash(es)</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#5F6368] dark:text-[#E3E3E3]">
                      Overlapping time intervals detected in your active schedule.
                    </p>
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        onOpenClashChecker();
                      }}
                      className="mt-2 text-[11px] font-semibold text-[#1A73E8] hover:underline cursor-pointer"
                    >
                      Open Clash Checker & Resolve →
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#188038]/30 bg-[#E6F4EA]/60 dark:bg-[#143321]/40 p-2.5 flex items-center gap-2 text-[12px] text-[#137333] dark:text-[#81C995]">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Zero confirmed slot clashes in active timetable.</span>
                  </div>
                )}

                {importIssuesCount > 0 && (
                  <div className="rounded-xl border border-[#F9AB00]/40 bg-[#FEF7E0]/70 dark:bg-[#36290C]/50 p-2.5">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-[#B06000] dark:text-[#FDD663]">
                      <FileWarning className="h-4 w-4 shrink-0" />
                      <span>{importIssuesCount} Workbook Data Quality Notes</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                      Includes 25 cross-course lab rows & 2 courses missing faculty tables.
                    </p>
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        onOpenImportAudit();
                      }}
                      className="mt-1.5 text-[11px] font-semibold text-[#1A73E8] hover:underline cursor-pointer"
                    >
                      Inspect Import Audit Log →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Light / Dark Theme Toggle */}
        <button
          onClick={onToggleDarkMode}
          aria-label="Toggle Light or Dark Theme"
          title={darkMode ? 'Switch to Light Mode (Default)' : 'Switch to Dark Mode'}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] hover:bg-[#F1F3F4] text-[#5F6368] dark:text-[#E3E3E3] transition-colors cursor-pointer"
        >
          {darkMode ? <Sun className="h-4 w-4 text-[#F9AB00]" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Student Profile & Academic Settings Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowProfileMenu((prev) => !prev);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 rounded-[10px] border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] hover:bg-[#F1F3F4] px-2.5 py-1.5 text-left transition-colors cursor-pointer"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8F0FE] dark:bg-[#1E3A5F] text-[#1A73E8] dark:text-[#8AB4F8] text-[11px] font-bold">
              <User className="h-3.5 w-3.5" />
            </div>
            <div className="hidden md:block">
              <div className="text-[12px] font-semibold leading-none text-[#202124] dark:text-[#E3E3E3]">
                SCORE • IT
              </div>
              <div className="mt-0.5 text-[10px] text-[#5F6368] dark:text-[#9AA0A6] tabular-time">
                Target {targetCredits} Cr
              </div>
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-11 z-50 w-80 rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#DADCE0] dark:border-[#3C4043] pb-2.5">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-[#1A73E8]" />
                  <span className="text-[13px] font-semibold text-[#202124] dark:text-[#E3E3E3]">
                    Student Profile & Credit Limits
                  </span>
                </div>
                <button
                  onClick={() => setShowProfileMenu(false)}
                  className="text-[#5F6368] hover:text-[#202124]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-[#5F6368]">
                  Programme / Branch
                </label>
                <input
                  type="text"
                  value={programme}
                  onChange={(e) => setProgramme(e.target.value)}
                  className="w-full rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-2.5 py-1.5 text-[12px] text-[#202124] dark:text-[#E3E3E3]"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] font-semibold text-[#5F6368]">
                  Curriculum Code
                </label>
                <input
                  type="text"
                  value={curriculum}
                  onChange={(e) => setCurriculum(e.target.value)}
                  className="w-full rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-2.5 py-1.5 text-[12px] text-[#202124] dark:text-[#E3E3E3]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-[#5F6368]">Min Cr</label>
                  <input
                    type="number"
                    min={10}
                    max={27}
                    value={minCredits}
                    onChange={(e) => setMinCredits(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-2 py-1 text-[12px] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#5F6368]">Target Cr</label>
                  <input
                    type="number"
                    min={12}
                    max={27}
                    value={targetCredits}
                    onChange={(e) => setTargetCredits(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-2 py-1 text-[12px] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#5F6368]">Max Cr</label>
                  <input
                    type="number"
                    min={16}
                    max={30}
                    value={maxCredits}
                    onChange={(e) => setMaxCredits(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-2 py-1 text-[12px] font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
