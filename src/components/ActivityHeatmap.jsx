import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Target, Brain, X, CheckSquare, XCircle, Clock, BarChart2, TrendingUp, Zap, Sparkles } from 'lucide-react';
import {
  getTaskHeatmapColor,
  getGoalHeatmapColor,
  getFocusHeatmapColor,
  getDayTooltip,
  getDayTaskData,
  getDayGoalData,
  getDayFocusData,
  getDayStreakImpact,
  generateDayInsight,
} from '../utils/heatmapAnalytics';
import { generateHeatmapData } from '../utils/heatmapUtils';
import { TODAY } from '../utils/dateUtils';

// ── Tab config ──────────────────────────────────────────────────────────────

const TABS = [
  {
    id: 'tasks',
    label: 'Tasks',
    icon: <CheckCircle2 size={13} />,
    legend: [
      { color: 'var(--bg-input)', label: 'No data' },
      { color: '#faba2c', label: '<50%' },
      { color: 'var(--accent-blue)', label: '50%+' },
      { color: '#22c55e', label: '100%' },
    ],
    description: 'Task & habit completion accuracy per day',
  },
  {
    id: 'goals',
    label: 'Goals',
    icon: <Target size={13} />,
    legend: [
      { color: 'var(--bg-input)', label: 'No goals' },
      { color: '#faba2c', label: 'Partial' },
      { color: 'var(--accent-blue)', label: '50%+ goals' },
      { color: '#22c55e', label: 'All done' },
    ],
    description: 'Goal completion rule satisfaction per day',
  },
  {
    id: 'focus',
    label: 'Focus',
    icon: <Brain size={13} />,
    legend: [
      { color: 'var(--bg-input)', label: 'No focus' },
      { color: '#faba2c', label: '<45m' },
      { color: 'var(--accent-blue)', label: '45m+' },
      { color: '#22c55e', label: '2h+' },
    ],
    description: 'Deep work / focus session duration per day',
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDateHeader(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return { dayName: DAY_NAMES_FULL[dateObj.getDay()], month: MONTHS_FULL[m - 1], day: d, year: y };
}

function formatMins(mins) {
  if (!mins) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  return h ? `${h}h` : `${m}m`;
}

// ── Subcomponents ──────────────────────────────────────────────────────────

const AccuracyRing = ({ value, size = 72, strokeWidth = 6 }) => {
  const R = (size / 2) - strokeWidth;
  const circ = 2 * Math.PI * R;
  const offset = circ - (circ * Math.min(100, Math.max(0, value))) / 100;
  const color = value >= 99 ? '#22c55e' : value >= 50 ? 'var(--accent-blue)' : value > 0 ? '#faba2c' : 'var(--text-muted)';
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" className="stroke-bg-input" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-black text-text-main leading-none">{value}%</span>
        <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">acc</span>
      </div>
    </div>
  );
};

const HabitPill = ({ habit, done }) => (
  <div className={`flex items-center gap-2 py-1.5 px-2.5 rounded-xl text-xs font-bold ${done ? 'bg-emerald-500/5 border border-emerald-500/15 text-text-main' : 'bg-red-500/5 border border-red-500/10 text-text-muted'}`}>
    {done ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" /> : <XCircle size={12} className="text-red-400 shrink-0" />}
    <span className="truncate">{habit.title}</span>
  </div>
);

// ── Day Detail Modal ───────────────────────────────────────────────────────

const MODAL_TABS = [
  { id: 'tasks', label: 'Tasks', icon: <CheckCircle2 size={12} /> },
  { id: 'goals', label: 'Goals', icon: <Target size={12} /> },
  { id: 'focus', label: 'Focus', icon: <Brain size={12} /> },
];

const DayDetailModal = ({ date, isToday, onClose, taskLogs, goals, sessionLogs, focusHistory, accuracy }) => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [expandedGoal, setExpandedGoal] = useState(null);

  const taskData = useMemo(() => getDayTaskData(date, taskLogs, goals), [date, taskLogs, goals]);
  const goalData = useMemo(() => getDayGoalData(date, goals), [date, goals]);
  const focusData = useMemo(() => getDayFocusData(date, sessionLogs, focusHistory), [date, sessionLogs, focusHistory]);
  const streakImpact = useMemo(() => getDayStreakImpact(date, taskLogs, goals), [date, taskLogs, goals]);
  const insight = useMemo(() => generateDayInsight(date, taskData, goalData, focusData, streakImpact), [date, taskData, goalData, focusData, streakImpact]);

  const { dayName, month, day, year } = formatDateHeader(date);
  const isCurrentYear = year === new Date().getFullYear();
  const displayAccuracy = isToday ? accuracy : taskData.accuracy;
  const completedGoals = goalData.filter(g => g.goalCompleted).length;

  // goal-level accuracy for the day
  const goalDayAccuracy = goalData.length > 0
    ? Math.round(goalData.reduce((s, g) => s + g.dailyProgress, 0) / goalData.length) : 0;

  const insightBorder = {
    success: 'border-emerald-500/25 bg-emerald-500/5',
    warning: 'border-amber-500/25 bg-amber-500/5',
    critical: 'border-red-500/25 bg-red-500/5',
    neutral: 'border-border-light bg-bg-input/30',
  };

  const goalTitleMap = useMemo(() => {
    const map = {};
    (goals || []).forEach(g => (g.habits || []).forEach(h => { map[h.id] = { habitTitle: h.title, goalTitle: g.title }; }));
    return map;
  }, [goals]);

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
        <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        <motion.div
          className="relative bg-bg-card rounded-t-[28px] sm:rounded-[28px] border border-border-light shadow-2xl w-full sm:max-w-lg max-h-[88vh] flex flex-col overflow-hidden"
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        >
          <div className="sm:hidden w-10 h-1 bg-border-med rounded-full mx-auto mt-3 shrink-0" />

          {/* Header — fixed while content scrolls */}
          <div className="relative px-5 pt-4 pb-4 shrink-0 border-b border-border-light">
            {/* Close button — top-right, clear of ring */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-xl bg-bg-input hover:bg-border-light flex items-center justify-center text-text-muted hover:text-text-main transition-colors"
            >
              <X size={14} />
            </button>

            {/* Content row — pr-12 keeps text clear of close button */}
            <div className="flex items-start gap-3 pr-12">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{dayName}</p>
                  {isToday && <span className="text-[9px] font-black text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded-full">Today</span>}
                </div>
                <h2 className="text-xl font-black text-text-main tracking-tight">{month} {day}{!isCurrentYear && `, ${year}`}</h2>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {goalData.length > 0 && <span className="text-[10px] font-black text-text-muted flex items-center gap-1"><Target size={10} className="text-accent-blue" />{completedGoals}/{goalData.length} goals</span>}
                  {focusData.totalMins > 0 && <span className="text-[10px] font-black text-text-muted flex items-center gap-1"><Clock size={10} className="text-violet-400" />{formatMins(focusData.totalMins)}</span>}
                  <span className={`text-[10px] font-black flex items-center gap-1 ${streakImpact.impact === 'broke' ? 'text-red-400' : streakImpact.impact === 'neutral' ? 'text-text-muted' : 'text-amber-500'}`}>
                    {streakImpact.label}
                  </span>
                </div>
              </div>
              {/* Accuracy ring — never overlaps X due to pr-12 on parent */}
              <AccuracyRing value={displayAccuracy} size={64} strokeWidth={5} />
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 pt-3 pb-2 shrink-0">
            <div className="flex gap-1 p-0.5 bg-bg-input rounded-xl border border-border-light">
              {MODAL_TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === tab.id ? 'bg-bg-card text-text-main shadow-sm border border-border-light' : 'text-text-muted hover:text-text-main'}`}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Content — safe-area-aware bottom padding */}
          <div
            className="flex-1 overflow-y-auto min-h-0 px-4 pt-3 space-y-4"
            style={{ paddingBottom: 'calc(max(1.5rem, env(safe-area-inset-bottom, 0px)) + 1.5rem)' }}
          >
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>

                {/* Tasks Tab */}
                {activeTab === 'tasks' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Tasks Done', val: `${taskData.completedTasks}/${taskData.totalTasks}`, color: 'text-emerald-500', bg: 'bg-emerald-500/5 border-emerald-500/15' },
                        { label: 'Habits Done', val: `${taskData.completedHabits}/${taskData.totalHabits}`, color: 'text-accent-blue', bg: 'bg-accent-blue/5 border-accent-blue/15' },
                        { label: 'Tasks Missed', val: taskData.totalTasks - taskData.completedTasks, color: 'text-red-400', bg: 'bg-red-500/5 border-red-500/10' },
                        { label: 'Habits Missed', val: taskData.missedHabits, color: 'text-amber-500', bg: 'bg-amber-500/5 border-amber-500/10' },
                      ].map((s, i) => (
                        <div key={i} className={`rounded-2xl p-3 border ${s.bg}`}>
                          <p className={`text-xl font-black ${s.color} leading-none`}>{s.val}</p>
                          <p className="text-[9px] font-black text-text-muted uppercase tracking-wider mt-1">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    {goalData.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Habit Breakdown</p>
                        {goalData.map(goal => (
                          <div key={goal.goalId} className="bg-bg-input/30 rounded-xl border border-border-light overflow-hidden">
                            <button onClick={() => setExpandedGoal(expandedGoal === goal.goalId ? null : goal.goalId)} className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-bg-input/60 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${goal.goalCompleted ? 'bg-emerald-500' : goal.completedCount > 0 ? 'bg-amber-400' : 'bg-red-400'}`} />
                                <span className="text-xs font-black text-text-main truncate">{goal.goalTitle}</span>
                              </div>
                              <span className={`text-[10px] font-black shrink-0 ml-2 ${goal.goalCompleted ? 'text-emerald-500' : 'text-text-muted'}`}>{goal.completedCount}/{goal.totalScheduled}</span>
                            </button>
                            <AnimatePresence initial={false}>
                              {expandedGoal === goal.goalId && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden border-t border-border-light/40">
                                  <div className="p-2.5 space-y-1.5">
                                    {goal.scheduledHabits.map(h => <HabitPill key={h.id} habit={h} done={h.done} />)}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    )}
                    {goalData.length === 0 && taskData.totalTasks === 0 && (
                      <div className="py-6 text-center"><Target size={24} className="text-text-muted mx-auto mb-2 opacity-40" /><p className="text-sm text-text-muted font-bold">No data for this day</p></div>
                    )}
                  </div>
                )}

                {/* Goals Tab */}
                {activeTab === 'goals' && (
                  <div className="space-y-3">
                    {/* Goal accuracy ring */}
                    <div className="flex items-center justify-between p-4 bg-bg-input/30 rounded-2xl border border-border-light">
                      <div>
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Daily Goal Accuracy</p>
                        <p className={`text-3xl font-black tracking-tighter ${goalDayAccuracy >= 99 ? 'text-emerald-500' : goalDayAccuracy >= 50 ? 'text-accent-blue' : goalDayAccuracy > 0 ? 'text-amber-500' : 'text-text-muted'}`}>{goalDayAccuracy}%</p>
                        <p className="text-[10px] text-text-muted font-bold mt-1">{completedGoals}/{goalData.length} goals met their rule</p>
                      </div>
                      <div className="flex gap-3 text-center">
                        <div><p className="text-lg font-black text-emerald-500">{taskData.completedHabits}</p><p className="text-[8px] font-black text-text-muted uppercase">Done</p></div>
                        <div><p className="text-lg font-black text-red-400">{taskData.missedHabits}</p><p className="text-[8px] font-black text-text-muted uppercase">Missed</p></div>
                      </div>
                    </div>
                    {goalData.length > 0 ? goalData.map(goal => (
                      <div key={goal.goalId} className={`rounded-2xl border overflow-hidden ${goal.goalCompleted ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-border-light bg-bg-input/20'}`}>
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${goal.goalCompleted ? 'bg-emerald-500' : goal.completedCount > 0 ? 'bg-amber-400' : 'bg-red-400'}`} />
                            <div className="min-w-0">
                              <p className="text-xs font-black text-text-main truncate">{goal.goalTitle}</p>
                              <p className="text-[9px] font-bold text-text-muted">{goal.mode === 'ANY' ? 'Any habit rule' : goal.mode === 'CUSTOM' ? `Min ${goal.minHabits} rule` : 'All habits rule'}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-lg font-black tracking-tighter ${goal.goalCompleted ? 'text-emerald-500' : 'text-accent-blue'}`}>{goal.dailyProgress}%</p>
                            {goal.goalCompleted && <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">Done ✓</span>}
                          </div>
                        </div>
                        {goal.scheduledHabits.length > 0 && (
                          <div className="px-4 pb-3 space-y-1.5 border-t border-border-light/30 pt-2.5">
                            {goal.scheduledHabits.map(h => <HabitPill key={h.id} habit={h} done={h.done} />)}
                          </div>
                        )}
                      </div>
                    )) : (
                      <div className="py-6 text-center"><Target size={24} className="text-text-muted mx-auto mb-2 opacity-40" /><p className="text-sm text-text-muted font-bold">No goal data for this day</p></div>
                    )}
                  </div>
                )}

                {/* Focus Tab */}
                {activeTab === 'focus' && (
                  <div className="space-y-4">
                    {focusData.totalMins > 0 ? (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Total Focus', val: formatMins(focusData.totalMins), color: 'text-accent-blue', bg: 'bg-accent-blue/5 border-accent-blue/15' },
                            { label: 'Sessions', val: focusData.sessionCount ?? '—', color: 'text-violet-400', bg: 'bg-violet-500/5 border-violet-500/10' },
                            focusData.longestMins !== null && { label: 'Longest', val: formatMins(focusData.longestMins), color: 'text-amber-500', bg: 'bg-amber-500/5 border-amber-500/10' },
                            focusData.avgMins !== null && focusData.sessionCount > 1 && { label: 'Average', val: formatMins(focusData.avgMins), color: 'text-emerald-500', bg: 'bg-emerald-500/5 border-emerald-500/15' },
                          ].filter(Boolean).map((s, i) => (
                            <div key={i} className={`rounded-2xl p-3 border ${s.bg}`}>
                              <p className={`text-xl font-black ${s.color} leading-none`}>{s.val}</p>
                              <p className="text-[9px] font-black text-text-muted uppercase tracking-wider mt-1">{s.label}</p>
                            </div>
                          ))}
                        </div>
                        <div className={`rounded-2xl p-3 border text-center ${focusData.totalMins >= 120 ? 'border-emerald-500/25 bg-emerald-500/5' : focusData.totalMins >= 45 ? 'border-accent-blue/25 bg-accent-blue/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                          <p className={`font-black ${focusData.totalMins >= 120 ? 'text-emerald-500' : focusData.totalMins >= 45 ? 'text-accent-blue' : 'text-amber-500'}`}>
                            {focusData.totalMins >= 120 ? '🏆 Elite Deep Work' : focusData.totalMins >= 45 ? '⚡ Productive Session' : '🌱 Getting Started'}
                          </p>
                        </div>
                        {focusData.sessions.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Session Log</p>
                            {focusData.sessions.map((s, i) => {
                              const lookup = s.itemId ? goalTitleMap[s.itemId] : null;
                              return (
                                <div key={s.id || i} className="flex items-center gap-3 p-2.5 bg-bg-input/40 rounded-xl border border-border-light">
                                  <div className="w-7 h-7 rounded-lg bg-accent-blue/10 flex items-center justify-center shrink-0"><Brain size={13} className="text-accent-blue" /></div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-text-main truncate">{lookup ? lookup.habitTitle : s.goalId === 'DAILY_TASK' ? 'Daily Task' : 'Focus Session'}</p>
                                    {lookup && <p className="text-[9px] font-bold text-text-muted truncate">{lookup.goalTitle}</p>}
                                  </div>
                                  <span className="text-xs font-black text-accent-blue shrink-0">{formatMins(s.duration)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="py-6 text-center"><Clock size={24} className="text-text-muted mx-auto mb-2 opacity-40" /><p className="text-sm text-text-muted font-bold">No focus sessions logged</p></div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* AI Insight */}
            {insight && (
              <div className={`rounded-2xl p-4 border ${insightBorder[insight.tone] || insightBorder.neutral}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles size={12} className="text-accent-blue" />
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">AI Day Analysis</span>
                </div>
                <p className="text-sm font-black mb-1 text-text-main">{insight.headline}</p>
                <p className="text-[11px] text-text-muted font-medium leading-relaxed">{insight.body}</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────

export const ActivityHeatmap = ({ taskLogs, goals, sessionLogs, focusHistory, accuracy }) => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [selectedDay, setSelectedDay] = useState(null);
  const today = TODAY();
  const cells = useMemo(() => generateHeatmapData(30), []);

  const cellColors = useMemo(() => {
    const map = {};
    cells.forEach(cell => {
      if (cell.active) {
        if (accuracy >= 99) map[cell.key] = '#22c55e';
        else if (accuracy >= 50) map[cell.key] = 'var(--accent-blue)';
        else if (accuracy > 0) map[cell.key] = '#faba2c';
        else map[cell.key] = 'var(--bg-input)';
      } else if (activeTab === 'tasks') {
        map[cell.key] = getTaskHeatmapColor(cell.key, taskLogs);
      } else if (activeTab === 'goals') {
        map[cell.key] = getGoalHeatmapColor(cell.key, goals);
      } else {
        map[cell.key] = getFocusHeatmapColor(cell.key, sessionLogs, focusHistory);
      }
    });
    return map;
  }, [cells, activeTab, taskLogs, goals, sessionLogs, focusHistory, accuracy]);

  const handleCellClick = useCallback((cell) => setSelectedDay({ date: cell.key, isToday: cell.active }), []);
  const activeTabConfig = TABS.find(t => t.id === activeTab);

  return (
    <>
      <div className="bg-bg-card rounded-[28px] p-5 border border-border-light shadow-sm">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xs font-black text-text-muted uppercase tracking-widest">Consistency Map</h3>
            <p className="text-lg font-black text-text-main tracking-tight">30-Day Activity</p>
            <p className="text-[10px] text-text-muted font-bold mt-0.5 opacity-70">{activeTabConfig.description}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Accuracy</p>
            <p className={`text-lg font-black ${accuracy >= 90 ? 'text-emerald-500' : 'text-accent-blue'}`}>{accuracy}%</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 p-0.5 bg-bg-input rounded-xl border border-border-light mb-4">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all duration-200 ${activeTab === tab.id ? 'bg-bg-card text-text-main shadow-sm border border-border-light' : 'text-text-muted hover:text-text-main'}`}>
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Heatmap Grid - single 30-col row on all breakpoints */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -3 }} transition={{ duration: 0.18 }}
            className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px] sm:gap-1">
            {cells.map(cell => (
              <motion.button key={cell.key} onClick={() => handleCellClick(cell)}
                title={getDayTooltip(cell.key, activeTab, taskLogs, goals, sessionLogs, focusHistory, accuracy, cell.active)}
                whileHover={{ scale: 1.25 }} whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={`aspect-square rounded-[3px] cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent-blue focus:ring-offset-1 focus:ring-offset-bg-card ${cell.active ? 'ring-2 ring-accent-blue/40 ring-offset-1 ring-offset-bg-card' : ''}`}
                style={{ backgroundColor: cellColors[cell.key] || 'var(--bg-input)' }}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Footer: only labels, no legend */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[8px] font-black text-text-muted uppercase tracking-[0.15em]">30D Ago</span>
          <span className="text-[8px] font-black text-text-muted uppercase tracking-[0.15em]">Today</span>
        </div>
      </div>

      <AnimatePresence>
        {selectedDay && (
          <DayDetailModal key={selectedDay.date} date={selectedDay.date} isToday={selectedDay.isToday} onClose={() => setSelectedDay(null)}
            taskLogs={taskLogs} goals={goals} sessionLogs={sessionLogs} focusHistory={focusHistory} accuracy={accuracy} />
        )}
      </AnimatePresence>
    </>
  );
};

export default ActivityHeatmap;
