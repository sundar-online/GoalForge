import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as db from '../lib/firebaseDb';
import { fireDb } from '../lib/firebase';
import { onSnapshot, query, collection, doc, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { TODAY, addDays, diffDays, parseLocalDate } from '../utils/dateUtils';
import {
  isGoalDoneToday,
  isTaskDone,
  isHabitDoneToday,
  calculateAccuracy,
  calculateDisciplineScore,
  getUserLevel,
  getInsights,
  calculateWeeklyReport,
  getSmartAlerts,
  isHabitScheduledToday,
  calculateStreakFromHistory,
  calculateGoalStreak,
  recalculateGoalCompletedDates,
  calculateConsecutiveMissedDays,
  calculateGoalConsecutiveMissedDays,
  getGoalScheduledDays,
  calculateOverallProgress,
  calculateProductiveStreak,
  getTaskTrackingKey,
  calculateTaskStreak,
  sanitizeAndValidateCompletedDates,
  logStreakDebug
} from '../utils/calculationUtils';
// ── Service modules (reset / analytics / recurring task orchestration) ────
import { shouldRunReset, computeHabitResetPayload, computeGoalResetPayload, computeTaskResetPayload } from '../utils/resetManager';
import { buildTaskLogSummary, hasTaskLogChanged } from '../utils/analyticsEngine';
import { getOrBuildRecDates, buildRecurringPayload, getRecId } from '../utils/recurringTaskEngine';

import { XP_SOURCES, getLevelFromXP, evaluateBadges, getNewlyEarnedBadges, getBadgeById } from '../utils/gamificationEngine';
import {
  scheduleLocalNotification,
  scheduleReminder,
  cancelReminder,
  scheduleEventReminder,
  cancelEventReminder,
  initNotificationChannel,
  setupNotificationListeners,
} from '../utils/notificationUtils';
import {
  analyzeUserBehavior,
  generateRecoveryStrategies,
  getSmartSuggestions
} from '../utils/aiAnalysisEngine';


const AppContext = createContext();

export const GoalsContext = createContext();
export const TasksContext = createContext();
export const FocusContext = createContext();
export const AIContext = createContext();
export const NotesContext = createContext();
export const GamificationContext = createContext();

const STORAGE_KEYS = {
  GOALS: 'goalforge_goals',
  TASKS: 'goalforge_tasks',
  LOGS: 'goalforge_logs',
  SETTINGS: 'goalforge_settings',
  NOTES: 'goalforge_notes',
  XP: 'goalforge_xp',
  MEMORIES: 'goalforge_memories',
  QUICK_THOUGHTS: 'goalforge_quick_thoughts',
  SCHEDULED_EVENTS: 'goalforge_scheduled_events'
};

const DEFAULT_XP_DATA = {
  totalXP: 0,
  level: 1,
  earnedBadges: [],
  badgeUnlockDates: {},
  perfectDays: 0,
  comebackCount: 0,
  totalCompletions: 0,
  lastXPDate: '',
  xpHistory: [],  // last 50 entries: { amount, reason, date }
  notifiedBadges: [],
};

const safeParse = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    return parsed !== null && parsed !== undefined ? parsed : fallback;
  } catch (e) {
    console.error(`[LocalStorage] Error parsing ${key}:`, e);
    return fallback;
  }
};

// ── Provider ──────────────────────────────────────────────
export const AppProvider = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);

  // Track deleted goal IDs locally and persistently to ensure instant sync/offline support
  const [deletedGoalIds, setDeletedGoalIds] = useState(() => {
    try {
      const saved = localStorage.getItem('gf_deleted_goal_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const deletedGoalIdsRef = useRef(deletedGoalIds);
  useEffect(() => {
    deletedGoalIdsRef.current = deletedGoalIds;
    localStorage.setItem('gf_deleted_goal_ids', JSON.stringify(deletedGoalIds));
  }, [deletedGoalIds]);

  // Track deleted habit IDs locally and persistently to ensure instant sync/offline support
  const [deletedHabitIds, setDeletedHabitIds] = useState(() => {
    try {
      const saved = localStorage.getItem('gf_deleted_habit_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const deletedHabitIdsRef = useRef(deletedHabitIds);
  useEffect(() => {
    deletedHabitIdsRef.current = deletedHabitIds;
    localStorage.setItem('gf_deleted_habit_ids', JSON.stringify(deletedHabitIds));
  }, [deletedHabitIds]);

  // Initial local state with deleted goals and habits filtered out
  const [goals, setGoals] = useState(() => {
    const rawGoals = safeParse(STORAGE_KEYS.GOALS, []);
    const saved = localStorage.getItem('gf_deleted_goal_ids');
    const parsedDeletedIds = saved ? JSON.parse(saved) : [];
    const savedHabits = localStorage.getItem('gf_deleted_habit_ids');
    const parsedDeletedHabitIds = savedHabits ? JSON.parse(savedHabits) : [];
    return rawGoals
      .filter(g => g && g.id && !parsedDeletedIds.includes(String(g.id)) && !g.deleted && !g.isDeleted)
      .map(g => ({
        ...g,
        habits: (g.habits || []).filter(h => h && h.id && !parsedDeletedHabitIds.includes(String(h.id)))
      }));
  });
  const [tasks, setTasks] = useState(() => safeParse(STORAGE_KEYS.TASKS, []));
  const [taskLogs, setTaskLogs] = useState(() => safeParse(STORAGE_KEYS.LOGS, {}));
  const [recurringHistory, setRecurringHistory] = useState(() => safeParse('gf_recurring_history', {}));
  const [notes, setNotes] = useState(() => safeParse(STORAGE_KEYS.NOTES, []));
  const [memories, setMemories] = useState(() => safeParse(STORAGE_KEYS.MEMORIES, []));
  const [quickThoughts, setQuickThoughts] = useState(() => safeParse(STORAGE_KEYS.QUICK_THOUGHTS, []));
  const [scheduledEvents, setScheduledEvents] = useState(() => safeParse(STORAGE_KEYS.SCHEDULED_EVENTS, []));

  const tasksRef = useRef([]);
  const notesRef = useRef([]);
  const goalsRef = useRef([]);
  const memoriesRef = useRef([]);
  const quickThoughtsRef = useRef([]);

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { goalsRef.current = goals; }, [goals]);
  useEffect(() => { memoriesRef.current = memories; }, [memories]);
  useEffect(() => { quickThoughtsRef.current = quickThoughts; }, [quickThoughts]);
  const habitsListeners = useRef({});
  const scheduledRemindersRef = useRef({});

  // Story Celebration Modal state
  const [completedGoalForCelebration, setCompletedGoalForCelebration] = useState(null);

  // Reactive completion detector to capture when a goal progress hits 100%
  const prevGoalsProgressRef = useRef({});
  useEffect(() => {
    if (loading) return;
    goals.forEach(goal => {
      const prevProgress = prevGoalsProgressRef.current[goal.id];
      const currentProgress = goal.progress || 0;

      // If progress newly transitions to 100%
      if (currentProgress === 100 && prevProgress !== undefined && prevProgress < 100) {
        // Trigger completion celebration modal!
        setCompletedGoalForCelebration(goal);
      }

      prevGoalsProgressRef.current[goal.id] = currentProgress;
    });
  }, [goals, loading]);

  // ── Notification Management: Syncing Reminders with Habit State ──
  useEffect(() => {
    if (loading || !goals) return;

    const currentHabitIds = new Set();

    goals.forEach(goal => {
      (goal.habits || []).forEach(habit => {
        currentHabitIds.add(String(habit.id));

        const config = {
          enabled: !!habit.reminderEnabled,
          time: habit.reminderTime || '08:00',
          days: JSON.stringify(habit.scheduleDays || [])
        };

        const lastConfigStr = scheduledRemindersRef.current[habit.id];
        const currentConfigStr = JSON.stringify(config);

        if (lastConfigStr !== currentConfigStr) {
          if (habit.reminderEnabled) {
            scheduleReminder(
              habit.id,
              `🔥 Habit: ${habit.title}`,
              `Goal: ${goal.title}`,
              habit.reminderTime || '08:00',
              habit.scheduleDays || []
            );
          } else {
            cancelReminder(habit.id);
          }
          scheduledRemindersRef.current[habit.id] = currentConfigStr;
        }
      });
    });

    // Cleanup orphaned reminders (deleted habits)
    Object.keys(scheduledRemindersRef.current).forEach(hid => {
      if (!currentHabitIds.has(String(hid))) {
        cancelReminder(hid);
        delete scheduledRemindersRef.current[hid];
      }
    });
  }, [goals, loading]);

  // Clean up deleted goals from progress ref
  useEffect(() => {
    if (loading || !goals) return;
    const currentGoalIds = new Set(goals.map(g => g.id));
    Object.keys(prevGoalsProgressRef.current).forEach(gId => {
      if (!currentGoalIds.has(gId)) {
        delete prevGoalsProgressRef.current[gId];
      }
    });
  }, [goals, loading]);

  const [xpData, setXpData] = useState(() => ({ ...DEFAULT_XP_DATA, ...safeParse(STORAGE_KEYS.XP, DEFAULT_XP_DATA) }));
  const lastSyncedXpRef = useRef(xpData.totalXP);
  const lastSavedSummaryRef = useRef(null);
  const [levelUpEvent, setLevelUpEvent] = useState(null);   // { level, title }
  const [badgeUnlockEvent, setBadgeUnlockEvent] = useState(null); // badge definition object
  // Queue to handle multiple badge unlocks in sequence
  const badgeQueueRef = useRef([]);

  // Settings - composite state
  const [settings, setSettings] = useState(() => safeParse(STORAGE_KEYS.SETTINGS, {
    theme: 'dark',
    focusTimeToday: 0,
    lastActiveDate: '',
    focusHistory: {},
    dismissedInsights: [],
    weeklyIntentions: {},
    lastPushDate: '',
    dailyResetProcessed: ''
  }));

  // AI Insights State
  const [aiInsights, setAiInsights] = useState([]);
  const [recoveryStrategies, setRecoveryStrategies] = useState([]);
  const [smartSuggestions, setSmartSuggestions] = useState(null);

  const theme = settings.theme || 'dark';
  const focusTime = settings.focusTimeToday || 0;
  const focusHistory = settings.focusHistory || {};

  // ── Gamification: XP Award Engine ───────────────────────
  const awardXP = useCallback((amount, reason) => {
    setXpData(prev => {
      const newTotal = prev.totalXP + amount;
      const prevLevelInfo = getLevelFromXP(prev.totalXP);
      const newLevelInfo = getLevelFromXP(newTotal);
      if (newLevelInfo.level > prevLevelInfo.level) {
        setLevelUpEvent({ level: newLevelInfo.level, title: newLevelInfo.title });
      }
      const entry = { amount, reason, date: new Date().toISOString() };
      const newHistory = [entry, ...(prev.xpHistory || [])].slice(0, 50);
      return { ...prev, totalXP: newTotal, level: newLevelInfo.level, xpHistory: newHistory };
    });
  }, []);

  const incrementCompletions = useCallback(() => {
    setXpData(prev => ({ ...prev, totalCompletions: (prev.totalCompletions || 0) + 1 }));
  }, []);

  const recordPerfectDay = useCallback(() => {
    setXpData(prev => ({ ...prev, perfectDays: (prev.perfectDays || 0) + 1 }));
  }, []);

  const recordComeback = useCallback(() => {
    setXpData(prev => ({ ...prev, comebackCount: (prev.comebackCount || 0) + 1 }));
  }, []);

  const awardFocusXP = useCallback(() => {
    awardXP(XP_SOURCES.FOCUS_SESSION, 'Focus session completed');
  }, [awardXP]);

  // ── Computed Metrics ─────────────────────────────────────
  const todayStr = TODAY();
  const todayTasks = useMemo(() => (tasks || []).filter(t => {
    const type = t.type || 'daily';
    if (type === 'daily') return true;
    if (type === 'single') return t.targetDate === todayStr || t.date === todayStr;
    if (type === 'range') return t.startDate <= todayStr && t.endDate >= todayStr;
    return false;
  }), [tasks, todayStr]);

  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => {
      if ((a.order ?? 1) !== (b.order ?? 1)) {
        return (a.order ?? 1) - (b.order ?? 1);
      }
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
  }, [goals]);

  const allHabits = useMemo(() => (sortedGoals || []).filter(g => !g.isMissingDream).flatMap(g => g.habits || []), [sortedGoals]);
  const todayGoals = useMemo(() => (sortedGoals || []).filter(g => {
    if (g.isMissingDream) return false;
    const habits = g.habits || [];
    if (habits.length === 0) return false;
    return habits.some(isHabitScheduledToday);
  }), [sortedGoals]);

  const goalsDone = useMemo(() => (todayGoals || []).filter(g => isGoalDoneToday(g)).length, [todayGoals]);
  const tasksDone = useMemo(() => (todayTasks || []).filter(t => isTaskDone(t)).length, [todayTasks]);

  const todayHabits = useMemo(() => {
    return (sortedGoals || [])
      .filter(g => !g.isMissingDream)
      .flatMap(g => g.habits || [])
      .filter(isHabitScheduledToday);
  }, [sortedGoals]);

  const completedTodayHabitsCount = useMemo(() => {
    return todayHabits.filter(isHabitDoneToday).length;
  }, [todayHabits]);

  const totalItems = todayHabits.length;
  const completedItems = completedTodayHabitsCount;

  const accuracy = useMemo(() => {
    if (totalItems === 0) return 100;
    return Math.round((completedItems / totalItems) * 100);
  }, [completedItems, totalItems]);

  const avgStreak = useMemo(() => {
    const activeGoals = (sortedGoals || []).filter(g => !g.isMissingDream);
    if (activeGoals.length === 0) return 0;
    const totalBestStreaks = activeGoals.reduce((acc, goal) => {
      const habits = goal.habits || [];
      const bestHabitStreak = habits.length === 0 ? 0 : Math.max(0, ...habits.map(h => h.streak || 0));
      return acc + bestHabitStreak;
    }, 0);
    return totalBestStreaks / activeGoals.length;
  }, [sortedGoals]);

  const disciplineScore = calculateDisciplineScore(accuracy, avgStreak, focusTime);
  const userLevel = getUserLevel(disciplineScore);

  const weeklyReport = useMemo(() => calculateWeeklyReport(taskLogs), [taskLogs]);

  const taskStreak = useMemo(() => {
    const { currentStreak } = calculateProductiveStreak(taskLogs);
    return currentStreak;
  }, [taskLogs]);

  const smartAlerts = useMemo(() =>
    getSmartAlerts(accuracy, sortedGoals, tasks, weeklyReport, settings.dismissedInsights || []),
    [accuracy, sortedGoals, tasks, weeklyReport, settings.dismissedInsights]
  );

  const alerts = useMemo(() => {
    return [...smartAlerts];
  }, [smartAlerts]);

  // ── Firebase Initial Load ────────────────────────────────
  // -- Local Persistence Effects --
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(taskLogs)); }, [taskLogs]);
  useEffect(() => { localStorage.setItem('gf_recurring_history', JSON.stringify(recurringHistory)); }, [recurringHistory]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.XP, JSON.stringify(xpData)); }, [xpData]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.QUICK_THOUGHTS, JSON.stringify(quickThoughts)); }, [quickThoughts]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SCHEDULED_EVENTS, JSON.stringify(scheduledEvents)); }, [scheduledEvents]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  }, [settings]);

  // ── Firebase Real-time Subscription Model ─────────────────
  const isInitialTasksLoad = useRef(true);
  const isInitialNotesLoad = useRef(true);
  const isInitialGoalsLoad = useRef(true);
  const isInitialQuickThoughtsLoad = useRef(true);

  // Expose syncFromCloud as connection verification & trigger
  const syncFromCloud = async () => {
    if (!user) {
      console.warn('[Realtime Sync] Cannot run verification; no user is logged in.');
      return;
    }
    console.log('[Realtime Sync] Initiating manual Firestore connection verification...');
    const result = await db.testFirestoreWrite(user.id);
    if (result.success) {
      console.log('%c[Realtime Sync] ✓ Manual sync verification successful.', 'color: #22c55e; font-weight: bold;');
      setSyncError(null);
    } else {
      console.error('[Realtime Sync] ✗ Manual sync verification failed:', result.error);
      setSyncError('Sync connection failed. Retrying in background.');
    }
  };

  // ── One-time boot: initialize notification channel & listeners ──────────────
  useEffect(() => {
    // Run once on mount — sets up the Android notification channel (goalforge-reminders)
    // with sound, vibration, and high importance, then attaches event listeners.
    initNotificationChannel();
    setupNotificationListeners();
  }, []);

  // Reconnect listener to sync automatic retries when network transitions back to online
  useEffect(() => {
    if (!user) return;

    // Automatically verify connection on user change or login
    syncFromCloud();

    const cleanupReconnect = db.enableNetworkReconnectSync(() => {
      syncFromCloud();
    });

    return () => {
      cleanupReconnect();
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setGoals([]);
      setTasks([]);
      setTaskLogs({});
      setRecurringHistory({});
      setNotes([]);
      setMemories([]);
      setQuickThoughts([]);
      setScheduledEvents([]);
      setXpData(DEFAULT_XP_DATA);
      setSettings({
        theme: 'dark',
        focusTimeToday: 0,
        lastActiveDate: '',
        focusHistory: {},
        dismissedInsights: [],
        weeklyIntentions: {},
        lastPushDate: '',
        dailyResetProcessed: ''
      });
      setAiInsights([]);
      setRecoveryStrategies([]);
      setSmartSuggestions(null);
      setDeletedGoalIds([]);
      setDeletedHabitIds([]);

      // Clear local storage keys on user logout to prevent data leakage between sessions
      localStorage.removeItem(STORAGE_KEYS.GOALS);
      localStorage.removeItem(STORAGE_KEYS.TASKS);
      localStorage.removeItem(STORAGE_KEYS.LOGS);
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      localStorage.removeItem(STORAGE_KEYS.NOTES);
      localStorage.removeItem(STORAGE_KEYS.XP);
      localStorage.removeItem(STORAGE_KEYS.MEMORIES);
      localStorage.removeItem(STORAGE_KEYS.QUICK_THOUGHTS);
      localStorage.removeItem('gf_recurring_history');
      localStorage.removeItem('gf_deleted_goal_ids');
      localStorage.removeItem('gf_deleted_habit_ids');

      setLoading(false);
      return;
    }

    // Reset states to default to prevent stale previous user's data rendering during new load
    setGoals([]);
    setTasks([]);
    setTaskLogs({});
    setRecurringHistory({});
    setNotes([]);
    setMemories([]);
    setQuickThoughts([]);
    setScheduledEvents([]);
    setXpData(DEFAULT_XP_DATA);
    setSettings({
      theme: 'dark',
      focusTimeToday: 0,
      lastActiveDate: '',
      focusHistory: {},
      dismissedInsights: [],
      weeklyIntentions: {},
      lastPushDate: '',
      dailyResetProcessed: ''
    });
    setAiInsights([]);
    setRecoveryStrategies([]);
    setSmartSuggestions(null);
    setDeletedGoalIds([]);
    setDeletedHabitIds([]);

    setLoading(true);
    setSyncError(null);

    // Safety timeout — if Firestore subscriptions all fail silently,
    // force the dashboard to render after 15 seconds max
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
      console.warn('[AppContext] Safety timeout: forcing loading=false after 15s');
    }, 15000);

    const unsubscribes = [];

    try {
      // 1. Subscribe to Tasks Collection
      const tasksQuery = query(collection(fireDb, 'users', user.id, 'tasks'), orderBy('created_at', 'desc'));
      const unsubTasks = onSnapshot(tasksQuery, { includeMetadataChanges: true }, (snapshot) => {
        const updatedTasks = snapshot.docs.map(doc => {
          const t = doc.data();
          db.updateCache(`users/${user.id}/tasks/${doc.id}`, t);
          const rawDates = t.completed_dates || [];
          const { sanitizedDates } = sanitizeAndValidateCompletedDates(rawDates, t.created_at, doc.id, t.title, t.current_streak);
          const { current: currentStreak, best: bestStreak } = calculateTaskStreak(sanitizedDates);
          return {
            id: doc.id,
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
            completedDates: sanitizedDates,
            missedDays: t.missed_days ?? 0,
            lastCompletedDate: t.last_completed_date || null,
            lastActiveDate: t.last_active_date || null,
            priority: t.priority ?? 'Medium',
            targetCount: t.target_count ?? 10,
            currentCount: t.current_count ?? 0,
            isRecovering: t.is_recovering ?? false,
            originalTarget: t.original_target || null,
            createdAt: t.created_at,
            syncPending: doc.metadata.hasPendingWrites,
          };
        });

        if (!isInitialTasksLoad.current) {
          // Identify tasks added from other devices
          const prevIds = new Set(tasksRef.current.map(t => t.id));
          const newlySynced = updatedTasks.filter(t => !prevIds.has(t.id));
          if (newlySynced.length > 0) {
            newlySynced.forEach(t => {
              scheduleLocalNotification("📝 New Task Added", {
                body: `"${t.title}" was added from another device.`,
              });
            });
          }
        } else {
          isInitialTasksLoad.current = false;
        }

        setTasks(updatedTasks);
        clearTimeout(loadingTimeout);
        setLoading(false);
      }, (error) => {
        console.error('[Realtime Sync] Error in Tasks subscription:', error);
        setSyncError('Real-time task synchronization paused.');
        setLoading(false); // Ensure dashboard shows even if Tasks subscription fails
      });
      unsubscribes.push(unsubTasks);

      // 2. Subscribe to Notes Collection
      const notesQuery = collection(fireDb, 'users', user.id, 'notes');
      const unsubNotes = onSnapshot(notesQuery, { includeMetadataChanges: true }, (snapshot) => {
        const updatedNotes = snapshot.docs.map(doc => {
          const n = doc.data();
          db.updateCache(`users/${user.id}/notes/${doc.id}`, n);
          return {
            id: doc.id,
            title: n.title || '',
            content: n.content || '',
            tags: n.tags || [],
            color: n.color || '',
            checklist: n.checklist || null,
            pinned: n.pinned || false,
            folder: n.folder || '',
            created_at: n.created_at || n.createdAt || new Date().toISOString(),
            updated_at: n.updated_at || n.updatedAt || n.created_at || new Date().toISOString(),
            syncPending: doc.metadata.hasPendingWrites,
          };
        });

        // Sort in memory by created_at desc (or fallbacks)
        updatedNotes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (!isInitialNotesLoad.current) {
          const prevIds = new Set(notesRef.current.map(n => n.id));
          const newlySynced = updatedNotes.filter(n => !prevIds.has(n.id));
          if (newlySynced.length > 0) {
            newlySynced.forEach(n => {
              scheduleLocalNotification("📓 New Note Added", {
                body: `"${n.title || 'Untitled'}" was synchronized from the cloud.`,
              });
            });
          }
        } else {
          isInitialNotesLoad.current = false;
        }

        setNotes(updatedNotes);
      }, (error) => {
        console.error('[Realtime Sync] Error in Notes subscription:', error);
      });
      unsubscribes.push(unsubNotes);

      // X. Subscribe to Quick Thoughts Collection
      const qtQuery = query(collection(fireDb, 'users', user.id, 'quick_thoughts'), orderBy('updated_at', 'desc'));
      const unsubQt = onSnapshot(qtQuery, { includeMetadataChanges: true }, (snapshot) => {
        const updatedQt = snapshot.docs.map(doc => {
          const data = doc.data();
          db.updateCache(`users/${user.id}/quick_thoughts/${doc.id}`, data);
          return {
            id: doc.id,
            content: data.content || '',
            emoji: data.emoji || '',
            created_at: data.created_at,
            updated_at: data.updated_at,
            syncPending: doc.metadata.hasPendingWrites,
          };
        });

        if (!isInitialQuickThoughtsLoad.current) {
          const prevIds = new Set(quickThoughtsRef.current.map(q => q.id));
          const newlySynced = updatedQt.filter(q => !prevIds.has(q.id));
          if (newlySynced.length > 0) {
            scheduleLocalNotification("💭 Thoughts Updated", {
              body: "Your quick thoughts have been updated on another device.",
            });
          }
        } else {
          isInitialQuickThoughtsLoad.current = false;
        }

        setQuickThoughts(updatedQt);
      }, (error) => {
        console.error('[Realtime Sync] Error in Quick Thoughts subscription:', error);
      });
      unsubscribes.push(unsubQt);

      // 3. Subscribe to Goals with Reactive Habits Listener
      const goalsQuery = query(collection(fireDb, 'users', user.id, 'goals'), orderBy('created_at', 'desc'));
      const unsubGoals = onSnapshot(goalsQuery, { includeMetadataChanges: true }, (snapshot) => {
        const goalsList = snapshot.docs.map(docSnap => {
          const g = docSnap.data();
          db.updateCache(`users/${user.id}/goals/${docSnap.id}`, g);
          if (g.deleted || g.isDeleted || deletedGoalIdsRef.current.includes(String(docSnap.id))) {
            return null;
          }
          let orderVal = g.order;
          if (orderVal === undefined || orderVal === null) {
            const p = (g.priority || '').toLowerCase();
            if (p === 'high') orderVal = 1;
            else if (p === 'medium') orderVal = 2;
            else if (p === 'low') orderVal = 3;
            else orderVal = 4;
          }
          return {
            id: docSnap.id,
            title: g.title,
            description: g.description ?? '',
            mode: g.mode ?? 'ALL',
            minHabits: g.min_habits ?? 1,
            tag: g.tag ?? 'General',
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
            order: orderVal,
            isFocusGoal: g.is_focus_goal ?? false,
            status: g.status ?? 'active',
            dependencies: g.dependencies || [],
            syncPending: docSnap.metadata.hasPendingWrites,
            habits: [] // Will be populated in real-time by nested listeners below
          };
        }).filter(Boolean);

        // Push new goals notifications
        if (!isInitialGoalsLoad.current) {
          const prevIds = new Set(goalsRef.current.map(g => g.id));
          const newlySynced = goalsList.filter(g => !prevIds.has(g.id));
          if (newlySynced.length > 0) {
            newlySynced.forEach(g => {
              scheduleLocalNotification("🎯 New Goal Sync", {
                body: `"${g.title}" has been synchronized across devices.`,
              });
            });
          }
        } else {
          isInitialGoalsLoad.current = false;
        }

        // Initialize or merge goals preservation in state
        setGoals(prev => {
          return goalsList.map(g => {
            const existing = prev.find(p => p.id === g.id);
            if (!existing) return { ...g, habits: [] };

            if (g.syncPending) {
              return {
                ...g,
                ...existing,
                habits: existing.habits || [],
                syncPending: true
              };
            }
            return {
              ...g,
              habits: existing.habits || []
            };
          });
        });

        // Initialize/verify active habits sub-collection listeners for each goal
        goalsList.forEach(goal => {
          if (!habitsListeners.current[goal.id]) {
            const habitsQuery = query(collection(fireDb, 'users', user.id, 'goals', goal.id, 'habits'));
            const unsubHabit = onSnapshot(habitsQuery, { includeMetadataChanges: true }, (habitsSnapshot) => {
              const habitsList = habitsSnapshot.docs.map(hDoc => {
                if (deletedHabitIdsRef.current.includes(String(hDoc.id))) {
                  return null;
                }
                const hd = hDoc.data();
                db.updateCache(`users/${user.id}/goals/${goal.id}/habits/${hDoc.id}`, hd);
                return {
                  id: hDoc.id,
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
                  isRecovering: hd.is_recovering ?? false,
                  originalTarget: hd.original_target || null,
                  createdAt: hd.created_at || hd.updated_at || new Date().toISOString(),
                  updated_at: hd.updated_at || null,
                  syncPending: hDoc.metadata.hasPendingWrites,
                };
              }).filter(Boolean);

              // Merge these habits instantly into their goal's state
              setGoals(prev => prev.map(g => {
                if (g.id === goal.id) {
                  // Guard: Prevent initial empty snapshot from wiping out staged habits during creation/sync
                  if (habitsList.length === 0 && g.habits && g.habits.length > 0) {
                    if (g.syncPending || habitsSnapshot.metadata.hasPendingWrites || habitsSnapshot.metadata.fromCache) {
                      return g;
                    }
                  }

                  const localHabits = g.habits || [];
                  const merged = [];
                  const snapMap = new Map(habitsList.map(h => [String(h.id), h]));
                  const processedIds = new Set();

                  for (const lh of localHabits) {
                    const lId = String(lh.id);
                    if (deletedHabitIdsRef.current.includes(lId)) {
                      continue;
                    }
                    const sh = snapMap.get(lId);

                    if (!sh) {
                      if (lh.syncPending) {
                        merged.push(lh);
                        processedIds.add(lId);
                      }
                      continue;
                    }

                    processedIds.add(lId);

                    if (sh.syncPending) {
                      merged.push({
                        ...sh,
                        ...lh,
                        syncPending: true
                      });
                    } else {
                      merged.push(sh);
                    }
                  }

                  for (const sh of habitsList) {
                    const sId = String(sh.id);
                    if (!processedIds.has(sId)) {
                      merged.push(sh);
                    }
                  }

                  return {
                    ...g,
                    habits: merged
                  };
                }
                return g;
              }));
            }, (error) => {
              console.error(`[Realtime Sync] Error in nested habits subscription for goal ${goal.id}:`, error);
            });

            habitsListeners.current[goal.id] = unsubHabit;
          }
        });

        // Clean up listeners for any goals that have been deleted
        const activeGoalIds = new Set(goalsList.map(g => g.id));
        Object.keys(habitsListeners.current).forEach(gId => {
          if (!activeGoalIds.has(gId) || deletedGoalIdsRef.current.includes(String(gId))) {
            if (habitsListeners.current[gId]) {
              habitsListeners.current[gId](); // Unsubscribe
            }
            delete habitsListeners.current[gId];
          }
        });

      }, (error) => {
        console.error('[Realtime Sync] Error in Goals subscription:', error);
      });
      unsubscribes.push(unsubGoals);

      // 4. Subscribe to Task Logs Collection
      const logsQuery = query(collection(fireDb, 'users', user.id, 'task_logs'), orderBy('date', 'desc'));
      const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
        const logs = {};
        snapshot.docs.forEach(doc => {
          const row = doc.data();
          db.updateCache(`users/${user.id}/task_logs/${doc.id}`, row);
          logs[row.date] = {
            date: row.date,
            total_tasks: row.total_tasks || 0,
            completed_tasks: row.completed_tasks || 0,
            time_spent: row.time_spent || 0,
            auto_completed: row.auto_completed || false,
          };
        });
        setTaskLogs(logs);
      }, (error) => {
        console.error('[Realtime Sync] Error in Task Logs subscription:', error);
      });
      unsubscribes.push(unsubLogs);

      // X. Subscribe to Recurring Task History
      const recQuery = collection(fireDb, 'users', user.id, 'recurring_task_history');
      const unsubRec = onSnapshot(recQuery, (snapshot) => {
        const history = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          db.updateCache(`users/${user.id}/recurring_task_history/${doc.id}`, data);
          const rawDates = data.completed_dates || data.completedDates || [];
          const { sanitizedDates } = sanitizeAndValidateCompletedDates(rawDates, null, doc.id, data.title, data.streak);
          const { current: currentStreak, best: bestStreak } = calculateTaskStreak(sanitizedDates);
          history[doc.id] = {
            id: doc.id,
            completedDates: sanitizedDates,
            title: data.title || '',
            type: data.type || 'daily',
            streak: currentStreak,
            bestStreak: bestStreak,
          };
        });
        setRecurringHistory(history);
      }, (error) => {
        console.error('[Realtime Sync] Error in Recurring Task History subscription:', error);
      });
      unsubscribes.push(unsubRec);

      // 5. Subscribe to Focus History Collection
      const focusQuery = collection(fireDb, 'users', user.id, 'focus_history');
      const unsubFocus = onSnapshot(focusQuery, (snapshot) => {
        const history = {};
        snapshot.docs.forEach(doc => {
          const fd = doc.data();
          db.updateCache(`users/${user.id}/focus_history/${doc.id}`, fd);
          history[doc.id] = fd.seconds;
        });
        setSettings(prev => ({ ...prev, focusHistory: history }));
      }, (error) => {
        console.error('[Realtime Sync] Error in Focus History subscription:', error);
      });
      unsubscribes.push(unsubFocus);

      // 6. Subscribe to User Settings document
      const settingsDocRef = doc(fireDb, 'users', user.id, 'settings', 'preferences');
      const unsubSettings = onSnapshot(settingsDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const s = docSnap.data();
          db.updateCache(`users/${user.id}/settings/preferences`, s);
          setSettings(prev => ({
            ...prev,
            theme: s.theme || prev.theme,
            focusTimeToday: s.focus_time_today || prev.focusTimeToday,
            lastActiveDate: s.last_reset || prev.lastActiveDate,
            dailyResetProcessed: s.daily_reset_processed || prev.dailyResetProcessed,
          }));
        } else {
          // New user has no preferences in DB yet, initialize local settings state to safe default values
          setSettings({
            theme: 'dark',
            focusTimeToday: 0,
            lastActiveDate: '',
            focusHistory: {},
            dismissedInsights: [],
            weeklyIntentions: {},
            lastPushDate: '',
            dailyResetProcessed: ''
          });
        }
      }, (error) => {
        console.error('[Realtime Sync] Error in Settings subscription:', error);
      });
      unsubscribes.push(unsubSettings);

      // 7. Subscribe to XP profile
      const xpDocRef = doc(fireDb, 'users', user.id, 'xp', 'profile');
      const unsubXp = onSnapshot(xpDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const x = docSnap.data();
          db.updateCache(`users/${user.id}/xp/profile`, x);
          const serverXP = x.total_xp || 0;
          lastSyncedXpRef.current = serverXP; // Shield against echo write loops
          const profile = {
            totalXP: serverXP,
            level: x.level || 1,
            earnedBadges: x.earned_badges || [],
            badgeUnlockDates: x.badge_unlock_dates || {},
            perfectDays: x.perfect_days || 0,
            comebackCount: x.comeback_count || 0,
            totalCompletions: x.total_completions || 0,
            lastXPDate: x.last_xp_date || '',
            xpHistory: x.xp_history || [],
            notifiedBadges: x.notified_badges || [],
          };
          console.log("Current UID:", user.id);
          console.log("Loaded Profile:", profile);
          console.log("Profile Source:", docSnap.metadata.fromCache ? "Local Cache" : "Server");
          console.log("XP:", profile.totalXP);
          console.log("Level:", profile.level);
          setXpData(profile);
        } else {
          // Document does not exist in DB yet (brand-new user), initialize local state to zero
          const defaultProfile = {
            totalXP: 0,
            level: 1,
            earnedBadges: [],
            badgeUnlockDates: {},
            perfectDays: 0,
            comebackCount: 0,
            totalCompletions: 0,
            lastXPDate: '',
            xpHistory: [],
            notifiedBadges: [],
          };
          console.log("Current UID:", user.id);
          console.log("Loaded Profile:", defaultProfile);
          console.log("Profile Source:", "None (Initializing Defaults)");
          console.log("XP:", defaultProfile.totalXP);
          console.log("Level:", defaultProfile.level);
          setXpData(defaultProfile);
        }
      }, (error) => {
        console.error('[Realtime Sync] Error in XP subscription:', error);
      });
      unsubscribes.push(unsubXp);

      // 8.5 Subscribe to Scheduled Events Collection
      const eventsQuery = query(collection(fireDb, 'users', user.id, 'scheduled_events'), orderBy('date', 'asc'));
      const unsubEvents = onSnapshot(eventsQuery, { includeMetadataChanges: true }, (snapshot) => {
        const updatedEvents = snapshot.docs.map(docSnap => {
          const e = docSnap.data();
          db.updateCache(`users/${user.id}/scheduled_events/${docSnap.id}`, e);
          return {
            id: docSnap.id,
            title: e.title || '',
            description: e.description || '',
            date: e.date || '',
            time: e.time || '',
            category: e.category || 'general',
            color: e.color || 'blue',
            reminderEnabled: e.reminder_enabled ?? false,
            reminderMinutes: e.reminder_minutes ?? 30,
            linkedGoalId: e.linked_goal_id || null,
            completed: e.completed ?? false,
            createdAt: e.created_at || new Date().toISOString(),
            syncPending: docSnap.metadata.hasPendingWrites,
          };
        });
        setScheduledEvents(updatedEvents);
      }, (error) => {
        console.error('[Realtime Sync] Error in Scheduled Events subscription:', error);
      });
      unsubscribes.push(unsubEvents);

      // 8. Subscribe to Memories Collection
      const memoriesQuery = query(collection(fireDb, 'users', user.id, 'memories'), orderBy('createdAt', 'desc'));
      const unsubMemories = onSnapshot(memoriesQuery, { includeMetadataChanges: true }, (snapshot) => {
        const updatedMemories = snapshot.docs.map(doc => {
          const m = doc.data();
          db.updateCache(`users/${user.id}/memories/${doc.id}`, m);
          return {
            id: doc.id,
            goalId: m.goalId || '',
            title: m.title || '',
            completionDate: m.completionDate || '',
            streak: m.streak || 0,
            consistency: m.consistency || 100,
            userNote: m.userNote || '',
            userPhoto: m.userPhoto || '',
            achievementStats: m.achievementStats || {},
            createdAt: m.createdAt || '',
            syncPending: doc.metadata.hasPendingWrites,
          };
        });

        setMemories(updatedMemories);
        localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(updatedMemories));
      }, (error) => {
        console.error('[Realtime Sync] Error in Memories subscription:', error);
      });
      unsubscribes.push(unsubMemories);

    } catch (err) {
      console.error('[Realtime Sync] Error mounting realtime listeners:', err);
      setSyncError('Offline-first fallback active.');
      clearTimeout(loadingTimeout);
      setLoading(false);
    }

    return () => {
      clearTimeout(loadingTimeout);
      unsubscribes.forEach(unsub => unsub());
      Object.values(habitsListeners.current).forEach(unsub => unsub());
      habitsListeners.current = {};
    };
  }, [user]);

  const [currentDate, setCurrentDate] = useState(TODAY());

  useEffect(() => {
    const itv = setInterval(() => {
      const now = TODAY();
      if (now !== currentDate) setCurrentDate(now);

      // ── Smart Notifications (Local Push) ──
      const dateObj = new Date();
      const hours = dateObj.getHours();
      const mins = dateObj.getMinutes();

      // Trigger evening reminder at 8:00 PM if accuracy is < 100 and haven't pushed today
      if (hours === 20 && mins === 0 && accuracy < 100) {
        if (settings.lastPushDate !== now) {
          scheduleLocalNotification("GoalForge Evening Review", {
            body: `You still have pending tasks/habits today. Your accuracy is ${accuracy}%. Finish strong!`,
          });
          setSettings(prev => ({ ...prev, lastPushDate: now }));
          if (user) db.upsertUserSettings(user.id, { ...settings, lastPushDate: now });
        }
      }
    }, 60000);
    return () => clearInterval(itv);
  }, [currentDate, accuracy, settings, user]);

  const toggleTheme = () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    setSettings(prev => ({ ...prev, theme: newTheme }));
    if (user) db.upsertUserSettings(user.id, { theme: newTheme, focusTimeToday: focusTime, lastReset: settings.lastActiveDate });
  };

  // ── Stable refs for daily reset to avoid stale closure deps ──
  const settingsRef = useRef(settings);
  const recurringHistoryRef = useRef(recurringHistory);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { recurringHistoryRef.current = recurringHistory; }, [recurringHistory]);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    const todayStr = currentDate;
    const yesterdayStr = addDays(todayStr, -1);
    const currentSettings = settingsRef.current;
    const currentTasks = tasksRef.current;
    const currentGoals = goalsRef.current;
    const currentRecurringHistory = recurringHistoryRef.current;

    // ── Delegate: shouldRunReset handles idempotency guard + need detection ──
    const { hasSettingsNeed, hasTaskNeed, hasHabitNeed, needsReset } =
      shouldRunReset(currentSettings, currentTasks, currentGoals, todayStr);

    if (!needsReset) return;

    console.log('[Daily Reset] Reset sequence triggered todayStr:', todayStr,
      'SettingsNeed:', hasSettingsNeed, 'TaskNeed:', hasTaskNeed, 'HabitNeed:', hasHabitNeed);

    // 1. Settings reset — also stamps dailyResetProcessed immediately
    if (hasSettingsNeed) {
      setSettings(prev => ({
        ...prev,
        focusTimeToday: 0,
        lastActiveDate: todayStr,
        dailyResetProcessed: todayStr,
      }));
      db.upsertUserSettings(user.id, {
        theme,
        focusTimeToday: 0,
        lastReset: todayStr,
        dailyResetProcessed: todayStr,
      });
    }

    // 2. Goals / habits reset
    if (hasHabitNeed) {
      const fallbackLastActive = currentSettings.lastActiveDate || yesterdayStr;
      setGoals(prevGoals => prevGoals.map(goal => {
        let goalNeedsUpdate = false;
        const updatedHabits = (goal.habits || []).map(h => {
          const result = computeHabitResetPayload(h, goal, todayStr, fallbackLastActive);
          if (!result) return h; // already reset for today
          goalNeedsUpdate = true;
          db.upsertHabit(user.id, goal.id, result.finalHabit);
          return result.finalHabit;
        });

        if (!goalNeedsUpdate) return goal;

        const { finalGoal } = computeGoalResetPayload(goal, updatedHabits, todayStr);
        db.upsertGoal(user.id, finalGoal);
        return finalGoal;
      }));
    }

    // 3. Daily tasks reset
    if (hasTaskNeed) {
      const fallbackLastActive = currentSettings.lastActiveDate || yesterdayStr;
      setTasks(prevTasks => prevTasks.map(t => {
        const result = computeTaskResetPayload(t, todayStr, fallbackLastActive, currentRecurringHistory);
        if (!result) return t; // non-daily or already reset
        const { finalTask, recId, recPayload } = result;
        setRecurringHistory(prev => ({ ...prev, [recId]: { id: recId, ...recPayload } }));
        db.upsertRecurringHistory(user.id, recId, recPayload);
        db.upsertTask(user.id, finalTask);
        return finalTask;
      }));
    }

    // 4. Backstop stamp for task/habit-only reset days (!hasSettingsNeed)
    if (!hasSettingsNeed) {
      setSettings(prev => ({ ...prev, dailyResetProcessed: todayStr }));
      db.upsertUserSettings(user.id, {
        theme: currentSettings.theme,
        focusTimeToday: currentSettings.focusTimeToday,
        lastReset: currentSettings.lastActiveDate,
        dailyResetProcessed: todayStr,
      });
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, currentDate]);


  // ── Automatic Daily Summary Sync ─────────────────────────
  useEffect(() => {
    if (loading || !user) return;
    const today = TODAY();

    // Delegate to analyticsEngine — pure computation, no side effects
    const summary = buildTaskLogSummary(tasks, allHabits, today);

    if (hasTaskLogChanged(lastSavedSummaryRef.current, summary)) {
      lastSavedSummaryRef.current = summary;
      setTaskLogs(prev => ({ ...prev, [today]: summary }));
      db.upsertTaskLog(user.id, summary).catch(err => {
        console.error('[Realtime Sync] Failed to upsert task log summary:', err);
      });
    }
  }, [tasks, allHabits, loading, user]);


  // ── AI Analysis Effect (Offloaded to Web Worker) ───────────────────────────────────
  const [workerReady, setWorkerReady] = useState(false);
  const aiWorkerRef = useRef(null);
  const lastAiHashRef = useRef('');

  useEffect(() => {
    // Initialize Web Worker for background AI processing
    const worker = new Worker(new URL('../workers/aiWorker.js', import.meta.url), { type: 'module' });
    aiWorkerRef.current = worker;

    worker.onmessage = (e) => {
      if (e.data.type === 'SUCCESS') {
        const { insights, strategies, suggestion } = e.data.payload;
        setAiInsights(insights);
        setRecoveryStrategies(strategies);
        setSmartSuggestions(suggestion);
      } else {
        console.error('[AI Worker Error]', e.data.error);
      }
    };

    setWorkerReady(true);

    return () => {
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    if (loading || !workerReady || !aiWorkerRef.current) return;

    const timer = setTimeout(() => {
      // Intelligent Caching: Create a lightweight hash to prevent redundant background recalculations
      const goalsHash = goals.map(g => `${g.id}_${(g.habits || []).map(h => `${h.id}_${h.isRecovering}_${(h.completedDates || []).length}_${h.missedDays}_${h.targetCount || h.targetTime}_${h.lastCompletedDate}`).join(',')}`).join('|');
      const tasksHash = tasks.map(t => `${t.id}_${t.completed}_${t.isRecovering}_${t.currentCount || t.targetCount}`).join('|');
      const dismissedCount = (settings.dismissedInsights || []).length;
      const logCount = Object.keys(taskLogs).length;

      const currentHash = `${goalsHash}_${tasksHash}_${logCount}_${focusTime}_${accuracy}_${dismissedCount}`;

      if (lastAiHashRef.current !== currentHash) {
        lastAiHashRef.current = currentHash;
        // Offload heavy data processing to the background worker thread
        aiWorkerRef.current.postMessage({
          goals,
          tasks,
          taskLogs,
          focusTime,
          accuracy,
          dismissedInsights: settings.dismissedInsights || [],
          dateStr: TODAY()
        });
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [goals, tasks, taskLogs, focusTime, accuracy, settings.dismissedInsights, loading, workerReady]);

  const dismissInsight = (id) => {
    // Store with today's date so it auto-resets the next day
    const todayKey = TODAY();
    const stampedId = id.includes('__') ? id : `${id}__${todayKey}`;
    setSettings(prev => ({
      ...prev,
      // Keep only last 30 dismissals to avoid bloat
      dismissedInsights: [...(prev.dismissedInsights || []).slice(-29), stampedId]
    }));
  };

  // ── Notification Reminder Synchronization ──────────────────────────────────────────
  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(async () => {
      // 1. Sync Task Reminders
      tasks.forEach(task => {
        if (task.reminderEnabled && task.reminderTime) {
          scheduleReminder(
            task.id,
            task.title,
            `Daily Task: ${task.title}`,
            task.reminderTime
          );
        } else {
          cancelReminder(task.id);
        }
      });

      // 2. Sync Habit Reminders
      goals.forEach(goal => {
        (goal.habits || []).forEach(habit => {
          if (habit.reminderEnabled && habit.reminderTime) {
            scheduleReminder(
              habit.id,
              habit.title,
              `Habit: ${habit.title}`,
              habit.reminderTime
            );
          } else {
            cancelReminder(habit.id);
          }
        });
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, [goals, tasks, loading]);


  const applyRecoveryPlan = (plan, strategyId) => {
    if (plan.isHabit) {
      let alreadyRecovering = false;
      const targetGoal = goals.find(g => g.id === plan.parentId);
      if (targetGoal) {
        const targetHabit = (targetGoal.habits || []).find(h => h.id === plan.itemId);
        if (targetHabit && targetHabit.isRecovering) {
          alreadyRecovering = true;
        }
      }
      if (alreadyRecovering) {
        if (strategyId) dismissInsight(strategyId);
        return;
      }

      setGoals(prev => prev.map(g => {
        if (g.id === plan.parentId) {
          const updatedHabits = g.habits.map(h => {
            if (h.id === plan.itemId) {
              const updatedH = {
                ...h,
                [plan.type === 'count' ? 'targetCount' : 'targetTime']: plan.newTarget,
                isRecovering: true,
                originalTarget: plan.originalTarget
              };
              if (user) db.upsertHabit(user.id, g.id, updatedH);
              return updatedH;
            }
            return h;
          });
          return { ...g, habits: updatedHabits };
        }
        return g;
      }));
    } else {
      let alreadyRecovering = false;
      const targetTask = tasks.find(t => t.id === plan.itemId);
      if (targetTask && targetTask.isRecovering) {
        alreadyRecovering = true;
      }
      if (alreadyRecovering) {
        if (strategyId) dismissInsight(strategyId);
        return;
      }

      setTasks(prev => prev.map(t => {
        if (t.id === plan.itemId) {
          const updatedT = {
            ...t,
            [plan.type === 'count' ? 'targetCount' : 'targetTime']: plan.newTarget,
            isRecovering: true,
            originalTarget: plan.originalTarget
          };
          if (user) db.upsertTask(user.id, updatedT);
          return updatedT;
        }
        return t;
      }));
    }
    // Dismiss the recovery insight after applying
    dismissInsight(strategyId || `recovery_${plan.itemId}`);
    awardXP(10, 'Recovery plan activated');
  };

  // ── Actions ──────────────────────────────────────────────
  const addGoal = async (goal) => {
    const goalId = Date.now().toString();
    const nextOrder = goals.length > 0 ? Math.max(...goals.map(g => g.order ?? 0)) + 1 : 1;
    const initialHabits = (goal.habits || []).map(h => ({
      ...h,
      id: String(h.id || (Date.now() + Math.random())),
      timeSpent: 0,
      currentCount: 0,
      completed: false,
      streak: 0,
      lastCompletedDate: null,
      missedDays: 0,
      lastActiveDate: TODAY()
    }));

    const newG = {
      ...goal,
      id: goalId,
      startDate: TODAY(),
      daysCompleted: 0,
      progress: 0,
      streak: 0,
      missedDays: 0,
      isMissingDream: false,
      createdAt: TODAY(),
      lastActiveDate: TODAY(),
      order: goal.order ?? nextOrder,
      isFocusGoal: !!goal.isFocusGoal,
      status: 'active',
      dependencies: goal.dependencies || [],
      habits: initialHabits
    };

    if (newG.isFocusGoal) {
      setGoals(prev => prev.map(g => {
        if (g.isFocusGoal) {
          const updated = { ...g, isFocusGoal: false };
          if (user) db.upsertGoal(user.id, updated);
          return updated;
        }
        return g;
      }));
    }

    setGoals(prev => [newG, ...prev]);

    if (user) {
      try {
        // Ensure Goal document is fully created and goalId is available first
        await db.upsertGoal(user.id, newG);

        // Immediately create pending habits using the new goalId
        const habitPromises = initialHabits.map(h => db.upsertHabit(user.id, goalId, h));
        await Promise.all(habitPromises);
      } catch (err) {
        console.error('[Realtime Sync] Failed to create goal and habits sequentially:', err);
      }
    }
  };

  const updateGoal = (id, updates) => {
    console.log(`%c[Diagnostic Log] ACTION START: updateGoal [id=${id}]`, 'color: #3b82f6; font-weight: bold;');
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        const updated = {
          ...g,
          ...updates,
          lastActionTimestamp: new Date().toISOString()
        };
        if (user) {
          console.log(`%c[Diagnostic Log] BEFORE FIRESTORE WRITE: updateGoal [id=${id}]`, 'color: #eab308; font-weight: bold;');
          db.upsertGoal(user.id, updated)
            .then(() => {
              console.log(`%c[Diagnostic Log] WRITE SUCCESS: updateGoal [id=${id}]`, 'color: #22c55e; font-weight: bold;');
            })
            .catch(err => {
              console.error(`%c[Diagnostic Log] WRITE FAILURE: updateGoal [id=${id}]`, 'color: #ef4444; font-weight: bold;', err);
            });
        }
        return updated;
      } else if (updates.isFocusGoal && g.isFocusGoal) {
        const updated = {
          ...g,
          isFocusGoal: false,
          lastActionTimestamp: new Date().toISOString()
        };
        if (user) {
          db.upsertGoal(user.id, updated);
        }
        return updated;
      }
      return g;
    }));
    console.log(`%c[Diagnostic Log] ACTION COMPLETE: updateGoal [id=${id}]`, 'color: #3b82f6; font-weight: bold;');
  };

  const editGoalSystem = async (goalId, goalUpdates, finalHabits) => {
    const targetGoal = goals.find(g => g.id === goalId);
    if (!targetGoal) return;

    // 1. Handle deleted habits in Firestore
    const finalHabitIds = new Set(finalHabits.map(h => String(h.id)));
    const deletedHabits = (targetGoal.habits || []).filter(h => !finalHabitIds.has(String(h.id)));

    if (deletedHabits.length > 0) {
      const deletedIds = deletedHabits.map(dh => String(dh.id));
      deletedHabitIdsRef.current = [...new Set([...deletedHabitIdsRef.current, ...deletedIds])];
      setDeletedHabitIds(prev => [...new Set([...prev, ...deletedIds])]);
      for (const dh of deletedHabits) {
        cancelReminder(dh.id);
      }
    }

    if (user) {
      for (const dh of deletedHabits) {
        await db.deleteHabitDb(user.id, goalId, dh.id);
      }
    }

    // 2. Map final habits
    const mappedHabits = finalHabits.map(h => {
      const existing = (targetGoal.habits || []).find(eh => String(eh.id) === String(h.id));
      if (!existing) {
        // Brand new staging habit added during editing
        const hId = String(h.id || (Date.now() + Math.random()));
        const hCreatedAt = new Date().toISOString();
        return {
          ...h,
          id: hId,
          timeSpent: 0,
          currentCount: 0,
          completed: false,
          streak: 0,
          lastCompletedDate: null,
          completedDates: [],
          missedDays: 0,
          lastActiveDate: TODAY(),
          createdAt: hCreatedAt,
          lastActionTimestamp: new Date().toISOString(),
          syncPending: true
        };
      } else {
        // Preserving tracker details but modifying target config
        const typeChanged = existing.type !== h.type;
        const currentCount = typeChanged ? 0 : (existing.currentCount || 0);
        const timeSpent = typeChanged ? 0 : (existing.timeSpent || 0);

        const targetCount = Number(h.targetCount ?? existing.targetCount ?? 10);
        const targetTime = Number(h.targetTime ?? existing.targetTime ?? 15);
        let completed = existing.completed;
        let completedDates = existing.completedDates ? [...existing.completedDates] : [];

        if (typeChanged || targetCount !== existing.targetCount || targetTime !== existing.targetTime) {
          if (h.type === 'check') {
            completed = existing.completed || false;
          } else if (h.type === 'count') {
            completed = currentCount >= targetCount;
          } else {
            completed = timeSpent >= targetTime;
          }
        }

        // Bug 1 fix: pass createdAt as 3rd arg (was incorrectly passed as 4th, silently ignored)
        const newStreak = calculateStreakFromHistory(completedDates, h.scheduleDays || [], existing.createdAt);
        const newMissed = calculateConsecutiveMissedDays(completedDates, h.scheduleDays || [], existing.createdAt);

        return {
          ...existing,
          title: h.title,
          type: h.type,
          targetTime,
          targetCount,
          scheduleDays: h.scheduleDays || [],
          currentCount,
          timeSpent,
          completed,
          streak: newStreak,
          missedDays: newMissed,
          lastActionTimestamp: new Date().toISOString(),
          syncPending: true
        };
      }
    });

    const updatedGoal = {
      ...targetGoal,
      ...goalUpdates,
      habits: mappedHabits
    };

    // Recalculate goal-level variables dynamically
    const today = TODAY();
    const updatedGoalDates = recalculateGoalCompletedDates(updatedGoal);
    const goalSchedule = getGoalScheduledDays(updatedGoal);
    // G5 fix: calculateGoalStreak now returns { current, best }
    const { current: newGoalStreak, best: newGoalBestStreak } = calculateGoalStreak(updatedGoalDates, goalSchedule);
    const newGoalMissed = calculateGoalConsecutiveMissedDays(updatedGoalDates, goalSchedule, targetGoal.startDate || targetGoal.createdAt);
    const sortedGoalDates = [...updatedGoalDates].sort((a, b) => b.localeCompare(a));
    const newGoalLastCompleted = sortedGoalDates.length > 0 ? sortedGoalDates[0] : null;

    updatedGoal.completedDates = updatedGoalDates;
    updatedGoal.streak = newGoalStreak;
    updatedGoal.bestStreak = Math.max(newGoalBestStreak, targetGoal.bestStreak || 0);
    updatedGoal.missedDays = newGoalMissed;
    updatedGoal.lastCompletedDate = newGoalLastCompleted;
    updatedGoal.lastActionTimestamp = new Date().toISOString();

    updatedGoal.progress = calculateOverallProgress(updatedGoal);

    // Save locally
    if (updatedGoal.isFocusGoal) {
      setGoals(prev => prev.map(g => {
        if (g.id === goalId) {
          return updatedGoal;
        } else if (g.isFocusGoal) {
          const updated = { ...g, isFocusGoal: false };
          if (user) db.upsertGoal(user.id, updated);
          return updated;
        }
        return g;
      }));
    } else {
      setGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g));
    }

    // Save in Firestore
    if (user) {
      try {
        await db.upsertGoal(user.id, updatedGoal);
        for (const h of mappedHabits) {
          await db.upsertHabit(user.id, goalId, h);
        }
      } catch (err) {
        console.error('[Realtime Sync] Failed to edit goal system in Firestore:', err);
      }
    }
  };



  const extendGoalDeadline = (id, newDeadline) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    const extension = { old_date: goal.deadline, new_date: newDeadline, extended_on: TODAY() };
    const updated = { ...goal, deadline: newDeadline, extensions: [...(goal.extensions || []), extension] };
    updated.progress = calculateOverallProgress(updated);

    setGoals(prev => prev.map(g => g.id === id ? updated : g));

    if (user) {
      db.upsertGoal(user.id, updated).catch(err => console.error('[Firestore Sync] Extend deadline failed:', err));
    }
  };

  const setFocusGoal = async (goalId) => {
    setGoals(prev => prev.map(g => {
      const isNowFocus = g.id === goalId;
      if (g.isFocusGoal !== isNowFocus) {
        const updated = { ...g, isFocusGoal: isNowFocus };
        if (user) db.upsertGoal(user.id, updated);
        return updated;
      }
      return g;
    }));
  };

  const reorderGoals = async (startIndex, endIndex) => {
    const list = [...sortedGoals];
    const [removed] = list.splice(startIndex, 1);
    list.splice(endIndex, 0, removed);

    const updated = list.map((g, idx) => ({
      ...g,
      order: idx + 1
    }));

    setGoals(updated);

    if (user) {
      try {
        const promises = updated.map(g => db.upsertGoal(user.id, g));
        await Promise.all(promises);
      } catch (err) {
        console.error('[Realtime Sync] Failed to save reordered goals:', err);
      }
    }
  };

  const moveGoal = async (goalId, direction) => {
    const index = sortedGoals.findIndex(g => g.id === goalId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedGoals.length) return;

    const list = [...sortedGoals];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const updated = list.map((g, idx) => ({
      ...g,
      order: idx + 1
    }));

    setGoals(updated);

    if (user) {
      try {
        const promises = updated.map(g => db.upsertGoal(user.id, g));
        await Promise.all(promises);
      } catch (err) {
        console.error('[Realtime Sync] Failed to move goal:', err);
      }
    }
  };

  const deleteGoal = id => {
    const goalIdStr = String(id);
    console.log(`%c[Diagnostic Log] ACTION START: deleteGoal [goalId=${goalIdStr}]`, 'color: #3b82f6; font-weight: bold;');

    // 1. Clean up active habits sub-collection real-time snapshot listener
    if (habitsListeners.current[goalIdStr]) {
      habitsListeners.current[goalIdStr]();
      delete habitsListeners.current[goalIdStr];
    }

    // 2. Clear any lingering recovery state, dismissed insights, or weekly intention cache
    const targetGoal = goals.find(g => String(g.id) === goalIdStr);
    const habitIds = targetGoal ? (targetGoal.habits || []).map(h => String(h.id)) : [];

    setSettings(prev => {
      const updatedIntentions = { ...prev.weeklyIntentions };
      delete updatedIntentions[goalIdStr];

      const todayKey = TODAY();
      const dismissed = prev.dismissedInsights || [];
      // Clean up/dismiss any recovery strategies/alerts related to this goal & habits instantly
      const idsToDismiss = [
        `recovery_${goalIdStr}`,
        ...habitIds.map(hId => `recovery_${hId}`),
        ...habitIds.map(hId => `recovery_${goalIdStr}_${hId}`)
      ].map(dId => dId.includes('__') ? dId : `${dId}__${todayKey}`);

      return {
        ...prev,
        weeklyIntentions: updatedIntentions,
        dismissedInsights: [...new Set([...dismissed, ...idsToDismiss])]
      };
    });

    // 3. Mark the ID as deleted persistently to shield the UI from stale Firestore snapshot feeds
    setDeletedGoalIds(prev => [...new Set([...prev, goalIdStr])]);

    // 4. Instantly remove from goals list in-memory state
    setGoals(prev => prev.filter(g => String(g.id) !== goalIdStr));

    // 5. Trigger physical database deletion
    if (user) {
      console.log(`%c[Diagnostic Log] BEFORE FIRESTORE WRITE: deleteGoal [goalId=${goalIdStr}]`, 'color: #eab308; font-weight: bold;');
      db.deleteGoalDb(user.id, goalIdStr)
        .then(() => {
          console.log(`%c[Diagnostic Log] WRITE SUCCESS: deleteGoal [goalId=${goalIdStr}]`, 'color: #22c55e; font-weight: bold;');
        })
        .catch(err => {
          console.error(`%c[Diagnostic Log] WRITE FAILURE: deleteGoal [goalId=${goalIdStr}]`, 'color: #ef4444; font-weight: bold;', err);
        })
        .finally(() => {
          console.log(`%c[Diagnostic Log] ACTION COMPLETE: deleteGoal [goalId=${goalIdStr}]`, 'color: #3b82f6; font-weight: bold;');
        });
    } else {
      console.log(`%c[Diagnostic Log] ACTION COMPLETE: deleteGoal [goalId=${goalIdStr}] (No Logged-In User)`, 'color: #3b82f6; font-weight: bold;');
    }

    // Cancel all habit reminders for this goal
    habitIds.forEach(hId => cancelReminder(hId));
  };

  const addHabit = (goalId, habit) => {
    const targetGoal = goals.find(g => g.id === goalId);
    if (!targetGoal) {
      console.warn(`[Habit Creator] Cannot create habit; parent Goal ID "${goalId}" does not exist.`);
      return;
    }
    const hCreatedAt = new Date().toISOString();
    const initialStreak = 0;

    const newH = {
      ...habit,
      id: Date.now().toString(),
      timeSpent: 0,
      currentCount: 0,
      completed: false,
      streak: initialStreak,
      lastCompletedDate: null,
      completedDates: [],
      missedDays: 0,
      lastActiveDate: TODAY(),
      createdAt: hCreatedAt,
      lastActionTimestamp: new Date().toISOString(),
      syncPending: true
    };

    const updatedHabits = [...(targetGoal.habits || []), newH];
    const updatedGoal = { ...targetGoal, habits: updatedHabits };

    const updatedGoalDates = recalculateGoalCompletedDates(updatedGoal);
    const goalSchedule = getGoalScheduledDays(updatedGoal);
    // G5 fix: calculateGoalStreak now returns { current, best }
    const { current: newGoalStreak, best: newGoalBestStreak } = calculateGoalStreak(updatedGoalDates, goalSchedule);
    const newGoalMissed = calculateGoalConsecutiveMissedDays(updatedGoalDates, goalSchedule, targetGoal.startDate || targetGoal.createdAt);
    const sortedGoalDates = [...updatedGoalDates].sort((a, b) => b.localeCompare(a));
    const newGoalLastCompleted = sortedGoalDates.length > 0 ? sortedGoalDates[0] : null;

    if (!targetGoal) {
      console.error('[addHabit] Goal object missing — aborting streak recalculation.');
      return;
    }

    const finalGoal = {
      ...updatedGoal,
      completedDates: updatedGoalDates,
      streak: newGoalStreak,
      bestStreak: Math.max(newGoalBestStreak, targetGoal.bestStreak || 0),
      missedDays: newGoalMissed,
      lastCompletedDate: newGoalLastCompleted,
      lastActionTimestamp: new Date().toISOString()
    };
    finalGoal.progress = calculateOverallProgress(finalGoal);

    setGoals(prev => prev.map(g => g.id === goalId ? finalGoal : g));

    if (user) {
      db.upsertHabit(user.id, goalId, newH).catch(err => console.error('[Firestore Sync] Habit upsert failed:', err));
      db.upsertGoal(user.id, finalGoal).catch(err => console.error('[Firestore Sync] Goal upsert failed:', err));
    }
  };

  const deleteHabit = (goalId, habitId) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    // Track deleted habit ID locally and persistently to shield UI
    deletedHabitIdsRef.current = [...new Set([...deletedHabitIdsRef.current, String(habitId)])];
    setDeletedHabitIds(prev => [...new Set([...prev, String(habitId)])]);

    const updatedHabits = (goal.habits || []).filter(h => h.id !== habitId);
    const updatedGoal = { ...goal, habits: updatedHabits };

    const updatedGoalDates = recalculateGoalCompletedDates(updatedGoal);
    const goalSchedule = getGoalScheduledDays(updatedGoal);
    // G5 fix: calculateGoalStreak now returns { current, best }
    const { current: newGoalStreak, best: newGoalBestStreak } = calculateGoalStreak(updatedGoalDates, goalSchedule);
    const newGoalMissed = calculateGoalConsecutiveMissedDays(updatedGoalDates, goalSchedule, goal.startDate || goal.createdAt);
    const sortedGoalDates = [...updatedGoalDates].sort((a, b) => b.localeCompare(a));
    const newGoalLastCompleted = sortedGoalDates.length > 0 ? sortedGoalDates[0] : null;

    const finalGoal = {
      ...updatedGoal,
      completedDates: updatedGoalDates,
      streak: newGoalStreak,
      bestStreak: Math.max(newGoalBestStreak, goal.bestStreak || 0),
      missedDays: newGoalMissed,
      lastCompletedDate: newGoalLastCompleted,
      lastActionTimestamp: new Date().toISOString()
    };
    finalGoal.progress = calculateOverallProgress(finalGoal);

    setGoals(prev => prev.map(g => g.id === goalId ? finalGoal : g));

    if (user) {
      db.deleteHabitDb(user.id, goalId, habitId).catch(err => console.error('[Firestore Sync] Habit delete failed:', err));
      db.upsertGoal(user.id, finalGoal).catch(err => console.error('[Firestore Sync] Goal upsert failed:', err));
    }

    cancelReminder(habitId);
  };

  const logHabitTime = (goalId, habitId, minutes) => {
    console.log(`%c[Diagnostic Log] ACTION START: logHabitTime [goalId=${goalId}, habitId=${habitId}, minutes=${minutes}]`, 'color: #3b82f6; font-weight: bold;');
    const goal = goals.find(g => g.id === goalId);
    if (!goal) {
      console.warn(`[Diagnostic Log] Goal ${goalId} not found for logHabitTime.`);
      return;
    }

    let habitToUpdate = null;
    const today = TODAY();

    const updatedHabits = (goal.habits || []).map(h => {
      if (h.id === habitId) {
        let updatedH = { ...h };
        if (h.lastActiveDate !== today) {
          updatedH.completed = false;
          updatedH.currentCount = 0;
          updatedH.timeSpent = 0;
          if (h.isRecovering && h.originalTarget !== undefined) {
            updatedH.targetTime = h.originalTarget;
            updatedH.isRecovering = false;
            delete updatedH.originalTarget;
          }
        }

        const newTime = Math.max(0, (updatedH.timeSpent || 0) + minutes);
        const wasCompleted = updatedH.completed;
        const target = updatedH.targetTime ?? 15;
        const isDone = newTime >= target;

        updatedH.timeSpent = newTime;
        updatedH.completed = isDone;

        let updatedDates = updatedH.completedDates ? [...updatedH.completedDates] : [];
        if (updatedH.lastCompletedDate && !updatedDates.includes(updatedH.lastCompletedDate)) {
          updatedDates.push(updatedH.lastCompletedDate);
        }

        if (isDone) {
          if (!updatedDates.includes(today)) {
            updatedDates.push(today);
          }
        } else {
          updatedDates = updatedDates.filter(d => d !== today);
        }

        // Bug 1 fix: pass createdAt as 3rd arg (was incorrectly passed as 4th, silently ignored)
        const newStreak = calculateStreakFromHistory(updatedDates, updatedH.scheduleDays || [], updatedH.createdAt);
        const newMissed = calculateConsecutiveMissedDays(updatedDates, updatedH.scheduleDays || [], updatedH.createdAt);
        const sortedDates = [...updatedDates].sort((a, b) => b.localeCompare(a));
        const newLastCompleted = sortedDates.length > 0 ? sortedDates[0] : null;

        updatedH.completedDates = updatedDates;
        updatedH.streak = newStreak;
        updatedH.lastCompletedDate = newLastCompleted;
        updatedH.missedDays = newMissed;
        updatedH.lastActiveDate = today;
        updatedH.lastActionTimestamp = new Date().toISOString();

        if (isDone && !wasCompleted) {
          // XP: Habit completed via time
          awardXP(XP_SOURCES.HABIT_COMPLETE, `Completed: ${h.title}`);
          incrementCompletions();
          // Comeback detection
          if ((updatedH.missedDays || 0) >= 2) recordComeback();
        }

        habitToUpdate = updatedH;
        return updatedH;
      }
      return h;
    });

    if (!habitToUpdate) {
      console.warn(`[Diagnostic Log] Habit ${habitId} not found under goal ${goalId} for logHabitTime.`);
      return;
    }

    const updatedGoalWithoutDates = { ...goal, habits: updatedHabits };
    const updatedGoalDates = recalculateGoalCompletedDates(updatedGoalWithoutDates);
    const goalSchedule = getGoalScheduledDays(updatedGoalWithoutDates);
    // G5 fix: calculateGoalStreak now returns { current, best }
    const { current: newGoalStreak, best: newGoalBestStreak } = calculateGoalStreak(updatedGoalDates, goalSchedule);
    const newGoalMissed = calculateGoalConsecutiveMissedDays(updatedGoalDates, goalSchedule, goal.startDate || goal.createdAt);
    const sortedGoalDates = [...updatedGoalDates].sort((a, b) => b.localeCompare(a));
    const newGoalLastCompleted = sortedGoalDates.length > 0 ? sortedGoalDates[0] : null;

    const finalGoal = {
      ...goal,
      habits: updatedHabits,
      completedDates: updatedGoalDates,
      streak: newGoalStreak,
      bestStreak: Math.max(newGoalBestStreak, goal.bestStreak || 0),
      missedDays: newGoalMissed,
      lastCompletedDate: newGoalLastCompleted,
      lastActiveDate: today,
      lastActionTimestamp: new Date().toISOString()
    };

    finalGoal.progress = calculateOverallProgress(finalGoal);

    setGoals(prev => prev.map(g => g.id === goalId ? finalGoal : g));

    if (user) {
      console.log(`%c[Diagnostic Log] BEFORE FIRESTORE WRITE: logHabitTime [goalId=${goalId}, habitId=${habitId}]`, 'color: #eab308; font-weight: bold;');

      const p1 = db.upsertHabit(user.id, goalId, habitToUpdate)
        .then(() => {
          console.log(`%c[Diagnostic Log] WRITE SUCCESS: logHabitTime [upsertHabit]`, 'color: #22c55e; font-weight: bold;');
        })
        .catch(err => {
          console.error(`%c[Diagnostic Log] WRITE FAILURE: logHabitTime [upsertHabit]`, 'color: #ef4444; font-weight: bold;', err);
        });

      const p2 = db.upsertGoal(user.id, finalGoal)
        .then(() => {
          console.log(`%c[Diagnostic Log] WRITE SUCCESS: logHabitTime [upsertGoal]`, 'color: #22c55e; font-weight: bold;');
        })
        .catch(err => {
          console.error(`%c[Diagnostic Log] WRITE FAILURE: logHabitTime [upsertGoal]`, 'color: #ef4444; font-weight: bold;', err);
        });

      Promise.all([p1, p2]).finally(() => {
        console.log(`%c[Diagnostic Log] ACTION COMPLETE: logHabitTime [goalId=${goalId}, habitId=${habitId}]`, 'color: #3b82f6; font-weight: bold;');
      });
    } else {
      console.log(`%c[Diagnostic Log] ACTION COMPLETE: logHabitTime [goalId=${goalId}, habitId=${habitId}] (No Logged-In User)`, 'color: #3b82f6; font-weight: bold;');
    }
  };

  const updateHabitReminder = (goalId, habitId, reminderEnabled, reminderTime) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    let habitToUpdate = null;
    const updatedHabits = (goal.habits || []).map(h => {
      if (h.id === habitId) {
        habitToUpdate = {
          ...h,
          reminderEnabled,
          reminderTime: reminderTime || h.reminderTime || '08:00',
          lastActionTimestamp: new Date().toISOString()
        };
        return habitToUpdate;
      }
      return h;
    });

    const updatedGoal = { ...goal, habits: updatedHabits, lastActionTimestamp: new Date().toISOString() };
    setGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g));

    if (user && habitToUpdate) {
      db.upsertHabit(user.id, goalId, habitToUpdate).catch(err => console.error('[Firestore Sync] Habit reminder update failed:', err));
      db.upsertGoal(user.id, updatedGoal).catch(err => console.error('[Firestore Sync] Goal update failed:', err));
    }
  };



  const toggleHabitCheck = (goalId, habitId) => {
    console.log(`%c[Diagnostic Log] ACTION START: toggleHabitCheck [goalId=${goalId}, habitId=${habitId}]`, 'color: #3b82f6; font-weight: bold;');
    const goal = goals.find(g => g.id === goalId);
    if (!goal) {
      console.warn(`[Diagnostic Log] Goal ${goalId} not found for toggleHabitCheck.`);
      return;
    }

    let habitToUpdate = null;
    const today = TODAY();

    const updatedHabits = (goal.habits || []).map(h => {
      if (h.id === habitId) {
        let updatedH = { ...h };
        if (h.lastActiveDate !== today) {
          updatedH.completed = false;
          updatedH.currentCount = 0;
          updatedH.timeSpent = 0;
          if (h.isRecovering && h.originalTarget !== undefined) {
            const targetKey = h.type === 'count' ? 'targetCount' : 'targetTime';
            updatedH[targetKey] = h.originalTarget;
            updatedH.isRecovering = false;
            delete updatedH.originalTarget;
          }
        }

        let isDone = false;
        let wasCompleted = updatedH.completed;

        if (updatedH.type === 'check') {
          updatedH.completed = !updatedH.completed;
          isDone = updatedH.completed;
        } else if (updatedH.type === 'count') {
          const target = updatedH.targetCount || 10;
          updatedH.currentCount = (updatedH.currentCount >= target) ? 0 : target;
          updatedH.completed = updatedH.currentCount >= target;
          isDone = updatedH.completed;
        } else {
          const target = updatedH.targetTime ?? 15;
          updatedH.timeSpent = (updatedH.timeSpent >= target) ? 0 : target;
          updatedH.completed = updatedH.timeSpent >= target;
          isDone = updatedH.completed;
        }

        let updatedDates = updatedH.completedDates ? [...updatedH.completedDates] : [];
        if (updatedH.lastCompletedDate && !updatedDates.includes(updatedH.lastCompletedDate)) {
          updatedDates.push(updatedH.lastCompletedDate);
        }

        if (isDone) {
          if (!updatedDates.includes(today)) {
            updatedDates.push(today);
          }
        } else {
          updatedDates = updatedDates.filter(d => d !== today);
        }

        // Bug 1 fix: pass createdAt as 3rd arg (was incorrectly passed as 4th, silently ignored)
        const newStreak = calculateStreakFromHistory(updatedDates, updatedH.scheduleDays || [], updatedH.createdAt);
        const newMissed = calculateConsecutiveMissedDays(updatedDates, updatedH.scheduleDays || [], updatedH.createdAt);
        const sortedDates = [...updatedDates].sort((a, b) => b.localeCompare(a));
        const newLastCompleted = sortedDates.length > 0 ? sortedDates[0] : null;

        updatedH.completedDates = updatedDates;
        updatedH.streak = newStreak;
        updatedH.lastCompletedDate = newLastCompleted;
        updatedH.missedDays = newMissed;
        updatedH.lastActiveDate = today;
        updatedH.lastActionTimestamp = new Date().toISOString();

        if (isDone && !wasCompleted) {
          awardXP(XP_SOURCES.HABIT_COMPLETE, `Completed: ${h.title}`);
          incrementCompletions();
          if ((updatedH.missedDays || 0) >= 2) recordComeback();
        }

        habitToUpdate = updatedH;
        return updatedH;
      }
      return h;
    });

    if (!habitToUpdate) {
      console.warn(`[Diagnostic Log] Habit ${habitId} not found under goal ${goalId} for toggleHabitCheck.`);
      return;
    }

    const updatedGoalWithoutDates = { ...goal, habits: updatedHabits };
    const updatedGoalDates = recalculateGoalCompletedDates(updatedGoalWithoutDates);
    const goalSchedule = getGoalScheduledDays(updatedGoalWithoutDates);
    // G5 fix: calculateGoalStreak now returns { current, best }
    const { current: newGoalStreak, best: newGoalBestStreak } = calculateGoalStreak(updatedGoalDates, goalSchedule);
    const newGoalMissed = calculateGoalConsecutiveMissedDays(updatedGoalDates, goalSchedule, goal.startDate || goal.createdAt);
    const sortedGoalDates = [...updatedGoalDates].sort((a, b) => b.localeCompare(a));
    const newGoalLastCompleted = sortedGoalDates.length > 0 ? sortedGoalDates[0] : null;

    const finalGoal = {
      ...goal,
      habits: updatedHabits,
      completedDates: updatedGoalDates,
      streak: newGoalStreak,
      bestStreak: Math.max(newGoalBestStreak, goal.bestStreak || 0),
      missedDays: newGoalMissed,
      lastCompletedDate: newGoalLastCompleted,
      lastActiveDate: today,
      lastActionTimestamp: new Date().toISOString()
    };

    finalGoal.progress = calculateOverallProgress(finalGoal);

    setGoals(prev => prev.map(g => g.id === goalId ? finalGoal : g));

    if (user) {
      console.log(`%c[Diagnostic Log] BEFORE FIRESTORE WRITE: toggleHabitCheck [goalId=${goalId}, habitId=${habitId}]`, 'color: #eab308; font-weight: bold;');

      const p1 = db.upsertHabit(user.id, goalId, habitToUpdate)
        .then(() => {
          console.log(`%c[Diagnostic Log] WRITE SUCCESS: toggleHabitCheck [upsertHabit]`, 'color: #22c55e; font-weight: bold;');
        })
        .catch(err => {
          console.error(`%c[Diagnostic Log] WRITE FAILURE: toggleHabitCheck [upsertHabit]`, 'color: #ef4444; font-weight: bold;', err);
        });

      const p2 = db.upsertGoal(user.id, finalGoal)
        .then(() => {
          console.log(`%c[Diagnostic Log] WRITE SUCCESS: toggleHabitCheck [upsertGoal]`, 'color: #22c55e; font-weight: bold;');
        })
        .catch(err => {
          console.error(`%c[Diagnostic Log] WRITE FAILURE: toggleHabitCheck [upsertGoal]`, 'color: #ef4444; font-weight: bold;', err);
        });

      Promise.all([p1, p2]).finally(() => {
        console.log(`%c[Diagnostic Log] ACTION COMPLETE: toggleHabitCheck [goalId=${goalId}, habitId=${habitId}]`, 'color: #3b82f6; font-weight: bold;');
      });
    } else {
      console.log(`%c[Diagnostic Log] ACTION COMPLETE: toggleHabitCheck [goalId=${goalId}, habitId=${habitId}] (No Logged-In User)`, 'color: #3b82f6; font-weight: bold;');
    }
  };

  const updateHabitCount = (goalId, habitId, delta) => {
    console.log(`%c[Diagnostic Log] ACTION START: updateHabitCount [goalId=${goalId}, habitId=${habitId}, delta=${delta}]`, 'color: #3b82f6; font-weight: bold;');
    const goal = goals.find(g => g.id === goalId);
    if (!goal) {
      console.warn(`[Diagnostic Log] Goal ${goalId} not found for updateHabitCount.`);
      return;
    }

    let habitToUpdate = null;
    const today = TODAY();

    const updatedHabits = (goal.habits || []).map(h => {
      if (h.id === habitId) {
        let updatedH = { ...h };
        if (h.lastActiveDate !== today) {
          updatedH.completed = false;
          updatedH.currentCount = 0;
          updatedH.timeSpent = 0;
          if (h.isRecovering && h.originalTarget !== undefined) {
            updatedH.targetCount = h.originalTarget;
            updatedH.isRecovering = false;
            delete updatedH.originalTarget;
          }
        }

        const newCount = Math.max(0, (updatedH.currentCount || 0) + delta);
        const wasCompleted = updatedH.completed;
        const target = updatedH.targetCount || 10;
        const isDone = newCount >= target;

        updatedH.currentCount = newCount;
        updatedH.completed = isDone;

        let updatedDates = updatedH.completedDates ? [...updatedH.completedDates] : [];
        if (updatedH.lastCompletedDate && !updatedDates.includes(updatedH.lastCompletedDate)) {
          updatedDates.push(updatedH.lastCompletedDate);
        }

        if (isDone) {
          if (!updatedDates.includes(today)) {
            updatedDates.push(today);
          }
        } else {
          updatedDates = updatedDates.filter(d => d !== today);
        }

        // Bug 1 fix: pass createdAt as 3rd arg (was incorrectly passed as 4th, silently ignored)
        const newStreak = calculateStreakFromHistory(updatedDates, updatedH.scheduleDays || [], updatedH.createdAt);
        const newMissed = calculateConsecutiveMissedDays(updatedDates, updatedH.scheduleDays || [], updatedH.createdAt);
        const sortedDates = [...updatedDates].sort((a, b) => b.localeCompare(a));
        const newLastCompleted = sortedDates.length > 0 ? sortedDates[0] : null;

        updatedH.completedDates = updatedDates;
        updatedH.streak = newStreak;
        updatedH.lastCompletedDate = newLastCompleted;
        updatedH.missedDays = newMissed;
        updatedH.lastActiveDate = today;
        updatedH.lastActionTimestamp = new Date().toISOString();

        if (isDone && !wasCompleted) {
          awardXP(XP_SOURCES.HABIT_COMPLETE, `Completed: ${h.title}`);
          incrementCompletions();
          if ((updatedH.missedDays || 0) >= 2) recordComeback();
        }

        habitToUpdate = updatedH;
        return updatedH;
      }
      return h;
    });

    if (!habitToUpdate) {
      console.warn(`[Diagnostic Log] Habit ${habitId} not found under goal ${goalId} for updateHabitCount.`);
      return;
    }

    const updatedGoalWithoutDates = { ...goal, habits: updatedHabits };
    const updatedGoalDates = recalculateGoalCompletedDates(updatedGoalWithoutDates);
    const goalSchedule = getGoalScheduledDays(updatedGoalWithoutDates);
    // G5 fix: calculateGoalStreak now returns { current, best }
    const { current: newGoalStreak, best: newGoalBestStreak } = calculateGoalStreak(updatedGoalDates, goalSchedule);
    const newGoalMissed = calculateGoalConsecutiveMissedDays(updatedGoalDates, goalSchedule, goal.startDate || goal.createdAt);
    const sortedGoalDates = [...updatedGoalDates].sort((a, b) => b.localeCompare(a));
    const newGoalLastCompleted = sortedGoalDates.length > 0 ? sortedGoalDates[0] : null;

    const finalGoal = {
      ...goal,
      habits: updatedHabits,
      completedDates: updatedGoalDates,
      streak: newGoalStreak,
      bestStreak: Math.max(newGoalBestStreak, goal.bestStreak || 0),
      missedDays: newGoalMissed,
      lastCompletedDate: newGoalLastCompleted,
      lastActiveDate: today,
      lastActionTimestamp: new Date().toISOString()
    };

    finalGoal.progress = calculateOverallProgress(finalGoal);

    setGoals(prev => prev.map(g => g.id === goalId ? finalGoal : g));

    if (user) {
      console.log(`%c[Diagnostic Log] BEFORE FIRESTORE WRITE: updateHabitCount [goalId=${goalId}, habitId=${habitId}]`, 'color: #eab308; font-weight: bold;');

      const p1 = db.upsertHabit(user.id, goalId, habitToUpdate)
        .then(() => {
          console.log(`%c[Diagnostic Log] WRITE SUCCESS: updateHabitCount [upsertHabit]`, 'color: #22c55e; font-weight: bold;');
        })
        .catch(err => {
          console.error(`%c[Diagnostic Log] WRITE FAILURE: updateHabitCount [upsertHabit]`, 'color: #ef4444; font-weight: bold;', err);
        });

      const p2 = db.upsertGoal(user.id, finalGoal)
        .then(() => {
          console.log(`%c[Diagnostic Log] WRITE SUCCESS: updateHabitCount [upsertGoal]`, 'color: #22c55e; font-weight: bold;');
        })
        .catch(err => {
          console.error(`%c[Diagnostic Log] WRITE FAILURE: updateHabitCount [upsertGoal]`, 'color: #ef4444; font-weight: bold;', err);
        });

      Promise.all([p1, p2]).finally(() => {
        console.log(`%c[Diagnostic Log] ACTION COMPLETE: updateHabitCount [goalId=${goalId}, habitId=${habitId}]`, 'color: #3b82f6; font-weight: bold;');
      });
    } else {
      console.log(`%c[Diagnostic Log] ACTION COMPLETE: updateHabitCount [goalId=${goalId}, habitId=${habitId}] (No Logged-In User)`, 'color: #3b82f6; font-weight: bold;');
    }
  };

  const addTask = async (task) => {
    const trackingKey = getTaskTrackingKey(task);
    const existingRec = recurringHistory[trackingKey];
    const recDates = existingRec ? existingRec.completedDates : [];
    const today = TODAY();
    const isCompletedToday = recDates.includes(today);
    const { sanitizedDates } = sanitizeAndValidateCompletedDates(recDates, task.createdAt, 'new_task', task.title, existingRec ? existingRec.streak : 0);
    const { current: currentStreak, best: bestStreak } = calculateTaskStreak(sanitizedDates);
    const sortedDates = [...sanitizedDates].sort((a, b) => b.localeCompare(a));
    const newLastCompleted = sortedDates.length > 0 ? sortedDates[0] : null;

    const newT = {
      ...task,
      id: Date.now().toString(),
      recurringId: trackingKey,
      timeSpent: isCompletedToday && task.completionType === 'time' ? (task.targetTime || 30) : 0,
      currentCount: isCompletedToday && task.completionType === 'count' ? (task.targetCount || 10) : 0,
      completed: isCompletedToday,
      currentStreak,
      bestStreak,
      completedDates: sanitizedDates,
      lastCompletedDate: newLastCompleted,
      missedDays: calculateConsecutiveMissedDays(sanitizedDates, []),
      lastActiveDate: today
    };
    setTasks(prev => [newT, ...prev]);
    if (user) {
      try {
        await db.upsertTask(user.id, newT);
      } catch (err) {
        console.error('[Firestore Sync] Failed to add task:', err);
      }
    }
  };

  const updateTask = async (id, updates) => {
    const t = tasks.find(item => item.id === id);
    if (!t) return;
    const updated = { ...t, ...updates };
    setTasks(prev => prev.map(item => item.id === id ? updated : item));
    if (user) {
      try {
        await db.upsertTask(user.id, updated);
      } catch (err) {
        console.error('[Firestore Sync] Failed to update task:', err);
      }
    }
  };

  const deleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (user) {
      try {
        await db.deleteTaskDb(user.id, id);
      } catch (err) {
        console.error('[Firestore Sync] Failed to delete task:', err);
      }
    }

    cancelReminder(id);
  };

  const toggleTaskComplete = (taskId) => {
    console.log(`%c[Diagnostic Log] ACTION START: toggleTaskComplete [taskId=${taskId}]`, 'color: #3b82f6; font-weight: bold;');
    const t = tasks.find(item => item.id === taskId);
    if (!t) {
      console.warn(`[Diagnostic Log] Task ${taskId} not found for toggleTaskComplete.`);
      return;
    }

    const today = TODAY();
    const isDaily = (t.schedule_type || t.type) === 'daily';
    let updated = { ...t };

    if (isDaily && t.lastActiveDate !== today) {
      updated.completed = false;
      updated.currentCount = 0;
      updated.timeSpent = 0;
      if (t.isRecovering && t.originalTarget !== undefined) {
        const targetKey = t.completionType === 'count' ? 'targetCount' : 'targetTime';
        updated[targetKey] = t.originalTarget;
        updated.isRecovering = false;
        delete updated.originalTarget;
      }
    }

    let isDone = false;
    let wasCompleted = updated.completed;
    const cType = updated.completionType || updated.type || 'check';

    if (cType === 'check') {
      updated.completed = !updated.completed;
      isDone = updated.completed;
    } else if (cType === 'count') {
      const target = updated.targetCount || 10;
      updated.currentCount = (updated.currentCount >= target) ? 0 : target;
      updated.completed = updated.currentCount >= target;
      isDone = updated.completed;
    } else {
      const target = updated.targetTime ?? 30;
      updated.timeSpent = (updated.timeSpent >= target) ? 0 : target;
      updated.completed = updated.timeSpent >= target;
      isDone = updated.completed;
    }

    const recId = updated.recurringId || getTaskTrackingKey(updated);
    // Bug 4 fix: always use task.completedDates as authoritative source (already sanitized from
    // Firestore on load). recurringHistory can diverge and cause stale streak calculations.
    let recDates = updated.completedDates ? [...updated.completedDates] : [];

    if (isDone) {
      if (!recDates.includes(today)) {
        recDates.push(today);
      }
    } else {
      recDates = recDates.filter(d => d !== today);
    }

    const { sanitizedDates } = sanitizeAndValidateCompletedDates(recDates, updated.createdAt, updated.id, updated.title, updated.currentStreak);
    const { current: newStreak, best: newBestStreak } = calculateTaskStreak(sanitizedDates);
    const sortedDates = [...sanitizedDates].sort((a, b) => b.localeCompare(a));
    const newLastCompleted = sortedDates.length > 0 ? sortedDates[0] : null;

    updated.completedDates = sanitizedDates;
    updated.currentStreak = newStreak;
    updated.bestStreak = newBestStreak;
    updated.lastCompletedDate = newLastCompleted;
    updated.lastActiveDate = today;
    if (isDone) {
      updated.missedDays = 0;
    }

    if (isDaily) {
      const recPayload = {
        title: updated.title,
        type: updated.type || 'daily',
        completedDates: sanitizedDates,
        streak: newStreak
      };
      setRecurringHistory(prev => ({ ...prev, [recId]: { id: recId, ...recPayload } }));
      if (user) {
        db.upsertRecurringHistory(user.id, recId, recPayload);
      }
    }

    // XP: Task completed via toggle
    if (isDone && !wasCompleted) {
      awardXP(XP_SOURCES.TASK_COMPLETE, `Completed: ${t.title}`);
      incrementCompletions();
    }

    setTasks(prev => prev.map(item => item.id === taskId ? updated : item));

    if (user) {
      console.log(`%c[Diagnostic Log] BEFORE FIRESTORE WRITE: toggleTaskComplete [taskId=${taskId}]`, 'color: #eab308; font-weight: bold;');
      db.upsertTask(user.id, updated)
        .then(() => {
          console.log(`%c[Diagnostic Log] WRITE SUCCESS: toggleTaskComplete [taskId=${taskId}]`, 'color: #22c55e; font-weight: bold;');
        })
        .catch(err => {
          console.error(`%c[Diagnostic Log] WRITE FAILURE: toggleTaskComplete [taskId=${taskId}]`, 'color: #ef4444; font-weight: bold;', err);
        });
    }
    console.log(`%c[Diagnostic Log] ACTION COMPLETE: toggleTaskComplete [taskId=${taskId}]`, 'color: #3b82f6; font-weight: bold;');
  };

  const updateTaskCount = (taskId, delta) => {
    console.log(`%c[Diagnostic Log] ACTION START: updateTaskCount [taskId=${taskId}, delta=${delta}]`, 'color: #3b82f6; font-weight: bold;');
    const t = tasks.find(item => item.id === taskId);
    if (!t) {
      console.warn(`[Diagnostic Log] Task ${taskId} not found for updateTaskCount.`);
      return;
    }

    const today = TODAY();
    let updated = { ...t };
    const isDaily = (t.schedule_type || t.type) === 'daily';

    if (isDaily && t.lastActiveDate !== today) {
      updated.completed = false;
      updated.currentCount = 0;
      updated.timeSpent = 0;
      if (t.isRecovering && t.originalTarget !== undefined) {
        updated.targetCount = t.originalTarget;
        updated.isRecovering = false;
        delete updated.originalTarget;
      }
    }

    const newCount = Math.max(0, (updated.currentCount || 0) + delta);
    const wasCompleted = updated.completed;
    const target = updated.targetCount || 10;
    const isDone = newCount >= target;

    updated.currentCount = newCount;
    updated.completed = isDone;

    const recId = updated.recurringId || getTaskTrackingKey(updated);
    // Bug 4 fix: always use task.completedDates as authoritative source (already sanitized from Firestore).
    let recDates = updated.completedDates ? [...updated.completedDates] : [];

    if (isDone) {
      if (!recDates.includes(today)) {
        recDates.push(today);
      }
    } else {
      recDates = recDates.filter(d => d !== today);
    }

    const { sanitizedDates } = sanitizeAndValidateCompletedDates(recDates, updated.createdAt, updated.id, updated.title, updated.currentStreak);
    const { current: newStreak, best: newBestStreak } = calculateTaskStreak(sanitizedDates);
    const sortedDates = [...sanitizedDates].sort((a, b) => b.localeCompare(a));
    const newLastCompleted = sortedDates.length > 0 ? sortedDates[0] : null;

    updated.completedDates = sanitizedDates;
    updated.currentStreak = newStreak;
    updated.bestStreak = newBestStreak;
    updated.lastCompletedDate = newLastCompleted;
    updated.lastActiveDate = today;
    if (isDone) {
      updated.missedDays = 0;
    }

    // Debug logging for streak audit
    logStreakDebug(updated.title, sanitizedDates, newStreak, newBestStreak, t.currentStreak);

    if (isDaily) {
      const recPayload = {
        title: updated.title,
        type: updated.type || 'daily',
        completedDates: sanitizedDates,
        streak: newStreak
      };
      setRecurringHistory(prev => ({ ...prev, [recId]: { id: recId, ...recPayload } }));
      if (user) {
        db.upsertRecurringHistory(user.id, recId, recPayload);
      }
    }

    if (isDone && !wasCompleted) {
      awardXP(XP_SOURCES.TASK_COMPLETE, `Completed: ${t.title}`);
      incrementCompletions();
    }

    setTasks(prev => prev.map(item => item.id === taskId ? updated : item));

    if (user) {
      console.log(`%c[Diagnostic Log] BEFORE FIRESTORE WRITE: updateTaskCount [taskId=${taskId}]`, 'color: #eab308; font-weight: bold;');
      db.upsertTask(user.id, updated)
        .then(() => {
          console.log(`%c[Diagnostic Log] WRITE SUCCESS: updateTaskCount [taskId=${taskId}]`, 'color: #22c55e; font-weight: bold;');
        })
        .catch(err => {
          console.error(`%c[Diagnostic Log] WRITE FAILURE: updateTaskCount [taskId=${taskId}]`, 'color: #ef4444; font-weight: bold;', err);
        });
    }
    console.log(`%c[Diagnostic Log] ACTION COMPLETE: updateTaskCount [taskId=${taskId}]`, 'color: #3b82f6; font-weight: bold;');
  };

  const logTaskTime = (id, mins) => {
    console.log(`%c[Diagnostic Log] ACTION START: logTaskTime [taskId=${id}, mins=${mins}]`, 'color: #3b82f6; font-weight: bold;');
    const t = tasks.find(item => item.id === id);
    if (!t) {
      console.warn(`[Diagnostic Log] Task ${id} not found for logTaskTime.`);
      return;
    }

    const today = TODAY();
    let updated = { ...t };
    const isDaily = (t.schedule_type || t.type) === 'daily';

    if (isDaily && t.lastActiveDate !== today) {
      updated.completed = false;
      updated.currentCount = 0;
      updated.timeSpent = 0;
      if (t.isRecovering && t.originalTarget !== undefined) {
        updated.targetTime = t.originalTarget;
        updated.isRecovering = false;
        delete updated.originalTarget;
      }
    }

    const newTime = Math.max(0, (updated.timeSpent || 0) + mins);
    const wasCompleted = updated.completed;
    const target = updated.targetTime ?? 15;
    const isDone = newTime >= target;

    updated.timeSpent = newTime;
    updated.completed = isDone;

    const recId = updated.recurringId || getTaskTrackingKey(updated);
    // Bug 4 fix: always use task.completedDates as authoritative source (already sanitized from Firestore).
    let recDates = updated.completedDates ? [...updated.completedDates] : [];

    if (isDone) {
      if (!recDates.includes(today)) {
        recDates.push(today);
      }
    } else {
      recDates = recDates.filter(d => d !== today);
    }

    const { sanitizedDates } = sanitizeAndValidateCompletedDates(recDates, updated.createdAt, updated.id, updated.title, updated.currentStreak);
    const { current: newStreak, best: newBestStreak } = calculateTaskStreak(sanitizedDates);
    const sortedDates = [...sanitizedDates].sort((a, b) => b.localeCompare(a));
    const newLastCompleted = sortedDates.length > 0 ? sortedDates[0] : null;

    updated.completedDates = sanitizedDates;
    updated.currentStreak = newStreak;
    updated.bestStreak = newBestStreak;
    updated.lastCompletedDate = newLastCompleted;
    updated.lastActiveDate = today;
    if (isDone) {
      updated.missedDays = 0;
    }

    // Debug logging for streak audit
    logStreakDebug(updated.title, sanitizedDates, newStreak, newBestStreak, t.currentStreak);

    if (isDaily) {
      const recPayload = {
        title: updated.title,
        type: updated.type || 'daily',
        completedDates: sanitizedDates,
        streak: newStreak
      };
      setRecurringHistory(prev => ({ ...prev, [recId]: { id: recId, ...recPayload } }));
      if (user) {
        db.upsertRecurringHistory(user.id, recId, recPayload);
      }
    }

    if (isDone && !wasCompleted) {
      awardXP(XP_SOURCES.TASK_COMPLETE, `Completed: ${t.title}`);
      incrementCompletions();
    }

    setTasks(prev => prev.map(item => item.id === id ? updated : item));

    if (user) {
      console.log(`%c[Diagnostic Log] BEFORE FIRESTORE WRITE: logTaskTime [taskId=${id}]`, 'color: #eab308; font-weight: bold;');
      db.upsertTask(user.id, updated)
        .then(() => {
          console.log(`%c[Diagnostic Log] WRITE SUCCESS: logTaskTime [taskId=${id}]`, 'color: #22c55e; font-weight: bold;');
        })
        .catch(err => {
          console.error(`%c[Diagnostic Log] WRITE FAILURE: logTaskTime [taskId=${id}]`, 'color: #ef4444; font-weight: bold;', err);
        });
    }
    console.log(`%c[Diagnostic Log] ACTION COMPLETE: logTaskTime [taskId=${id}]`, 'color: #3b82f6; font-weight: bold;');
  };

  const addFocusTime = (seconds) => {
    setSettings(prev => ({
      ...prev,
      focusTimeToday: (prev.focusTimeToday || 0) + seconds
    }));
  };

  const addFocusTimeToHabit = (goalId, habitId, seconds) => {
    const mins = seconds / 60;
    // Always accumulate toward daily focus total
    addFocusTime(seconds);
    if (goalId && habitId) {
      if (goalId === 'DAILY_TASK') logTaskTime(habitId, mins);
      else logHabitTime(goalId, habitId, mins);
    }
  };

  // Sync focus time to DB every minute or on change (debounced)
  useEffect(() => {
    if (!user || loading) return;
    const timer = setTimeout(() => {
      db.upsertUserSettings(user.id, {
        theme: settings.theme,
        focusTimeToday: settings.focusTimeToday,
        lastReset: settings.lastActiveDate
      });
    }, 15000);
    return () => clearTimeout(timer);
  }, [settings.focusTimeToday, settings.theme, user]);

  const addNote = async note => {
    const now = new Date().toISOString();
    const newN = { ...note, id: Date.now().toString(), created_at: now, updated_at: now };
    if (user) {
      try {
        await db.upsertNote(user.id, newN);
      } catch (err) {
        console.error('[Firestore Sync] Failed to add note:', err);
      }
    } else {
      setNotes(prev => [newN, ...prev]);
    }
    return newN;
  };

  const updateNote = async (id, updates) => {
    const n = notes.find(item => item.id === id);
    if (!n) return;
    const updated = { ...n, ...updates, updated_at: new Date().toISOString() };
    if (user) {
      try {
        await db.upsertNote(user.id, updated);
      } catch (err) {
        console.error('[Firestore Sync] Failed to update note:', err);
      }
    } else {
      setNotes(prev => prev.map(item => item.id === id ? updated : item));
    }
  };

  const deleteNote = async id => {
    if (user) {
      try {
        await db.deleteNoteDb(user.id, id);
      } catch (err) {
        console.error('[Firestore Sync] Failed to delete note:', err);
      }
    } else {
      setNotes(prev => prev.filter(n => n.id !== id));
    }
  };

  const addMemory = async (memory) => {
    const newM = {
      ...memory,
      id: memory.id || Date.now().toString(),
      createdAt: memory.createdAt || new Date().toISOString()
    };

    // Save locally
    setMemories(prev => {
      const updated = [newM, ...prev.filter(m => m.id !== newM.id)];
      localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(updated));
      return updated;
    });

    // Save online in Firestore
    if (user) {
      try {
        await db.upsertMemory(user.id, newM);
      } catch (err) {
        console.error('[Firestore Sync] Failed to add memory:', err);
      }
    }
  };

  const deleteMemory = async id => {
    if (user) {
      try {
        await db.deleteMemoryDb(user.id, id);
      } catch (err) {
        console.error('[Firestore Sync] Failed to delete memory:', err);
      }
    } else {
      setMemories(prev => {
        const updated = prev.filter(m => m.id !== id);
        localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(updated));
        return updated;
      });
    }
  };

  const addQuickThought = async (content, emoji) => {
    const newQt = {
      id: Date.now().toString(),
      content,
      emoji: emoji || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // If adding this exceeds 5 thoughts, prune the oldest from DB
    if (user && quickThoughtsRef.current.length >= 5) {
      const sorted = [...quickThoughtsRef.current].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      // keep only the top 4, so the new one fits as the 5th
      const excess = sorted.slice(4);
      for (const item of excess) {
        try {
          await db.deleteQuickThoughtDb(user.id, item.id);
        } catch (e) {
          console.error('[Firestore Sync] Failed to prune quick thought:', e);
        }
      }
    }

    setQuickThoughts(prev => {
      const updated = [newQt, ...prev.filter(q => q.id !== newQt.id)].slice(0, 5);
      localStorage.setItem(STORAGE_KEYS.QUICK_THOUGHTS, JSON.stringify(updated));
      return updated;
    });

    if (user) {
      try {
        await db.upsertQuickThought(user.id, newQt);
      } catch (err) {
        console.error('[Firestore Sync] Failed to add quick thought:', err);
      }
    }
    return newQt;
  };

  const updateQuickThought = async (id, content, emoji) => {
    const qt = quickThoughts.find(item => item.id === id);
    if (!qt) return;
    const updated = { ...qt, content, emoji, updated_at: new Date().toISOString() };

    setQuickThoughts(prev => {
      const updatedList = prev.map(item => item.id === id ? updated : item);
      localStorage.setItem(STORAGE_KEYS.QUICK_THOUGHTS, JSON.stringify(updatedList));
      return updatedList;
    });

    if (user) {
      try {
        await db.upsertQuickThought(user.id, updated);
      } catch (err) {
        console.error('[Firestore Sync] Failed to update quick thought:', err);
      }
    }
  };

  const deleteQuickThought = async id => {
    setQuickThoughts(prev => {
      const updatedList = prev.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEYS.QUICK_THOUGHTS, JSON.stringify(updatedList));
      return updatedList;
    });

    if (user) {
      try {
        await db.deleteQuickThoughtDb(user.id, id);
      } catch (err) {
        console.error('[Firestore Sync] Failed to delete quick thought:', err);
      }
    }
  };

  const clearProfileData = async () => {
    console.log('%c[Diagnostic Log] ACTION START: clearProfileData', 'color: #3b82f6; font-weight: bold;');
    if (!user) {
      console.warn('[Diagnostic Log] No user found for clearProfileData.');
      return;
    }
    try {
      // 1. Clear local state instantly to provide optimistic, immediate feedback
      setGoals([]);
      setTasks([]);
      setTaskLogs({});
      setMemories([]);
      setQuickThoughts([]);
      setAiInsights([]);
      setRecoveryStrategies([]);
      setSmartSuggestions(null);
      setXpData(DEFAULT_XP_DATA);
      setSettings(prev => ({
        theme: prev.theme || 'dark',
        focusTimeToday: 0,
        lastActiveDate: '',
        focusHistory: {},
        dismissedInsights: [],
        weeklyIntentions: {},
        lastPushDate: ''
      }));

      // Clear deleted goal IDs locally
      setDeletedGoalIds([]);
      localStorage.removeItem('gf_deleted_goal_ids');

      // Clear deleted habit IDs locally
      setDeletedHabitIds([]);
      localStorage.removeItem('gf_deleted_habit_ids');

      // 2. Reset LocalStorage keys
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify({}));
      localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.QUICK_THOUGHTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.XP, JSON.stringify(DEFAULT_XP_DATA));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
        theme: settings.theme || 'dark',
        focusTimeToday: 0,
        lastActiveDate: '',
        focusHistory: {},
        dismissedInsights: [],
        weeklyIntentions: {},
        lastPushDate: ''
      }));

      // 3. Perform Firestore delete
      console.log('%c[Diagnostic Log] BEFORE FIRESTORE WRITE: clearProfileData', 'color: #eab308; font-weight: bold;');
      await db.clearUserDataDb(user.id);
      console.log('%c[Diagnostic Log] WRITE SUCCESS: clearProfileData', 'color: #22c55e; font-weight: bold;');

      console.log('[Clear Profile] Entire ecosystem reset completed successfully.');
    } catch (err) {
      console.error('%c[Diagnostic Log] WRITE FAILURE: clearProfileData', 'color: #ef4444; font-weight: bold;', err);
      console.error('[Clear Profile] Failure during profile data wipe:', err);
      throw err;
    }
  };


  // Sync XP data to DB on change (debounced and guarded against echo loops)
  useEffect(() => {
    if (!user || loading) return;
    if (xpData.totalXP === lastSyncedXpRef.current) return;

    const timer = setTimeout(() => {
      lastSyncedXpRef.current = xpData.totalXP;
      db.upsertXpData(user.id, xpData);
    }, 10000);
    return () => clearTimeout(timer);
  }, [xpData, user, loading]);

  // Gamification engine moved to top for initialization safety

  // ── Gamification: Badge Evaluation ──────────────────────
  const currentLevelInfo = useMemo(() => getLevelFromXP(xpData.totalXP), [xpData.totalXP]);

  const badgeState = useMemo(() => ({
    goals, tasks, notes,
    focusHistory, focusTime,
    perfectDays: xpData.perfectDays || 0,
    level: currentLevelInfo.level,
    comebackCount: xpData.comebackCount || 0,
    totalCompletions: xpData.totalCompletions || 0,
  }), [goals, tasks, notes, focusHistory, focusTime, xpData.perfectDays, currentLevelInfo.level, xpData.comebackCount, xpData.totalCompletions]);

  const currentlyEarnedBadges = useMemo(() => evaluateBadges(badgeState), [badgeState]);

  // Sync earned badges with derived state and handle notifications
  const initialLoadRef = useRef(true);
  useEffect(() => {
    if (loading) return;

    const savedBadges = xpData.earnedBadges || [];
    const notifiedBadges = xpData.notifiedBadges || [];

    // 1. Detect badges in derived state that aren't in persisted state
    const newlyDerivedBadges = currentlyEarnedBadges.filter(id => !savedBadges.includes(id));

    if (newlyDerivedBadges.length > 0) {
      setXpData(prev => {
        const now = new Date().toISOString();
        const newDates = { ...prev.badgeUnlockDates };
        newlyDerivedBadges.forEach(id => { if (!newDates[id]) newDates[id] = now; });

        return {
          ...prev,
          earnedBadges: [...new Set([...(prev.earnedBadges || []), ...newlyDerivedBadges])],
          badgeUnlockDates: newDates
        };
      });
    }

    // 2. Migration/Initial State: If this is the first load and we have earned badges but no notifications recorded,
    // mark existing badges as notified to prevent a popup explosion.
    if (initialLoadRef.current) {
      if (notifiedBadges.length === 0 && savedBadges.length > 0) {
        setXpData(prev => ({ ...prev, notifiedBadges: prev.earnedBadges || [] }));
      }
      initialLoadRef.current = false;
      return;
    }

    // 3. Queue notifications for badges that are earned but not yet notified
    // A badge is "newly earned" for notification purposes if it's in earnedBadges but NOT in notifiedBadges
    const pendingNotifications = savedBadges.filter(id => !notifiedBadges.includes(id));

    if (pendingNotifications.length > 0) {
      const addedToQueue = [];
      pendingNotifications.forEach(badgeId => {
        const badgeDef = getBadgeById(badgeId);
        // Ensure it's not already in the local queue
        if (badgeDef && !badgeQueueRef.current.find(b => b.id === badgeId)) {
          badgeQueueRef.current.push(badgeDef);
          addedToQueue.push(badgeId);
        }
      });

      if (addedToQueue.length > 0 && !badgeUnlockEvent) {
        setBadgeUnlockEvent(badgeQueueRef.current.shift());
      }
    }
  }, [currentlyEarnedBadges, xpData.earnedBadges, xpData.notifiedBadges, loading, badgeUnlockEvent]);

  const dismissBadgeEvent = useCallback(() => {
    const currentBadgeId = badgeUnlockEvent?.id;

    if (currentBadgeId) {
      // Mark as notified persistently
      setXpData(prev => {
        const notified = prev.notifiedBadges || [];
        if (notified.includes(currentBadgeId)) return prev;
        return {
          ...prev,
          notifiedBadges: [...notified, currentBadgeId]
        };
      });
    }

    // Process next in queue
    if (badgeQueueRef.current.length > 0) {
      setBadgeUnlockEvent(badgeQueueRef.current.shift());
    } else {
      setBadgeUnlockEvent(null);
    }
  }, [badgeUnlockEvent]);

  // ── Gamification: Daily XP Checks (in daily reset) ─────
  // Perfect day check & streak milestone XP are awarded during daily reset.
  // We hook into the existing daily reset effect by checking in the task summary effect.
  const lastXPDateRef = useRef(xpData.lastXPDate || '');
  useEffect(() => {
    lastXPDateRef.current = xpData.lastXPDate || '';
  }, [xpData.lastXPDate]);

  const xpHistoryRef = useRef(xpData.xpHistory || []);
  useEffect(() => {
    xpHistoryRef.current = xpData.xpHistory || [];
  }, [xpData.xpHistory]);

  useEffect(() => {
    if (loading) return;
    const today = TODAY();
    if (lastXPDateRef.current === today) return;

    // Check if yesterday was a perfect day
    const yesterday = addDays(today, -1);
    const ydayLog = taskLogs[yesterday];
    if (ydayLog && ydayLog.total_tasks > 0 && ydayLog.completed_tasks === ydayLog.total_tasks) {
      awardXP(XP_SOURCES.PERFECT_DAY, `Perfect day on ${yesterday}`);
      recordPerfectDay();
    }

    // Check streak milestones (every 5 days)
    const allStreaks = [
      ...goals.flatMap(g => (g.habits || []).map(h => h.streak || 0)),
      ...tasks.map(t => t.currentStreak || 0)
    ];
    const maxStreak = Math.max(0, ...allStreaks);
    if (maxStreak > 0 && maxStreak % 5 === 0) {
      const milestoneKey = `streak_${maxStreak}`;
      const alreadyAwarded = (xpHistoryRef.current || []).some(e => e.reason === milestoneKey);
      if (!alreadyAwarded) {
        awardXP(XP_SOURCES.STREAK_MILESTONE, `${maxStreak}-day streak milestone`);
      }
    }

    lastXPDateRef.current = today;
    setXpData(prev => ({ ...prev, lastXPDate: today }));
  }, [loading, taskLogs, goals, tasks]);

  // ── Weekly Intentions ──────────────────────────────────────────
  // ── Scheduled Events CRUD ──────────────────────────────────
  const addScheduledEvent = async (eventData) => {
    const eventId = Date.now().toString();
    const newEvent = {
      ...eventData,
      id: eventId,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setScheduledEvents(prev => [...prev, newEvent].sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')));
    if (user) {
      try { await db.upsertScheduledEvent(user.id, newEvent); }
      catch (err) { console.error('[Sync] Failed to add scheduled event:', err); }
    }
    // Schedule local notification reminder for the new event
    if (newEvent.reminderEnabled && newEvent.time) {
      scheduleEventReminder(newEvent);
    }
  };

  const updateScheduledEvent = async (id, updates) => {
    setScheduledEvents(prev =>
      prev.map(e => (e.id === id ? { ...e, ...updates } : e))
          .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    );
    if (user) {
      const target = scheduledEvents.find(e => e.id === id);
      if (target) {
        try { await db.upsertScheduledEvent(user.id, { ...target, ...updates, id }); }
        catch (err) { console.error('[Sync] Failed to update scheduled event:', err); }
      }
      // Re-schedule event reminder with updated data
      const updatedEvent = { ...scheduledEvents.find(e => e.id === id), ...updates, id };
      // Always cancel first to remove stale alarm
      cancelEventReminder(id);
      if (updatedEvent.reminderEnabled && updatedEvent.time && !updatedEvent.completed) {
        scheduleEventReminder(updatedEvent);
      }
    }
  };

  const deleteScheduledEvent = async (id) => {
    setScheduledEvents(prev => prev.filter(e => e.id !== id));
    // Cancel the notification reminder for the deleted event
    cancelEventReminder(id);
    if (user) {
      try { await db.deleteScheduledEventDb(user.id, id); }
      catch (err) { console.error('[Sync] Failed to delete scheduled event:', err); }
    }
  };

  const saveWeeklyIntention = useCallback((weekKey, intentionText) => {
    setSettings(prev => ({
      ...prev,
      weeklyIntentions: {
        ...(prev.weeklyIntentions || {}),
        [weekKey]: intentionText
      }
    }));
  }, []);

  const goalsValue = {
    goals: sortedGoals, addGoal, updateGoal, editGoalSystem, deleteGoal, extendGoalDeadline,
    setFocusGoal, reorderGoals, moveGoal,
    addHabit, deleteHabit, logHabitTime, toggleHabitCheck, updateHabitCount, updateHabitReminder,
    allHabits, completedGoalForCelebration, setCompletedGoalForCelebration,
    loading, syncError, retrySync: syncFromCloud, clearProfileData
  };

  const tasksValue = {
    tasks, addTask, updateTask, deleteTask, logTaskTime, toggleTaskComplete, updateTaskCount,
    todayTasks, taskLogs, weeklyReport, totalItems, completedItems, accuracy, taskStreak,
    loading, syncError, retrySync: syncFromCloud, clearProfileData
  };

  const focusValue = {
    focusTime, focusHistory, addFocusTime, addFocusTimeToHabit,
    theme, toggleTheme, settings, saveWeeklyIntention,
    loading, syncError, retrySync: syncFromCloud
  };

  const aiValue = {
    aiInsights, recoveryStrategies, dismissInsight, applyRecoveryPlan, smartSuggestions,
    alerts, insights: getInsights(accuracy, avgStreak, focusTime), disciplineScore, userLevel,
    loading, syncError
  };

  const notesValue = {
    notes, addNote, updateNote, deleteNote,
    memories, addMemory, deleteMemory,
    quickThoughts, addQuickThought, updateQuickThought, deleteQuickThought,
    loading, syncError, retrySync: syncFromCloud, clearProfileData
  };

  const gamificationValue = {
    xpData, awardXP, incrementCompletions, awardFocusXP, recordComeback,
    currentLevelInfo, levelUpEvent, setLevelUpEvent,
    badgeUnlockEvent, setBadgeUnlockEvent, dismissBadgeEvent,
    currentlyEarnedBadges,
    loading, syncError
  };

  const value = {
    goals: sortedGoals, addGoal, updateGoal, editGoalSystem, deleteGoal, extendGoalDeadline,
    setFocusGoal, reorderGoals, moveGoal,
    addHabit, deleteHabit, logHabitTime, toggleHabitCheck, updateHabitCount, updateHabitReminder,
    tasks, addTask, updateTask, deleteTask, logTaskTime, toggleTaskComplete, updateTaskCount,
    focusTime, focusHistory, addFocusTime, addFocusTimeToHabit,
    theme, toggleTheme,
    accuracy, alerts, weeklyReport, disciplineScore, userLevel, insights: getInsights(accuracy, avgStreak, focusTime),
    notes, addNote, updateNote, deleteNote,
    loading, taskLogs, syncError, retrySync: syncFromCloud,
    totalItems, completedItems, todayTasks, allHabits, taskStreak,
    // Gamification
    xpData, awardXP, incrementCompletions, awardFocusXP, recordComeback,
    currentLevelInfo, levelUpEvent, setLevelUpEvent,
    badgeUnlockEvent, setBadgeUnlockEvent, dismissBadgeEvent,
    currentlyEarnedBadges,
    aiInsights,
    recoveryStrategies,
    dismissInsight,
    applyRecoveryPlan,
    smartSuggestions,
    settings,
    saveWeeklyIntention,
    // Memories & Completed Celebration Modal
    memories, addMemory, deleteMemory,
    // Quick Thoughts
    quickThoughts, addQuickThought, updateQuickThought, deleteQuickThought,
    // Scheduled Events
    scheduledEvents, addScheduledEvent, updateScheduledEvent, deleteScheduledEvent,
    completedGoalForCelebration, setCompletedGoalForCelebration,
    clearProfileData
  };

  return (
    <AppContext.Provider value={value}>
      <GoalsContext.Provider value={goalsValue}>
        <TasksContext.Provider value={tasksValue}>
          <FocusContext.Provider value={focusValue}>
            <AIContext.Provider value={aiValue}>
              <NotesContext.Provider value={notesValue}>
                <GamificationContext.Provider value={gamificationValue}>
                  {children}
                </GamificationContext.Provider>
              </NotesContext.Provider>
            </AIContext.Provider>
          </FocusContext.Provider>
        </TasksContext.Provider>
      </GoalsContext.Provider>
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);

export const useGoals = () => {
  const context = useContext(GoalsContext);
  if (!context) throw new Error('useGoals must be used within AppProvider');
  return context;
};

export const useTasks = () => {
  const context = useContext(TasksContext);
  if (!context) throw new Error('useTasks must be used within AppProvider');
  return context;
};

export const useFocus = () => {
  const context = useContext(FocusContext);
  if (!context) throw new Error('useFocus must be used within AppProvider');
  return context;
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) throw new Error('useAI must be used within AppProvider');
  return context;
};

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) throw new Error('useNotes must be used within AppProvider');
  return context;
};

export const useGamification = () => {
  const context = useContext(GamificationContext);
  if (!context) throw new Error('useGamification must be used within AppProvider');
  return context;
};
