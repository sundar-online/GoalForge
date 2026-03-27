import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Target, Plus, ChevronDown, ChevronUp, Trash2, Clock, Check, Layers, Calendar, History } from 'lucide-react';
import { isGoalDoneToday } from '../utils/calculationUtils';
import { addDays } from '../utils/dateUtils';

const TAG_COLORS = {
  Engineering: { bg: 'var(--accent-blue-light)', color: 'var(--accent-blue)' },
  Learning:    { bg: 'rgba(234, 88, 12, 0.1)',   color: '#ea580c' },
  Fitness:     { bg: 'rgba(22, 163, 74, 0.1)',   color: '#16a34a' },
  Creative:    { bg: 'rgba(147, 51, 234, 0.1)',  color: '#9333ea' },
  Business:    { bg: 'rgba(217, 119, 6, 0.1)',   color: '#d97706' },
  General:     { bg: 'var(--bg-input)',          color: 'var(--text-muted)' },
};

// ── Extend Deadline Modal ──────────────────────────────────
const ExtendDeadlineModal = ({ goal, onClose, onExtend }) => {
  const [selectedDays, setSelectedDays] = useState(7);
  const currentDeadline = goal.deadline || new Date().toISOString().split('T')[0];
  const newDeadline = addDays(currentDeadline, selectedDays);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20, backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 28, padding: '32px 28px', width: '100%', maxWidth: 380, boxShadow: 'var(--shadow-float)', border: '1px solid var(--border-light)' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Extend Deadline</h3>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>Push back the deadline for "<b>{goal.title}</b>" without losing your streak or progress.</p>
        
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Duration</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[3, 7, 30].map(d => (
              <button key={d} onClick={() => setSelectedDays(d)}
                style={{ padding: '12px 0', borderRadius: 14, border: '2px solid', borderColor: selectedDays === d ? 'var(--accent-blue)' : 'var(--bg-input)', background: selectedDays === d ? 'var(--accent-blue-light)' : 'var(--bg-input)', color: selectedDays === d ? 'var(--accent-blue)' : 'var(--text-main)', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
                +{d} Days
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--bg-input)', borderRadius: 18, padding: '16px', marginBottom: 28 }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
             <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Current Deadline</span>
             <span style={{ fontSize: 12, color: 'var(--text-main)', fontWeight: 700 }}>{goal.deadline || 'None'}</span>
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
             <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>New Deadline</span>
             <span style={{ fontSize: 13, color: 'var(--accent-blue)', fontWeight: 900 }}>{newDeadline}</span>
           </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button onClick={onClose} style={{ padding: '14px', borderRadius: 16, border: 'none', background: 'var(--bg-input)', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: 'var(--text-muted)' }}>Cancel</button>
          <button onClick={() => { onExtend(goal.id, newDeadline); onClose(); }}
            style={{ padding: '14px', borderRadius: 16, border: 'none', background: 'var(--accent-blue)', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#fff', boxShadow: '0 6px 20px rgba(77,124,255,0.3)' }}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button onClick={onClose}
            style={{ padding: '13px', borderRadius: 14, border: 'none', background: 'var(--bg-input)', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: 'var(--text-muted)' }}>
            Cancel
          </button>
          <button onClick={submit}
            style={{ padding: '13px', borderRadius: 14, border: 'none', background: 'var(--accent-blue)', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#fff' }}>
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
      <div style={{ padding: '14px 16px', borderRadius: 14, background: done ? 'rgba(34,197,94,0.05)' : 'var(--bg-input)', border: `1px solid ${done ? 'rgba(34,197,94,0.2)' : 'var(--border-light)'}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <button
               onClick={() => { if (isCheck) toggleHabitCheck(goalId, habit.id); }}
               style={{ width: 32, height: 32, borderRadius: 10, background: done ? '#22c55e' : 'var(--bg-card)', border: 'none', cursor: isCheck ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {done ? <Check size={16} color="#fff" strokeWidth={3} /> : <Clock size={16} color="var(--text-muted)" />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: done ? '#22c55e' : 'var(--text-main)', textDecoration: done ? 'line-through' : 'none' }}>{habit.title}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{current} / {target} {isCount ? 'units' : 'mins'}</p>
                {habit.streak > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#f97316' }}>🔥 {habit.streak}d</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {isCount ? (
              <div style={{ display: 'flex', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border-light)' }}>
                 <button onClick={() => updateHabitCount(goalId, habit.id, -1)} style={{ padding: '6px 10px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-main)', fontWeight: 700 }}>−</button>
                 <button onClick={() => updateHabitCount(goalId, habit.id, 1)} style={{ padding: '6px 10px', border: 'none', borderLeft: '1px solid var(--border-light)', background: 'none', cursor: 'pointer', color: 'var(--accent-blue)', fontWeight: 700 }}>+</button>
              </div>
            ) : !done && !isCheck && (
              <button onClick={() => setShowLog(true)} style={{ padding: '6px 12px', borderRadius: 10, background: 'var(--accent-blue)', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#fff' }}>+ Log</button>
            )}
            <button onClick={() => deleteHabit(goalId, habit.id)} style={{ width: 32, height: 32, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={14} /></button>
          </div>
        </div>
        <div style={{ background: done ? 'rgba(34,197,94,0.2)' : 'var(--border-med)', borderRadius: 999, height: 4, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: done ? '#22c55e' : 'var(--accent-blue)', transition: 'width 0.5s' }} />
        </div>
      </div>
      {showLog && !isCheck && !isCount && <LogTimeModal habit={habit} goalId={goalId} onClose={() => setShowLog(false)} logHabitTime={logHabitTime} />}
    </>
  );
};

export const GoalsPage = () => {
  const { goals, addGoal, deleteGoal, addHabit, deleteHabit, logHabitTime, toggleHabitCheck, updateHabitCount, extendGoalDeadline } = useAppContext();
  const [expandedGoal, setExpandedGoal] = useState(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(null);
  const [extendingGoal, setExtendingGoal] = useState(null);
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
    addHabit(goalId, { title: newHabit.title, type: newHabit.type, targetTime: Number(newHabit.targetTime), targetCount: Number(newHabit.targetCount) });
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
          style={{ width: 40, height: 40, borderRadius: 12, background: showAddGoal ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-card)', border: '1px solid var(--border-light)', cursor: 'pointer' }}>
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
        <form onSubmit={submitGoal} style={{ background: 'var(--bg-card)', borderRadius: 20, padding: '20px', display: 'flex', flexDirection: 'column', gap: 14, border: '1px solid var(--border-light)' }}>
          <input autoFocus required type="text" value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
            placeholder="Goal title..."
            style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main)', border: 'none', borderBottom: '2px solid var(--border-med)', padding: '6px 0 10px', outline: 'none', background: 'transparent' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <select value={newGoal.tag} onChange={e => setNewGoal({ ...newGoal, tag: e.target.value })} style={{ background: 'var(--bg-input)', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, color: 'var(--text-main)' }}>
              {Object.keys(TAG_COLORS).map(t => <option key={t}>{t}</option>)}
            </select>
            <input type="date" value={newGoal.deadline} onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })} style={{ background: 'var(--bg-input)', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, color: 'var(--text-main)' }} />
          </div>
          <button type="submit" style={{ background: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: 12, padding: '13px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Create Goal</button>
        </form>
      )}

      {/* Goal Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {goals.map(goal => {
          const tc = TAG_COLORS[goal.tag] || TAG_COLORS.General;
          const isOpen = expandedGoal === goal.id;
          const goalOffset = CIRC - (CIRC * (goal.progress || 0)) / 100;
          const doneToday = isGoalDoneToday(goal);

          return (
            <div key={goal.id} style={{ background: 'var(--bg-card)', borderRadius: 22, overflow: 'hidden', border: `2px solid ${doneToday ? '#22c55e' : 'var(--border-light)'}`, transition: 'all 0.3s' }}>
              <div style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }} onClick={() => setExpandedGoal(isOpen ? null : goal.id)}>
                <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
                  <svg width="68" height="68" viewBox="0 0 68 68">
                    <circle cx="34" cy="34" r={R} fill="none" stroke="var(--border-light)" strokeWidth="6" />
                    <circle cx="34" cy="34" r={R} fill="none" stroke={doneToday ? '#22c55e' : 'var(--accent-blue)'} strokeWidth="6" strokeDasharray={CIRC} strokeDashoffset={goalOffset} strokeLinecap="round" transform="rotate(-90 34 34)" style={{ transition: 'stroke-dashoffset 0.8s' }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-main)' }}>{goal.progress || 0}%</span>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: tc.color, background: tc.bg, padding: '2px 8px', borderRadius: 999 }}>{goal.tag}</span>
                    {goal.missedDays > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b' }}>⚠️ {goal.missedDays} missed</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-main)' }}>{goal.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <button onClick={(e) => { e.stopPropagation(); setExtendingGoal(goal); }} style={{ background: 'var(--bg-input)', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} /> {goal.deadline || 'No deadline'}
                    </button>
                    {goal.extensions?.length > 0 && <span title="Extension History" style={{ display: 'flex', alignItems: 'center', color: 'var(--accent-blue)', opacity: 0.6 }}><History size={12} /></span>}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={e => { e.stopPropagation(); deleteGoal(goal.id); }} style={{ width: 32, height: 32, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Trash2 size={16} /></button>
                  {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border-light)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {goal.habits.map(h => <HabitRow key={h.id} habit={h} goalId={goal.id} logHabitTime={logHabitTime} deleteHabit={deleteHabit} toggleHabitCheck={toggleHabitCheck} updateHabitCount={updateHabitCount} />)}
                  {showAddHabit === goal.id ? (
                    <form onSubmit={e => submitHabit(e, goal.id)} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <input autoFocus required type="text" value={newHabit.title} onChange={e => setNewHabit({ ...newHabit, title: e.target.value })} placeholder="New habit name..." style={{ border: 'none', borderBottom: '2px solid var(--accent-blue)', background: 'transparent', padding: '10px 0', fontSize: 14, fontWeight: 600, color: 'var(--text-main)', outline: 'none' }} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select value={newHabit.type} onChange={e => setNewHabit({ ...newHabit, type: e.target.value })} style={{ flex: 1, border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, background: 'var(--bg-input)', color: 'var(--text-main)' }}>
                          <option value="time">⏱️ Time</option>
                          <option value="check">✅ Check</option>
                          <option value="count">🔢 Count</option>
                        </select>
                        <input type="number" min="1" value={newHabit.type === 'count' ? newHabit.targetCount : newHabit.targetTime} onChange={e => setNewHabit(h => ({ ...h, [h.type === 'count' ? 'targetCount' : 'targetTime']: e.target.value }))} style={{ width: 80, border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, background: 'var(--bg-input)', color: 'var(--text-main)' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="submit" style={{ flex: 1, padding: '10px', borderRadius: 12, background: 'var(--accent-blue)', border: 'none', color: '#fff', fontWeight: 700 }}>Add</button>
                        <button type="button" onClick={() => setShowAddHabit(null)} style={{ padding: '10px', borderRadius: 12, background: 'var(--bg-input)', border: 'none', color: 'var(--text-muted)', fontWeight: 700 }}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <button onClick={() => setShowAddHabit(goal.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', borderRadius: 12, background: 'var(--bg-input)', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--accent-blue)', width: '100%' }}>
                      <Plus size={16} /> Add Daily Habit
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {extendingGoal && <ExtendDeadlineModal goal={extendingGoal} onClose={() => setExtendingGoal(null)} onExtend={extendGoalDeadline} />}
      
      {goals.length === 0 && !showAddGoal && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <Target size={48} strokeWidth={1.5} style={{ display: 'block', margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>No goals yet. Create one!</p>
        </div>
      )}
    </div>
  );
};
