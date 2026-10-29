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
} from 'lucide-react';
import { Course, FacultyComparisonItem } from '../../types/ffcs';
import { fetchFacultyComparison } from '../../lib/api';

interface FacultyComparisonModalProps {
  course: Course | null;
  selectedSectionIds: number[];
  lockedSectionIds: number[];
  preferredFaculty: string[];
  avoidedFaculty: string[];
  preferredSlots: string[];
  avoidedSlots: string[];
  sessionPreference: string;
  campus: string;
  onClose: () => void;
  onSelectSectionId: (sectionId: number) => void;
  onSelectPair: (ethId: number, elaId: number) => void;
  onTogglePreferredFaculty: (name: string) => void;
  onToggleAvoidedFaculty: (name: string) => void;
}

export const FacultyComparisonModal: React.FC<FacultyComparisonModalProps> = ({
  course,
  selectedSectionIds,
  lockedSectionIds,
  preferredFaculty,
  avoidedFaculty,
  preferredSlots,
  avoidedSlots,
  sessionPreference,
  campus,
  onClose,
  onSelectSectionId,
  onSelectPair,
  onTogglePreferredFaculty,
  onToggleAvoidedFaculty,
}) => {
  const [items, setItems] = useState<FacultyComparisonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'ETH' | 'ELA' | 'OC'>('ALL');
  const [onlyCompatible, setOnlyCompatible] = useState(false);

  useEffect(() => {
    if (!course) return;
    setLoading(true);
    fetchFacultyComparison(course.course_code, {
      selected_section_ids: selectedSectionIds,
      locked_section_ids: lockedSectionIds,
      preferred_faculty: preferredFaculty,
      avoided_faculty: avoidedFaculty,
      preferred_slots: preferredSlots,
      avoided_slots: avoidedSlots,
      session_preference: sessionPreference,
      campus,
      allow_adjacent_lab_boundary: true,
    })
      .then((res) => setItems(res.comparisons))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [
    course,
    selectedSectionIds,
    lockedSectionIds,
    preferredFaculty,
    avoidedFaculty,
    preferredSlots,
    avoidedSlots,
    sessionPreference,
    campus,
  ]);

  if (!course) return null;

  const selectedSet = new Set(selectedSectionIds);
  const filtered = items.filter((it) => {
    if (filterType !== 'ALL' && it.course_type_code !== filterType) return false;
    if (onlyCompatible && !it.is_compatible) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-950">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-indigo-400" />
              <span className="font-mono text-xs font-bold text-indigo-400">
                {course.course_code}
              </span>
              <span className="text-xs text-slate-400">• Faculty Comparison & Recommendations</span>
            </div>
            <h2 className="mt-0.5 text-base font-bold text-white">{course.course_title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/90 px-5 py-2.5 text-xs">
          <div className="flex items-center gap-1.5">
            {(['ALL', 'ETH', 'ELA', 'OC'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
                  filterType === t
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {t === 'ALL' ? 'All Components' : t}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyCompatible}
              onChange={(e) => setOnlyCompatible(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-indigo-600"
            />
            Show only clash-free sections
          </label>
        </div>

        {/* Comparison Cards */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Analyzing slot compatibility, lab pairings, and verified No8AM faculty metrics...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No matching faculty offerings found for this filter.
            </div>
          ) : (
            filtered.map((item) => {
              const isSelected = selectedSet.has(item.section_id);
              const rev = item.faculty_review;

              return (
                <div
                  key={item.section_id}
                  className={`rounded-xl border p-4 transition ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-950/30'
                      : item.is_compatible
                      ? 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                      : 'border-rose-900/40 bg-slate-950/40 opacity-75'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${
                            item.course_type_code === 'ELA'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-indigo-500/20 text-indigo-300'
                          }`}
                        >
                          {item.course_type_code}
                        </span>
                        <h3 className="text-sm font-bold text-white">{item.faculty_name}</h3>
                        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs font-bold text-indigo-300">
                          {item.slot_combination}
                        </span>
                        <span className="font-mono text-xs text-slate-300">
                          Venue: {item.venue} ({item.building})
                        </span>
                        <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400">
                          {item.session} Session
                        </span>
                      </div>

                      {/* Verified No8AM Review Info */}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                        {rev && rev.avg_rating !== null && rev.avg_rating !== undefined && rev.total_reviews > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-semibold text-amber-300">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {rev.avg_rating.toFixed(2)} / 5.0 ({rev.total_reviews} verified reviews on no8am.site)
                          </span>
                        ) : (
                          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                            Unrated on no8am.site (0 reviews — ratings never fabricated)
                          </span>
                        )}

                        {rev && (
                          <span className="text-[11px] text-slate-400">
                            FFCS Carts: <strong className="text-slate-200">{rev.cart_count}</strong> • Searches:{' '}
                            <strong className="text-slate-200">{rev.search_count}</strong>
                          </span>
                        )}

                        {rev?.profile_url && (
                          <a
                            href={rev.profile_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:underline"
                          >
                            no8am.site profile <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      {/* Transparent Recommendation Explanation */}
                      <div
                        className={`mt-2.5 flex items-start gap-2 rounded-lg p-2.5 text-xs ${
                          item.is_compatible
                            ? 'bg-emerald-950/30 border border-emerald-500/20 text-emerald-200'
                            : 'bg-rose-950/30 border border-rose-500/20 text-rose-200'
                        }`}
                      >
                        {item.is_compatible ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <span>{item.recommendation_reason}</span>
                      </div>
                    </div>

                    {/* Right Column: Score & Action Buttons */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400">
                          Fit Score
                        </span>
                        <div
                          className={`font-mono text-base font-bold ${
                            item.is_compatible ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {item.score}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onTogglePreferredFaculty(item.faculty_name)}
                          className={`rounded-lg border p-1.5 transition cursor-pointer ${
                            item.is_preferred_faculty
                              ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                              : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-emerald-300'
                          }`}
                          title="Prefer this faculty"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => onToggleAvoidedFaculty(item.faculty_name)}
                          className={`rounded-lg border p-1.5 transition cursor-pointer ${
                            item.is_avoided_faculty
                              ? 'border-rose-500/50 bg-rose-500/20 text-rose-300'
                              : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-rose-300'
                          }`}
                          title="Avoid this faculty"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>

                        {item.same_faculty_complement_ids.length > 0 && item.is_compatible && (
                          <button
                            onClick={() => {
                              const compId = item.same_faculty_complement_ids[0];
                              if (item.course_type_code === 'ETH') {
                                onSelectPair(item.section_id, compId);
                              } else {
                                onSelectPair(compId, item.section_id);
                              }
                              onClose();
                            }}
                            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition cursor-pointer"
                            title="Select both Theory (ETH) and Lab (ELA) with this same faculty"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Select ETH+ELA Pair
                          </button>
                        )}

                        <button
                          onClick={() => {
                            onSelectSectionId(item.section_id);
                          }}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-200 hover:bg-indigo-600 hover:text-white'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select Section'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
