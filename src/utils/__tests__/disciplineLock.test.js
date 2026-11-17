import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getFirstThreeActiveGoals,
  isHabitScheduledForDate,
  isHabitCompletedForDate,
  evaluateDailyGoalProgress,
  computeDisciplineLockDecision,
  SAFE_EMPTY_STATE_POLICY,
} from '../dailyGoalCompletionService';
import {
  buildNativeSyncPayload,
  getDisciplineSyncSignature,
  syncDisciplineLockState,
} from '../../services/disciplineLockSyncService';
import {
  disableDisciplineBlocking,
  enableDisciplineBlocking,
  getDisciplineLockStatus,
} from '../../services/disciplineLockService';

function makeHabit(id, overrides = {}) {
  return {
    id,
    title: `Task ${id}`,
    type: 'check',
    completed: false,
    scheduleDays: [],
    completedDates: [],
    lastCompletedDate: null,
    lastActiveDate: null,
    ...overrides,
  };
}

function makeGoal(id, order, habits = [], overrides = {}) {
  return {
    id,
    title: `Goal ${id}`,
    order,
    status: 'active',
    isMissingDream: false,
    deadline: '2026-12-31',
    createdAt: '2026-10-01T08:00:00.000Z',
    habits,
    ...overrides,
  };
}

const TEST_DATE = '2026-11-12'; // Thursday

describe('Discipline Lock System — Business Logic & Scenarios', () => {
  beforeEach(() => {
    const store = {};
    vi.stubGlobal('localStorage', {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    });
  });

  it('TEST 1: Discipline Lock OFF keeps Instagram unlocked even when all goals are incomplete', () => {
    const goals = [
      makeGoal('g1', 1, [makeHabit('h1', { completed: false })]),
      makeGoal('g2', 2, [makeHabit('h2', { completed: false })]),
      makeGoal('g3', 3, [makeHabit('h3', { completed: false })]),
    ];
    const progress = evaluateDailyGoalProgress(goals, TEST_DATE);
    const decision = computeDisciplineLockDecision(false, progress);

    expect(decision.enabled).toBe(false);
    expect(decision.shouldLockInstagram).toBe(false);
    expect(decision.statusLabel).toBe('Disabled');
  });

  it('TEST 2: Discipline Lock ON with all three goals incomplete locks Instagram', () => {
    const goals = [
      makeGoal('g1', 1, [makeHabit('h1'), makeHabit('h2')]),
      makeGoal('g2', 2, [makeHabit('h3')]),
      makeGoal('g3', 3, [makeHabit('h4')]),
    ];
    const progress = evaluateDailyGoalProgress(goals, TEST_DATE);
    const decision = computeDisciplineLockDecision(true, progress);

    expect(progress.totalRequiredTasks).toBe(4);
    expect(progress.completedRequiredTasks).toBe(0);
    expect(progress.overallPercentage).toBe(0);
    expect(decision.shouldLockInstagram).toBe(true);
    expect(decision.statusLabel).toBe('Instagram Locked');
  });

  it('TEST 3: Scenarios B, C, D — any single incomplete task in any of the first 3 goals locks Instagram', () => {
    const doneHabit = (id) => makeHabit(id, { completed: true, lastCompletedDate: TEST_DATE, lastActiveDate: TEST_DATE, completedDates: [TEST_DATE] });
    const todoHabit = (id) => makeHabit(id, { completed: false });

    // Scenario B: Goal 1: 4/4, Goal 2: 2/3, Goal 3: 2/2
    const scenarioB = [
      makeGoal('g1', 1, [doneHabit('a1'), doneHabit('a2'), doneHabit('a3'), doneHabit('a4')]),
      makeGoal('g2', 2, [doneHabit('b1'), doneHabit('b2'), todoHabit('b3')]),
      makeGoal('g3', 3, [doneHabit('c1'), doneHabit('c2')]),
    ];
    const evalB = evaluateDailyGoalProgress(scenarioB, TEST_DATE);
    expect(evalB.completedRequiredTasks).toBe(8);
    expect(evalB.totalRequiredTasks).toBe(9);
    expect(computeDisciplineLockDecision(true, evalB).shouldLockInstagram).toBe(true);

    // Scenario C: Goal 1: 0/4, Goal 2: 3/3, Goal 3: 2/2
    const scenarioC = [
      makeGoal('g1', 1, [todoHabit('a1'), todoHabit('a2'), todoHabit('a3'), todoHabit('a4')]),
      makeGoal('g2', 2, [doneHabit('b1'), doneHabit('b2'), doneHabit('b3')]),
      makeGoal('g3', 3, [doneHabit('c1'), doneHabit('c2')]),
    ];
    expect(computeDisciplineLockDecision(true, evaluateDailyGoalProgress(scenarioC, TEST_DATE)).shouldLockInstagram).toBe(true);

    // Scenario D: Goal 1: 4/4, Goal 2: 3/3, Goal 3: 0/2
    const scenarioD = [
      makeGoal('g1', 1, [doneHabit('a1'), doneHabit('a2'), doneHabit('a3'), doneHabit('a4')]),
      makeGoal('g2', 2, [doneHabit('b1'), doneHabit('b2'), doneHabit('b3')]),
      makeGoal('g3', 3, [todoHabit('c1'), todoHabit('c2')]),
    ];
    expect(computeDisciplineLockDecision(true, evaluateDailyGoalProgress(scenarioD, TEST_DATE)).shouldLockInstagram).toBe(true);
  });

  it('TEST 4: Scenario A — all tasks across first 3 goals completed unlocks Instagram', () => {
    const doneHabit = (id, type = 'check') => {
      if (type === 'count') {
        return makeHabit(id, { type: 'count', currentCount: 10, targetCount: 10, lastCompletedDate: TEST_DATE, lastActiveDate: TEST_DATE, completedDates: [TEST_DATE] });
      }
      if (type === 'time') {
        return makeHabit(id, { type: 'time', timeSpent: 30, targetTime: 30, lastCompletedDate: TEST_DATE, lastActiveDate: TEST_DATE, completedDates: [TEST_DATE] });
      }
      return makeHabit(id, { completed: true, lastCompletedDate: TEST_DATE, lastActiveDate: TEST_DATE, completedDates: [TEST_DATE] });
    };

    const goals = [
      makeGoal('g1', 1, [doneHabit('a1'), doneHabit('a2'), doneHabit('a3'), doneHabit('a4')]),
      makeGoal('g2', 2, [doneHabit('b1', 'count'), doneHabit('b2', 'time'), doneHabit('b3')]),
      makeGoal('g3', 3, [doneHabit('c1'), doneHabit('c2')]),
    ];
    const progress = evaluateDailyGoalProgress(goals, TEST_DATE);
    const decision = computeDisciplineLockDecision(true, progress);

    expect(progress.completedRequiredTasks).toBe(9);
    expect(progress.totalRequiredTasks).toBe(9);
    expect(progress.overallPercentage).toBe(100);
    expect(progress.allCompleted).toBe(true);
    expect(decision.shouldLockInstagram).toBe(false);
    expect(decision.statusLabel).toBe('Instagram Unlocked');
  });

  it('TEST 5: Reopening a completed task immediately locks Instagram again', () => {
    const doneH1 = makeHabit('h1', { completed: true, lastCompletedDate: TEST_DATE, lastActiveDate: TEST_DATE, completedDates: [TEST_DATE] });
    const unlockedGoals = [makeGoal('g1', 1, [doneH1])];
    expect(computeDisciplineLockDecision(true, evaluateDailyGoalProgress(unlockedGoals, TEST_DATE)).shouldLockInstagram).toBe(false);

    // Reopen h1 (simulates toggleHabitCheck uncheck in AppContext)
    const reopenedH1 = makeHabit('h1', { completed: false, lastCompletedDate: null, lastActiveDate: TEST_DATE, completedDates: [] });
    const lockedGoals = [makeGoal('g1', 1, [reopenedH1])];
    const evalLocked = evaluateDailyGoalProgress(lockedGoals, TEST_DATE);
    expect(evalLocked.completedRequiredTasks).toBe(0);
    expect(computeDisciplineLockDecision(true, evalLocked).shouldLockInstagram).toBe(true);
  });

  it('TEST 6: Offline task completion updates local snapshot and web fallback plugin without Firestore', async () => {
    const doneHabit = makeHabit('h1', { completed: true, lastCompletedDate: TEST_DATE, lastActiveDate: TEST_DATE, completedDates: [TEST_DATE] });
    const goals = [makeGoal('g1', 1, [doneHabit])];

    const syncRes = await syncDisciplineLockState({
      userId: null, // offline / no network DB call
      settings: { disciplineLock: { enabled: true } },
      goals,
      dateStr: TEST_DATE,
      transitionAction: 'enable',
    });

    expect(syncRes.nativePayload.enabled).toBe(true);
    expect(syncRes.nativePayload.isLocked).toBe(false);
    expect(syncRes.nativePayload.completedRequiredTasks).toBe(1);

    const pluginStatus = await getDisciplineLockStatus({ date: TEST_DATE });
    expect(pluginStatus.enabled).toBe(true);
    expect(pluginStatus.isLocked).toBe(false);
  });

  it('TEST 8: New calendar day resets requirement and locks Instagram if tasks are not completed for the new day', () => {
    const yesterday = '2026-11-11';
    const today = '2026-11-12';
    const habitDoneYesterday = makeHabit('h1', {
      completed: true,
      lastCompletedDate: yesterday,
      lastActiveDate: yesterday,
      completedDates: [yesterday],
    });

    const goals = [makeGoal('g1', 1, [habitDoneYesterday])];

    const evalYesterday = evaluateDailyGoalProgress(goals, yesterday);
    expect(computeDisciplineLockDecision(true, evalYesterday).shouldLockInstagram).toBe(false);

    const evalToday = evaluateDailyGoalProgress(goals, today);
    expect(evalToday.completedRequiredTasks).toBe(0);
    expect(evalToday.totalRequiredTasks).toBe(1);
    expect(computeDisciplineLockDecision(true, evalToday).shouldLockInstagram).toBe(true);
  });

  it('TEST 9: Disabling Discipline Lock immediately unlocks Instagram and keeps goal/task data intact', async () => {
    const todoHabit = makeHabit('h1', { completed: false });
    const goals = [makeGoal('g1', 1, [todoHabit])];
    const progress = evaluateDailyGoalProgress(goals, TEST_DATE);

    await enableDisciplineBlocking(buildNativeSyncPayload(true, progress));
    const lockedStatus = await getDisciplineLockStatus();
    expect(lockedStatus.enabled).toBe(true);
    expect(lockedStatus.isLocked).toBe(true);

    await disableDisciplineBlocking();
    const disabledStatus = await getDisciplineLockStatus();
    expect(disabledStatus.enabled).toBe(false);
    expect(disabledStatus.isLocked).toBe(false);
  });

  it('TEST 10: Only two active goals exist -> both are used and no third goal is fabricated', () => {
    const goals = [
      makeGoal('g1', 1, [makeHabit('h1')]),
      makeGoal('g2', 2, [makeHabit('h2')]),
    ];
    const progress = evaluateDailyGoalProgress(goals, TEST_DATE);
    expect(progress.goals).toHaveLength(2);
    expect(progress.goals.map((g) => g.id)).toEqual(['g1', 'g2']);
  });

  it('TEST 11: Excludes completed, failed, expired, archived, missing dreams, and goals beyond the first three', () => {
    const doneHabit = (id) => makeHabit(id, { completed: true, lastCompletedDate: TEST_DATE, lastActiveDate: TEST_DATE, completedDates: [TEST_DATE] });
    const todoHabit = (id) => makeHabit(id, { completed: false });

    const goals = [
      makeGoal('completed', 1, [todoHabit('x1')], { status: 'completed' }),
      makeGoal('failed', 2, [todoHabit('x2')], { status: 'failed' }),
      makeGoal('archived', 3, [todoHabit('x3')], { status: 'archived' }),
      makeGoal('expired', 4, [todoHabit('x4')], { deadline: '2026-10-01' }),
      makeGoal('dream', 5, [todoHabit('x5')], { isMissingDream: true }),
      makeGoal('active1', 6, [doneHabit('a1')]),
      makeGoal('active2', 7, [doneHabit('a2')]),
      makeGoal('active3', 8, [doneHabit('a3')]),
      makeGoal('active4', 9, [todoHabit('a4')]), // 4th active goal must NOT block Instagram
    ];

    const selected = getFirstThreeActiveGoals(goals, TEST_DATE);
    expect(selected.map((g) => g.id)).toEqual(['active1', 'active2', 'active3']);

    const progress = evaluateDailyGoalProgress(goals, TEST_DATE);
    const decision = computeDisciplineLockDecision(true, progress);
    expect(progress.totalRequiredTasks).toBe(3);
    expect(progress.completedRequiredTasks).toBe(3);
    expect(decision.shouldLockInstagram).toBe(false);
  });

  it('Respects task scheduleDays, deduplicates task IDs, and applies safe empty-state lock policy', () => {
    // 2026-11-12 is Thursday ('Thu')
    const thuHabit = makeHabit('h1', { scheduleDays: ['Thu'], completed: true, lastCompletedDate: TEST_DATE, lastActiveDate: TEST_DATE, completedDates: [TEST_DATE] });
    const friHabit = makeHabit('h2', { scheduleDays: ['Fri'], completed: false });

    expect(isHabitScheduledForDate(thuHabit, TEST_DATE)).toBe(true);
    expect(isHabitScheduledForDate(friHabit, TEST_DATE)).toBe(false);
    expect(isHabitCompletedForDate(thuHabit, TEST_DATE)).toBe(true);

    // Duplicate habit ID inside goal should not be counted twice
    const dupGoal = makeGoal('g1', 1, [thuHabit, { ...thuHabit }, friHabit]);
    const evalDup = evaluateDailyGoalProgress([dupGoal], TEST_DATE);
    expect(evalDup.totalRequiredTasks).toBe(1);
    expect(evalDup.completedRequiredTasks).toBe(1);

    // Safe empty-state policy: 0 active goals or 0 scheduled tasks -> stays locked when enabled, no NaN/zero division
    const emptyEval = evaluateDailyGoalProgress([], TEST_DATE);
    expect(emptyEval.policy).toBe(SAFE_EMPTY_STATE_POLICY);
    expect(emptyEval.overallPercentage).toBe(0);
    expect(emptyEval.allCompleted).toBe(false);
    expect(computeDisciplineLockDecision(true, emptyEval).shouldLockInstagram).toBe(true);
  });

  it('Produces stable Firestore sync signature to prevent redundant writes', () => {
    const sigA = getDisciplineSyncSignature({
      enabled: true,
      isLocked: true,
      lastEvaluatedDate: TEST_DATE,
      completedRequiredTasks: 2,
      totalRequiredTasks: 5,
    });
    const sigB = getDisciplineSyncSignature({
      enabled: true,
      isLocked: true,
      lastEvaluatedDate: TEST_DATE,
      completedRequiredTasks: 2,
      totalRequiredTasks: 5,
    });
    const sigC = getDisciplineSyncSignature({
      enabled: true,
      isLocked: false,
      lastEvaluatedDate: TEST_DATE,
      completedRequiredTasks: 5,
      totalRequiredTasks: 5,
    });
    expect(sigA).toBe(sigB);
    expect(sigA).not.toBe(sigC);
  });
});

