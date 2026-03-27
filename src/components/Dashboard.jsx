import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { calculateGoalDailyProgress } from '../utils/calculationUtils';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, AlertCircle, TrendingUp, TrendingDown, CheckCircle2, Clock, Zap, LogOut, Moon, Sun, Sparkles, Trophy, ChevronRight } from 'lucide-react';
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
  const accColor = accuracy >= 80 ? '#22c55e' : accuracy >= 50 ? 'var(--accent-blue)' : '#f97316';

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 100 }}>
      {/* Sync Error Banner */}
      {syncError && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          padding: '12px 16px',
          borderRadius: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={16} color="#ef4444" />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>{syncError}</span>
          </div>
          <button onClick={retrySync} style={{
            background: 'var(--accent-blue)',
            border: 'none',
            padding: '6px 14px',
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 800,
            color: 'white',
            cursor: 'pointer'
          }}>Retry</button>
        </div>
      )}
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.8px', lineHeight: 1.1 }}>
            {displayName} 👋
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>{quote}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={toggleTheme}
            style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-main)', transition: 'background 0.2s' }}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowSignOut(!showSignOut)}
              style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--bg-dark-elem)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: 'var(--text-inverted)', flexShrink: 0 }}>
              {initial}
            </button>
            {showSignOut && (
              <div style={{ position: 'absolute', top: 50, right: 0, background: 'var(--bg-card)', borderRadius: 16, boxShadow: 'var(--shadow-float)', padding: '8px', minWidth: 180, zIndex: 50, border: '1px solid var(--border-light)' }}>
                <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border-light)', marginBottom: 4 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>{displayName}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{user?.email}</p>
                </div>
                <button onClick={signOut}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#ef4444' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <SkeletonLoader height={180} />
          <SkeletonLoader height={60} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <SkeletonLoader height={180} />
            <SkeletonLoader height={180} />
          </div>
          <SkeletonLoader height={140} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <SkeletonLoader height={100} />
            <SkeletonLoader height={100} />
            <SkeletonLoader height={100} />
          </div>
        </div>
      ) : (
        <>
          {/* Discipline Hero Card */}
          <section style={{ 
            background: 'linear-gradient(135deg, var(--bg-dark-elem) 0%, #1e1e1e 100%)', 
            borderRadius: 28, 
            padding: '24px', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
              <Trophy size={160} color="white" />
            </div>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Current Rank</p>
                  <h2 style={{ margin: '4px 0 0', fontSize: 32, fontWeight: 900, letterSpacing: '-1px' }}>{userLevel}</h2>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1 }}>{disciplineScore}</div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>DISCIPLINE SCORE</p>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', height: 8, borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${disciplineScore}%`, height: '100%', background: 'var(--accent-blue)', transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
              </div>
              {insights.length > 0 && (
                <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: 16 }}>
                  <Sparkles size={16} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{insights[0]}</p>
                </div>
              )}
            </div>
          </section>

          {/* Alert Banners */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map((alert, i) => {
              const colors = {
                danger: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
                warning: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b' },
                success: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.2)', text: '#22c55e' },
                info: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)', text: 'var(--accent-blue)' }
              };
              const c = colors[alert.type] || colors.info;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 16px', borderRadius: 18,
                  background: c.bg, border: `1px solid ${c.border}`,
                }}>
                  {alert.type === 'danger' && <AlertCircle size={18} color={c.text} style={{ flexShrink: 0 }} />}
                  {alert.type === 'warning' && <AlertTriangle size={18} color={c.text} style={{ flexShrink: 0 }} />}
                  {(alert.type === 'success' || alert.type === 'info') && <Sparkles size={18} color={c.text} style={{ flexShrink: 0 }} />}
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.4 }}>
                    {alert.message}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Accuracy + Focus Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ background: 'var(--bg-card)', borderRadius: 24, padding: '24px 16px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, border: '1px solid var(--border-light)' }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Today's Accuracy</p>
              <div style={{ position: 'relative', width: 124, height: 124 }}>
                <svg width="124" height="124" viewBox="0 0 124 124" style={{ display: 'block' }}>
                  <circle cx="62" cy="62" r={R} fill="none" stroke="var(--bg-input)" strokeWidth="10" transform="rotate(-90 62 62)" />
                  <circle cx="62" cy="62" r={R} fill="none" stroke={accColor} strokeWidth="10"
                    strokeDasharray={CIRC} strokeDashoffset={accOffset} strokeLinecap="round"
                    transform="rotate(-90 62 62)" style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: 32, fontWeight: 950, color: 'var(--text-main)', letterSpacing: '-1px', lineHeight: 1 }}>{accuracy}%</span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: accColor }}>
                {accuracy >= 80 ? 'Elite Performance' : accuracy >= 50 ? 'Steady Progress' : 'Recovery Needed'}
              </p>
            </div>

            <div style={{ background: 'var(--bg-dark-elem)', borderRadius: 24, padding: '24px 16px', boxShadow: 'var(--shadow-float)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Deep Work</p>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ fontSize: 42, fontWeight: 950, color: 'var(--text-inverted)', letterSpacing: '-2px', lineHeight: 1 }}>
                    {String(focusHrs).padStart(2, '0')}:{String(focusMins).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>hrs</span>
                </div>
                {focusDelta !== null && (
                  <p style={{ margin: '8px 0 0', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4, color: focusDelta >= 0 ? '#4ade80' : '#f87171' }}>
                    {focusDelta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    {focusDelta >= 0 ? '+' : ''}{focusDelta}% vs yday
                  </p>
                )}
              </div>
              <button onClick={() => setView('focus')}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 12, padding: '10px 14px', color: 'var(--text-inverted)', fontSize: 12, fontWeight: 800, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
                Start Session <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Weekly Report Analytics */}
          <WeeklyReportCard report={weeklyReport} />

          {/* Heatmap */}
          <WeeklyHeatmap focusHistory={focusHistory} taskLogs={taskLogs} />

          {/* Task Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Units', val: totalItems, icon: <Zap size={14} color="var(--accent-blue)" /> },
              { label: 'Done', val: completedItems, icon: <CheckCircle2 size={14} color="#22c55e" /> },
              { label: 'Peak', val: Math.max(totalItems, completedItems), icon: <Clock size={14} color="#f97316" /> },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '16px 12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{s.icon}</div>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 950, color: 'var(--text-main)', letterSpacing: '-1px' }}>{s.val}</p>
                <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Goal Progress Snapshot */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Active Goals</span>
              <button onClick={() => setView('goals')} style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>View All</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {goals.slice(0, 2).map(goal => {
                const habitsTotal = goal.habits.length;
                const dailyProgress = calculateGoalDailyProgress(goal);
                const habitsDone = goal.habits.filter(h => {
                  if (h.type === 'check') return h.completed;
                  if (h.type === 'count') return (h.currentCount || 0) >= (h.targetCount || 10);
                  return (h.timeSpent || 0) >= (h.targetTime || 15);
                }).length;

                return (
                  <div key={goal.id} style={{ background: 'var(--bg-card)', borderRadius: 22, padding: '20px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: 'var(--text-main)' }}>{goal.title}</p>
                          {Math.max(0, ...goal.habits.map(h => h.streak || 0)) >= 3 && 
                            <span style={{ fontSize: 10, fontWeight: 800, color: '#f97316' }}>
                              🔥 {Math.max(...goal.habits.map(h => h.streak || 0))}d
                            </span>
                          }
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                          {habitsDone}/{habitsTotal} daily habits
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 900, fontSize: 18, color: dailyProgress === 100 ? '#22c55e' : 'var(--accent-blue)' }}>{dailyProgress}%</span>
                        <p style={{ margin: 0, fontSize: 8, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mastery: {goal.progress || 0}%</p>
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-input)', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${dailyProgress}%`, height: '100%', borderRadius: 999, background: dailyProgress === 100 ? '#22c55e' : 'var(--accent-blue)', transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                    </div>
                  </div>
                );
              })}
              {goals.length === 0 && (
                 <div onClick={() => setView('goals')} style={{ padding: '40px', textAlign: 'center', border: '2px dashed var(--border-light)', borderRadius: 22, color: 'var(--text-muted)', cursor: 'pointer' }}>
                   <p style={{ margin: 0, fontWeight: 700 }}>No goals defined.</p>
                   <p style={{ margin: '4px 0 0', fontSize: 12 }}>Forge your first one today.</p>
                 </div>
              )}
            </div>
          </section>

          {/* Streak Leaders */}
          {topStreaks.length > 0 && (
            <section style={{ marginTop: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 14 }}>Streak Power</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topStreaks.map((s, i) => (
                  <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 18, padding: '14px 18px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                       <div style={{ width: 8, height: 8, borderRadius: 2, background: i === 0 ? 'var(--accent-blue)' : 'var(--text-muted)' }} />
                       <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>{s.name}</p>
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{s.tag}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s.missed >= 2 && <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '4px 8px', borderRadius: 8 }}>VULNERABLE</span>}
                      <span style={{ fontSize: 15, fontWeight: 900, color: '#f97316' }}>🔥 {s.streak}d</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
