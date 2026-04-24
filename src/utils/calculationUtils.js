import { TODAY } from './dateUtils';

export const isHabitDoneToday = (h) => {
  const today = TODAY();
  if (h.lastCompletedDate !== today) return false;
  if (h.type === 'check') return h.completed;
  if (h.type === 'count') return (h.currentCount || 0) >= (h.targetCount || 10);
  return (h.timeSpent || 0) >= (h.targetTime || 15);
};

export const isGoalDoneToday = (goal) => {
  if (!goal.habits || goal.habits.length === 0) return false;
  const doneHabitsCount = goal.habits.filter(isHabitDoneToday).length;
  
  if (goal.mode === 'ANY') return doneHabitsCount > 0;
  if (goal.mode === 'CUSTOM') return doneHabitsCount >= (goal.minHabits || 1);
  return doneHabitsCount === goal.habits.length;
};

export const calculateGoalDailyProgress = (goal) => {
  if (!goal.habits || goal.habits.length === 0) return 0;
  const habitsDone = goal.habits.filter(isHabitDoneToday).length;
  
  if (goal.mode === 'ANY') return habitsDone > 0 ? 100 : 0;
  const target = goal.mode === 'CUSTOM' ? (goal.minHabits || 1) : goal.habits.length;
  return Math.min(100, Math.round((habitsDone / target) * 100));
};


export const isTaskDone = (t) => {
  const today = TODAY();
  // Ensure the task was actually completed TODAY (especially relevant for daily tasks)
  if (t.type === 'daily' && t.lastCompletedDate !== today) return false;
  
  const cType = t.completionType || t.type || 'check';
  if (cType === 'check') return t.completed;
  if (cType === 'count') return (t.currentCount || 0) >= (t.targetCount || 10);
  return (t.timeSpent || 0) >= (t.targetTime || 30);
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

export const getSmartAlerts = (accuracy, goals, tasks, weeklyReport) => {
  const alerts = [];
  const today = TODAY();

  // 1. Streak Alert
  const streakAboutToBreak = goals.some(g => (g.missedDays || 0) === 2) || tasks.some(t => t.type === 'daily' && (t.missedDays || 0) === 2);
  if (streakAboutToBreak) alerts.push({ type: 'warning', message: "⚠ You may break your streak today" });

  // 2. Low Productivity Alert
  if (accuracy < 50) alerts.push({ type: 'danger', message: "📉 Low productivity detected" });

  // 3. Consistency Alert
  const maxStreak = Math.max(0, ...goals.flatMap(g => g.habits.map(h => h.streak || 0)), ...tasks.map(t => t.currentStreak || 0));
  if (maxStreak >= 5) alerts.push({ type: 'success', message: "🔥 Great consistency!" });

  // 4. Improvement Alert
  if (weeklyReport.improvement > 5) alerts.push({ type: 'info', message: "📈 You're improving" });

  return alerts;
};

