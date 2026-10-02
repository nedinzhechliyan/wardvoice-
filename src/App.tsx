import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ReportSection } from './components/ReportSection';
import { BoardSection } from './components/BoardSection';
import { Footer } from './components/Footer';
import { OfficialHelplinesModal } from './components/OfficialHelplinesModal';
import { Issue } from './types';

export default function App() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [isHelplinesOpen, setIsHelplinesOpen] = useState<boolean>(false);
  const [isDark, setIsDark] = useState<boolean>(false);

  // Toggle dark mode class on document element
  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const loadIssues = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (res.ok) {
        const data: Issue[] = await res.json();
        setIssues(data);
      }
    } catch (err) {
      console.error('Failed to load issues:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (res.ok) {
        await loadIssues();
      }
    } catch (err) {
      console.error('Failed to seed issues:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  const scrollToBoard = () => {
    const el = document.getElementById('board');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)]">
      {/* Header with hero, pitch and live stats */}
      <Header
        issues={issues}
        onOpenHelplines={() => setIsHelplinesOpen(true)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6">
        {/* Report Section: input, AI triage, duplicate join, bilingual letter generator */}
        <ReportSection
          onIssueCreated={loadIssues}
          onScrollToBoard={scrollToBoard}
        />

        {/* Public Accountability Board */}
        <BoardSection
          issues={issues}
          isLoading={isLoading}
          onRefresh={loadIssues}
          onSeed={handleSeed}
          isSeeding={isSeeding}
        />
      </main>

      {/* Footer */}
      <Footer onOpenHelplines={() => setIsHelplinesOpen(true)} />

      {/* Official Helplines & Links Modal */}
      <OfficialHelplinesModal
        isOpen={isHelplinesOpen}
        onClose={() => setIsHelplinesOpen(false)}
      />
    </div>
  );
}
