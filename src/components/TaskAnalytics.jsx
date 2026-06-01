import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { isTaskDone, calculateTaskStreak } from '../utils/calculationUtils';
import { TODAY, addDays } from '../utils/dateUtils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  CheckCircle2,
  Clock,
  Zap,
  Flame,
  TrendingUp,
  Award,
  CalendarCheck,
  Sparkles,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

// Custom tooltips for recharts
const TrendTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { label, completed, scheduled, accuracy } = payload[0].payload;
  return (
    <div className="bg-bg-card border border-border-med rounded-2xl px-4 py-3 shadow-2xl min-w-[165px] animate-in fade-in">
      <p className="text-xs font-black text-text-main mb-2">{label}</p>
      <div className="space-y-1.5 text-[10px] text-text-muted font-bold uppercase tracking-wider">
        <div className="flex justify-between gap-4">
          <span>Completions</span>
          <span className="text-text-main font-black">{completed}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Scheduled</span>
          <span className="text-text-main font-black">{scheduled}</span>
        </div>
        <div className="flex justify-between gap-4 border-t border-border-light pt-1 mt-1">
          <span>Daily Accuracy</span>
          <span className="text-purple-400 font-black">{accuracy}%</span>
        </div>
      </div>
    </div>
  );
};

export const TaskAnalytics = ({ setView }) => {
  const { tasks = [] } = useAppContext();
  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' or 'weekly'
  const todayStr = TODAY();

  // --- Calculations ---

  // Today's active tasks
  const todayTasks = useMemo(() => {
    return tasks.filter(t => {
      const sType = t.type || 'daily';
      if (sType === 'daily') return true;
      if (sType === 'single') return (t.targetDate || t.date) === todayStr;
      if (sType === 'range') return t.startDate <= todayStr && t.endDate >= todayStr;
      return false;
    });
  }, [tasks, todayStr]);

  // Today's completed tasks
  const completedTodayTasks = useMemo(() => {
    return todayTasks.filter(isTaskDone);
  }, [todayTasks]);

  // Today's pending tasks count
  const pendingTasksCount = todayTasks.length - completedTodayTasks.length;

  // Daily task completion accuracy (%)
  const dailyTaskAccuracy = useMemo(() => {
    if (todayTasks.length === 0) return 100;
    return Math.round((completedTodayTasks.length / todayTasks.length) * 100);
  }, [todayTasks, completedTodayTasks]);

  // Weekly Stats (last 7 days)
  const weeklyStats = useMemo(() => {
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
      last7Days.push(addDays(todayStr, -i));
    }
    last7Days.reverse();

    let totalScheduledOverWeek = 0;
    let totalCompletedOverWeek = 0;

    const breakdown = last7Days.map(dateStr => {
      const dayTasks = tasks.filter(t => {
        const sType = t.type || 'daily';
        if (sType === 'daily') {
          const createdDate = t.createdAt ? t.createdAt.split('T')[0] : null;
          return !createdDate || dateStr >= createdDate;
        }
        if (sType === 'single') return (t.targetDate || t.date) === dateStr;
        if (sType === 'range') return t.startDate <= dateStr && t.endDate >= dateStr;
        return false;
      });

      const completedCount = dayTasks.filter(t => {
        const dates = t.completedDates || [];
        return dates.includes(dateStr);
      }).length;

      totalScheduledOverWeek += dayTasks.length;
      totalCompletedOverWeek += completedCount;

      const dateObj = new Date(dateStr);
      const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

      return {
        date: dateStr,
        dayLabel,
        scheduled: dayTasks.length,
        completed: completedCount,
        accuracy: dayTasks.length === 0 ? 0 : Math.round((completedCount / dayTasks.length) * 100)
      };
    });

    const completionRate = totalScheduledOverWeek === 0 ? 100 : Math.round((totalCompletedOverWeek / totalScheduledOverWeek) * 100);

    return {
      breakdown,
      completionRate,
      totalScheduledOverWeek,
      totalCompletedOverWeek
    };
  }, [tasks, todayStr]);

  // Monthly Stats (last 30 days)
  const monthlyStats = useMemo(() => {
    const last30Days = [];
    for (let i = 0; i < 30; i++) {
      last30Days.push(addDays(todayStr, -i));
    }
    last30Days.reverse();

    return last30Days.map(dateStr => {
      const dayTasks = tasks.filter(t => {
        const sType = t.type || 'daily';
        if (sType === 'daily') {
          const createdDate = t.createdAt ? t.createdAt.split('T')[0] : null;
          return !createdDate || dateStr >= createdDate;
        }
        if (sType === 'single') return (t.targetDate || t.date) === dateStr;
        if (sType === 'range') return t.startDate <= dateStr && t.endDate >= dateStr;
        return false;
      });

      const completed = dayTasks.filter(t => {
        const dates = t.completedDates || [];
        return dates.includes(dateStr);
      }).length;

      const parsedDate = new Date(dateStr);
      const label = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      return {
        date: dateStr,
        label,
        completed,
        scheduled: dayTasks.length,
        accuracy: dayTasks.length === 0 ? 0 : Math.round((completed / dayTasks.length) * 100)
      };
    });
  }, [tasks, todayStr]);

  // Streak Consistency — aligned with Dashboard's cross-task productive streak.
  // Bug 3 fix: was previously Math.max(individual task streaks), which diverged from Dashboard.
  // Now builds a union of all completedDates across daily tasks and computes the consecutive streak,
  // so Dashboard and TaskAnalytics show identical "Current Streak" and "Best Streak" values.
  const taskStreakData = useMemo(() => {
    const dailyTasks = tasks.filter(t => (t.type || 'daily') === 'daily');
    if (dailyTasks.length === 0) return { current: 0, best: 0 };

    // Build a union of all completion dates across all daily tasks
    const allDatesSet = new Set();
    dailyTasks.forEach(t => {
      (t.completedDates || []).forEach(d => allDatesSet.add(d));
    });
    const allDates = [...allDatesSet].sort();

    if (allDates.length === 0) return { current: 0, best: 0 };

    const { current, best } = calculateTaskStreak(allDates);
    return { current, best };
  }, [tasks]);

  // Task Discipline Score (Aggregate score: 40% Daily Accuracy, 30% Weekly Completion, 30% Streak capped)
  const taskDisciplineScore = useMemo(() => {
    if (tasks.length === 0) return 0;
    const dailyPart = dailyTaskAccuracy * 0.4;
    const weeklyPart = weeklyStats.completionRate * 0.3;
    const streakPart = Math.min(30, taskStreakData.current * 6);
    return Math.round(dailyPart + weeklyPart + streakPart);
  }, [tasks, dailyTaskAccuracy, weeklyStats.completionRate, taskStreakData]);

  // Determine discipline level text and color
  const levelDetails = useMemo(() => {
    if (tasks.length === 0) return { title: 'Inactive', color: 'text-text-muted', gradient: 'from-text-muted to-text-muted' };
    if (taskDisciplineScore >= 90) return { title: 'Elite Operator', color: 'text-purple-400', gradient: 'from-purple-500 to-indigo-500' };
    if (taskDisciplineScore >= 70) return { title: 'Deep Focused', color: 'text-accent-blue', gradient: 'from-accent-blue to-indigo-400' };
    if (taskDisciplineScore >= 40) return { title: 'Disciplined Builder', color: 'text-orange-400', gradient: 'from-orange-500 to-amber-400' };
    return { title: 'Initiate Operator', color: 'text-rose-400', gradient: 'from-rose-500 to-pink-500' };
  }, [taskDisciplineScore, tasks.length]);

  // Empty State Guard
  if (tasks.length === 0) {
    return (
      <section className="bg-bg-card rounded-[32px] p-6 sm:p-8 shadow-sm border border-border-light">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
            <CalendarCheck size={18} />
          </div>
          <div>
            <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.15em]">Analytics</p>
            <h3 className="text-sm font-black text-text-main tracking-tight leading-none mt-0.5">Task Productivity</h3>
          </div>
        </div>
        <div className="py-12 text-center border-2 border-dashed border-border-med rounded-[28px] hover:bg-bg-input transition-colors space-y-3 cursor-pointer" onClick={() => setView('tasks')}>
          <div className="w-12 h-12 rounded-2xl bg-bg-input flex items-center justify-center mx-auto mb-2">
            <Zap className="text-text-muted animate-pulse" size={24} />
          </div>
          <p className="font-black text-text-main text-sm sm:text-base">No tasks forged yet</p>
          <p className="text-xs text-text-muted font-bold px-4">Create your first task in Today's Forge to activate Task Analytics.</p>
        </div>
      </section>
    );
  }

  // Circular gauge setup
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  const gaugeOffset = CIRC - (CIRC * taskDisciplineScore) / 100;

  return (
    <section className="bg-bg-card rounded-[32px] p-5 sm:p-6 md:p-8 shadow-sm border border-border-light transition-all hover:shadow-md">
      {/* --- Section Header --- */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
            <CalendarCheck size={18} />
          </div>
          <div>
            <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.15em] leading-none mb-1">Productivity Module</p>
            <h2 className="text-base sm:text-lg font-black text-text-main tracking-tight leading-none">Task Analytics</h2>
          </div>
        </div>
        <button
          onClick={() => setView('tasks')}
          className="self-start sm:self-auto flex items-center gap-1.5 px-4.5 py-2.5 rounded-2xl bg-bg-input border border-border-light text-text-main font-black text-xs hover:bg-border-light transition-all active:scale-95 shadow-sm"
        >
          Manage Today's Forge <ChevronRight size={14} />
        </button>
      </header>

      {/* --- Main Contents: Gauge & Key Metrics Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 mb-8 items-center">
        {/* Left Column: Discipline Score Circular Gauge */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-5 rounded-[28px] bg-bg-input/30 border border-border-light/50 shadow-xs">
          <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.18em] mb-4">Task Discipline Score</p>
          <div className="relative w-36 h-36 sm:w-40 sm:h-40">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 124 124">
              {/* Track */}
              <circle cx="62" cy="62" r={R} fill="none" className="stroke-bg-input" strokeWidth="9" />
              {/* Dynamic Gradient Value */}
              <circle
                cx="62"
                cy="62"
                r={R}
                fill="none"
                stroke="url(#taskDisciplineGrad)"
                strokeWidth="10"
                strokeDasharray={CIRC}
                strokeDashoffset={gaugeOffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="taskDisciplineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a78bfa" />   {/* Violet */}
                  <stop offset="100%" stopColor="#5a85ff" />  {/* Accent Blue */}
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl sm:text-4xl font-black text-text-main tracking-tighter">{taskDisciplineScore}</span>
              <span className="text-[8px] font-black text-text-muted uppercase tracking-widest mt-0.5">Rating</span>
            </div>
          </div>
          <div className="mt-4 px-4.5 py-1.5 rounded-full bg-bg-card border border-border-light shadow-2xs text-center">
            <p className={`text-xs font-black uppercase tracking-wider ${levelDetails.color}`}>
              {levelDetails.title}
            </p>
          </div>
        </div>

        {/* Right Column: Key metrics grid */}
        <div className="md:col-span-7 grid grid-cols-2 gap-4">
          {[
            {
              label: 'Total Active',
              val: todayTasks.length,
              icon: <Zap size={15} className="text-purple-400" />,
              color: 'text-purple-400',
              bgColor: 'bg-purple-400/10'
            },
            {
              label: 'Done Today',
              val: completedTodayTasks.length,
              icon: <CheckCircle2 size={15} className="text-emerald-500" />,
              color: 'text-emerald-500',
              bgColor: 'bg-emerald-500/10'
            },
            {
              label: 'Pending',
              val: pendingTasksCount,
              icon: <Clock size={15} className="text-orange-500" />,
              color: 'text-orange-500',
              bgColor: 'bg-orange-500/10'
            },
            {
              label: 'Daily Accuracy',
              val: `${dailyTaskAccuracy}%`,
              icon: <TrendingUp size={15} className="text-accent-blue" />,
              color: 'text-accent-blue',
              bgColor: 'bg-accent-blue/10'
            },
            {
              label: 'Current Streak',
              val: `${taskStreakData.current}d`,
              icon: <Flame size={15} className="text-orange-400 animate-pulse" fill="currentColor" />,
              color: 'text-orange-400',
              bgColor: 'bg-orange-500/10'
            },
            {
              label: 'Best Streak',
              val: `${taskStreakData.best}d`,
              icon: <Award size={15} className="text-amber-500" />,
              color: 'text-amber-500',
              bgColor: 'bg-amber-500/10'
            }
          ].map((card, i) => (
            <div
              key={i}
              className="bg-bg-input/20 border border-border-light/60 p-4 rounded-2xl flex items-center justify-between gap-3 hover:border-border-med hover:scale-[1.01] transition-all group shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8.5 h-8.5 rounded-xl ${card.bgColor} flex items-center justify-center shrink-0`}>
                  {card.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[18px] sm:text-[20px] font-black text-text-main tracking-tight leading-none">{card.val}</p>
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-wider mt-1 truncate">{card.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- Section Footer: Tabs & Visual Trends --- */}
      <div className="border-t border-border-light pt-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1 rounded-xl bg-bg-input/60 border border-border-light/50 max-w-[280px] mb-6">
          {[
            { id: 'monthly', label: 'Monthly Trends' },
            { id: 'weekly', label: 'Weekly Activity' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 text-center py-2 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-bg-card text-text-main shadow-xs'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Panel Renderings */}
        <AnimatePresence mode="wait">
          {activeTab === 'monthly' ? (
            <motion.div
              key="monthly"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.18em]">30-Day Productivity View</p>
                <div className="flex items-center gap-1.5 text-[10px] font-black text-purple-400 uppercase tracking-widest bg-purple-500/10 px-2 py-0.5 rounded-md">
                  <Sparkles size={11} /> Compound Trend
                </div>
              </div>
              <div className="w-full" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyStats} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="taskTrendGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
                    <XAxis
                      dataKey="label"
                      stroke="var(--text-muted)"
                      fontSize={8}
                      fontWeight={700}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                    />
                    <YAxis
                      stroke="var(--text-muted)"
                      fontSize={8}
                      fontWeight={700}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<TrendTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stroke="#a78bfa"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#taskTrendGrad)"
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#a78bfa' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="weekly"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.18em]">Weekly Operation Log</p>
                <span className="text-[10px] font-bold text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded-full">
                  {weeklyStats.completionRate}% Avg Completion
                </span>
              </div>

              {/* Spark indicators list */}
              <div className="grid grid-cols-7 gap-2.5 sm:gap-4 pt-2">
                {weeklyStats.breakdown.map((day, index) => {
                  const isToday = day.date === todayStr;
                  const hasTasks = day.scheduled > 0;
                  const isFullyDone = hasTasks && day.completed === day.scheduled;
                  const isPartiallyDone = hasTasks && day.completed > 0 && day.completed < day.scheduled;

                  return (
                    <div
                      key={index}
                      className={`flex flex-col items-center p-3 rounded-2xl border transition-all duration-200 ${
                        isToday
                          ? 'bg-bg-input border-accent-blue/40 shadow-xs'
                          : 'bg-bg-input/20 border-border-light/60 hover:bg-bg-input/40'
                      }`}
                    >
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-wider mb-2">
                        {day.dayLabel}
                      </span>

                      {/* Accuracy Block */}
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black relative">
                        {hasTasks ? (
                          isFullyDone ? (
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center" title="Fully Completed">
                              ✓
                            </div>
                          ) : isPartiallyDone ? (
                            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center" title={`${day.completed}/${day.scheduled} Completed`}>
                              {day.completed}
                            </div>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center" title="Not Started">
                              0
                            </div>
                          )
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-bg-input text-text-muted/30 border border-border-light flex items-center justify-center" title="No Tasks Scheduled">
                            —
                          </div>
                        )}
                      </div>

                      {/* Small Indicator Dots for scheduled tasks */}
                      {hasTasks && (
                        <div className="flex gap-0.5 mt-2">
                          {Array.from({ length: Math.min(3, day.scheduled) }).map((_, dotIdx) => (
                            <div
                              key={dotIdx}
                              className={`w-1 h-1 rounded-full ${
                                dotIdx < day.completed
                                  ? 'bg-emerald-500'
                                  : 'bg-text-muted/30'
                              }`}
                            />
                          ))}
                          {day.scheduled > 3 && (
                            <span className="text-[7px] font-black text-text-muted leading-none ml-0.5">
                              +
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};

export default TaskAnalytics;
