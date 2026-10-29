import React from 'react';
import { PeriodHeader } from '../types/ffcs';

interface SlotHeaderProps {
  periodHeaders: PeriodHeader[];
  fitToPage: boolean;
}

export const SlotHeader: React.FC<SlotHeaderProps> = ({ periodHeaders, fitToPage }) => {
  const morningPeriods = periodHeaders.filter((p) => p.period <= 6);
  const afternoonPeriods = periodHeaders.filter((p) => p.period >= 7);

  const renderPeriodHeaderCell = (p: PeriodHeader) => (
    <th
      key={p.period}
      className={`border-b border-r border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-1.5 py-2 text-center align-middle select-none ${
        fitToPage ? 'min-w-[68px]' : 'min-w-[104px]'
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6]">
        {p.label || `Period ${p.period}`}
      </div>
      <div className="mt-0.5 rounded bg-[#E8F0FE] dark:bg-[#1E3A5F] px-1 py-0.5 text-[10px] font-semibold text-[#174EA6] dark:text-[#AECBFA] tabular-time">
        Th: {p.theory_time}
      </div>
      <div className="mt-0.5 rounded bg-[#FFF3E8] dark:bg-[#3A2414] px-1 py-0.5 text-[10px] font-medium text-[#8C3D00] dark:text-[#FCD0A1] tabular-time">
        Lab: {p.lab_time}
      </div>
    </th>
  );

  return (
    <thead className="sticky top-0 z-20 shadow-2xs">
      <tr>
        <th className="sticky left-0 z-30 w-16 min-w-[64px] border-b border-r border-[#DADCE0] dark:border-[#3C4043] bg-[#F1F3F4] dark:bg-[#1E1F20] px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6]">
          Day / Slot
        </th>

        {morningPeriods.map(renderPeriodHeaderCell)}

        <th className="w-8 min-w-[32px] border-b border-r border-[#DADCE0] dark:border-[#3C4043] bg-[#F1F3F4] dark:bg-[#282A2C] px-1 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-[#5F6368] dark:text-[#9AA0A6]">
          <span>LUNCH</span>
        </th>

        {afternoonPeriods.map(renderPeriodHeaderCell)}
      </tr>
    </thead>
  );
};
