import { useMemo } from 'react';

export const useStreak = (goals, tasks) => {
  const avgStreak = useMemo(() => {
    return goals.length === 0 ? 0 : goals.reduce((s, g) => s + (g.streak || 0), 0) / goals.length;
  }, [goals]);

  const maxStreak = useMemo(() => {
    const goalStreaks = goals.map(g => g.streak || 0);
    const taskStreaks = tasks.filter(t => t.type === 'daily').map(t => t.currentStreak || 0);
    const all = [...goalStreaks, ...taskStreaks];
    return all.length === 0 ? 0 : Math.max(...all);
  }, [goals, tasks]);

  const streakScore = useMemo(() => {
    return Math.min(40, avgStreak * 5);
  }, [avgStreak]);

  const topStreaks = useMemo(() => {
    const goalStreaks = goals.map(g => ({ name: g.title, tag: g.tag, streak: g.streak || 0, missed: g.missedDays || 0 }));
    const taskStreaks = tasks.filter(t => t.type === 'daily').map(t => ({ name: t.title, tag: 'Task', streak: t.currentStreak || 0, missed: t.missedDays || 0 }));
    
    return [...goalStreaks, ...taskStreaks]
      .filter(s => s.streak > 0 || s.missed > 0)
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 3);
  }, [goals, tasks]);

  return {
    avgStreak,
    maxStreak,
    streakScore,
    topStreaks
  };
};
