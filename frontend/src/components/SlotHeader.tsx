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
      className={`border-b border-r border-[#DADCE0] bg-[#F8F9FC] px-1 py-1 text-center align-middle select-none ${
        fitToPage ? 'min-w-[74px]' : 'min-w-[136px] w-[136px]'
      }`}
    >
      <div className="text-[10px] font-bold uppercase tracking-tight text-[#202124] leading-tight">
        P{p.period}
      </div>
      <div className="text-[9.5px] font-semibold text-[#174EA6] tabular-time leading-tight">
        {p.theory_time}
      </div>
      <div className="text-[9px] font-medium text-[#8C3D00] tabular-time leading-tight">
        L: {p.lab_time}
      </div>
    </th>
  );

  return (
    <thead className="sticky top-0 z-20 bg-[#F8F9FC] shadow-[0_1px_0_0_#DADCE0]">
      <tr>
        <th className="sticky left-0 z-30 w-[46px] min-w-[46px] border-b border-r border-[#DADCE0] bg-[#F1F3F4] px-1 py-1 text-center text-[10px] font-bold uppercase tracking-tight text-[#5F6368] shadow-[1px_0_0_0_#DADCE0]">
          Day
        </th>

        {morningPeriods.map(renderPeriodHeaderCell)}

        <th className="w-[20px] min-w-[20px] border-b border-r border-[#DADCE0] bg-[#F1F3F4] px-0.5 py-1 text-center text-[9px] font-bold uppercase tracking-tighter text-[#5F6368]">
          <span title="Lunch Break">L</span>
        </th>

        {afternoonPeriods.map(renderPeriodHeaderCell)}
      </tr>
    </thead>
  );
};
