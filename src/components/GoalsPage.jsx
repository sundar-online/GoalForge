import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Target, Plus, ChevronDown, ChevronUp, Trash2, Clock, Check, Layers } from 'lucide-react';

const TAG_COLORS = {
  Engineering: { bg: 'var(--accent-blue-light)', color: 'var(--accent-blue)' },
  Learning:    { bg: 'rgba(234, 88, 12, 0.1)',   color: '#ea580c' },
  Fitness:     { bg: 'rgba(22, 163, 74, 0.1)',   color: '#16a34a' },
  Creative:    { bg: 'rgba(147, 51, 234, 0.1)',  color: '#9333ea' },
  Business:    { bg: 'rgba(217, 119, 6, 0.1)',   color: '#d97706' },
  General:     { bg: 'var(--bg-input)',          color: 'var(--text-muted)' },
};

const isGoalDoneToday = (goal) => {
  if (!goal.habits || goal.habits.length === 0) return false;
  const doneHabitsCount = goal.habits.filter(h => {
    if (h.type === 'check') return h.completed;
    if (h.type === 'count') return (h.currentCount || 0) >= (h.targetCount || 10);
    return (h.timeSpent || 0) >= (h.targetTime || 15);
  }).length;
  
  if (goal.mode === 'ANY') return doneHabitsCount > 0;
  if (goal.mode === 'CUSTOM') return doneHabitsCount >= (goal.minHabits || 1);
  return doneHabitsCount === goal.habits.length; // Default ALL
};

// ── Log Time Modal ──────────────────────────────────────────
const LogTimeModal = ({ habit, goalId, onClose, logHabitTime }) => {
  const [mins, setMins] = useState(25);
  const submit = () => { logHabitTime(goalId, habit.id, mins); onClose(); };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20, backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 24, padding: '28px 24px', width: '100%', maxWidth: 340, boxShadow: 'var(--shadow-float)', border: '1px solid var(--border-light)' }}
        onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>Log Time</h3>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>{habit.title}</p>
        <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Minutes Spent</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setMins(m => Math.max(1, m - 5))}
            style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg-input)', border: 'none', cursor: 'pointer', fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>−</button>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 40, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-2px' }}>{mins}</span>
          <button onClick={() => setMins(m => m + 5)}
            style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg-input)', border: 'none', cursor: 'pointer', fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>+</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {[15, 25, 30, 45, 60].map(m => (
            <button key={m} onClick={() => setMins(m)}
              style={{ flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: mins === m ? 'var(--accent-blue)' : 'var(--bg-input)', color: mins === m ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s' }}>
              {m}m
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={onClose}
            style={{ padding: '13px', borderRadius: 14, border: 'none', background: 'var(--bg-input)', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: 'var(--text-muted)' }}>
            Cancel
          </button>
          <button onClick={submit}
            style={{ padding: '13px', borderRadius: 14, border: 'none', background: 'var(--accent-blue)', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#fff', boxShadow: '0 4px 14px rgba(77,124,255,0.3)' }}>
            Log {mins}m
          </button>
        </div>
      </div>
    </div>
  );
};

const HabitRow = ({ habit, goalId, logHabitTime, deleteHabit, toggleHabitCheck, updateHabitCount }) => {
  const [showLog, setShowLog] = useState(false);
  const isCheck = habit.type === 'check';
  const isCount = habit.type === 'count';
  
  let done = false;
  if (isCheck) done = habit.completed;
  else if (isCount) done = (habit.currentCount || 0) >= (habit.targetCount || 10);
  else done = (habit.timeSpent || 0) >= (habit.targetTime || 15);

  const target = isCount ? habit.targetCount : (habit.targetTime || 15);
  const current = isCount ? habit.currentCount : (habit.timeSpent || 0);
  const pct = Math.min(100, Math.round((current / (target || 1)) * 100));

  return (
    <>
      <div style={{ padding: '14px 16px', borderRadius: 14, background: done ? 'rgba(34,197,94,0.05)' : 'var(--bg-input)', border: `1px solid ${done ? 'rgba(34,197,94,0.2)' : 'var(--border-light)'}`, display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <button
               onClick={() => { if (isCheck) toggleHabitCheck(goalId, habit.id); }}
               style={{ width: 32, height: 32, borderRadius: 10, background: done ? '#22c55e' : 'var(--bg-card)', border: 'none', cursor: isCheck ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
            >
              {done ? <Check size={16} color="#fff" strokeWidth={3} /> : <Clock size={16} color="var(--text-muted)" />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: done ? '#22c55e' : 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{habit.title}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                {isCheck ? (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Check-based</span>
                ) : isCount ? (
                   <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{current} / {target} units done</span>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                    {current}m / {target}m
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {isCount ? (
              <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border-light)', overflow: 'hidden' }}>
                 <button onClick={() => updateHabitCount(goalId, habit.id, -1)} style={{ padding: '6px 10px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-main)', fontSize: 16, fontWeight: 700 }}>−</button>
                 <button onClick={() => updateHabitCount(goalId, habit.id, 1)} style={{ padding: '6px 10px', border: 'none', borderLeft: '1px solid var(--border-light)', background: 'none', cursor: 'pointer', color: 'var(--accent-blue)', fontSize: 16, fontWeight: 700 }}>+</button>
              </div>
            ) : !done && !isCheck && (
              <button onClick={() => setShowLog(true)}
                style={{ padding: '6px 12px', borderRadius: 10, background: 'var(--accent-blue)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#fff', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                + Log
              </button>
            )}
            <button onClick={() => deleteHabit(goalId, habit.id)}
              style={{ width: 32, height: 32, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <div style={{ background: done ? 'rgba(34,197,94,0.2)' : 'var(--border-med)', borderRadius: 999, height: 5, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: done ? '#22c55e' : 'var(--accent-blue)', transition: 'width 0.5s ease' }} />
        </div>
      </div>
      {showLog && !isCheck && !isCount && <LogTimeModal habit={habit} goalId={goalId} onClose={() => setShowLog(false)} logHabitTime={logHabitTime} />}
    </>
  );
};

export const GoalsPage = () => {
  const { goals, addGoal, deleteGoal, addHabit, deleteHabit, logHabitTime, toggleHabitCheck, updateHabitCount } = useAppContext();
  const [expandedGoal, setExpandedGoal] = useState(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(null);
  const [newGoal, setNewGoal] = useState({ title: '', tag: 'General', deadline: '', mode: 'ANY', minHabits: 1 });
  const [newHabit, setNewHabit] = useState({ title: '', type: 'time', targetTime: 15, targetCount: 10 });

  const doneGoals = goals.filter(g => g.progress === 100).length;
  const activeGoals = goals.length - doneGoals;
  const avgProgress = goals.length === 0 ? 0 : Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length);

  const submitGoal = (e) => {
    e.preventDefault();
    if (!newGoal.title.trim()) return;
    addGoal({ ...newGoal, mode: newGoal.mode || 'ANY', minHabits: newGoal.mode === 'CUSTOM' ? parseInt(newGoal.minHabits, 10) : 1 });
    setNewGoal({ title: '', tag: 'General', deadline: '', mode: 'ANY', minHabits: 1 });
    setShowAddGoal(false);
  };

  const submitHabit = (e, goalId) => {
    e.preventDefault();
    if (!newHabit.title.trim()) return;
    addHabit(goalId, { 
      title: newHabit.title, 
      type: newHabit.type, 
      targetTime: newHabit.type === 'time' ? parseInt(newHabit.targetTime, 10) : null,
      targetCount: newHabit.type === 'count' ? parseInt(newHabit.targetCount, 10) : null
    });
    setNewHabit({ title: '', type: 'time', targetTime: 15, targetCount: 10 });
    setShowAddHabit(null);
  };

  const R = 28; const CIRC = 2 * Math.PI * R;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={22} color="var(--accent-blue)" /> Goals System
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>Build habits to drive goal progress.</p>
        </div>
        <button onClick={() => setShowAddGoal(!showAddGoal)}
          style={{ width: 40, height: 40, borderRadius: 12, background: showAddGoal ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-card)', border: '1px solid var(--border-light)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Plus size={20} color={showAddGoal ? '#ef4444' : 'var(--text-main)'} style={{ transform: showAddGoal ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s' }} />
        </button>
      </div>

      {/* Analytics Bar */}
      <div style={{ background: 'var(--bg-dark-elem)', borderRadius: 20, padding: '18px 20px', display: 'flex', justifyContent: 'space-between', border: '1px solid var(--border-light)' }}>
        {[
          { label: 'Avg Progress', val: `${avgProgress}%` },
          { label: 'Completed', val: doneGoals },
          { label: 'Active', val: activeGoals },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 3px', fontSize: 20, fontWeight: 900, color: 'var(--text-inverted)', letterSpacing: '-0.5px' }}>{s.val}</p>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add Goal Form */}
      {showAddGoal && (
        <form onSubmit={submitGoal} style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '20px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: 14, border: '1px solid var(--border-light)' }}>
          <input autoFocus required type="text" value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
            placeholder="Goal title…"
            style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', border: 'none', borderBottom: '2px solid var(--border-med)', padding: '6px 0 10px', outline: 'none', background: 'transparent' }} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Category</p>
              <select value={newGoal.tag} onChange={e => setNewGoal({ ...newGoal, tag: e.target.value })}
                style={{ width: '100%', background: 'var(--bg-input)', border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', outline: 'none', cursor: 'pointer' }}>
                {Object.keys(TAG_COLORS).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Target Date</p>
              <input type="date" value={newGoal.deadline} onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })}
                style={{ width: '100%', background: 'var(--bg-input)', border: 'none', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', outline: 'none', colorScheme: 'var(--bg-app) === "#0b0c10" ? "dark" : "light"' }} />
            </div>
          </div>

          <div>
            <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Daily Habit Mode</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['ANY', 'ALL', 'CUSTOM'].map(m => (
                <div key={m} onClick={() => setNewGoal({ ...newGoal, mode: m })}
                  style={{ flex: 1, padding: '10px', borderRadius: 12, cursor: 'pointer', textAlign: 'center', background: newGoal.mode === m ? 'var(--accent-blue-light)' : 'var(--bg-input)', color: newGoal.mode === m ? 'var(--accent-blue)' : 'var(--text-muted)', border: `2px solid ${newGoal.mode === m ? 'var(--accent-blue)' : 'transparent'}`, transition: 'all 0.15s' }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 800 }}>{m}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 9, fontWeight: 600, opacity: 0.8 }}>
                    {m === 'ANY' ? '1+' : m === 'ALL' ? 'All' : 'Set min'}
                  </p>
                </div>
              ))}
            </div>
            {newGoal.mode === 'CUSTOM' && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                 <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>Minimum habits to complete:</p>
                 <input type="number" min="1" value={newGoal.minHabits} onChange={e => setNewGoal({ ...newGoal, minHabits: e.target.value })}
                  style={{ width: 60, padding: '8px', borderRadius: 8, border: 'none', background: 'var(--bg-input)', color: 'var(--text-main)', fontWeight: 700 }} />
              </div>
            )}
          </div>

          <button type="submit" style={{ background: 'var(--bg-dark-elem)', color: 'var(--text-inverted)', border: '1px solid var(--border-light)', borderRadius: 12, padding: '13px', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 4 }}>
            Create Goal
          </button>
        </form>
      )}

      {/* Goal Cards */}
      {goals.map(goal => {
        const tc = TAG_COLORS[goal.tag] || TAG_COLORS.General;
        const isOpen = expandedGoal === goal.id;
        const habitsDoneToday = goal.habits.filter(h => {
          if (h.type === 'check') return h.completed;
          if (h.type === 'count') return (h.currentCount || 0) >= (h.targetCount || 10);
          return (h.timeSpent || 0) >= (h.targetTime || 15);
        }).length;
        const goalOffset = CIRC - (CIRC * (goal.progress || 0)) / 100;
        const mode = goal.mode || 'ANY';
        const doneToday = isGoalDoneToday(goal);

        return (
          <div key={goal.id} style={{ background: 'var(--bg-card)', borderRadius: 22, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: `2px solid ${doneToday ? '#22c55e' : 'var(--border-light)'}`, transition: 'all 0.3s' }}>
            {/* Completion Banner */}
            {doneToday && (
              <div style={{ background: '#22c55e', padding: '6px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'white', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Check size={12} strokeWidth={4} /> Completed for today
                </p>
              </div>
            )}

            {/* Goal Header */}
            <div style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
              onClick={() => setExpandedGoal(isOpen ? null : goal.id)}>
              {/* Mini Ring */}
              <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
                <svg width="68" height="68" viewBox="0 0 68 68" style={{ display: 'block' }}>
                  <circle cx="34" cy="34" r={R - 4} fill="var(--bg-card)" />
                  <circle cx="34" cy="34" r={R} fill="none" stroke="var(--border-light)" strokeWidth="7" transform="rotate(-90 34 34)" />
                  <circle cx="34" cy="34" r={R} fill="none" stroke={doneToday ? '#22c55e' : 'var(--text-main)'} strokeWidth="7"
                    strokeDasharray={CIRC} strokeDashoffset={goalOffset} strokeLinecap="round"
                    transform="rotate(-90 34 34)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-main)' }}>{goal.progress || 0}%</span>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: tc.color, background: tc.bg, padding: '3px 9px', borderRadius: 999 }}>{goal.tag}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--bg-input)', color: 'var(--text-main)', padding: '3px 9px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Layers size={10} /> Mode: {mode} {mode === 'CUSTOM' && `(${goal.minHabits})`}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goal.title}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>
                    Deadline: {goal.deadline || 'Not set'}
                  </p>
                  {(goal.streak || 0) > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: '#f97316' }}>🔥 {goal.streak}d streak</span>}
                  {(goal.missedDays || 0) >= 2 && <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>⚠️ {goal.missedDays} missed</span>}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <button onClick={e => { e.stopPropagation(); deleteGoal(goal.id); }}
                  style={{ width: 32, height: 32, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}>
                  <Trash2 size={14} />
                </button>
                {isOpen ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
              </div>
            </div>

            {/* Expanded: Habits List */}
            {isOpen && (
              <div style={{ borderTop: '1px solid var(--border-light)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Daily Habits</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-main)' }}>{habitsDoneToday}/{goal.habits.length} done</span>
                </div>

                {goal.habits.length === 0 && (
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
                    No habits yet. Add one below!
                  </p>
                )}
                {goal.habits.map(h => (
                  <HabitRow key={h.id} habit={h} goalId={goal.id} logHabitTime={logHabitTime} deleteHabit={deleteHabit} toggleHabitCheck={toggleHabitCheck} updateHabitCount={updateHabitCount} />
                ))}

                {/* Add Habit */}
                {showAddHabit === goal.id ? (
                  <form onSubmit={e => submitHabit(e, goal.id)} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input autoFocus required type="text" value={newHabit.title} onChange={e => setNewHabit({ ...newHabit, title: e.target.value })}
                      placeholder="Habit name (e.g. Reading)"
                      style={{ border: '2px solid var(--accent-blue)', borderRadius: 12, padding: '10px 14px', fontSize: 14, fontWeight: 600, color: 'var(--text-main)', outline: 'none', background: 'var(--bg-card)' }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select value={newHabit.type} onChange={e => setNewHabit({ ...newHabit, type: e.target.value })} style={{ flex: 1, border: '1px solid var(--border-med)', borderRadius: 12, padding: '10px 12px', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none', cursor: 'pointer' }}>
                        <option value="time">⏱️ Time-based</option>
                        <option value="check">✅ Check-based</option>
                        <option value="count">🔢 Count-based</option>
                      </select>
                      {newHabit.type === 'time' && (
                        <input type="number" min="1" value={newHabit.targetTime} onChange={e => setNewHabit({ ...newHabit, targetTime: e.target.value })} placeholder="Mins" style={{ width: 80, border: '1px solid var(--border-med)', borderRadius: 12, padding: '10px 12px', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }} />
                      )}
                      {newHabit.type === 'count' && (
                        <input type="number" min="1" value={newHabit.targetCount} onChange={e => setNewHabit({ ...newHabit, targetCount: e.target.value })} placeholder="Target (e.g. 50)" style={{ width: 100, border: '1px solid var(--border-med)', borderRadius: 12, padding: '10px 12px', fontSize: 13, background: 'var(--bg-card)', color: 'var(--text-main)', outline: 'none' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit"
                        style={{ flex: 1, padding: '10px 16px', borderRadius: 12, background: 'var(--accent-blue)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        Add Habit
                      </button>
                      <button type="button" onClick={() => { setShowAddHabit(null); setNewHabit({ title: '', type: 'time', targetTime: 15 }); }}
                        style={{ padding: '10px 16px', borderRadius: 12, background: 'var(--bg-input)', border: 'none', color: 'var(--text-muted)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                        ✕ Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button onClick={() => setShowAddHabit(goal.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'var(--accent-blue-light)', border: '1.5px dashed var(--accent-blue)', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--accent-blue)', width: '100%', marginTop: 4 }}>
                    <Plus size={16} /> Add Habit (min. 15 min/day)
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {goals.length === 0 && !showAddGoal && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <Target size={48} strokeWidth={1.5} style={{ display: 'block', margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>No goals yet. Create one!</p>
        </div>
      )}
    </div>
  );
};
