import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  CheckCircle2,
  Database,
} from 'lucide-react';
import { queryPlanningAssistant } from '../../lib/api';

interface PlanningAssistantPanelProps {
  selectedSectionIds: number[];
  lockedSectionIds: number[];
  campus: string;
  onApplyRecommendedSections: (ids: number[]) => void;
}

const EXAMPLE_QUESTIONS = [
  'Which DSA sections do not clash with my DBMS lab?',
  'List every faculty option for Digital Logic Design.',
  'Which probability and statistics sections fit my current timetable?',
  'Why is this section marked as conflicting?',
  'Suggest three clash-free timetables for my selected courses.',
  'Which alternatives can resolve my Tuesday clash?',
  'Show all courses with missing slot mappings.',
];

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  referencedCourses?: string[];
  recommendedSectionIds?: number[];
}

export const PlanningAssistantPanel: React.FC<PlanningAssistantPanelProps> = ({
  selectedSectionIds,
  lockedSectionIds,
  campus,
  onApplyRecommendedSections,
}) => {
  const [questionInput, setQuestionInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: `Welcome to the VIT FFCS Planning Assistant. Ask any question about compatible faculty sections, slot conflicts, or missing mappings — all answers are computed directly from your imported Winter Semester 2026–27 database and live clash engine.`,
    },
  ]);

  const handleAsk = async (qText: string) => {
    const trimmed = qText.trim();
    if (!trimmed || loading) return;

    const userMsg: MessageItem = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuestionInput('');
    setLoading(true);

    try {
      const res = await queryPlanningAssistant({
        question: trimmed,
        selected_section_ids: selectedSectionIds,
        locked_section_ids: lockedSectionIds,
        campus,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          text: res.answer_markdown,
          referencedCourses: res.referenced_courses,
          recommendedSectionIds: res.recommended_section_ids,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          text: 'Unable to query planning assistant right now. Please check backend connection.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] p-5 shadow-2xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DADCE0] dark:border-[#3C4043] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8F0FE] dark:bg-[#1E3A5F] text-[#1A73E8] dark:text-[#8AB4F8]">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold text-[#202124] dark:text-[#E3E3E3]">
              Interactive FFCS Planning Assistant
            </h3>
            <p className="text-[12px] text-[#5F6368] dark:text-[#9AA0A6]">
              Grounded strictly in imported VIT course allocations & verified slot rules
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F3F4] dark:bg-[#282A2C] px-2.5 py-1 text-[11px] font-medium text-[#5F6368]">
          <Database className="h-3 w-3 text-[#188038]" /> Live Database Grounded
        </span>
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => handleAsk(q)}
            className="rounded-full border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] hover:border-[#1A73E8] hover:bg-[#E8F0FE]/50 px-3 py-1 text-[11px] font-medium text-[#202124] dark:text-[#E3E3E3] transition-colors cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Conversation Feed */}
      <div className="max-h-72 overflow-y-auto space-y-2.5 rounded-xl bg-[#F8F9FC] dark:bg-[#282A2C]/40 p-3.5 border border-[#DADCE0]/70 dark:border-[#3C4043]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-xl p-3 text-[13px] ${
              m.role === 'user'
                ? 'ml-auto max-w-xl bg-[#1A73E8] text-white font-medium'
                : 'mr-auto max-w-3xl bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E3E3E3]'
            }`}
          >
            <div className="whitespace-pre-line leading-relaxed">{m.text}</div>
            {m.recommendedSectionIds && m.recommendedSectionIds.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#188038] flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {m.recommendedSectionIds.length} Recommended Section(s) Ready
                </span>
                <button
                  onClick={() => onApplyRecommendedSections(m.recommendedSectionIds!)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#1A73E8] hover:bg-[#1557B0] px-2.5 py-1 text-[11px] font-semibold text-white cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" /> Apply to Plan
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(questionInput);
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={questionInput}
          onChange={(e) => setQuestionInput(e.target.value)}
          placeholder="Ask about DSA sections, Tuesday clashes, DLD faculty, or missing slots..."
          className="flex-1 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FC] dark:bg-[#282A2C] px-3.5 py-2 text-[13px] text-[#202124] dark:text-[#E3E3E3] focus:bg-white focus:border-[#1A73E8] focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !questionInput.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A73E8] hover:bg-[#1557B0] px-4 py-2 text-[13px] font-semibold text-white cursor-pointer disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          <span>{loading ? 'Thinking...' : 'Ask'}</span>
        </button>
      </form>
    </div>
  );
};
