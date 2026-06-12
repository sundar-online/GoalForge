import { TODAY, addDays, diffDays, parseLocalDate } from './dateUtils';

// Day abbreviations match the picker: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Helper to normalize any createdAt / created_at date field to YYYY-MM-DD
 * Supports native Firestore Timestamps, serialized objects, JS Dates, and strings.
 */
const toLocalYYYYMMDD = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const normalizeDateStr = (dateVal, fallbackDateStr = null) => {
  if (!dateVal) return fallbackDateStr;

  // 1. If it's a Firestore Timestamp instance (or has .toDate function)
  if (typeof dateVal.toDate === 'function') {
    try {
      return toLocalYYYYMMDD(dateVal.toDate());
    } catch (e) {
      console.warn('[normalizeDateStr] failed to convert with toDate():', e);
    }
  }

  // 2. If it's a JS Date instance
  if (dateVal instanceof Date) {
    return toLocalYYYYMMDD(dateVal);
  }

  // 3. If it's an object with seconds property (like serialized Timestamp)
  if (dateVal && typeof dateVal === 'object' && typeof dateVal.seconds === 'number') {
    return toLocalYYYYMMDD(new Date(dateVal.seconds * 1000));
  }

  // 4. Fallback: string manipulation
  try {
    const str = String(dateVal);
    if (str.includes('[object Object]')) {
      return fallbackDateStr;
    }
    if (str.includes('T')) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return toLocalYYYYMMDD(d);
      }
    }
    return str.includes('T') ? str.split('T')[0] : str;
  } catch {
    return fallbackDateStr;
  }
};

/**
 * Returns true if the habit is scheduled for today (or has no schedule = every day).
 */
export const isHabitScheduledToday = (h) => {
  if (!h.scheduleDays || h.scheduleDays.length === 0) return true; // no schedule = every day
  const todayAbbr = DAY_ABBRS[new Date().getDay()];
  return h.scheduleDays.includes(todayAbbr);
};

export const isHabitDoneToday = (h) => {
  const today = TODAY();
  if (h.lastCompletedDate !== today) return false;
  if (h.type === 'check') return h.completed;
  if (h.type === 'count') return (h.currentCount ?? 0) >= (h.targetCount ?? 10);
  return (h.timeSpent ?? 0) >= (h.targetTime ?? 15);
};

export const isGoalDoneToday = (goal) => {
  const habits = goal?.habits || [];
  if (habits.length === 0) return false;
  // Only count habits scheduled for today
  const scheduledHabits = habits.filter(isHabitScheduledToday);
  if (scheduledHabits.length === 0) return true; // nothing due today = goal is satisfied
  const doneHabitsCount = scheduledHabits.filter(isHabitDoneToday).length;

  if (goal.mode === 'ANY') return doneHabitsCount > 0;
  if (goal.mode === 'CUSTOM') return doneHabitsCount >= Math.min(goal.minHabits || 1, scheduledHabits.length);
  return doneHabitsCount === scheduledHabits.length;
};

export const calculateGoalDailyProgress = (goal) => {
  if (!goal.habits || goal.habits.length === 0) return 0;
  const scheduledHabits = goal.habits.filter(isHabitScheduledToday);
  if (scheduledHabits.length === 0) return 100; // rest day = nothing due
  const habitsDone = scheduledHabits.filter(isHabitDoneToday).length;

  if (goal.mode === 'ANY') return habitsDone > 0 ? 100 : 0;
  const target = goal.mode === 'CUSTOM' ? Math.min(goal.minHabits || 1, scheduledHabits.length) : scheduledHabits.length;
  return Math.min(100, Math.round((habitsDone / target) * 100));
};


export const isTaskDone = (t) => {
  const today = TODAY();
  const tType = t.type || 'daily';
  const cType = t.completionType || 'check';

  if (tType === 'daily') {
    // Daily tasks must have been completed TODAY
    if (t.lastCompletedDate !== today) return false;
    if (cType === 'check') return !!t.completed;
    if (cType === 'count') return (t.currentCount ?? 0) >= (t.targetCount ?? 10);
    return (t.timeSpent ?? 0) >= (t.targetTime ?? 30);
  }

  if (tType === 'single') {
    // Single tasks: completed means done on their target date
    const targetDate = t.targetDate || t.date;
    if (cType === 'check') {
      // Completed on/after their target date and lastCompletedDate is set
      return !!t.completed && (t.lastCompletedDate === targetDate || (t.completedDates || []).includes(targetDate));
    }
    if (cType === 'count') return (t.currentCount ?? 0) >= (t.targetCount ?? 10);
    return (t.timeSpent ?? 0) >= (t.targetTime ?? 30);
  }

  if (tType === 'range') {
    // Range tasks: check if completed on today's date
    if (cType === 'check') {
      // For range tasks, use completedDates to check if done today, OR the current session's completed flag
      const completedToday = (t.completedDates || []).includes(today);
      return completedToday || (!!t.completed && t.lastCompletedDate === today);
    }
    if (cType === 'count') return (t.currentCount ?? 0) >= (t.targetCount ?? 10);
    return (t.timeSpent ?? 0) >= (t.targetTime ?? 30);
  }

  // Fallback
  if (cType === 'check') return !!t.completed;
  if (cType === 'count') return (t.currentCount ?? 0) >= (t.targetCount ?? 10);
  return (t.timeSpent ?? 0) >= (t.targetTime ?? 30);
};

export const calculateAccuracy = (tasks, goals) => {
  const activeGoals = goals.filter(g => !g.isMissingDream);
  const todayHabits = activeGoals.flatMap(g => g.habits || []).filter(isHabitScheduledToday);
  const completedTodayHabitsCount = todayHabits.filter(isHabitDoneToday).length;

  const totalUnits = todayHabits.length;
  if (totalUnits === 0) return 100;
  
  return Math.round((completedTodayHabitsCount / totalUnits) * 100);
};

export const calculateDisciplineScore = (accuracy, avgStreak, focusTime) => {
  const streakScore = Math.min(40, avgStreak * 5);
  const focusGoal = 120 * 60; // 120 minutes in seconds
  const focusScore = Math.min(20, (focusTime / focusGoal) * 20);
  const accuracyScore = (accuracy / 100) * 40;
  return Math.round(streakScore + focusScore + accuracyScore);
};

export const getUserLevel = (disciplineScore) => {
  if (disciplineScore >= 90) return 'Elite';
  if (disciplineScore >= 70) return 'Focused';
  if (disciplineScore >= 40) return 'Consistent';
  return 'Beginner';
};

export const getInsights = (accuracy, avgStreak, focusTime) => {
  const insights = [];
  const focusGoal = 120 * 60;
  if (accuracy > 90) insights.push("Exceptional output today. Keep your momentum.");
  if (avgStreak >= 5) insights.push("Your consistency is reaching elite levels.");
  if (focusTime > focusGoal) insights.push("Deep work capacity is high. Stay in the zone.");
  if (accuracy < 50) insights.push("Focus is drifting. Re-align with your top priority.");
  return insights;
};

export const calculateProductiveStreak = (taskLogs) => {
  if (!taskLogs || Object.keys(taskLogs).length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const todayStr = TODAY();
  const yesterdayStr = addDays(todayStr, -1);

  // Filter logs where at least one task/habit was completed
  const productiveDates = new Set(
    Object.keys(taskLogs).filter(date => {
      const log = taskLogs[date];
      return log && (log.completed_tasks || 0) > 0;
    })
  );

  if (productiveDates.size === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Calculate current streak:
  // Starts from today if completed today, otherwise starts from yesterday.
  let currentStreak = 0;
  let checkDate = todayStr;
  
  if (productiveDates.has(todayStr)) {
    while (productiveDates.has(checkDate)) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    }
  } else if (productiveDates.has(yesterdayStr)) {
    checkDate = yesterdayStr;
    while (productiveDates.has(checkDate)) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    }
  }

  // Calculate best streak:
  // Iterate from the earliest date to today, keeping track of the longest consecutive productive run.
  const sortedDates = Array.from(productiveDates).sort();
  let bestStreak = 0;
  let currentRun = 0;
  let lastDate = null;

  for (const dateStr of sortedDates) {
    if (lastDate === null) {
      currentRun = 1;
    } else {
      const expectedNext = addDays(lastDate, 1);
      if (dateStr === expectedNext) {
        currentRun++;
      } else {
        bestStreak = Math.max(bestStreak, currentRun);
        currentRun = 1;
      }
    }
    lastDate = dateStr;
  }
  bestStreak = Math.max(bestStreak, currentRun);

  return { currentStreak, bestStreak };
};

export const calculateWeeklyReport = (taskLogs) => {
  const today = TODAY();
  const last7Days = [];
  for (let i = 0; i < 7; i++) {
    last7Days.push(addDays(today, -i));
  }

  const weeklyStats = last7Days.map(date => taskLogs[date] || { date, completed_tasks: 0, total_tasks: 0, time_spent: 0 });
  
  const totalCompleted = weeklyStats.reduce((acc, d) => acc + (d.completed_tasks || 0), 0);
  const totalTasks = weeklyStats.reduce((acc, d) => acc + (d.total_tasks || 0), 0);
  const totalFocusTime = weeklyStats.reduce((acc, d) => acc + (d.time_spent || 0), 0);
  
  const weeklyAccuracy = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100);
  
  const statsWithAccuracy = weeklyStats.map(s => ({
    ...s,
    accuracy: s.total_tasks === 0 ? 0 : (s.completed_tasks / s.total_tasks) * 100
  }));

  const sortedByAccuracy = [...statsWithAccuracy].sort((a, b) => b.accuracy - a.accuracy);
  const bestDay = sortedByAccuracy[0];
  const worstDay = sortedByAccuracy[sortedByAccuracy.length - 1];

  // Improvement comparison (this week vs previous week)
  const prev7Days = [];
  for (let i = 7; i < 14; i++) {
    prev7Days.push(addDays(today, -i));
  }
  const prevStats = prev7Days.map(date => taskLogs[date] || { total_tasks: 0, completed_tasks: 0 });
  const prevTotalComp = prevStats.reduce((acc, d) => acc + (d.completed_tasks || 0), 0);
  const prevTotalTasks = prevStats.reduce((acc, d) => acc + (d.total_tasks || 0), 0);
  const prevAccuracy = prevTotalTasks === 0 ? 0 : Math.round((prevTotalComp / prevTotalTasks) * 100);

  // Calculate active days in the last 7 days
  const activeDays = weeklyStats.filter(s => (s.completed_tasks || 0) > 0).length;

  // Calculate best productive streak overall
  const { bestStreak } = calculateProductiveStreak(taskLogs);

  return {
    weeklyAccuracy,
    totalFocusTime,
    bestDay: bestDay?.date || 'N/A',
    worstDay: worstDay?.date || 'N/A',
    improvement: weeklyAccuracy - prevAccuracy,
    dailyBreakdown: statsWithAccuracy,
    activeDays,
    bestStreak
  };
};

export const getSmartAlerts = (accuracy, goals = [], tasks = [], weeklyReport = {}, dismissedInsights = []) => {
  const alerts = [];
  try {
    const activeGoals = goals.filter(g => !g.isMissingDream);
    // 1. Streak Alert
    const hasHabitRisk = activeGoals.some(g => 
      (g.habits || []).some(h => {
        const isAtRisk = (h.missedDays || 0) >= 2 && (h.streak || 0) > 0 && !isHabitDoneToday(h) && !h.isRecovering;
        if (!isAtRisk) return false;
        // Check if dismissed
        const isDismissed = dismissedInsights.some(d => 
          d.startsWith(`recovery_${h.id}__`) || d.startsWith(`recovery_grouped_${h.id}__`)
        );
        return !isDismissed;
      })
    );

    const hasTaskRisk = tasks.some(t => {
      const isAtRisk = (t.type === 'daily' || t.schedule_type === 'daily') && 
                       (t.missedDays || 0) >= 2 && 
                       (t.currentStreak || 0) > 0 && 
                       !isTaskDone(t) && 
                       !t.isRecovering;
      if (!isAtRisk) return false;
      const isDismissed = dismissedInsights.some(d => 
        d.startsWith(`recovery_${t.id}__`) || d.startsWith(`recovery_grouped_${t.id}__`)
      );
      return !isDismissed;
    });

    const hasGoalRisk = activeGoals.some(g => {
      const isAtRisk = (g.missedDays || 0) >= 2 && (g.streak || 0) > 0 && !isGoalDoneToday(g) && !g.isRecovering;
      if (!isAtRisk) return false;
      const isDismissed = dismissedInsights.some(d => 
        d.startsWith(`recovery_${g.id}__`) || d.startsWith(`recovery_grouped_${g.id}__`)
      );
      return !isDismissed;
    });

    const streakAboutToBreak = hasHabitRisk || hasTaskRisk || hasGoalRisk;
    if (streakAboutToBreak) {
      alerts.push({ type: 'warning', message: "⚠ Your streak is at risk" });
    }

    // 2. Low Productivity Alert
    if (accuracy < 50) alerts.push({ type: 'danger', message: "📉 Low productivity detected" });

    // 3. Consistency Alert
    const habitStreaks = activeGoals.flatMap(g => (g?.habits || []).map(h => h?.streak || 0));
    const taskStreaks = tasks.map(t => t?.currentStreak || 0);
    const maxStreak = Math.max(0, ...habitStreaks, ...taskStreaks);
    if (maxStreak >= 5) alerts.push({ type: 'success', message: "🔥 Great consistency!" });

    // 4. Improvement Alert
    if (weeklyReport?.improvement > 5) alerts.push({ type: 'info', message: "📈 You're improving" });
  } catch (e) {
    console.error("[Alerts] Error generating alerts:", e);
  }
  return alerts;
};

export const calculateStreakFromHistory = (completedDates, scheduleDays = [], createdAt = null) => {
  // Area 2 & 3: New habits must start at 0d streak until genuinely completed.
  if (!completedDates || completedDates.length === 0) return 0;

  const completedSet = new Set(completedDates);
  const todayStr = TODAY();

  if (completedSet.size === 0) return 0;

  // Find the earliest date to set a dynamic simulation window
  const sorted = [...completedSet].sort();
  const earliestDate = sorted[0];
  const diff = diffDays(todayStr, earliestDate);

  // Clamp startDaysAgo to the habit's creation date to prevent inflated streaks
  // from before the habit existed. createdAt bounds the earliest evaluation point.
  const createdDateStr = normalizeDateStr(createdAt, null);
  const createdDiff = createdDateStr ? diffDays(todayStr, createdDateStr) : diff;
  const startDaysAgo = Math.min(1000, Math.max(365, diff, createdDiff));

  let streak = 0;
  let consecutiveMissedDays = 0;

  for (let i = startDaysAgo; i >= 0; i--) {
    const currentDateStr = addDays(todayStr, -i);
    const isCompleted = completedSet.has(currentDateStr);
    
    // Check if scheduled
    const dateObj = parseLocalDate(currentDateStr);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
    const isScheduled = scheduleDays.length === 0 || scheduleDays.includes(dayName);

    // Dynamic Centralized Calculation Logic:
    // Completed days always build/sustain streaks instantly (even on off-schedule days).
    if (isCompleted) {
      streak++;
      consecutiveMissedDays = 0;
    } else if (isScheduled) {
      // Today itself (TODAY()) does not count as missed if not completed yet (since it's ongoing)
      if (currentDateStr !== todayStr) {
        consecutiveMissedDays++;
        // Apply gradual decay rules:
        // - missing 1 or 2 days -> streak remains protected
        // - after 3 consecutive missed days -> streak decreases by 1
        // - every additional 2 missed consecutive days -> streak decreases by another 1
        if (consecutiveMissedDays >= 3) {
          if ((consecutiveMissedDays - 3) % 2 === 0) {
            streak = Math.max(0, streak - 1);
          }
        }
      }
    }
  }

  return streak;
};

// (normalizeDateStr is now defined and exported at the top of the file)

/**
 * Derives the exact list of completed dates for a Goal based on its habits' histories.
 */
export const recalculateGoalCompletedDates = (goal) => {
  const habits = goal?.habits || [];
  if (habits.length === 0) return goal?.completedDates || [];

  const allCompletedDates = habits.flatMap(h => h.completedDates || []);
  const datesToTest = new Set(allCompletedDates);
  
  const todayStr = TODAY();
  datesToTest.add(todayStr);

  let startStr = goal.startDate || normalizeDateStr(goal.createdAt, todayStr);
  startStr = normalizeDateStr(startStr, todayStr);
  if (allCompletedDates.length > 0) {
    const earliestHabitDate = [...allCompletedDates].sort()[0];
    if (earliestHabitDate < startStr) {
      startStr =earliestHabitDate;
    }
  }

  const diff = diffDays(todayStr, startStr);
  const daysCount = Math.min(1000, Math.max(30, diff));
  for (let i = 0; i <= daysCount; i++) {
    datesToTest.add(addDays(todayStr, -i));
  }

  const completedDates = [];
  for (const dateStr of datesToTest) {
    // Only evaluate habits that were active (created) on or before dateStr
    const activeHabits = habits.filter(h => {
      const createdDateStr = normalizeDateStr(h.createdAt || h.created_at, startStr);
      return dateStr >= createdDateStr;
    });

    if (activeHabits.length === 0) {
      continue;
    }

    const scheduledHabits = activeHabits.filter(h => {
      if (!h.scheduleDays || h.scheduleDays.length === 0) return true;
      const dateObj = parseLocalDate(dateStr);
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
      return h.scheduleDays.includes(dayName);
    });

    if (scheduledHabits.length === 0) {
      continue; // rest day = doesn't count as completion, but doesn't break streak either
    }

    const doneHabitsCount = scheduledHabits.filter(h => {
      const dates = h.completedDates || [];
      return dates.includes(dateStr);
    }).length;

    let isDone = false;
    if (goal.mode === 'ANY') {
      isDone = doneHabitsCount > 0;
    } else if (goal.mode === 'CUSTOM') {
      isDone = doneHabitsCount >= Math.min(goal.minHabits || 1, scheduledHabits.length);
    } else { // ALL
      isDone = doneHabitsCount === scheduledHabits.length;
    }

    if (isDone) {
      completedDates.push(dateStr);
    }
  }

  return [...new Set(completedDates)].sort();
};

/**
 * Calculates the exact consecutive missed days for a habit.
 */
export const calculateConsecutiveMissedDays = (completedDates, scheduleDays = [], createdAt = null) => {
  if (!completedDates || completedDates.length === 0) return 0;
  const completedSet = new Set(completedDates);
  const todayStr = TODAY();
  const createdStr = normalizeDateStr(createdAt, null);

  let missed = 0;
  let checkDate = addDays(todayStr, -1);
  
  for (let i = 1; i <= 30; i++) {
    if (createdStr && checkDate < createdStr) {
      break; // stop evaluating before habit creation date
    }
    const isCompleted = completedSet.has(checkDate);
    const dateObj = parseLocalDate(checkDate);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
    const isScheduled = scheduleDays.length === 0 || scheduleDays.includes(dayName);

    if (isScheduled) {
      if (isCompleted) {
        break;
      } else {
        missed++;
      }
    }
    checkDate = addDays(checkDate, -1);
  }

  return missed;
};

/**
 * Calculates the consecutive missed days for a goal.
 */
export const calculateGoalConsecutiveMissedDays = (goalCompletedDates, scheduleDays = [], goalCreatedAt = null) => {
  if (!goalCompletedDates || goalCompletedDates.length === 0) return 0;
  const completedSet = new Set(goalCompletedDates);
  const todayStr = TODAY();
  const createdStr = normalizeDateStr(goalCreatedAt, null);

  let missed = 0;
  let checkDate = addDays(todayStr, -1);
  
  for (let i = 1; i <= 30; i++) {
    if (createdStr && checkDate < createdStr) {
      break; // stop evaluating before goal creation date
    }
    const isCompleted = completedSet.has(checkDate);
    const dateObj = parseLocalDate(checkDate);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
    const isScheduled = scheduleDays.length === 0 || scheduleDays.includes(dayName);

    if (isScheduled) {
      if (isCompleted) {
        break;
      } else {
        missed++;
      }
    }
    checkDate = addDays(checkDate, -1);
  }

  return missed;
};

/**
 * Returns the list of days of the week scheduled for a Goal based on its habits.
 */
export const getGoalScheduledDays = (goal) => {
  const habits = goal?.habits || [];
  if (habits.length === 0) return [];
  
  const allDays = new Set();
  for (const h of habits) {
    if (!h.scheduleDays || h.scheduleDays.length === 0) {
      return []; // empty means scheduled every day, so union is also every day
    }
    h.scheduleDays.forEach(day => allDays.add(day));
  }
  return [...allDays];
};

/**
 * Calculates the exact goal streak (consecutive scheduled days fully completed).
 * Bug G5 fix: now returns { current, best } matching calculateTaskStreak shape.
 */
export const calculateGoalStreak = (completedDates, scheduleDays = []) => {
  if (!completedDates || completedDates.length === 0) return { current: 0, best: 0 };

  const completedSet = new Set(completedDates);
  const todayStr = TODAY();

  // Find the earliest date to set a dynamic simulation window
  const sorted = [...completedSet].sort();
  const earliestDate = sorted[0];
  const diff = diffDays(todayStr, earliestDate);
  const startDaysAgo = Math.min(1000, Math.max(30, diff));

  // 1. Current streak (forward pass, reset on missed scheduled day)
  let current = 0;

  for (let i = startDaysAgo; i >= 0; i--) {
    const currentDateStr = addDays(todayStr, -i);
    const isCompleted = completedSet.has(currentDateStr);

    const dateObj = parseLocalDate(currentDateStr);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
    const isScheduled = scheduleDays.length === 0 || scheduleDays.includes(dayName);

    if (isCompleted) {
      current++;
    } else if (isScheduled) {
      if (currentDateStr !== todayStr) {
        current = 0; // reset on missed scheduled day (excluding today which is still in progress)
      }
    }
  }

  // 2. Best streak: scan sorted completed dates for longest consecutive run
  let best = 0;
  let currentRun = 0;
  let lastDate = null;

  for (const dateStr of sorted) {
    if (lastDate === null) {
      currentRun = 1;
    } else {
      const expectedNext = addDays(lastDate, 1);
      if (dateStr === expectedNext) {
        currentRun++;
      } else {
        best = Math.max(best, currentRun);
        currentRun = 1;
      }
    }
    lastDate = dateStr;
  }
  best = Math.max(best, currentRun);
  best = Math.max(best, current); // ensure best >= current

  return { current, best };
};

/**
 * Calculates the overall long-term progress (Mastery) of a goal from its start date to its deadline.
 */
export const calculateOverallProgress = (g) => {
  if (!g) return 0;
  let startStr = g.startDate || normalizeDateStr(g.createdAt, TODAY());
  startStr = normalizeDateStr(startStr, TODAY());
  let endStr = normalizeDateStr(g.deadline || addDays(startStr, 30), TODAY());

  const totalDays = diffDays(startStr, endStr);
  const completedDays = (g.completedDates || []).length;
  return Math.min(100, Math.round((completedDays / totalDays) * 100));
};

export const getTaskTrackingKey = (task) => {
  if (task.recurringId) return task.recurringId;
  const titlePart = (task.title || '').trim().toLowerCase();
  const typePart = task.type || 'daily';
  return `${titlePart}_${typePart}`;
};

export const calculateTaskStreak = (completedDates, scheduleDays = []) => {
  if (!completedDates || completedDates.length === 0) {
    return { current: 0, best: 0 };
  }

  const completedSet = new Set(completedDates);
  const todayStr = TODAY();
  const sortedDates = [...completedSet].sort();

  if (sortedDates.length === 0) return { current: 0, best: 0 };

  // 1. Calculate Best Streak (longest consecutive run in completedDates)
  let best = 0;
  let currentRun = 0;
  let lastDate = null;

  for (const dateStr of sortedDates) {
    if (lastDate === null) {
      currentRun = 1;
    } else {
      const expectedNext = addDays(lastDate, 1);
      if (dateStr === expectedNext) {
        currentRun++;
      } else {
        best = Math.max(best, currentRun);
        currentRun = 1;
      }
    }
    lastDate = dateStr;
  }
  best = Math.max(best, currentRun);

  // 2. Calculate Current Streak using gradual decay (forward simulation)
  //
  // Rules (mirrors calculateStreakFromHistory for habits):
  //   - Completing a task on a scheduled day  → streak + 1
  //   - Missing 1–2 consecutive scheduled days → streak unchanged (grace period)
  //   - Missing 3 consecutive scheduled days   → streak - 1
  //   - Every additional 2 missed days after 3 → streak - 1
  //   - Off-schedule / rest days               → ignored
  //   - Today not yet completed                → not counted as missed
  //   - Streak never goes below 0

  const diff = diffDays(todayStr, sortedDates[0]);
  const startDaysAgo = Math.min(1000, Math.max(30, diff));

  let current = 0;
  let consecutiveMissedDays = 0;

  for (let i = startDaysAgo; i >= 0; i--) {
    const currentDateStr = addDays(todayStr, -i);
    const isCompleted = completedSet.has(currentDateStr);

    // Determine whether this day is a scheduled day for the task
    const dateObj = parseLocalDate(currentDateStr);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
    const isScheduled = scheduleDays.length === 0 || scheduleDays.includes(dayName);

    if (isCompleted) {
      current++;
      consecutiveMissedDays = 0;
    } else if (isScheduled) {
      // Today is still in progress — do not penalise it yet
      if (currentDateStr !== todayStr) {
        consecutiveMissedDays++;
        // Apply gradual decay:
        //   1–2 missed days → protected (no change)
        //   3rd missed day  → streak - 1
        //   5th, 7th, ...   → streak - 1 each
        if (consecutiveMissedDays >= 3 && (consecutiveMissedDays - 3) % 2 === 0) {
          current = Math.max(0, current - 1);
        }
      }
    }
    // Off-schedule (rest) days are skipped entirely — no increment, no decrement
  }

  // Best must be at least as large as the current decayed value
  best = Math.max(best, current);

  return { current, best };
};

export const sanitizeAndValidateCompletedDates = (dates, createdAt, taskId, taskTitle, storedStreak = 0) => {
  const issues = [];
  const rawDataStr = JSON.stringify(dates);

  if (!Array.isArray(dates)) {
    issues.push({ type: 'Non-array completion dates', raw: rawDataStr });
    const result = { sanitizedDates: [], hasCorruptedData: true, issues };
    _logStreakAnomaly(taskId, taskTitle, issues, rawDataStr, result.sanitizedDates);
    return result;
  }

  const todayStr = TODAY();
  const createdStr = normalizeDateStr(createdAt, null);
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  
  const seen = new Set();
  const validDates = [];
  let hasCorruptedData = false;

  for (let idx = 0; idx < dates.length; idx++) {
    const rawDate = dates[idx];
    
    // Check type
    if (typeof rawDate !== 'string') {
      issues.push({ type: `Invalid date type at index ${idx}`, raw: String(rawDate) });
      hasCorruptedData = true;
      continue;
    }

    const trimmed = rawDate.trim();

    // Check format
    if (!dateRegex.test(trimmed)) {
      issues.push({ type: `Invalid date format at index ${idx}`, raw: rawDate });
      hasCorruptedData = true;
      continue;
    }

    // Check parseability
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) {
      issues.push({ type: `Unparseable date at index ${idx}`, raw: rawDate });
      hasCorruptedData = true;
      continue;
    }

    // Check duplicate
    if (seen.has(trimmed)) {
      issues.push({ type: `Duplicate date`, raw: trimmed });
      hasCorruptedData = true;
      continue;
    }

    // Check future date
    if (trimmed > todayStr) {
      issues.push({ type: `Future date`, raw: trimmed });
      hasCorruptedData = true;
      continue;
    }

    // Check older than task creation date
    if (createdStr && trimmed < createdStr) {
      issues.push({ type: `Date older than creation date`, raw: trimmed });
      hasCorruptedData = true;
      continue;
    }

    seen.add(trimmed);
    validDates.push(trimmed);
  }

  // Check out-of-order dates
  const isSortedChronologically = dates.every((val, index) => index === 0 || val >= dates[index - 1]);
  if (!isSortedChronologically && validDates.length > 0) {
    issues.push({ type: 'Out-of-order dates', raw: rawDataStr });
    hasCorruptedData = true;
  }

  // Chronological sort
  const sortedDates = [...validDates].sort((a, b) => a.localeCompare(b));

  // Check empty history with non-zero streak values
  if (sortedDates.length === 0 && storedStreak > 0) {
    issues.push({ type: 'Empty completion history with non-zero streak', raw: `Stored Streak: ${storedStreak}` });
    hasCorruptedData = true;
  }

  if (hasCorruptedData) {
    _logStreakAnomaly(taskId, taskTitle, issues, rawDataStr, sortedDates);
  }

  return { sanitizedDates: sortedDates, hasCorruptedData, issues };
};

const _logStreakAnomaly = (taskId, taskTitle, issues, rawData, sanitizedResult) => {
  const issueTypes = issues.map(i => i.type).join(', ');
  console.warn(
    `[GoalForge Streak Validation]\n` +
    `Task ID: ${taskId || 'unknown'}\n` +
    `Task Name: ${taskTitle || 'unknown'}\n` +
    `Issue Type: ${issueTypes}\n` +
    `Raw Data: ${rawData}\n` +
    `Sanitized Result: ${JSON.stringify(sanitizedResult)}`
  );
};

export const isGoalBlocked = (goal, goals) => {
  if (!goal.dependencies || goal.dependencies.length === 0) return false;
  return goal.dependencies.some(depId => {
    const depGoal = goals.find(g => g.id === depId);
    if (!depGoal) return false;
    const progress = calculateOverallProgress(depGoal);
    return progress < 100;
  });
};

export const getRecommendedNextGoal = (goals) => {
  const activeIncompleteGoals = goals.filter(g => 
    !g.isMissingDream && 
    !g.deleted && 
    !g.isDeleted && 
    calculateOverallProgress(g) < 100
  );

  if (activeIncompleteGoals.length === 0) return null;

  let recommended = null;
  let highestScore = -Infinity;

  activeIncompleteGoals.forEach(g => {
    if (isGoalBlocked(g, goals)) {
      return;
    }

    let score = 100;

    const order = g.order ?? 1;
    score -= order * 10;

    const progress = calculateOverallProgress(g);
    score += progress * 0.5;

    if (g.deadline) {
      const todayStr = TODAY();
      const daysRemaining = diffDays(todayStr, g.deadline);
      if (daysRemaining < 0) {
        score += 50;
      } else if (daysRemaining <= 7) {
        score += (7 - daysRemaining) * 10;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      recommended = g;
    }
  });


  return recommended;
};

/**
 * Temporary debug logging utility for streak audit.
 * Logs: Task Name, Completed Dates, Calculated Current Streak,
 * Calculated Best Streak, Displayed Streak.
 *
 * Call this wherever streak values are computed or displayed.
 * Remove after audit is complete.
 */
export const logStreakDebug = (taskName, completedDates, currentStreak, bestStreak, displayedStreak = null) => {
  const label = `[StreakDebug] Task: "${taskName}"`;
  const dates = Array.isArray(completedDates) ? completedDates : [];
  const displayedVal = displayedStreak !== null ? displayedStreak : currentStreak;
  const mismatch = displayedStreak !== null && displayedStreak !== currentStreak;

  if (mismatch) {
    console.warn(
      `${label}\n` +
      `  Completed Dates (${dates.length}): [${dates.slice(-5).join(', ')}${dates.length > 5 ? ' ...' : ''}]\n` +
      `  Calculated Current Streak: ${currentStreak}\n` +
      `  Calculated Best Streak:    ${bestStreak}\n` +
      `  Displayed Streak:          ${displayedVal}\n` +
      `  ⚠ MISMATCH DETECTED: Calculated=${currentStreak} vs Displayed=${displayedVal}`
    );
  } else {
    console.log(
      `${label}\n` +
      `  Completed Dates (${dates.length}): [${dates.slice(-5).join(', ')}${dates.length > 5 ? ' ...' : ''}]\n` +
      `  Calculated Current Streak: ${currentStreak}\n` +
      `  Calculated Best Streak:    ${bestStreak}\n` +
      `  Displayed Streak:          ${displayedVal}`
    );
  }
};

