import React from 'react';
import { PeriodHeader } from '../types/ffcs';

interface SlotHeaderProps {
  periodHeaders: PeriodHeader[];
  fitToPage: boolean; // true = Compact Week (fits 100% on laptop screen), false = Detailed View
}

export const SlotHeader: React.FC<SlotHeaderProps> = ({ periodHeaders, fitToPage }) => {
  const morningPeriods = periodHeaders.filter((p) => p.period <= 6);
  const afternoonPeriods = periodHeaders.filter((p) => p.period >= 7);

  const renderPeriodHeaderCell = (p: PeriodHeader) => (
    <th
      key={p.period}
      className={`border-b border-r border-[#CBD5E1] bg-[#F8FAFC] text-center align-middle select-none whitespace-nowrap ${
        fitToPage ? 'px-0.5 py-1' : 'px-2 py-2 min-w-[176px] w-[176px]'
      }`}
    >
      <div className="text-[10px] font-extrabold uppercase tracking-tight text-[#0F172A] leading-tight">
        {fitToPage ? `P${p.period}` : `Period ${p.period}`}
      </div>
      <div className="text-[9px] font-semibold text-[#1E3A8A] tabular-time leading-tight">
        {p.theory_time}
      </div>
      <div className="text-[8.5px] font-medium text-[#78350F] tabular-time leading-tight">
        L: {p.lab_time}
      </div>
    </th>
  );

  return (
    <thead className="sticky top-0 z-20 bg-[#F8FAFC] shadow-[0_1px_0_0_#CBD5E1]">
      <tr>
        <th
          className={`sticky left-0 z-30 border-b border-r border-[#CBD5E1] bg-[#F1F5F9] text-center font-extrabold uppercase tracking-wider text-[#334155] whitespace-nowrap shadow-[1px_0_0_0_#CBD5E1] ${
            fitToPage ? 'w-[54px] min-w-[54px] px-1 py-1 text-[10px]' : 'w-[104px] min-w-[104px] px-2.5 py-2 text-[11px]'
          }`}
        >
          Day
        </th>

        {morningPeriods.map(renderPeriodHeaderCell)}

        <th
          className={`border-b border-r border-[#CBD5E1] bg-[#F1F5F9] text-center font-extrabold uppercase text-[#64748B] whitespace-nowrap ${
            fitToPage ? 'w-[22px] min-w-[22px] px-0.5 py-1 text-[8.5px]' : 'w-[42px] min-w-[42px] px-1 py-2 text-[9.5px]'
          }`}
        >
          <span title="Lunch Break (13:20–14:00)">{fitToPage ? 'LN' : 'LUNCH'}</span>
        </th>

        {afternoonPeriods.map(renderPeriodHeaderCell)}
      </tr>
    </thead>
  );
};
