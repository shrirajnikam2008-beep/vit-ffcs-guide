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
  compact: boolean; // true = Compact Week (3 essential fields only), false = Detailed View (all 6 fields)
  onClick: () => void;
  onDragStartSection?: (section: CourseSection) => void;
  onDragEndSection?: () => void;
}

/**
 * Produces a clear, readable short title for Compact Week cards while keeping the full title in tooltips/modals/detailed view.
 */
function formatCompactCourseTitle(title: string): string {
  const t = (title || '').trim();
  const map: Record<string, string> = {
    'Data Structures and Algorithms': 'Data Structures & Algos',
    'Digital Logic Design and Computer Organization': 'Digital Logic & Comp Org',
    'Structured and Object-Oriented Programming': 'Structured & OOP',
    'Principles of Software Engineering': 'Software Engineering',
    'Database Information Systems': 'Database Info Systems',
    'Technical English Communication': 'Technical English',
    'Probability and Statistics': 'Probability & Statistics',
  };
  return map[t] || t;
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
  const compactTitle = formatCompactCourseTitle(section.course_title);

  // Full hover tooltip so all metadata is immediately inspectable on hover as well as click
  const tooltipText = [
    `${section.course_code} — ${section.course_title} (${section.course_type_code})`,
    `Faculty: ${section.faculty_name}`,
    `Venue: ${section.venue || 'TBA'}`,
    `Slot: ${slotDisplay} (Active Period: ${occurrence.slot_code}, ${occurrence.start_time}–${occurrence.end_time})`,
    hasConfirmedClash ? 'STATUS: CONFIRMED CLASH' : 'Status: Verified (No clash)',
  ].join('\n');

  // ==========================================================================
  // MODE 1: COMPACT WEEK (Default) — Strictly 3 Details: Course Name, Faculty Name, Location
  // ==========================================================================
  if (compact) {
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
        style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}
        title={tooltipText}
        className={`group relative w-full h-full flex flex-col justify-between text-left rounded-[7px] border border-l-[3px] px-[6px] py-[5px] transition-colors duration-100 cursor-pointer select-none ${
          hasConfirmedClash
            ? 'bg-[#FCE8E6] border-[#D93025] border-l-[#D93025] ring-1 ring-[#D93025]/40'
            : hasUnresolvedWarning
            ? 'bg-[#FEF7E0] border-[#F9AB00] border-l-[#F9AB00]'
            : `${colorStyle.bgLight} border-[#CBD5E1]/85 ${colorStyle.borderLeft} hover:border-[#1A73E8]`
        }`}
      >
        {/* 1. Course Name (10.5-11px semibold, wraps up to 2 lines cleanly) */}
        <div className="flex items-start justify-between gap-0.5">
          <div
            className={`line-clamp-2 text-[10.5px] font-bold leading-[1.2] ${
              hasConfirmedClash ? 'text-[#A50E0E]' : 'text-[#0F172A]'
            }`}
          >
            {compactTitle}
          </div>
          {(hasConfirmedClash || hasUnresolvedWarning || isLocked) && (
            <div className="shrink-0 flex items-center gap-0.5 pl-0.5">
              {isLocked && <Lock className="h-2.5 w-2.5 text-[#D97706]" />}
              {hasConfirmedClash && <AlertOctagon className="h-3 w-3 text-[#D93025]" />}
              {!hasConfirmedClash && hasUnresolvedWarning && (
                <AlertTriangle className="h-3 w-3 text-[#D97706]" />
              )}
            </div>
          )}
        </div>

        {/* 2. Faculty Name & 3. Location / Venue */}
        <div className="mt-1 space-y-[1px]">
          <div className="text-[10px] font-semibold leading-[1.15] text-[#1E293B] break-words">
            {section.faculty_name}
          </div>
          {showVenues && (
            <div
              className={`font-mono text-[10px] font-bold leading-[1.15] ${
                hasConfirmedClash ? 'text-[#D93025]' : colorStyle.textPrimaryLight
              }`}
            >
              {section.venue || 'TBA'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // MODE 2: DETAILED VIEW — Full Course Code, Type, Title, Faculty, Venue & Slot
  // ==========================================================================
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
      style={{ wordBreak: 'normal', overflowWrap: 'break-word' }}
      title={tooltipText}
      className={`group relative w-full h-full flex flex-col justify-between text-left rounded-[8px] border border-l-[4px] p-2.5 min-h-[132px] transition-all duration-150 cursor-pointer select-none ${
        hasConfirmedClash
          ? 'bg-[#FCE8E6] border-[#D93025] border-l-[#D93025] ring-1 ring-[#D93025]/40'
          : hasUnresolvedWarning
          ? 'bg-[#FEF7E0] border-[#F9AB00] border-l-[#F9AB00]'
          : `${colorStyle.bgLight} border-[#CBD5E1] ${colorStyle.borderLeft} hover:border-[#1A73E8]`
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-1.5 leading-none">
          <span
            className={`font-mono text-[12px] font-extrabold tracking-tight whitespace-nowrap ${
              hasConfirmedClash ? 'text-[#A50E0E]' : colorStyle.textPrimaryLight
            }`}
          >
            {section.course_code}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            {isLocked && <Lock className="h-3 w-3 text-[#D97706]" />}
            {hasConfirmedClash && <AlertOctagon className="h-3.5 w-3.5 text-[#D93025]" />}
            {!hasConfirmedClash && hasUnresolvedWarning && (
              <AlertTriangle className="h-3.5 w-3.5 text-[#D97706]" />
            )}
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-[9.5px] font-bold whitespace-nowrap ${
                hasConfirmedClash
                  ? 'bg-[#D93025] text-white'
                  : `${colorStyle.badgeBg} ${colorStyle.badgeText}`
              }`}
            >
              {section.course_type_code}
            </span>
          </div>
        </div>

        <div className="mt-1.5 text-[12px] font-bold leading-[1.25] text-[#0F172A]">
          {section.course_title}
        </div>
      </div>

      <div className="mt-2 pt-1.5 border-t border-slate-900/10 space-y-0.5 text-[10.5px] leading-[1.28] text-[#1E293B]">
        <div>
          <span className="text-[#475569] font-semibold">Faculty: </span>
          <span className="font-bold text-[#0F172A]">{section.faculty_name}</span>
        </div>
        {showVenues && (
          <div>
            <span className="text-[#475569] font-semibold">Venue: </span>
            <span className="font-mono font-bold text-[#0F172A]">{section.venue || 'TBA'}</span>
          </div>
        )}
        <div>
          <span className="text-[#475569] font-semibold">Slot: </span>
          <span
            className={`font-mono font-bold ${
                              hasConfirmedClash ? 'text-[#D93025]' : colorStyle.textPrimaryLight
            }`}
          >
            {slotDisplay}
          </span>
        </div>
      </div>
    </div>
  );
};
