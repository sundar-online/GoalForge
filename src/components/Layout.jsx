import React from 'react';
import { Home, Target, CalendarCheck, Timer, StickyNote } from 'lucide-react';

const NAV = [
  { id: 'dashboard', icon: Home,          label: 'Home'   },
  { id: 'goals',     icon: Target,        label: 'Goals'  },
  { id: 'tasks',     icon: CalendarCheck, label: 'Tasks'  },
  { id: 'notes',     icon: StickyNote,    label: 'Notes'  },
  { id: 'focus',     icon: Timer,         label: 'Focus'  },
];

export const Layout = ({ children, currentView, setView }) => {
  return (
    <div className="min-h-screen bg-bg-app font-sans transition-colors duration-300 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 lg:w-72 flex-col bg-bg-card border-r border-border-light h-screen sticky top-0 p-6 z-50">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl bg-accent-blue flex items-center justify-center shadow-lg shadow-accent-blue/30">
            <Target className="text-white" size={24} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-black text-text-main tracking-tight">GoalForge</h1>
        </div>

        <nav className="flex flex-col gap-2">
          {NAV.map(item => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`
                  flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group
                  ${active ? 'bg-bg-dark-elem text-text-inverted shadow-md' : 'text-text-muted hover:bg-bg-input hover:text-text-main'}
                `}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 2}
                  className="transition-transform duration-200 group-hover:scale-110"
                />
                <span className="text-sm font-bold tracking-wide">
                  {item.label}
                </span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-blue" />}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto p-4 rounded-2xl bg-bg-input/50 border border-border-light">
          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Consistency</p>
          <div className="h-1.5 w-full bg-bg-app rounded-full overflow-hidden">
            <div className="h-full bg-accent-blue w-3/4 rounded-full" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen relative overflow-x-hidden">
        <div className="w-full max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-10 pb-32 md:pb-10">
          {children}
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-bg-float/95 backdrop-blur-xl border border-border-light shadow-float rounded-[28px] p-1.5 flex items-center gap-1 z-[100] w-[calc(100%-32px)] max-w-md">
          {NAV.map(item => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`
                  flex-1 flex flex-col items-center gap-1 py-2.5 rounded-[20px] transition-all duration-300
                  ${active ? 'bg-bg-dark-elem text-text-inverted scale-[1.02] shadow-sm' : 'text-text-muted hover:bg-bg-input'}
                `}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 2}
                  className="transition-all duration-200"
                />
                <span className="text-[9px] font-black uppercase tracking-[0.06em] leading-none">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </main>
    </div>
  );
};
