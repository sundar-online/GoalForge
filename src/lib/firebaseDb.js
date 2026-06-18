import { fireDb } from './firebase';
import {
  doc, collection, getDocs, setDoc, deleteDoc,
  query, orderBy, writeBatch
} from 'firebase/firestore';
import { sanitizeAndValidateCompletedDates, calculateTaskStreak } from '../utils/calculationUtils';

// ═══════════════════════════════════════════════════════
// Firestore Database Helper — GoalForge
// ═══════════════════════════════════════════════════════

export const debugLog = (msg, data) => {
  console.log(`%c[FirestoreDB] ${msg}`, 'color: #3b82f6; font-weight: bold;', data !== undefined ? data : '');
};

export const errorLog = (msg, err) => {
  console.error(`%c[FirestoreDB ERROR] ${msg}`, 'color: #ef4444; font-weight: bold;', err?.message || err);
};

const log = (msg, err) => errorLog(msg, err);

// ── Helper: Deep Clean Payloads to prevent undefined/NaN errors ──
export function cleanPayload(obj) {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(cleanPayload);
  }
  if (typeof obj === 'object') {
    const cleaned = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val === undefined) {
        cleaned[key] = null;
      } else if (typeof val === 'number' && isNaN(val)) {
        cleaned[key] = 0;
      } else {
        cleaned[key] = cleanPayload(val);
      }
    }
    return cleaned;
  }
  if (typeof obj === 'number' && isNaN(obj)) {
    return 0;
  }
  return obj;
}

// ── Helper: user-scoped collection ref ──────────────────
const userCol = (userId, colName) => collection(fireDb, 'users', userId, colName);
const userDoc = (userId, colName, docId) => doc(fireDb, 'users', userId, colName, docId);

// ═══════════════════════════════════════════════════════
// ── WRITES OPTIMIZATION & DECOMPRESSION ENGINE (BUFERED) ──
// ═══════════════════════════════════════════════════════

const writeCache = new Map();
const pendingWriteTimers = new Map();
const batchQueue = [];
let batchTimer = null;

// Helper: Clear cache on delete or updates
export function updateCache(pathKey, payload) {
  writeCache.set(pathKey, cleanPayload(payload));
}

function invalidateCache(pathKey) {
  writeCache.delete(pathKey);
  if (pendingWriteTimers.has(pathKey)) {
    const pending = pendingWriteTimers.get(pathKey);
    clearTimeout(pending.timerId);
    pendingWriteTimers.delete(pathKey);
    pending.resolves.forEach(r => r.resolve());
  }
}

// Deep Comparison of objects ignoring timestamps to prevent echo updates
export function isDeepEqual(obj1, obj2) {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== typeof obj2) return false;

  if (Array.isArray(obj1)) {
    if (!Array.isArray(obj2) || obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!isDeepEqual(obj1[i], obj2[i])) return false;
    }
    return true;
  }

  if (typeof obj1 === 'object') {
    const ignoredKeys = new Set(['updated_at', 'lastActionTimestamp', 'last_action_timestamp', 'clientTimestamp', 'connectedAt']);
    const keys1 = Object.keys(obj1).filter(k => !ignoredKeys.has(k));
    const keys2 = Object.keys(obj2).filter(k => !ignoredKeys.has(k));

    if (keys1.length !== keys2.length) return false;
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!isDeepEqual(obj1[key], obj2[key])) return false;
    }
    return true;
  }

  return false;
}

// Centralized Write Router: Buffers, Debounces, and Batches Writes
export async function smartWrite(docRef, payload, pathKey, useBatch = false, delay = 1500) {
  return new Promise((resolve, reject) => {
    const clean = cleanPayload(payload);

    // 1. Structural deep equality comparison check
    const cached = writeCache.get(pathKey);
    if (cached && isDeepEqual(cached, clean)) {
      debugLog(`[Deduplication Shield] Write SKIPPED for path: ${pathKey} (No changes detected)`);
      resolve();
      return;
    }

    if (useBatch) {
      // Add to transactional writeBatch queue
      const existingIndex = batchQueue.findIndex(item => item.pathKey === pathKey);
      if (existingIndex !== -1) {
        batchQueue[existingIndex].payload = clean;
        batchQueue[existingIndex].resolves.push({ resolve, reject });
      } else {
        batchQueue.push({
          docRef,
          payload: clean,
          pathKey,
          resolves: [{ resolve, reject }]
        });
      }

      if (batchTimer) clearTimeout(batchTimer);
      batchTimer = setTimeout(executeBatchWrites, 800); // 800ms debounce for batched task updates
    } else {
      // Standard debounced write
      if (pendingWriteTimers.has(pathKey)) {
        const pending = pendingWriteTimers.get(pathKey);
        clearTimeout(pending.timerId);
        pending.payload = clean;
        pending.resolves.push({ resolve, reject });
        pending.timerId = setTimeout(() => executeBufferedWrite(docRef, pathKey), delay);
      } else {
        const pending = {
          payload: clean,
          resolves: [{ resolve, reject }],
          timerId: null
        };
        pending.timerId = setTimeout(() => executeBufferedWrite(docRef, pathKey), delay);
        pendingWriteTimers.set(pathKey, pending);
      }
    }
  });
}

// Helper to calculate exact delta changes between cached state and new payload
export function getDeltaPayload(cached, payload) {
  if (!cached) return payload; // If not cached, write everything

  const delta = {};
  let hasChanges = false;

  for (const key of Object.keys(payload)) {
    const newVal = payload[key];
    const oldVal = cached[key];

    // If key doesn't exist in cached, or value is not deeply equal
    if (!(key in cached) || !isDeepEqual(oldVal, newVal)) {
      delta[key] = newVal;
      hasChanges = true;
    }
  }

  // If there are actual changes, we must also preserve operational updates like updated_at
  if (hasChanges) {
    if ('updated_at' in payload) {
      delta['updated_at'] = payload['updated_at'];
    }
    if ('clientTimestamp' in payload) {
      delta['clientTimestamp'] = payload['clientTimestamp'];
    }
  }

  return delta;
}

// Executes buffered single write after debounce delay
async function executeBufferedWrite(docRef, pathKey) {
  const pending = pendingWriteTimers.get(pathKey);
  if (!pending) return;
  pendingWriteTimers.delete(pathKey);

  try {
    const cached = writeCache.get(pathKey);
    const deltaPayload = getDeltaPayload(cached, pending.payload);

    if (cached && Object.keys(deltaPayload).length === 0) {
      debugLog(`[Buffered Write] Aborted: No delta changes for path: ${pathKey}`);
      pending.resolves.forEach(r => r.resolve());
      return;
    }

    debugLog(`[Buffered Write] Committing delta to Firestore: ${pathKey}`, deltaPayload);
    await setDoc(docRef, deltaPayload, { merge: true });
    writeCache.set(pathKey, pending.payload); // Lock successfully committed state to cache
    debugLog(`[Buffered Write] SUCCESS: ${pathKey}`);
    pending.resolves.forEach(r => r.resolve());
  } catch (err) {
    errorLog(`[Buffered Write] FAILURE: ${pathKey}`, err);
    pending.resolves.forEach(r => r.reject(err));
  }
}

// Commits all queued batch writes in a single Firestore writeBatch transaction
async function executeBatchWrites() {
  if (batchQueue.length === 0) return;
  const currentBatch = [...batchQueue];
  batchQueue.length = 0; // Clear queue

  debugLog(`[Batch Engine] Committing transactional batch for ${currentBatch.length} operations...`);

  // Optimize: If only 1 document is in the queue, perform standard setDoc to avoid transaction overhead
  if (currentBatch.length === 1) {
    const item = currentBatch[0];
    try {
      const cached = writeCache.get(item.pathKey);
      const deltaPayload = getDeltaPayload(cached, item.payload);

      if (cached && Object.keys(deltaPayload).length === 0) {
        debugLog(`[Batch Engine] Single Batch Write Aborted: No delta changes for path: ${item.pathKey}`);
        item.resolves.forEach(r => r.resolve());
        return;
      }

      debugLog(`[Batch Engine] Committing single batch delta to Firestore: ${item.pathKey}`, deltaPayload);
      await setDoc(item.docRef, deltaPayload, { merge: true });
      writeCache.set(item.pathKey, item.payload);
      debugLog(`[Batch Engine] Single Batched Write SUCCESS: ${item.pathKey}`);
      item.resolves.forEach(r => r.resolve());
    } catch (err) {
      errorLog(`[Batch Engine] Single Batched Write FAILURE: ${item.pathKey}`, err);
      item.resolves.forEach(r => r.reject(err));
    }
    return;
  }

  const batch = writeBatch(fireDb);
  const activeBatchItems = [];

  currentBatch.forEach(item => {
    const cached = writeCache.get(item.pathKey);
    const deltaPayload = getDeltaPayload(cached, item.payload);

    if (cached && Object.keys(deltaPayload).length === 0) {
      debugLog(`[Batch Engine] Batch item skipped: No delta changes for path: ${item.pathKey}`);
      item.resolves.forEach(r => r.resolve());
      return;
    }

    batch.set(item.docRef, deltaPayload, { merge: true });
    activeBatchItems.push(item);
  });

  if (activeBatchItems.length === 0) {
    debugLog(`[Batch Engine] Batch execution aborted: All batch items had empty deltas.`);
    return;
  }

  try {
    await batch.commit();
    activeBatchItems.forEach(item => {
      writeCache.set(item.pathKey, item.payload);
      debugLog(`[Batch Engine] Batched Write SUCCESS: ${item.pathKey}`);
      item.resolves.forEach(r => r.resolve());
    });
  } catch (err) {
    errorLog(`[Batch Engine] Batched Transaction FAILURE`, err);
    activeBatchItems.forEach(item => {
      item.resolves.forEach(r => r.reject(err));
    });
  }
}

// ── Goals ──────────────────────────────────────────────
export async function fetchGoals(userId) {
  try {
    const q = query(userCol(userId, 'goals'), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    const goals = [];

    for (const goalDoc of snap.docs) {
      const g = goalDoc.data();
      if (g.deleted || g.isDeleted) continue;

      const goalPathKey = `users/${userId}/goals/${goalDoc.id}`;
      writeCache.set(goalPathKey, cleanPayload(g)); // Cache primed value

      // Fetch nested habits sub-collection
      const habitsSnap = await getDocs(collection(goalDoc.ref, 'habits'));
      const habits = habitsSnap.docs.map(h => {
        const hd = h.data();
        const habitPathKey = `users/${userId}/goals/${goalDoc.id}/habits/${h.id}`;
        writeCache.set(habitPathKey, cleanPayload(hd)); // Cache primed value

        return {
          id: h.id,
          title: hd.title,
          type: hd.type || 'time',
          timeSpent: hd.time_spent ?? 0,
          targetTime: hd.target_time ?? 15,
          targetCount: hd.target_count ?? 10,
          currentCount: hd.current_count ?? 0,
          completed: hd.completed ?? false,
          streak: hd.streak ?? 0,
          lastCompletedDate: hd.last_completed_date || null,
          completedDates: hd.completed_dates || [],
          missedDays: hd.missed_days ?? 0,
          scheduleDays: hd.schedule_days || [],
          reminderEnabled: hd.reminder_enabled ?? false,
          reminderTime: hd.reminder_time || '08:00',
          lastActiveDate: hd.last_active_date || null,
          isRecovering: hd.is_recovering || false,
          originalTarget: hd.original_target || null,
          createdAt: hd.created_at || hd.updated_at || new Date().toISOString(),
        };
      });

      goals.push({
        id: goalDoc.id,
        title: g.title,
        description: g.description || '',
        mode: g.mode || 'ALL',
        minHabits: g.min_habits || 1,
        tag: g.tag || 'General',
        deadline: g.deadline || null,
        progress: g.progress ?? 0,
        streak: g.streak ?? 0,
        bestStreak: g.best_streak ?? 0,
        completedDates: g.completed_dates || [],
        missedDays: g.missed_days ?? 0,
        lastActiveDate: g.last_active_date || null,
        lastCompletedDate: g.last_completed_date || null,
        daysCompleted: g.days_completed ?? 0,
        startDate: g.start_date || null,
        createdAt: g.created_at,
        extensions: g.extensions || [],
        isMissingDream: g.is_missing_dream ?? false,
        order: g.order ?? 1,
        isFocusGoal: g.is_focus_goal ?? false,
        status: g.status ?? 'active',
        dependencies: g.dependencies || [],
        habits,
      });
    }
    return goals;
  } catch (err) {
    log('fetchGoals', err);
    return null;
  }
}

export async function upsertGoal(userId, goal) {
  const payload = {
    title: goal.title,
    description: goal.description ?? '',
    mode: goal.mode ?? 'ALL',
    min_habits: goal.minHabits ?? 1,
    tag: goal.tag ?? 'General',
    deadline: goal.deadline || null,
    progress: goal.progress ?? 0,
    streak: goal.streak ?? 0,
    best_streak: goal.bestStreak ?? 0,              // G5 fix: persist best streak to Firestore
    completed_dates: goal.completedDates || [],
    missed_days: goal.missedDays ?? 0,
    last_active_date: goal.lastActiveDate || null,
    last_completed_date: goal.lastCompletedDate || null,
    days_completed: goal.daysCompleted ?? 0,
    start_date: goal.startDate || null,
    extensions: goal.extensions || [],
    is_missing_dream: goal.isMissingDream ?? false,
    order: goal.order ?? 1,
    is_focus_goal: !!goal.isFocusGoal,
    status: goal.status ?? 'active',
    dependencies: goal.dependencies || [],
    created_at: goal.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const pathKey = `users/${userId}/goals/${goal.id}`;
  const docRef = userDoc(userId, 'goals', String(goal.id));
  return smartWrite(docRef, payload, pathKey, true, 1000);
}

export async function deleteGoalDb(userId, goalId) {
  try {
    debugLog(`Write START: deleteGoalDb [id=${goalId}]`);
    const goalRef = userDoc(userId, 'goals', String(goalId));
    invalidateCache(`users/${userId}/goals/${goalId}`);

    // Soft-delete markers updated first to preempt cache snapshot triggers in other tabs or offline
    await setDoc(goalRef, { deleted: true, isDeleted: true }, { merge: true });

    // Delete all habits in sub-collection first
    const habitsSnap = await getDocs(collection(fireDb, 'users', userId, 'goals', String(goalId), 'habits'));
    const batch = writeBatch(fireDb);
    habitsSnap.docs.forEach(h => {
      invalidateCache(`users/${userId}/goals/${goalId}/habits/${h.id}`);
      batch.delete(h.ref);
    });
    batch.delete(goalRef);
    await batch.commit();
    debugLog(`Write SUCCESS: deleteGoalDb [id=${goalId}]`);
  } catch (err) {
    errorLog(`Write FAILURE: deleteGoalDb [id=${goalId}]`, err);
  }
}

// ── Habits ─────────────────────────────────────────────
export async function upsertHabit(userId, goalId, habit) {
  const payload = {
    title: habit.title,
    type: habit.type ?? 'time',
    time_spent: habit.timeSpent ?? 0,
    target_time: habit.targetTime ?? 15,
    target_count: habit.targetCount ?? 10,
    current_count: habit.currentCount ?? 0,
    completed: habit.completed ?? false,
    streak: habit.streak ?? 0,
    last_completed_date: habit.lastCompletedDate || null,
    completed_dates: habit.completed_dates || habit.completedDates || [],
    missed_days: habit.missedDays ?? 0,
    schedule_days: habit.scheduleDays || [],
    reminder_enabled: !!habit.reminderEnabled,
    reminder_time: habit.reminderTime || '08:00',
    last_active_date: habit.lastActiveDate || null,
    is_recovering: habit.isRecovering ?? false,
    original_target: habit.originalTarget || null,
    created_at: habit.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const pathKey = `users/${userId}/goals/${goalId}/habits/${habit.id}`;
  const habitRef = doc(fireDb, 'users', userId, 'goals', String(goalId), 'habits', String(habit.id));
  return smartWrite(habitRef, payload, pathKey, true, 1000);
}

export async function deleteHabitDb(userId, goalId, habitId) {
  try {
    debugLog(`Write START: deleteHabitDb [goalId=${goalId}, habitId=${habitId}]`);
    invalidateCache(`users/${userId}/goals/${goalId}/habits/${habitId}`);
    await deleteDoc(doc(fireDb, 'users', userId, 'goals', String(goalId), 'habits', String(habitId)));
    debugLog(`Write SUCCESS: deleteHabitDb [goalId=${goalId}, habitId=${habitId}]`);
  } catch (err) {
    errorLog(`Write FAILURE: deleteHabitDb [goalId=${goalId}, habitId=${habitId}]`, err);
  }
}

export async function updateHabitTime(userId, goalId, habitId, timeSpent) {
  const pathKey = `users/${userId}/goals/${goalId}/habits/${habitId}`;
  const docRef = doc(fireDb, 'users', userId, 'goals', goalId, 'habits', habitId);
  // Fix: merge the partial field into the cached full document so the write cache
  // always holds a complete document shape. Storing only { time_spent } would corrupt
  // the cache and cause the next full upsertHabit call to over-write every field.
  const cached = writeCache.get(pathKey) || {};
  const mergedPayload = { ...cached, time_spent: timeSpent };
  return smartWrite(docRef, mergedPayload, pathKey, true, 1200);
}

export async function updateHabitCount(userId, goalId, habitId, currentCount) {
  const pathKey = `users/${userId}/goals/${goalId}/habits/${habitId}`;
  const docRef = doc(fireDb, 'users', userId, 'goals', goalId, 'habits', habitId);
  // Fix: same cache-integrity merge as updateHabitTime above
  const cached = writeCache.get(pathKey) || {};
  const mergedPayload = { ...cached, current_count: currentCount };
  return smartWrite(docRef, mergedPayload, pathKey, true, 1200);
}

export async function updateHabitCheck(userId, goalId, habitId, completed) {
  const pathKey = `users/${userId}/goals/${goalId}/habits/${habitId}`;
  const docRef = doc(fireDb, 'users', userId, 'goals', goalId, 'habits', habitId);
  // Fix: same cache-integrity merge for consistency
  const cached = writeCache.get(pathKey) || {};
  const mergedPayload = { ...cached, completed };
  return smartWrite(docRef, mergedPayload, pathKey, true, 1000);
}

// ── Tasks ──────────────────────────────────────────────
export async function fetchTasks(userId) {
  try {
    const q = query(userCol(userId, 'tasks'), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const t = d.data();
      const pathKey = `users/${userId}/tasks/${d.id}`;
      writeCache.set(pathKey, cleanPayload(t)); // Prime values in cache

      const rawDates = t.completed_dates || [];
      const { sanitizedDates } = sanitizeAndValidateCompletedDates(rawDates, t.created_at, d.id, t.title, t.current_streak);
      const { current: currentStreak, best: bestStreak } = calculateTaskStreak(sanitizedDates);

      return {
        id: d.id,
        title: t.title,
        type: t.type ?? 'daily',
        completionType: t.completion_type ?? 'time',
        targetTime: t.target_time ?? 15,
        timeSpent: t.time_spent ?? 0,
        completed: t.completed ?? false,
        targetDate: t.target_date || null,
        startDate: t.start_date || null,
        endDate: t.end_date || null,
        currentStreak,
        bestStreak,
        missedDays: t.missed_days ?? 0,
        lastCompletedDate: t.last_completed_date || null,
        completedDates: sanitizedDates,
        lastActiveDate: t.last_active_date || null,
        priority: t.priority ?? 'Medium',
        targetCount: t.target_count ?? 10,
        currentCount: t.current_count ?? 0,
        isRecovering: t.is_recovering ?? false,
        originalTarget: t.original_target || null,
        createdAt: t.created_at || null,
      };
    });
  } catch (err) {
    log('fetchTasks', err);
    return null;
  }
}

export async function upsertTask(userId, task) {
  const payload = {
    title: task.title,
    type: task.type ?? 'daily',
    completion_type: task.completionType ?? 'time',
    target_time: task.targetTime ?? 15,
    time_spent: task.timeSpent ?? 0,
    completed: task.completed ?? false,
    target_date: task.targetDate || null,
    start_date: task.startDate || null,
    end_date: task.endDate || null,
    current_streak: task.currentStreak ?? 0,
    best_streak: task.bestStreak ?? 0,          // Bug 2 fix: persist bestStreak to Firestore
    missed_days: task.missedDays ?? 0,
    last_completed_date: task.lastCompletedDate || null,
    completed_dates: task.completedDates || [],
    last_active_date: task.lastActiveDate || null,
    priority: task.priority ?? 'Medium',
    target_count: task.targetCount ?? 10,
    current_count: task.currentCount ?? 0,
    is_recovering: task.isRecovering ?? false,
    original_target: task.originalTarget || null,
    created_at: task.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const pathKey = `users/${userId}/tasks/${task.id}`;
  const docRef = userDoc(userId, 'tasks', task.id);
  return smartWrite(docRef, payload, pathKey, true, 1000);
}

export async function deleteTaskDb(userId, taskId) {
  try {
    debugLog(`Write START: deleteTaskDb [id=${taskId}]`);
    invalidateCache(`users/${userId}/tasks/${taskId}`);
    await deleteDoc(userDoc(userId, 'tasks', taskId));
    debugLog(`Write SUCCESS: deleteTaskDb [id=${taskId}]`);
  } catch (err) {
    errorLog(`Write FAILURE: deleteTaskDb [id=${taskId}]`, err);
  }
}

// ── Focus History ──────────────────────────────────────
export async function fetchFocusHistory(userId) {
  try {
    const snap = await getDocs(userCol(userId, 'focus_history'));
    const history = {};
    snap.docs.forEach(d => {
      const data = d.data();
      const pathKey = `users/${userId}/focus_history/${d.id}`;
      writeCache.set(pathKey, cleanPayload(data)); // Prime values in cache
      history[d.id] = data.seconds;
    });
    return history;
  } catch (err) {
    log('fetchFocusHistory', err);
    return null;
  }
}

export async function upsertFocusHistory(userId, date, seconds) {
  const payload = { seconds, updated_at: new Date().toISOString() };
  const pathKey = `users/${userId}/focus_history/${date}`;
  const docRef = userDoc(userId, 'focus_history', date);
  return smartWrite(docRef, payload, pathKey, false, 3000);
}

// ── Focus Sessions ─────────────────────────────────────
export async function fetchFocusSessions(userId) {
  try {
    const snap = await getDocs(userCol(userId, 'focus_sessions'));
    const sessions = [];
    snap.docs.forEach(d => {
      const data = d.data();
      const pathKey = `users/${userId}/focus_sessions/${d.id}`;
      writeCache.set(pathKey, cleanPayload(data)); // Prime values in cache
      sessions.push({
        id: d.id,
        title: data.title,
        duration: data.duration,
        goalTitle: data.goalTitle,
        date: data.date,
        timestamp: data.timestamp,
        goalId: data.goalId || 'standalone',
        itemId: data.itemId || 'standalone'
      });
    });
    return sessions;
  } catch (err) {
    log('fetchFocusSessions', err);
    return [];
  }
}

export async function upsertFocusSession(userId, session) {
  const payload = {
    id: session.id,
    title: session.title,
    duration: session.duration,
    goalTitle: session.goalTitle,
    date: session.date,
    timestamp: session.timestamp,
    goalId: session.goalId || 'standalone',
    itemId: session.itemId || 'standalone',
    updated_at: new Date().toISOString()
  };
  const pathKey = `users/${userId}/focus_sessions/${session.id}`;
  const docRef = userDoc(userId, 'focus_sessions', session.id);
  return smartWrite(docRef, payload, pathKey, false, 3000);
}

// ── Task Logs ──────────────────────────────────────────
export async function fetchTaskLogs(userId) {
  try {
    const q = query(userCol(userId, 'task_logs'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    const logs = {};
    snap.docs.forEach(d => {
      const row = d.data();
      const pathKey = `users/${userId}/task_logs/${d.id}`;
      writeCache.set(pathKey, cleanPayload(row)); // Prime values in cache
      logs[row.date] = {
        date: row.date,
        total_tasks: row.total_tasks || 0,
        completed_tasks: row.completed_tasks || 0,
        time_spent: row.time_spent || 0,
        auto_completed: row.auto_completed || false,
      };
    });
    return logs;
  } catch (err) {
    log('fetchTaskLogs', err);
    return null;
  }
}

export async function upsertTaskLog(userId, summary) {
  const payload = {
    date: summary.date,
    total_tasks: summary.total_tasks,
    completed_tasks: summary.completed_tasks,
    time_spent: summary.time_spent,
    auto_completed: summary.auto_completed || false,
    updated_at: new Date().toISOString(),
  };
  const pathKey = `users/${userId}/task_logs/${summary.date}`;
  const docRef = userDoc(userId, 'task_logs', summary.date);
  return smartWrite(docRef, payload, pathKey, false, 3000);
}

// ── User Settings ──────────────────────────────────────
export async function fetchUserSettings(userId) {
  try {
    const snap = await getDocs(userCol(userId, 'settings'));
    if (snap.empty) return null;
    const prefDoc = snap.docs.find(d => d.id === 'preferences');
    if (!prefDoc) return null;

    const data = prefDoc.data();
    const pathKey = `users/${userId}/settings/preferences`;
    writeCache.set(pathKey, cleanPayload(data)); // Prime value in cache

    return {
      theme: data.theme || 'dark',
      themeSource: data.theme_source || 'manual',
      focusTimeToday: data.focus_time_today || 0,
      lastReset: data.last_reset || null,
      dailyResetProcessed: data.daily_reset_processed || '',
      aiSettings: data.ai_settings || null,
    };
  } catch (err) {
    log('fetchUserSettings', err);
    return null;
  }
}

export async function upsertUserSettings(userId, settings) {
  const payload = {
    theme: settings.theme,
    theme_source: settings.themeSource || 'manual',
    focus_time_today: settings.focusTimeToday ?? 0,
    last_reset: settings.lastReset,
    ...(settings.dailyResetProcessed !== undefined && {
      daily_reset_processed: settings.dailyResetProcessed
    }),
    ...(settings.aiSettings !== undefined && {
      ai_settings: settings.aiSettings
    }),
    // Fix: persist weeklyIntentions so they survive refresh and sync cross-device
    weekly_intentions: settings.weeklyIntentions || {},
    updated_at: new Date().toISOString(),
  };
  const pathKey = `users/${userId}/settings/preferences`;
  const docRef = userDoc(userId, 'settings', 'preferences');
  return smartWrite(docRef, payload, pathKey, false, 2000);
}

// ── Notes ──────────────────────────────────────────────
export async function fetchNotes(userId) {
  try {
    const snap = await getDocs(userCol(userId, 'notes'));
    const notes = snap.docs.map(d => {
      const n = d.data();
      const pathKey = `users/${userId}/notes/${d.id}`;
      writeCache.set(pathKey, cleanPayload(n)); // Prime value in cache

      return {
        id: d.id,
        title: n.title || '',
        content: n.content || '',
        tags: n.tags || [],
        color: n.color || '',
        checklist: n.checklist || null,
        pinned: n.pinned || false,
        folder: n.folder || '',
        created_at: n.created_at || n.createdAt || new Date().toISOString(),
        updated_at: n.updated_at || n.updatedAt || n.created_at || new Date().toISOString(),
      };
    });

    notes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return notes;
  } catch (err) {
    log('fetchNotes', err);
    return null;
  }
}

export async function upsertNote(userId, note) {
  const payload = {
    title: note.title || '',
    content: note.content || '',
    tags: note.tags || [],
    color: note.color || '',
    checklist: note.checklist || null,
    pinned: note.pinned || false,
    folder: note.folder || '',
    created_at: note.created_at || new Date().toISOString(),
    updated_at: note.updated_at || new Date().toISOString(),
  };

  const pathKey = `users/${userId}/notes/${note.id}`;
  const docRef = userDoc(userId, 'notes', note.id);
  return smartWrite(docRef, payload, pathKey, false, 1500);
}

export async function deleteNoteDb(userId, noteId) {
  try {
    debugLog(`Write START: deleteNoteDb [id=${noteId}]`);
    invalidateCache(`users/${userId}/notes/${noteId}`);
    await deleteDoc(userDoc(userId, 'notes', noteId));
    debugLog(`Write SUCCESS: deleteNoteDb [id=${noteId}]`);
  } catch (err) {
    errorLog(`Write FAILURE: deleteNoteDb [id=${noteId}]`, err);
  }
}

// ── Quick Thoughts ──────────────────────────────────────
export async function fetchQuickThoughts(userId) {
  try {
    const q = query(userCol(userId, 'quick_thoughts'), orderBy('updated_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      const pathKey = `users/${userId}/quick_thoughts/${d.id}`;
      writeCache.set(pathKey, cleanPayload(data));

      return {
        id: d.id,
        content: data.content || '',
        emoji: data.emoji || '',
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    });
  } catch (err) {
    log('fetchQuickThoughts', err);
    return null;
  }
}

export async function upsertQuickThought(userId, thought) {
  const payload = {
    content: thought.content || '',
    emoji: thought.emoji || '',
    created_at: thought.created_at || new Date().toISOString(),
    updated_at: thought.updated_at || new Date().toISOString(),
  };

  const pathKey = `users/${userId}/quick_thoughts/${thought.id}`;
  const docRef = userDoc(userId, 'quick_thoughts', thought.id);
  return smartWrite(docRef, payload, pathKey, false, 1000);
}

export async function deleteQuickThoughtDb(userId, id) {
  try {
    debugLog(`Write START: deleteQuickThoughtDb [id=${id}]`);
    invalidateCache(`users/${userId}/quick_thoughts/${id}`);
    await deleteDoc(userDoc(userId, 'quick_thoughts', id));
    debugLog(`Write SUCCESS: deleteQuickThoughtDb [id=${id}]`);
  } catch (err) {
    errorLog(`Write FAILURE: deleteQuickThoughtDb [id=${id}]`, err);
  }
}

// ── XP Data ────────────────────────────────────────────
export async function fetchXpData(userId) {
  try {
    const snap = await getDocs(userCol(userId, 'xp'));
    if (snap.empty) return null;
    const profileDoc = snap.docs.find(d => d.id === 'profile');
    if (!profileDoc) return null;

    const data = profileDoc.data();
    const pathKey = `users/${userId}/xp/profile`;
    writeCache.set(pathKey, cleanPayload(data)); // Prime value in cache

    return {
      totalXP: data.total_xp || 0,
      level: data.level || 1,
      earnedBadges: data.earned_badges || [],
      badgeUnlockDates: data.badge_unlock_dates || {},
      perfectDays: data.perfect_days || 0,
      comebackCount: data.comeback_count || 0,
      totalCompletions: data.total_completions || 0,
      lastXPDate: data.last_xp_date || '',
      xpHistory: data.xp_history || [],
      notifiedBadges: data.notified_badges || [],
      nightOwlDates: data.night_owl_dates || [],
      earlyBirdDates: data.early_bird_dates || [],
    };
  } catch (err) {
    log('fetchXpData', err);
    return null;
  }
}

export async function upsertXpData(userId, xpData) {
  const payload = {
    total_xp: xpData.totalXP || 0,
    level: xpData.level || 1,
    earned_badges: xpData.earnedBadges || [],
    badge_unlock_dates: xpData.badgeUnlockDates || {},
    perfect_days: xpData.perfectDays || 0,
    comeback_count: xpData.comebackCount || 0,
    total_completions: xpData.totalCompletions || 0,
    last_xp_date: xpData.lastXPDate || '',
    xp_history: (xpData.xpHistory || []).slice(0, 50),
    notified_badges: xpData.notifiedBadges || [],
    // Fix: persist nightOwl/earlyBird dates so badge state survives refresh and device changes
    night_owl_dates: xpData.nightOwlDates || [],
    early_bird_dates: xpData.earlyBirdDates || [],
    updated_at: new Date().toISOString(),
  };

  const pathKey = `users/${userId}/xp/profile`;
  const docRef = userDoc(userId, 'xp', 'profile');
  return smartWrite(docRef, payload, pathKey, false, 3000);
}

// ── User Profile ───────────────────────────────────────
export async function upsertUserProfile(userId, profile) {
  const payload = {
    display_name: profile.displayName || '',
    email: profile.email || '',
    photo_url: profile.photoURL || '',
    updated_at: new Date().toISOString(),
  };

  const pathKey = `users/${userId}/profile`;
  const docRef = doc(fireDb, 'users', userId);
  return smartWrite(docRef, payload, pathKey, false, 2000);
}

// ── Story Moment Memories ──────────────────────────────────
export async function upsertMemory(userId, memory) {
  const payload = {
    goalId: memory.goalId || '',
    title: memory.title || '',
    completionDate: memory.completionDate || '',
    streak: memory.streak || 0,
    consistency: memory.consistency || 100,
    userNote: memory.userNote || '',
    userPhoto: memory.userPhoto || '',
    achievementStats: memory.achievementStats || {},
    createdAt: memory.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const pathKey = `users/${userId}/memories/${memory.id}`;
  const docRef = userDoc(userId, 'memories', memory.id);
  return smartWrite(docRef, payload, pathKey, false, 1500);
}

export async function deleteMemoryDb(userId, memoryId) {
  try {
    debugLog(`Write START: deleteMemoryDb [id=${memoryId}]`);
    invalidateCache(`users/${userId}/memories/${memoryId}`);
    await deleteDoc(userDoc(userId, 'memories', memoryId));
    debugLog(`Write SUCCESS: deleteMemoryDb [id=${memoryId}]`);
  } catch (err) {
    errorLog(`Write FAILURE: deleteMemoryDb [id=${memoryId}]`, err);
  }
}

// ── Clear User Data (Fresh Start Reset) ───────────────────
export async function clearUserDataDb(userId) {
  try {
    const batch = writeBatch(fireDb);

    // 1. Delete all goals & nested habits
    const goalsSnap = await getDocs(userCol(userId, 'goals'));
    for (const goalDoc of goalsSnap.docs) {
      const habitsSnap = await getDocs(collection(goalDoc.ref, 'habits'));
      habitsSnap.docs.forEach(h => {
        invalidateCache(`users/${userId}/goals/${goalDoc.id}/habits/${h.id}`);
        batch.delete(h.ref);
      });
      invalidateCache(`users/${userId}/goals/${goalDoc.id}`);
      batch.delete(goalDoc.ref);
    }

    // 2. Delete all tasks
    const tasksSnap = await getDocs(userCol(userId, 'tasks'));
    tasksSnap.docs.forEach(t => {
      invalidateCache(`users/${userId}/tasks/${t.id}`);
      batch.delete(t.ref);
    });

    // 3. Delete all task_logs
    const taskLogsSnap = await getDocs(userCol(userId, 'task_logs'));
    taskLogsSnap.docs.forEach(l => {
      invalidateCache(`users/${userId}/task_logs/${l.id}`);
      batch.delete(l.ref);
    });

    // 4. Delete all focus_history
    const focusHistorySnap = await getDocs(userCol(userId, 'focus_history'));
    focusHistorySnap.docs.forEach(f => {
      invalidateCache(`users/${userId}/focus_history/${f.id}`);
      batch.delete(f.ref);
    });

    // 4b. Delete all focus_sessions
    const focusSessionsSnap = await getDocs(userCol(userId, 'focus_sessions'));
    focusSessionsSnap.docs.forEach(s => {
      invalidateCache(`users/${userId}/focus_sessions/${s.id}`);
      batch.delete(s.ref);
    });

    // 5. Delete all memories
    const memoriesSnap = await getDocs(userCol(userId, 'memories'));
    memoriesSnap.docs.forEach(m => {
      invalidateCache(`users/${userId}/memories/${m.id}`);
      batch.delete(m.ref);
    });

    // 6. Delete all quick thoughts
    const quickThoughtsSnap = await getDocs(userCol(userId, 'quick_thoughts'));
    quickThoughtsSnap.docs.forEach(q => {
      invalidateCache(`users/${userId}/quick_thoughts/${q.id}`);
      batch.delete(q.ref);
    });

    // 7. Delete all recurring task histories
    const recSnap = await getDocs(userCol(userId, 'recurring_task_history'));
    recSnap.docs.forEach(r => {
      invalidateCache(`users/${userId}/recurring_task_history/${r.id}`);
      batch.delete(r.ref);
    });

    // Commit deletions
    await batch.commit();

    // Clear memory write timers
    const prefix = `users/${userId}/`;
    for (const key of pendingWriteTimers.keys()) {
      if (key.startsWith(prefix)) {
        const pending = pendingWriteTimers.get(key);
        clearTimeout(pending.timerId);
        pendingWriteTimers.delete(key);
        pending.resolves.forEach(r => r.resolve());
      }
    }
    for (const key of writeCache.keys()) {
      if (key.startsWith(prefix)) {
        writeCache.delete(key);
      }
    }

    // 6. Reset XP Profile
    const xpRef = userDoc(userId, 'xp', 'profile');
    const xpPayload = {
      total_xp: 0,
      level: 1,
      earned_badges: [],
      badge_unlock_dates: {},
      perfect_days: 0,
      comeback_count: 0,
      total_completions: 0,
      last_xp_date: '',
      xp_history: [],
      night_owl_dates: [],
      early_bird_dates: [],
      updated_at: new Date().toISOString()
    };
    await setDoc(xpRef, xpPayload, { merge: true });
    writeCache.set(`users/${userId}/xp/profile`, cleanPayload(xpPayload));

    // 7. Reset Settings preferences (keep theme, reset others)
    const settingsRef = userDoc(userId, 'settings', 'preferences');
    const prefSnap = await getDocs(userCol(userId, 'settings'));
    let currentTheme = 'dark';
    if (!prefSnap.empty) {
      const prefDoc = prefSnap.docs.find(d => d.id === 'preferences');
      if (prefDoc) {
        currentTheme = prefDoc.data()?.theme || 'dark';
      }
    }
    const settingsPayload = {
      theme: currentTheme,
      focus_time_today: 0,
      last_reset: '',
      updated_at: new Date().toISOString()
    };
    await setDoc(settingsRef, settingsPayload, { merge: true });
    writeCache.set(`users/${userId}/settings/preferences`, cleanPayload(settingsPayload));

  } catch (err) {
    console.error('[FirestoreDB] Error clearing user data:', err);
    throw err;
  }
}

// ── Diagnostics: Firestore Connection & Write Test ───────
export async function testFirestoreWrite(userId) {
  try {
    debugLog(`[Connection Test] Write START for user ${userId}`);
    const testRef = doc(fireDb, 'users', userId, '_connection_test', 'status');
    const payload = {
      connectedAt: new Date().toISOString(),
      clientTimestamp: Date.now(),
      status: 'success'
    };
    await setDoc(testRef, payload, { merge: true });
    debugLog('[Connection Test] Write SUCCESS! Firestore connection is active and healthy.');
    return { success: true };
  } catch (err) {
    errorLog('[Connection Test] Write FAILURE! Security rules or connection error:', err);
    return { success: false, error: err };
  }
}

// ── Resilient Sync: Retry Operation with Exponential Backoff ────
export async function retryAsyncOperation(fn, retries = 3, delay = 2000) {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) {
      console.error('[Sync Retry] Maximum retries reached. Operation aborted.');
      throw err;
    }
    console.warn(`[Sync Retry] Failed. Retrying in ${delay}ms... (${retries} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryAsyncOperation(fn, retries - 1, delay * 2);
  }
}

// ── Connection Safety: Reconnect Trigger Observer ────────
export function enableNetworkReconnectSync(onReconnectCallback) {
  if (typeof window === 'undefined') return () => { };

  const handleOnline = () => {
    console.log('%c[Network Observer] Device is back ONLINE! Triggering automatic database sync retry.', 'color: #22c55e; font-weight: bold;');
    if (onReconnectCallback) onReconnectCallback();
  };

  const handleOffline = () => {
    console.warn('[Network Observer] Device went OFFLINE. Operations will be queued locally.');
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

export async function upsertRecurringHistory(userId, historyId, historyData) {
  const payload = {
    title: historyData.title || '',
    type: historyData.type || 'daily',
    completed_dates: historyData.completedDates || [],
    streak: historyData.streak || 0,
    updated_at: new Date().toISOString(),
  };
  const pathKey = `users/${userId}/recurring_task_history/${historyId}`;
  const docRef = doc(fireDb, 'users', userId, 'recurring_task_history', historyId);
  return smartWrite(docRef, payload, pathKey, false, 1500);
}

export async function fetchRecurringHistory(userId) {
  try {
    const snap = await getDocs(collection(fireDb, 'users', userId, 'recurring_task_history'));
    const history = {};
    snap.docs.forEach(d => {
      const data = d.data();
      const pathKey = `users/${userId}/recurring_task_history/${d.id}`;
      writeCache.set(pathKey, cleanPayload(data));
      history[d.id] = {
        id: d.id,
        completedDates: data.completed_dates || [],
        title: data.title || '',
        type: data.type || 'daily',
        streak: data.streak || 0,
      };
    });
    return history;
  } catch (err) {
    errorLog('fetchRecurringHistory', err);
    return null;
  }
}

// ── Scheduled Events ───────────────────────────────────
export async function upsertScheduledEvent(userId, event) {
  const payload = {
    title: event.title || '',
    description: event.description || '',
    date: event.date || '',
    time: event.time || '',
    category: event.category || 'general',
    color: event.color || 'blue',
    reminder_enabled: event.reminderEnabled ?? false,
    reminder_minutes: event.reminderMinutes ?? 30,
    linked_goal_id: event.linkedGoalId || null,
    completed: event.completed ?? false,
    created_at: event.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const pathKey = `users/${userId}/scheduled_events/${event.id}`;
  const docRef = userDoc(userId, 'scheduled_events', event.id);
  return smartWrite(docRef, payload, pathKey, false, 1000);
}

export async function deleteScheduledEventDb(userId, eventId) {
  try {
    debugLog(`Write START: deleteScheduledEventDb [id=${eventId}]`);
    invalidateCache(`users/${userId}/scheduled_events/${eventId}`);
    await deleteDoc(userDoc(userId, 'scheduled_events', eventId));
    debugLog(`Write SUCCESS: deleteScheduledEventDb [id=${eventId}]`);
  } catch (err) {
    errorLog(`Write FAILURE: deleteScheduledEventDb [id=${eventId}]`, err);
  }
}
