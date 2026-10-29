import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieIcon,
  Grid,
  GitBranch,
  AlertOctagon,
  CheckCircle2,
} from 'lucide-react';
import { ClashReport, Course, CourseSection } from '../types/ffcs';

interface AnalyticsDiagramsPanelProps {
  courses: Course[];
  selectedSections: CourseSection[];
  clashReport: ClashReport | null;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const;

export const AnalyticsDiagramsPanel: React.FC<AnalyticsDiagramsPanelProps> = ({
  courses,
  selectedSections,
  clashReport,
}) => {
  // 1. Daily Distribution Chart Data (Theory vs Lab hours per day)
  const dailyChartData = useMemo(() => {
    return DAYS.map((day) => {
      let theoryPeriods = 0;
      let labPeriods = 0;
      for (const sec of selectedSections) {
        for (const occ of sec.parsed_slot?.occurrences ?? []) {
          if (occ.day === day) {
            if (sec.course_type_code === 'ELA' || occ.slot_category === 'LAB') {
              labPeriods += 1;
            } else {
              theoryPeriods += 1;
            }
          }
        }
      }
      return {
        day,
        Theory: theoryPeriods,
        Lab: labPeriods,
        Total: theoryPeriods + labPeriods,
      };
    });
  }, [selectedSections]);

  // 2. Credit Distribution by Curriculum Category
  const creditCategoryData = useMemo(() => {
    const courseMap = new Map<string, Course>();
    courses.forEach((c) => courseMap.set(c.course_code, c));

    const uniqueSelectedCodes = Array.from(
      new Set(selectedSections.map((s) => s.course_code))
    );
    const catTotals: Record<string, number> = {};
    for (const code of uniqueSelectedCodes) {
      const c = courseMap.get(code);
      if (!c) continue;
      const cat = c.curriculum_category || 'Other';
      catTotals[cat] = (catTotals[cat] || 0) + c.credits;
    }

    const palette: Record<string, string> = {
      PCC: '#1A73E8',
      UCC: '#188038',
      'Programme Elective': '#9334E6',
      'University Elective': '#F29900',
      Other: '#5F6368',
    };

    return Object.entries(catTotals).map(([name, credits]) => ({
      name,
      value: credits,
      color: palette[name] || '#1A73E8',
    }));
  }, [courses, selectedSections]);

  // 3. Weekly Timetable Heatmap Matrix (Day x Period 1..12 density)
  const heatmapMatrix = useMemo(() => {
    const mat: Record<string, Record<number, CourseSection[]>> = {};
    for (const d of DAYS) {
      mat[d] = {};
      for (let p = 1; p <= 12; p++) mat[d][p] = [];
    }
    for (const sec of selectedSections) {
      for (const occ of sec.parsed_slot?.occurrences ?? []) {
        if (mat[occ.day] && mat[occ.day][occ.period]) {
          mat[occ.day][occ.period].push(sec);
        }
      }
    }
    return mat;
  }, [selectedSections]);

  // 4. Course -> Faculty -> Section Relationship Tree
  const courseHierarchy = useMemo(() => {
    const grouped: Record<
      string,
      {
        courseCode: string;
        courseTitle: string;
        credits: number;
        components: CourseSection[];
      }
    > = {};
    for (const sec of selectedSections) {
      if (!grouped[sec.course_code]) {
        const cObj = courses.find((c) => c.course_code === sec.course_code);
        grouped[sec.course_code] = {
          courseCode: sec.course_code,
          courseTitle: sec.course_title,
          credits: cObj?.credits ?? 0,
          components: [],
        };
      }
      grouped[sec.course_code].components.push(sec);
    }
    return Object.values(grouped);
  }, [selectedSections, courses]);

  // 5. Confirmed Clashes for Clash Dependency & Timeline Diagram
  const confirmedClashes = useMemo(
    () =>
      (clashReport?.clashes || []).filter(
        (c) => c.is_confirmed && c.severity === 'ERROR'
      ),
    [clashReport]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* CHART 1: Daily Class Distribution (Theory vs Lab Periods) */}
      <div className="lg:col-span-4 rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-[#1A73E8]" />
            <h3 className="text-[14px] font-bold text-[#202124] dark:text-[#E3E3E3]">
              Daily Class Load (Periods/Day)
            </h3>
          </div>
          <span className="text-[11px] text-[#5F6368]">Theory vs. Lab</span>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyChartData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#5F6368' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#5F6368' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '10px',
                  border: '1px solid #DADCE0',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="Theory" stackId="a" fill="#1A73E8" radius={[0, 0, 4, 4]} />
              <Bar dataKey="Lab" stackId="a" fill="#E8710A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CHART 2: Credit Distribution by Curriculum Category */}
      <div className="lg:col-span-4 rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-[#188038]" />
            <h3 className="text-[14px] font-bold text-[#202124] dark:text-[#E3E3E3]">
              Credits by Curriculum Category
            </h3>
          </div>
          <span className="font-mono text-[12px] font-bold text-[#1A73E8]">
            {clashReport?.total_credits ?? 0} Cr Total
          </span>
        </div>

        {creditCategoryData.length === 0 ? (
          <div className="flex h-44 items-center justify-center text-[12px] text-[#5F6368]">
            Select courses to view credit breakdown.
          </div>
        ) : (
          <div className="flex items-center gap-3 h-44">
            <div className="h-full w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={creditCategoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={34}
                    outerRadius={60}
                    paddingAngle={3}
                  >
                    {creditCategoryData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val} Credits`, 'Credits']}
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #DADCE0',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-2 text-[12px]">
              {creditCategoryData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-[#202124] dark:text-[#E3E3E3]">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-[#5F6368]">
                    {item.value} Cr
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CHART 3: Weekly Class Density Heatmap */}
      <div className="lg:col-span-4 rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Grid className="h-4 w-4 text-[#9334E6]" />
            <h3 className="text-[14px] font-bold text-[#202124] dark:text-[#E3E3E3]">
              Weekly Slot Density Heatmap
            </h3>
          </div>
          <span className="text-[11px] text-[#5F6368]">P1–P12 Occupancy</span>
        </div>

        <div className="space-y-1.5">
          <div className="grid grid-cols-13 gap-1 text-[9px] font-mono text-center text-[#5F6368]">
            <div>Day</div>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((p) => (
              <div key={p}>P{p}</div>
            ))}
          </div>
          {DAYS.map((d) => (
            <div key={d} className="grid grid-cols-13 gap-1 items-center">
              <div className="text-[10px] font-bold text-[#5F6368]">{d}</div>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((p) => {
                const list = heatmapMatrix[d][p];
                const count = list.length;
                const isLab = list.some((s) => s.course_type_code === 'ELA');
                return (
                  <div
                    key={p}
                    title={
                      count === 0
                        ? `${d} P${p}: Free`
                        : `${d} P${p}: ${list.map((s) => `${s.course_code} (${s.slot_combination})`).join(', ')}`
                    }
                    className={`h-5 rounded-[4px] border transition-colors ${
                      count > 1
                        ? 'bg-[#D93025] border-[#A50E0E]'
                        : count === 1
                        ? isLab
                          ? 'bg-[#E8710A] border-[#B04100]'
                          : 'bg-[#1A73E8] border-[#1557B0]'
                        : 'bg-[#F1F3F4] dark:bg-[#282A2C] border-[#DADCE0]/60 dark:border-[#3C4043]'
                    }`}
                  />
                );
              })}
            </div>
          ))}
          <div className="pt-1 flex items-center justify-end gap-3 text-[10px] text-[#5F6368]">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#F1F3F4] border border-[#DADCE0]" /> Free
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#1A73E8]" /> Theory
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#E8710A]" /> Lab
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-xs bg-[#D93025]" /> Clash
            </span>
          </div>
        </div>
      </div>

      {/* DIAGRAM 4: Course -> Faculty -> Section Relationship Diagram */}
      <div className="lg:col-span-7 rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-[#1A73E8]" />
            <h3 className="text-[14px] font-bold text-[#202124] dark:text-[#E3E3E3]">
              Selected Course → Faculty → Component Mapping Diagram
            </h3>
          </div>
          <span className="text-[11px] text-[#5F6368]">
            {courseHierarchy.length} Active Courses
          </span>
        </div>

        {courseHierarchy.length === 0 ? (
          <div className="py-8 text-center text-[12px] text-[#5F6368]">
            No courses selected yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {courseHierarchy.map((node) => (
              <div
                key={node.courseCode}
                className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C]/50 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] font-bold text-[#1A73E8] dark:text-[#8AB4F8]">
                    {node.courseCode}
                  </span>
                  <span className="rounded bg-white dark:bg-[#1E1F20] px-1.5 py-0.5 text-[10px] font-semibold text-[#5F6368]">
                    {node.credits} Cr
                  </span>
                </div>
                <div className="truncate text-[12px] font-semibold text-[#202124] dark:text-[#E3E3E3]">
                  {node.courseTitle}
                </div>
                <div className="mt-2 space-y-1 border-l-2 border-[#1A73E8]/40 pl-2.5">
                  {node.components.map((comp) => (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between text-[11px] bg-white dark:bg-[#1E1F20] rounded-lg px-2 py-1 border border-[#DADCE0]/60 dark:border-[#3C4043]"
                    >
                      <span className="truncate font-medium text-[#202124] dark:text-[#E3E3E3]">
                        <strong className="text-[#1A73E8]">{comp.course_type_code}</strong> • {comp.faculty_name}
                      </span>
                      <span className="font-mono font-bold text-[#5F6368] shrink-0 ml-2">
                        {comp.slot_combination}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DIAGRAM 5: Clash Dependency & Overlapping Interval Timeline */}
      <div className="lg:col-span-5 rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-4 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertOctagon
              className={`h-4 w-4 ${
                confirmedClashes.length > 0 ? 'text-[#D93025]' : 'text-[#188038]'
              }`}
            />
            <h3 className="text-[14px] font-bold text-[#202124] dark:text-[#E3E3E3]">
              Clash Dependency & Interval Overlap Timeline
            </h3>
          </div>
          <span className="text-[11px] text-[#5F6368]">
            {confirmedClashes.length} Active Conflict(s)
          </span>
        </div>

        {confirmedClashes.length === 0 ? (
          <div className="flex h-44 flex-col items-center justify-center rounded-xl border border-[#188038]/25 bg-[#E6F4EA]/40 dark:bg-[#143321]/30 p-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-[#188038]" />
            <div className="mt-1.5 text-[13px] font-semibold text-[#137333] dark:text-[#81C995]">
              No Overlapping Time Intervals
            </div>
            <div className="mt-0.5 text-[11px] text-[#5F6368]">
              All scheduled lecture, tutorial, and lab blocks are mutually exclusive.
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {confirmedClashes.map((c) => (
              <div
                key={c.clash_id}
                className="rounded-xl border border-[#D93025]/40 bg-[#FCE8E6]/40 dark:bg-[#5C1E1B]/30 p-3 space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-[#D93025]">
                  <span>
                    {c.course_a_code} ({c.conflicting_slots[0]}) ↔ {c.course_b_code || 'Constraint'} ({c.conflicting_slots[1] || ''})
                  </span>
                  <span className="font-mono tabular-time">
                    {c.day} {c.time_interval}
                  </span>
                </div>

                {/* Visual Timeline Overlap Bar */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="w-16 font-mono font-bold truncate">{c.course_a_code}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-[#D93025]/25 overflow-hidden relative">
                      <div className="absolute inset-y-0 left-[15%] right-[15%] rounded-full bg-[#1A73E8]" />
                    </div>
                  </div>
                  {c.course_b_code && (
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="w-16 font-mono font-bold truncate">{c.course_b_code}</span>
                      <div className="flex-1 h-2.5 rounded-full bg-[#D93025]/25 overflow-hidden relative">
                        <div className="absolute inset-y-0 left-[15%] right-[15%] rounded-full bg-[#D93025]" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
