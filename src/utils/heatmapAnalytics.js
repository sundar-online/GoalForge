/**
 * heatmapAnalytics.js
 *
 * Pure utility functions for the Interactive Activity Heatmap and Goal Consistency Heatmap.
 * All functions are side-effect free — no React state, no context.
 *
 * Data Sources:
 *  - taskLogs:    { [YYYY-MM-DD]: { completed_tasks, total_tasks, time_spent } }
 *  - goals:       Goal[] with habits[].completedDates and goals[].completedDates
 *  - sessionLogs: { id, date, duration (mins), goalId, itemId }[]
 *  - focusHistory: { [YYYY-MM-DD]: seconds }
 */

const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Was a habit scheduled on a specific past date? Uses the habit's scheduleDays config. */
const wasHabitScheduledOn = (habit, dateStr) => {
  if (!habit.scheduleDays || habit.scheduleDays.length === 0) return true;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(y, m - 1, d).getDay();
  return habit.scheduleDays.includes(DAY_ABBRS[dayOfWeek]);
};

/** Was a habit completed on a specific past date? */
const wasHabitCompletedOn = (habit, dateStr) => {
  return (habit.completedDates || []).includes(dateStr);
};

// ── Task Analytics ──────────────────────────────────────────────────────────

/**
 * Returns task and habit breakdown for a given date.
 */
export function getDayTaskData(date, taskLogs, goals) {
  const log = taskLogs?.[date] || null;
  const completedTasks = log?.completed_tasks ?? 0;
  const totalTasks = log?.total_tasks ?? 0;
  const accuracy = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const habitBreakdown = [];
  (goals || []).filter(g => !g.isMissingDream).forEach(g => {
    (g.habits || []).forEach(h => {
      if (wasHabitScheduledOn(h, date)) {
        const done = wasHabitCompletedOn(h, date);
        habitBreakdown.push({ habitId: h.id, habitTitle: h.title, goalId: g.id, goalTitle: g.title, done });
      }
    });
  });

  const completedHabits = habitBreakdown.filter(h => h.done).length;
  const totalHabits = habitBreakdown.length;

  return {
    date,
    completedTasks,
    totalTasks,
    accuracy,
    completedHabits,
    totalHabits,
    missedHabits: totalHabits - completedHabits,
    timeSpent: log?.time_spent ?? 0,
  };
}

// ── Goal Analytics ──────────────────────────────────────────────────────────

/**
 * Returns per-goal breakdown for a given date.
 */
export function getDayGoalData(date, goals) {
  return (goals || [])
    .filter(g => !g.isMissingDream)
    .map(g => {
      const habits = (g.habits || []).filter(h => wasHabitScheduledOn(h, date));
      const completedHabits = habits.filter(h => wasHabitCompletedOn(h, date));
      const missedHabits = habits.filter(h => !wasHabitCompletedOn(h, date));
      const goalCompleted = (g.completedDates || []).includes(date);

      let dailyProgress = 0;
      if (habits.length === 0) {
        dailyProgress = 100;
      } else if (g.mode === 'ANY') {
        dailyProgress = completedHabits.length > 0 ? 100 : 0;
      } else if (g.mode === 'CUSTOM') {
        const target = Math.min(g.minHabits || 1, habits.length);
        dailyProgress = Math.min(100, Math.round((completedHabits.length / target) * 100));
      } else {
        dailyProgress = Math.round((completedHabits.length / habits.length) * 100);
      }

      return {
        goalId: g.id,
        goalTitle: g.title,
        goalTag: g.tag,
        mode: g.mode || 'ALL',
        minHabits: g.minHabits || 1,
        goalCompleted,
        dailyProgress,
        scheduledHabits: habits.map(h => ({
          id: h.id,
          title: h.title,
          done: wasHabitCompletedOn(h, date),
          type: h.type || 'check',
        })),
        completedCount: completedHabits.length,
        missedCount: missedHabits.length,
        totalScheduled: habits.length,
      };
    })
    .filter(g => g.totalScheduled > 0);
}

// ── Focus Analytics ─────────────────────────────────────────────────────────

/**
 * Returns focus/session data for a given date.
 */
export function getDayFocusData(date, sessionLogs, focusHistory) {
  const sessions = (sessionLogs || []).filter(s => s.date === date);

  if (sessions.length > 0) {
    const totalMins = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgMins = Math.round(totalMins / sessions.length);
    const longestMins = Math.max(...sessions.map(s => s.duration || 0));
    return {
      totalMins,
      totalHrs: Math.floor(totalMins / 60),
      remainingMins: totalMins % 60,
      sessionCount: sessions.length,
      avgMins,
      longestMins,
      sessions: sessions.map(s => ({ id: s.id, duration: s.duration, goalId: s.goalId, itemId: s.itemId })),
    };
  }

  const historySecs = focusHistory?.[date] ?? 0;
  if (historySecs > 0) {
    const totalMins = Math.round(historySecs / 60);
    return { totalMins, totalHrs: Math.floor(totalMins / 60), remainingMins: totalMins % 60, sessionCount: null, avgMins: null, longestMins: null, sessions: [] };
  }

  return { totalMins: 0, totalHrs: 0, remainingMins: 0, sessionCount: 0, avgMins: 0, longestMins: 0, sessions: [] };
}

// ── Streak Analysis ─────────────────────────────────────────────────────────

export function getDayStreakImpact(date, taskLogs, goals) {
  const log = taskLogs?.[date];
  const wasActiveDay = (log?.completed_tasks ?? 0) > 0;

  const [y, m, d] = date.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);

  const prevDate = new Date(dateObj);
  prevDate.setDate(prevDate.getDate() - 1);
  const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;

  const nextDate = new Date(dateObj);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;

  const prevActive = (taskLogs?.[prevKey]?.completed_tasks ?? 0) > 0;
  const nextActive = (taskLogs?.[nextKey]?.completed_tasks ?? 0) > 0;

  if (!wasActiveDay) {
    if (prevActive) return { impact: 'broke', label: '💔 Streak broken', description: 'This day ended an active streak.' };
    return { impact: 'neutral', label: '⬜ Inactive', description: 'No activity recorded.' };
  }

  if (prevActive && nextActive) return { impact: 'extended', label: '🔥 Streak continued', description: 'Part of a multi-day active run.' };
  if (prevActive && !nextActive) return { impact: 'maintained', label: '🔥 Streak day', description: 'Continued the streak this day.' };
  if (!prevActive && nextActive) return { impact: 'started', label: '✨ Streak started', description: 'Started a new active streak.' };
  return { impact: 'solo', label: '⚡ Solo active day', description: 'Active day, but not part of a streak.' };
}

// ── Heatmap Cell Colors ────────────────────────────────────────────────────

export function getTaskHeatmapColor(date, taskLogs) {
  const summary = taskLogs?.[date];
  if (!summary || !summary.total_tasks) return 'var(--bg-input)';
  const acc = (summary.completed_tasks || 0) / summary.total_tasks;
  if (acc >= 0.99) return '#22c55e';
  if (acc >= 0.5) return 'var(--accent-blue)';
  if (acc > 0) return '#faba2c';
  return 'var(--bg-input)';
}

export function getGoalHeatmapColor(date, goals) {
  const goalData = getDayGoalData(date, goals);
  if (goalData.length === 0) return 'var(--bg-input)';
  const completedCount = goalData.filter(g => g.goalCompleted).length;
  const ratio = completedCount / goalData.length;
  if (ratio >= 1) return '#22c55e';
  if (ratio >= 0.5) return 'var(--accent-blue)';
  const anyHabitDone = goalData.some(g => g.completedCount > 0);
  if (ratio > 0 || anyHabitDone) return '#faba2c';
  return 'var(--bg-input)';
}

export function getFocusHeatmapColor(date, sessionLogs, focusHistory) {
  const data = getDayFocusData(date, sessionLogs, focusHistory);
  const mins = data.totalMins;
  if (mins >= 120) return '#22c55e';
  if (mins >= 45) return 'var(--accent-blue)';
  if (mins > 0) return '#faba2c';
  return 'var(--bg-input)';
}

// ── AI Day Insight Generator ────────────────────────────────────────────────

export function generateDayInsight(date, taskData, goalData, focusData, streakImpact) {
  const accuracy = taskData.accuracy;
  const completedGoals = goalData.filter(g => g.goalCompleted).length;
  const totalGoals = goalData.length;
  const focusMins = focusData.totalMins;
  const habitsDone = taskData.completedHabits;
  const habitsTotal = taskData.totalHabits;

  if (accuracy >= 99 && completedGoals === totalGoals && totalGoals > 0) {
    const focusNote = focusMins >= 60 ? ` Paired with ${Math.floor(focusMins / 60)}h ${focusMins % 60}m of deep work.` : focusMins > 0 ? ` Added ${focusMins}m of focused time.` : '';
    return { headline: '🎯 Perfect Day', body: `All ${totalGoals} goal${totalGoals > 1 ? 's' : ''} fully satisfied their completion rule. Every scheduled habit was completed.${focusNote} ${streakImpact.label}.`, tone: 'success' };
  }

  if (accuracy >= 75) {
    const dragGoal = goalData.filter(g => !g.goalCompleted).sort((a, b) => a.dailyProgress - b.dailyProgress)[0];
    const dragNote = dragGoal ? ` "${dragGoal.goalTitle}" was incomplete at ${dragGoal.dailyProgress}% (${dragGoal.completedCount}/${dragGoal.totalScheduled} habits).` : '';
    return { headline: '✅ Strong Performance', body: `${completedGoals} of ${totalGoals} goals completed. ${habitsDone} of ${habitsTotal} habits finished.${dragNote}${focusMins > 0 ? ` ${focusMins}m of focus logged.` : ''}`, tone: 'success' };
  }

  if (accuracy >= 40) {
    const dragGoal = goalData.filter(g => !g.goalCompleted).sort((a, b) => a.dailyProgress - b.dailyProgress)[0];
    return { headline: '📊 Partial Day', body: `Accuracy at ${accuracy}% — ${habitsDone} of ${habitsTotal} habits completed.${dragGoal ? ` "${dragGoal.goalTitle}" dragged the score with ${dragGoal.completedCount}/${dragGoal.totalScheduled} habits done.` : ''}${streakImpact.impact === 'broke' ? ' This also broke an active streak.' : ''}`, tone: 'warning' };
  }

  if (accuracy > 0) {
    return { headline: '⚠️ Difficult Day', body: `Only ${accuracy}% accuracy — ${habitsDone} of ${habitsTotal} habits completed. ${completedGoals} of ${totalGoals} goal${totalGoals !== 1 ? 's' : ''} met their rule.${streakImpact.impact === 'broke' ? ' This day ended an active streak.' : ''}`, tone: 'critical' };
  }

  if (habitsTotal === 0 && focusMins === 0 && taskData.totalTasks === 0) {
    return { headline: '⬜ No Data', body: 'No activity was recorded for this day. This could be a rest day or predate your goals setup.', tone: 'neutral' };
  }

  return { headline: '❌ Missed Day', body: `${taskData.totalTasks > 0 ? `${taskData.totalTasks} tasks scheduled but none completed.` : ''} ${habitsTotal > 0 ? `${habitsTotal} habits were due — 0 finished.` : ''}${streakImpact.impact === 'broke' ? ' This day broke an active streak.' : ''}`.trim(), tone: 'critical' };
}

// ── Tooltip Text ────────────────────────────────────────────────────────────

export function getDayTooltip(date, activeTab, taskLogs, goals, sessionLogs, focusHistory, accuracy, isToday) {
  if (isToday) return `Today · ${accuracy}% accuracy`;

  if (activeTab === 'tasks') {
    const log = taskLogs?.[date];
    if (!log || !log.total_tasks) return `${date}: No activity`;
    const acc = Math.round((log.completed_tasks / log.total_tasks) * 100);
    return `${date}: ${log.completed_tasks}/${log.total_tasks} tasks · ${acc}%`;
  }

  if (activeTab === 'goals') {
    const goalData = getDayGoalData(date, goals);
    if (goalData.length === 0) return `${date}: No goal data`;
    const completed = goalData.filter(g => g.goalCompleted).length;
    return `${date}: ${completed}/${goalData.length} goals completed`;
  }

  if (activeTab === 'focus') {
    const data = getDayFocusData(date, sessionLogs, focusHistory);
    if (data.totalMins === 0) return `${date}: No focus sessions`;
    const hrs = Math.floor(data.totalMins / 60);
    const mins = data.totalMins % 60;
    return `${date}: ${hrs > 0 ? `${hrs}h ` : ''}${mins}m focus${data.sessionCount ? ` · ${data.sessionCount} sessions` : ''}`;
  }

  return date;
}
