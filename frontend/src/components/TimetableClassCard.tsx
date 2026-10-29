import React from 'react';
import { Lock, AlertTriangle, AlertOctagon, GripVertical } from 'lucide-react';
import { CourseSection, SlotOccurrence } from '../types/ffcs';
import { getSubjectColorStyle } from '../lib/subjectColors';

interface TimetableClassCardProps {
  section: CourseSection;
  occurrence: SlotOccurrence;
  isLocked: boolean;
  hasConfirmedClash: boolean;
  hasUnresolvedWarning: boolean;
  showVenues: boolean;
  compact: boolean;
  onClick: () => void;
  onDragStartSection?: (section: CourseSection) => void;
  onDragEndSection?: () => void;
}

export const TimetableClassCard: React.FC<TimetableClassCardProps> = ({
  section,
  occurrence,
  isLocked,
  hasConfirmedClash,
  hasUnresolvedWarning,
  showVenues,
  compact,
  onClick,
  onDragStartSection,
  onDragEndSection,
}) => {
  const colorStyle = getSubjectColorStyle(
    section.course_code,
    section.course_title,
    section.course_type_code
  );

  return (
    <div
      draggable={!isLocked && Boolean(onDragStartSection)}
      onDragStart={(e) => {
        if (isLocked || !onDragStartSection) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('text/plain', String(section.id));
        onDragStartSection(section);
      }}
      onDragEnd={() => {
        if (onDragEndSection) onDragEndSection();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative w-full text-left rounded-[10px] border border-l-4 p-2 transition-all duration-150 cursor-pointer select-none ${
        hasConfirmedClash
          ? 'bg-[#FCE8E6] dark:bg-[#5C1E1B]/80 border-[#D93025] border-l-[#D93025] shadow-xs ring-1 ring-[#D93025]/40'
          : hasUnresolvedWarning
          ? 'bg-[#FEF7E0] dark:bg-[#36290C] border-[#F9AB00] border-l-[#F9AB00]'
          : `${colorStyle.bgLight} border-[#DADCE0]/70 dark:border-[#3C4043] ${colorStyle.borderLeft} hover:shadow-md hover:-translate-y-[1px]`
      }`}
    >
      {/* Top Row: Slot badge + Course Code + Status icons */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          {!isLocked && onDragStartSection && (
            <GripVertical className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60 text-[#5F6368] cursor-grab" />
          )}
          <span
            className={`rounded px-1.5 py-0.2 text-[10px] font-bold font-mono ${
              hasConfirmedClash
                ? 'bg-[#D93025] text-white'
                : `${colorStyle.badgeBg} ${colorStyle.badgeText}`
            }`}
          >
            {occurrence.slot_code}
          </span>
          <span
            className={`truncate font-mono text-[12px] font-bold ${
              hasConfirmedClash ? 'text-[#A50E0E] dark:text-[#F28B82]' : colorStyle.textPrimaryLight
            }`}
          >
            {section.course_code}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="rounded bg-white/80 dark:bg-black/30 px-1 py-0.2 text-[9px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">
            {section.course_type_code}
          </span>
          {isLocked && (
            <span title="Locked section">
              <Lock className="h-3 w-3 text-[#F29900] dark:text-[#FDD663]" />
            </span>
          )}
          {hasConfirmedClash && (
            <span title="Confirmed Timetable Clash">
              <AlertOctagon className="h-3.5 w-3.5 text-[#D93025] dark:text-[#F28B82] animate-pulse" />
            </span>
          )}
          {!hasConfirmedClash && hasUnresolvedWarning && (
            <span title="Unverified Slot Mapping">
              <AlertTriangle className="h-3.5 w-3.5 text-[#F9AB00]" />
            </span>
          )}
        </div>
      </div>

      {/* Course Title */}
      <div
        className={`mt-1 line-clamp-1 text-[12px] font-semibold leading-snug ${
          hasConfirmedClash ? 'text-[#A50E0E] dark:text-[#F28B82]' : 'text-[#202124] dark:text-[#E3E3E3]'
        }`}
        title={section.course_title}
      >
        {section.course_title}
      </div>

      {/* Faculty Name */}
      <div
        className="mt-0.5 truncate text-[11px] font-medium text-[#5F6368] dark:text-[#9AA0A6]"
        title={section.faculty_name}
      >
        {section.faculty_name}
      </div>

      {/* Bottom Row: Time & Venue */}
      {!compact && (
        <div className="mt-1 flex items-center justify-between gap-1 text-[10px] text-[#5F6368] dark:text-[#9AA0A6] tabular-time">
          <span>
            {occurrence.start_time}–{occurrence.end_time}
          </span>
          {showVenues && (
            <span className="truncate font-mono font-semibold text-[#202124]/80 dark:text-[#E3E3E3]/80">
              {section.venue}
            </span>
          )}
        </div>
      )}

      {/* Explicit Clash Badge if conflicting */}
      {hasConfirmedClash && (
        <div className="mt-1 rounded bg-[#D93025] px-1.5 py-0.5 text-center text-[9px] font-bold uppercase tracking-wider text-white">
          Clash Detected
        </div>
      )}
    </div>
  );
};
