import React, { useState } from 'react';
import {
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  Mic,
  MicOff,
  Building,
  ShieldAlert,
  HelpCircle,
  FileText,
  CornerDownRight,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { AnalysisResponse, Issue } from '../types';

interface ReportSectionProps {
  onIssueCreated: () => void;
  onScrollToBoard: () => void;
}

export const ReportSection: React.FC<ReportSectionProps> = ({
  onIssueCreated,
  onScrollToBoard,
}) => {
  const [text, setText] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [lastSubmittedIssue, setLastSubmittedIssue] = useState<Issue | null>(null);
  const [copiedType, setCopiedType] = useState<'en' | 'ta' | null>(null);
  const [isListening, setIsListening] = useState(false);

  const sampleChips = [
    {
      label: 'Tanglish streetlight',
      text: 'Adyar 2nd Street la street light illa, 3 naal aachu, dark road at night',
    },
    {
      label: 'English flooding',
      text: 'Water standing near Velachery bus stop since morning, blocked drain',
    },
    {
      label: 'Tamil garbage',
      text: 'அண்ணா நகர் மார்க்கெட் எதிரே குப்பை எடுக்கவில்லை, கடுமையான துர்நாற்றம்',
    },
    {
      label: 'Tanglish sewage',
      text: 'Usman Road T Nagar manhole overflow aaguthu, dirty water smelling bad',
    },
    {
      label: 'English pothole',
      text: 'Deep crater pothole on Luz Church Road Mylapore, two-wheelers skidding frequently',
    },
  ];

  const handleChipClick = (sampleText: string) => {
    setText(sampleText);
    setErrorMessage('');
    setAnalysis(null);
    setLastSubmittedIssue(null);
  };

  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your complaint.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ta-IN'; // Will transcribe Tamil or English words
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
      console.warn('Speech recognition error:', e);
    }
  };

  const handleCheck = async () => {
    if (!text.trim()) {
      setErrorMessage('Please describe the problem first.');
      return;
    }
    if (text.trim().length < 8) {
      setErrorMessage('Describe the problem in a few words (at least 8 characters).');
      return;
    }

    setErrorMessage('');
    setIsChecking(true);
    setAnalysis(null);
    setLastSubmittedIssue(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze complaint.');
      }
      setAnalysis(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error checking complaint.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (joinId: string | null = null) => {
    if (!analysis) return;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          rec: analysis.rec,
          join_id: joinId,
        }),
      });

      const issue: Issue = await res.json();
      if (!res.ok) {
        throw new Error((issue as any).error || 'Failed to submit complaint.');
      }

      setLastSubmittedIssue(issue);
      setAnalysis(null);
      setText('');
      onIssueCreated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (content: string, type: 'en' | 'ta') => {
    navigator.clipboard.writeText(content);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <section className="py-6 border-b border-[var(--line)]">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold font-heading text-[var(--ink)]">
          Report a problem
        </h2>
        <span className="text-xs text-[var(--mute)] font-medium">
          Multilingual Civic AI Triage
        </span>
      </div>

      {/* Input container */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (errorMessage) setErrorMessage('');
          }}
          placeholder="e.g. street light work aagala near 2nd Street, Adyar. Night romba dark."
          aria-label="Describe the problem"
          className="w-full bg-[var(--card)] text-[var(--ink)] border-2 border-[var(--line)] rounded-lg p-3.5 text-base focus:border-[#f2b705] focus:outline-none transition min-h-[110px]"
        />

        {/* Dictation button inside textarea */}
        <div className="absolute right-3 bottom-4 flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleSpeechRecognition}
            title={isListening ? 'Listening... click to stop' : 'Voice dictation (Tamil/English)'}
            className={`p-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition ${
              isListening
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-gray-100 dark:bg-gray-800 text-[var(--mute)] hover:text-[var(--ink)]'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span className="text-[11px] pr-1">{isListening ? 'Listening...' : 'Voice'}</span>
          </button>
        </div>
      </div>

      {/* Actions and sample chips */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button
          onClick={handleCheck}
          disabled={isChecking || !text.trim()}
          className="bg-[#f2b705] hover:bg-[#deb200] text-[#14232b] font-heading font-bold text-sm sm:text-base px-5 py-2.5 rounded-md shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {isChecking ? (
            <>
              <div className="w-4 h-4 border-2 border-[#14232b] border-t-transparent rounded-full animate-spin" />
              <span>Checking & routing...</span>
            </>
          ) : (
            <>
              <span>Check and route</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <span className="text-xs sm:text-sm text-[var(--mute)] font-medium pl-1">
          Try samples:
        </span>

        {sampleChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleChipClick(chip.text)}
            className="text-xs bg-[var(--card)] hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--ink)] border border-[var(--line)] px-2.5 py-1 rounded-full transition cursor-pointer"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-900 rounded-md text-red-700 dark:text-red-300 text-sm font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* AI Analysis Result Panel */}
      {analysis && (
        <div className="mt-4 p-5 bg-[var(--card)] border-2 border-[var(--line)] rounded-xl shadow-xs transition-all">
          <div className="flex items-start justify-between flex-wrap gap-2 pb-3 border-b border-[var(--line)]">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-[var(--mute)]">
                Identified Civic Category & Location
              </div>
              <h3 className="text-xl font-extrabold font-heading text-[var(--ink)] capitalize mt-0.5">
                {analysis.rec.category.replace('_', ' ')}: {analysis.rec.location}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 text-xs px-2.5 py-1 rounded-full font-bold">
                {Math.round(analysis.rec.confidence * 100)}% Confidence
              </span>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                  analysis.rec.urgency === 'high'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                }`}
              >
                {analysis.rec.urgency} Urgency
              </span>
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-x-4 gap-y-2.5 my-4 text-sm">
            <dt className="font-semibold text-[var(--mute)] flex items-center gap-1.5">
              <Building className="w-4 h-4 text-[#0f4c5c]" />
              Who should fix it
            </dt>
            <dd className="font-bold text-base text-[var(--ink)]">
              {analysis.rec.department}
            </dd>

            <dt className="font-semibold text-[var(--mute)] flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#0f4c5c]" />
              Why this route
            </dt>
            <dd className="text-[var(--ink)]">
              {analysis.rec.reason}
              {analysis.rec.source === 'fallback' && (
                <span className="text-xs text-[var(--mute)] ml-1">
                  (heuristic analysis)
                </span>
              )}
            </dd>

            <dt className="font-semibold text-[var(--mute)] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#0f4c5c]" />
              Identified Risk
            </dt>
            <dd className="text-[var(--ink)]">
              {analysis.rec.risk || 'Public convenience and safety'}
            </dd>

            <dt className="font-semibold text-[var(--mute)]">Still missing</dt>
            <dd className="text-[var(--mute)]">
              {analysis.rec.missing_information && analysis.rec.missing_information.length > 0
                ? analysis.rec.missing_information.join(', ')
                : 'None detected'}
            </dd>

            <dt className="font-semibold text-[var(--mute)]">Where to file</dt>
            <dd className="font-semibold text-[var(--ink)]">
              {analysis.rec.channel}
            </dd>
          </dl>

          {analysis.rec.clarify && (
            <div className="my-3 p-3 bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded text-amber-900 dark:text-amber-200 text-sm">
              <strong>Need clarification:</strong> {analysis.rec.clarify} Add details to your description to refine routing.
            </div>
          )}

          {/* Duplicate Detection Alert */}
          {analysis.duplicate ? (
            <div className="mt-4 p-4 bg-amber-50/70 dark:bg-amber-950/40 border-l-6 border-[#f2b705] rounded-r-lg">
              <div className="flex items-center gap-2 text-[#14232b] dark:text-[#f2b705] font-bold text-base">
                <AlertTriangle className="w-5 h-5 text-[#f2b705]" />
                <span>This may be the same as issue {analysis.duplicate.id}</span>
              </div>
              <p className="text-sm text-[var(--mute)] mt-1">
                Located near <strong>{analysis.duplicate.location}</strong> with{' '}
                <strong>{analysis.duplicate.reports} existing resident report(s)</strong>.
                Joining multiplies the civic petition weight instead of fragmenting complaints!
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mt-3">
                <button
                  type="button"
                  onClick={() => handleSubmit(analysis.duplicate!.id)}
                  disabled={isSubmitting}
                  className="bg-[#0f4c5c] hover:bg-[#166377] text-white font-heading font-bold text-sm px-4 py-2 rounded shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-[#f2b705]" />
                  <span>Join {analysis.duplicate.id} ({analysis.duplicate.reports + 1} neighbours)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(null)}
                  disabled={isSubmitting}
                  className="bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--ink)] border-2 border-[var(--line)] font-semibold text-sm px-4 py-2 rounded transition cursor-pointer disabled:opacity-50"
                >
                  Create as a new separate issue
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSubmit(null)}
                disabled={isSubmitting}
                className="bg-[#0f4c5c] hover:bg-[#166377] text-white font-heading font-bold text-sm px-5 py-2.5 rounded shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-[#f2b705]" />
                <span>Create and post issue to board</span>
              </button>
              <span className="text-xs text-[var(--mute)]">
                Will draft bilingual English & Tamil grievance letters
              </span>
            </div>
          )}
        </div>
      )}

      {/* Submitted Issue Result Preview with Bilingual Letters */}
      {lastSubmittedIssue && (
        <div className="mt-5 p-5 bg-[var(--card)] border-2 border-emerald-500 rounded-xl shadow-md animate-in fade-in duration-300">
          <div className="flex items-start justify-between flex-wrap gap-2 pb-3 border-b border-[var(--line)]">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                  Active On Board
                </span>
                <span className="text-xs text-[var(--mute)] font-mono font-bold">
                  {lastSubmittedIssue.id}
                </span>
              </div>
              <h3 className="text-xl font-bold font-heading text-[var(--ink)] mt-1">
                Issue {lastSubmittedIssue.id} recorded with{' '}
                {lastSubmittedIssue.reports.length} resident report(s)
              </h3>
            </div>

            <button
              type="button"
              onClick={onScrollToBoard}
              className="text-xs bg-[#f2b705] hover:bg-[#deb200] text-[#14232b] font-bold px-3 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"
            >
              <span>View card on board below</span>
              <CornerDownRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs sm:text-sm text-[var(--mute)] my-3 leading-relaxed">
            Copy this formal letter to file into the official channel (<strong>{lastSubmittedIssue.channel}</strong>).
            Once submitted, paste the official complaint tracking number into your issue card below.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            {/* English letter */}
            <div className="bg-[var(--paper)] rounded-lg p-3.5 border border-[var(--line)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
                  <span className="font-bold text-xs uppercase text-[var(--mute)]">
                    English Grievance Letter
                  </span>
                  <button
                    onClick={() => copyToClipboard(lastSubmittedIssue.letter_en, 'en')}
                    className="flex items-center gap-1 text-xs font-semibold text-[#0f4c5c] hover:underline cursor-pointer"
                  >
                    {copiedType === 'en' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy letter</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[var(--ink)] max-h-60 overflow-y-auto">
                  {lastSubmittedIssue.letter_en}
                </pre>
              </div>
            </div>

            {/* Tamil letter */}
            <div className="bg-[var(--paper)] rounded-lg p-3.5 border border-[var(--line)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--line)]">
                  <span className="font-bold text-xs uppercase text-[var(--mute)] font-tamil">
                    தமிழ் புகார் மனு (Tamil)
                  </span>
                  <button
                    onClick={() => copyToClipboard(lastSubmittedIssue.letter_ta, 'ta')}
                    className="flex items-center gap-1 text-xs font-semibold text-[#0f4c5c] hover:underline cursor-pointer"
                  >
                    {copiedType === 'ta' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">நகலெடுக்கப்பட்டது!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Tamil letter</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-tamil text-xs leading-relaxed text-[var(--ink)] max-h-60 overflow-y-auto">
                  {lastSubmittedIssue.letter_ta}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
