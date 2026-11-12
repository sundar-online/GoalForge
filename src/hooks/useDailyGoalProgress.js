import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { TODAY } from '../utils/dateUtils';
import { evaluateDailyGoalProgress } from '../utils/dailyGoalCompletionService';

/**
 * Hook returning live daily required task progress across the first three active goals.
 */
export function useDailyGoalProgress(overrideDate = null) {
  const { goals, disciplineProgress } = useAppContext();

  return useMemo(() => {
    if (!overrideDate && disciplineProgress) {
      return disciplineProgress;
    }
    return evaluateDailyGoalProgress(goals, overrideDate || TODAY());
  }, [goals, disciplineProgress, overrideDate]);
}

export default useDailyGoalProgress;

