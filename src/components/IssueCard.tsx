import React, { useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertOctagon,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Users,
  Send,
  ExternalLink,
} from 'lucide-react';
import { Issue } from '../types';

interface IssueCardProps {
  issue: Issue;
  onRefresh: () => void;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue, onRefresh }) => {
  const [officialNo, setOfficialNo] = useState(issue.official_no || '');
  const [isSavingOfficial, setIsSavingOfficial] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showLetters, setShowLetters] = useState(false);
  const [copiedLetter, setCopiedLetter] = useState<'en' | 'ta' | null>(null);

  const daysUnresolved = Math.max(
    0,
    Math.floor((Date.now() / 1000 - issue.first_ts) / 86400)
  );

  const votes = issue.votes || {};
  const notFixedVotes = (votes.not_fixed || 0) + (votes.temporary || 0);
  const fixedVotes = votes.fixed || 0;

  // Determine status and style
  let statusText = 'Reported';
  let statusClass = 'bg-gray-100 dark:bg-gray-800 text-[var(--mute)] border-[var(--line)]';

  if (issue.verified) {
    statusText = 'Community verified fixed';
    statusClass = 'bg-emerald-600 text-white border-emerald-600';
  } else if (issue.admin_closed && notFixedVotes > 0) {
    statusText = `Dept marked closed, but ${notFixedVotes} resident(s) say not fixed`;
    statusClass = 'bg-[#c8372d] text-white border-[#c8372d]';
  } else if (issue.admin_closed) {
    statusText = 'Department marked closed';
    statusClass = 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700';
  } else if (issue.official_no) {
    statusText = `Filed officially (${issue.official_no})`;
    statusClass = 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700';
  }

  // 4-step Timeline progress
  const timelineSteps = [
    'Reported',
    'Filed officially',
    'Department marked closed',
    'Community verified',
  ];

  let currentStepIdx = 0;
  if (issue.verified) {
    currentStepIdx = 3;
  } else if (issue.admin_closed) {
    currentStepIdx = 2;
  } else if (issue.official_no) {
    currentStepIdx = 1;
  }

  const handleSaveOfficialNo = async () => {
    setIsSavingOfficial(true);
    try {
      const res = await fetch('/api/official', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: issue.id,
          number: officialNo,
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingOfficial(false);
    }
  };

  const handleMarkClosedByDept = async () => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch('/api/official', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: issue.id,
          close: true,
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleVote = async (result: 'fixed' | 'not_fixed' | 'temporary') => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: issue.id,
          result,
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const copyText = (txt: string, type: 'en' | 'ta') => {
    navigator.clipboard.writeText(txt);
    setCopiedLetter(type);
    setTimeout(() => setCopiedLetter(null), 2500);
  };

  return (
    <article className="bg-[var(--card)] border-2 border-[var(--line)] rounded-xl overflow-hidden shadow-xs flex flex-col transition hover:shadow-md">
      {/* Plate Header */}
      {issue.verified ? (
        <div className="bg-[#1d7a4e] text-white px-4 py-3 flex items-center justify-between border-b-4 border-[#124d31]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-[#f2b705]" />
            <div>
              <div className="font-heading font-extrabold text-xl leading-tight">
                RESOLVED
              </div>
              <div className="text-xs text-emerald-100 font-semibold">
                Community confirmed in {daysUnresolved} days
              </div>
            </div>
          </div>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-mono font-bold">
            {issue.id}
          </span>
        </div>
      ) : (
        <div className="bg-[#f2b705] text-[#14232b] px-4 py-2.5 flex items-baseline justify-between border-b-4 border-[#14232b]">
          <div className="flex items-baseline gap-2">
            <span className="font-heading font-extrabold text-4xl sm:text-5xl tracking-tight leading-none">
              {daysUnresolved}
            </span>
            <span className="font-heading font-bold text-sm uppercase tracking-wide">
              day{daysUnresolved === 1 ? '' : 's'} unresolved
            </span>
          </div>
          <span className="text-xs font-mono font-bold bg-[#14232b] text-[#f2b705] px-2 py-0.5 rounded">
            {issue.id}
          </span>
        </div>
      )}

      {/* Card Content Body */}
      <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1">
        {/* Title & Metadata */}
        <div>
          <h3 className="font-heading font-bold text-lg text-[var(--ink)] capitalize leading-snug">
            {issue.category.replace('_', ' ')}: {issue.location}
          </h3>
          <div className="text-xs text-[var(--mute)] mt-1 flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-[var(--ink)]">{issue.id}</span>
            <span>&middot;</span>
            <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 px-1.5 py-0.2 rounded font-semibold">
              {issue.reports?.length || 1} resident reports
            </span>
            <span>&middot;</span>
            <span>{issue.dept}</span>
          </div>
        </div>

        {/* Status Tag */}
        <div>
          <span
            className={`inline-block text-xs font-bold px-2.5 py-1 rounded-md border ${statusClass}`}
          >
            {statusText}
          </span>
        </div>

        {/* 4-Step Timeline */}
        <div className="py-1">
          <ul className="pl-3.5 border-l-3 border-[var(--line)] text-xs space-y-1.5">
            {timelineSteps.map((step, idx) => {
              const isPassed = idx <= currentStepIdx;
              return (
                <li
                  key={idx}
                  className={`flex items-center gap-1.5 ${
                    isPassed
                      ? 'text-[var(--ink)] font-bold'
                      : 'text-[var(--mute)] opacity-60'
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                      isPassed
                        ? 'bg-[#0f4c5c] text-white'
                        : 'bg-[var(--line)] text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                  <span>{step}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Official Complaint Tracking Number Input */}
        <div className="pt-2 border-t border-[var(--line)]">
          <label className="block text-[11px] font-semibold text-[var(--mute)] uppercase mb-1">
            Official Govt Grievance No.
          </label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={officialNo}
              onChange={(e) => setOfficialNo(e.target.value)}
              placeholder="e.g. GCC-2024-8192 / MW-981"
              aria-label="Official complaint number"
              className="flex-1 min-w-0 bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded px-2.5 py-1.5 text-xs font-mono focus:border-[#f2b705] focus:outline-none"
            />
            <button
              onClick={handleSaveOfficialNo}
              disabled={isSavingOfficial}
              className="bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--ink)] border border-[var(--line)] rounded px-3 py-1.5 text-xs font-bold transition cursor-pointer disabled:opacity-50"
            >
              {isSavingOfficial ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Actions Row */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-semibold text-[var(--mute)] uppercase">
            Resident Accountability Actions:
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={handleMarkClosedByDept}
              disabled={isUpdatingStatus || issue.admin_closed}
              className={`text-xs px-2.5 py-1.5 rounded font-semibold border transition cursor-pointer disabled:opacity-50 ${
                issue.admin_closed
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300'
                  : 'bg-transparent text-[var(--ink)] border-[var(--line)] hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {issue.admin_closed ? 'Dept marked closed' : 'Dept closed it'}
            </button>

            <button
              onClick={() => handleVote('fixed')}
              disabled={isUpdatingStatus}
              className="text-xs px-3 py-1.5 rounded font-bold bg-[#1d7a4e] text-white hover:bg-[#155d3b] transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              <span>Fixed</span>
              {fixedVotes > 0 && <span className="bg-white/20 px-1 rounded text-[10px]">{fixedVotes}</span>}
            </button>

            <button
              onClick={() => handleVote('not_fixed')}
              disabled={isUpdatingStatus}
              className="text-xs px-2.5 py-1.5 rounded font-bold bg-[#c8372d] text-white hover:bg-[#a62b23] transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              <span>Not fixed</span>
              {votes.not_fixed ? (
                <span className="bg-white/20 px-1 rounded text-[10px]">{votes.not_fixed}</span>
              ) : null}
            </button>

            <button
              onClick={() => handleVote('temporary')}
              disabled={isUpdatingStatus}
              title="Temporary or partial fix"
              className="text-xs px-2 py-1.5 rounded font-semibold text-[var(--ink)] border border-[var(--line)] hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer disabled:opacity-50"
            >
              Temp fix {votes.temporary ? `(${votes.temporary})` : ''}
            </button>
          </div>
        </div>

        {/* Collapsible Toggles: Resident Reports & Official Letters */}
        <div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setShowReports(!showReports)}
            className="flex items-center gap-1 text-[var(--mute)] hover:text-[var(--ink)] font-semibold cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Reports ({issue.reports?.length || 1})</span>
            {showReports ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={() => setShowLetters(!showLetters)}
            className="flex items-center gap-1 text-[#0f4c5c] dark:text-teal-400 font-bold hover:underline cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{showLetters ? 'Hide Letter' : 'Copy Letter'}</span>
          </button>
        </div>

        {/* Expandable: Resident Reports Cluster */}
        {showReports && (
          <div className="mt-1 p-2.5 bg-[var(--paper)] rounded border border-[var(--line)] text-xs space-y-2 max-h-40 overflow-y-auto">
            <div className="font-bold text-[var(--ink)] text-[11px] uppercase tracking-wide">
              Resident statements in this cluster:
            </div>
            {issue.reports?.map((rep, idx) => (
              <div key={idx} className="pb-1.5 border-b border-[var(--line)] last:border-b-0">
                <p className="text-[var(--ink)] italic">"{rep.text}"</p>
                <div className="text-[10px] text-[var(--mute)] mt-0.5">
                  {new Date(rep.ts * 1000).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expandable: Bilingual Complaint Letters */}
        {showLetters && (
          <div className="mt-1 p-3 bg-[var(--paper)] rounded border border-[var(--line)] text-xs space-y-3">
            {/* English Letter */}
            <div>
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-[var(--line)]">
                <span className="font-bold text-[var(--ink)] uppercase text-[10px]">
                  Official English Grievance
                </span>
                <button
                  onClick={() => copyText(issue.letter_en, 'en')}
                  className="text-xs font-semibold text-[#0f4c5c] dark:text-teal-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedLetter === 'en' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-[var(--ink)] max-h-32 overflow-y-auto">
                {issue.letter_en}
              </pre>
            </div>

            {/* Tamil Letter */}
            <div>
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-[var(--line)]">
                <span className="font-bold text-[var(--ink)] uppercase text-[10px] font-tamil">
                  தமிழ் மனு (Tamil Letter)
                </span>
                <button
                  onClick={() => copyText(issue.letter_ta, 'ta')}
                  className="text-xs font-semibold text-[#0f4c5c] dark:text-teal-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedLetter === 'ta' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="whitespace-pre-wrap font-tamil text-[11px] leading-relaxed text-[var(--ink)] max-h-32 overflow-y-auto">
                {issue.letter_ta}
              </pre>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
