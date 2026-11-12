// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROFILE_STATS,
  toDateOnlyStr,
  isGoalExpired,
  isGoalActive,
  isGoalFinalized,
  evaluateGoalPerformance,
  getGoalFinalEvaluation,
  reconcileProfileStats,
} from '../goalEvaluation';
import { shouldRunReset } from '../resetManager';

function makeGoal(overrides = {}) {
  return {
    id: 'goal-1',
    title: 'Peak Physique',
    status: 'active',
    mode: 'ALL',
    minHabits: 1,
    startDate: '2026-10-01',
    deadline: '2026-10-10',
    habits: [
      {
        id: 'hab-1',
        title: 'Workout',
        type: 'check',
        scheduleDays: [],
        completedDates: [],
      },
    ],
    completedDates: [],
    ...overrides,
  };
}

describe('toDateOnlyStr', () => {
  it('preserves YYYY-MM-DD and midnight UTC ISO strings without timezone shift', () => {
    expect(toDateOnlyStr('2026-10-26')).toBe('2026-10-26');
    expect(toDateOnlyStr('2026-10-26T00:00:00.000Z')).toBe('2026-10-26');
    expect(toDateOnlyStr('2026-10-26T00:00:00Z')).toBe('2026-10-26');
    expect(toDateOnlyStr(null, 'fallback')).toBe('fallback');
  });
});

describe('isGoalExpired', () => {
  it('identifies active goal strictly past its deadline as expired (Peak Physique example)', () => {
    const goal = makeGoal({
      title: 'Peak Physique',
      deadline: '2026-10-26',
      status: 'active',
    });
    expect(isGoalExpired(goal, '2026-11-11')).toBe(true);
  });

  it('does NOT mark a goal as expired on the deadline day itself or before deadline', () => {
    const goal = makeGoal({ deadline: '2026-11-11', status: 'active' });
    expect(isGoalExpired(goal, '2026-11-11')).toBe(false);
    expect(isGoalExpired(goal, '2026-11-10')).toBe(false);
  });

  it('treats legacy goals without explicit status as active for expiry detection', () => {
    const legacy = makeGoal({ deadline: '2026-10-26' });
    delete legacy.status;
    expect(isGoalExpired(legacy, '2026-11-11')).toBe(true);
  });

  it('ignores finalized, archived, deleted, or deadline-less goals', () => {
    expect(isGoalExpired(makeGoal({ deadline: '2026-10-26', status: 'completed' }), '2026-11-11')).toBe(false);
    expect(isGoalExpired(makeGoal({ deadline: '2026-10-26', status: 'failed' }), '2026-11-11')).toBe(false);
    expect(isGoalExpired(makeGoal({ deadline: '2026-10-26', status: 'archived' }), '2026-11-11')).toBe(false);
    expect(isGoalExpired(makeGoal({ deadline: '2026-10-26', deleted: true }), '2026-11-11')).toBe(false);
    expect(isGoalExpired(makeGoal({ deadline: null }), '2026-11-11')).toBe(false);
  });

  it('returns active goal back to non-expired when deadline is extended (Continue Goal)', () => {
    const extended = makeGoal({
      deadline: '2026-11-30',
      status: 'active',
      extensions: [{ from: '2026-10-26', to: '2026-11-30' }],
    });
    expect(isGoalExpired(extended, '2026-11-11')).toBe(false);
    expect(isGoalActive(extended)).toBe(true);
    expect(isGoalFinalized(extended)).toBe(false);
  });
});

describe('evaluateGoalPerformance', () => {
  const tenDays = [
    '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
    '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10',
  ];

  const twentyDays = [
    ...tenDays,
    '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15',
    '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20',
  ];

  it('evaluates prompt percentage thresholds accurately (75-100% PASSED, 0-74.99% FAILED)', () => {
    // 100% -> PASSED
    const g100 = makeGoal({
      habits: [{ id: 'h1', scheduleDays: [], completedDates: tenDays }],
    });
    expect(evaluateGoalPerformance(g100)).toMatchObject({
      completedTasks: 10,
      totalPlannedTasks: 10,
      failedTasks: 0,
      completionPercentage: 100,
      finalResult: 'PASSED',
      newStatus: 'completed',
    });

    // 95% -> PASSED (19/20)
    const g95 = makeGoal({
      deadline: '2026-10-20',
      habits: [{ id: 'h1', scheduleDays: [], completedDates: twentyDays.slice(0, 19) }],
    });
    expect(evaluateGoalPerformance(g95)).toMatchObject({
      completionPercentage: 95,
      finalResult: 'PASSED',
      newStatus: 'completed',
    });

    // 80% -> PASSED (8/10)
    const g80 = makeGoal({
      habits: [{ id: 'h1', scheduleDays: [], completedDates: tenDays.slice(0, 8) }],
    });
    expect(evaluateGoalPerformance(g80)).toMatchObject({
      completionPercentage: 80,
      finalResult: 'PASSED',
    });

    // 75% exact boundary -> PASSED (15/20)
    const g75 = makeGoal({
      deadline: '2026-10-20',
      habits: [{ id: 'h1', scheduleDays: [], completedDates: twentyDays.slice(0, 15) }],
    });
    expect(evaluateGoalPerformance(g75)).toMatchObject({
      completedTasks: 15,
      totalPlannedTasks: 20,
      failedTasks: 5,
      completionPercentage: 75,
      finalResult: 'PASSED',
      newStatus: 'completed',
    });

    // 60% -> FAILED (6/10)
    const g60 = makeGoal({
      habits: [{ id: 'h1', scheduleDays: [], completedDates: tenDays.slice(0, 6) }],
    });
    expect(evaluateGoalPerformance(g60)).toMatchObject({
      completionPercentage: 60,
      finalResult: 'FAILED',
      newStatus: 'failed',
    });

    // 40% -> FAILED (4/10)
    const g40 = makeGoal({
      habits: [{ id: 'h1', scheduleDays: [], completedDates: tenDays.slice(0, 4) }],
    });
    expect(evaluateGoalPerformance(g40)).toMatchObject({
      completionPercentage: 40,
      finalResult: 'FAILED',
    });

    // 0% -> FAILED (0/10)
    const g0 = makeGoal({
      habits: [{ id: 'h1', scheduleDays: [], completedDates: [] }],
    });
    expect(evaluateGoalPerformance(g0)).toMatchObject({
      completedTasks: 0,
      totalPlannedTasks: 10,
      failedTasks: 10,
      completionPercentage: 0,
      finalResult: 'FAILED',
      newStatus: 'failed',
    });
  });

  it('keeps sub-75% raw ratios capped at 74.99% and FAILED rather than rounding up to 75%', () => {
    // Construct 2000 habits x 10 days = 20000 planned; 14999 completed => 74.995% raw -> clamped to 74.99% & FAILED
    const manyHabits = Array.from({ length: 2000 }, (_, i) => ({
      id: `hb-${i}`,
      scheduleDays: [],
      completedDates: i < 1500
        ? (i === 1499 ? ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'] : tenDays)
        : [],
    }));
    // Total planned = 2000 * 10 = 20000; completed = 1499 * 10 + 9 = 14999 => 14999/20000 = 74.995%
    const edgeGoal = makeGoal({
      startDate: '2026-10-01',
      deadline: '2026-10-10',
      habits: manyHabits,
    });
    const res = evaluateGoalPerformance(edgeGoal);
    expect(res.completedTasks).toBe(14999);
    expect(res.totalPlannedTasks).toBe(20000);
    expect(res.finalResult).toBe('FAILED');
    expect(res.newStatus).toBe('failed');
    expect(res.completionPercentage).toBe(74.99);
  });

  it('handles goals with zero planned tasks safely without dividing by zero', () => {
    const emptyGoal = makeGoal({ habits: [] });
    const res = evaluateGoalPerformance(emptyGoal);
    expect(res).toMatchObject({
      completedTasks: 0,
      totalPlannedTasks: 0,
      failedTasks: 0,
      completionPercentage: 0,
      finalResult: 'FAILED',
      newStatus: 'failed',
    });
    expect(Number.isNaN(res.completionPercentage)).toBe(false);
  });

  it('deduplicates duplicate completion dates, lastCompletedDate, and duplicate habit IDs', () => {
    const dupGoal = makeGoal({
      habits: [
        {
          id: 'dup-id',
          scheduleDays: [],
          completedDates: ['2026-10-01', '2026-10-01', '2026-10-02', '2026-10-02T00:00:00.000Z'],
          lastCompletedDate: '2026-10-02',
        },
        {
          id: 'dup-id', // duplicate habit entry
          scheduleDays: [],
          completedDates: tenDays,
        },
      ],
    });
    const res = evaluateGoalPerformance(dupGoal);
    expect(res.totalPlannedTasks).toBe(10);
    expect(res.completedTasks).toBe(2);
    expect(res.completionPercentage).toBe(20);
    expect(res.finalResult).toBe('FAILED');
  });

  it('respects habit scheduleDays and ALL / ANY / CUSTOM goal modes', () => {
    // 2026-10-05 (Mon) through 2026-10-11 (Sun): Mon, Wed, Fri = 3 planned days
    const scheduledGoal = makeGoal({
      startDate: '2026-10-05',
      deadline: '2026-10-11',
      habits: [
        {
          id: 'mwf',
          scheduleDays: ['Mon', 'Wed', 'Fri'],
          completedDates: ['2026-10-05', '2026-10-07', '2026-10-09'],
        },
      ],
    });
    expect(evaluateGoalPerformance(scheduledGoal)).toMatchObject({
      completedTasks: 3,
      totalPlannedTasks: 3,
      completionPercentage: 100,
      finalResult: 'PASSED',
    });

    // ANY mode across 4 days with 2 habits: 1 planned task per day = 4 total planned
    const anyGoal = makeGoal({
      startDate: '2026-10-01',
      deadline: '2026-10-04',
      mode: 'ANY',
      habits: [
        { id: 'h1', scheduleDays: [], completedDates: ['2026-10-01', '2026-10-02'] },
        { id: 'h2', scheduleDays: [], completedDates: ['2026-10-01', '2026-10-03'] },
      ],
    });
    // Days done: Oct 1 (h1+h2 -> 1), Oct 2 (h1 -> 1), Oct 3 (h2 -> 1), Oct 4 (none -> 0) => 3/4 = 75% PASSED
    expect(evaluateGoalPerformance(anyGoal)).toMatchObject({
      completedTasks: 3,
      totalPlannedTasks: 4,
      completionPercentage: 75,
      finalResult: 'PASSED',
    });

    // CUSTOM mode (minHabits: 2 out of 3 habits over 2 days = 4 planned)
    const customGoal = makeGoal({
      startDate: '2026-10-01',
      deadline: '2026-10-02',
      mode: 'CUSTOM',
      minHabits: 2,
      habits: [
        { id: 'h1', scheduleDays: [], completedDates: ['2026-10-01', '2026-10-02'] },
        { id: 'h2', scheduleDays: [], completedDates: ['2026-10-01'] },
        { id: 'h3', scheduleDays: [], completedDates: ['2026-10-01'] }, // capped at minHabits=2 on Oct 1
      ],
    });
    // Day 1: min(3, 2) = 2; Day 2: 1 => 3/4 = 75% PASSED
    expect(evaluateGoalPerformance(customGoal)).toMatchObject({
      completedTasks: 3,
      totalPlannedTasks: 4,
      completionPercentage: 75,
      finalResult: 'PASSED',
    });
  });

  it('uses persisted evaluation snapshot in getGoalFinalEvaluation when goal is already finalized', () => {
    const finalizedGoal = makeGoal({
      status: 'completed',
      finalResult: 'PASSED',
      finalCompletionPercentage: 85,
      completedTasksCount: 17,
      totalPlannedTasksCount: 20,
      failedTasksCount: 3,
      finalizedAt: '2026-11-11T10:00:00.000Z',
      evaluatedDate: '2026-11-11',
      // Even if habits array were modified/empty, stored snapshot wins:
      habits: [],
    });

    expect(getGoalFinalEvaluation(finalizedGoal)).toMatchObject({
      completedTasks: 17,
      totalPlannedTasks: 20,
      failedTasks: 3,
      completionPercentage: 85,
      finalResult: 'PASSED',
      newStatus: 'completed',
      finalizedAt: '2026-11-11T10:00:00.000Z',
      evaluatedDate: '2026-11-11',
    });
  });
});

describe('reconcileProfileStats', () => {
  it('computes Average Goal Completion from finalized goals only (80%, 60%, 100% -> 80%) and excludes active/extended goals', () => {
    const finalizedA = makeGoal({
      id: 'a',
      title: 'Goal A',
      status: 'completed',
      finalResult: 'PASSED',
      finalCompletionPercentage: 80,
      completedTasksCount: 8,
      totalPlannedTasksCount: 10,
      failedTasksCount: 2,
    });
    const finalizedB = makeGoal({
      id: 'b',
      title: 'Goal B',
      status: 'failed',
      finalResult: 'FAILED',
      finalCompletionPercentage: 60,
      completedTasksCount: 6,
      totalPlannedTasksCount: 10,
      failedTasksCount: 4,
    });
    const finalizedC = makeGoal({
      id: 'c',
      title: 'Goal C',
      status: 'completed',
      finalResult: 'PASSED',
      finalCompletionPercentage: 100,
      completedTasksCount: 10,
      totalPlannedTasksCount: 10,
      failedTasksCount: 0,
    });
    const activeD = makeGoal({
      id: 'd',
      title: 'Active Goal',
      status: 'active',
      deadline: '2026-12-31',
      extensions: [{ from: '2026-10-31', to: '2026-12-31' }],
      habits: [{ id: 'hd', scheduleDays: [], completedDates: [] }],
    });

    const stats = reconcileProfileStats(DEFAULT_PROFILE_STATS, [
      finalizedA,
      finalizedB,
      finalizedC,
      activeD,
    ]);

    expect(stats.totalGoals).toBe(4);
    expect(stats.passedGoals).toBe(2);
    expect(stats.failedGoals).toBe(1);
    expect(stats.averageGoalCompletion).toBe(80);
    expect(stats.totalTasksCompleted).toBe(24);
    expect(stats.totalTasksFailed).toBe(6);

    // Idempotency on refresh / repeated reconciliation: never double counts!
    const statsAgain = reconcileProfileStats(stats, [
      finalizedA,
      finalizedB,
      finalizedC,
      activeD,
    ]);
    expect(statsAgain).toEqual(stats);
  });

  it('safely returns 0 average completion when no finalized goals exist', () => {
    const activeOnly = [makeGoal({ id: 'active-1', status: 'active' })];
    const stats = reconcileProfileStats(DEFAULT_PROFILE_STATS, activeOnly);
    expect(stats).toMatchObject({
      totalGoals: 1,
      passedGoals: 0,
      failedGoals: 0,
      averageGoalCompletion: 0,
      totalTasksCompleted: 0,
      totalTasksFailed: 0,
    });
  });
});

describe('shouldRunReset', () => {
  it('ignores finalized goals when deciding if daily habit reset is needed', () => {
    const settings = { lastActiveDate: '2026-11-11', dailyResetProcessed: '' };
    const completedGoal = makeGoal({
      id: 'fin-1',
      status: 'completed',
      habits: [{ id: 'h1', lastActiveDate: '2026-10-10' }],
    });
    const failedGoal = makeGoal({
      id: 'fin-2',
      status: 'failed',
      habits: [{ id: 'h2', lastActiveDate: '2026-10-10' }],
    });

    const res = shouldRunReset(settings, [], [completedGoal, failedGoal], '2026-11-11');
    expect(res.hasHabitNeed).toBe(false);
    expect(res.needsReset).toBe(false);

    const activeGoal = makeGoal({
      id: 'act-1',
      status: 'active',
      habits: [{ id: 'h3', lastActiveDate: '2026-11-10' }],
    });
    const resActive = shouldRunReset(settings, [], [completedGoal, activeGoal], '2026-11-11');
    expect(resActive.hasHabitNeed).toBe(true);
    expect(resActive.needsReset).toBe(true);
  });
});
