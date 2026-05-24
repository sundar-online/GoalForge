import React, { useState, useEffect } from 'react';
import { useGoals } from '../context/AppContext';
import { Target, Plus, ChevronDown, ChevronUp, Trash2, Clock, Check, Layers, Calendar, History, Edit3, Maximize2, Minimize2 } from 'lucide-react';
import { isGoalDoneToday, calculateGoalDailyProgress, isHabitScheduledToday, calculateOverallProgress } from '../utils/calculationUtils';
import { addDays, TODAY } from '../utils/dateUtils';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

// ── Day Picker ──────────────────────────────────────────────
const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DayPicker = ({ value, onChange }) => {
  const selected = value || []; // [] means every day
  const toggle = (day) => {
    if (selected.includes(day)) {
      const next = selected.filter(d => d !== day);
      onChange(next); // if empty after removal, back to "every day"
    } else {
      onChange([...selected, day]);
    }
  };
  const isEveryDay = selected.length === 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Schedule</p>
        {!isEveryDay && (
          <button type="button" onClick={() => onChange([])} className="text-[10px] font-bold text-accent-blue hover:underline">Every day</button>
        )}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {ALL_DAYS.map(day => {
          const active = isEveryDay || selected.includes(day);
          return (
            <button
              key={day} type="button"
              onClick={() => toggle(day)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all border ${
                active
                  ? 'bg-accent-blue border-accent-blue text-white shadow-sm'
                  : 'bg-bg-input border-border-light text-text-muted hover:border-border-med'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] font-medium text-text-muted">
        {isEveryDay ? '📅 Active every day' : `📅 Active on: ${selected.join(', ')}`}
      </p>
    </div>
  );
};


const TAG_COLORS = {
  Engineering: { bg: 'bg-accent-blue-light', color: 'text-accent-blue' },
  Learning:    { bg: 'bg-orange-500/10 dark:bg-orange-500/20',     color: 'text-orange-600 dark:text-orange-400' },
  Fitness:     { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',    color: 'text-emerald-600 dark:text-emerald-400' },
  Creative:    { bg: 'bg-purple-500/10 dark:bg-purple-500/20',     color: 'text-purple-600 dark:text-purple-400' },
  Business:    { bg: 'bg-amber-500/10 dark:bg-amber-500/20',      color: 'text-amber-600 dark:text-amber-400' },
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

// ── Edit Goal System Modal ──────────────────────────────────
const EditGoalSystemModal = ({ goal, onClose, onSave }) => {
  const [title, setTitle] = useState(goal.title || '');
  const [tag, setTag] = useState(goal.tag || 'General');
  const [deadline, setDeadline] = useState(goal.deadline || '');
  const [mode, setMode] = useState(goal.mode || 'ANY');
  const [minHabits, setMinHabits] = useState(goal.minHabits || 1);
  const [habits, setHabits] = useState(
    (goal.habits || []).map(h => ({
      id: h.id,
      title: h.title || '',
      type: h.type || 'time',
      targetTime: h.targetTime ?? 15,
      targetCount: h.targetCount ?? 10,
      scheduleDays: h.scheduleDays || [],
      reminderEnabled: !!h.reminderEnabled,
      reminderTime: h.reminderTime || '08:00'
    }))
  );

  const handleAddStagingHabit = () => {
    setHabits(prev => [...prev, { id: 'staging_' + Date.now() + '_' + Math.random(), title: '', type: 'time', targetTime: 15, targetCount: 10, scheduleDays: [], reminderEnabled: false, reminderTime: '08:00' }]);
  };

  const handleRemoveStagingHabit = (id) => {
    const remaining = habits.filter(h => h.id !== id);
    setHabits(remaining);
    setMinHabits(prev => Math.max(1, Math.min(prev, remaining.length)));
  };

  const handleUpdateStagingHabit = (id, updates) => {
    setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (habits.length === 0) return alert('Your system needs at least one daily habit!');
    if (habits.some(h => !h.title.trim())) return alert('Give all habits a title!');

    const cleanedHabits = habits.map(h => ({
      ...h,
      targetTime: Number(h.targetTime ?? 15),
      targetCount: Number(h.targetCount ?? 10),
      scheduleDays: h.scheduleDays || []
    }));

    onSave(goal.id, {
      title,
      tag,
      deadline,
      mode,
      minHabits: mode === 'CUSTOM' ? parseInt(minHabits, 10) : 1
    }, cleanedHabits);

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[250] p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-bg-card rounded-[32px] p-6 md:p-8 w-full max-w-2xl shadow-float border border-border-light max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-black text-text-main tracking-tight">Edit Goal System</h3>
            <p className="text-xs font-bold text-text-muted mt-0.5">Optimize your system configuration and daily habits on the fly.</p>
          </div>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-bg-input text-text-muted font-bold text-xs hover:bg-border-light transition-colors">Cancel</button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Core Vision</p>
            <input required type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="What major milestone are we hitting?"
              className="w-full text-lg font-black text-text-main border-none bg-bg-input p-4 rounded-xl outline-none placeholder:text-text-muted/50 focus:ring-2 ring-accent-blue/20 transition-all" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Category</p>
              <select value={tag} onChange={e => setTag(e.target.value)} className="w-full bg-bg-input border-none rounded-xl p-3.5 font-bold text-text-main outline-none appearance-none hover:bg-bg-input/80 transition-colors">
                {Object.keys(TAG_COLORS).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] ml-1">Target Date</p>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-bg-input border-none rounded-xl p-3.5 font-bold text-text-main outline-none hover:bg-bg-input/80 transition-colors" />
            </div>
          </div>

          <div className="bg-bg-input/50 rounded-[24px] p-5 border border-border-light space-y-4">
            <div>
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-3">Forge Logic (Strategy)</p>
              <div className="grid grid-cols-1 min-[480px]:grid-cols-3 gap-2 sm:gap-3">
                {['ALL', 'ANY', 'CUSTOM'].map(m => (
                  <button key={m} type="button" onClick={() => setMode(m)}
                    className={`
                      py-3 rounded-xl font-black text-xs transition-all border-2
                      ${mode === m ? 'border-accent-blue bg-white text-accent-blue shadow-md' : 'border-transparent bg-bg-card text-text-muted hover:border-border-med'}
                    `}
                  >
                    {m === 'ALL' ? 'Complete All' : m === 'ANY' ? 'Any One' : 'Custom'}
                  </button>
                ))}
              </div>
            </div>
            
            {mode === 'CUSTOM' && (
              <div className="bg-bg-card rounded-xl p-3.5 border border-border-light flex items-center justify-between animate-in fade-in zoom-in-95">
                <span className="text-xs font-black text-text-main">Min required habits:</span>
                <div className="flex items-center bg-bg-input rounded-xl border border-border-light overflow-hidden">
                    <button type="button" onClick={() => setMinHabits(prev => Math.max(1, parseInt(prev) - 1))} className="w-9 h-9 flex items-center justify-center font-black text-text-main hover:bg-border-light">−</button>
                    <span className="w-8 text-center text-xs font-black text-accent-blue">{minHabits}</span>
                    <button type="button" onClick={() => setMinHabits(prev => Math.min(habits.length, parseInt(prev) + 1))} className="w-9 h-9 flex items-center justify-center font-black text-accent-blue border-l border-border-light hover:bg-border-light">+</button>
                </div>
              </div>
            )}
            
            <p className="text-[11px] font-bold text-text-muted italic px-1">
              {mode === 'ALL' ? '⚡ Mastery increases only when EVERY habit in the system is finished today.' : 
               mode === 'ANY' ? '🚀 Completing ANY one habit counts as a full day of progress.' : 
               `🎯 You must finish at least ${minHabits} habit${minHabits > 1 ? 's' : ''} daily to progress.`}
            </p>
          </div>

          <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
            <div className="flex justify-between items-end px-1 sticky top-0 bg-bg-card py-2 z-10 border-b border-border-light/40 mb-2">
               <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Daily Systems & Habits</p>
               <button type="button" onClick={handleAddStagingHabit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-blue/10 text-accent-blue font-black text-[10px] hover:bg-accent-blue/20 transition-all">
                 <Plus size={12} strokeWidth={3} /> Add Habit
               </button>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {habits.map((h, idx) => (
                <div key={h.id} className="bg-bg-input/60 rounded-xl p-4 border border-border-light space-y-3 relative">
                   <div className="flex gap-3">
                      <input required type="text" value={h.title} onChange={e => handleUpdateStagingHabit(h.id, { title: e.target.value })} placeholder={`Habit #${idx + 1}...`} className="flex-1 bg-transparent border-b border-border-light p-1.5 text-sm font-bold text-text-main outline-none focus:border-accent-blue transition-colors" />
                      <button type="button" onClick={() => handleRemoveStagingHabit(h.id)} className="p-1.5 text-text-muted hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                   </div>
                   <div className="flex flex-wrap gap-2">
                      <select value={h.type} onChange={e => handleUpdateStagingHabit(h.id, { type: e.target.value })} className="flex-1 min-w-[100px] bg-bg-card rounded-lg px-3 py-2 text-[11px] font-black text-text-main border-none shadow-sm">
                        <option value="time">⏱️ Time-Based</option>
                        <option value="check">✅ Simple Check</option>
                        <option value="count">🔢 Count-Based</option>
                      </select>
                      {h.type !== 'check' && (
                        <div className="flex items-center gap-1.5 bg-bg-card px-3 py-1.5 rounded-lg shadow-sm border border-border-light/50">
                           <input type="number" min="1" value={h.type === 'count' ? h.targetCount : h.targetTime} 
                             onChange={e => {
                               const val = parseInt(e.target.value, 10) || 1;
                               handleUpdateStagingHabit(h.id, { [h.type === 'count' ? 'targetCount' : 'targetTime']: val });
                             }} 
                             className="w-10 bg-transparent text-center font-black text-accent-blue outline-none text-xs" 
                           />
                           <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">{h.type === 'count' ? 'units' : 'mins'}</span>
                        </div>
                      )}
                   </div>
                   <DayPicker
                     value={h.scheduleDays || []}
                     onChange={days => handleUpdateStagingHabit(h.id, { scheduleDays: days })}
                   />
                   <div className="flex items-center justify-between gap-3 bg-bg-card rounded-xl px-4 py-2 border border-border-light/40">
                      <div className="flex items-center gap-2">
                         <Clock size={12} className="text-text-muted" />
                         <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Reminder</span>
                      </div>
                      <div className="flex items-center gap-3">
                         {h.reminderEnabled && (
                            <input type="time" value={h.reminderTime} onChange={e => handleUpdateStagingHabit(h.id, { reminderTime: e.target.value })} className="bg-transparent border-none text-[11px] font-black text-accent-blue outline-none" />
                         )}
                         <button type="button" onClick={() => handleUpdateStagingHabit(h.id, { reminderEnabled: !h.reminderEnabled })}
                           className={`w-9 h-5 rounded-full relative transition-colors ${h.reminderEnabled ? 'bg-accent-blue' : 'bg-bg-input-hover'}`}>
                           <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${h.reminderEnabled ? 'left-4.5' : 'left-0.5'}`} />
                         </button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="w-full bg-accent-blue text-white rounded-xl py-4 font-black text-sm shadow-md shadow-accent-blue/20 hover:opacity-90 active:scale-95 transition-all">
            Save System Changes
          </button>
        </form>
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

const HabitRow = ({ habit, goalId, logHabitTime, deleteHabit, toggleHabitCheck, updateHabitCount, updateHabitReminder }) => {
  const [showLog, setShowLog] = useState(false);
  const isCheck = habit.type === 'check';
  const isCount = habit.type === 'count';

  const scheduledToday = isHabitScheduledToday(habit);
  const hasSchedule = habit.scheduleDays && habit.scheduleDays.length > 0;

  const todayStr = TODAY();
  const hasBeenActiveToday = habit.lastActiveDate === todayStr;

  let done = false;
  let target = 0;
  let current = 0;

  if (hasBeenActiveToday) {
    if (isCheck) done = habit.completed;
    else if (isCount) done = (habit.currentCount || 0) >= (habit.targetCount || 10);
    else done = (habit.timeSpent || 0) >= (habit.targetTime || 15);
    target = isCount ? habit.targetCount : (habit.targetTime || 15);
    current = isCount ? habit.currentCount : (habit.timeSpent || 0);
  } else {
    done = false;
    current = 0;
    if (habit.isRecovering && habit.originalTarget !== undefined) {
      target = habit.originalTarget;
    } else {
      target = isCount ? (habit.targetCount || 10) : (habit.targetTime || 15);
    }
  }

  const pct = Math.min(100, Math.round((current / (target || 1)) * 100));

  const Icon = isCheck ? Check : (isCount ? Layers : Clock);

  // If not scheduled today, show a greyed-out rest-day card
  if (!scheduledToday) {
    return (
      <div className="p-2 sm:p-4 rounded-xl border border-dashed border-border-light bg-bg-input/30 flex items-center gap-1.5 sm:gap-3 opacity-50">
        <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-lg border-2 border-border-light bg-bg-card flex items-center justify-center">
          <Calendar size={13} className="text-text-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-black text-text-muted truncate">{habit.title}</p>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5">
            <span className="text-[8px] sm:text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none">Rest Day</span>
            {habit.streak > 0 && <span className="text-[8px] sm:text-[9px] font-black text-orange-500 bg-orange-500/10 px-1 py-0.5 rounded leading-none">🔥 {habit.streak}d</span>}
            {hasSchedule && <span className="text-[8px] sm:text-[9px] font-bold text-accent-blue/70 bg-accent-blue/10 px-1 py-0.5 rounded leading-none hidden min-[400px]:inline-block">{habit.scheduleDays.join('·')}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`
        p-2 sm:p-4 rounded-xl transition-all duration-300 border flex flex-col gap-1.5 sm:gap-3
        ${done ? 'bg-emerald-500/5 border-emerald-500/10 opacity-70' : 'bg-bg-input border-border-light hover:border-border-med'}
      `}>
        {/* Main Content Line: Checkbox + Title + Streak & Inline Controls */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-4 w-full">
          <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
            {/* Touch-Friendly Checkbox */}
            <button
               onClick={() => toggleHabitCheck(goalId, habit.id)}
               className={`
                 w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg border-2 flex items-center justify-center transition-all duration-200
                 ${done ? 'bg-emerald-500 border-emerald-500 scale-95' : 'bg-bg-card border-border-med cursor-pointer hover:border-accent-blue'}
               `}
            >
              {done ? <Check size={14} className="text-white animate-in zoom-in-50" strokeWidth={3} /> : (isCheck ? null : <Icon size={12} className="text-text-muted" />)}
            </button>
            
            <div className="flex-1 min-w-0">
              <p className={`text-xs sm:text-sm font-black tracking-tight truncate leading-snug ${done ? 'text-emerald-600 line-through' : 'text-text-main'}`}>{habit.title}</p>
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5">
                <p className="text-[9px] sm:text-[11px] font-bold text-text-muted uppercase tracking-wide">
                  {isCheck ? (done ? 'Completed' : 'Pending') : `${current}/${target} ${isCount ? 'units' : 'mins'}`}
                </p>
                {habit.streak > 0 && <span className="text-[8px] sm:text-[9px] font-black text-orange-500 bg-orange-500/10 px-1 py-0.5 rounded leading-none">🔥 {habit.streak}d</span>}
                {hasSchedule && <span className="text-[8px] sm:text-[9px] font-bold text-accent-blue/70 bg-accent-blue/10 px-1 py-0.5 rounded leading-none hidden min-[400px]:inline-block">{habit.scheduleDays.join('·')}</span>}
              </div>
            </div>
          </div>

          {/* Stacking controls inline on the same row */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {isCount ? (
              <div className="flex bg-bg-card rounded-lg border border-border-light overflow-hidden shadow-sm h-7 sm:h-9">
                 <button onClick={() => updateHabitCount(goalId, habit.id, -1)} className="px-2 sm:px-3.5 py-0.5 sm:py-2 text-text-main font-black hover:bg-bg-input transition-colors text-xs sm:text-sm">−</button>
                 <button onClick={() => updateHabitCount(goalId, habit.id, 1)} className="px-2 sm:px-3.5 py-0.5 sm:py-2 text-accent-blue font-black border-l border-border-light hover:bg-bg-input transition-colors text-xs sm:text-sm">+</button>
              </div>
            ) : (!isCheck && !done) && (
              <button onClick={() => setShowLog(true)} className="h-7 sm:h-9 px-2 sm:px-4 rounded-lg bg-accent-blue text-white text-[10px] sm:text-[11px] font-black shadow-sm active:scale-95 transition-all">+ Log</button>
            )}
            <button onClick={() => deleteHabit(goalId, habit.id)} className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all flex items-center justify-center shrink-0">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {!isCheck && (
          <div className="w-full bg-bg-card rounded-full h-1 overflow-hidden">
            <div className={`h-full transition-all duration-700 ${done ? 'bg-emerald-500' : 'bg-accent-blue'}`} style={{ width: `${pct}%` }} />
          </div>
        )}

        {/* Reminder Settings Row */}
        <div className="flex items-center justify-between pt-2 border-t border-border-light/30 mt-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 opacity-60">
              <Clock size={10} className="text-text-muted" />
              <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Reminder</span>
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                updateHabitReminder(goalId, habit.id, !habit.reminderEnabled, habit.reminderTime);
              }}
              className={`w-8 h-4 rounded-full relative transition-all duration-300 ${habit.reminderEnabled ? 'bg-accent-blue shadow-sm shadow-accent-blue/20' : 'bg-bg-input-hover border border-border-light'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 ${habit.reminderEnabled ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
          </div>
          {habit.reminderEnabled && (
            <div className="flex items-center animate-in fade-in slide-in-from-right-2 duration-300">
              <input 
                type="time" 
                value={habit.reminderTime || '08:00'} 
                onClick={e => e.stopPropagation()}
                onChange={e => updateHabitReminder(goalId, habit.id, true, e.target.value)}
                className="bg-transparent border-none text-[10px] font-black text-accent-blue outline-none cursor-pointer hover:text-accent-blue-hover transition-colors"
              />
            </div>
          )}
        </div>
      </div>
      {showLog && !isCheck && !isCount && <LogTimeModal habit={habit} goalId={goalId} onClose={() => setShowLog(false)} logHabitTime={logHabitTime} />}
    </>
  );
};

export const GoalsPage = () => {
  const { goals, addGoal, deleteGoal, addHabit, deleteHabit, logHabitTime, toggleHabitCheck, updateHabitCount, updateHabitReminder, extendGoalDeadline, editGoalSystem, setCompletedGoalForCelebration } = useGoals();

  const todayStr = TODAY();
  const calculatedGoals = goals.map(g => {
    const liveProgress = calculateOverallProgress(g);
    const isFinished = liveProgress === 100 || (g.deadline && todayStr >= g.deadline);
    return {
      ...g,
      progress: liveProgress,
      isFinished
    };
  });

  const [expandedGoalIds, setExpandedGoalIds] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [colsCount, setColsCount] = useState(1);

  // Responsive design width and column observer
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024);
      
      if (width < 768) {
        setColsCount(1);
      } else if (width < 1024) {
        setColsCount(2);
      } else {
        // Strict 3-column desktop layout at all times
        setColsCount(3);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync expanded goals if they get deleted in real-time
  useEffect(() => {
    const activeIds = new Set(goals.map(g => g.id));
    setExpandedGoalIds(prev => prev.filter(id => activeIds.has(id)));
  }, [goals]);

  const toggleGoalExpanded = (goalId) => {
    setExpandedGoalIds(prev => {
      const isCurrentlyOpen = prev.includes(goalId);
      if (isCurrentlyOpen) {
        return prev.filter(id => id !== goalId);
      }
      
      const isMobileScreen = window.innerWidth < 1024;
      if (isMobileScreen) {
        // Mobile limit: maximum 1 expanded goal at a time
        return [goalId];
      } else {
        // Desktop limit: maximum 2 expanded goals at a time
        if (prev.length >= 2) {
          // Collapse the oldest expanded goal (index 0) and append the new one
          return [prev[prev.length - 1], goalId];
        }
        return [...prev, goalId];
      }
    });
  };

  const handleExpandAll = () => {
    setExpandedGoalIds(calculatedGoals.map(g => g.id));
  };

  const handleCollapseAll = () => {
    setExpandedGoalIds([]);
  };
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddHabit, setShowAddHabit] = useState(null);
  const [extendingGoal, setExtendingGoal] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [deletingGoalItem, setDeletingGoalItem] = useState(null);
  const [newGoal, setNewGoal] = useState({ 
    title: '', 
    tag: 'General', 
    deadline: '', 
    mode: 'ANY', 
    minHabits: 1, 
    habits: [{ id: Date.now(), title: '', type: 'time', targetTime: 15, targetCount: 10, reminderEnabled: false, reminderTime: '08:00' }]
  });
  const [newHabit, setNewHabit] = useState({ title: '', type: 'time', targetTime: 15, targetCount: 10, scheduleDays: [], reminderEnabled: false, reminderTime: '08:00' });

  const doneGoals = calculatedGoals.filter(g => g.isFinished).length;
  const activeGoals = calculatedGoals.filter(g => !g.isFinished).length;
  const avgProgress = calculatedGoals.length === 0 ? 0 : Math.round(calculatedGoals.reduce((s, g) => s + (g.progress || 0), 0) / calculatedGoals.length);

  const submitGoal = (e) => {
    e.preventDefault();
    if (!newGoal.title.trim()) return;
    if (newGoal.habits.length === 0) return alert('Add at least one daily habit!');
    if (newGoal.habits.some(h => !h.title.trim())) return alert('Give all your habits a name!');

    const cleanedHabits = newGoal.habits.map(h => ({
      ...h,
      targetTime: Number(h.targetTime ?? 15),
      targetCount: Number(h.targetCount ?? 10),
      scheduleDays: h.scheduleDays || [],
      reminderEnabled: !!h.reminderEnabled,
      reminderTime: h.reminderTime || '08:00'
    }));

    addGoal({
      ...newGoal,
      habits: cleanedHabits,
      mode: newGoal.mode || 'ANY',
      minHabits: newGoal.mode === 'CUSTOM' ? parseInt(newGoal.minHabits, 10) : 1
    });
    setNewGoal({
      title: '',
      tag: 'General',
      deadline: '',
      mode: 'ANY',
      minHabits: 1,
      habits: [{ id: Date.now(), title: '', type: 'time', targetTime: 15, targetCount: 10, scheduleDays: [], reminderEnabled: false, reminderTime: '08:00' }]
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
      habits: [...prev.habits, { id: Date.now(), title: '', type: 'time', targetTime: 15, targetCount: 10, scheduleDays: [], reminderEnabled: false, reminderTime: '08:00' }]
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
    addHabit(goalId, {
      title: newHabit.title,
      type: newHabit.type,
      targetTime: Number(newHabit.targetTime),
      targetCount: Number(newHabit.targetCount),
      scheduleDays: newHabit.scheduleDays || [],
      reminderEnabled: !!newHabit.reminderEnabled,
      reminderTime: newHabit.reminderTime || '08:00'
    });
    setNewHabit({ title: '', type: 'time', targetTime: 15, targetCount: 10, scheduleDays: [], reminderEnabled: false, reminderTime: '08:00' });
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
      <div className="bg-bg-dark-elem rounded-3xl p-4 sm:p-6 grid grid-cols-3 gap-1.5 sm:gap-4 border border-white/5 shadow-xl">
        {[
          { label: 'Avg Mastery', val: `${avgProgress}%`, color: 'text-accent-blue' },
          { label: 'Finished', val: doneGoals, color: 'text-emerald-400' },
          { label: 'In Progress', val: activeGoals, color: 'text-white' },
        ].map((s, i) => (
          <div key={i} className="text-center space-y-1 min-w-0">
            <p className={`text-lg min-[360px]:text-xl md:text-3xl font-black tracking-tighter truncate ${s.color}`}>{s.val}</p>
            <p className="text-[8px] min-[360px]:text-[9px] font-black text-white/40 uppercase tracking-widest leading-none truncate">{s.label}</p>
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
              <div className="grid grid-cols-1 min-[480px]:grid-cols-3 gap-2 sm:gap-3">
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
                           <input type="number" min="1" value={h.type === 'count' ? h.targetCount : h.targetTime} 
                             onChange={e => {
                               const val = parseInt(e.target.value, 10) || 1;
                               updateStagingHabit(h.id, { [h.type === 'count' ? 'targetCount' : 'targetTime']: val });
                             }} 
                             className="w-12 bg-transparent text-center font-black text-accent-blue outline-none" 
                           />
                           <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{h.type === 'count' ? 'units' : 'mins'}</span>
                        </div>
                      )}
                   </div>
                   <DayPicker
                     value={h.scheduleDays || []}
                     onChange={days => updateStagingHabit(h.id, { scheduleDays: days })}
                   />
                   <div className="flex items-center justify-between gap-3 bg-bg-card rounded-xl px-4 py-2.5 border border-border-light/40">
                      <div className="flex items-center gap-2">
                         <Clock size={14} className="text-text-muted" />
                         <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Daily Reminder</span>
                      </div>
                      <div className="flex items-center gap-3">
                         {h.reminderEnabled && (
                            <input type="time" value={h.reminderTime} onChange={e => updateStagingHabit(h.id, { reminderTime: e.target.value })} className="bg-transparent border-none text-xs font-black text-accent-blue outline-none" />
                         )}
                         <button type="button" onClick={() => updateStagingHabit(h.id, { reminderEnabled: !h.reminderEnabled })}
                           className={`w-10 h-6 rounded-full relative transition-colors ${h.reminderEnabled ? 'bg-accent-blue' : 'bg-bg-input-hover'}`}>
                           <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${h.reminderEnabled ? 'left-5' : 'left-1'}`} />
                         </button>
                      </div>
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

      {/* Power-User Overview View Controls */}
      {calculatedGoals.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-bg-card border border-border-light rounded-[24px] px-6 py-4 shadow-sm gap-4 transition-all hover:border-border-med animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-blue animate-pulse"></span>
              <span className="text-sm font-black text-text-main tracking-tight">Expansion Strategy</span>
            </div>
            <p className="text-[11px] font-medium text-text-muted">
              {expandedGoalIds.length > 2 
                ? `⚡ Multi-Open Overview mode active (${expandedGoalIds.length} open)` 
                : isMobile 
                  ? `🔒 Mobile Accordion mode active ${expandedGoalIds.length > 0 ? '(1 card open)' : ''}` 
                  : expandedGoalIds.length > 0 
                    ? `🔒 Desktop Balanced Mode active (${expandedGoalIds.length} of 2 open)` 
                    : "🔒 Desktop Balanced Mode active (Max 2 cards open)"}
            </p>
          </div>
          <div className="flex gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExpandAll}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-bg-input text-xs font-black text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 border border-transparent hover:border-accent-blue/20 transition-all flex items-center justify-center gap-2 active:scale-[0.97]"
            >
              <Maximize2 size={13} strokeWidth={2.5} /> Expand All
            </button>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-bg-input text-xs font-black text-text-muted hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.97]"
            >
              <Minimize2 size={13} strokeWidth={2.5} /> Collapse All
            </button>
          </div>
        </div>
      )}

      {/* Goal Cards Masonry Grid / Accordion List */}
      {(() => {
        const sortedGoals = [...calculatedGoals].sort((a, b) => {
          const aDone = isGoalDoneToday(a);
          const bDone = isGoalDoneToday(b);
          if (aDone !== bDone) return aDone ? 1 : -1;
          return 0;
        });

        const masonryColumns = Array.from({ length: colsCount }, () => []);
        const columnWeights = Array(colsCount).fill(0);

        sortedGoals.forEach((goal) => {
          const isOpen = expandedGoalIds.includes(goal.id);
          // Calculate height-weight based on open/closed state and habit count
          const weight = isOpen ? (3 + goal.habits.length * 0.5) : 1.0;

          // Find the column with the minimum height weight
          let minColIdx = 0;
          let minWeight = columnWeights[0];
          for (let c = 1; c < colsCount; c++) {
            if (columnWeights[c] < minWeight) {
              minColIdx = c;
              minWeight = columnWeights[c];
            }
          }

          masonryColumns[minColIdx].push(goal);
          columnWeights[minColIdx] += weight;
        });

        return (
          <div className={`
            flex gap-6 w-full mx-auto
            ${colsCount === 1 ? 'max-w-2xl flex-col items-stretch' : colsCount === 2 ? 'max-w-5xl items-start' : 'max-w-7xl items-start'}
          `}>
            {masonryColumns.map((colGoals, colIdx) => (
              <div key={colIdx} className="flex flex-col gap-6 flex-1 min-w-0 w-full">
                {colGoals.map(goal => {
                  const tc = TAG_COLORS[goal.tag] || TAG_COLORS.General;
                  const isOpen = expandedGoalIds.includes(goal.id);
                  const habitsTotal = goal.habits.length;
                  const dailyProgress = calculateGoalDailyProgress(goal);
                  const doneToday = isGoalDoneToday(goal);

                  return (
                    <div key={goal.id} className={`
                      bg-bg-card rounded-[24px] sm:rounded-[32px] overflow-hidden border-2 h-fit w-full
                      ${doneToday ? 'border-emerald-500 shadow-lg shadow-emerald-500/5' : 'border-border-light hover:border-border-med shadow-sm'}
                    `}>
                      <div className="px-3 py-4 sm:p-6 cursor-pointer group" onClick={() => toggleGoalExpanded(goal.id)}>
                        <div className="flex items-center justify-between gap-1.5 sm:gap-5">
                          
                          {/* Inner Content: Progress circle + details */}
                          <div className="flex items-center gap-2 sm:gap-5 flex-1 min-w-0 w-full">
                            {/* Circular Progress Ring */}
                            <div className="relative w-10 h-10 sm:w-20 sm:h-20 shrink-0">
                              <svg className="w-full h-full -rotate-90" viewBox="0 0 68 68">
                                <circle cx="34" cy="34" r={R} fill="none" className="stroke-bg-input" strokeWidth="6" />
                                <circle 
                                  cx="34" cy="34" r={R} fill="none" className="stroke-accent-blue" strokeWidth="6" 
                                  strokeDasharray={CIRC} strokeDashoffset={CIRC - (CIRC * (goal.progress || 0)) / 100} 
                                  strokeLinecap="round"
                                />
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[9px] sm:text-base font-black text-text-main tracking-tighter leading-none">{goal.progress || 0}%</span>
                                <span className="hidden sm:block text-[5px] sm:text-[7px] font-black text-text-muted uppercase tracking-widest mt-0.5">Mastery</span>
                              </div>
                            </div>

                            {/* Main descriptive block */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1.5 sm:mb-2">
                                <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${tc.bg} ${tc.color}`}>{goal.tag}</span>
                                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-accent-blue-light text-accent-blue">Today: {dailyProgress}%</span>
                                {goal.progress >= 100 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCompletedGoalForCelebration(goal);
                                    }}
                                    className="text-[8px] sm:text-[9px] font-black bg-amber-400/15 text-amber-400 border border-amber-400/20 px-1.5 py-0.5 rounded-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
                                    title="Click to trigger Celebration Memory modal!"
                                  >
                                    ✨ Mastered
                                  </button>
                                )}
                              </div>
                              <p className="text-xs sm:text-lg font-black text-text-main tracking-tight leading-tight mb-2.5 sm:mb-3 group-hover:text-accent-blue transition-colors whitespace-normal">{goal.title}</p>
                              
                              <div className="w-full bg-bg-input h-1.5 rounded-full overflow-hidden mb-2.5 sm:mb-3">
                                <div className={`h-full ${dailyProgress === 100 ? 'bg-emerald-500' : 'bg-accent-blue'}`} style={{ width: `${dailyProgress}%` }} />
                              </div>

                              <div className="flex items-center gap-1.5 sm:gap-3">
                                <button onClick={(e) => { e.stopPropagation(); setExtendingGoal(goal); }} className="px-1.5 py-0.5 sm:py-1 rounded-md bg-bg-input text-[8px] sm:text-[10px] font-bold text-text-muted hover:bg-border-med transition-colors flex items-center gap-1">
                                  <Calendar size={10} /> {goal.deadline || 'No deadline'}
                                </button>
                                {goal.extensions?.length > 0 && <History size={10} className="text-accent-blue opacity-50" />}
                              </div>
                            </div>
                          </div>

                          {/* Action icons and controls */}
                          <div className="flex sm:flex-col items-center gap-1 sm:gap-2 shrink-0">
                            <button onClick={e => { e.stopPropagation(); setEditingGoal(goal); }} className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl text-text-muted hover:text-accent-blue hover:bg-accent-blue/10 transition-all flex items-center justify-center shrink-0" title="Edit Goal System"><Edit3 size={12} /></button>
                            <button onClick={e => { e.stopPropagation(); setDeletingGoalItem(goal); }} className="w-6 h-6 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-all flex items-center justify-center shrink-0" title="Delete Goal System"><Trash2 size={12} /></button>
                            {isOpen ? <ChevronUp className="text-text-muted shrink-0 w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" /> : <ChevronDown className="text-text-muted shrink-0 w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" />}
                          </div>

                        </div>
                      </div>

                      {isOpen && (
                        <div className="px-3 sm:px-6 pb-4 sm:pb-6 pt-2 border-t border-border-light/60 space-y-3 sm:space-y-4">
                          <div className="flex flex-col gap-2 sm:gap-2.5">
                            {goal.habits
                              .sort((a, b) => {
                                const todayStr = TODAY();
                                const isHabitDoneVisual = (h) => {
                                  const hasBeenActiveToday = h.lastActiveDate === todayStr;
                                  if (!hasBeenActiveToday) return false;
                                  if (h.type === 'check') return h.completed;
                                  if (h.type === 'count') return (h.currentCount || 0) >= (h.targetCount ?? 10);
                                  return (h.timeSpent || 0) >= (h.targetTime ?? 15);
                                };
                                const aDone = isHabitDoneVisual(a);
                                const bDone = isHabitDoneVisual(b);
                                if (aDone !== bDone) return aDone ? 1 : -1;
                                return 0;
                              })
                              .map(h => <HabitRow key={h.id} habit={h} goalId={goal.id} logHabitTime={logHabitTime} deleteHabit={deleteHabit} toggleHabitCheck={toggleHabitCheck} updateHabitCount={updateHabitCount} updateHabitReminder={updateHabitReminder} />)}
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
                                {newHabit.type !== 'check' && (
                                  <input type="number" min="1" value={newHabit.type === 'count' ? newHabit.targetCount : newHabit.targetTime} 
                                    onChange={e => {
                                      const val = parseInt(e.target.value, 10) || 1;
                                      setNewHabit(h => ({ ...h, [h.type === 'count' ? 'targetCount' : 'targetTime']: val }));
                                    }} 
                                    className="w-20 bg-bg-card rounded-xl px-4 py-3 text-sm font-black text-accent-blue shadow-sm border-none" 
                                  />
                                )}
                              </div>
                              <DayPicker
                                value={newHabit.scheduleDays || []}
                                onChange={days => setNewHabit(h => ({ ...h, scheduleDays: days }))}
                              />
                              <div className="flex items-center justify-between gap-3 bg-bg-card rounded-xl px-4 py-3 border border-border-light/40">
                                <div className="flex items-center gap-2">
                                  <Clock size={14} className="text-text-muted" />
                                  <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Daily Reminder</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {newHabit.reminderEnabled && (
                                    <input type="time" value={newHabit.reminderTime} onChange={e => setNewHabit(h => ({ ...h, reminderTime: e.target.value }))} className="bg-transparent border-none text-sm font-black text-accent-blue outline-none" />
                                  )}
                                  <button type="button" onClick={() => setNewHabit(h => ({ ...h, reminderEnabled: !h.reminderEnabled }))}
                                    className={`w-12 h-6 rounded-full relative transition-colors ${newHabit.reminderEnabled ? 'bg-accent-blue' : 'bg-bg-input-hover'}`}>
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newHabit.reminderEnabled ? 'left-7' : 'left-1'}`} />
                                  </button>
                                </div>
                              </div>
                              <div className="flex gap-3 pt-2">
                                <button type="submit" className="flex-1 py-3.5 rounded-xl bg-accent-blue text-white font-black text-sm shadow-md active:scale-95 transition-all">Add Daily Habit</button>
                                <button type="button" onClick={() => setShowAddHabit(null)} className="px-6 py-3.5 rounded-xl bg-bg-input text-text-muted font-black text-sm hover:bg-bg-input/80 transition-colors">Cancel</button>
                              </div>
                            </form>
                          ) : (
                            <button onClick={() => setShowAddHabit(goal.id)} className="w-full py-3.5 rounded-2xl bg-bg-input border border-border-light border-dashed text-accent-blue font-black text-sm flex items-center justify-center gap-3 hover:bg-bg-input/80 transition-all">
                              <Plus size={18} strokeWidth={3} /> Add Daily Habit
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })()}
      
      {extendingGoal && <ExtendDeadlineModal goal={extendingGoal} onClose={() => setExtendingGoal(null)} onExtend={extendGoalDeadline} />}
      {editingGoal && <EditGoalSystemModal goal={editingGoal} onClose={() => setEditingGoal(null)} onSave={editGoalSystem} />}
      
      <DeleteConfirmationModal
        isOpen={!!deletingGoalItem}
        onClose={() => setDeletingGoalItem(null)}
        onConfirm={() => {
          if (deletingGoalItem) {
            deleteGoal(deletingGoalItem.id);
          }
        }}
        title="Delete Goal System"
        itemName={deletingGoalItem?.title}
        message="Are you sure you want to delete this Goal? This action cannot be undone and will permanently remove all related progress, habits, recovery suggestions, and streak metrics."
      />
      
      {calculatedGoals.length === 0 && !showAddGoal && (
        <div className="flex flex-col items-center justify-center text-text-muted/50 py-10 pb-24">
          <div className="w-20 h-20 rounded-full bg-bg-input flex items-center justify-center mb-5">
            <Target size={40} strokeWidth={1.5} />
          </div>
          <p className="text-xl font-black tracking-tight text-text-muted">No Systems Forged Yet</p>
          <p className="text-sm font-bold mt-2">Forge your first goal to start your journey.</p>
          <button onClick={() => setShowAddGoal(true)} className="mt-6 px-8 py-4 rounded-2xl bg-accent-blue text-white font-black shadow-lg shadow-accent-blue/20 hover:opacity-90 transition-all active:scale-95">Forge Now</button>
        </div>
      )}
    </div>
  );
};
