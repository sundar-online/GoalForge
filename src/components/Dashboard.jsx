import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { calculateGoalDailyProgress, isHabitDoneToday, calculateOverallProgress, isGoalDoneToday, getGoalScheduledDays, calculateGoalConsecutiveMissedDays, calculateGoalStreak, isTaskDone, getRecommendedNextGoal, isHabitScheduledToday } from '../utils/calculationUtils';
import { TODAY } from '../utils/dateUtils';
import { BADGE_DEFINITIONS } from '../utils/gamificationEngine';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, AlertCircle, TrendingUp, TrendingDown, CheckCircle2, Clock, Zap, LogOut, Moon, Sun, Monitor, Sparkles, Trophy, ChevronRight, Target, Award, CalendarDays, Brain, Plus, Trash2, ChevronDown, ChevronUp, Flame, Star, Calendar } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { WeeklyHeatmap } from './WeeklyHeatmap';
import { WeeklyReportCard } from './WeeklyReportCard';
import { SkeletonLoader } from './SkeletonLoader';
import AIInsights from './AIInsights';
import { GoalActivityChart } from './GoalActivityChart';
import ErrorBoundary from './ErrorBoundary';
import { TaskAnalytics } from './TaskAnalytics';

const EVENT_CATEGORY_COLORS = {
  general: { dot: 'bg-blue-400', text: 'text-blue-400' },
  work: { dot: 'bg-violet-400', text: 'text-violet-400' },
  health: { dot: 'bg-emerald-400', text: 'text-emerald-400' },
  learning: { dot: 'bg-amber-400', text: 'text-amber-400' },
  goal: { dot: 'bg-accent-blue', text: 'text-accent-blue' },
  personal: { dot: 'bg-pink-400', text: 'text-pink-400' },
};

const UpcomingEventsWidget = ({ setView }) => {
  const { scheduledEvents } = useAppContext();
  const today = TODAY();
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const upcoming = (scheduledEvents || [])
    .filter(e => !e.completed && e.date >= today)
    .slice(0, 4);

  const todayEvents = upcoming.filter(e => e.date === today);

  return (
    <div className="bg-bg-card rounded-[32px] border border-border-light shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-bg-input/30 transition-colors"
        onClick={() => setView('events')}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-500/20">
            <CalendarDays size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-text-main tracking-tight leading-none">Upcoming Events</h3>
              {upcoming.length > 0 && (
                <span className="bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded-full text-[9px] font-black">
                  {upcoming.length}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5 font-bold">
              {todayEvents.length > 0 ? `${todayEvents.length} event${todayEvents.length > 1 ? 's' : ''} today` : 'No events today'}
            </p>
          </div>
        </div>
        <ChevronRight size={16} className="text-text-muted" />
      </div>

      {/* Body */}
      <div className="px-5 pb-5">
        {upcoming.length === 0 ? (
          <div className="py-4 text-center">
            <Calendar size={24} className="text-text-muted mx-auto mb-2 opacity-40" />
            <p className="text-xs text-text-muted font-bold mb-3">No upcoming events scheduled</p>
            <button
              onClick={() => setView('events')}
              className="text-[10px] font-black text-accent-blue hover:underline underline-offset-4"
            >
              + Schedule your first event
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map(event => {
              const [, m, d] = event.date.split('-');
              const colors = EVENT_CATEGORY_COLORS[event.category] || EVENT_CATEGORY_COLORS.general;
              const isToday = event.date === today;
              return (
                <div
                  key={event.id}
                  onClick={() => setView('events')}
                  className="flex items-center gap-3 p-3 rounded-2xl hover:bg-bg-input/60 transition-colors cursor-pointer group"
                >
                  {/* Date box */}
                  <div className="w-9 h-9 rounded-xl bg-bg-input border border-border-light flex flex-col items-center justify-center shrink-0 group-hover:border-border-med transition-colors">
                    <span className="text-[7px] font-black text-text-muted uppercase leading-none">{MONTHS_SHORT[parseInt(m, 10) - 1]}</span>
                    <span className="text-sm font-black text-text-main leading-none">{parseInt(d, 10)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`} />
                      <p className="text-xs font-black text-text-main truncate">{event.title}</p>
                    </div>
                    <p className="text-[9px] text-text-muted font-bold mt-0.5">
                      {isToday ? '🔔 Today' : event.date}{event.time ? ` · ${event.time}` : ''}
                    </p>
                  </div>

                  {isToday && (
                    <span className="shrink-0 text-[8px] font-black uppercase tracking-wider text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                </div>
              );
            })}

            {/* View all link */}
            <button
              onClick={() => setView('events')}
              className="w-full text-[10px] font-black text-text-muted hover:text-accent-blue uppercase tracking-wider py-2 transition-colors"
            >
              View all events →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


const QuickThoughtsWidget = () => {
  const {
    quickThoughts,
    addQuickThought,
    updateQuickThought,
    deleteQuickThought
  } = useAppContext();

  const [isExpanded, setIsExpanded] = useState(false);
  const [newText, setNewText] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('💡');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const emojiOptions = ['💡', '😌', '⚡', '😰', '📝'];

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newText.trim()) return;
    setIsSaving(true);
    await addQuickThought(newText.trim(), selectedEmoji);
    setNewText('');
    setIsSaving(false);
  };

  const handleStartEdit = (thought) => {
    setEditingId(thought.id);
    setEditText(thought.content);
  };

  const handleSaveEdit = async (id, originalEmoji) => {
    if (!editText.trim()) {
      await deleteQuickThought(id);
    } else {
      await updateQuickThought(id, editText.trim(), originalEmoji);
    }
    setEditingId(null);
  };

  const handleEmojiChange = async (thought, newEmoji) => {
    await updateQuickThought(thought.id, thought.content, newEmoji);
  };

  const latestThought = quickThoughts[0];
  const count = quickThoughts.length;

  return (
    <div className="bg-bg-card rounded-[32px] border border-border-light shadow-sm overflow-hidden transition-all duration-300">
      {/* Header / Collapsed Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-bg-input/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0 border border-purple-500/20">
            <Brain size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-text-main tracking-tight leading-none">Quick Thoughts</h3>
              <span className="bg-bg-input px-1.5 py-0.5 rounded-full text-[9px] font-black text-text-muted">
                {count}/5
              </span>
            </div>
            {/* Show latest note preview when collapsed */}
            {!isExpanded && (
              <div className="flex items-center gap-1.5 text-xs text-text-muted mt-1 min-w-0">
                {latestThought ? (
                  <>
                    <span className="shrink-0">{latestThought.emoji}</span>
                    <span className="truncate flex-1 min-w-0">{latestThought.content}</span>
                  </>
                ) : (
                  <span className="truncate flex-1 min-w-0">Capture a spark before it fades...</span>
                )}
              </div>
            )}
          </div>
        </div>
        <button
          className="text-text-muted hover:text-text-main p-1 transition-colors"
          aria-label={isExpanded ? 'Collapse quick thoughts' : 'Expand quick thoughts'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </button>
      </div>

      {/* Expanded Thoughts Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border-t border-border-light overflow-hidden"
          >
            <div className="p-5 space-y-4">
              {/* Note List */}
              <div className="space-y-3 max-h-[220px] overflow-y-auto pt-5 pb-3 px-1.5">
                {quickThoughts.length === 0 ? (
                  <p className="text-xs text-text-muted py-2 text-center italic">
                    No thoughts saved yet. Write one below!
                  </p>
                ) : (
                  quickThoughts.map((thought) => (
                    <div
                      key={thought.id}
                      className="group flex items-center justify-between gap-3 p-3 rounded-2xl bg-bg-input/40 border border-border-light/50 hover:border-border-light transition-all duration-200"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Emoji Trigger/Dropdown */}
                        <div className="relative shrink-0 select-none group/emoji">
                          <span className="text-base cursor-pointer p-1 rounded-md hover:bg-bg-input transition-colors flex items-center justify-center select-none">
                            {thought.emoji}
                          </span>
                          {/* Mini Emoji Selector Overlay on Hover/Focus */}
                          <div className="absolute left-full ml-1.5 top-1/2 -translate-y-1/2 hidden group-hover/emoji:flex items-center gap-1 bg-bg-card border border-border-light p-1 rounded-xl shadow-lg z-50">
                            {emojiOptions.map(e => (
                              <button
                                key={e}
                                type="button"
                                onClick={(eEvent) => {
                                  eEvent.stopPropagation();
                                  handleEmojiChange(thought, e);
                                }}
                                className={`text-sm p-1 rounded-lg hover:bg-bg-input transition-colors ${thought.emoji === e ? 'bg-bg-input' : ''}`}
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Text / Input */}
                        {editingId === thought.id ? (
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onBlur={() => handleSaveEdit(thought.id, thought.emoji)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(thought.id, thought.emoji)}
                            className="bg-transparent border-b border-accent-blue text-xs text-text-main w-full focus:outline-none py-0.5"
                            autoFocus
                            maxLength={100}
                          />
                        ) : (
                          <span
                            onClick={() => handleStartEdit(thought)}
                            className="text-xs text-text-main truncate flex-1 cursor-text select-text py-0.5 leading-normal"
                          >
                            {thought.content}
                          </span>
                        )}
                      </div>

                      {/* Delete Action */}
                      <button
                        onClick={() => deleteQuickThought(thought.id)}
                        aria-label={`Delete thought: ${thought.content}`}
                        className="text-text-muted hover:text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 transition-all shrink-0 flex items-center justify-center"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Entry Form (Only if < 5) */}
              {count < 5 ? (
                <form onSubmit={handleAdd} className="space-y-3 pt-2 border-t border-border-light/60">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-text-muted font-black uppercase tracking-wider">New Thought</span>
                    <div className="flex gap-1 bg-bg-input/60 p-0.5 rounded-xl border border-border-light/50">
                      {emojiOptions.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setSelectedEmoji(emoji)}
                          className={`text-sm w-7 h-7 rounded-lg flex items-center justify-center transition-all ${selectedEmoji === emoji
                            ? 'bg-bg-card text-text-main shadow-sm'
                            : 'text-text-muted hover:text-text-main'
                            }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative flex items-center bg-bg-input/50 border border-border-light rounded-2xl p-1.5 focus-within:border-accent-blue/50 transition-colors">
                    <input
                      type="text"
                      placeholder="Capture a spark... (max 100 chars)"
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      className="bg-transparent text-xs text-text-main flex-1 focus:outline-none pl-2.5 pr-8 py-2"
                      maxLength={100}
                    />
                    <button
                      type="submit"
                      disabled={!newText.trim() || isSaving}
                      aria-label="Add thought"
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-accent-blue hover:bg-accent-blue/90 disabled:opacity-55 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all active:scale-95 shadow-md shadow-accent-blue/20"
                    >
                      <Plus size={16} aria-hidden="true" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-[10px] text-text-muted text-center font-bold py-1.5 bg-bg-input/30 rounded-xl border border-border-light/40">
                  ⚠️ List is full (5/5). Delete one to add a new spark.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const Dashboard = ({ setView }) => {
  const {
    goals, accuracy, alerts,
    todayTasks, allHabits,
    focusTime, focusHistory, taskLogs,
    disciplineScore, insights,
    theme, toggleTheme, setTheme, themeSource, loading, weeklyReport, syncError, retrySync,
    xpData: rawXpData, currentLevelInfo: rawLevelInfo,
    tasks,
    setFocusGoal,
    settings,
    updateAiSettings,
    isAiAnalyzing,
    triggerNeuralAudit,
    setGoalsAction,
    addQuickThought
  } = useAppContext();

  const focusGoal = goals.find(g => g.isFocusGoal && !g.isMissingDream);
  const activeCalculatedGoals = goals.map(g => {
    const liveProgress = calculateOverallProgress(g);
    const isFinished = liveProgress === 100;
    return { ...g, progress: liveProgress, isFinished };
  }).filter(g => !g.isMissingDream && !g.isFinished);

  const fallbackActiveGoal = activeCalculatedGoals[0];
  const todayMainTarget = focusGoal || fallbackActiveGoal;

  const targetHabitsTotal = todayMainTarget ? (todayMainTarget.habits || []).filter(isHabitScheduledToday).length : 0;
  const targetHabitsDone = todayMainTarget ? (todayMainTarget.habits || []).filter(h => isHabitScheduledToday(h) && isHabitDoneToday(h)).length : 0;
  const targetHabitsRemaining = targetHabitsTotal - targetHabitsDone;

  const xpData = rawXpData || { totalXP: 0, earnedBadges: [], xpHistory: [] };
  const currentLevelInfo = rawLevelInfo || { level: 1, title: 'Recruit', progress: 0, xpForNext: 100, isMaxLevel: false };

  const reminders = [
    ...(todayTasks || []).filter(t => t.reminderEnabled && t.reminderTime).map(t => ({
      id: t.id,
      title: t.title,
      time: t.reminderTime,
      type: 'Task'
    })),
    ...(allHabits || []).filter(h => h.reminderEnabled && h.reminderTime).map(h => ({
      id: h.id,
      title: h.title,
      time: h.reminderTime,
      type: 'Habit'
    }))
  ].sort((a, b) => a.time.localeCompare(b.time));

  const { displayName, signOut, user } = useAuth();
  const [showSignOut, setShowSignOut] = useState(false);
  const [activeDashboardTab, setActiveDashboardTab] = useState('intel'); // 'intel', 'goals', 'tasks'

  const initial = displayName ? displayName[0].toUpperCase() : 'U';
  const focusHrs = Math.floor(focusTime / 3600);
  const focusMins = Math.floor((focusTime % 3600) / 60);

  const yday = new Date(); yday.setDate(yday.getDate() - 1);
  const ydayKey = yday.toISOString().split('T')[0];
  const ydaySec = focusHistory[ydayKey] || 0;
  const focusDelta = ydaySec === 0 ? null : Math.round(((focusTime - ydaySec) / ydaySec) * 100);

  const R = 52; const CIRC = 2 * Math.PI * R;
  const accOffset = CIRC - (CIRC * accuracy) / 100;

  let accColor;
  if (accuracy >= 100) accColor = '#22c55e';
  else if (accuracy >= 50) accColor = 'var(--accent-blue)';
  else if (accuracy > 0) accColor = '#faba2c';
  else accColor = '#ef4444';

  const topStreaks = (goals || [])
    .filter(g => !g.isMissingDream)
    .map(g => {
      const goalSchedule = getGoalScheduledDays(g);
      // Use calculateGoalStreak().current — the same source used by the Goals page streak display
      // and the daily reset system. This ensures the Streak Power widget is always consistent
      // with what the Goals page shows as the current streak.
      const { current: currentStreak } = calculateGoalStreak(
        g.completedDates || [],
        goalSchedule,
        g.startDate || g.createdAt
      );
      const liveMissed = calculateGoalConsecutiveMissedDays(g.completedDates || [], goalSchedule, g.startDate || g.createdAt);
      return {
        name: g.title,
        tag: g.tag,
        streak: currentStreak,
        missed: liveMissed || 0
      };
    })
    .filter(g => g.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 3);


  const activeTasksCount = React.useMemo(() => {
    return (todayTasks || []).filter(t => !isTaskDone(t)).length;
  }, [todayTasks]);

  const completedTasksCount = React.useMemo(() => {
    return (todayTasks || []).filter(isTaskDone).length;
  }, [todayTasks]);

  const highestTaskStreak = React.useMemo(() => {
    if (!tasks || tasks.length === 0) return 0;
    const streaks = tasks.map(t => t.currentStreak || 0);
    return Math.max(...streaks, 0);
  }, [tasks]);

  const topStreakTasksList = React.useMemo(() => {
    return (tasks || [])
      .filter(t => (t.currentStreak || 0) > 0)
      .sort((a, b) => (b.currentStreak || 0) - (a.currentStreak || 0))
      .slice(0, 3);
  }, [tasks]);

  const QUOTES = ['"Focus is the art of knowing what to ignore."', '"Small daily improvements lead to stunning results."', '"Discipline is choosing between what you want now and what you want most."', '"The only way to predict the future is to create it."'];
  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  const renderGoalsList = () => {
    const activeGoalsList = (goals || [])
      .map(g => {
        const liveProgress = calculateOverallProgress(g);
        // Only hide goals that are fully completed (100% progress)
        const isFinished = liveProgress >= 100;
        const isDoneToday = isGoalDoneToday(g);
        return {
          ...g,
          progress: liveProgress,
          isFinished,
          isDoneToday
        };
      })
      .filter(goal => !goal.isFinished && !goal.isMissingDream)
      .sort((a, b) => {
        // Place completed goals today at the end of the list, matching GoalsPage ordering consistency
        if (a.isDoneToday !== b.isDoneToday) return a.isDoneToday ? 1 : -1;
        return 0;
      });

    if (activeGoalsList.length === 0) {
      return (
        <div onClick={() => setView('goals')} className="py-16 text-center border-2 border-dashed border-border-med rounded-[32px] cursor-pointer hover:bg-bg-input transition-colors space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-bg-input flex items-center justify-center mx-auto mb-2">
            <Target className="text-text-muted" size={24} />
          </div>
          <p className="font-black text-text-main">No systems defined</p>
          <p className="text-sm text-text-muted font-bold">Forge your first goal to start tracking.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {activeGoalsList.map(goal => {
          const dailyProgress = calculateGoalDailyProgress(goal);
          const achieved = goal.isDoneToday || dailyProgress === 100;
          const ruleLabel = goal.mode === 'ANY' ? 'Any Rule' : goal.mode === 'CUSTOM' ? `Min ${goal.minHabits} Rule` : 'All Habits Rule';

          return (
            <div key={goal.id} className={`bg-bg-card rounded-[28px] p-6 shadow-sm border-2 transition-all hover:shadow-md ${achieved ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border-light hover:border-accent-blue/30'}`}>
              <div className="flex justify-between items-start mb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-lg text-text-main tracking-tight truncate max-w-[140px]">{goal.title}</p>
                    {achieved && <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Done ✓</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[9px] font-bold text-text-muted bg-bg-input px-2 py-0.5 rounded-md uppercase tracking-widest">{ruleLabel}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-black leading-none tracking-tighter ${achieved ? 'text-emerald-500' : 'text-accent-blue'}`}>{achieved ? 100 : dailyProgress}%</span>
                  <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mt-0.5">Grit Score</p>
                </div>
              </div>

              <div className="h-2 bg-bg-input rounded-full overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${achieved ? 'bg-emerald-500' : 'bg-accent-blue'}`}
                  style={{ width: `${achieved ? 100 : dailyProgress}%` }}
                />
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-border-light">
                <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Mastery</span>
                {/* Use liveProgress (calculateOverallProgress) — not the stale Firestore-stored
                    goal.progress field which only updates during the daily reset. */}
                <span className="text-sm font-black text-text-main tracking-tighter">{Math.round(goal.progress)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <SkeletonLoader height={180} />
        <SkeletonLoader height={60} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonLoader height={180} />
          <SkeletonLoader height={180} />
        </div>
        <SkeletonLoader height={140} />
        <div className="grid grid-cols-3 gap-6">
          <SkeletonLoader height={100} />
          <SkeletonLoader height={100} />
          <SkeletonLoader height={100} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8 max-w-full">
      {/* Sync Error Banner */}
      {syncError && (
        <div role="alert" className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex justify-between items-center animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-red-500" aria-hidden="true" />
            <span className="text-sm font-bold text-text-main">{syncError}</span>
          </div>
          <button onClick={retrySync} className="bg-accent-blue hover:bg-accent-blue/90 px-4 py-2 rounded-xl text-xs font-black text-white transition-all active:scale-95 shadow-md shadow-accent-blue/20">
            Retry
          </button>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-text-main tracking-tight leading-tight">
            Hey, {displayName} 👋
          </h1>
          <p className="text-xs sm:text-sm text-text-muted font-medium italic opacity-80">{quote}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          {/* Events / Calendar Icon */}
          <button
            onClick={() => setView('events')}
            aria-label="Scheduled Events"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all active:scale-90 shadow-sm shrink-0 group"
          >
            <CalendarDays size={18} className="group-hover:scale-110 transition-transform duration-200" aria-hidden="true" />
          </button>
          {/* Forge Workspace Button */}
          <button
            onClick={() => { setView('workspace'); setShowSignOut(false); }}
            aria-label="Forge Workspace"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/30 flex items-center justify-center transition-all active:scale-90 shadow-sm shrink-0 group"
          >
            <Sparkles size={18} className="group-hover:scale-110 transition-transform duration-200" aria-hidden="true" />
          </button>

          {/* Theme Toggle — cycles: dark → light → system → dark */}
          {(() => {
            const isSystem = themeSource === 'system';
            const nextLabel = isSystem
              ? 'Switch to dark mode'
              : theme === 'dark'
                ? 'Switch to light mode'
                : 'Follow system theme';
            const handleCycle = () => {
              if (isSystem) setTheme('dark', 'manual');
              else if (theme === 'dark') setTheme('light', 'manual');
              else setTheme(null, 'system');
            };
            return (
              <button
                onClick={handleCycle}
                aria-label={nextLabel}
                title={nextLabel}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-bg-card border border-border-light flex items-center justify-center text-text-main hover:bg-bg-input transition-all active:scale-90 shadow-sm shrink-0 group"
              >
                {isSystem
                  ? <Monitor size={18} className="group-hover:scale-110 transition-transform duration-200 text-accent-blue" aria-hidden="true" />
                  : theme === 'light'
                    ? <Moon size={18} className="group-hover:scale-110 transition-transform duration-200" aria-hidden="true" />
                    : <Sun size={18} className="group-hover:scale-110 transition-transform duration-200" aria-hidden="true" />
                }
              </button>
            );
          })()}

          {/* Profile Avatar */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowSignOut(!showSignOut)}
              aria-label={`Account menu for ${displayName}`}
              aria-expanded={showSignOut}
              aria-haspopup="true"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-bg-dark-elem flex items-center justify-center text-text-inverted font-black text-lg hover:opacity-90 transition-all active:scale-90 shadow-md"
            >
              {initial}
            </button>
            {showSignOut && (
              <div className="absolute top-14 right-0 bg-bg-card border border-border-light p-2 rounded-2xl shadow-float min-w-[200px] z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-3 border-b border-border-light mb-1">
                  <p className="text-xs font-black text-text-main">{displayName}</p>
                  <p className="text-[10px] font-bold text-text-muted truncate">{user?.email}</p>
                </div>
                <button onClick={() => { setView('profile'); setShowSignOut(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-main hover:bg-bg-input transition-colors font-bold text-sm mb-1">
                  <Award size={16} /> Profile
                </button>
                <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors font-bold text-sm">
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

        {/* Left/Main Column */}
        <div className="lg:col-span-8 flex flex-col gap-6 lg:gap-8">

          {/* Today's Main Target Hero Banner */}
          {todayMainTarget && (
            <div className="relative overflow-hidden bg-gradient-to-r from-accent-blue/15 via-indigo-500/10 to-transparent border border-accent-blue/30 rounded-[32px] p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-300 group">
              {/* Background decorative target icon */}
              <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                <Target size={180} className="text-accent-blue" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-3 flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-2">
                    <span className="bg-accent-blue/20 text-accent-blue text-[9px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest flex items-center gap-1">
                      <Target size={10} /> {focusGoal ? "Focus Goal" : "Active Target"}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-text-main tracking-tight leading-tight whitespace-normal">
                    {todayMainTarget.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
                    {todayMainTarget.deadline && (
                      <span className="flex items-center gap-1.5 bg-bg-input px-2.5 py-1 rounded-lg">
                        {(() => {
                          const [y, m, d] = todayMainTarget.deadline.split('-');
                          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          return `Due: ${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
                        })()}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 bg-bg-input px-2.5 py-1 rounded-lg">
                      <Clock size={12} /> {targetHabitsRemaining > 0 ? `${targetHabitsRemaining} habits left today` : "All habits done today! 🎉"}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black text-text-muted uppercase tracking-widest">
                      <span>Goal Mastery</span>
                      <span>{todayMainTarget.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-bg-input h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-blue rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${todayMainTarget.progress || 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="shrink-0 w-full md:w-auto">
                  <button
                    onClick={() => setView('focus')}
                    className="w-full md:w-auto px-6 py-4 rounded-2xl bg-accent-blue text-white font-black text-sm shadow-lg shadow-accent-blue/30 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    Continue Goal <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Discipline + XP Hero Card */}
          <section className="bg-gradient-to-br from-bg-dark-elem to-[#1e1e2e] rounded-[32px] p-4 sm:p-6 md:p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
              <Trophy size={200} className="text-white" />
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-5 sm:mb-6 gap-2 min-w-0">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[9px] sm:text-[10px] font-black text-white/60 uppercase tracking-[0.15em] mb-1">Level {currentLevelInfo.level}</p>
                  <h2 className="text-xl min-[360px]:text-3xl md:text-4xl font-black text-white tracking-tighter truncate">{currentLevelInfo.title}</h2>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl min-[360px]:text-4xl md:text-5xl font-black text-white leading-none tracking-tighter">{xpData.totalXP.toLocaleString()}</div>
                  <p className="text-[9px] sm:text-[10px] font-black text-white/50 uppercase tracking-widest mt-1">Total XP</p>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-[9px] font-black text-white/40 uppercase tracking-widest mb-1.5">
                  <span>Level {currentLevelInfo.level}</span>
                  <span>{currentLevelInfo.isMaxLevel ? 'MAX' : `Level ${currentLevelInfo.level + 1}`}</span>
                </div>
                <div
                  className="h-2.5 bg-white/10 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={currentLevelInfo.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`XP progress: ${currentLevelInfo.progress}% to next level`}
                >
                  <div
                    className="h-full bg-gradient-to-r from-accent-blue to-indigo-400 rounded-full transition-all duration-[1.5s] ease-out"
                    style={{ width: `${currentLevelInfo.progress}%`, boxShadow: '0 0 15px rgba(90,133,255,0.5)' }}
                  />
                </div>
                {!currentLevelInfo.isMaxLevel && (
                  <p className="text-[9px] font-bold text-white/30 text-right mt-1">{currentLevelInfo.xpForNext - xpData.totalXP} XP to next level</p>
                )}
              </div>

              {/* Bottom row: Discipline Score + Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 shrink-0">
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest">Discipline</p>
                    <p className="text-lg font-black text-white leading-none tracking-tighter">{disciplineScore}</p>
                  </div>
                  {insights.length > 0 && (
                    <div className="flex items-center gap-2 bg-white/5 px-2.5 py-2 rounded-xl border border-white/10 min-w-0 flex-1 animate-in fade-in">
                      <Sparkles size={14} className="text-accent-blue shrink-0 animate-pulse" />
                      <p className="text-[10px] sm:text-[11px] font-semibold text-white/80 leading-relaxed line-clamp-2">{insights[0]}</p>
                    </div>
                  )}
                </div>

                {/* Earned Badges Preview */}
                {(xpData.earnedBadges || []).length > 0 && (
                  <div className="flex items-center gap-1 self-start sm:self-auto shrink-0">
                    {(xpData.earnedBadges || []).slice(0, 4).map(id => {
                      const badge = BADGE_DEFINITIONS.find(b => b.id === id);
                      return badge ? (
                        <div key={id} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center" title={badge.title}>
                          <span className="text-sm">{badge.icon}</span>
                        </div>
                      ) : null;
                    })}
                    {(xpData.earnedBadges || []).length > 4 && (
                      <span className="text-[10px] font-black text-white/40 ml-1">+{(xpData.earnedBadges || []).length - 4}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Mobile Segmented Navigation Tabs */}
          <div className="flex lg:hidden gap-2 p-1 rounded-2xl bg-bg-card border border-border-light shadow-sm mb-2">
            {[
              { id: 'intel', label: 'Overview', icon: <Brain size={14} /> },
              { id: 'goals', label: 'Goals', icon: <Target size={14} /> },
              { id: 'tasks', label: 'Tasks', icon: <Zap size={14} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveDashboardTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${activeDashboardTab === tab.id
                  ? 'bg-bg-dark-elem text-text-inverted shadow-md'
                  : 'text-text-muted hover:text-text-main'
                  }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Thoughts Widget - Mobile Only */}
          <div className={activeDashboardTab === 'intel' ? 'block lg:hidden' : 'hidden'}>
            <QuickThoughtsWidget />
          </div>

          {/* AI Insights & Recovery */}
          {/* Inline view replaced by top navigation Forge Intelligence Hub panel */}

          {/* Alert Banners (Stacked) */}
          {alerts.length > 0 && (
            <div className={`flex flex-col gap-3 ${activeDashboardTab === 'intel' ? 'flex' : 'hidden lg:flex'}`}>
              {alerts.map((alert, i) => {
                const colors = {
                  danger: "bg-red-500/10 border-red-500/20 text-red-500",
                  warning: "bg-amber-500/10 border-amber-500/20 text-amber-500",
                  success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
                  info: "bg-accent-blue/10 border-accent-blue/20 text-accent-blue"
                };
                const colorClass = colors[alert.type] || colors.info;
                return (
                  <div key={i} className={`${colorClass} flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all hover:scale-[1.01]`}>
                    {alert.type === 'danger' && <AlertCircle size={20} className="shrink-0" />}
                    {alert.type === 'warning' && <AlertTriangle size={20} className="shrink-0" />}
                    {(alert.type === 'success' || alert.type === 'info') && <Sparkles size={20} className="shrink-0" />}
                    <p className="text-sm font-bold text-text-main leading-relaxed">{alert.message}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reminders Horizon */}
          {reminders.length > 0 && (
            <div className={`space-y-4 ${activeDashboardTab === 'intel' ? 'block' : 'hidden lg:block'}`}>
              <div className="flex justify-between items-center px-1">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Next Alerts</p>
                <span className="text-[10px] font-bold text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded-full">{reminders.length} Scheduled</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {reminders.map((r, i) => (
                  <div key={i} className="min-w-[160px] bg-bg-card rounded-2xl p-4 border border-border-light shadow-sm flex flex-col gap-2 transition-all hover:border-accent-blue/30 group">
                    <div className="flex justify-between items-start">
                      <div className="w-8 h-8 rounded-lg bg-bg-input flex items-center justify-center text-accent-blue group-hover:bg-accent-blue group-hover:text-white transition-all">
                        <Clock size={14} />
                      </div>
                      <span className="text-[11px] font-black text-accent-blue">{r.time}</span>
                    </div>
                    <div className="mt-1">
                      <p className="text-xs font-black text-text-main truncate">{r.title}</p>
                      <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{r.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* Accuracy + Focus Grid */}
          <div className={`${activeDashboardTab === 'goals' ? 'grid' : 'hidden lg:grid'} grid-cols-1 md:grid-cols-2 gap-6`}>
            {/* Accuracy Card */}
            <div className="bg-bg-card rounded-3xl p-5 sm:p-8 shadow-sm border border-border-light flex flex-col items-center gap-4 sm:gap-5 hover:shadow-md transition-shadow">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Today's Accuracy</p>
              <div className="relative w-28 h-28 sm:w-36 sm:h-36">
                <svg
                  className="w-full h-full -rotate-90"
                  viewBox="0 0 124 124"
                  role="img"
                  aria-label={`Today's accuracy: ${accuracy}%`}
                >
                  <circle cx="62" cy="62" r={R} fill="none" className="stroke-bg-input" strokeWidth="10" />
                  <circle
                    cx="62" cy="62" r={R} fill="none" stroke={accColor} strokeWidth="10"
                    strokeDasharray={CIRC} strokeDashoffset={accOffset} strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
                  <span className="text-3xl sm:text-4xl font-black text-text-main tracking-tighter">{accuracy}%</span>
                </div>
              </div>
              <div className="px-4 py-1.5 rounded-full bg-bg-input border border-border-light">
                <p className="text-xs font-black" style={{ color: accColor }}>
                  {accuracy >= 80 ? 'Elite Performance' : accuracy >= 50 ? 'Steady Progress' : 'Recovery Needed'}
                </p>
              </div>
            </div>

            {/* Deep Work Card */}
            <div className="bg-bg-dark-elem rounded-3xl pt-12 px-6 pb-6 sm:pt-16 sm:px-8 sm:pb-8 shadow-xl flex flex-col justify-between group hover:scale-[1.02] transition-transform">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em]">Deep Work</p>
              <div className="flex-1 flex flex-col justify-center my-8 sm:my-10">
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-text-inverted tracking-tighter leading-none">
                    {String(focusHrs).padStart(2, '0')}:{String(focusMins).padStart(2, '0')}
                  </span>
                  <span className="text-sm text-white/40 font-black uppercase tracking-widest">hrs</span>
                </div>
                {focusDelta !== null && (
                  <div className={`mt-4 flex items-center gap-2 text-sm font-black ${focusDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {focusDelta >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span>{focusDelta >= 0 ? '+' : ''}{focusDelta}% vs yday</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setView('focus')}
                className="w-full bg-white/10 hover:bg-white/20 px-5 py-3.5 rounded-2xl text-text-inverted text-sm font-black transition-all flex justify-between items-center group-hover:bg-accent-blue group-hover:shadow-lg group-hover:shadow-accent-blue/30"
              >
                Start Session <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Standalone Task Analytics Section */}
          <div className={activeDashboardTab === 'tasks' ? 'block' : 'hidden lg:block'}>
            <TaskAnalytics setView={setView} />
          </div>

          {/* Goal Progress List */}
          <section className="space-y-5 hidden lg:block">
            <div className="flex justify-between items-end px-2">
              <div className="space-y-1">
                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Active Goals</h3>
                <p className="text-xl font-black text-text-main tracking-tight">Main Targets</p>
              </div>
              <button onClick={() => setView('goals')} className="text-xs font-black text-accent-blue hover:underline underline-offset-4">View All Systems</button>
            </div>
            {renderGoalsList()}
            {(() => {
              const recommended = getRecommendedNextGoal(goals);
              if (!recommended || recommended.id === todayMainTarget?.id) return null;
              return (
                <div className="bg-gradient-to-r from-accent-blue/10 to-indigo-500/10 border border-accent-blue/20 rounded-3xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm transition-all hover:scale-[1.01] duration-300 mt-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Star size={14} className="text-accent-blue animate-pulse" />
                      <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest">Recommended Next Goal</span>
                    </div>
                    <h4 className="text-base font-black text-text-main tracking-tight truncate">
                      {recommended.title}
                    </h4>
                    <p className="text-xs text-text-muted">
                      Ranked by order, due dates, progress, and dependencies.
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto shrink-0">
                    <button
                      onClick={() => setFocusGoal(recommended.id)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-accent-blue text-xs font-black text-white hover:opacity-90 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Star size={12} fill="currentColor" /> Set as Focus Goal
                    </button>
                  </div>
                </div>
              );
            })()}
          </section>
        </div>

        {/* Right Column / Sidebar Dashboard Content */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:gap-8">

          {/* Quick Thoughts Widget - Desktop Only */}
          <div className="hidden lg:block">
            <QuickThoughtsWidget />
          </div>

          {/* Upcoming Scheduled Events Widget */}
          <UpcomingEventsWidget setView={setView} />

          {/* Weekly Performance Widget */}
          <div className={activeDashboardTab === 'intel' ? 'block' : 'hidden lg:block'}>
            <WeeklyReportCard report={weeklyReport} />
          </div>

          {/* Goal Activity Distribution Pie Chart */}
          <div className={activeDashboardTab === 'goals' ? 'block' : 'hidden lg:block'}>
            <ErrorBoundary fallbackType="widget" errorMessage="Goal activity distribution statistics could not be loaded. Please complete active habits to populate.">
              <GoalActivityChart goals={goals} />
            </ErrorBoundary>
          </div>

          {/* Consistency Heatmap Widget */}
          <div className={activeDashboardTab === 'goals' ? 'block' : 'hidden lg:block'}>
            <WeeklyHeatmap focusHistory={focusHistory} taskLogs={taskLogs} accuracy={accuracy} />
          </div>

          {/* Task Stats Widget */}
          <div className={activeDashboardTab === 'tasks' ? 'block' : 'hidden lg:block'}>
            <div className="bg-bg-card rounded-[32px] p-5 border border-border-light shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em] mb-4">Task Overview</p>
              <div className="grid grid-cols-3 gap-2 divide-x divide-border-light dark:divide-border-med">
                {[
                  { label: 'Current Active Tasks', val: activeTasksCount, icon: <Zap size={15} className="text-accent-blue" />, bgColor: "bg-accent-blue/10" },
                  { label: 'Current Completed Tasks', val: completedTasksCount, icon: <CheckCircle2 size={15} className="text-emerald-500" />, bgColor: "bg-emerald-500/10" },
                  { label: 'Highest Task Completion Streak', val: highestTaskStreak ? `${highestTaskStreak}d` : '0d', icon: <Flame size={15} className="text-orange-500" />, bgColor: "bg-orange-500/10" },
                ].map((s, i) => (
                  <div key={i} className={`flex flex-col items-center text-center px-1 ${i > 0 ? 'pl-2' : ''}`}>
                    <div className={`w-8 h-8 rounded-xl ${s.bgColor} flex items-center justify-center shrink-0 mb-2.5`}>
                      {s.icon}
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-text-main tracking-tighter leading-none">{s.val}</p>
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-wider mt-1.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Compact Top Streaks area */}
              <div className="my-4 border-t border-border-light dark:border-border-med" />
              <div className="flex items-center gap-1.5 mb-2.5">
                <Flame size={12} className="text-orange-500" fill="currentColor" />
                <span className="text-[9px] font-black text-text-muted uppercase tracking-wider">Top System Streaks</span>
              </div>
              {topStreakTasksList.length > 0 ? (
                <div className="space-y-2">
                  {topStreakTasksList.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-bold text-text-main bg-bg-input/30 hover:bg-bg-input/60 px-3 py-1.5 rounded-xl border border-border-light/50 transition-colors">
                      <span className="truncate pr-2">{s.title}</span>
                      <span className="text-orange-500 font-black shrink-0 whitespace-nowrap">🔥 {s.currentStreak}d</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-text-muted italic text-center py-1">
                  No active task streaks today — keep completing tasks!
                </p>
              )}
            </div>
          </div>

          {/* Streak Leaders Widget */}
          {topStreaks.length > 0 && (
            <div className={activeDashboardTab === 'goals' ? 'block' : 'hidden lg:block'}>
              <section className="bg-bg-card rounded-[32px] p-6 shadow-sm border border-border-light">
                <div className="flex items-center gap-2 mb-6">
                  <Zap size={18} className="text-orange-500" fill="currentColor" />
                  <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Streak Power</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {topStreaks.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-bg-input/50 border border-border-light hover:bg-bg-input transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className={`w-1.5 h-6 rounded-full ${i === 0 ? 'bg-orange-500' : 'bg-text-muted/30'}`} />
                        <div>
                          <p className="text-sm font-black text-text-main truncate max-w-[120px]">{s.name}</p>
                          <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{s.tag}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.missed >= 2 && (
                          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Vulnerable" />
                        )}
                        <span className="text-base font-black text-orange-500 group-hover:scale-110 transition-transform">🔥 {s.streak}d</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* Mobile Goal Progress List */}
          <section className={`space-y-5 ${activeDashboardTab === 'goals' ? 'block lg:hidden' : 'hidden'}`}>
            <div className="flex justify-between items-end px-2">
              <div className="space-y-1">
                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">Active Goals</h3>
                <p className="text-xl font-black text-text-main tracking-tight">Main Targets</p>
              </div>
              <button onClick={() => setView('goals')} className="text-xs font-black text-accent-blue hover:underline underline-offset-4">View All Systems</button>
            </div>
            {renderGoalsList()}
            {(() => {
              const recommended = getRecommendedNextGoal(goals);
              if (!recommended || recommended.id === todayMainTarget?.id) return null;
              return (
                <div className="bg-gradient-to-r from-accent-blue/10 to-indigo-500/10 border border-accent-blue/20 rounded-3xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm transition-all hover:scale-[1.01] duration-300 mt-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Star size={14} className="text-accent-blue animate-pulse" />
                      <span className="text-[10px] font-black text-accent-blue uppercase tracking-widest">Recommended Next Goal</span>
                    </div>
                    <h4 className="text-base font-black text-text-main tracking-tight truncate">
                      {recommended.title}
                    </h4>
                    <p className="text-xs text-text-muted">
                      Ranked by order, due dates, progress, and dependencies.
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto shrink-0">
                    <button
                      onClick={() => setFocusGoal(recommended.id)}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-accent-blue text-xs font-black text-white hover:opacity-90 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <Star size={12} fill="currentColor" /> Set as Focus Goal
                    </button>
                  </div>
                </div>
              );
            })()}
          </section>

          {/* Footer Quote / Branding */}
          <div className="mt-auto pt-6 text-center lg:text-left opacity-40">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-loose">
              © 2026 GoalForge Strategy <br />
              Advanced Productivity Suite
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

