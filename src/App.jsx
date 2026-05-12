import React, { useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LevelUpModal } from './components/LevelUpModal';
import { BadgeToast } from './components/BadgeToast';
import { GoalCompletionModal } from './components/GoalCompletionModal';
import { registerServiceWorker } from './utils/notificationUtils';

// Lazy loading heavy bundles & pages for code splitting & bundle size optimization
const Dashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const GoalsPage = React.lazy(() => import('./components/GoalsPage').then(m => ({ default: m.GoalsPage })));
const DailyTasks = React.lazy(() => import('./components/DailyTasks').then(m => ({ default: m.DailyTasks })));
const FocusMode = React.lazy(() => import('./components/FocusMode').then(m => ({ default: m.FocusMode })));
const NotesPage = React.lazy(() => import('./components/NotesPage').then(m => ({ default: m.NotesPage })));
const AuthPage = React.lazy(() => import('./components/AuthPage').then(m => ({ default: m.AuthPage })));
const ProfilePage = React.lazy(() => import('./components/ProfilePage').then(m => ({ default: m.ProfilePage })));
const WeeklyPlan = React.lazy(() => import('./components/WeeklyPlan').then(m => ({ default: m.WeeklyPlan })));

// Premium fallback loading skeleton
function ViewSkeleton() {
  return (
    <div className="w-full h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-full border-2 border-accent-blue/10 border-t-accent-blue animate-spin" />
      <span className="text-xs font-bold text-text-muted uppercase tracking-widest animate-pulse">Forging Layout...</span>
    </div>
  );
}

function AppInner() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  React.useEffect(() => {
    registerServiceWorker();

    // Listen for SW cache-bust signal → reload to get latest assets
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_UPDATED') {
          window.location.reload();
        }
      });
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-app flex flex-col items-center justify-center gap-0 font-inter overflow-hidden relative">
        {/* Background glow */}
        <div className="absolute w-80 h-80 rounded-full bg-accent-blue/15 blur-[40px] animate-pulse" />

        {/* Orbital rings container */}
        <div className="relative w-[120px] h-[120px] mb-8">
          {/* Outer orbit */}
          <div className="absolute inset-0 rounded-full border-[1.5px] border-accent-blue/10 animate-[spin_8s_linear_infinite]">
            <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent-blue shadow-[0_0_12px_rgba(77,124,255,0.8)]" />
          </div>

          {/* Middle orbit */}
          <div className="absolute inset-4 rounded-full border border-indigo-400/10 animate-[spin_5s_linear_infinite_reverse]">
            <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.7)]" />
          </div>

          {/* Center logo */}
          <div className="absolute inset-[30px] rounded-2xl bg-linear-to-br from-accent-blue to-indigo-400 flex items-center justify-center shadow-lg shadow-accent-blue/40 ring-1 ring-white/10 animate-bounce">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
        </div>

        {/* Brand text */}
        <h1 className="text-3xl font-black tracking-tighter bg-linear-to-br from-white to-slate-400 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-3 duration-700">
          GoalForge
        </h1>

        <p className="mt-2 text-[10px] font-black text-text-muted uppercase tracking-[0.3em] animate-in fade-in slide-in-from-bottom-4 duration-1000">
          Syncing Neural Pathways
        </p>

        {/* Shimmer progress bar */}
        <div className="mt-8 w-44 h-[2px] rounded-full bg-white/5 overflow-hidden animate-in fade-in duration-1000">
          <div className="w-[40%] h-full rounded-full bg-linear-to-r from-transparent via-accent-blue to-transparent animate-[shimmer_2s_infinite]" />
        </div>

        <style>{`
          @keyframes shimmer {
            0%   { transform: translateX(-200%); }
            100% { transform: translateX(550%); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <React.Suspense fallback={<ViewSkeleton />}>
        <AuthPage />
      </React.Suspense>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard setView={setCurrentView} />;
      case 'goals':     return <GoalsPage />;
      case 'tasks':     return <DailyTasks />;
      case 'notes':     return <NotesPage />;
      case 'focus':     return <FocusMode />;
      case 'weeklyplan':return <WeeklyPlan />;
      case 'profile':   return <ProfilePage />;
      default:          return <Dashboard setView={setCurrentView} />;
    }
  };

  return (
    <AppProvider>
      <GamificationOverlays />
      <Layout currentView={currentView} setView={setCurrentView}>
        <React.Suspense fallback={<ViewSkeleton />}>
          {renderView()}
        </React.Suspense>
      </Layout>
    </AppProvider>
  );
}

/** Renders level-up and badge modals, reading from context. */
function GamificationOverlays() {
  const { 
    levelUpEvent, setLevelUpEvent, 
    badgeUnlockEvent, setBadgeUnlockEvent,
    completedGoalForCelebration, setCompletedGoalForCelebration 
  } = useAppContext();
  return (
    <>
      {levelUpEvent && (
        <LevelUpModal
          level={levelUpEvent.level}
          title={levelUpEvent.title}
          onClose={() => setLevelUpEvent(null)}
        />
      )}
      {badgeUnlockEvent && (
        <BadgeToast
          badge={badgeUnlockEvent}
          onClose={() => setBadgeUnlockEvent(null)}
        />
      )}
      {completedGoalForCelebration && (
        <GoalCompletionModal
          goal={completedGoalForCelebration}
          onClose={() => setCompletedGoalForCelebration(null)}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
