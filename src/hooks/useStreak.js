import { useMemo } from 'react';

/**
 * Cleanly get the streak value for any item type (Goal, Habit, or Task)
 */
export const getStreakValue = (item) => {
  return item.streak || item.currentStreak || 0;
};

/**
 * Unified calculation for average streak
 */
export const calculateAvgStreak = (items = []) => {
  if (items.length === 0) return 0;
  const totalStreak = items.reduce((sum, item) => sum + getStreakValue(item), 0);
  return totalStreak / items.length;
};

export const useStreak = (goals = [], tasks = []) => {
  const dailyTasks = useMemo(() => 
    tasks.filter(t => (t.type || t.schedule_type) === 'daily'), 
    [tasks]
  );

  const avgStreak = useMemo(() => {
    return calculateAvgStreak([...goals, ...dailyTasks]);
  }, [goals, dailyTasks]);

  const maxStreak = useMemo(() => {
    const all = [...goals, ...dailyTasks].map(getStreakValue);
    return all.length === 0 ? 0 : Math.max(...all);
  }, [goals, dailyTasks]);

  const streakScore = useMemo(() => {
    return Math.min(40, avgStreak * 5);
  }, [avgStreak]);

  const topStreaks = useMemo(() => {
    const goalStreaks = goals.map(g => ({ 
      name: g.title, 
      tag: g.tag || 'Goal', 
      streak: getStreakValue(g), 
      missed: g.missedDays || 0 
    }));
    
    const taskStreaks = dailyTasks.map(t => ({ 
      name: t.title, 
      tag: 'Task', 
      streak: getStreakValue(t), 
      missed: t.missedDays || 0 
    }));
    
    return [...goalStreaks, ...taskStreaks]
      .filter(s => s.streak > 0 || s.missed > 0)
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 5); // User requested top 5
  }, [goals, dailyTasks]);

  return {
    avgStreak,
    maxStreak,
    streakScore,
    topStreaks
  };
};
