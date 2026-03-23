import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { GoalsPage } from './components/GoalsPage';
import { DailyTasks } from './components/DailyTasks';
import { FocusMode } from './components/FocusMode';
import { AuthPage } from './components/AuthPage';

function AppInner() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f2f7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif' }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: '#4d7cff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(77,124,255,0.35)', animation: 'pulse 1.5s ease-in-out infinite' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.95 7.07a2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L10 12.52a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#9ba3b8', margin: 0 }}>Loading GoalForge…</p>
        <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }`}</style>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard setView={setCurrentView} />;
      case 'goals':     return <GoalsPage />;
      case 'tasks':     return <DailyTasks />;
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
