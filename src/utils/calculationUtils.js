import { TODAY, addDays, diffDays, parseLocalDate } from './dateUtils';

// Day abbreviations match the picker: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const DAY_ABBRS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
  // Ensure the task was actually completed TODAY (especially relevant for daily tasks)
  if (t.type === 'daily' && t.lastCompletedDate !== today) return false;
  
  const cType = t.completionType || t.type || 'check';
  if (cType === 'check') return t.completed;
  if (cType === 'count') return (t.currentCount ?? 0) >= (t.targetCount ?? 10);
  return (t.timeSpent ?? 0) >= (t.targetTime ?? 30);
};

export const calculateAccuracy = (tasks, goals) => {
  const todayDate = TODAY();
  const todayTasks = tasks.filter(t => {
    const type = t.type || 'daily';
    if (type === 'daily') return true;
    if (type === 'single') return t.targetDate === todayDate || t.date === todayDate;
    if (type === 'range') return t.startDate <= todayDate && t.endDate >= todayDate;
    return false;
  });

  const goalsDone = goals.filter(isGoalDoneToday).length;
  const tasksDone = todayTasks.filter(isTaskDone).length;
  
  const totalUnits = goals.length + todayTasks.length;
  if (totalUnits === 0) return 100;
  
  const completedUnits = goalsDone + tasksDone;
  return Math.round((completedUnits / totalUnits) * 100);
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

export const calculateWeeklyReport = (taskLogs) => {
  const today = TODAY();
  const last7Days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayKey = d.toISOString().split('T')[0];
    last7Days.push(dayKey);
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
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    prev7Days.push(d.toISOString().split('T')[0]);
  }
  const prevStats = prev7Days.map(date => taskLogs[date] || { total_tasks: 0, completed_tasks: 0 });
  const prevTotalComp = prevStats.reduce((acc, d) => acc + (d.completed_tasks || 0), 0);
  const prevTotalTasks = prevStats.reduce((acc, d) => acc + (d.total_tasks || 0), 0);
  const prevAccuracy = prevTotalTasks === 0 ? 0 : Math.round((prevTotalComp / prevTotalTasks) * 100);

  return {
    weeklyAccuracy,
    totalFocusTime,
    bestDay: bestDay?.date || 'N/A',
    worstDay: worstDay?.date || 'N/A',
    improvement: weeklyAccuracy - prevAccuracy,
    dailyBreakdown: statsWithAccuracy
  };
};

export const getSmartAlerts = (accuracy, goals = [], tasks = [], weeklyReport = {}) => {
  const alerts = [];
  try {
    // 1. Streak Alert
    const streakAboutToBreak = goals.some(g => (g?.missedDays || 0) === 2) || 
                               tasks.some(t => (t?.type === 'daily' || t?.schedule_type === 'daily') && (t?.missedDays || 0) === 2);
    if (streakAboutToBreak) alerts.push({ type: 'warning', message: "⚠ You may break your streak today" });

    // 2. Low Productivity Alert
    if (accuracy < 50) alerts.push({ type: 'danger', message: "📉 Low productivity detected" });

    // 3. Consistency Alert
    const habitStreaks = goals.flatMap(g => (g?.habits || []).map(h => h?.streak || 0));
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

export const calculateStreakFromHistory = (completedDates, scheduleDays = [], parentGoalCompletedDates = [], habitCreatedAt = null) => {
  // Area 2 & 3: New habits must start at 0d streak until genuinely completed.
  if (!completedDates || completedDates.length === 0) return 0;

  const completedSet = new Set(completedDates);
  const todayStr = TODAY();

  // Area 3: Inherit goal completion history before habit creation date safely
  if (habitCreatedAt && parentGoalCompletedDates && parentGoalCompletedDates.length > 0) {
    const habitCreatedDateStr = habitCreatedAt.split('T')[0];
    parentGoalCompletedDates.forEach(date => {
      if (date < habitCreatedDateStr) {
        completedSet.add(date);
      }
    });
  }

  if (completedSet.size === 0) return 0;

  // Find the earliest date to set a dynamic simulation window
  const sorted = [...completedSet].sort();
  const earliestDate = sorted[0];
  const diff = diffDays(todayStr, earliestDate);
  const startDaysAgo = Math.min(1000, Math.max(365, diff));

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

  let startStr = goal.startDate || goal.createdAt || todayStr;
  if (startStr.includes('T')) startStr = startStr.split('T')[0];
  if (allCompletedDates.length > 0) {
    const earliestHabitDate = [...allCompletedDates].sort()[0];
    if (earliestHabitDate < startStr) {
      startStr = earliestHabitDate;
    }
  }

  const diff = diffDays(todayStr, startStr);
  const daysCount = Math.min(1000, Math.max(30, diff));
  for (let i = 0; i <= daysCount; i++) {
    datesToTest.add(addDays(todayStr, -i));
  }

  const completedDates = [];
  for (const dateStr of datesToTest) {
    const scheduledHabits = habits.filter(h => {
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
export const calculateConsecutiveMissedDays = (completedDates, scheduleDays = []) => {
  if (!completedDates || completedDates.length === 0) return 0;
  const completedSet = new Set(completedDates);
  const todayStr = TODAY();

  let missed = 0;
  let checkDate = addDays(todayStr, -1);
  
  for (let i = 1; i <= 30; i++) {
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
export const calculateGoalConsecutiveMissedDays = (goalCompletedDates, scheduleDays = []) => {
  if (!goalCompletedDates || goalCompletedDates.length === 0) return 0;
  const completedSet = new Set(goalCompletedDates);
  const todayStr = TODAY();

  let missed = 0;
  let checkDate = addDays(todayStr, -1);
  
  for (let i = 1; i <= 30; i++) {
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
 * Standard streak rules: resets to 0 if a scheduled day is missed.
 */
export const calculateGoalStreak = (completedDates, scheduleDays = []) => {
  if (!completedDates || completedDates.length === 0) return 0;

  const completedSet = new Set(completedDates);
  const todayStr = TODAY();

  // Find the earliest date to set a dynamic simulation window
  const sorted = [...completedSet].sort();
  const earliestDate = sorted[0];
  const diff = diffDays(todayStr, earliestDate);
  const startDaysAgo = Math.min(1000, Math.max(30, diff));

  let streak = 0;

  for (let i = startDaysAgo; i >= 0; i--) {
    const currentDateStr = addDays(todayStr, -i);
    const isCompleted = completedSet.has(currentDateStr);
    
    // Check if scheduled
    const dateObj = parseLocalDate(currentDateStr);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
    const isScheduled = scheduleDays.length === 0 || scheduleDays.includes(dayName);

    if (isCompleted) {
      streak++;
    } else if (isScheduled) {
      // Today itself (TODAY()) does not count as missed if not completed yet (since it's ongoing)
      if (currentDateStr !== todayStr) {
        streak = 0; // standard streak resets on missed scheduled day
      }
    }
  }

  return streak;
};


