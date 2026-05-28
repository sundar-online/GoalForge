/**
 * streakEngine.js
 *
 * Single unified import surface for all streak and history calculation
 * functions. Re-exports from calculationUtils so consumers don't need to
 * know which underlying file owns each function.
 *
 * Usage:
 *   import { calculateStreakFromHistory, recalculateGoalCompletedDates } from '../utils/streakEngine';
 */

export {
  calculateStreakFromHistory,
  calculateGoalStreak,
  calculateConsecutiveMissedDays,
  calculateGoalConsecutiveMissedDays,
  recalculateGoalCompletedDates,
  getGoalScheduledDays,
  calculateOverallProgress,
} from './calculationUtils';
