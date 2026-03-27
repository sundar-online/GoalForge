import { TODAY } from './dateUtils';

export const isGoalDoneToday = (goal) => {
  if (!goal.habits || goal.habits.length === 0) return false;
  const doneHabitsCount = goal.habits.filter(h => {
    if (h.type === 'check') return h.completed;
    if (h.type === 'count') return (h.currentCount || 0) >= (h.targetCount || 10);
    return (h.timeSpent || 0) >= (h.targetTime || 15);
  }).length;
  
  if (goal.mode === 'ANY') return doneHabitsCount > 0;
  if (goal.mode === 'CUSTOM') return doneHabitsCount >= (goal.minHabits || 1);
  return doneHabitsCount === goal.habits.length;
};

export const calculateGoalDailyProgress = (goal) => {
  if (!goal.habits || goal.habits.length === 0) return 0;
  const habitsDone = goal.habits.filter(h => {
    if (h.type === 'check') return h.completed;
    if (h.type === 'count') return (h.currentCount || 0) >= (h.targetCount || 10);
    return (h.timeSpent || 0) >= (h.targetTime || 15);
  }).length;
  
  if (goal.mode === 'ANY') return habitsDone > 0 ? 100 : 0;
  const target = goal.mode === 'CUSTOM' ? (goal.minHabits || 1) : goal.habits.length;
  return Math.min(100, Math.round((habitsDone / target) * 100));
};


export const isTaskDone = (t) => {
  if (t.type === 'check') return t.completed;
  if (t.type === 'count') return (t.currentCount || 0) >= (t.targetCount || 10);
  return (t.timeSpent || 0) >= (t.targetTime || 30);
};

export const calculateAccuracy = (tasks, goals) => {
  const todayDate = TODAY();
  const todayTasks = tasks.filter(t => {
    const type = t.type || 'daily';
    if (type === 'daily') return true;
    if (type === 'single') return t.targetDate === todayDate;
    if (type === 'range') return t.startDate <= todayDate && t.endDate >= todayDate;
    return false;
  });

  const allHabits = goals.flatMap(g => g.habits || []);
  const completedHabitsCount = allHabits.filter(h => {
    if (h.type === 'check') return h.completed;
    if (h.type === 'count') return (h.currentCount || 0) >= (h.targetCount || 10);
    return (h.timeSpent || 0) >= (h.targetTime || 15);
  }).length;

  const completedTasksCount = todayTasks.filter(isTaskDone).length;
  const totalItems = todayTasks.length + allHabits.length;
  const completedItems = completedHabitsCount + completedTasksCount;
  return totalItems === 0 ? 100 : Math.round((completedItems / totalItems) * 100);
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

export const sortTasks = (tasks) => {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return 0;
  });
};
