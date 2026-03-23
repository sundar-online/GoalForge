import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, AlertCircle, TrendingUp, TrendingDown, CheckCircle2, Clock, Zap, LogOut, Moon, Sun } from 'lucide-react';

export const Dashboard = ({ setView }) => {
  const {
    goals, accuracy, alerts,
    totalItems, completedItems,
    completedHabits, completedTasks,
    todayTasks, allHabits,
    focusTime, focusHistory,
    theme, toggleTheme
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
  // Make the ring color bright in dark mode for contrast if needed, but these hexes are fine for both
  const accColor = accuracy >= 80 ? '#22c55e' : accuracy >= 50 ? 'var(--accent-blue)' : '#f97316';

  const topStreaks = goals
    .map(g => ({ name: g.title, tag: g.tag, streak: g.streak || 0, missed: g.missedDays || 0 }))
    .filter(g => g.streak > 0 || g.missed > 0)
    .sort((a, b) => b.streak - a.streak).slice(0, 3);

  const QUOTES = ['"Focus is the art of knowing what to ignore."', '"Small daily improvements lead to stunning results."', '"Discipline is choosing between what you want now and what you want most."', '"The only way to predict the future is to create it."'];
  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

      {/* Alert Banners */}
      {alerts.map((alert, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 16px', borderRadius: 16,
          background: alert.type === 'danger' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${alert.type === 'danger' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
        }}>
          {alert.type === 'danger'
            ? <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
            : <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 1 }} />}
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: alert.type === 'danger' ? '#ef4444' : '#f59e0b', lineHeight: 1.4 }}>
            {alert.message}
          </p>
        </div>
      ))}

      {/* Accuracy + Focus Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 22, padding: '20px 16px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, border: '1px solid var(--border-light)' }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Accuracy</p>
          <div style={{ position: 'relative', width: 130, height: 130 }}>
            <svg width="130" height="130" viewBox="0 0 130 130" style={{ display: 'block' }}>
              <circle cx="65" cy="65" r={R - 10} fill="var(--bg-card)" />
              <circle cx="65" cy="65" r={R} fill="none" stroke="var(--border-light)" strokeWidth="9" transform="rotate(-90 65 65)" />
              <circle cx="65" cy="65" r={R} fill="none" stroke={accColor} strokeWidth="9"
                strokeDasharray={CIRC} strokeDashoffset={accOffset} strokeLinecap="round"
                transform="rotate(-90 65 65)" style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-1px', lineHeight: 1 }}>{accuracy}%</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Today</span>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: accColor }}>
            {accuracy >= 80 ? '🔥 On fire!' : accuracy >= 50 ? '💪 Keep going' : '⚠️ Low productivity'}
          </p>
        </div>

        <div style={{ background: 'var(--bg-dark-elem)', borderRadius: 22, padding: '20px 16px', boxShadow: 'var(--shadow-float)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Focus Time</p>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontSize: 40, fontWeight: 900, color: 'var(--text-inverted)', letterSpacing: '-2px', lineHeight: 1 }}>
                {String(focusHrs).padStart(2, '0')}:{String(focusMins).padStart(2, '0')}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>hrs</span>
            </div>
            {focusDelta !== null && (
              <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, color: focusDelta >= 0 ? '#4ade80' : '#f87171' }}>
                {focusDelta >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {focusDelta >= 0 ? '+' : ''}{focusDelta}% vs yesterday
              </p>
            )}
          </div>
          <button onClick={() => setView('focus')}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 10, padding: '8px 12px', color: 'var(--text-inverted)', fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
            Start Session →
          </button>
        </div>
      </div>

      {/* Task Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Total', val: totalItems, icon: <Zap size={14} color="var(--accent-blue)" /> },
          { label: 'Done', val: completedItems, icon: <CheckCircle2 size={14} color="#22c55e" /> },
          { label: 'Pending', val: totalItems - completedItems, icon: <Clock size={14} color="#f97316" /> },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '14px 12px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{s.icon}</div>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-1px' }}>{s.val}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Goal Progress Snapshot */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Goal Progress</span>
          <button onClick={() => setView('goals')} style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer' }}>View All</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {goals.slice(0, 2).map(goal => {
            const habitsTotal = goal.habits.length;
            const habitsDone = goal.habits.filter(h => (h.timeSpent || 0) >= 15).length;
            return (
              <div key={goal.id} style={{ background: 'var(--bg-card)', borderRadius: 18, padding: '16px 18px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--text-main)' }}>{goal.title}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                      {habitsDone}/{habitsTotal} habits done today
                    </p>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent-blue)' }}>{goal.progress}%</span>
                </div>
                <div style={{ background: 'var(--bg-input)', borderRadius: 999, height: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${goal.progress}%`, height: '100%', borderRadius: 999, background: 'var(--accent-blue)', transition: 'width 1s ease' }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Streak Leaders */}
      {topStreaks.length > 0 && (
        <section>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 12 }}>Top Streaks</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topStreaks.map((s, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '12px 16px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>{s.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>{s.tag}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.missed >= 2 && <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', background: 'rgba(245, 158, 11, 0.1)', padding: '3px 8px', borderRadius: 6 }}>⚠️ At risk</span>}
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#f97316' }}>🔥 {s.streak}d</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
