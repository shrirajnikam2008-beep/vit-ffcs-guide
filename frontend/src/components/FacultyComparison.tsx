import React, { useEffect, useState } from 'react';
import {
  X,
  Scale,
  Star,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  Ban,
  ExternalLink,
  Link2,
  Search,
} from 'lucide-react';
import { Course, FacultyComparisonItem } from '../types/ffcs';
import { fetchFacultyComparison } from '../lib/api';

interface FacultyComparisonProps {
  courses: Course[];
  activeCourseCode: string | null;
  onChangeCourseCode?: (code: string) => void;
  isModal?: boolean;
  onClose?: () => void;
  selectedSectionIds: number[];
  lockedSectionIds: number[];
  preferredFaculty: string[];
  avoidedFaculty: string[];
  preferredSlots: string[];
  avoidedSlots: string[];
  campus: string;
  onSelectSectionId: (sectionId: number) => void;
  onSelectPair: (ethId: number, elaId: number) => void;
  onTogglePreferredFaculty: (name: string) => void;
  onToggleAvoidedFaculty: (name: string) => void;
}

export const FacultyComparison: React.FC<FacultyComparisonProps> = ({
  courses,
  activeCourseCode,
  onChangeCourseCode,
  isModal = false,
  onClose,
  selectedSectionIds,
  lockedSectionIds,
  preferredFaculty,
  avoidedFaculty,
  preferredSlots,
  avoidedSlots,
  campus,
  onSelectSectionId,
  onSelectPair,
  onTogglePreferredFaculty,
  onToggleAvoidedFaculty,
}) => {
  const effectiveCode = activeCourseCode || courses[0]?.course_code || 'BACSE104';
  const [items, setItems] = useState<FacultyComparisonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'ETH' | 'ELA' | 'OC'>('ALL');
  const [onlyCompatible, setOnlyCompatible] = useState(false);
  const [facultyQuery, setFacultyQuery] = useState('');

  useEffect(() => {
    if (!effectiveCode) return;
    setLoading(true);
    fetchFacultyComparison(effectiveCode, {
      selected_section_ids: selectedSectionIds,
      locked_section_ids: lockedSectionIds,
      preferred_faculty: preferredFaculty,
      avoided_faculty: avoidedFaculty,
      preferred_slots: preferredSlots,
      avoided_slots: avoidedSlots,
      session_preference: 'balanced',
      campus,
      allow_adjacent_lab_boundary: true,
    })
      .then((res) => setItems(res.comparisons))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [
    effectiveCode,
    selectedSectionIds,
    lockedSectionIds,
    preferredFaculty,
    avoidedFaculty,
    preferredSlots,
    avoidedSlots,
    campus,
  ]);

  if (isModal && !activeCourseCode) return null;

  const selectedSet = new Set(selectedSectionIds);
  const prefSet = new Set(preferredFaculty.map((f) => f.toLowerCase()));
  const avoidSet = new Set(avoidedFaculty.map((f) => f.toLowerCase()));
  const currentCourse = courses.find((c) => c.course_code === effectiveCode);

  const filteredItems = items.filter((item) => {
    if (filterType !== 'ALL' && item.course_type_code !== filterType) return false;
    if (onlyCompatible && !item.is_compatible) return false;
    if (facultyQuery.trim()) {
      const q = facultyQuery.trim().toLowerCase();
      if (
        !item.faculty_name.toLowerCase().includes(q) &&
        !item.slot_combination.toLowerCase().includes(q) &&
        !item.venue.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const body = (
    <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] overflow-hidden shadow-xs flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="border-b border-[#DADCE0] dark:border-[#3C4043] px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F0FE] dark:bg-[#1E3A5F] text-[#1A73E8] dark:text-[#8AB4F8]">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[#202124] dark:text-[#E3E3E3]">
              Faculty Explorer & Side-by-Side Comparison
            </h2>
            <p className="text-[12px] text-[#5F6368] dark:text-[#9AA0A6]">
              Ranked by live timetable compatibility, ETH+ELA lab pairing, and verified no8am.site reviews.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onChangeCourseCode && (
            <select
              aria-label="Select Course to Compare Faculty"
              value={effectiveCode}
              onChange={(e) => onChangeCourseCode(e.target.value)}
              className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-3 py-1.5 text-[13px] font-semibold text-[#202124] dark:text-[#E3E3E3] focus:outline-none cursor-pointer"
            >
              {courses.map((c) => (
                <option key={c.course_code} value={c.course_code}>
                  {c.course_code} — {c.course_title}
                </option>
              ))}
            </select>
          )}
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-[#5F6368] hover:bg-[#F1F3F4] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="border-b border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/50 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'ETH', 'ELA', 'OC'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-lg px-3 py-1 text-[12px] font-semibold transition-colors cursor-pointer ${
                filterType === t
                  ? 'bg-[#1A73E8] text-white'
                  : 'border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] text-[#5F6368] hover:text-[#202124]'
              }`}
            >
              {t === 'ALL' ? 'All Components' : t === 'ETH' ? 'Theory (ETH)' : t === 'ELA' ? 'Lab (ELA)' : 'Online (OC)'}
            </button>
          ))}

          <button
            onClick={() => setOnlyCompatible((v) => !v)}
            className={`rounded-lg border px-3 py-1 text-[12px] font-semibold transition-colors cursor-pointer ${
              onlyCompatible
                ? 'border-[#188038] bg-[#E6F4EA] text-[#137333]'
                : 'border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] text-[#5F6368]'
            }`}
          >
            Clash-Free Only
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-2 h-3.5 w-3.5 text-[#5F6368]" />
          <input
            type="text"
            value={facultyQuery}
            onChange={(e) => setFacultyQuery(e.target.value)}
            placeholder="Search professor, slot, or room..."
            className="w-full rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] pl-8 pr-3 py-1 text-[12px] text-[#202124] dark:text-[#E3E3E3] focus:border-[#1A73E8] focus:outline-none"
          />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="py-12 text-center text-[13px] text-[#5F6368]">
            Evaluating faculty slot compatibility for {currentCourse?.course_title}...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-[#5F6368]">
            No faculty offerings match the selected filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredItems.map((item) => {
              const isSelected = selectedSet.has(item.section_id);
              const isPref = prefSet.has(item.faculty_name.toLowerCase());
              const isAvoid = avoidSet.has(item.faculty_name.toLowerCase());
              const rev = item.faculty_review;

              return (
                <div
                  key={item.section_id}
                  className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                    isSelected
                      ? 'border-[#1A73E8] bg-[#E8F0FE]/40 dark:bg-[#1E3A5F]/40 ring-1 ring-[#1A73E8]'
                      : item.is_compatible
                      ? 'border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] hover:shadow-md'
                      : 'border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/40 opacity-80'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[15px] font-bold text-[#202124] dark:text-[#E3E3E3]">
                            {item.faculty_name}
                          </span>
                          <span className="rounded-md bg-[#E8F0FE] dark:bg-[#1E3A5F] px-2 py-0.5 text-[11px] font-bold text-[#1A73E8] dark:text-[#8AB4F8]">
                            {item.course_type_code}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 font-mono text-[12px]">
                          <span className="font-bold text-[#1A73E8] dark:text-[#8AB4F8]">
                            {item.slot_combination}
                          </span>
                          <span className="text-[#5F6368]">•</span>
                          <span className="font-semibold text-[#202124] dark:text-[#E3E3E3]">
                            {item.venue}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            item.is_compatible
                              ? 'bg-[#E6F4EA] text-[#188038]'
                              : 'bg-[#FCE8E6] text-[#D93025]'
                          }`}
                        >
                          {item.is_compatible ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> Fit {Math.round(item.score)}
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3 w-3" /> Clashes
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Verified no8am.site Review Box */}
                    <div className="mt-2.5 rounded-xl bg-[#F8F9FC] dark:bg-[#282A2C] px-3 py-2 text-[11px] flex items-center justify-between gap-2">
                      {rev && rev.total_reviews > 0 ? (
                        <div className="flex items-center gap-2 text-[#202124] dark:text-[#E3E3E3]">
                          <span className="inline-flex items-center gap-1 font-bold text-[#B06000]">
                            <Star className="h-3.5 w-3.5 fill-[#F9AB00] text-[#F9AB00]" />
                            {rev.avg_rating}/5
                          </span>
                          <span className="text-[#5F6368]">
                            ({rev.total_reviews} student reviews on no8am.site)
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#5F6368] dark:text-[#9AA0A6]">
                          {rev?.no8am_id
                            ? `Verified on no8am.site (${rev.no8am_id}) — No student reviews submitted yet`
                            : 'Batch placeholder / No review profile'}
                        </span>
                      )}

                      {rev?.profile_url && (
                        <a
                          href={rev.profile_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 font-semibold text-[#1A73E8] hover:underline shrink-0"
                        >
                          no8am <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>

                    <p className="mt-2.5 text-[12px] leading-relaxed text-[#5F6368] dark:text-[#9AA0A6]">
                      {item.recommendation_reason}
                    </p>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#DADCE0] dark:border-[#3C4043] pt-2.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onTogglePreferredFaculty(item.faculty_name)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium cursor-pointer ${
                          isPref
                            ? 'border-[#188038] bg-[#E6F4EA] text-[#188038] font-semibold'
                            : 'border-[#DADCE0] dark:border-[#3C4043] text-[#5F6368] hover:bg-[#F1F3F4]'
                        }`}
                      >
                        <ThumbsUp className="h-3 w-3" /> Prefer
                      </button>
                      <button
                        onClick={() => onToggleAvoidedFaculty(item.faculty_name)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium cursor-pointer ${
                          isAvoid
                            ? 'border-[#D93025] bg-[#FCE8E6] text-[#D93025] font-semibold'
                            : 'border-[#DADCE0] dark:border-[#3C4043] text-[#5F6368] hover:bg-[#F1F3F4]'
                        }`}
                      >
                        <Ban className="h-3 w-3" /> Avoid
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.same_faculty_complement_ids.length > 0 && item.course_type_code === 'ETH' && (
                        <button
                          onClick={() =>
                            onSelectPair(item.section_id, item.same_faculty_complement_ids[0])
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-[#1A73E8] bg-[#E8F0FE] dark:bg-[#1E3A5F] px-2.5 py-1 text-[11px] font-semibold text-[#1A73E8] dark:text-[#8AB4F8] hover:bg-[#D2E3FC] cursor-pointer"
                        >
                          <Link2 className="h-3 w-3" /> Select ETH + Lab Pair
                        </button>
                      )}

                      <button
                        onClick={() => onSelectSectionId(item.section_id)}
                        className={`rounded-lg px-3 py-1 text-[12px] font-semibold transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#188038] text-white'
                            : 'bg-[#1A73E8] hover:bg-[#1557B0] text-white'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select Section'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (!isModal) return body;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        {body}
      </div>
    </div>
  );
};
