import React, { useState, useMemo } from 'react';
import { Clock, Plus, RotateCcw, Search, CheckCircle2 } from 'lucide-react';
import { SlotOccurrence } from '../types/ffcs';
import { addCustomSlotMapping, resetSlotMappings } from '../lib/api';

interface SlotMappingEditorProps {
  slotMap: Record<string, SlotOccurrence[]>;
  campus: string;
  unresolvedSlots: string[];
  onRefreshBootstrap: () => void;
}

export const SlotMappingEditor: React.FC<SlotMappingEditorProps> = ({
  slotMap,
  campus,
  unresolvedSlots,
  onRefreshBootstrap,
}) => {
  const [slotCode, setSlotCode] = useState(unresolvedSlots[0] || 'G1');
  const [day, setDay] = useState('TUE');
  const [period, setPeriod] = useState(2);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('09:50');
  const [category, setCategory] = useState('THEORY');
  const [session, setSession] = useState('Morning');
  const [searchQuery, setSearchQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const flatRows = useMemo(() => {
    const list: SlotOccurrence[] = [];
    Object.values(slotMap).forEach((occs) => {
      occs.forEach((o) => list.push(o));
    });
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (o) =>
        o.slot_code.toLowerCase().includes(q) ||
        o.day.toLowerCase().includes(q) ||
        o.slot_category.toLowerCase().includes(q)
    );
  }, [slotMap, searchQuery]);

  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotCode.trim()) return;
    setBusy(true);
    try {
      await addCustomSlotMapping({
        campus,
        slot_code: slotCode,
        day,
        period,
        start_time: startTime,
        end_time: endTime,
        slot_category: category,
        session,
      });
      setStatusMsg(`Added verified day/time mapping for slot ${slotCode.toUpperCase()} (${day} P${period})`);
      onRefreshBootstrap();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const handleResetMappings = async () => {
    setBusy(true);
    try {
      await resetSlotMappings();
      setStatusMsg('Reset slot mappings to authoritative VIT defaults.');
      onRefreshBootstrap();
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Form Card: Map Unresolved or Custom Slot */}
      <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F0FE] dark:bg-[#1E3A5F] text-[#1A73E8] dark:text-[#8AB4F8]">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#202124] dark:text-[#E3E3E3]">
                Authoritative VIT Slot-to-Time Mapping Engine
              </h2>
              <p className="text-[12px] text-[#5F6368] dark:text-[#9AA0A6]">
                Configure official VIT slot intervals. The engine never guesses unmapped slots (such as G1, G2, or ANY SLOT).
              </p>
            </div>
          </div>

          <button
            onClick={handleResetMappings}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] hover:bg-[#F1F3F4] px-3 py-1.5 text-[12px] font-semibold text-[#5F6368] hover:text-[#202124] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset to Official VIT Defaults
          </button>
        </div>

        {statusMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-[#188038]/30 bg-[#E6F4EA] px-3.5 py-2 text-[12px] font-semibold text-[#137333]">
            <CheckCircle2 className="h-4 w-4" />
            <span>{statusMsg}</span>
          </div>
        )}

        <form onSubmit={handleAddMapping} className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-[#5F6368]">Slot Code</label>
            <input
              type="text"
              value={slotCode}
              onChange={(e) => setSlotCode(e.target.value.toUpperCase())}
              placeholder="e.g. G1"
              className="mt-1 w-full rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-2.5 py-1.5 font-mono text-[12px] font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#5F6368]">Weekday</label>
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-2.5 py-1.5 text-[12px]"
            >
              {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#5F6368]">Period (1–12)</label>
            <input
              type="number"
              min={1}
              max={12}
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-2.5 py-1.5 font-mono text-[12px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#5F6368]">Start Time</label>
            <input
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="09:00"
              className="mt-1 w-full rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-2.5 py-1.5 font-mono text-[12px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#5F6368]">End Time</label>
            <input
              type="text"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              placeholder="09:50"
              className="mt-1 w-full rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-2.5 py-1.5 font-mono text-[12px]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#5F6368]">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-2.5 py-1.5 text-[12px]"
            >
              <option value="THEORY">THEORY</option>
              <option value="TUTORIAL">TUTORIAL</option>
              <option value="LAB">LAB</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] px-3.5 py-2 text-[12px] font-semibold text-white cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Slot Rule
          </button>
        </form>
      </div>

      {/* Table of All Active Slot Mappings */}
      <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[14px] font-bold text-[#202124] dark:text-[#E3E3E3]">
            Active Slot Mapping Table ({flatRows.length} occurrences across {Object.keys(slotMap).length} slots)
          </div>
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-2 h-3.5 w-3.5 text-[#5F6368]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter slot (A1, TCC1, L31, THU)..."
              className="w-full rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] pl-8 pr-3 py-1 text-[12px]"
            />
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto border border-[#DADCE0] dark:border-[#3C4043] rounded-xl">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead className="sticky top-0 bg-[#F8F9FC] dark:bg-[#282A2C] border-b border-[#DADCE0] dark:border-[#3C4043] text-[11px] font-bold uppercase text-[#5F6368]">
              <tr>
                <th className="py-2 px-3">Slot Code</th>
                <th className="py-2 px-3">Day</th>
                <th className="py-2 px-3">Period</th>
                <th className="py-2 px-3">Time Interval</th>
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3">Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DADCE0] dark:divide-[#3C4043]">
              {flatRows.map((row, idx) => (
                <tr key={`${row.slot_code}_${row.day}_${row.period}_${idx}`} className="hover:bg-[#F8F9FC] dark:hover:bg-[#282A2C]">
                  <td className="py-2 px-3 font-mono font-bold text-[#1A73E8] dark:text-[#8AB4F8]">
                    {row.slot_code}
                  </td>
                  <td className="py-2 px-3 font-semibold">{row.day}</td>
                  <td className="py-2 px-3 font-mono">P{row.period}</td>
                  <td className="py-2 px-3 font-mono tabular-time">
                    {row.start_time} – {row.end_time}
                  </td>
                  <td className="py-2 px-3">
                    <span className="rounded bg-[#F1F3F4] dark:bg-[#3C4043] px-2 py-0.5 text-[10px] font-semibold">
                      {row.slot_category}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-[#5F6368]">{row.session}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
