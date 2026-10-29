import React, { useMemo } from 'react';
import { CourseSection } from '../types/ffcs';
import { getSubjectColorStyle } from '../lib/subjectColors';

interface TimetableLegendProps {
  selectedSections: CourseSection[];
  onSelectSection?: (sec: CourseSection) => void;
}

export const TimetableLegend: React.FC<TimetableLegendProps> = ({
  selectedSections,
  onSelectSection,
}) => {
  const groupedCourses = useMemo(() => {
    const map = new Map<
      string,
      {
        code: string;
        title: string;
        sections: CourseSection[];
      }
    >();
    for (const sec of selectedSections) {
      const existing = map.get(sec.course_code);
      if (!existing) {
        map.set(sec.course_code, {
          code: sec.course_code,
          title: sec.course_title,
          sections: [sec],
        });
      } else {
        existing.sections.push(sec);
      }
    }
    return Array.from(map.values());
  }, [selectedSections]);

  if (groupedCourses.length === 0) return null;

  return (
    <div className="shrink-0 border-t border-[#CBD5E1] bg-[#F8FAFC] px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#334155]">
          Registered Courses & Subject Color Legend ({groupedCourses.length} Courses)
        </span>
        <div className="flex items-center gap-3 text-[10.5px] font-medium text-[#64748B]">
          <span>
            <strong className="text-[#0F172A]">ETH</strong>: Embedded Theory
          </span>
          <span>
            <strong className="text-[#0F172A]">ELA</strong>: Embedded Lab
          </span>
          <span>
            <strong className="text-[#0F172A]">OC</strong>: Online Course
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {groupedCourses.map((group) => {
          const primarySec = group.sections[0];
          const color = getSubjectColorStyle(
            group.code,
            group.title,
            primarySec.course_type_code
          );

          return (
            <button
              key={group.code}
              type="button"
              onClick={() => onSelectSection && onSelectSection(primarySec)}
              className={`inline-flex items-center gap-2 rounded-lg border border-l-4 px-2.5 py-1 text-left text-[11px] transition-shadow hover:shadow-xs cursor-pointer ${color.bgLight} border-[#CBD5E1] ${color.borderLeft}`}
            >
              <span className={`font-mono font-extrabold ${color.textPrimaryLight}`}>
                {group.code}
              </span>
              <span className="font-semibold text-[#0F172A]">{group.title}</span>
              <span className="text-[#64748B]">·</span>
              <span className="font-mono text-[10.5px] text-[#334155]">
                {group.sections
                  .map((s) => `${s.course_type_code}: ${s.slot_combination} (${s.venue})`)
                  .join(' | ')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
