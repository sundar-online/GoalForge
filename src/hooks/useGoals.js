import { useMemo } from 'react';
import { isGoalDoneToday } from '../utils/calculationUtils';

export const useGoals = (goals) => {
  const goalMetrics = useMemo(() => {
    if (!goals || goals.length === 0) {
      return {
        doneGoalsCount: 0,
        activeGoalsCount: 0,
        avgProgress: 0,
        totalGoalsCount: 0
      };
    }

    const doneGoals = goals.filter(g => g.progress === 100).length;
    const activeGoals = goals.length - doneGoals;
    const avgProgress = Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length);

    return {
      doneGoalsCount: doneGoals,
      activeGoalsCount: activeGoals,
      avgProgress,
      totalGoalsCount: goals.length
    };
  }, [goals]);

  const goalsWithStatus = useMemo(() => {
    return goals.map(goal => ({
      ...goal,
      doneToday: isGoalDoneToday(goal)
    }));
  }, [goals]);

  return {
    ...goalMetrics,
    goalsWithStatus,
    isGoalDoneToday
  };
};
