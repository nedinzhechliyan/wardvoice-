import React from 'react';
import { Phone, ExternalLink, Moon, Sun, ShieldCheck, Sparkles, Building } from 'lucide-react';
import { Issue } from '../types';

interface HeaderProps {
  issues: Issue[];
  onOpenHelplines: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  issues,
  onOpenHelplines,
  isDark,
  onToggleTheme,
}) => {
  const totalReports = issues.reduce((acc, issue) => acc + (issue.reports?.length || 1), 0);
  const totalIssues = issues.length;
  const duplicatesJoined = Math.max(0, totalReports - totalIssues);
  const verifiedCount = issues.filter((i) => i.verified).length;
  const fixRate = totalIssues > 0 ? Math.round((verifiedCount / totalIssues) * 100) : 0;

  return (
    <header className="bg-[#0f4c5c] text-white pt-7 pb-8 border-b-4 border-[#f2b705]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Top Navbar */}
        <div className="flex items-center justify-between pb-5 border-b border-teal-700/60 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-[#f2b705] text-[#14232b] font-black text-xl px-2.5 py-0.5 rounded shadow-sm tracking-tight font-heading">
              WV
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-xl tracking-tight text-white">
                  WardVoice
                </span>
                <span className="bg-teal-900/80 text-[#f2b705] text-xs font-semibold px-2 py-0.5 rounded font-tamil border border-teal-600/40">
                  வார்டுவாய்ஸ்
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 bg-white/10 text-teal-100 text-[11px] font-semibold px-2 py-0.5 rounded">
                  <ShieldCheck className="w-3 h-3 text-[#f2b705]" />
                  Chennai Civic Coordination
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onOpenHelplines}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition border border-teal-500/40"
              title="Official GCC & Metro Water Helplines"
            >
              <Phone className="w-3.5 h-3.5 text-[#f2b705]" />
              <span>Official Helplines</span>
            </button>

            <button
              onClick={onToggleTheme}
              aria-label="Toggle theme"
              className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-teal-100 hover:text-white transition"
            >
              {isDark ? <Sun className="w-4 h-4 text-[#f2b705]" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Hero Title & Pitch */}
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-heading font-extrabold tracking-tight leading-[1.08] text-white">
            One issue, many neighbours.
          </h1>
          <p className="mt-3 text-base sm:text-lg text-teal-100 max-w-2xl leading-relaxed">
            Write your complaint in <strong>Tamil</strong>, <strong>English</strong> or <strong>Tanglish</strong>.
            WardVoice finds who should fix it, joins it with what your neighbours already reported, and keeps it on the board until residents say it is fixed.
          </p>
        </div>

        {/* Live Statistics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-7">
          <div className="bg-white/10 backdrop-blur-xs rounded-lg p-3 border border-white/10">
            <div className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
              {totalReports}
            </div>
            <div className="text-xs text-teal-200 uppercase tracking-wider font-semibold mt-0.5">
              Resident Reports
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-lg p-3 border border-white/10">
            <div className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
              {totalIssues}
            </div>
            <div className="text-xs text-teal-200 uppercase tracking-wider font-semibold mt-0.5">
              Unique Issues
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-lg p-3 border border-white/10">
            <div className="font-heading font-extrabold text-2xl sm:text-3xl text-[#f2b705]">
              {duplicatesJoined}
            </div>
            <div className="text-xs text-teal-200 uppercase tracking-wider font-semibold mt-0.5">
              Duplicates Joined
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-lg p-3 border border-white/10">
            <div className="font-heading font-extrabold text-2xl sm:text-3xl text-emerald-400">
              {fixRate}%
            </div>
            <div className="text-xs text-teal-200 uppercase tracking-wider font-semibold mt-0.5">
              Community Verified Fixed
            </div>
          </div>
        </div>

        {/* Quick Official Channels Pill Bar */}
        <div className="mt-4 pt-3 border-t border-teal-700/50 flex flex-wrap items-center gap-2 text-xs text-teal-200">
          <span className="font-semibold text-white flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-[#f2b705]" />
            Official Routing:
          </span>
          <span className="bg-teal-900/60 px-2 py-0.5 rounded border border-teal-600/30">
            GCC Grievance: <strong>1913</strong>
          </span>
          <span className="bg-teal-900/60 px-2 py-0.5 rounded border border-teal-600/30">
            Metro Water: <strong>044-45674567</strong>
          </span>
          <span className="bg-teal-900/60 px-2 py-0.5 rounded border border-teal-600/30">
            TN CM Helpline: <strong>1100</strong>
          </span>
          <span className="bg-teal-900/60 px-2 py-0.5 rounded border border-teal-600/30">
            Swachhata App
          </span>
        </div>
      </div>
    </header>
  );
};
