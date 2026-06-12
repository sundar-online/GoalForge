import React from 'react';
import { Home, Target, CalendarCheck, Timer, StickyNote } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const NAV = [
  { id: 'dashboard', icon: Home, label: 'Home', ariaLabel: 'Go to Dashboard' },
  { id: 'goals', icon: Target, label: 'Goals', ariaLabel: 'Go to Goals' },
  { id: 'tasks', icon: CalendarCheck, label: 'Tasks', ariaLabel: 'Go to Daily Tasks' },
  { id: 'notes', icon: StickyNote, label: 'Notes', ariaLabel: 'Go to Notes' },
  { id: 'focus', icon: Timer, label: 'Focus', ariaLabel: 'Go to Focus Mode' },
];

export const Layout = ({ children, currentView, setView }) => {
  const { goals } = useAppContext();
  const focusGoal = goals.find(g => g.isFocusGoal && !g.isMissingDream);

  return (
    <div className="min-h-screen bg-bg-app font-sans transition-colors duration-300 flex flex-col lg:flex-row">

      {/* ── Skip to main content (keyboard / screen-reader a11y) ──────── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-accent-blue focus:text-white focus:rounded-xl focus:text-sm focus:font-bold focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* ── Desktop Sidebar ───────────────────────────────────────────── */}
      <aside
        aria-label="Primary navigation"
        className="hidden lg:flex w-64 lg:w-72 flex-col bg-bg-card border-r border-border-light h-screen sticky top-0 p-6 z-50"
      >
        {/* Brand */}
        <div className="flex items-center gap-3 mb-10 px-2" aria-hidden="true">
          <div className="w-10 h-10 rounded-xl bg-accent-blue flex items-center justify-center shadow-lg shadow-accent-blue/30">
            <Target className="text-white" size={24} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <span className="text-xl font-black text-text-main tracking-tight">GoalForge</span>
        </div>

        <nav aria-label="Site navigation">
          {NAV.map(item => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                aria-label={item.ariaLabel}
                aria-current={active ? 'page' : undefined}
                className={`
                  w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group mb-1
                  ${active ? 'bg-bg-dark-elem text-text-inverted shadow-md' : 'text-text-muted hover:bg-bg-input hover:text-text-main'}
                `}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 2}
                  className="transition-transform duration-200 group-hover:scale-110"
                  aria-hidden="true"
                />
                <span className="text-sm font-bold tracking-wide">
                  {item.label}
                </span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-blue" aria-hidden="true" />}
              </button>
            );
          })}
        </nav>

        {/* Focus Goal card */}
        {focusGoal ? (
          <div
            className="mt-auto p-4 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 hover:border-accent-blue/30 transition-all cursor-pointer"
            onClick={() => setView('goals')}
            role="button"
            tabIndex={0}
            aria-label={`Focus Goal: ${focusGoal.title}, ${focusGoal.progress || 0}% complete. Click to view goals.`}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setView('goals')}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
              <p className="text-[9px] font-black text-accent-blue uppercase tracking-widest leading-none">Focus Goal</p>
            </div>
            <p className="text-xs font-black text-text-main truncate mb-2">{focusGoal.title}</p>
            <div className="flex justify-between items-center text-[9px] font-bold text-text-muted mb-1">
              <span>Mastery</span>
              <span aria-label={`${focusGoal.progress || 0} percent`}>{focusGoal.progress || 0}%</span>
            </div>
            <div className="h-1.5 w-full bg-bg-input rounded-full overflow-hidden" role="progressbar" aria-valuenow={focusGoal.progress || 0} aria-valuemin={0} aria-valuemax={100} aria-label="Goal progress">
              <div
                className="h-full bg-accent-blue rounded-full transition-all duration-500"
                style={{ width: `${focusGoal.progress || 0}%` }}
              />
            </div>
          </div>
        ) : (
          <div
            className="mt-auto p-4 rounded-2xl bg-bg-input/50 border border-border-light hover:border-border-med transition-all cursor-pointer"
            onClick={() => setView('goals')}
            role="button"
            tabIndex={0}
            aria-label="No Focus Goal set. Click to go to Goals page."
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setView('goals')}
          >
            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Forge Focus</p>
            <p className="text-[11px] font-bold text-text-muted leading-relaxed">No Focus Goal set. Toggle star on any goal card to focus.</p>
          </div>
        )}
      </aside>

      {/* ── Main Content Area ─────────────────────────────────────────── */}
      <main
        id="main-content"
        aria-label="Main content"
        className="flex-1 min-h-screen relative overflow-x-hidden"
        tabIndex={-1}
      >
        <div className="w-full max-w-screen-xl mx-auto safe-content-container">
          {children}
        </div>

        {/* ── Mobile Bottom Navigation ──────────────────────────────── */}
        <div className="lg:hidden safe-bottom-nav-wrapper">
          <nav aria-label="Mobile navigation" className="safe-bottom-nav-pill bg-bg-float/95 backdrop-blur-xl border border-border-light shadow-float rounded-[28px] p-1.5 flex items-center gap-1">
            {NAV.map(item => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  aria-label={item.ariaLabel}
                  aria-current={active ? 'page' : undefined}
                  className={`
                    flex-1 flex flex-col items-center gap-1 py-3 rounded-[20px] transition-all duration-300
                    ${active ? 'bg-bg-dark-elem text-text-inverted scale-[1.02] shadow-sm' : 'text-text-muted hover:bg-bg-input'}
                  `}
                >
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.5 : 2}
                    className="transition-all duration-200"
                    aria-hidden="true"
                  />
                  <span className="text-[9px] font-black uppercase tracking-[0.06em] leading-none">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </main>
    </div>
  );
};
