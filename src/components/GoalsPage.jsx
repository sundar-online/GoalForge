import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Target, Plus, ChevronDown, ChevronUp, Trash2, Clock, Check, Layers, Calendar, History } from 'lucide-react';
import { isGoalDoneToday, calculateGoalDailyProgress } from '../utils/calculationUtils';
import { addDays } from '../utils/dateUtils';


const TAG_COLORS = {
  Engineering: { bg: 'bg-accent-blue-light', color: 'text-accent-blue' },
  Learning:    { bg: 'bg-orange-500/10',     color: 'text-orange-600' },
  Fitness:     { bg: 'bg-emerald-500/10',    color: 'text-emerald-600' },
  Creative:    { bg: 'bg-purple-500/10',     color: 'text-purple-600' },
  Business:    { bg: 'bg-amber-500/10',      color: 'text-amber-600' },
  General:     { bg: 'bg-bg-input',          color: 'text-text-muted' },
};

// ── Extend Deadline Modal ──────────────────────────────────
const ExtendDeadlineModal = ({ goal, onClose, onExtend }) => {
  const [selectedDays, setSelectedDays] = useState(7);
  const currentDeadline = goal.deadline || new Date().toISOString().split('T')[0];
  const newDeadline = addDays(currentDeadline, selectedDays);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300] p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-bg-card rounded-[32px] p-8 w-full max-w-md shadow-float border border-border-light animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-black text-text-main tracking-tight mb-2">Extend Deadline</h3>
        <p className="text-sm text-text-muted font-medium leading-relaxed mb-6">Push back the deadline for "<b>{goal.title}</b>" without losing your progress.</p>
        
        <div className="space-y-3 mb-6">
          <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Duration</p>
          <div className="grid grid-cols-3 gap-3">
            {[3, 7, 30].map(d => (
              <button key={d} onClick={() => setSelectedDays(d)}
                className={`
                  py-3.5 rounded-2xl font-bold text-sm transition-all border-2
                  ${selectedDays === d ? 'border-accent-blue bg-accent-blue-light text-accent-blue' : 'border-bg-input bg-bg-input text-text-main hover:border-border-med'}
                `}
              >
                +{d} Days
              </button>
            ))}
          </div>
        </div>

        <div className="bg-bg-input/50 rounded-[22px] p-5 space-y-3 mb-8 border border-border-light">
           <div className="flex justify-between items-center">
             <span className="text-xs font-bold text-text-muted">Current</span>
             <span className="text-sm font-black text-text-main">{goal.deadline || 'None'}</span>
           </div>
           <div className="flex justify-between items-center pt-3 border-t border-border-light/50">
             <span className="text-xs font-bold text-text-muted">New Target</span>
             <span className="text-sm font-black text-accent-blue">{newDeadline}</span>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={onClose} className="py-4 rounded-2xl bg-bg-input text-text-muted font-black text-sm hover:bg-bg-input/80 transition-colors">Cancel</button>
          <button onClick={() => { onExtend(goal.id, newDeadline); onClose(); }}
            className="py-4 rounded-2xl bg-accent-blue text-white font-black text-sm shadow-lg shadow-accent-blue/30 hover:opacity-90 active:scale-95 transition-all">
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-card rounded-[28px] p-8 w-full max-w-[340px] shadow-float border border-border-light animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-black text-text-main mb-1">Log Time</h3>
        <p className="text-sm text-text-muted font-bold mb-6">{habit.title}</p>
        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3">Minutes Spent</p>
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setMins(m => Math.max(1, m - 5))}
            className="w-12 h-12 rounded-xl bg-bg-input text-text-main text-2xl font-black hover:bg-bg-input/80 transition-colors">−</button>
          <span className="flex-1 text-center text-5xl font-black text-text-main tracking-tighter">{mins}</span>
          <button onClick={() => setMins(m => m + 5)}
            className="w-12 h-12 rounded-xl bg-bg-input text-text-main text-2xl font-black hover:bg-bg-input/80 transition-colors">+</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose} className="py-4 rounded-xl bg-bg-input text-text-muted font-black text-sm transition-colors">Cancel</button>
          <button onClick={submit} className="py-4 rounded-xl bg-accent-blue text-white font-black text-sm shadow-md shadow-accent-blue/20 transition-all active:scale-95">Log {mins}m</button>
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

  const Icon = isCheck ? Check : (isCount ? Layers : Clock);

  return (
    <>
      <div className={`
        p-4 rounded-2xl transition-all duration-300 border flex flex-col gap-3
        ${done ? 'bg-emerald-500/5 border-emerald-500/10 opacity-70' : 'bg-bg-input border-border-light hover:border-border-med'}
      `}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
               onClick={() => { if (isCheck) toggleHabitCheck(goalId, habit.id); }}
               className={`
                 w-9 h-9 shrink-0 rounded-xl border-2 flex items-center justify-center transition-all duration-200
                 ${done ? 'bg-emerald-500 border-emerald-500 scale-95' : 'bg-bg-card border-border-med cursor-pointer hover:border-accent-blue'}
                 ${!isCheck && !done ? 'cursor-default' : ''}
               `}
            >
              {done ? <Check size={18} className="text-white" strokeWidth={3} /> : (isCheck ? null : <Icon size={16} className="text-text-muted" />)}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-black tracking-tight truncate ${done ? 'text-emerald-600 line-through' : 'text-text-main'}`}>{habit.title}</p>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-wide">
                  {isCheck ? (done ? 'Completed' : 'Pending') : `${current}/${target} ${isCount ? 'units' : 'mins'}`}
                </p>
                {habit.streak > 0 && <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-md">🔥 {habit.streak}d</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {isCount ? (
              <div className="flex bg-bg-card rounded-xl border border-border-light overflow-hidden shadow-sm">
                 <button onClick={() => updateHabitCount(goalId, habit.id, -1)} className="px-3 py-1.5 text-text-main font-black hover:bg-bg-input transition-colors">−</button>
                 <button onClick={() => updateHabitCount(goalId, habit.id, 1)} className="px-3 py-1.5 text-accent-blue font-black border-l border-border-light hover:bg-bg-input transition-colors">+</button>
              </div>
            ) : (!isCheck && !done) && (
              <button onClick={() => setShowLog(true)} className="px-4 py-2 rounded-xl bg-accent-blue text-white text-[11px] font-black shadow-md shadow-accent-blue/20 active:scale-95 transition-all">+ Log</button>
            )}
            <button onClick={() => deleteHabit(goalId, habit.id)} className="w-9 h-9 rounded-xl text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all flex items-center justify-center"><Trash2 size={16} /></button>
          </div>
        </div>
        {!isCheck && (
          <div className="w-full bg-bg-card rounded-full h-1.5 overflow-hidden">
            <div className={`h-full transition-all duration-700 ${done ? 'bg-emerald-500' : 'bg-accent-blue'}`} style={{ width: `${pct}%` }} />
          </div>
        )}
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
  const [newGoal, setNewGoal] = useState({ 
    title: '', 
    tag: 'General', 
    deadline: '', 
    mode: 'ANY', 
    minHabits: 1, 
    habits: [{ id: Date.now(), title: '', type: 'time', targetTime: 15, targetCount: 10 }]
  });
  const [newHabit, setNewHabit] = useState({ title: '', type: 'time', targetTime: 15, targetCount: 10 });

  const doneGoals = goals.filter(g => g.progress === 100).length;
  const activeGoals = goals.length - doneGoals;
  const avgProgress = goals.length === 0 ? 0 : Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length);

  const submitGoal = (e) => {
    e.preventDefault();
    if (!newGoal.title.trim()) return;
    if (newGoal.habits.length === 0) return alert('Add at least one daily habit!');
    if (newGoal.habits.some(h => !h.title.trim())) return alert('Give all your habits a name!');

    addGoal({ 
      ...newGoal, 
      mode: newGoal.mode || 'ANY', 
      minHabits: newGoal.mode === 'CUSTOM' ? parseInt(newGoal.minHabits, 10) : 1 
    });
    setNewGoal({ 
      title: '', 
      tag: 'General', 
      deadline: '', 
      mode: 'ANY', 
      minHabits: 1, 
      habits: [{ id: Date.now(), title: '', type: 'time', targetTime: 15, targetCount: 10 }]
    });
    setShowAddGoal(false);
  };

  const updateStagingHabit = (id, updates) => {
    setNewGoal(prev => ({
      ...prev,
      habits: prev.habits.map(h => h.id === id ? { ...h, ...updates } : h)
    }));
  };

  const addStagingHabit = () => {
    setNewGoal(prev => ({
      ...prev,
      habits: [...prev.habits, { id: Date.now(), title: '', type: 'time', targetTime: 15, targetCount: 10 }]
    }));
  };

  const removeStagingHabit = (id) => {
    setNewGoal(prev => {
      const remaining = prev.habits.filter(h => h.id !== id);
      return {
        ...prev,
        habits: remaining,
        minHabits: Math.max(1, Math.min(prev.minHabits, remaining.length))
      };
    });
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
    <div className="flex flex-col gap-6 max-w-full">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-black text-text-main tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
              <Target size={24} className="text-accent-blue" />
            </div>
            Goals System
          </h2>
          <p className="text-sm text-text-muted font-medium ml-1">Build daily systems to drive long-term progress.</p>
        </div>
        <button onClick={() => setShowAddGoal(!showAddGoal)}
          className={`
            w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm border
            ${showAddGoal ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 rotate-45' : 'bg-bg-card border-border-light text-text-main hover:bg-bg-input'}
          `}
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Analytics Bar */}
      <div className="bg-bg-dark-elem rounded-3xl p-6 grid grid-cols-3 gap-4 border border-white/5 shadow-xl">
        {[
          { label: 'Avg Mastery', val: `${avgProgress}%`, color: 'text-accent-blue' },
          { label: 'Finished', val: doneGoals, color: 'text-emerald-400' },
          { label: 'In Progress', val: activeGoals, color: 'text-white' },
        ].map((s, i) => (
          <div key={i} className="text-center space-y-1">
            <p className={`text-2xl md:text-3xl font-black tracking-tighter ${s.color}`}>{s.val}</p>
            <p className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add Goal Form */}
      {showAddGoal && (
        <form onSubmit={submitGoal} className="bg-bg-card rounded-[32px] p-6 md:p-8 flex flex-col gap-8 border border-border-light shadow-float animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="space-y-3">
             <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Core Vision</p>
             <input autoFocus required type="text" value={newGoal.title} onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
               placeholder="What major milestone are we hitting?"
               className="w-full text-xl md:text-2xl font-black text-text-main border-none bg-bg-input p-6 rounded-2xl outline-none placeholder:text-text-muted/50 focus:ring-2 ring-accent-blue/20 transition-all" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Category</p>
              <select value={newGoal.tag} onChange={e => setNewGoal({ ...newGoal, tag: e.target.value })} className="w-full bg-bg-input border-none rounded-xl p-4 font-bold text-text-main outline-none appearance-none hover:bg-bg-input/80 transition-colors">
                {Object.keys(TAG_COLORS).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Target Date</p>
              <input type="date" value={newGoal.deadline} onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })} className="w-full bg-bg-input border-none rounded-xl p-4 font-bold text-text-main outline-none hover:bg-bg-input/80 transition-colors" />
            </div>
          </div>

          <div className="bg-bg-input/50 rounded-[28px] p-6 border border-border-light space-y-6">
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4">Forge Logic (Strategy)</p>
              <div className="grid grid-cols-3 gap-3">
                {['ALL', 'ANY', 'CUSTOM'].map(m => (
                  <button key={m} type="button" onClick={() => setNewGoal({ ...newGoal, mode: m })}
                    className={`
                      py-4 rounded-2xl font-black text-xs transition-all border-2
                      ${newGoal.mode === m ? 'border-accent-blue bg-white text-accent-blue shadow-lg shadow-accent-blue/10' : 'border-transparent bg-bg-card text-text-muted hover:border-border-med'}
                    `}
                  >
                    {m === 'ALL' ? 'Complete All' : m === 'ANY' ? 'Any One' : 'Custom'}
                  </button>
                ))}
              </div>
            </div>
            
            {newGoal.mode === 'CUSTOM' && (
              <div className="bg-bg-card rounded-2xl p-4 border border-border-light flex items-center justify-between animate-in fade-in zoom-in-95">
                <span className="text-xs font-black text-text-main">Min required habits:</span>
                <div className="flex items-center bg-bg-input rounded-xl border border-border-light overflow-hidden">
                    <button type="button" onClick={() => setNewGoal(prev => ({ ...prev, minHabits: Math.max(1, parseInt(prev.minHabits) - 1) }))} className="w-10 h-10 flex items-center justify-center font-black text-text-main hover:bg-border-light">−</button>
                    <span className="w-8 text-center text-sm font-black text-accent-blue">{newGoal.minHabits}</span>
                    <button type="button" onClick={() => setNewGoal(prev => ({ ...prev, minHabits: Math.min(prev.habits.length, parseInt(prev.minHabits) + 1) }))} className="w-10 h-10 flex items-center justify-center font-black text-accent-blue border-l border-border-light hover:bg-border-light">+</button>
                </div>
              </div>
            )}
            
            <p className="text-xs font-bold text-text-muted italic leading-relaxed px-1">
              {newGoal.mode === 'ALL' ? '⚡ Mastery increases only when EVERY habit in the system is finished today.' : 
               newGoal.mode === 'ANY' ? '🚀 Completing ANY one habit counts as a full day of progress.' : 
               `🎯 You must finish at least ${newGoal.minHabits} habit${newGoal.minHabits > 1 ? 's' : ''} daily to progress.`}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end px-1">
               <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Daily Systems</p>
               <button type="button" onClick={addStagingHabit} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-blue/10 text-accent-blue font-black text-[11px] hover:bg-accent-blue/20 transition-all">
                 <Plus size={14} strokeWidth={3} /> Add Habit
               </button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {newGoal.habits.map((h, idx) => (
                <div key={h.id} className="bg-bg-input/80 rounded-2xl p-5 border border-border-light space-y-4 relative group hover:border-border-med transition-colors">
                   <div className="flex gap-4">
                      <input required type="text" value={h.title} onChange={e => updateStagingHabit(h.id, { title: e.target.value })} placeholder={`Habit #${idx + 1}...`} className="flex-1 bg-transparent border-b-2 border-border-light p-2 font-bold text-text-main outline-none focus:border-accent-blue transition-colors" />
                      <button type="button" onClick={() => removeStagingHabit(h.id)} className="p-2 text-text-muted hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                   </div>
                   <div className="flex flex-wrap gap-3">
                      <select value={h.type} onChange={e => updateStagingHabit(h.id, { type: e.target.value })} className="flex-1 min-w-[120px] bg-bg-card rounded-xl px-4 py-2.5 text-xs font-black text-text-main border-none shadow-sm">
                        <option value="time">⏱️ Time-Based</option>
                        <option value="check">✅ Simple Check</option>
                        <option value="count">🔢 Count-Based</option>
                      </select>
                      {h.type !== 'check' && (
                        <div className="flex items-center gap-2 bg-bg-card px-4 py-2 rounded-xl shadow-sm border border-border-light/50">
                           <input type="number" min="1" value={h.type === 'count' ? h.targetCount : h.targetTime} onChange={e => updateStagingHabit(h.id, { [h.type === 'count' ? 'targetCount' : 'targetTime']: e.target.value })} className="w-12 bg-transparent text-center font-black text-accent-blue outline-none" />
                           <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{h.type === 'count' ? 'units' : 'mins'}</span>
                        </div>
                      )}
                   </div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="w-full bg-accent-blue text-white rounded-2xl py-5 font-black text-lg shadow-xl shadow-accent-blue/30 hover:shadow-2xl hover:opacity-90 active:scale-[0.98] transition-all">
            Forge New System
          </button>
        </form>
      )}

      {/* Goal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {goals
          .sort((a, b) => {
            const aDone = isGoalDoneToday(a);
            const bDone = isGoalDoneToday(b);
            if (aDone !== bDone) return aDone ? 1 : -1;
            return 0;
          })
          .map(goal => {
          const tc = TAG_COLORS[goal.tag] || TAG_COLORS.General;
          const isOpen = expandedGoal === goal.id;
          const habitsTotal = goal.habits.length;
          const dailyProgress = calculateGoalDailyProgress(goal);
          const doneToday = isGoalDoneToday(goal);

          return (
            <div key={goal.id} className={`
              bg-bg-card rounded-[32px] overflow-hidden border-2 transition-all duration-500 h-fit
              ${doneToday ? 'border-emerald-500 shadow-lg shadow-emerald-500/5' : 'border-border-light hover:border-border-med shadow-sm'}
            `}>
              <div className="p-6 cursor-pointer group" onClick={() => setExpandedGoal(isOpen ? null : goal.id)}>
                <div className="flex items-center gap-5">
                  <div className="relative w-20 h-20 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 68 68">
                      <circle cx="34" cy="34" r={R} fill="none" className="stroke-bg-input" strokeWidth="6" />
                      <circle 
                        cx="34" cy="34" r={R} fill="none" className="stroke-accent-blue transition-all duration-1000 ease-out" strokeWidth="6" 
                        strokeDasharray={CIRC} strokeDashoffset={CIRC - (CIRC * (goal.progress || 0)) / 100} 
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-base font-black text-text-main tracking-tighter leading-none">{goal.progress || 0}%</span>
                      <span className="text-[7px] font-black text-text-muted uppercase tracking-widest mt-0.5">Mastery</span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${tc.bg} ${tc.color}`}>{goal.tag}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-accent-blue-light text-accent-blue">Today: {dailyProgress}%</span>
                    </div>
                    <p className="text-lg font-black text-text-main tracking-tight leading-tight mb-3 group-hover:text-accent-blue transition-colors">{goal.title}</p>
                    
                    <div className="w-full bg-bg-input h-1.5 rounded-full overflow-hidden mb-3">
                      <div className={`h-full transition-all duration-1000 ${dailyProgress === 100 ? 'bg-emerald-500' : 'bg-accent-blue'}`} style={{ width: `${dailyProgress}%` }} />
                    </div>

                    <div className="flex items-center gap-3">
                      <button onClick={(e) => { e.stopPropagation(); setExtendingGoal(goal); }} className="px-2 py-1 rounded-md bg-bg-input text-[10px] font-bold text-text-muted hover:bg-border-med transition-colors flex items-center gap-2">
                        <Calendar size={12} /> {goal.deadline || 'No deadline'}
                      </button>
                      {goal.extensions?.length > 0 && <History size={12} className="text-accent-blue opacity-50" />}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 items-center">
                    <button onClick={e => { e.stopPropagation(); deleteGoal(goal.id); }} className="w-9 h-9 rounded-xl text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all flex items-center justify-center"><Trash2 size={18} /></button>
                    {isOpen ? <ChevronUp size={24} className="text-text-muted" /> : <ChevronDown size={24} className="text-text-muted" />}
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="px-6 pb-6 pt-2 border-t border-border-light space-y-4 animate-in slide-in-from-top-4">
                  <div className="flex flex-col gap-3">
                    {goal.habits
                      .sort((a, b) => {
                        const aDone = a.type === 'check' ? a.completed : (a.type === 'count' ? (a.currentCount >= (a.targetCount || 10)) : (a.timeSpent >= (a.targetTime || 15)));
                        const bDone = b.type === 'check' ? b.completed : (b.type === 'count' ? (b.currentCount >= (b.targetCount || 10)) : (b.timeSpent >= (b.targetTime || 15)));
                        if (aDone !== bDone) return aDone ? 1 : -1;
                        return 0;
                      })
                      .map(h => <HabitRow key={h.id} habit={h} goalId={goal.id} logHabitTime={logHabitTime} deleteHabit={deleteHabit} toggleHabitCheck={toggleHabitCheck} updateHabitCount={updateHabitCount} />)}
                  </div>
                  
                  {showAddHabit === goal.id ? (
                    <form onSubmit={e => submitHabit(e, goal.id)} className="bg-bg-input/50 p-5 rounded-2xl border border-border-light space-y-4 animate-in zoom-in-95">
                      <input autoFocus required type="text" value={newHabit.title} onChange={e => setNewHabit({ ...newHabit, title: e.target.value })} placeholder="New habit name..." className="w-full bg-transparent border-b-2 border-accent-blue p-2 font-bold text-text-main outline-none placeholder:text-text-muted/40" />
                      <div className="flex gap-3">
                        <select value={newHabit.type} onChange={e => setNewHabit({ ...newHabit, type: e.target.value })} className="flex-1 bg-bg-card rounded-xl px-4 py-3 text-xs font-black text-text-main shadow-sm border-none">
                          <option value="time">⏱️ Time</option>
                          <option value="check">✅ Check</option>
                          <option value="count">🔢 Count</option>
                        </select>
                        <input type="number" min="1" value={newHabit.type === 'count' ? newHabit.targetCount : newHabit.targetTime} onChange={e => setNewHabit(h => ({ ...h, [h.type === 'count' ? 'targetCount' : 'targetTime']: e.target.value }))} className="w-20 bg-bg-card rounded-xl px-4 py-3 text-sm font-black text-accent-blue shadow-sm border-none" />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button type="submit" className="flex-1 py-3.5 rounded-xl bg-accent-blue text-white font-black text-sm shadow-md active:scale-95 transition-all">Add Daily Habit</button>
                        <button type="button" onClick={() => setShowAddHabit(null)} className="px-6 py-3.5 rounded-xl bg-bg-input text-text-muted font-black text-sm hover:bg-bg-input/80 transition-colors">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <button onClick={() => setShowAddHabit(goal.id)} className="w-full py-4 rounded-2xl bg-bg-input border border-border-light border-dashed text-accent-blue font-black text-sm flex items-center justify-center gap-3 hover:bg-bg-input/80 transition-all">
                      <Plus size={18} strokeWidth={3} /> Add Daily Habit
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
        <div className="flex flex-col items-center justify-center py-32 text-text-muted/50">
          <div className="w-24 h-24 rounded-full bg-bg-input flex items-center justify-center mb-6">
            <Target size={48} strokeWidth={1.5} />
          </div>
          <p className="text-xl font-black tracking-tight text-text-muted">No Systems Forged Yet</p>
          <p className="text-sm font-bold mt-2">Forge your first goal to start your journey.</p>
          <button onClick={() => setShowAddGoal(true)} className="mt-8 px-8 py-4 rounded-2xl bg-accent-blue text-white font-black shadow-lg shadow-accent-blue/20 hover:opacity-90 transition-all active:scale-95">Forge Now</button>
        </div>
      )}
    </div>
  );
};
