import React, { useState } from 'react';
import { Filter, Search, RefreshCw, Sparkles, Building, Layers } from 'lucide-react';
import { Issue } from '../types';
import { IssueCard } from './IssueCard';

interface BoardSectionProps {
  issues: Issue[];
  isLoading: boolean;
  onRefresh: () => void;
  onSeed: () => void;
  isSeeding: boolean;
}

export const BoardSection: React.FC<BoardSectionProps> = ({
  issues,
  isLoading,
  onRefresh,
  onSeed,
  isSeeding,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'days' | 'reports' | 'newest'>('days');

  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'streetlight', label: 'Streetlight' },
    { id: 'flooding', label: 'Flooding' },
    { id: 'sewage', label: 'Sewage' },
    { id: 'water_supply', label: 'Water Supply' },
    { id: 'garbage', label: 'Garbage' },
    { id: 'road', label: 'Road / Pothole' },
  ];

  const statuses = [
    { id: 'all', label: 'All Statuses' },
    { id: 'unresolved', label: 'Unresolved' },
    { id: 'filed', label: 'Officially Filed' },
    { id: 'dept_closed', label: 'Dept Closed' },
    { id: 'verified', label: 'Community Verified' },
  ];

  // Filtering
  const filteredIssues = issues.filter((issue) => {
    // Category filter
    if (selectedCategory !== 'all' && issue.category !== selectedCategory) {
      return false;
    }

    // Status filter
    if (selectedStatus === 'unresolved' && issue.verified) {
      return false;
    }
    if (selectedStatus === 'filed' && !issue.official_no) {
      return false;
    }
    if (selectedStatus === 'dept_closed' && !issue.admin_closed) {
      return false;
    }
    if (selectedStatus === 'verified' && !issue.verified) {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = issue.id.toLowerCase().includes(q);
      const matchLoc = issue.location.toLowerCase().includes(q);
      const matchCat = issue.category.toLowerCase().includes(q);
      const matchDept = issue.dept.toLowerCase().includes(q);
      const matchReports = issue.reports?.some((r) => r.text.toLowerCase().includes(q));
      if (!matchId && !matchLoc && !matchCat && !matchDept && !matchReports) {
        return false;
      }
    }

    return true;
  });

  // Sorting
  const sortedIssues = [...filteredIssues].sort((a, b) => {
    if (sortBy === 'days') {
      // Oldest unresolved first (smallest first_ts)
      return a.first_ts - b.first_ts;
    }
    if (sortBy === 'reports') {
      // Highest reports first
      return (b.reports?.length || 1) - (a.reports?.length || 1);
    }
    // Newest first
    return b.first_ts - a.first_ts;
  });

  return (
    <section id="board" className="py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold font-heading text-[var(--ink)]">
            Public accountability board
          </h2>
          <p className="text-xs sm:text-sm text-[var(--mute)] mt-0.5">
            Sample data is labelled in each report. WardVoice drafts letters; the official portal is where you file them.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSeed}
            disabled={isSeeding}
            className="text-xs bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--ink)] border-2 border-[var(--line)] font-semibold px-3 py-1.5 rounded transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#f2b705]" />
            <span>{isSeeding ? 'Loading sample...' : 'Load sample issues'}</span>
          </button>

          <button
            onClick={onRefresh}
            title="Refresh issues"
            disabled={isLoading}
            className="p-1.5 rounded border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)] bg-[var(--card)] transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[var(--card)] p-3.5 rounded-xl border border-[var(--line)] shadow-xs mb-5 space-y-3">
        {/* Search input and sort */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mute)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by locality (e.g. Velachery, Adyar), keyword, or issue ID..."
              className="w-full bg-[var(--paper)] text-[var(--ink)] pl-9 pr-3 py-1.5 rounded-lg border border-[var(--line)] text-sm focus:border-[#f2b705] focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--mute)] hover:text-[var(--ink)]"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[var(--mute)] shrink-0">
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="days">Oldest Unresolved (Days)</option>
              <option value="reports">Most Resident Reports</option>
              <option value="newest">Most Recent</option>
            </select>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-[var(--line)]">
          <span className="text-xs font-semibold text-[var(--mute)] mr-1">
            Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`text-xs px-2.5 py-1 rounded-full font-semibold transition cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#0f4c5c] text-white'
                  : 'bg-[var(--paper)] text-[var(--ink)] hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-[var(--mute)] mr-1">
            Status:
          </span>
          {statuses.map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatus(st.id)}
              className={`text-xs px-2.5 py-1 rounded-md font-semibold transition cursor-pointer ${
                selectedStatus === st.id
                  ? 'bg-[#14232b] text-[#f2b705] dark:bg-[#f2b705] dark:text-[#14232b]'
                  : 'bg-[var(--paper)] text-[var(--ink)] hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Issues Grid */}
      {sortedIssues.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {sortedIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onRefresh={onRefresh} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-[var(--card)] rounded-xl border border-[var(--line)] p-6">
          <div className="text-4xl mb-2">📋</div>
          <h3 className="font-heading font-bold text-lg text-[var(--ink)]">
            No matching civic issues found
          </h3>
          <p className="text-xs text-[var(--mute)] max-w-sm mx-auto mt-1">
            {issues.length === 0
              ? 'No issues reported yet. Be the first to report an issue above or click "Load sample issues".'
              : 'Try clearing your search query or adjusting your category/status filters.'}
          </p>
          {issues.length === 0 && (
            <button
              onClick={onSeed}
              className="mt-4 bg-[#f2b705] hover:bg-[#deb200] text-[#14232b] font-bold text-xs px-4 py-2 rounded shadow-xs transition"
            >
              Load sample issues
            </button>
          )}
        </div>
      )}
    </section>
  );
};
