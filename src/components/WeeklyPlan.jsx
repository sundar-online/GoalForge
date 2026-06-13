import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  CalendarDays, Plus, Check, ChevronLeft, ChevronRight,
  Target, Zap, Flame, Pencil, X, CheckCircle2, Circle,
  Clock, Layers, Calendar, Sparkles
} from 'lucide-react';
import { isHabitScheduledToday, isTaskDone, isHabitDoneToday } from '../utils/calculationUtils';
import { TODAY, addDays } from '../utils/dateUtils';

// ── Helpers ────────────────────────────────────────────────
const DAY_ABBRS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_LABELS  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const getWeekStart = (offsetWeeks = 0) => {
  const d = new Date();
  // Go to Monday of current week
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setDate(d.getDate() + diff + offsetWeeks * 7);
  d.setHours(0,0,0,0);
  return d;
};

const dateToStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
};

const getISOWeek = (d) => {
  const date = new Date(d);
  date.setHours(0,0,0,0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

// ── Quick Add Task Modal ────────────────────────────────────
const QuickAddModal = ({ dateStr, dayLabel, onClose, addTask }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('check');

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({
      title: title.trim(),
      type: 'single',
      completionType: type,
      targetDate: dateStr,
      targetTime: 30,
      targetCount: 10,
      priority: 'Medium',
      startDate: dateStr,
      endDate: dateStr,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center z-[300] p-4" onClick={onClose}>
      <div className="bg-bg-card border border-border-light rounded-[28px] p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[9px] font-black text-accent-blue uppercase tracking-[0.2em]">Quick Plan</p>
            <h3 className="text-lg font-black text-text-main tracking-tight">{dayLabel}</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-bg-input flex items-center justify-center text-text-muted hover:text-text-main transition-colors">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <input
            autoFocus required
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Task for this day..."
            className="w-full bg-bg-input border border-border-light rounded-xl px-4 py-3.5 text-sm font-bold text-text-main placeholder:text-text-muted/40 focus:outline-none focus:border-accent-blue/50 transition-all"
          />
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { key: 'check', label: '✅ Check' },
              { key: 'time',  label: '⏱ Time'  },
              { key: 'count', label: '🔢 Count' },
            ].map(t => (
              <button key={t.key} type="button" onClick={() => setType(t.key)}
                className={`py-2 px-0.5 rounded-xl text-[10px] min-[360px]:text-xs font-black transition-all border-2 ${
                  type === t.key ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-bg-input bg-bg-input text-text-muted hover:border-border-med'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button type="button" onClick={onClose} className="py-3.5 rounded-xl bg-bg-input text-text-muted font-black text-sm">Cancel</button>
            <button type="submit" className="py-3.5 rounded-xl bg-accent-blue text-white font-black text-sm shadow-lg shadow-accent-blue/20 hover:opacity-90 active:scale-95 transition-all">Add Task</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Day Column ──────────────────────────────────────────────
const DayColumn = ({ dateStr, dayAbbr, dayNum, monthName, isToday, goals, tasks, onAddTask }) => {
  // Habits scheduled this day
  const scheduledHabits = goals
    .flatMap(g => (g.habits || []).map(h => ({ ...h, goalTitle: g.title, goalId: g.id })))
    .filter(h => {
      if (!h.scheduleDays || h.scheduleDays.length === 0) return true;
      return h.scheduleDays.includes(dayAbbr);
    });

  // Tasks for this day
  const dayTasks = tasks.filter(t => {
    const st = t.type || 'daily';
    if (st === 'daily') return isToday; // daily tasks show only on today column
    if (st === 'single') return (t.targetDate || t.date) === dateStr;
    if (st === 'range') return t.startDate <= dateStr && t.endDate >= dateStr;
    return false;
  });

  const totalItems = scheduledHabits.length + dayTasks.length;
  const doneItems = (isToday
    ? scheduledHabits.filter(isHabitDoneToday).length
    : 0) + dayTasks.filter(isTaskDone).length;

  const pct = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100);
  const isRestDay = scheduledHabits.length === 0 && dayTasks.length === 0;

  return (
    <div className={`flex flex-col rounded-[24px] border overflow-hidden transition-all ${
      isToday
        ? 'border-accent-blue/40 bg-accent-blue/5 shadow-lg shadow-accent-blue/5'
        : 'border-border-light bg-bg-card'
    }`}>
      {/* Day header */}
      <div className={`px-4 pt-4 pb-3 border-b weekday ${isToday ? 'border-accent-blue/20' : 'border-border-light'}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className={`day-label text-[9px] font-black uppercase tracking-[0.2em] ${isToday ? 'text-accent-blue' : 'text-text-muted'}`}>{dayAbbr}</p>
            <p className={`text-2xl font-black tracking-tighter leading-none ${isToday ? 'text-accent-blue' : 'text-text-main'}`}>{dayNum}</p>
            <p className="text-[10px] font-bold text-text-muted">{monthName}</p>
          </div>
          {isToday && (
            <div className="px-2 py-1 rounded-lg bg-accent-blue text-white text-[9px] font-black uppercase tracking-widest">Today</div>
          )}
        </div>

        {/* Progress bar */}
        {!isRestDay && (
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] font-bold text-text-muted">{doneItems}/{totalItems}</span>
              <span className={`text-[9px] font-black ${pct === 100 ? 'text-emerald-400' : 'text-text-muted'}`}>{pct}%</span>
            </div>
            <div className="h-1 bg-bg-input rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-400' : 'bg-accent-blue'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 p-3 space-y-2 min-h-[120px]">
        {/* Habit chips */}
        {scheduledHabits.map(h => {
          const done = isToday ? isHabitDoneToday(h) : false;
          const Icon = h.type === 'check' ? Check : h.type === 'count' ? Layers : Clock;
          return (
            <div key={h.id} className={`flex items-center gap-2 p-2.5 rounded-xl transition-all ${
              done ? 'bg-emerald-500/10' : 'bg-bg-input/60'
            }`}>
              <div className={`w-5 h-5 rounded-md shrink-0 flex items-center justify-center ${
                done ? 'bg-emerald-500' : 'bg-bg-card border border-border-med'
              }`}>
                {done ? <Check size={12} className="text-white" strokeWidth={3} /> : <Icon size={10} className="text-text-muted" />}
              </div>
              <p className={`text-[11px] font-bold truncate leading-tight ${
                done ? 'text-emerald-600 line-through' : 'text-text-main'
              }`}>{h.title}</p>
            </div>
          );
        })}

        {/* Task chips */}
        {dayTasks.map(t => {
          const done = isTaskDone(t);
          return (
            <div key={t.id} className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
              done ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-accent-blue/5 border-accent-blue/15'
            }`}>
              <div className={`w-5 h-5 rounded-md shrink-0 flex items-center justify-center border-2 ${
                done ? 'bg-emerald-500 border-emerald-500' : 'border-accent-blue/40'
              }`}>
                {done && <Check size={12} className="text-white" strokeWidth={3} />}
              </div>
              <p className={`text-[11px] font-bold truncate leading-tight ${
                done ? 'text-emerald-600 line-through' : 'text-accent-blue'
              }`}>{t.title}</p>
            </div>
          );
        })}

        {isRestDay && (
          <div className="flex flex-col items-center justify-center h-full py-4 text-text-muted/30">
            <Circle size={20} strokeWidth={1.5} />
            <p className="text-[10px] font-bold mt-1.5">Rest</p>
          </div>
        )}
      </div>

      {/* Add task button */}
      <div className="px-3 pb-3">
        <button
          onClick={() => onAddTask(dateStr, `${dayAbbr}, ${dayNum} ${monthName}`)}
          className="w-full py-2 rounded-xl border border-dashed border-border-light text-text-muted text-[11px] font-black flex items-center justify-center gap-1.5 hover:border-accent-blue/30 hover:text-accent-blue transition-all"
        >
          <Plus size={13} strokeWidth={3} /> Plan Task
        </button>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────
export const WeeklyPlan = () => {
  const { goals, tasks, addTask, taskLogs, disciplineScore, accuracy, weeklyReport, settings, saveWeeklyIntention } = useAppContext();

  const [weekOffset, setWeekOffset] = useState(0);
  const [editingIntention, setEditingIntention] = useState(false);
  const [intentionDraft, setIntentionDraft] = useState('');
  const [quickAdd, setQuickAdd] = useState(null); // { dateStr, dayLabel }

  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  }), [weekStart]);

  const today = TODAY();
  const weekKey = `week_${weekStart.getFullYear()}_${getISOWeek(weekStart)}`;
  const currentIntention = settings?.weeklyIntentions?.[weekKey] || '';
  const isCurrentWeek = weekOffset === 0;

  // Weekly stats from taskLogs
  const weekStats = useMemo(() => {
    let totalScheduled = 0, totalDone = 0;
    weekDays.forEach(d => {
      const ds = dateToStr(d);
      const log = taskLogs?.[ds];
      if (log) {
        totalScheduled += log.total_tasks || 0;
        totalDone += log.completed_tasks || 0;
      }
    });
    const weekAccuracy = totalScheduled > 0 ? Math.round((totalDone / totalScheduled) * 100) : null;
    return { totalScheduled, totalDone, weekAccuracy };
  }, [weekDays, taskLogs]);

  // Count habits per day for schedule summary
  const weekHabitCount = goals.flatMap(g => g.habits || []).length;

  const handleSaveIntention = () => {
    saveWeeklyIntention(weekKey, intentionDraft.trim());
    setEditingIntention(false);
  };

  const startEditing = () => {
    setIntentionDraft(currentIntention);
    setEditingIntention(true);
  };

  const weekRangeLabel = (() => {
    const s = weekDays[0];
    const e = weekDays[6];
    if (s.getMonth() === e.getMonth()) {
      return `${MONTH_NAMES[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
    }
    return `${MONTH_NAMES[s.getMonth()]} ${s.getDate()} – ${MONTH_NAMES[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()}`;
  })();

  return (
    <div className="flex flex-col gap-6 max-w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-3xl font-black text-text-main tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <CalendarDays size={22} className="text-purple-400" />
            </div>
            Weekly Plan
          </h2>
          <p className="text-sm text-text-muted font-medium ml-1">Map your week. Own your outcomes.</p>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="w-9 h-9 rounded-xl bg-bg-card border border-border-light flex items-center justify-center text-text-muted hover:text-text-main hover:bg-bg-input transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
              isCurrentWeek
                ? 'bg-accent-blue text-white border-accent-blue shadow-md shadow-accent-blue/20'
                : 'bg-bg-card border-border-light text-text-muted hover:bg-bg-input'
            }`}
          >
            {isCurrentWeek ? 'This Week' : 'Today'}
          </button>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="w-9 h-9 rounded-xl bg-bg-card border border-border-light flex items-center justify-center text-text-muted hover:text-text-main hover:bg-bg-input transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Week range + stats strip */}
      <div className="bg-bg-dark-elem rounded-[24px] p-5 border border-white/5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">
              {isCurrentWeek ? 'Current Week' : weekOffset < 0 ? 'Past Week' : 'Future Week'}
            </p>
            <p className="text-lg font-black text-white tracking-tight">{weekRangeLabel}</p>
          </div>
          <div className="flex flex-wrap gap-3 sm:gap-5 justify-between sm:justify-start w-full sm:w-auto">
            {[
              {
                label: 'Week Acc.',
                val: weekStats.weekAccuracy !== null ? `${weekStats.weekAccuracy}%` : '—',
                color: weekStats.weekAccuracy >= 80 ? 'text-emerald-400' : weekStats.weekAccuracy >= 50 ? 'text-amber-400' : 'text-white'
              },
              { label: 'Discipline', val: `${disciplineScore}`, color: 'text-accent-blue' },
              { label: 'Active Habits', val: weekHabitCount, color: 'text-white' },
            ].map((s, i) => (
              <div key={i} className="text-center min-w-[70px] sm:min-w-0">
                <p className={`text-xl sm:text-2xl font-black tracking-tighter ${s.color}`}>{s.val}</p>
                <p className="text-[8px] sm:text-[9px] font-black text-white/40 uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Intention */}
      <div className="bg-bg-card border border-border-light rounded-[24px] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400" />
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
              {isCurrentWeek ? "This Week's Intention" : `Week of ${MONTH_NAMES[weekDays[0].getMonth()]} ${weekDays[0].getDate()}`}
            </p>
          </div>
          {!editingIntention && (
            <button onClick={startEditing} className="flex items-center gap-1.5 text-[10px] font-bold text-accent-blue hover:underline">
              <Pencil size={12} /> {currentIntention ? 'Edit' : 'Set Intention'}
            </button>
          )}
        </div>

        {editingIntention ? (
          <div className="flex gap-3">
            <input
              autoFocus
              type="text"
              value={intentionDraft}
              onChange={e => setIntentionDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveIntention(); if (e.key === 'Escape') setEditingIntention(false); }}
              placeholder="e.g. Ship fast, recover well, stay consistent..."
              maxLength={80}
              className="flex-1 bg-bg-input border border-border-light rounded-xl px-4 py-3 text-sm font-bold text-text-main placeholder:text-text-muted/40 focus:outline-none focus:border-accent-blue/50 transition-all"
            />
            <button onClick={handleSaveIntention} className="px-4 py-3 rounded-xl bg-accent-blue text-white font-black text-sm hover:opacity-90 active:scale-95 transition-all">Save</button>
            <button onClick={() => setEditingIntention(false)} className="px-4 py-3 rounded-xl bg-bg-input text-text-muted font-black text-sm">✕</button>
          </div>
        ) : currentIntention ? (
          <p className="text-base font-black text-text-main italic">"{currentIntention}"</p>
        ) : (
          <p className="text-sm text-text-muted font-medium italic">
            No intention set yet. {isCurrentWeek ? 'Set a theme to anchor your week.' : ''}
          </p>
        )}
      </div>

      {/* 7-Day Grid */}
      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {weekDays.map((d, idx) => {
          const ds = dateToStr(d);
          const dayAbbr = DAY_ABBRS[d.getDay()];
          const dayNum = d.getDate();
          const monthName = MONTH_NAMES[d.getMonth()];
          const isToday = ds === today;
          return (
            <DayColumn
              key={ds}
              dateStr={ds}
              dayAbbr={dayAbbr}
              dayNum={dayNum}
              monthName={monthName}
              isToday={isToday}
              goals={goals}
              tasks={tasks}
              onAddTask={(dateStr, dayLabel) => setQuickAdd({ dateStr, dayLabel })}
            />
          );
        })}
      </div>

      {/* Week Summary — only for current week */}
      {isCurrentWeek && weeklyReport && (
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Best Streak', val: `${weeklyReport?.bestStreak || 0}d`, icon: <Flame size={16} className="text-orange-400" />, color: 'text-orange-400' },
            { label: 'Focus Time', val: `${Math.round((weeklyReport?.totalFocusTime || 0) / 60)}h`, icon: <Clock size={16} className="text-accent-blue" />, color: 'text-accent-blue' },
            { label: 'Days Active', val: weeklyReport?.activeDays ?? '—', icon: <Zap size={16} className="text-amber-400" />, color: 'text-amber-400' },
            { label: 'Goals Active', val: goals.length, icon: <Target size={16} className="text-purple-400" />, color: 'text-purple-400' },
          ].map((s, i) => (
            <div key={i} className="bg-bg-card border border-border-light rounded-[20px] p-3 sm:p-4 flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-bg-input flex items-center justify-center shrink-0">{s.icon}</div>
              <div className="min-w-0">
                <p className={`text-lg sm:text-xl font-black tracking-tighter truncate ${s.color}`}>{s.val}</p>
                <p className="text-[9px] sm:text-[10px] font-black text-text-muted uppercase tracking-widest truncate">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Add Modal */}
      {quickAdd && (
        <QuickAddModal
          dateStr={quickAdd.dateStr}
          dayLabel={quickAdd.dayLabel}
          onClose={() => setQuickAdd(null)}
          addTask={addTask}
        />
      )}
    </div>
  );
};
