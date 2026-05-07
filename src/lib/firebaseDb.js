import { fireDb } from './firebase';
import {
  doc, collection, getDocs, setDoc, deleteDoc,
  query, where, orderBy, writeBatch
} from 'firebase/firestore';

// ═══════════════════════════════════════════════════════
// Firestore Database Helper — GoalForge
// ═══════════════════════════════════════════════════════

const log = (msg, err) => console.error(`[FirestoreDB] ${msg}`, err?.message || err);

// ── Helper: user-scoped collection ref ──────────────────
const userCol = (userId, colName) => collection(fireDb, 'users', userId, colName);
const userDoc = (userId, colName, docId) => doc(fireDb, 'users', userId, colName, docId);

// ── Goals ──────────────────────────────────────────────
export async function fetchGoals(userId) {
  try {
    const q = query(userCol(userId, 'goals'), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    const goals = [];

    for (const goalDoc of snap.docs) {
      const g = goalDoc.data();
      // Fetch nested habits sub-collection
      const habitsSnap = await getDocs(collection(goalDoc.ref, 'habits'));
      const habits = habitsSnap.docs.map(h => {
        const hd = h.data();
        return {
          id: h.id,
          title: hd.title,
          type: hd.type || 'time',
          timeSpent: hd.time_spent || 0,
          targetTime: hd.target_time || 15,
          targetCount: hd.target_count || 10,
          currentCount: hd.current_count || 0,
          completed: hd.completed || false,
          streak: hd.streak || 0,
          lastCompletedDate: hd.last_completed_date || null,
          missedDays: hd.missed_days || 0,
          scheduleDays: hd.schedule_days || [],
          lastActiveDate: hd.last_active_date || null,
          isRecovering: hd.is_recovering || false,
          originalTarget: hd.original_target || null,
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
        progress: g.progress || 0,
        streak: g.streak || 0,
        missedDays: g.missed_days || 0,
        lastActiveDate: g.last_active_date || null,
        lastCompletedDate: g.last_completed_date || null,
        daysCompleted: g.days_completed || 0,
        startDate: g.start_date || null,
        createdAt: g.created_at,
        extensions: g.extensions || [],
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
  try {
    await setDoc(userDoc(userId, 'goals', goal.id), {
      title: goal.title,
      description: goal.description || '',
      mode: goal.mode || 'ALL',
      min_habits: goal.minHabits || 1,
      tag: goal.tag || 'General',
      deadline: goal.deadline || null,
      progress: goal.progress || 0,
      streak: goal.streak || 0,
      missed_days: goal.missedDays || 0,
      last_active_date: goal.lastActiveDate || null,
      last_completed_date: goal.lastCompletedDate || null,
      days_completed: goal.daysCompleted || 0,
      start_date: goal.startDate || null,
      extensions: goal.extensions || [],
      created_at: goal.createdAt,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    log('upsertGoal', err);
  }
}

export async function deleteGoalDb(userId, goalId) {
  try {
    // Delete all habits in sub-collection first
    const habitsSnap = await getDocs(collection(fireDb, 'users', userId, 'goals', goalId, 'habits'));
    const batch = writeBatch(fireDb);
    habitsSnap.docs.forEach(h => batch.delete(h.ref));
    batch.delete(userDoc(userId, 'goals', goalId));
    await batch.commit();
  } catch (err) {
    log('deleteGoal', err);
  }
}

// ── Habits ─────────────────────────────────────────────
export async function upsertHabit(userId, goalId, habit) {
  try {
    const habitRef = doc(fireDb, 'users', userId, 'goals', goalId, 'habits', habit.id);
    await setDoc(habitRef, {
      title: habit.title,
      type: habit.type || 'time',
      time_spent: habit.timeSpent || 0,
      target_time: habit.targetTime || 15,
      target_count: habit.targetCount || 10,
      current_count: habit.currentCount || 0,
      completed: habit.completed || false,
      streak: habit.streak || 0,
      last_completed_date: habit.lastCompletedDate || null,
      missed_days: habit.missedDays || 0,
      schedule_days: habit.scheduleDays || [],
      last_active_date: habit.lastActiveDate || null,
      is_recovering: habit.isRecovering || false,
      original_target: habit.originalTarget || null,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    log('upsertHabit', err);
  }
}

export async function deleteHabitDb(userId, goalId, habitId) {
  try {
    await deleteDoc(doc(fireDb, 'users', userId, 'goals', goalId, 'habits', habitId));
  } catch (err) {
    log('deleteHabit', err);
  }
}

export async function updateHabitTime(userId, goalId, habitId, timeSpent) {
  try {
    await setDoc(doc(fireDb, 'users', userId, 'goals', goalId, 'habits', habitId), { time_spent: timeSpent }, { merge: true });
  } catch (err) {
    log('updateHabitTime', err);
  }
}

export async function updateHabitCount(userId, goalId, habitId, currentCount) {
  try {
    await setDoc(doc(fireDb, 'users', userId, 'goals', goalId, 'habits', habitId), { current_count: currentCount }, { merge: true });
  } catch (err) {
    log('updateHabitCount', err);
  }
}

export async function updateHabitCheck(userId, goalId, habitId, completed) {
  try {
    await setDoc(doc(fireDb, 'users', userId, 'goals', goalId, 'habits', habitId), { completed }, { merge: true });
  } catch (err) {
    log('updateHabitCheck', err);
  }
}

// ── Tasks ──────────────────────────────────────────────
export async function fetchTasks(userId) {
  try {
    const q = query(userCol(userId, 'tasks'), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const t = d.data();
      return {
        id: d.id,
        title: t.title,
        type: t.type || 'daily',
        completionType: t.completion_type || 'time',
        targetTime: t.target_time || 15,
        timeSpent: t.time_spent || 0,
        completed: t.completed || false,
        targetDate: t.target_date || null,
        startDate: t.start_date || null,
        endDate: t.end_date || null,
        currentStreak: t.current_streak || 0,
        missedDays: t.missed_days || 0,
        lastCompletedDate: t.last_completed_date || null,
        lastActiveDate: t.last_active_date || null,
        priority: t.priority || 'Medium',
        targetCount: t.target_count || 10,
        currentCount: t.current_count || 0,
        isRecovering: t.is_recovering || false,
        originalTarget: t.original_target || null,
      };
    });
  } catch (err) {
    log('fetchTasks', err);
    return null;
  }
}

export async function upsertTask(userId, task) {
  try {
    await setDoc(userDoc(userId, 'tasks', task.id), {
      title: task.title,
      type: task.type || 'daily',
      completion_type: task.completionType || 'time',
      target_time: task.targetTime || 15,
      time_spent: task.timeSpent || 0,
      completed: task.completed || false,
      target_date: task.targetDate || null,
      start_date: task.startDate || null,
      end_date: task.endDate || null,
      current_streak: task.currentStreak || 0,
      missed_days: task.missedDays || 0,
      last_completed_date: task.lastCompletedDate || null,
      last_active_date: task.lastActiveDate || null,
      priority: task.priority || 'Medium',
      target_count: task.targetCount || 10,
      current_count: task.currentCount || 0,
      is_recovering: task.isRecovering || false,
      original_target: task.originalTarget || null,
      created_at: task.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    log('upsertTask', err);
  }
}

export async function deleteTaskDb(userId, taskId) {
  try {
    await deleteDoc(userDoc(userId, 'tasks', taskId));
  } catch (err) {
    log('deleteTask', err);
  }
}

// ── Focus History ──────────────────────────────────────
export async function fetchFocusHistory(userId) {
  try {
    const snap = await getDocs(userCol(userId, 'focus_history'));
    const history = {};
    snap.docs.forEach(d => {
      const data = d.data();
      history[d.id] = data.seconds;
    });
    return history;
  } catch (err) {
    log('fetchFocusHistory', err);
    return null;
  }
}

export async function upsertFocusHistory(userId, date, seconds) {
  try {
    await setDoc(userDoc(userId, 'focus_history', date), { seconds, updated_at: new Date().toISOString() }, { merge: true });
  } catch (err) {
    log('upsertFocusHistory', err);
  }
}

// ── Task Logs ──────────────────────────────────────────
export async function fetchTaskLogs(userId) {
  try {
    const q = query(userCol(userId, 'task_logs'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    const logs = {};
    snap.docs.forEach(d => {
      const row = d.data();
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
  try {
    // Use date as doc ID for natural dedup
    await setDoc(userDoc(userId, 'task_logs', summary.date), {
      date: summary.date,
      total_tasks: summary.total_tasks,
      completed_tasks: summary.completed_tasks,
      time_spent: summary.time_spent,
      auto_completed: summary.auto_completed || false,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    log('upsertTaskLog', err);
  }
}

// ── User Settings ──────────────────────────────────────
export async function fetchUserSettings(userId) {
  try {
    const snap = await getDocs(userCol(userId, 'settings'));
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    return {
      theme: data.theme || 'dark',
      focusTimeToday: data.focus_time_today || 0,
      lastReset: data.last_reset || null,
    };
  } catch (err) {
    log('fetchUserSettings', err);
    return null;
  }
}

export async function upsertUserSettings(userId, settings) {
  try {
    await setDoc(userDoc(userId, 'settings', 'preferences'), {
      theme: settings.theme,
      focus_time_today: settings.focusTimeToday ?? 0,
      last_reset: settings.lastReset,
      updated_at: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    log('upsertUserSettings', err);
  }
}

// ── Notes ──────────────────────────────────────────────
export async function fetchNotes(userId) {
  try {
    const q = query(userCol(userId, 'notes'), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const n = d.data();
      return {
        id: d.id,
        title: n.title || '',
        content: n.content || '',
        tags: n.tags || [],
        color: n.color || '',
        pinned: n.pinned || false,
        created_at: n.created_at,
        updated_at: n.updated_at,
      };
    });
  } catch (err) {
    log('fetchNotes', err);
    return null;
  }
}

export async function upsertNote(userId, note) {
  try {
    await setDoc(userDoc(userId, 'notes', note.id), {
      title: note.title || '',
      content: note.content || '',
      tags: note.tags || [],
      color: note.color || '',
      pinned: note.pinned || false,
      created_at: note.created_at || new Date().toISOString(),
      updated_at: note.updated_at || new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    log('upsertNote', err);
  }
}

export async function deleteNoteDb(userId, noteId) {
  try {
    await deleteDoc(userDoc(userId, 'notes', noteId));
  } catch (err) {
    log('deleteNote', err);
  }
}

// ── XP Data ────────────────────────────────────────────
export async function fetchXpData(userId) {
  try {
    const snap = await getDocs(userCol(userId, 'xp'));
    if (snap.empty) return null;
    const data = snap.docs[0].data();
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
    };
  } catch (err) {
    log('fetchXpData', err);
    return null;
  }
}

export async function upsertXpData(userId, xpData) {
  try {
    await setDoc(userDoc(userId, 'xp', 'profile'), {
      total_xp: xpData.totalXP || 0,
      level: xpData.level || 1,
      earned_badges: xpData.earnedBadges || [],
      badge_unlock_dates: xpData.badgeUnlockDates || {},
      perfect_days: xpData.perfectDays || 0,
      comeback_count: xpData.comebackCount || 0,
      total_completions: xpData.totalCompletions || 0,
      last_xp_date: xpData.lastXPDate || '',
      xp_history: (xpData.xpHistory || []).slice(0, 50),
      updated_at: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    log('upsertXpData', err);
  }
}

// ── User Profile ───────────────────────────────────────
export async function upsertUserProfile(userId, profile) {
  try {
    await setDoc(doc(fireDb, 'users', userId), {
      display_name: profile.displayName || '',
      email: profile.email || '',
      photo_url: profile.photoURL || '',
      updated_at: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    log('upsertUserProfile', err);
  }
}
