import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { calculateGoalDailyProgress, isHabitDoneToday } from '../utils/calculationUtils';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, AlertCircle, TrendingUp, TrendingDown, CheckCircle2, Clock, Zap, LogOut, Moon, Sun, Sparkles, Trophy, ChevronRight, Target } from 'lucide-react';
import { WeeklyHeatmap } from './WeeklyHeatmap';
import { WeeklyReportCard } from './WeeklyReportCard';
import { SkeletonLoader } from './SkeletonLoader';

export const Dashboard = ({ setView }) => {
  const {
    goals, accuracy, alerts,
    totalItems, completedItems,
    todayTasks, allHabits,
    focusTime, focusHistory, taskLogs,
    disciplineScore, userLevel, insights,
    theme, toggleTheme, loading, weeklyReport, syncError, retrySync
  } = useAppContext();

  const { displayName, signOut, user } = useAuth();
  const [showSignOut, setShowSignOut] = useState(false);

  const initial = displayName ? displayName[0].toUpperCase() : 'U';
  const focusHrs = Math.floor(focusTime / 3600);
  const focusMins = Math.floor((focusTime % 3600) / 60);

  const yday = new Date(); yday.setDate(yday.getDate() - 1);
  const ydayKey = yday.toISOString().split('T')[0];
  const ydaySec = focusHistory[ydayKey] || 0;
  const focusDelta = ydaySec === 0 ? null : Math.round(((focusTime - ydaySec) / ydaySec) * 100);

  const R = 52; const CIRC = 2 * Math.PI * R;
  const accOffset = CIRC - (CIRC * accuracy) / 100;
  
  let accColor;
  if (accuracy >= 100) accColor = '#22c55e';
  else if (accuracy >= 50) accColor = 'var(--accent-blue)';
  else if (accuracy > 0) accColor = '#faba2c';
  else accColor = 'var(--bg-input)';

  const topStreaks = goals
    .map(g => ({ 
      name: g.title, 
      tag: g.tag, 
      streak: g.habits.length === 0 ? 0 : Math.max(...g.habits.map(h => h.streak || 0)), 
      missed: g.missedDays || 0 
    }))
    .filter(g => g.streak > 0 || g.missed > 0)
    .sort((a, b) => b.streak - a.streak).slice(0, 3);

  const QUOTES = ['"Focus is the art of knowing what to ignore."', '"Small daily improvements lead to stunning results."', '"Discipline is choosing between what you want now and what you want most."', '"The only way to predict the future is to create it."'];
  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <SkeletonLoader height={180} />
        <SkeletonLoader height={60} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonLoader height={180} />
          <SkeletonLoader height={180} />
        </div>
        <SkeletonLoader height={140} />
        <div className="grid grid-cols-3 gap-6">
          <SkeletonLoader height={100} />
          <SkeletonLoader height={100} />
          <SkeletonLoader height={100} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8 max-w-full">
      {/* Sync Error Banner */}
      {syncError && (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex justify-between items-center animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-red-500" />
            <span className="text-sm font-bold text-text-main">{syncError}</span>
          </div>
          <button onClick={retrySync} className="bg-accent-blue hover:bg-accent-blue/90 px-4 py-2 rounded-xl text-xs font-black text-white transition-all active:scale-95 shadow-md shadow-accent-blue/20">
            Retry
          </button>
        </div>
      )}

      {/* Header */}
      <header className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-text-main tracking-tight leading-tight">
            Hey, {displayName} 👋
          </h1>
          <p className="text-sm text-text-muted font-medium italic opacity-80">{quote}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="w-11 h-11 rounded-xl bg-bg-card border border-border-light flex items-center justify-center text-text-main hover:bg-bg-input transition-all active:scale-90 shadow-sm">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <div className="relative">
            <button onClick={() => setShowSignOut(!showSignOut)} className="w-11 h-11 rounded-xl bg-bg-dark-elem flex items-center justify-center text-text-inverted font-black text-lg hover:opacity-90 transition-all active:scale-90 shadow-md">
              {initial}
            </button>
            {showSignOut && (
              <div className="absolute top-14 right-0 bg-bg-card border border-border-light p-2 rounded-2xl shadow-float min-w-[200px] z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-3 border-b border-border-light mb-1">
                  <p className="text-xs font-black text-text-main">{displayName}</p>
                  <p className="text-[10px] font-bold text-text-muted truncate">{user?.email}</p>
                </div>
                <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors font-bold text-sm">
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Left/Main Column */}
        <div className="lg:col-span-8 flex flex-col gap-6 lg:gap-8">
          
          {/* Discipline Hero Card */}
          <section className="bg-linear-to-br from-bg-dark-elem to-[#1e1e1e] rounded-[32px] p-6 md:p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
              <Trophy size={200} className="text-white" />
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.15em] mb-1">Current Rank</p>
                  <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter">{userLevel}</h2>
                </div>
                <div className="text-right">
                  <div className="text-4xl md:text-5xl font-black text-white leading-none tracking-tighter">{disciplineScore}</div>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mt-1">Discipline Score</p>
                </div>
              </div>
              <div className="h-2.5 bg-white/10 rounded-full overflow-hidden mb-6">
                <div 
                  className="h-full bg-accent-blue rounded-full transition-all duration-[1.5s] ease-out shadow-[0_0_15px_rgba(77,124,255,0.5)]"
                  style={{ width: `${disciplineScore}%` }}
                />
              </div>
              {insights.length > 0 && (
                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                  <Sparkles size={18} className="text-accent-blue shrink-0 animate-pulse" />
                  <p className="text-sm font-semibold text-white/90 leading-snug">{insights[0]}</p>
                </div>
              )}
            </div>
          </section>

          {/* Alert Banners (Stacked) */}
          {alerts.length > 0 && (
            <div className="flex flex-col gap-3">
              {alerts.map((alert, i) => {
                const colors = {
                  danger: "bg-red-500/10 border-red-500/20 text-red-500",
                  warning: "bg-amber-500/10 border-amber-500/20 text-amber-500",
                  success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
                  info: "bg-accent-blue/10 border-accent-blue/20 text-accent-blue"
                };
                const colorClass = colors[alert.type] || colors.info;
                return (
                  <div key={i} className={`${colorClass} flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all hover:scale-[1.01]`}>
                    {alert.type === 'danger' && <AlertCircle size={20} className="shrink-0" />}
                    {alert.type === 'warning' && <AlertTriangle size={20} className="shrink-0" />}
                    {(alert.type === 'success' || alert.type === 'info') && <Sparkles size={20} className="shrink-0" />}
                    <p className="text-sm font-bold text-text-main leading-relaxed">{alert.message}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Accuracy + Focus Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Accuracy Card */}
            <div className="bg-bg-card rounded-3xl p-8 shadow-sm border border-border-light flex flex-col items-center gap-5 hover:shadow-md transition-shadow">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Today's Accuracy</p>
              <div className="relative w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 124 124">
                  <circle cx="62" cy="62" r={R} fill="none" className="stroke-bg-input" strokeWidth="10" />
                  <circle 
                    cx="62" cy="62" r={R} fill="none" stroke={accColor} strokeWidth="10"
                    strokeDasharray={CIRC} strokeDashoffset={accOffset} strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-text-main tracking-tighter">{accuracy}%</span>
                </div>
              </div>
              <div className="px-4 py-1.5 rounded-full bg-bg-input border border-border-light">
                <p className="text-xs font-black" style={{ color: accColor }}>
                  {accuracy >= 80 ? 'Elite Performance' : accuracy >= 50 ? 'Steady Progress' : 'Recovery Needed'}
                </p>
              </div>
            </div>

            {/* Deep Work Card */}
            <div className="bg-bg-dark-elem rounded-3xl p-8 shadow-xl flex flex-col justify-between group hover:scale-[1.02] transition-transform">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em]">Deep Work</p>
              <div className="my-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-text-inverted tracking-tighter leading-none">
                    {String(focusHrs).padStart(2, '0')}:{String(focusMins).padStart(2, '0')}
                  </span>
                  <span className="text-sm text-white/40 font-black uppercase tracking-widest">hrs</span>
                </div>
                {focusDelta !== null && (
                  <div className={`mt-4 flex items-center gap-2 text-sm font-black ${focusDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {focusDelta >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span>{focusDelta >= 0 ? '+' : ''}{focusDelta}% vs yday</span>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setView('focus')}
                className="w-full bg-white/10 hover:bg-white/20 px-5 py-3.5 rounded-2xl text-text-inverted text-sm font-black transition-all flex justify-between items-center group-hover:bg-accent-blue group-hover:shadow-lg group-hover:shadow-accent-blue/30"
              >
                Start Session <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Goal Progress List */}
          <section className="space-y-5">
            <div className="flex justify-between items-end px-2">
              <div className="space-y-1">
                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Active Goals</h3>
                <p className="text-xl font-black text-text-main tracking-tight">Main Targets</p>
              </div>
              <button onClick={() => setView('goals')} className="text-xs font-black text-accent-blue hover:underline underline-offset-4">View All Systems</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              {goals.slice(0, 4).map(goal => {
                const habitsTotal = goal.habits.length;
                const dailyProgress = calculateGoalDailyProgress(goal);
                const achieved = dailyProgress === 100;
                const habitsDone = goal.habits.filter(isHabitDoneToday).length;
                const targetReq = goal.mode === 'ANY' ? 1 : (goal.mode === 'CUSTOM' ? (goal.minHabits || 1) : habitsTotal);
                const habitAccuracy = Math.min(100, Math.round((habitsDone / (targetReq || 1)) * 100));
                const ruleLabel = goal.mode === 'ANY' ? 'Any Rule' : goal.mode === 'CUSTOM' ? `Min ${goal.minHabits} Rule` : 'All Habits Rule';

                return (
                  <div key={goal.id} className={`bg-bg-card rounded-[28px] p-6 shadow-sm border-2 transition-all hover:shadow-md ${achieved ? 'border-emerald-500/30' : 'border-border-light hover:border-accent-blue/30'}`}>
                    <div className="flex justify-between items-start mb-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-lg text-text-main tracking-tight truncate max-w-[140px]">{goal.title}</p>
                          {achieved && <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Done</span>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[9px] font-bold text-text-muted bg-bg-input px-2 py-0.5 rounded-md uppercase tracking-widest">{ruleLabel}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-2xl font-black leading-none tracking-tighter ${achieved ? 'text-emerald-500' : 'text-accent-blue'}`}>{habitAccuracy}%</span>
                        <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mt-0.5">Grit Score</p>
                      </div>
                    </div>

                    <div className="h-2 bg-bg-input rounded-full overflow-hidden mb-4">
                      <div 
                        className={`h-full rounded-full transition-all duration-700 ${achieved ? 'bg-emerald-500' : 'bg-accent-blue'}`}
                        style={{ width: `${achieved ? 100 : dailyProgress}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-border-light">
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Mastery</span>
                      <span className="text-sm font-black text-text-main tracking-tighter">{goal.progress || 0}%</span>
                    </div>
                  </div>
                );
              })}
              {goals.length === 0 && (
                <div onClick={() => setView('goals')} className="col-span-full py-16 text-center border-2 border-dashed border-border-med rounded-[32px] cursor-pointer hover:bg-bg-input transition-colors space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-bg-input flex items-center justify-center mx-auto mb-2">
                    <Target className="text-text-muted" size={24} />
                  </div>
                  <p className="font-black text-text-main">No systems defined</p>
                  <p className="text-sm text-text-muted font-bold">Forge your first goal to start tracking.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column / Sidebar Dashboard Content */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8">
          
          {/* Weekly Performance Widget */}
          <WeeklyReportCard report={weeklyReport} />

          {/* Consistency Heatmap Widget */}
          <WeeklyHeatmap focusHistory={focusHistory} taskLogs={taskLogs} accuracy={accuracy} />

          {/* Task Stats Widget */}
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-4">
            {[
              { label: 'Total Units', val: totalItems, icon: <Zap size={18} className="text-accent-blue" />, color: "text-accent-blue" },
              { label: 'Completed', val: completedItems, icon: <CheckCircle2 size={18} className="text-emerald-500" />, color: "text-emerald-500" },
              { label: 'Max Peak', val: Math.max(totalItems, completedItems), icon: <Clock size={18} className="text-orange-500" />, color: "text-orange-500" },
            ].map((s, i) => (
              <div key={i} className="bg-bg-card rounded-3xl p-5 shadow-sm border border-border-light flex flex-col lg:flex-row items-center lg:items-center justify-between gap-2 lg:gap-4 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-bg-input flex items-center justify-center shrink-0">
                  {s.icon}
                </div>
                <div className="text-center lg:text-right">
                  <p className="text-2xl font-black text-text-main tracking-tighter leading-none">{s.val}</p>
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Streak Leaders Widget */}
          {topStreaks.length > 0 && (
            <section className="bg-bg-card rounded-[32px] p-6 shadow-sm border border-border-light">
              <div className="flex items-center gap-2 mb-6">
                <Zap size={18} className="text-orange-500" fill="currentColor" />
                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Streak Power</h3>
              </div>
              <div className="flex flex-col gap-3">
                {topStreaks.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-bg-input/50 border border-border-light hover:bg-bg-input transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-6 rounded-full ${i === 0 ? 'bg-orange-500' : 'bg-text-muted/30'}`} />
                      <div>
                        <p className="text-sm font-black text-text-main truncate max-w-[120px]">{s.name}</p>
                        <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{s.tag}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {s.missed >= 2 && (
                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Vulnerable" />
                      )}
                      <span className="text-base font-black text-orange-500 group-hover:scale-110 transition-transform">🔥 {s.streak}d</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Footer Quote / Branding */}
          <div className="mt-auto pt-6 text-center lg:text-left opacity-40">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-loose">
              © 2026 GoalForge Strategy <br/>
              Advanced Productivity Suite
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

