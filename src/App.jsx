import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { GoalsPage } from './components/GoalsPage';
import { DailyTasks } from './components/DailyTasks';
import { FocusMode } from './components/FocusMode';
import { NotesPage } from './components/NotesPage';
import { AuthPage } from './components/AuthPage';

function AppInner() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #0b0c10 0%, #151720 40%, #1a1c2e 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 0,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(77,124,255,0.15) 0%, transparent 70%)',
          filter: 'blur(40px)', animation: 'glowPulse 3s ease-in-out infinite',
        }} />

        {/* Orbital rings container */}
        <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 32 }}>
          {/* Outer orbit */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '1.5px solid rgba(77,124,255,0.12)',
            animation: 'orbitSpin 8s linear infinite',
          }}>
            <div style={{
              position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)',
              width: 8, height: 8, borderRadius: '50%',
              background: '#5a85ff', boxShadow: '0 0 12px rgba(90,133,255,0.8)',
            }} />
          </div>

          {/* Middle orbit */}
          <div style={{
            position: 'absolute', inset: 16, borderRadius: '50%',
            border: '1px solid rgba(129,140,248,0.1)',
            animation: 'orbitSpin 5s linear infinite reverse',
          }}>
            <div style={{
              position: 'absolute', bottom: -3, left: '50%', transform: 'translateX(-50%)',
              width: 6, height: 6, borderRadius: '50%',
              background: '#818cf8', boxShadow: '0 0 10px rgba(129,140,248,0.7)',
            }} />
          </div>

          {/* Center logo */}
          <div style={{
            position: 'absolute', inset: 30, borderRadius: 18,
            background: 'linear-gradient(135deg, #4d7cff 0%, #818cf8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(77,124,255,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
            animation: 'logoPulse 2.5s ease-in-out infinite',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
        </div>

        {/* Brand text */}
        <h1 style={{
          margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: '-1px',
          background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          animation: 'fadeSlideUp 0.8s ease-out both',
        }}>
          GoalForge
        </h1>

        <p style={{
          margin: '8px 0 0', fontSize: 13, fontWeight: 500, color: '#64748b',
          letterSpacing: '0.08em',
          animation: 'fadeSlideUp 0.8s ease-out 0.15s both',
        }}>
          Preparing your workspace
        </p>

        {/* Shimmer progress bar */}
        <div style={{
          marginTop: 28, width: 180, height: 3, borderRadius: 99,
          background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
          animation: 'fadeSlideUp 0.8s ease-out 0.3s both',
        }}>
          <div style={{
            width: '40%', height: '100%', borderRadius: 99,
            background: 'linear-gradient(90deg, transparent, #5a85ff, transparent)',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }} />
        </div>

        <style>{`
          @keyframes orbitSpin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes logoPulse {
            0%, 100% { transform: scale(1); }
            50%      { transform: scale(1.06); }
          }
          @keyframes glowPulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50%      { opacity: 1; transform: scale(1.15); }
          }
          @keyframes shimmer {
            0%   { transform: translateX(-200%); }
            100% { transform: translateX(550%); }
          }
          @keyframes fadeSlideUp {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard setView={setCurrentView} />;
      case 'goals':     return <GoalsPage />;
      case 'tasks':     return <DailyTasks />;
      case 'notes':     return <NotesPage />;
      case 'focus':     return <FocusMode />;
      default:          return <Dashboard setView={setCurrentView} />;
    }
  };

  return (
    <AppProvider>
      <Layout currentView={currentView} setView={setCurrentView}>
        {renderView()}
      </Layout>
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
