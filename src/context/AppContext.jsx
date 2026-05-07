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
  isHabitScheduledToday,
  calculateStreakFromHistory
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
  const habitsListeners = useRef({});

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
            completedDates: t.completed_dates || [],
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

      // 3. Subscribe to Goals with Reactive Habits Listener
      const goalsQuery = query(collection(fireDb, 'users', user.id, 'goals'), orderBy('created_at', 'desc'));
      const unsubGoals = onSnapshot(goalsQuery, { includeMetadataChanges: true }, (snapshot) => {
        const goalsList = snapshot.docs.map(docSnap => {
          const g = docSnap.data();
          return {
            id: docSnap.id,
            title: g.title,
            description: g.description || '',
            mode: g.mode || 'ALL',
            minHabits: g.min_habits || 1,
            tag: g.tag || 'General',
            deadline: g.deadline || null,
            progress: g.progress || 0,
            streak: g.streak || 0,
            completedDates: g.completed_dates || [],
            missedDays: g.missed_days || 0,
            lastActiveDate: g.last_active_date || null,
            lastCompletedDate: g.last_completed_date || null,
            daysCompleted: g.days_completed || 0,
            startDate: g.start_date || null,
            createdAt: g.created_at,
            extensions: g.extensions || [],
            syncPending: docSnap.metadata.hasPendingWrites,
            habits: [] // Will be populated in real-time by nested listeners below
          };
        });

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
            return {
              ...g,
              habits: existing ? existing.habits : []
            };
          });
        });

        // Initialize/verify active habits sub-collection listeners for each goal
        goalsList.forEach(goal => {
          if (!habitsListeners.current[goal.id]) {
            const habitsQuery = query(collection(fireDb, 'users', user.id, 'goals', goal.id, 'habits'));
            const unsubHabit = onSnapshot(habitsQuery, { includeMetadataChanges: true }, (habitsSnapshot) => {
              const habitsList = habitsSnapshot.docs.map(hDoc => {
                const hd = hDoc.data();
                return {
                  id: hDoc.id,
                  title: hd.title,
                  type: hd.type || 'time',
                  timeSpent: hd.time_spent || 0,
                  targetTime: hd.target_time || 15,
                  targetCount: hd.target_count || 10,
                  currentCount: hd.current_count || 0,
                  completed: hd.completed || false,
                  streak: hd.streak || 0,
                  lastCompletedDate: hd.last_completed_date || null,
                  completedDates: hd.completed_dates || [],
                  missedDays: hd.missed_days || 0,
                  scheduleDays: hd.schedule_days || [],
                  lastActiveDate: hd.last_active_date || null,
                  isRecovering: hd.is_recovering || false,
                  originalTarget: hd.original_target || null,
                  syncPending: hDoc.metadata.hasPendingWrites,
                };
              });

              // Merge these habits instantly into their goal's state
              setGoals(prev => prev.map(g => {
                if (g.id === goal.id) {
                  // Guard: Prevent initial empty snapshot from wiping out staged habits during creation/sync
                  if (habitsList.length === 0 && g.habits && g.habits.length > 0) {
                    if (g.syncPending || habitsSnapshot.metadata.hasPendingWrites || habitsSnapshot.metadata.fromCache) {
                      return g;
                    }
                  }
                  return {
                    ...g,
                    habits: habitsList
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
          if (!activeGoalIds.has(gId)) {
            habitsListeners.current[gId](); // Unsubscribe
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
  const addGoal = async (goal) => {
    const goalId = Date.now().toString();
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
      createdAt: TODAY(),
      lastActiveDate: TODAY(),
      habits: initialHabits
    };

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
    const targetGoal = goals.find(g => g.id === goalId);
    if (!targetGoal) {
      console.warn(`[Habit Creator] Cannot create habit; parent Goal ID "${goalId}" does not exist.`);
      return;
    }
    const newH = {
      ...habit,
      id: Date.now().toString(),
      timeSpent: 0,
      currentCount: 0,
      completed: false,
      streak: 0,
      lastCompletedDate: null,
      completedDates: [],
      missedDays: 0,
      lastActiveDate: TODAY()
    };
    
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        if (user) db.upsertHabit(user.id, goalId, newH);
        const updatedHabits = [...(g.habits || []), newH];
        const updatedGoal = { ...g, habits: updatedHabits };

        // Recalculate Goal progress, today's status, and streak
        const today = TODAY();
        const isGoalDone = isGoalDoneToday(updatedGoal);
        let updatedGoalDates = g.completedDates ? [...g.completedDates] : [];
        if (g.lastCompletedDate && !updatedGoalDates.includes(g.lastCompletedDate)) {
          updatedGoalDates.push(g.lastCompletedDate);
        }

        if (isGoalDone) {
          if (!updatedGoalDates.includes(today)) {
            updatedGoalDates.push(today);
          }
        } else {
          updatedGoalDates = updatedGoalDates.filter(d => d !== today);
        }

        const newGoalStreak = calculateStreakFromHistory(updatedGoalDates, []);
        const sortedGoalDates = [...updatedGoalDates].sort((a, b) => b.localeCompare(a));
        const newGoalLastCompleted = sortedGoalDates.length > 0 ? sortedGoalDates[0] : null;

        updatedGoal.completedDates = updatedGoalDates;
        updatedGoal.streak = newGoalStreak;
        updatedGoal.lastCompletedDate = newGoalLastCompleted;
        if (isGoalDone) {
          updatedGoal.missedDays = 0;
        }

        updatedGoal.progress = calculateOverallProgress(updatedGoal);
        if (user) db.upsertGoal(user.id, updatedGoal);
        return updatedGoal;
      }
      return g;
    }));
  };

  const deleteHabit = (goalId, habitId) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        if (user) db.deleteHabitDb(user.id, goalId, habitId);
        const updatedHabits = g.habits.filter(h => h.id !== habitId);
        const updatedGoal = { ...g, habits: updatedHabits };

        // Recalculate Goal progress, today's status, and streak
        const today = TODAY();
        const isGoalDone = isGoalDoneToday(updatedGoal);
        let updatedGoalDates = g.completedDates ? [...g.completedDates] : [];
        if (g.lastCompletedDate && !updatedGoalDates.includes(g.lastCompletedDate)) {
          updatedGoalDates.push(g.lastCompletedDate);
        }

        if (isGoalDone) {
          if (!updatedGoalDates.includes(today)) {
            updatedGoalDates.push(today);
          }
        } else {
          updatedGoalDates = updatedGoalDates.filter(d => d !== today);
        }

        const newGoalStreak = calculateStreakFromHistory(updatedGoalDates, []);
        const sortedGoalDates = [...updatedGoalDates].sort((a, b) => b.localeCompare(a));
        const newGoalLastCompleted = sortedGoalDates.length > 0 ? sortedGoalDates[0] : null;

        updatedGoal.completedDates = updatedGoalDates;
        updatedGoal.streak = newGoalStreak;
        updatedGoal.lastCompletedDate = newGoalLastCompleted;
        if (isGoalDone) {
          updatedGoal.missedDays = 0;
        }

        updatedGoal.progress = calculateOverallProgress(updatedGoal);
        if (user) db.upsertGoal(user.id, updatedGoal);
        return updatedGoal;
      }
      return g;
    }));
  };

  const logHabitTime = (goalId, habitId, minutes) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const today = TODAY();

      const updatedHabits = goal.habits.map(h => {
        if (h.id === habitId) {
          const newTime = Math.max(0, (h.timeSpent || 0) + minutes);
          const wasCompleted = h.completed;
          const target = h.targetTime || 15;
          const isDone = newTime >= target;

          let updatedDates = h.completedDates ? [...h.completedDates] : [];
          if (h.lastCompletedDate && !updatedDates.includes(h.lastCompletedDate)) {
            updatedDates.push(h.lastCompletedDate);
          }

          if (isDone) {
            if (!updatedDates.includes(today)) {
              updatedDates.push(today);
            }
          } else {
            updatedDates = updatedDates.filter(d => d !== today);
          }

          const newStreak = calculateStreakFromHistory(updatedDates, h.scheduleDays || []);
          const sortedDates = [...updatedDates].sort((a, b) => b.localeCompare(a));
          const newLastCompleted = sortedDates.length > 0 ? sortedDates[0] : null;

          let updatedH = {
            ...h,
            timeSpent: newTime,
            completed: isDone,
            completedDates: updatedDates,
            streak: newStreak,
            lastCompletedDate: newLastCompleted,
            missedDays: isDone ? 0 : h.missedDays,
          };

          if (isDone && !wasCompleted) {
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

      // Goal-level streak recalculation
      const isGoalDone = isGoalDoneToday(updatedGoal);
      let updatedGoalDates = goal.completedDates ? [...goal.completedDates] : [];
      if (goal.lastCompletedDate && !updatedGoalDates.includes(goal.lastCompletedDate)) {
        updatedGoalDates.push(goal.lastCompletedDate);
      }

      if (isGoalDone) {
        if (!updatedGoalDates.includes(today)) {
          updatedGoalDates.push(today);
        }
      } else {
        updatedGoalDates = updatedGoalDates.filter(d => d !== today);
      }

      const newGoalStreak = calculateStreakFromHistory(updatedGoalDates, []);
      const sortedGoalDates = [...updatedGoalDates].sort((a, b) => b.localeCompare(a));
      const newGoalLastCompleted = sortedGoalDates.length > 0 ? sortedGoalDates[0] : null;

      updatedGoal.completedDates = updatedGoalDates;
      updatedGoal.streak = newGoalStreak;
      updatedGoal.lastCompletedDate = newGoalLastCompleted;
      if (isGoalDone) {
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

      const updatedHabits = goal.habits.map(h => {
        if (h.id === habitId) {
          let updatedH = { ...h };
          let isDone = false;
          let wasCompleted = h.completed;

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

          let updatedDates = h.completedDates ? [...h.completedDates] : [];
          if (h.lastCompletedDate && !updatedDates.includes(h.lastCompletedDate)) {
            updatedDates.push(h.lastCompletedDate);
          }

          if (isDone) {
            if (!updatedDates.includes(today)) {
              updatedDates.push(today);
            }
          } else {
            updatedDates = updatedDates.filter(d => d !== today);
          }

          const newStreak = calculateStreakFromHistory(updatedDates, h.scheduleDays || []);
          const sortedDates = [...updatedDates].sort((a, b) => b.localeCompare(a));
          const newLastCompleted = sortedDates.length > 0 ? sortedDates[0] : null;

          updatedH.completedDates = updatedDates;
          updatedH.streak = newStreak;
          updatedH.lastCompletedDate = newLastCompleted;
          if (isDone) {
            updatedH.missedDays = 0;
          }

          if (isDone && !wasCompleted) {
            awardXP(XP_SOURCES.HABIT_COMPLETE, `Completed: ${h.title}`);
            incrementCompletions();
            if ((h.missedDays || 0) >= 2) recordComeback();
          }

          if (user) db.upsertHabit(user.id, goalId, updatedH);
          return updatedH;
        }
        return h;
      });

      const updatedGoal = { ...goal, habits: updatedHabits };

      // Goal-level streak recalculation
      const isGoalDone = isGoalDoneToday(updatedGoal);
      let updatedGoalDates = goal.completedDates ? [...goal.completedDates] : [];
      if (goal.lastCompletedDate && !updatedGoalDates.includes(goal.lastCompletedDate)) {
        updatedGoalDates.push(goal.lastCompletedDate);
      }

      if (isGoalDone) {
        if (!updatedGoalDates.includes(today)) {
          updatedGoalDates.push(today);
        }
      } else {
        updatedGoalDates = updatedGoalDates.filter(d => d !== today);
      }

      const newGoalStreak = calculateStreakFromHistory(updatedGoalDates, []);
      const sortedGoalDates = [...updatedGoalDates].sort((a, b) => b.localeCompare(a));
      const newGoalLastCompleted = sortedGoalDates.length > 0 ? sortedGoalDates[0] : null;

      updatedGoal.completedDates = updatedGoalDates;
      updatedGoal.streak = newGoalStreak;
      updatedGoal.lastCompletedDate = newGoalLastCompleted;
      if (isGoalDone) {
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

      const updatedHabits = goal.habits.map(h => {
        if (h.id === habitId) {
          const newCount = Math.max(0, (h.currentCount || 0) + delta);
          const wasCompleted = h.completed;
          const target = h.targetCount || 10;
          const isDone = newCount >= target;

          let updatedDates = h.completedDates ? [...h.completedDates] : [];
          if (h.lastCompletedDate && !updatedDates.includes(h.lastCompletedDate)) {
            updatedDates.push(h.lastCompletedDate);
          }

          if (isDone) {
            if (!updatedDates.includes(today)) {
              updatedDates.push(today);
            }
          } else {
            updatedDates = updatedDates.filter(d => d !== today);
          }

          const newStreak = calculateStreakFromHistory(updatedDates, h.scheduleDays || []);
          const sortedDates = [...updatedDates].sort((a, b) => b.localeCompare(a));
          const newLastCompleted = sortedDates.length > 0 ? sortedDates[0] : null;

          let updatedH = {
            ...h,
            currentCount: newCount,
            completed: isDone,
            completedDates: updatedDates,
            streak: newStreak,
            lastCompletedDate: newLastCompleted,
            missedDays: isDone ? 0 : h.missedDays,
          };

          if (isDone && !wasCompleted) {
            awardXP(XP_SOURCES.HABIT_COMPLETE, `Completed: ${h.title}`);
            incrementCompletions();
            if ((h.missedDays || 0) >= 2) recordComeback();
          }

          if (user) db.upsertHabit(user.id, goalId, updatedH);
          return updatedH;
        }
        return h;
      });

      const updatedGoal = { ...goal, habits: updatedHabits };

      // Goal-level streak recalculation
      const isGoalDone = isGoalDoneToday(updatedGoal);
      let updatedGoalDates = goal.completedDates ? [...goal.completedDates] : [];
      if (goal.lastCompletedDate && !updatedGoalDates.includes(goal.lastCompletedDate)) {
        updatedGoalDates.push(goal.lastCompletedDate);
      }

      if (isGoalDone) {
        if (!updatedGoalDates.includes(today)) {
          updatedGoalDates.push(today);
        }
      } else {
        updatedGoalDates = updatedGoalDates.filter(d => d !== today);
      }

      const newGoalStreak = calculateStreakFromHistory(updatedGoalDates, []);
      const sortedGoalDates = [...updatedGoalDates].sort((a, b) => b.localeCompare(a));
      const newGoalLastCompleted = sortedGoalDates.length > 0 ? sortedGoalDates[0] : null;

      updatedGoal.completedDates = updatedGoalDates;
      updatedGoal.streak = newGoalStreak;
      updatedGoal.lastCompletedDate = newGoalLastCompleted;
      if (isGoalDone) {
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

    const today = TODAY();
    let isDone = false;
    let wasCompleted = t.completed;
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

    const isDaily = (t.schedule_type || t.type) === 'daily';
    let updatedDates = t.completedDates ? [...t.completedDates] : [];
    if (t.lastCompletedDate && !updatedDates.includes(t.lastCompletedDate)) {
      updatedDates.push(t.lastCompletedDate);
    }

    if (isDone) {
      if (!updatedDates.includes(today)) {
        updatedDates.push(today);
      }
    } else {
      updatedDates = updatedDates.filter(d => d !== today);
    }

    const newStreak = isDaily ? calculateStreakFromHistory(updatedDates, []) : 0;
    const sortedDates = [...updatedDates].sort((a, b) => b.localeCompare(a));
    const newLastCompleted = sortedDates.length > 0 ? sortedDates[0] : null;

    updated.completedDates = updatedDates;
    updated.currentStreak = newStreak;
    updated.lastCompletedDate = newLastCompleted;
    if (isDone) {
      updated.missedDays = 0;
    }

    // XP: Task completed via toggle
    if (isDone && !wasCompleted) {
      awardXP(XP_SOURCES.TASK_COMPLETE, `Completed: ${t.title}`);
      incrementCompletions();
    }

    setTasks(prev => prev.map(item => item.id === taskId ? updated : item));

    if (user) {
      try {
        await db.upsertTask(user.id, updated);
      } catch (err) {
        console.error('[Firestore Sync] Failed to toggle task complete:', err);
      }
    }
  };

  const updateTaskCount = async (taskId, delta) => {
    const t = tasks.find(item => item.id === taskId);
    if (!t) return;

    const today = TODAY();
    const newCount = Math.max(0, (t.currentCount || 0) + delta);
    const wasCompleted = t.completed;
    const target = t.targetCount || 10;
    const isDone = newCount >= target;

    let updated = { ...t, currentCount: newCount, completed: isDone };
    const isDaily = (t.schedule_type || t.type) === 'daily';

    let updatedDates = t.completedDates ? [...t.completedDates] : [];
    if (t.lastCompletedDate && !updatedDates.includes(t.lastCompletedDate)) {
      updatedDates.push(t.lastCompletedDate);
    }

    if (isDone) {
      if (!updatedDates.includes(today)) {
        updatedDates.push(today);
      }
    } else {
      updatedDates = updatedDates.filter(d => d !== today);
    }

    const newStreak = isDaily ? calculateStreakFromHistory(updatedDates, []) : 0;
    const sortedDates = [...updatedDates].sort((a, b) => b.localeCompare(a));
    const newLastCompleted = sortedDates.length > 0 ? sortedDates[0] : null;

    updated.completedDates = updatedDates;
    updated.currentStreak = newStreak;
    updated.lastCompletedDate = newLastCompleted;
    if (isDone) {
      updated.missedDays = 0;
    }

    if (isDone && !wasCompleted) {
      awardXP(XP_SOURCES.TASK_COMPLETE, `Completed: ${t.title}`);
      incrementCompletions();
    }

    setTasks(prev => prev.map(item => item.id === taskId ? updated : item));

    if (user) {
      try {
        await db.upsertTask(user.id, updated);
      } catch (err) {
        console.error('[Firestore Sync] Failed to update task count:', err);
      }
    }
  };

  const logTaskTime = async (id, mins) => {
    const t = tasks.find(item => item.id === id);
    if (!t) return;

    const today = TODAY();
    const newTime = Math.max(0, (t.timeSpent || 0) + mins);
    const wasCompleted = t.completed;
    const target = t.targetTime || 15;
    const isDone = newTime >= target;

    let updated = { ...t, timeSpent: newTime, completed: isDone };
    const isDaily = (t.schedule_type || t.type) === 'daily';

    let updatedDates = t.completedDates ? [...t.completedDates] : [];
    if (t.lastCompletedDate && !updatedDates.includes(t.lastCompletedDate)) {
      updatedDates.push(t.lastCompletedDate);
    }

    if (isDone) {
      if (!updatedDates.includes(today)) {
        updatedDates.push(today);
      }
    } else {
      updatedDates = updatedDates.filter(d => d !== today);
    }

    const newStreak = isDaily ? calculateStreakFromHistory(updatedDates, []) : 0;
    const sortedDates = [...updatedDates].sort((a, b) => b.localeCompare(a));
    const newLastCompleted = sortedDates.length > 0 ? sortedDates[0] : null;

    updated.completedDates = updatedDates;
    updated.currentStreak = newStreak;
    updated.lastCompletedDate = newLastCompleted;
    if (isDone) {
      updated.missedDays = 0;
    }

    if (isDone && !wasCompleted) {
      awardXP(XP_SOURCES.TASK_COMPLETE, `Completed: ${t.title}`);
      incrementCompletions();
    }

    setTasks(prev => prev.map(item => item.id === id ? updated : item));

    if (user) {
      try {
        await db.upsertTask(user.id, updated);
      } catch (err) {
        console.error('[Firestore Sync] Failed to log task time:', err);
      }
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
