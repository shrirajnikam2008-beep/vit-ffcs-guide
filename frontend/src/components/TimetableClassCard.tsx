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

  // Show full slot combination (e.g., L39+L40 or A1+TA1) and active occurrence slot if different
  const slotDisplay = section.slot_combination || occurrence.slot_code;

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
      title={`${section.course_code} — ${section.course_title}\nFaculty: ${section.faculty_name}\nVenue: ${section.venue} • Slot: ${section.slot_combination} (${occurrence.slot_code}: ${occurrence.start_time}–${occurrence.end_time})`}
      className={`group relative w-full text-left rounded-[10px] border border-l-4 ${
        compact ? 'p-2' : 'p-2.5'
      } transition-all duration-150 cursor-pointer select-none ${
        hasConfirmedClash
          ? 'bg-[#FCE8E6] dark:bg-[#5C1E1B]/80 border-[#D93025] border-l-[#D93025] shadow-xs ring-1 ring-[#D93025]/40'
          : hasUnresolvedWarning
          ? 'bg-[#FEF7E0] dark:bg-[#36290C] border-[#F9AB00] border-l-[#F9AB00]'
          : `${colorStyle.bgLight} border-[#DADCE0] dark:border-[#3C4043] ${colorStyle.borderLeft} hover:shadow-md hover:-translate-y-[1px]`
      }`}
    >
      {/* Line 1: Course Code + Component Type Badge */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 min-w-0">
          {!isLocked && onDragStartSection && (
            <GripVertical className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-60 text-[#5F6368] cursor-grab" />
          )}
          <span
            className={`font-mono text-[12.5px] font-extrabold tracking-tight ${
              hasConfirmedClash
                ? 'text-[#A50E0E] dark:text-[#F28B82]'
                : colorStyle.textPrimaryLight
            }`}
          >
            {section.course_code}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
              hasConfirmedClash
                ? 'bg-[#D93025] text-white'
                : `${colorStyle.badgeBg} ${colorStyle.badgeText}`
            }`}
          >
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

      {/* Line 2: Course Title (wraps up to 2 lines in Detailed view, 1 line in Compact view) */}
      <div
        className={`mt-1 ${
          compact ? 'line-clamp-1 text-[11.5px]' : 'line-clamp-2 text-[12px]'
        } font-semibold leading-snug ${
          hasConfirmedClash
            ? 'text-[#A50E0E] dark:text-[#F28B82]'
            : 'text-[#202124] dark:text-[#E3E3E3]'
        }`}
      >
        {section.course_title}
      </div>

      {/* Line 3: Complete Faculty Name (Full width, wraps cleanly in Detailed view so never cut off) */}
      <div
        className={`mt-1 ${
          compact ? 'truncate text-[11px]' : 'break-words text-[11.5px]'
        } font-bold leading-tight text-[#202124] dark:text-[#E3E3E3]`}
      >
        {section.faculty_name}
      </div>

      {/* Line 4: Venue · Slot Identifier (Always visible: e.g. SJTG18 · L39+L40) */}
      <div className="mt-1.5 pt-1 border-t border-black/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-1 text-[11px]">
        {showVenues && (
          <span className="rounded bg-white/90 dark:bg-black/40 border border-black/10 px-1.5 py-0.5 font-mono text-[11px] font-extrabold text-[#202124] dark:text-[#E3E3E3]">
            {section.venue || 'TBA'}
          </span>
        )}
        <span
          className={`font-mono text-[10.5px] font-bold ${
            hasConfirmedClash
              ? 'text-[#D93025]'
              : colorStyle.textPrimaryLight
          }`}
        >
          {slotDisplay}
          {slotDisplay !== occurrence.slot_code ? ` (${occurrence.slot_code})` : ''}
        </span>
      </div>

      {/* Explicit Clash Badge if conflicting */}
      {hasConfirmedClash && (
        <div className="mt-1 rounded bg-[#D93025] px-1.5 py-0.5 text-center text-[9.5px] font-bold uppercase tracking-wider text-white">
          Clash Detected
        </div>
      )}
    </div>
  );
};
