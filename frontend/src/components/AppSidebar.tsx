import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Calendar,
  AlertTriangle,
  Layers,
  FileSpreadsheet,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export type NavSectionId =
  | 'dashboard'
  | 'courses'
  | 'faculty'
  | 'timetable'
  | 'clashes'
  | 'backups'
  | 'import'
  | 'slots'
  | 'settings';

interface AppSidebarProps {
  activeNav: NavSectionId;
  onSelectNav: (nav: NavSectionId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  confirmedClashCount: number;
  unresolvedSlotCount: number;
  backupFilledCount: number;
  onOpenAiRecommender: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeNav,
  onSelectNav,
  collapsed,
  onToggleCollapse,
  confirmedClashCount,
  unresolvedSlotCount,
  backupFilledCount,
  onOpenAiRecommender,
}) => {
  const navItems: Array<{
    id: NavSectionId;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: string | number;
    badgeTone?: 'error' | 'warning' | 'blue';
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'timetable',
      label: 'Timetable Builder',
      icon: Calendar,
    },
    {
      id: 'courses',
      label: 'Course Explorer',
      icon: BookOpen,
    },
    {
      id: 'faculty',
      label: 'Faculty Explorer',
      icon: Users,
    },
    {
      id: 'clashes',
      label: 'Clash Checker',
      icon: AlertTriangle,
      badge: confirmedClashCount > 0 ? confirmedClashCount : undefined,
      badgeTone: 'error',
    },
    {
      id: 'backups',
      label: 'Backup Timetables',
      icon: Layers,
      badge: backupFilledCount > 0 ? `${backupFilledCount}/3` : undefined,
      badgeTone: 'blue',
    },
    {
      id: 'import',
      label: 'Import Course Data',
      icon: FileSpreadsheet,
    },
    {
      id: 'slots',
      label: 'Slot Mapping',
      icon: Clock,
      badge: unresolvedSlotCount > 0 ? unresolvedSlotCount : undefined,
      badgeTone: 'warning',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside
      aria-label="Main Sidebar Navigation"
      className={`no-print sticky top-0 h-screen shrink-0 border-r border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] flex flex-col justify-between transition-all duration-200 select-none ${
        collapsed ? 'w-[72px]' : 'w-[248px]'
      }`}
    >
      {/* Top Brand Header */}
      <div className="p-3">
        <div
          className={`flex items-center ${
            collapsed ? 'justify-center' : 'justify-between'
          } px-2 py-2`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1A73E8] text-white shadow-xs">
              <Calendar className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-[15px] font-bold tracking-tight text-[#202124] dark:text-[#E3E3E3]">
                  VIT FFCS Guide
                </div>
                <div className="truncate text-[11px] font-medium text-[#5F6368] dark:text-[#9AA0A6]">
                  Winter 2026–27 Planner
                </div>
              </div>
            )}
          </div>

          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              title="Collapse sidebar"
              className="rounded-lg p-1.5 text-[#5F6368] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Prominent Quick AI Generator Action */}
        <div className="mt-2 px-1">
          <button
            onClick={onOpenAiRecommender}
            title="Generate Best Timetable using AI Optimizer"
            className={`w-full flex items-center ${
              collapsed ? 'justify-center px-0 py-2.5' : 'justify-start gap-2.5 px-3.5 py-2.5'
            } rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] text-white font-semibold text-[13px] shadow-xs transition-all duration-150 cursor-pointer`}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">Auto-Generate Plan</span>}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="mt-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectNav(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center ${
                  collapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'
                } rounded-xl text-[13px] font-medium transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#E8F0FE] dark:bg-[#1E3A5F] text-[#1A73E8] dark:text-[#8AB4F8] font-semibold'
                    : 'text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] hover:text-[#202124] dark:hover:text-[#E3E3E3]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 ${
                      isActive
                        ? 'text-[#1A73E8] dark:text-[#8AB4F8]'
                        : 'text-[#5F6368] dark:text-[#9AA0A6]'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!collapsed && item.badge !== undefined && (
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-time ${
                      item.badgeTone === 'error'
                        ? 'bg-[#FCE8E6] text-[#D93025] dark:bg-[#5C1E1B] dark:text-[#F28B82]'
                        : item.badgeTone === 'warning'
                        ? 'bg-[#FEF7E0] text-[#B06000] dark:bg-[#4A3810] dark:text-[#FDD663]'
                        : 'bg-[#D2E3FC] text-[#174EA6] dark:bg-[#172B4D] dark:text-[#AECBFA]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer / Expand Button */}
      <div className="p-3 border-t border-[#DADCE0] dark:border-[#3C4043]">
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            title="Expand sidebar"
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-[#5F6368] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <div className="rounded-xl bg-[#F8F9FC] dark:bg-[#282A2C] p-2.5 border border-[#DADCE0]/70 dark:border-[#3C4043]">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#202124] dark:text-[#E3E3E3]">
              <span>VTOP Slot Engine</span>
              <span className="inline-flex items-center gap-1 text-[#188038] dark:text-[#81C995]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#188038]" /> Verified
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
              3,158 No8AM Faculty Indexed
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
