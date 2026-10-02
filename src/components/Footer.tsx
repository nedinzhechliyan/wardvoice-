import React from 'react';
import { ShieldCheck, Heart, ExternalLink } from 'lucide-react';

interface FooterProps {
  onOpenHelplines: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenHelplines }) => {
  return (
    <footer className="mt-12 border-t-2 border-[var(--line)] bg-[var(--card)] py-8 text-xs text-[var(--mute)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[var(--line)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-extrabold text-base text-[var(--ink)]">
                WardVoice
              </span>
              <span className="text-[11px] bg-[#f2b705] text-[#14232b] px-1.5 py-0.2 rounded font-bold">
                Civic Tech
              </span>
              <span className="text-[11px] bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200 px-1.5 py-0.2 rounded font-bold font-tamil">
                சென்னை வார்டு
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--mute)] max-w-xl">
              WardVoice is a community coordination layer. It does not replace GCC, Metro Water or Tamil Nadu 1100.
              Built for #social-good and neighborhood civic accountability in Chennai.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenHelplines}
              className="text-[#0f4c5c] dark:text-teal-400 font-bold hover:underline cursor-pointer"
            >
              Grievance Helplines
            </button>
            <span>&middot;</span>
            <a
              href="https://chennaicorporation.gov.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0f4c5c] dark:text-teal-400 font-bold hover:underline flex items-center gap-0.5"
            >
              <span>GCC Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <div>
            Targeted for deployment on AWS Lambda, Bedrock, Translate & DynamoDB.
          </div>
          <div className="flex items-center gap-1">
            <span>Made for Chennai citizens with</span>
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            <span>and collective voice</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
