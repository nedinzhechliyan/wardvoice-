import React from 'react';
import { X, ExternalLink, Phone, ShieldCheck, CheckCircle2, Building, AlertCircle } from 'lucide-react';

interface OfficialHelplinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfficialHelplinesModal: React.FC<OfficialHelplinesModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const helplines = [
    {
      department: 'Greater Chennai Corporation (GCC)',
      scope: 'Roads, Potholes, Streetlights, Garbage & Storm Water Drains',
      tollFree: '1913',
      alternate: '044-25619206',
      portalUrl: 'https://chennaicorporation.gov.in/gcc/online-civic-services/citizen-portal/',
      app: 'Namma Chennai App (Play Store & App Store)',
    },
    {
      department: 'CMWSSB (Chennai Metro Water)',
      scope: 'Sewage overflow, pipeline leaks, contaminated drinking water, water supply',
      tollFree: '044-45674567',
      alternate: '24/7 Grievance Center',
      portalUrl: 'https://cmwssb.tn.gov.in/',
      app: 'Metro Water Complaint Web Grievance',
    },
    {
      department: 'Tamil Nadu CM Helpline (Mudhalvarin Mugavari)',
      scope: 'Statewide civic escalation & multi-department public grievances',
      tollFree: '1100',
      alternate: 'Toll-free 24/7',
      portalUrl: 'https://cmhelpline.tnega.org/',
      app: 'CM Helpline Citizen Portal',
    },
    {
      department: 'MoHUA Swachhata Portal',
      scope: 'Solid waste management, public dumps, street sweeping & sanitation',
      tollFree: '1969',
      alternate: 'National Swachh Bharat Helpline',
      portalUrl: 'https://swachhatahpe.gov.in/',
      app: 'Swachhata - MoHUA App',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--card)] text-[var(--ink)] border-2 border-[var(--line)] rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--mute)] hover:text-[var(--ink)] transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="bg-[#f2b705] p-2 rounded-lg text-[#14232b]">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold font-heading text-[var(--ink)]">
              Official Grievance Portals & Helplines
            </h3>
            <p className="text-xs text-[var(--mute)]">
              WardVoice prepares and clusters your petition. File it directly with the official department below.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
          {helplines.map((h, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-[var(--paper)] rounded-xl border border-[var(--line)]"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h4 className="font-bold text-sm text-[var(--ink)] font-heading">
                    {h.department}
                  </h4>
                  <p className="text-xs text-[var(--mute)] mt-0.5">
                    {h.scope}
                  </p>
                </div>
                <span className="font-mono text-xs font-bold bg-[#0f4c5c] text-white px-2 py-0.5 rounded">
                  📞 {h.tollFree}
                </span>
              </div>

              <div className="mt-2.5 pt-2 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[var(--mute)]">
                  App/Alt: <strong>{h.app}</strong>
                </span>
                <a
                  href={h.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#0f4c5c] dark:text-teal-400 hover:underline flex items-center gap-1"
                >
                  <span>Open Citizen Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--mute)]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Always keep your grievance acknowledgement number.
          </span>
          <button
            onClick={onClose}
            className="bg-[#0f4c5c] hover:bg-[#166377] text-white font-bold px-4 py-1.5 rounded transition cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
