import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as db from '../lib/firebaseDb';
import { fireDb } from '../lib/firebase';
import { onSnapshot, query, collection, doc, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { TODAY, addDays, diffDays } from '../utils/dateUtils';
import {
  isGoalDoneToday,
  isTaskDone,
  calculateAccuracy,
  calculateDisciplineScore,
  getUserLevel,
  getInsights,
  calculateWeeklyReport,
  getSmartAlerts,
  isHabitScheduledToday
} from '../utils/calculationUtils';
import { XP_SOURCES, getLevelFromXP, evaluateBadges, getNewlyEarnedBadges } from '../utils/gamificationEngine';
import { scheduleLocalNotification } from '../utils/notificationUtils';
import {
  analyzeUserBehavior,
  generateRecoveryStrategies,
  getSmartSuggestions
} from '../utils/aiAnalysisEngine';


const AppContext = createContext();

const STORAGE_KEYS = {
  GOALS: 'goalforge_goals',
  TASKS: 'goalforge_tasks',
  LOGS: 'goalforge_logs',
  SETTINGS: 'goalforge_settings',
  NOTES: 'goalforge_notes',
  XP: 'goalforge_xp'
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

  // Initial local state
  const [goals, setGoals] = useState(() => safeParse(STORAGE_KEYS.GOALS, []));
  const [tasks, setTasks] = useState(() => safeParse(STORAGE_KEYS.TASKS, []));
  const [taskLogs, setTaskLogs] = useState(() => safeParse(STORAGE_KEYS.LOGS, {}));
  const [notes, setNotes] = useState(() => safeParse(STORAGE_KEYS.NOTES, []));

  const tasksRef = useRef([]);
  const notesRef = useRef([]);
  const goalsRef = useRef([]);

  useEffect(() => { tasksRef.current = tasks; }, [tasks]);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { goalsRef.current = goals; }, [goals]);

  // Gamification state
  const [xpData, setXpData] = useState(() => ({ ...DEFAULT_XP_DATA, ...safeParse(STORAGE_KEYS.XP, DEFAULT_XP_DATA) }));
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
    lastPushDate: ''
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

  const allHabits = useMemo(() => (goals || []).flatMap(g => g.habits || []), [goals]);
  const goalsDone = useMemo(() => (goals || []).filter(g => isGoalDoneToday(g)).length, [goals]);
  const tasksDone = useMemo(() => (todayTasks || []).filter(t => isTaskDone(t)).length, [todayTasks]);

  const totalItems = (goals?.length || 0) + (todayTasks?.length || 0);
  const completedItems = (goalsDone || 0) + (tasksDone || 0);

  const accuracy = useMemo(() => {
    return totalItems === 0 ? 100 : Math.round((completedItems / totalItems) * 100);
  }, [completedItems, totalItems]);

  const avgStreak = useMemo(() => {
    if (!goals || goals.length === 0) return 0;
    const totalBestStreaks = goals.reduce((acc, goal) => {
      const habits = goal.habits || [];
      const bestHabitStreak = habits.length === 0 ? 0 : Math.max(0, ...habits.map(h => h.streak || 0));
      return acc + bestHabitStreak;
    }, 0);
    return totalBestStreaks / goals.length;
  }, [goals]);

  const disciplineScore = calculateDisciplineScore(accuracy, avgStreak, focusTime);
  const userLevel = getUserLevel(disciplineScore);

  const weeklyReport = useMemo(() => calculateWeeklyReport(taskLogs), [taskLogs]);

  const smartAlerts = useMemo(() =>
    getSmartAlerts(accuracy, goals, tasks, weeklyReport),
    [accuracy, goals, tasks, weeklyReport]
  );

  const alerts = useMemo(() => {
    return [...smartAlerts];
  }, [smartAlerts]);

  // ── Firebase Initial Load ────────────────────────────────
  // -- Local Persistence Effects --
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(taskLogs)); }, [taskLogs]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.XP, JSON.stringify(xpData)); }, [xpData]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  }, [settings]);

  // ── Firebase Real-time Subscription Model ─────────────────
  const isInitialTasksLoad = useRef(true);
  const isInitialNotesLoad = useRef(true);
  const isInitialGoalsLoad = useRef(true);

  // Expose syncFromCloud as a no-op or status logger
  const syncFromCloud = async () => {
    console.log('[Realtime Sync] Real-time engine is active and syncing continuously.');
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setSyncError(null);

    const unsubscribes = [];

    try {
      // 1. Subscribe to Tasks Collection
      const tasksQuery = query(collection(fireDb, 'users', user.id, 'tasks'), orderBy('created_at', 'desc'));
      const unsubTasks = onSnapshot(tasksQuery, { includeMetadataChanges: true }, (snapshot) => {
        const updatedTasks = snapshot.docs.map(doc => {
          const t = doc.data();
          return {
            id: doc.id,
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
        setLoading(false);
      }, (error) => {
        console.error('[Realtime Sync] Error in Tasks subscription:', error);
        setSyncError('Real-time task synchronization paused.');
      });
      unsubscribes.push(unsubTasks);

      // 2. Subscribe to Notes Collection
      const notesQuery = query(collection(fireDb, 'users', user.id, 'notes'), orderBy('created_at', 'desc'));
      const unsubNotes = onSnapshot(notesQuery, { includeMetadataChanges: true }, (snapshot) => {
        const updatedNotes = snapshot.docs.map(doc => {
          const n = doc.data();
          return {
            id: doc.id,
            title: n.title || '',
            content: n.content || '',
            tags: n.tags || [],
            color: n.color || '',
            checklist: n.checklist || null,
            pinned: n.pinned || false,
            folder: n.folder || '',
            created_at: n.created_at,
            updated_at: n.updated_at,
            syncPending: doc.metadata.hasPendingWrites,
          };
        });

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

      // 3. Subscribe to Goals & nested habits
      let activeGoalSnapshotId = 0;
      const goalsQuery = query(collection(fireDb, 'users', user.id, 'goals'), orderBy('created_at', 'desc'));
      const unsubGoals = onSnapshot(goalsQuery, { includeMetadataChanges: true }, async (snapshot) => {
        const currentId = ++activeGoalSnapshotId;
        const goalsList = [];

        for (const goalDoc of snapshot.docs) {
          const g = goalDoc.data();
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

          goalsList.push({
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
            syncPending: goalDoc.metadata.hasPendingWrites,
          });
        }

        if (currentId === activeGoalSnapshotId) {
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
          setGoals(goalsList);
        }
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

      // 5. Subscribe to Focus History Collection
      const focusQuery = collection(fireDb, 'users', user.id, 'focus_history');
      const unsubFocus = onSnapshot(focusQuery, (snapshot) => {
        const history = {};
        snapshot.docs.forEach(doc => {
          history[doc.id] = doc.data().seconds;
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
          setSettings(prev => ({
            ...prev,
            theme: s.theme || prev.theme,
            focusTimeToday: s.focus_time_today || prev.focusTimeToday,
            lastActiveDate: s.last_reset || prev.lastActiveDate,
          }));
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
          setXpData({
            totalXP: x.total_xp || 0,
            level: x.level || 1,
            earnedBadges: x.earned_badges || [],
            badgeUnlockDates: x.badge_unlock_dates || {},
            perfectDays: x.perfect_days || 0,
            comebackCount: x.comeback_count || 0,
            totalCompletions: x.total_completions || 0,
            lastXPDate: x.last_xp_date || '',
            xpHistory: x.xp_history || [],
          });
        }
      }, (error) => {
        console.error('[Realtime Sync] Error in XP subscription:', error);
      });
      unsubscribes.push(unsubXp);

    } catch (err) {
      console.error('[Realtime Sync] Error mounting realtime listeners:', err);
      setSyncError('Offline-first fallback active.');
      setLoading(false);
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
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

  useEffect(() => {
    if (loading) return;

    const todayStr = currentDate;
    const yesterdayStr = addDays(todayStr, -1);
    const lastActive = settings.lastActiveDate || yesterdayStr;

    if (lastActive === todayStr) return; // Already reset for today

    // 1. Calculate updated goals
    const updatedGoals = goals.map(goal => {
      const gLastActive = goal.lastActiveDate || lastActive;
      const start = new Date(gLastActive);
      const end = new Date(todayStr);
      let daysDiff = 0;
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
      }

      if (daysDiff <= 0) return goal;

      const updatedHabits = (goal.habits || []).map(h => {
        let updatedH = { ...h };
        const wasDone = updatedH.completed ||
                        (updatedH.type === 'time' && (updatedH.timeSpent || 0) >= (updatedH.targetTime || 15)) ||
                        (updatedH.type === 'count' && (updatedH.currentCount || 0) >= (updatedH.targetCount || 10));

        // Check if yesterday (gLastActive) was a scheduled day for this habit
        const lastActiveDay = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(gLastActive).getDay()];
        const wasScheduled = !h.scheduleDays || h.scheduleDays.length === 0 || h.scheduleDays.includes(lastActiveDay);

        if (!wasScheduled) {
          // Rest day — no miss, no streak impact
        } else if (!wasDone) {
          updatedH.missedDays = (updatedH.missedDays || 0) + 1;
        } else {
          updatedH.missedDays = 0;
        }

        // Handle multi-day gaps: count only scheduled days in the gap
        if (daysDiff > 1) {
          for (let gap = 1; gap < daysDiff; gap++) {
            const gapDate = new Date(gLastActive);
            gapDate.setDate(gapDate.getDate() + gap);
            const gapDay = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][gapDate.getDay()];
            const gapScheduled = !h.scheduleDays || h.scheduleDays.length === 0 || h.scheduleDays.includes(gapDay);
            if (gapScheduled) updatedH.missedDays += 1;
          }
        }

        // Apply 3-day failure rule
        if (updatedH.missedDays >= 3) {
          updatedH.streak = 0;
          updatedH.missedDays = Math.min(3, updatedH.missedDays);
        }

        return { ...updatedH, timeSpent: 0, completed: false, currentCount: 0, lastActiveDate: todayStr };
      });

      // Update goal level missed days
      const doneOnLastActive = (goal.mode === 'ANY' && updatedHabits.some(h => h.lastCompletedDate === gLastActive)) ||
        (goal.mode === 'ALL' && updatedHabits.every(h => h.lastCompletedDate === gLastActive)) ||
        (goal.mode === 'CUSTOM' && updatedHabits.filter(h => h.lastCompletedDate === gLastActive).length >= (goal.minHabits || 1));

      let newGoalMissed = goal.missedDays || 0;
      let newGoalStreak = goal.streak || 0;
      let newDaysCompleted = goal.daysCompleted || 0;

      if (!doneOnLastActive) {
        newGoalMissed += 1;
      } else {
        newGoalMissed = 0;
        newDaysCompleted += 1;
      }

      // Process goal gap
      if (daysDiff > 1) {
        for (let i = 1; i < daysDiff; i++) {
          newGoalMissed += 1;
        }
      }

      // RESILIENCE RULE: Goal streak only resets to 0 if ALL habits have failed (missedDays >= 3)
      const allHabitsFailed = updatedHabits.length > 0 && updatedHabits.every(h => (h.missedDays || 0) >= 3);
      if (allHabitsFailed) {
        newGoalStreak = 0;
        newGoalMissed = Math.max(3, newGoalMissed); // Ensure goal missedDays also reflects failure
      }

      const totalDays = Math.max(1, diffDays(goal.startDate || goal.createdAt || todayStr, goal.deadline || addDays(todayStr, 30)));
      const progress = Math.min(100, Math.round((newDaysCompleted / totalDays) * 100));

      return {
        ...goal,
        habits: updatedHabits,
        missedDays: newGoalMissed,
        streak: newGoalStreak,
        daysCompleted: newDaysCompleted,
        progress,
        lastActiveDate: todayStr
      };
    });

    // 2. Calculate updated tasks
    const updatedTasks = tasks.map(t => {
      if ((t.schedule_type || t.type) === 'daily') {
        const tLastActive = t.lastActiveDate || lastActive;
        const start = new Date(tLastActive);
        const end = new Date(todayStr);
        let daysDiff = 0;
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
        }
        if (daysDiff <= 0) return t;

        let newMissed = t.missedDays || 0;
        let newStreak = t.currentStreak || 0;

        if (!t.completed &&
          !(t.completionType === 'count' && (t.currentCount || 0) >= (t.targetCount || 10)) &&
          !(t.completionType === 'time' && (t.timeSpent || 0) >= (t.targetTime || 30))) {
          newMissed += 1;
        } else {
          newMissed = 0;
        }

        if (daysDiff > 1) {
          for (let i = 1; i < daysDiff; i++) {
            newMissed += 1;
            if (newMissed >= 3) { newStreak = 0; newMissed = 0; }
          }
        }
        if (newMissed >= 3) { newStreak = 0; newMissed = 0; }

        return { ...t, timeSpent: 0, currentCount: 0, completed: false, currentStreak: newStreak, missedDays: newMissed, lastActiveDate: todayStr };
      }
      return t;
    });

    // 3. Update states
    setGoals(updatedGoals);
    setTasks(updatedTasks);
    setSettings(prev => ({ ...prev, focusTimeToday: 0, lastActiveDate: todayStr }));

    // 4. Persist to DB
    if (user) {
      updatedGoals.forEach(g => {
        db.upsertGoal(user.id, g);
        g.habits.forEach(h => db.upsertHabit(user.id, g.id, h));
      });
      updatedTasks.forEach(t => {
        if ((t.schedule_type || t.type) === 'daily') db.upsertTask(user.id, t);
      });
      db.upsertUserSettings(user.id, { theme, focusTimeToday: 0, lastReset: todayStr });
    }

  }, [loading, user, settings.lastActiveDate, currentDate, goals, tasks]);

  // ── Automatic Daily Summary Sync ─────────────────────────
  useEffect(() => {
    if (loading) return;
    const today = TODAY();
    const summary = {
      date: today,
      total_tasks: totalItems,
      completed_tasks: completedItems,
      time_spent: (todayTasks || []).reduce((acc, t) => acc + (t.timeSpent || 0), 0) + (allHabits || []).reduce((acc, h) => acc + (h.timeSpent || 0), 0),
      auto_completed: true
    };

    setTaskLogs(prev => {
      const current = prev[today];
      if (current && current.total_tasks === summary.total_tasks && current.completed_tasks === summary.completed_tasks && current.time_spent === summary.time_spent) return prev;
      return { ...prev, [today]: summary };
    });
    if (user) db.upsertTaskLog(user.id, summary);
  }, [completedItems, totalItems, loading, user]);

  // ── AI Analysis Effect ───────────────────────────────────
  useEffect(() => {
    if (loading) return;

    const insights = analyzeUserBehavior(goals, tasks, taskLogs, focusTime);
    const strategies = generateRecoveryStrategies(goals, tasks);
    const suggestion = getSmartSuggestions(new Date(), tasks, accuracy);

    // Dismissed IDs are date-stamped (e.g. 'peak_performance__2026-05-05')
    // so the same insight-type can re-appear the next day with fresh data.
    const todayKey = TODAY();
    const dismissed = settings.dismissedInsights || [];
    const filteredInsights = insights.filter(i => !dismissed.includes(`${i.id}__${todayKey}`));
    const filteredStrategies = strategies.filter(s => !dismissed.includes(`${s.id}__${todayKey}`));

    setAiInsights(filteredInsights);
    setRecoveryStrategies(filteredStrategies);
    setSmartSuggestions(suggestion);
  }, [goals, tasks, taskLogs, focusTime, accuracy, settings.dismissedInsights, loading]);

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

  const applyRecoveryPlan = (plan) => {
    if (plan.isHabit) {
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
    dismissInsight(`recovery_${plan.itemId}`);
    awardXP(10, 'Recovery plan activated');
  };

  // ── Actions ──────────────────────────────────────────────
  const addGoal = (goal) => {
    const goalId = Date.now().toString();
    const initialHabits = (goal.habits || []).map(h => ({
      ...h,
      id: h.id || (Date.now() + Math.random()).toString(),
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
      createdAt: TODAY(),
      lastActiveDate: TODAY(),
      habits: initialHabits
    };
    setGoals(prev => [newG, ...prev]);
    if (user) {
      db.upsertGoal(user.id, newG);
      initialHabits.forEach(h => db.upsertHabit(user.id, goalId, h));
    }
  };

  const updateGoal = (id, updates) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        const updated = { ...g, ...updates };
        if (user) db.upsertGoal(user.id, updated);
        return updated;
      }
      return g;
    }));
  };



  const extendGoalDeadline = (id, newDeadline) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        const extension = { old_date: g.deadline, new_date: newDeadline, extended_on: TODAY() };
        const updated = { ...g, deadline: newDeadline, extensions: [...(g.extensions || []), extension] };
        if (user) db.upsertGoal(user.id, updated);
        return updated;
      }
      return g;
    }));
  };

  const deleteGoal = id => { setGoals(prev => prev.filter(g => g.id !== id)); if (user) db.deleteGoalDb(user.id, id); };

  const addHabit = (goalId, habit) => {
    const newH = {
      ...habit,
      id: Date.now().toString(),
      timeSpent: 0,
      currentCount: 0,
      completed: false,
      streak: 0,
      lastCompletedDate: null,
      missedDays: 0,
      lastActiveDate: TODAY()
    };
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        const updatedG = { ...g, habits: [...g.habits, newH] };
        if (user) db.upsertHabit(user.id, goalId, newH);
        return updatedG;
      }
      return g;
    }));
  };

  const deleteHabit = (goalId, habitId) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) { if (user) db.deleteHabitDb(user.id, goalId, habitId); return { ...g, habits: g.habits.filter(h => h.id !== habitId) }; }
      return g;
    }));
  };

  const logHabitTime = (goalId, habitId, minutes) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const today = TODAY();
      const yesterday = addDays(today, -1);

      const updatedHabits = goal.habits.map(h => {
        if (h.id === habitId) {
          const newTime = (h.timeSpent || 0) + minutes;
          let updatedH = { ...h, timeSpent: newTime };

          // Rule 3: Check if just completed
          if (newTime >= (h.targetTime || 15) && !h.completed) {
            updatedH.completed = true;
            if (h.lastCompletedDate === yesterday) updatedH.streak += 1;
            else if (h.lastCompletedDate !== today) updatedH.streak = 1;
            updatedH.lastCompletedDate = today;
            updatedH.missedDays = 0;
            // XP: Habit completed via time
            awardXP(XP_SOURCES.HABIT_COMPLETE, `Completed: ${h.title}`);
            incrementCompletions();
            // Comeback detection
            if ((h.missedDays || 0) >= 2) recordComeback();
          }

          if (user) db.upsertHabit(user.id, goalId, updatedH);
          return updatedH;
        }
        return h;
      });

      const updatedGoal = { ...goal, habits: updatedHabits };

      // Update Goal Streak if just completed
      const isGoalDone = (goal.mode === 'ANY' && updatedHabits.some(h => h.lastCompletedDate === today)) ||
        (goal.mode === 'ALL' && updatedHabits.every(h => h.lastCompletedDate === today)) ||
        (goal.mode === 'CUSTOM' && updatedHabits.filter(h => h.lastCompletedDate === today).length >= (goal.minHabits || 1));

      if (isGoalDone && updatedGoal.lastCompletedDate !== today) {
        let newStreak = updatedGoal.streak || 0;
        if (updatedGoal.lastCompletedDate === yesterday) newStreak += 1;
        else newStreak = 1;
        updatedGoal.streak = newStreak;
        updatedGoal.lastCompletedDate = today;
        updatedGoal.missedDays = 0;
      }

      updatedGoal.progress = calculateOverallProgress(updatedGoal);
      if (user) db.upsertGoal(user.id, updatedGoal);
      return updatedGoal;
    }));
  };

  const calculateOverallProgress = (g) => {
    const totalDays = diffDays(g.startDate || g.createdAt || TODAY(), g.deadline || addDays(TODAY(), 30));
    const currentDays = (g.daysCompleted || 0) + (isGoalDoneToday(g) ? 1 : 0);
    return Math.min(100, Math.round((currentDays / (totalDays || 1)) * 100));
  };

  const toggleHabitCheck = (goalId, habitId) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const today = TODAY();
      const yesterday = addDays(today, -1);

      const updatedHabits = goal.habits.map(h => {
        if (h.id === habitId) {
          let updatedH = { ...h };
          let isDone = false;
          if (h.type === 'check') {
            updatedH.completed = !h.completed;
            isDone = updatedH.completed;
          } else if (h.type === 'count') {
            const target = h.targetCount || 10;
            updatedH.currentCount = (h.currentCount >= target) ? 0 : target;
            updatedH.completed = updatedH.currentCount >= target;
            isDone = updatedH.completed;
          } else {
            const target = h.targetTime || 15;
            updatedH.timeSpent = (h.timeSpent >= target) ? 0 : target;
            updatedH.completed = updatedH.timeSpent >= target;
            isDone = updatedH.completed;
          }

          if (isDone && h.lastCompletedDate !== today) {
            if (h.lastCompletedDate === yesterday) updatedH.streak += 1;
            else updatedH.streak = 1;
            updatedH.lastCompletedDate = today;
            updatedH.missedDays = 0;
          }
          if (user) db.upsertHabit(user.id, goalId, updatedH);
          return updatedH;
        }
        return h;
      });

      const updatedGoal = { ...goal, habits: updatedHabits };

      // Update Goal Streak if just completed
      const isGoalDone = (goal.mode === 'ANY' && updatedHabits.some(h => h.lastCompletedDate === today)) ||
        (goal.mode === 'ALL' && updatedHabits.every(h => h.lastCompletedDate === today)) ||
        (goal.mode === 'CUSTOM' && updatedHabits.filter(h => h.lastCompletedDate === today).length >= (goal.minHabits || 1));

      if (isGoalDone && updatedGoal.lastCompletedDate !== today) {
        let newStreak = updatedGoal.streak || 0;
        if (updatedGoal.lastCompletedDate === yesterday) newStreak += 1;
        else newStreak = 1;
        updatedGoal.streak = newStreak;
        updatedGoal.lastCompletedDate = today;
        updatedGoal.missedDays = 0;
      }

      updatedGoal.progress = calculateOverallProgress(updatedGoal);
      if (user) db.upsertGoal(user.id, updatedGoal);
      return updatedGoal;
    }));
  };

  const updateHabitCount = (goalId, habitId, delta) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const today = TODAY();
      const yesterday = addDays(today, -1);

      const updatedHabits = goal.habits.map(h => {
        if (h.id === habitId) {
          const newCount = Math.max(0, (h.currentCount || 0) + delta);
          let updatedH = { ...h, currentCount: newCount };
          if (newCount >= (h.targetCount || 10) && !h.completed) {
            updatedH.completed = true;
            if (h.lastCompletedDate === yesterday) updatedH.streak += 1;
            else if (h.lastCompletedDate !== today) updatedH.streak = 1;
            updatedH.lastCompletedDate = today;
            updatedH.missedDays = 0;
            // XP: Habit completed via count
            awardXP(XP_SOURCES.HABIT_COMPLETE, `Completed: ${h.title}`);
            incrementCompletions();
            if ((h.missedDays || 0) >= 2) recordComeback();
          } else if (newCount < (h.targetCount || 10)) {
            updatedH.completed = false;
          }
          if (user) db.upsertHabit(user.id, goalId, updatedH);
          return updatedH;
        }
        return h;
      });

      const updatedGoal = { ...goal, habits: updatedHabits };

      // Update Goal Streak if just completed
      const isGoalDone = (goal.mode === 'ANY' && updatedHabits.some(h => h.lastCompletedDate === today)) ||
        (goal.mode === 'ALL' && updatedHabits.every(h => h.lastCompletedDate === today)) ||
        (goal.mode === 'CUSTOM' && updatedHabits.filter(h => h.lastCompletedDate === today).length >= (goal.minHabits || 1));

      if (isGoalDone && updatedGoal.lastCompletedDate !== today) {
        let newStreak = updatedGoal.streak || 0;
        if (updatedGoal.lastCompletedDate === yesterday) newStreak += 1;
        else newStreak = 1;
        updatedGoal.streak = newStreak;
        updatedGoal.lastCompletedDate = today;
        updatedGoal.missedDays = 0;
      }

      updatedGoal.progress = calculateOverallProgress(updatedGoal);
      if (user) db.upsertGoal(user.id, updatedGoal);
      return updatedGoal;
    }));
  };

  const addTask = async (task) => {
    const newT = {
      ...task,
      id: Date.now().toString(),
      timeSpent: 0,
      currentCount: 0,
      completed: false,
      currentStreak: 0,
      missedDays: 0,
      lastActiveDate: TODAY()
    };
    if (user) {
      try {
        await db.upsertTask(user.id, newT);
      } catch (err) {
        console.error('[Firestore Sync] Failed to add task:', err);
      }
    } else {
      setTasks(prev => [newT, ...prev]);
    }
  };

  const updateTask = async (id, updates) => {
    const t = tasks.find(item => item.id === id);
    if (!t) return;
    const updated = { ...t, ...updates };
    if (user) {
      try {
        await db.upsertTask(user.id, updated);
      } catch (err) {
        console.error('[Firestore Sync] Failed to update task:', err);
      }
    } else {
      setTasks(prev => prev.map(item => item.id === id ? updated : item));
    }
  };

  const deleteTask = async (id) => {
    if (user) {
      try {
        await db.deleteTaskDb(user.id, id);
      } catch (err) {
        console.error('[Firestore Sync] Failed to delete task:', err);
      }
    } else {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  const toggleTaskComplete = async (taskId) => {
    const t = tasks.find(item => item.id === taskId);
    if (!t) return;

    let isDone = false;
    let updated = { ...t };
    const cType = t.completionType || t.type || 'check';

    if (cType === 'check') {
      updated.completed = !t.completed;
      isDone = updated.completed;
    } else if (cType === 'count') {
      const target = t.targetCount || 10;
      updated.currentCount = (t.currentCount >= target) ? 0 : target;
      updated.completed = updated.currentCount >= target;
      isDone = updated.completed;
    } else {
      const target = t.targetTime || 30;
      updated.timeSpent = (t.timeSpent >= target) ? 0 : target;
      updated.completed = updated.timeSpent >= target;
      isDone = updated.completed;
    }

    if (isDone && (t.schedule_type || t.type) === 'daily') {
      const todayStr = TODAY();
      const yesterdayStr = addDays(todayStr, -1);
      let newStreak = t.currentStreak || 0;
      if (t.lastCompletedDate === yesterdayStr) newStreak += 1;
      else if (t.lastCompletedDate !== todayStr) newStreak = 1;
      updated = { ...updated, currentStreak: newStreak, lastCompletedDate: todayStr, missedDays: 0 };
    }

    // XP: Task completed via toggle
    if (isDone) {
      awardXP(XP_SOURCES.TASK_COMPLETE, `Completed: ${t.title}`);
      incrementCompletions();
    }

    if (user) {
      try {
        await db.upsertTask(user.id, updated);
      } catch (err) {
        console.error('[Firestore Sync] Failed to toggle task complete:', err);
      }
    } else {
      setTasks(prev => prev.map(item => item.id === taskId ? updated : item));
    }
  };

  const updateTaskCount = async (taskId, delta) => {
    const t = tasks.find(item => item.id === taskId);
    if (!t) return;

    const newCount = Math.max(0, (t.currentCount || 0) + delta);
    let updated = { ...t, currentCount: newCount };

    const isDaily = (t.schedule_type || t.type) === 'daily';
    const target = t.targetCount || 10;

    if (newCount >= target && !t.completed) {
      updated.completed = true;
      if (isDaily) {
        const todayStr = TODAY();
        const yesterdayStr = addDays(todayStr, -1);
        let newStreak = t.currentStreak || 0;
        if (t.lastCompletedDate === yesterdayStr) newStreak += 1;
        else if (t.lastCompletedDate !== todayStr) newStreak = 1;
        updated = { ...updated, currentStreak: newStreak, lastCompletedDate: todayStr, missedDays: 0 };
      }
      // XP: Task completed via count
      awardXP(XP_SOURCES.TASK_COMPLETE, `Completed: ${t.title}`);
      incrementCompletions();
    } else if (newCount < target) {
      updated.completed = false;
    }

    if (user) {
      try {
        await db.upsertTask(user.id, updated);
      } catch (err) {
        console.error('[Firestore Sync] Failed to update task count:', err);
      }
    } else {
      setTasks(prev => prev.map(item => item.id === taskId ? updated : item));
    }
  };

  const logTaskTime = async (id, mins) => {
    const t = tasks.find(item => item.id === id);
    if (!t) return;

    const newTime = (t.timeSpent || 0) + mins;
    let updated = { ...t, timeSpent: newTime };
    const isDaily = (t.schedule_type || t.type) === 'daily';

    if (newTime >= (t.targetTime || 15)) {
      if (!updated.completed && isDaily) {
        const todayStr = TODAY();
        const yesterdayStr = addDays(todayStr, -1);
        let newStreak = t.currentStreak || 0;
        if (t.lastCompletedDate === yesterdayStr) newStreak += 1;
        else if (t.lastCompletedDate !== todayStr) newStreak = 1;
        updated = { ...updated, currentStreak: newStreak, lastCompletedDate: todayStr, missedDays: 0 };
      }
      // XP: Task completed via time
      if (!updated.completed) {
        awardXP(XP_SOURCES.TASK_COMPLETE, `Completed: ${t.title}`);
        incrementCompletions();
      }
      updated.completed = true;
    }

    if (user) {
      try {
        await db.upsertTask(user.id, updated);
      } catch (err) {
        console.error('[Firestore Sync] Failed to log task time:', err);
      }
    } else {
      setTasks(prev => prev.map(item => item.id === id ? updated : item));
    }
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

  // Sync XP data to DB on change (debounced)
  useEffect(() => {
    if (!user || loading) return;
    const timer = setTimeout(() => {
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

  // Detect newly earned badges and persist them
  const prevBadgesRef = useRef(xpData.earnedBadges || []);
  useEffect(() => {
    const prev = prevBadgesRef.current;
    const newBadges = getNewlyEarnedBadges(prev, currentlyEarnedBadges);

    if (newBadges.length > 0) {
      // Add all new badges to the queue
      badgeQueueRef.current = [...badgeQueueRef.current, ...newBadges];
      
      // If no badge is currently showing, show the first one
      if (!badgeUnlockEvent) {
        setBadgeUnlockEvent(badgeQueueRef.current.shift());
      }

      setXpData(prevData => {
        const now = new Date().toISOString();
        const newDates = { ...prevData.badgeUnlockDates };
        newBadges.forEach(b => { newDates[b.id] = now; });
        return {
          ...prevData,
          earnedBadges: currentlyEarnedBadges,
          badgeUnlockDates: newDates,
        };
      });

      prevBadgesRef.current = currentlyEarnedBadges;
    } else if (currentlyEarnedBadges.length !== prev.length) {
      setXpData(prevData => ({ ...prevData, earnedBadges: currentlyEarnedBadges }));
      prevBadgesRef.current = currentlyEarnedBadges;
    }
  }, [currentlyEarnedBadges, badgeUnlockEvent]);

  const dismissBadgeEvent = useCallback(() => {
    if (badgeQueueRef.current.length > 0) {
      setBadgeUnlockEvent(badgeQueueRef.current.shift());
    } else {
      setBadgeUnlockEvent(null);
    }
  }, []);

  // ── Gamification: Daily XP Checks (in daily reset) ─────
  // Perfect day check & streak milestone XP are awarded during daily reset.
  // We hook into the existing daily reset effect by checking in the task summary effect.
  const lastXPDateRef = useRef(xpData.lastXPDate || '');
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
      const alreadyAwarded = (xpData.xpHistory || []).some(e => e.reason === milestoneKey);
      if (!alreadyAwarded) {
        awardXP(XP_SOURCES.STREAK_MILESTONE, `${maxStreak}-day streak milestone`);
      }
    }

    lastXPDateRef.current = today;
    setXpData(prev => ({ ...prev, lastXPDate: today }));
  }, [loading, taskLogs, goals, tasks]);

  // ── Weekly Intentions ──────────────────────────────────────────
  const saveWeeklyIntention = useCallback((weekKey, intentionText) => {
    setSettings(prev => ({
      ...prev,
      weeklyIntentions: {
        ...(prev.weeklyIntentions || {}),
        [weekKey]: intentionText
      }
    }));
  }, []);

  // Performance Optimization: Memoize the context value to prevent
  // unnecessary re-renders across the entire app on every state change.
  const value = useMemo(() => ({
    goals, addGoal, updateGoal, deleteGoal, extendGoalDeadline,
    addHabit, deleteHabit, logHabitTime, toggleHabitCheck, updateHabitCount,
    tasks, addTask, updateTask, deleteTask, logTaskTime, toggleTaskComplete, updateTaskCount,
    focusTime, focusHistory, addFocusTime, addFocusTimeToHabit,
    theme, toggleTheme,
    accuracy, alerts, weeklyReport, disciplineScore, userLevel, insights: getInsights(accuracy, avgStreak, focusTime),
    notes, addNote, updateNote, deleteNote,
    loading, taskLogs, syncError, retrySync: syncFromCloud,
    totalItems, completedItems, todayTasks, allHabits,
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
    saveWeeklyIntention
  }), [
    goals, tasks, taskLogs, notes, settings, loading, syncError,
    accuracy, alerts, weeklyReport, disciplineScore, userLevel,
    xpData, levelUpEvent, badgeUnlockEvent, currentlyEarnedBadges,
    aiInsights, recoveryStrategies, smartSuggestions,
    totalItems, completedItems, todayTasks, allHabits,
    settings, saveWeeklyIntention
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
