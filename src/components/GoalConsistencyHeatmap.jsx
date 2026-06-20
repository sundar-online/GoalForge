import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Flame, Trophy, TrendingUp, TrendingDown,
  CheckCircle2, XCircle, BarChart2, Sparkles, X,
  ChevronRight, CheckSquare, Square, Clock
} from 'lucide-react';
import { generateHeatmapData } from '../utils/heatmapUtils';
import { getGoalHeatmapColor, getDayGoalData, generateDayInsight, getDayFocusData, getDayTaskData, getDayStreakImpact } from '../utils/heatmapAnalytics';
import { calculateGoalStreak, getGoalScheduledDays } from '../utils/calculationUtils';
import { TODAY, addDays, parseLocalDate } from '../utils/dateUtils';

// ── Helpers ────────────────────────────────────────────────────────────────

const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateHeader(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return {
    dayName: DAY_ABBRS[dateObj.getDay()],
    month: MONTHS_FULL[m - 1],
    monthShort: MONTHS_SHORT[m - 1],
    day: d,
    year: y,
  };
}

function formatMins(mins) {
  if (!mins) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  return h ? `${h}h` : `${m}m`;
}

/** Compute 30-day goal accuracy as average of daily completion across all days with active goals */
function computeGoalAccuracy30(goals) {
  const today = TODAY();
  const days = Array.from({ length: 30 }, (_, i) => addDays(today, -(29 - i)));
  const activeDays = days.filter(d => {
    const goalData = getDayGoalData(d, goals);
    return goalData.length > 0;
  });
  if (activeDays.length === 0) return 0;

  const total = activeDays.reduce((sum, d) => {
    const goalData = getDayGoalData(d, goals);
    const completed = goalData.filter(g => g.goalCompleted).length;
    return sum + (goalData.length > 0 ? Math.round((completed / goalData.length) * 100) : 0);
  }, 0);
  return Math.round(total / activeDays.length);
}

/** Most consistent goal = highest completedDates count in last 30 days relative to scheduled days */
function getMostConsistentGoal(goals) {
  const today = TODAY();
  const days = new Set(Array.from({ length: 30 }, (_, i) => addDays(today, -(29 - i))));

  return (goals || [])
    .filter(g => !g.isMissingDream && (g.habits || []).length > 0)
    .map(g => {
      const scheduledDays = (g.completedDates || []).filter(d => days.has(d)).length;
      // Count how many scheduled days existed in 30 days
      const scheduledCount = Array.from(days).filter(d => {
        const [y, m, day] = d.split('-').map(Number);
        const dayName = DAY_ABBRS[new Date(y, m - 1, day).getDay()];
        const goalSchedule = getGoalScheduledDays(g);
        return goalSchedule.length === 0 || goalSchedule.includes(dayName);
      }).length;
      const rate = scheduledCount > 0 ? Math.round((scheduledDays / scheduledCount) * 100) : 0;
      return { title: g.title, tag: g.tag, completedDays: scheduledDays, scheduledCount, rate };
    })
    .sort((a, b) => b.rate - a.rate)[0] || null;
}

/** Most missed goal = most scheduled days without a completedDate in last 30 days */
function getMostMissedGoal(goals) {
  const today = TODAY();
  const days = new Set(Array.from({ length: 30 }, (_, i) => addDays(today, -(29 - i))));

  return (goals || [])
    .filter(g => !g.isMissingDream && (g.habits || []).length > 0)
    .map(g => {
      const completedSet = new Set((g.completedDates || []).filter(d => days.has(d)));
      const goalSchedule = getGoalScheduledDays(g);
      const scheduledDays = Array.from(days).filter(d => {
        const [y, m, day] = d.split('-').map(Number);
        const dayName = DAY_ABBRS[new Date(y, m - 1, day).getDay()];
        return goalSchedule.length === 0 || goalSchedule.includes(dayName);
      });
      const missedDays = scheduledDays.filter(d => !completedSet.has(d)).length;
      return { title: g.title, tag: g.tag, missedDays, scheduledCount: scheduledDays.length };
    })
    .filter(g => g.missedDays > 0)
    .sort((a, b) => b.missedDays - a.missedDays)[0] || null;
}

/** Best goal streak across all goals */
function getBestGoalStreak(goals) {
  let best = { title: '', streak: 0, tag: '' };
  (goals || []).filter(g => !g.isMissingDream).forEach(g => {
    const schedule = getGoalScheduledDays(g);
    const { current } = calculateGoalStreak(g.completedDates || [], schedule, g.startDate || g.createdAt);
    if (current > best.streak) {
      best = { title: g.title, streak: current, tag: g.tag };
    }
  });
  return best;
}

// ── Day Modal ─────────────────────────────────────────────────────────────

const HabitRow = ({ habit, done }) => (
  <div className={`flex items-center gap-2.5 py-2 px-3 rounded-xl ${done ? 'bg-emerald-500/5 border border-emerald-500/15' : 'bg-red-500/5 border border-red-500/10'}`}>
    {done
      ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
      : <XCircle size={13} className="text-red-400 shrink-0" />
    }
    <span className={`text-xs font-bold flex-1 truncate ${done ? 'text-text-main' : 'text-text-muted'}`}>{habit.title}</span>
    {done && <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full shrink-0">Done</span>}
  </div>
);

const GoalDayModal = ({ date, isToday, onClose, goals, taskLogs, sessionLogs, focusHistory, accuracy }) => {
  const [expandedGoal, setExpandedGoal] = useState(null);

  const goalData = useMemo(() => getDayGoalData(date, goals), [date, goals]);
  const taskData = useMemo(() => getDayTaskData(date, taskLogs, goals), [date, taskLogs, goals]);
  const focusData = useMemo(() => getDayFocusData(date, sessionLogs, focusHistory), [date, sessionLogs, focusHistory]);
  const streakImpact = useMemo(() => getDayStreakImpact(date, taskLogs, goals), [date, taskLogs, goals]);
  const insight = useMemo(() => generateDayInsight(date, taskData, goalData, focusData, streakImpact), [date, taskData, goalData, focusData, streakImpact]);

  const { dayName, month, day, year } = formatDateHeader(date);
  const isCurrentYear = year === new Date().getFullYear();

  const completedGoals = goalData.filter(g => g.goalCompleted).length;
  const totalGoals = goalData.length;
  const displayAccuracy = isToday ? accuracy : taskData.accuracy;

  // Goal-level accuracy for this day
  const goalDayAccuracy = totalGoals > 0
    ? Math.round(goalData.reduce((s, g) => s + g.dailyProgress, 0) / totalGoals)
    : 0;

  const insightToneMap = {
    success: 'border-emerald-500/25 bg-emerald-500/5 text-emerald-400',
    warning: 'border-amber-500/25 bg-amber-500/5 text-amber-400',
    critical: 'border-red-500/25 bg-red-500/5 text-red-400',
    neutral: 'border-border-light bg-bg-input/30 text-text-muted',
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        />

        {/* Panel */}
        <motion.div
          className="relative bg-bg-card rounded-t-[28px] sm:rounded-[28px] border border-border-light shadow-2xl w-full sm:max-w-md max-h-[88vh] flex flex-col overflow-hidden"
          initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        >
          {/* Drag handle */}
          <div className="sm:hidden w-10 h-1 bg-border-med rounded-full mx-auto mt-3 shrink-0" />

          {/* Header — fixed while content scrolls */}
          <div className="relative px-5 pt-4 pb-4 border-b border-border-light shrink-0">
            {/* Close button — top-right, z-10, never overlaps ring */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-xl bg-bg-input hover:bg-border-light flex items-center justify-center text-text-muted hover:text-text-main transition-colors"
            >
              <X size={14} />
            </button>

            {/* Content row — pr-12 reserves space for close button */}
            <div className="flex items-start gap-3 pr-12">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{dayName}</p>
                  {isToday && <span className="text-[9px] font-black text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded-full">Today</span>}
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${streakImpact.impact === 'broke' ? 'text-red-400 bg-red-500/10' : streakImpact.impact === 'neutral' ? 'text-text-muted bg-bg-input' : 'text-amber-500 bg-amber-500/10'}`}>
                    {streakImpact.label}
                  </span>
                </div>
                <h2 className="text-xl font-black text-text-main tracking-tight">
                  {month} {day}{!isCurrentYear && `, ${year}`}
                </h2>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-[10px] font-black text-text-muted flex items-center gap-1">
                    <Target size={10} className="text-accent-blue" />
                    {completedGoals}/{totalGoals} goals
                  </span>
                  {focusData.totalMins > 0 && (
                    <span className="text-[10px] font-black text-text-muted flex items-center gap-1">
                      <Clock size={10} className="text-violet-400" />
                      {formatMins(focusData.totalMins)}
                    </span>
                  )}
                </div>
              </div>

              {/* Goal accuracy ring — never overlaps X due to pr-12 on row */}
              <div className="shrink-0 text-center">
                <div className="relative w-14 h-14">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="22" fill="none" className="stroke-bg-input" strokeWidth="5" />
                    <circle
                      cx="28" cy="28" r="22" fill="none"
                      stroke={goalDayAccuracy >= 99 ? '#22c55e' : goalDayAccuracy >= 50 ? 'var(--accent-blue)' : goalDayAccuracy > 0 ? '#faba2c' : 'var(--text-muted)'}
                      strokeWidth="5"
                      strokeDasharray={2 * Math.PI * 22}
                      strokeDashoffset={2 * Math.PI * 22 * (1 - goalDayAccuracy / 100)}
                      strokeLinecap="round"
                      className="transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm font-black text-text-main leading-none">{goalDayAccuracy}%</span>
                  </div>
                </div>
                <p className="text-[8px] font-black text-text-muted uppercase tracking-wider mt-1">Goal Acc.</p>
              </div>
            </div>
          </div>

          {/* Scrollable Content — safe-area-aware bottom padding */}
          <div
            className="flex-1 overflow-y-auto min-h-0 px-4 pt-4 space-y-4"
            style={{ paddingBottom: 'calc(max(1.5rem, env(safe-area-inset-bottom, 0px)) + 1.5rem)' }}
          >

            {/* Overall stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Goals Done', val: completedGoals, color: 'text-emerald-500', bg: 'bg-emerald-500/5 border-emerald-500/15' },
                { label: 'Habits Done', val: taskData.completedHabits, color: 'text-accent-blue', bg: 'bg-accent-blue/5 border-accent-blue/15' },
                { label: 'Habits Missed', val: taskData.missedHabits, color: taskData.missedHabits > 0 ? 'text-red-400' : 'text-text-muted', bg: 'bg-bg-input border-border-light' },
              ].map((s, i) => (
                <div key={i} className={`rounded-2xl p-3 text-center border ${s.bg}`}>
                  <p className={`text-xl font-black ${s.color} leading-none`}>{s.val}</p>
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-wider mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Per-Goal Breakdown */}
            {goalData.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest px-1">Goal Progress</p>
                {goalData.map(goal => (
                  <div key={goal.goalId} className={`rounded-2xl border overflow-hidden ${goal.goalCompleted ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-border-light bg-bg-input/20'}`}>
                    <button
                      onClick={() => setExpandedGoal(expandedGoal === goal.goalId ? null : goal.goalId)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-input/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${goal.goalCompleted ? 'bg-emerald-500' : goal.completedCount > 0 ? 'bg-amber-400' : 'bg-red-400'}`} />
                        <span className="text-xs font-black text-text-main truncate">{goal.goalTitle}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Progress bar mini */}
                        <div className="w-16 h-1.5 bg-bg-input rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${goal.goalCompleted ? 'bg-emerald-500' : 'bg-accent-blue'}`}
                            style={{ width: `${goal.dailyProgress}%` }}
                          />
                        </div>
                        <span className={`text-[10px] font-black ${goal.goalCompleted ? 'text-emerald-500' : 'text-text-muted'}`}>
                          {goal.dailyProgress}%
                        </span>
                        <ChevronRight size={12} className={`text-text-muted transition-transform duration-200 ${expandedGoal === goal.goalId ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {expandedGoal === goal.goalId && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-3 space-y-1.5 border-t border-border-light/40 pt-2.5">
                            {goal.scheduledHabits.length > 0 ? (
                              goal.scheduledHabits.map(h => (
                                <HabitRow key={h.id} habit={h} done={h.done} />
                              ))
                            ) : (
                              <p className="text-[11px] text-text-muted italic">No habits scheduled this day</p>
                            )}
                            <div className="flex gap-3 mt-1.5 pt-1.5 border-t border-border-light/30">
                              <span className="text-[9px] font-black text-emerald-500">✅ {goal.completedCount} done</span>
                              <span className="text-[9px] font-black text-red-400">❌ {goal.missedCount} missed</span>
                              <span className="text-[9px] font-black text-text-muted ml-auto">{goal.totalScheduled} scheduled</span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <Target size={24} className="text-text-muted mx-auto mb-2 opacity-40" />
                <p className="text-sm text-text-muted font-bold">No goal data for this day</p>
                <p className="text-[11px] text-text-muted mt-1 opacity-60">May predate your goals setup</p>
              </div>
            )}

            {/* AI Insight */}
            {insight && (
              <div className={`rounded-2xl p-4 border ${insightToneMap[insight.tone] || insightToneMap.neutral}`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles size={12} className="text-accent-blue" />
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">AI Day Analysis</span>
                </div>
                <p className="text-sm font-black mb-1">{insight.headline}</p>
                <p className="text-[11px] text-text-muted font-medium leading-relaxed">{insight.body}</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// ── Main Widget ────────────────────────────────────────────────────────────

export const GoalConsistencyHeatmap = ({
  goals,
  taskLogs,
  sessionLogs,
  focusHistory,
  accuracy,
}) => {
  const [selectedDay, setSelectedDay] = useState(null);
  const today = TODAY();
  const cells = useMemo(() => generateHeatmapData(30), []);

  // ── Stats ────────────────────────────────────────────────────────────────
  const goalAccuracy30 = useMemo(() => computeGoalAccuracy30(goals), [goals]);
  const bestStreak = useMemo(() => getBestGoalStreak(goals), [goals]);
  const mostConsistent = useMemo(() => getMostConsistentGoal(goals), [goals]);
  const mostMissed = useMemo(() => getMostMissedGoal(goals), [goals]);

  // ── Cell colors ──────────────────────────────────────────────────────────
  const cellColors = useMemo(() => {
    const map = {};
    cells.forEach(cell => {
      if (cell.active) {
        // Today's cell uses live accuracy
        if (accuracy >= 99) map[cell.key] = '#22c55e';
        else if (accuracy >= 50) map[cell.key] = 'var(--accent-blue)';
        else if (accuracy > 0) map[cell.key] = '#faba2c';
        else map[cell.key] = 'var(--bg-input)';
      } else {
        map[cell.key] = getGoalHeatmapColor(cell.key, goals);
      }
    });
    return map;
  }, [cells, goals, accuracy]);

  const activeGoalCount = (goals || []).filter(g => !g.isMissingDream && (g.habits || []).length > 0).length;

  return (
    <>
      <div className="bg-bg-card rounded-[28px] p-5 border border-border-light shadow-sm">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Target size={14} className="text-emerald-500" />
              </div>
              <h3 className="text-xs font-black text-text-muted uppercase tracking-widest">Goal Consistency</h3>
            </div>
            <p className="text-lg font-black text-text-main tracking-tight">30-Day Goal Heatmap</p>
            <p className="text-[10px] text-text-muted font-bold mt-0.5 opacity-70">Goal completion rule satisfaction per day</p>
          </div>

          {/* Goal Accuracy % */}
          <div className="text-right shrink-0">
            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Goal Accuracy</p>
            <p className={`text-xl font-black tracking-tight leading-none mt-0.5 ${goalAccuracy30 >= 80 ? 'text-emerald-500' : goalAccuracy30 >= 50 ? 'text-accent-blue' : goalAccuracy30 > 0 ? 'text-amber-500' : 'text-text-muted'}`}>
              {goalAccuracy30}%
            </p>
            <p className="text-[9px] text-text-muted font-bold mt-0.5">30-day avg</p>
          </div>
        </div>

        {/* ── Heatmap Grid - single 30-col row on all breakpoints ── */}
        <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px] sm:gap-1 mb-3">
          {cells.map(cell => {
            const color = cellColors[cell.key] || 'var(--bg-input)';
            const goalData = getDayGoalData(cell.key, goals);
            const completed = goalData.filter(g => g.goalCompleted).length;
            const tooltip = cell.active
              ? `Today · ${accuracy}% accuracy`
              : goalData.length === 0
                ? `${cell.key}: No goal data`
                : `${cell.key}: ${completed}/${goalData.length} goals completed`;

            return (
              <motion.button
                key={cell.key}
                onClick={() => setSelectedDay({ date: cell.key, isToday: cell.active })}
                title={tooltip}
                aria-label={tooltip}
                whileHover={{ scale: 1.3 }}
                whileTap={{ scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={`aspect-square rounded-[3px] cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:ring-offset-1 focus:ring-offset-bg-card
                  ${cell.active ? 'ring-2 ring-emerald-500/40 ring-offset-1 ring-offset-bg-card' : ''}
                `}
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>

        {/* Footer: only labels, no legend */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[8px] font-black text-text-muted uppercase tracking-[0.15em]">30D Ago</span>
          <span className="text-[8px] font-black text-text-muted uppercase tracking-[0.15em]">Today</span>
        </div>

        {/* ── Stats Section ────────────────────────────────────── */}
        {activeGoalCount > 0 ? (
          <div className="border-t border-border-light pt-4 space-y-3">
            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Goal Intelligence</p>

            {/* Best Streak */}
            {bestStreak.streak > 0 && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-orange-500/5 border border-orange-500/15">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                    <Flame size={13} className="text-orange-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-wider">Best Goal Streak</p>
                    <p className="text-xs font-black text-text-main truncate">{bestStreak.title}</p>
                  </div>
                </div>
                <span className="text-sm font-black text-orange-500 shrink-0">🔥 {bestStreak.streak}d</span>
              </div>
            )}

            {/* Most Consistent */}
            {mostConsistent && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Trophy size={13} className="text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-wider">Most Consistent</p>
                    <p className="text-xs font-black text-text-main truncate">{mostConsistent.title}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-emerald-500">{mostConsistent.rate}%</p>
                  <p className="text-[8px] text-text-muted font-bold">{mostConsistent.completedDays}/{mostConsistent.scheduledCount}d</p>
                </div>
              </div>
            )}

            {/* Most Missed */}
            {mostMissed && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-red-500/5 border border-red-500/15">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                    <TrendingDown size={13} className="text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-wider">Most Missed</p>
                    <p className="text-xs font-black text-text-main truncate">{mostMissed.title}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-red-400">{mostMissed.missedDays}d</p>
                  <p className="text-[8px] text-text-muted font-bold">of {mostMissed.scheduledCount}</p>
                </div>
              </div>
            )}

            {!bestStreak.streak && !mostConsistent && !mostMissed && (
              <p className="text-[11px] text-text-muted italic text-center py-2">
                Complete habits across multiple days to see goal intelligence
              </p>
            )}
          </div>
        ) : (
          <div className="border-t border-border-light pt-4 text-center py-3">
            <p className="text-[11px] text-text-muted font-bold">Set up goals with habits to track consistency</p>
          </div>
        )}

      </div>

      {/* Day Modal */}
      <AnimatePresence>
        {selectedDay && (
          <GoalDayModal
            key={selectedDay.date}
            date={selectedDay.date}
            isToday={selectedDay.isToday}
            onClose={() => setSelectedDay(null)}
            goals={goals}
            taskLogs={taskLogs}
            sessionLogs={sessionLogs}
            focusHistory={focusHistory}
            accuracy={accuracy}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default GoalConsistencyHeatmap;
