import React from 'react';
import { Calendar, MapPin } from 'lucide-react';

interface SemesterSelectorProps {
  semester: string;
  onChangeSemester: (sem: string) => void;
  campus: string;
  onChangeCampus: (campus: string) => void;
}

export const SemesterSelector: React.FC<SemesterSelectorProps> = ({
  semester,
  onChangeSemester,
  campus,
  onChangeCampus,
}) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-[10px] border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-2.5 py-1.5 text-[12px] font-medium text-[#202124] dark:text-[#E3E3E3]">
        <Calendar className="h-3.5 w-3.5 text-[#1A73E8] dark:text-[#8AB4F8]" />
        <select
          aria-label="Select Semester"
          value={semester}
          onChange={(e) => onChangeSemester(e.target.value)}
          className="bg-transparent font-medium text-[#202124] dark:text-[#E3E3E3] focus:outline-none cursor-pointer"
        >
          <option value="Winter Semester 2026–27">Winter Semester 2026–27</option>
          <option value="Fall Semester 2026–27">Fall Semester 2026–27</option>
          <option value="Weekend Intra Semester 2026–27">Weekend Intra 2026–27</option>
        </select>
      </div>

      <div className="flex items-center gap-1.5 rounded-[10px] border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-2.5 py-1.5 text-[12px] font-medium text-[#202124] dark:text-[#E3E3E3]">
        <MapPin className="h-3.5 w-3.5 text-[#188038] dark:text-[#81C995]" />
        <select
          aria-label="Select Campus"
          value={campus}
          onChange={(e) => onChangeCampus(e.target.value)}
          className="bg-transparent font-medium text-[#202124] dark:text-[#E3E3E3] focus:outline-none cursor-pointer"
        >
          <option value="vellore">VIT Vellore</option>
          <option value="chennai">VIT Chennai</option>
        </select>
      </div>
    </div>
  );
};
