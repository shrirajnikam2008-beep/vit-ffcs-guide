import React from 'react';
import { Lock, AlertTriangle, AlertOctagon } from 'lucide-react';
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
      title={`${section.course_code} · ${section.course_type_code}\n${section.course_title}\nFaculty: ${section.faculty_name}\nVenue: ${section.venue} · Slot: ${slotDisplay} (${occurrence.slot_code}: ${occurrence.start_time}–${occurrence.end_time})`}
      className={`group relative w-full text-left rounded-[8px] border border-l-[3px] ${
        compact ? 'px-1.5 py-1' : 'p-2'
      } transition-colors duration-100 cursor-pointer select-none ${
        hasConfirmedClash
          ? 'bg-[#FCE8E6] border-[#D93025] border-l-[#D93025] ring-1 ring-[#D93025]/40'
          : hasUnresolvedWarning
          ? 'bg-[#FEF7E0] border-[#F9AB00] border-l-[#F9AB00]'
          : `${colorStyle.bgLight} border-[#DADCE0]/80 ${colorStyle.borderLeft} hover:border-[#1A73E8]`
      }`}
    >
      {/* Line 1: Course code · Course type (10-11px semibold) */}
      <div className="flex items-center justify-between gap-1 leading-tight">
        <span
          className={`truncate font-mono text-[10.5px] font-semibold ${
            hasConfirmedClash ? 'text-[#A50E0E]' : colorStyle.textPrimaryLight
          }`}
        >
          {section.course_code} <span className="opacity-65">·</span> {section.course_type_code}
        </span>

        <div className="flex items-center gap-0.5 shrink-0">
          {isLocked && <Lock className="h-2.5 w-2.5 text-[#F29900]" />}
          {hasConfirmedClash && <AlertOctagon className="h-3 w-3 text-[#D93025]" />}
          {!hasConfirmedClash && hasUnresolvedWarning && (
            <AlertTriangle className="h-3 w-3 text-[#F9AB00]" />
          )}
        </div>
      </div>

      {/* Line 2: Course title (11-12px) */}
      <div
        className={`mt-0.5 ${
          compact ? 'truncate text-[11px]' : 'line-clamp-2 text-[11.5px]'
        } font-medium leading-[1.2] ${
          hasConfirmedClash ? 'text-[#A50E0E]' : 'text-[#202124]'
        }`}
      >
        {section.course_title}
      </div>

      {/* Line 3: Faculty name (10-11px) */}
      <div
        className={`mt-0.5 ${
          compact ? 'truncate text-[10px]' : 'break-words text-[11px]'
        } font-semibold leading-[1.2] text-[#3C4043]`}
      >
        {section.faculty_name}
      </div>

      {/* Line 4: Venue · Slot (9-10px) */}
      <div className="mt-0.5 flex items-center justify-between gap-1 font-mono text-[9.5px] leading-[1.15] text-[#5F6368]">
        <span className="truncate font-semibold text-[#202124]">
          {showVenues ? section.venue || 'TBA' : ''}
          {showVenues ? ' · ' : ''}
          <span className={hasConfirmedClash ? 'text-[#D93025]' : colorStyle.textPrimaryLight}>
            {slotDisplay}
          </span>
        </span>
      </div>
    </div>
  );
};
