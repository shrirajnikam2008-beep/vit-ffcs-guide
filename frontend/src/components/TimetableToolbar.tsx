import React, { useState } from 'react';
import {
  Grid,
  List,
  MapPin,
  Maximize2,
  Minimize2,
  Sun,
  Sunset,
  Layers,
  Filter,
  CalendarDays,
  Plus,
  RotateCcw,
  Printer,
  AlertTriangle,
} from 'lucide-react';

export type CalendarViewMode = 'day' | '3day' | 'week' | 'schedule' | 'slotlist';
export type SessionFilterMode = 'all' | 'morning' | 'evening';
export type ClashFilterMode = 'all' | 'no_clashes' | 'confirmed_clashes' | 'unresolved';

interface TimetableToolbarProps {
  viewMode: CalendarViewMode;
  onChangeViewMode: (v: CalendarViewMode) => void;
  showVenues: boolean;
  onToggleShowVenues: () => void;
  fitToPage: boolean;
  onToggleFitToPage: () => void;
  sessionFilter: SessionFilterMode;
  onChangeSessionFilter: (s: SessionFilterMode) => void;
  clashFilter: ClashFilterMode;
  onChangeClashFilter: (c: ClashFilterMode) => void;
  showSaturday: boolean;
  onToggleShowSaturday: () => void;
  focusedDay: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
  onChangeFocusedDay: (d: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT') => void;
  confirmedClashCount: number;
  onOpenAddCourseDrawer: () => void;
  onOpenClashDrawer: () => void;
  onClearActivePlan: () => void;
  onPrintTimetable: () => void;
}

export const TimetableToolbar: React.FC<TimetableToolbarProps> = ({
  viewMode,
  onChangeViewMode,
  showVenues,
  onToggleShowVenues,
  fitToPage,
  onToggleFitToPage,
  sessionFilter,
  onChangeSessionFilter,
  clashFilter,
  onChangeClashFilter,
  showSaturday,
  onToggleShowSaturday,
  focusedDay,
  onChangeFocusedDay,
  confirmedClashCount,
  onOpenAddCourseDrawer,
  onOpenClashDrawer,
  onClearActivePlan,
  onPrintTimetable,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="no-print border-b border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
      {/* Left: View Switcher (Day / 3-Day / Week / Schedule / Slot-List) */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          className="inline-flex rounded-[10px] border border-[#DADCE0] dark:border-[#3C4043] bg-[#F1F3F4] dark:bg-[#282A2C] p-0.5"
          role="group"
          aria-label="Timetable View Switcher"
        >
          {[
            { id: 'week', label: 'Week Grid', icon: Grid },
            { id: '3day', label: '3-Day', icon: CalendarDays },
            { id: 'day', label: 'Day', icon: CalendarDays },
            { id: 'schedule', label: 'Schedule', icon: List },
            { id: 'slotlist', label: 'Slot-List', icon: Layers },
          ].map((item) => {
            const Icon = item.icon;
            const active = viewMode === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeViewMode(item.id as CalendarViewMode)}
                className={`inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-[12px] font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-white dark:bg-[#1E1F20] text-[#1A73E8] dark:text-[#8AB4F8] shadow-2xs font-semibold'
                    : 'text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-[#E3E3E3]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Day selector when in Day or 3-Day mode */}
        {(viewMode === 'day' || viewMode === '3day') && (
          <div className="inline-flex items-center gap-1 rounded-[10px] border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-2 py-1">
            {(['MON', 'TUE', 'WED', 'THU', 'FRI', ...(showSaturday ? ['SAT' as const] : [])] as const).map(
              (d) => (
                <button
                  key={d}
                  onClick={() => onChangeFocusedDay(d)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                    focusedDay === d
                      ? 'bg-[#1A73E8] text-white'
                      : 'text-[#5F6368] hover:bg-[#E8F0FE] hover:text-[#1A73E8]'
                  }`}
                >
                  {d}
                </button>
              )
            )}
          </div>
        )}

        {/* Session Filter: Mixed / Morning Theory / Evening Theory */}
        <div
          className="inline-flex rounded-[10px] border border-[#DADCE0] dark:border-[#3C4043] bg-[#F1F3F4] dark:bg-[#282A2C] p-0.5"
          role="group"
          aria-label="Theory Session Filter"
        >
          <button
            onClick={() => onChangeSessionFilter('all')}
            className={`rounded-[8px] px-2.5 py-1 text-[12px] font-medium transition-all cursor-pointer ${
              sessionFilter === 'all'
                ? 'bg-white dark:bg-[#1E1F20] text-[#202124] dark:text-[#E3E3E3] shadow-2xs font-semibold'
                : 'text-[#5F6368] dark:text-[#9AA0A6]'
            }`}
          >
            Mixed
          </button>
          <button
            onClick={() => onChangeSessionFilter('morning')}
            title="Show Morning Theory (A1–G1) & afternoon labs"
            className={`inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1 text-[12px] font-medium transition-all cursor-pointer ${
              sessionFilter === 'morning'
                ? 'bg-white dark:bg-[#1E1F20] text-[#1A73E8] dark:text-[#8AB4F8] shadow-2xs font-semibold'
                : 'text-[#5F6368] dark:text-[#9AA0A6]'
            }`}
          >
            <Sun className="h-3 w-3" />
            <span>Morning Theory</span>
          </button>
          <button
            onClick={() => onChangeSessionFilter('evening')}
            title="Show Evening Theory (A2–G2) & morning labs"
            className={`inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1 text-[12px] font-medium transition-all cursor-pointer ${
              sessionFilter === 'evening'
                ? 'bg-white dark:bg-[#1E1F20] text-[#1A73E8] dark:text-[#8AB4F8] shadow-2xs font-semibold'
                : 'text-[#5F6368] dark:text-[#9AA0A6]'
            }`}
          >
            <Sunset className="h-3 w-3" />
            <span>Evening Theory</span>
          </button>
        </div>
      </div>

      {/* Right: Display Toggles, Clash Filter, Quick Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Clash Status Filter */}
        <div className="flex items-center gap-1.5 rounded-[10px] border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-2.5 py-1 text-[12px]">
          <Filter className="h-3.5 w-3.5 text-[#5F6368]" />
          <select
            aria-label="Filter timetable classes by clash state"
            value={clashFilter}
            onChange={(e) => onChangeClashFilter(e.target.value as ClashFilterMode)}
            className="bg-transparent text-[12px] font-medium text-[#202124] dark:text-[#E3E3E3] focus:outline-none cursor-pointer"
          >
            <option value="all">Show: All Classes</option>
            <option value="no_clashes">Show: Clash-Free Only</option>
            <option value="confirmed_clashes">Show: Confirmed Clashes</option>
            <option value="unresolved">Show: Unresolved Mappings</option>
          </select>
        </div>

        {/* Class Venues Toggle */}
        <button
          onClick={onToggleShowVenues}
          className={`inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer ${
            showVenues
              ? 'border-[#1A73E8]/40 bg-[#E8F0FE] dark:bg-[#1E3A5F] text-[#1A73E8] dark:text-[#8AB4F8]'
              : 'border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] text-[#5F6368]'
          }`}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span>Class Venues</span>
        </button>

        {/* Fit to Page Toggle */}
        <button
          onClick={onToggleFitToPage}
          title="Fit all 12 VIT periods onto screen without horizontal scrolling"
          className={`inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer ${
            fitToPage
              ? 'border-[#1A73E8]/40 bg-[#E8F0FE] dark:bg-[#1E3A5F] text-[#1A73E8] dark:text-[#8AB4F8]'
              : 'border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] text-[#5F6368]'
          }`}
        >
          {fitToPage ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          <span>Fit to Page</span>
        </button>

        {/* Saturday Toggle */}
        <button
          onClick={onToggleShowSaturday}
          className={`rounded-[10px] border px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer ${
            showSaturday
              ? 'border-[#1A73E8]/40 bg-[#E8F0FE] dark:bg-[#1E3A5F] text-[#1A73E8] dark:text-[#8AB4F8]'
              : 'border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] text-[#5F6368]'
          }`}
        >
          + Sat
        </button>

        {/* Clash Checker Button */}
        {confirmedClashCount > 0 && (
          <button
            onClick={onOpenClashDrawer}
            className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#FCE8E6] dark:bg-[#5C1E1B] border border-[#D93025]/40 px-2.5 py-1 text-[12px] font-semibold text-[#D93025] dark:text-[#F28B82] hover:bg-[#F9D2CE] transition-colors cursor-pointer"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{confirmedClashCount} Clash(es)</span>
          </button>
        )}

        {/* Quick Add Course Button */}
        <button
          onClick={onOpenAddCourseDrawer}
          className="inline-flex items-center gap-1 rounded-[10px] bg-[#1A73E8] hover:bg-[#1557B0] px-3 py-1.5 text-[12px] font-semibold text-white shadow-2xs transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add / Change Courses</span>
        </button>

        {/* Print Button */}
        <button
          onClick={onPrintTimetable}
          title="Print Timetable"
          className="rounded-[10px] border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-1.5 text-[#5F6368] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
        >
          <Printer className="h-4 w-4" />
        </button>

        {/* Clear / Reset with confirmation */}
        {confirmClear ? (
          <div className="flex items-center gap-1 rounded-[10px] border border-[#D93025] bg-[#FCE8E6] px-2 py-1 text-[11px]">
            <span className="font-semibold text-[#D93025]">Reset unlocked?</span>
            <button
              onClick={() => {
                onClearActivePlan();
                setConfirmClear(false);
              }}
              className="rounded bg-[#D93025] px-1.5 py-0.5 font-bold text-white cursor-pointer"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              className="px-1 text-[#5F6368] hover:text-[#202124] cursor-pointer"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClear(true)}
            title="Clear unlocked courses in active plan"
            className="rounded-[10px] border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-1.5 text-[#5F6368] hover:text-[#D93025] hover:bg-[#FCE8E6]/40 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
