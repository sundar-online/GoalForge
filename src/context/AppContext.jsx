import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();
const TODAY = () => new Date().toISOString().split('T')[0];

const addDays = (dateStr, n) => {
  const d = new Date(dateStr); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

// ── Seed Data ─────────────────────────────────────────────
const SEED_GOALS = [
  {
    id: 'g1', title: 'Astro-App Launch', tag: 'Engineering',
    deadline: addDays(TODAY(), 30), progress: 32, createdAt: TODAY(),
    mode: 'ALL', streak: 5, missedDays: 0,
    habits: [
      { id: 'h1', title: 'Deep Code Session', timeSpent: 0 },
      { id: 'h2', title: 'Architecture Review', timeSpent: 0 },
    ],
  },
];

const SEED_TASKS = [
  { id: 't1', title: 'Team standup call', targetTime: 30, timeSpent: 0, priority: 'High', date: TODAY() },
  { id: 't2', title: 'Review PRs', targetTime: 45, timeSpent: 0, priority: 'Medium', date: TODAY() },
];

export const isGoalDoneToday = (goal) => {
  if (!goal.habits || goal.habits.length === 0) return false;
  const doneHabits = goal.habits.filter(h => (h.timeSpent || 0) >= 15).length;
  if (goal.mode === 'ANY') return doneHabits > 0;
  return doneHabits === goal.habits.length;
};

// ── Provider ──────────────────────────────────────────────
export const AppProvider = ({ children }) => {
  const [goals, setGoals] = useState(() => JSON.parse(localStorage.getItem('gf_goals_v4') || 'null') || SEED_GOALS);
  const [dailyTasks, setDailyTasks] = useState(() => JSON.parse(localStorage.getItem('gf_tasks_v5') || 'null') || SEED_TASKS);
  const [focusTime, setFocusTime] = useState(() => JSON.parse(localStorage.getItem('gf_focusTime') || '0'));
  const [focusHistory, setFocusHistory] = useState(() => JSON.parse(localStorage.getItem('gf_focusHistory') || '{}'));
  const [taskLogs, setTaskLogs] = useState(() => JSON.parse(localStorage.getItem('gf_taskLogs') || '{}'));
  const [theme, setTheme] = useState(() => localStorage.getItem('gf_theme') || 'light');

  // ── Persist ──
  useEffect(() => { localStorage.setItem('gf_goals_v4', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem('gf_tasks_v5', JSON.stringify(dailyTasks)); }, [dailyTasks]);
  useEffect(() => { localStorage.setItem('gf_focusTime', JSON.stringify(focusTime)); }, [focusTime]);
  useEffect(() => { localStorage.setItem('gf_focusHistory', JSON.stringify(focusHistory)); }, [focusHistory]);
  useEffect(() => { localStorage.setItem('gf_taskLogs', JSON.stringify(taskLogs)); }, [taskLogs]);
  useEffect(() => {
    localStorage.setItem('gf_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  // ── Daily Reset ───────────────────────────────────────────
  useEffect(() => {
    const lastReset = localStorage.getItem('gf_lastReset');
    const today = TODAY();
    if (lastReset && lastReset !== today) {
      const yday = lastReset;
      
      // Snapshot focus time
      setFocusHistory(prev => ({ ...prev, [yday]: JSON.parse(localStorage.getItem('gf_focusTime') || '0') }));
      setFocusTime(0);

      // Process Goals (reset timeSpent, compute streaks)
      setGoals(prev => prev.map(goal => {
        goal.habits.forEach(h => {
          setTaskLogs(logs => ({ ...logs, [yday]: { ...(logs[yday] || {}), [h.id]: h.timeSpent || 0 } }));
        });

        const wasDone = isGoalDoneToday(goal);
        let newStreak = goal.streak || 0;
        let newMissed = goal.missedDays || 0;
        let newProgress = goal.progress || 0;
        let newDeadline = goal.deadline;

        if (goal.habits.length > 0) {
          if (wasDone) {
            newStreak += 1;
            newMissed = 0;
            newProgress = Math.min(100, newProgress + 5);
          } else {
            newMissed += 1;
            if (newMissed >= 3) {
              newStreak = 0;
              newMissed = 0;
              if (newDeadline) newDeadline = addDays(newDeadline, 3);
            }
          }
        }

        const updatedHabits = goal.habits.map(h => ({ ...h, timeSpent: 0 }));
        return { ...goal, habits: updatedHabits, streak: newStreak, missedDays: newMissed, progress: newProgress, deadline: newDeadline };
      }));

      // Process Daily Tasks (reset timeSpent)
      setDailyTasks(prev => prev.map(t => {
        setTaskLogs(logs => ({ ...logs, [yday]: { ...(logs[yday] || {}), [t.id]: t.timeSpent || 0 } }));
        return { ...t, timeSpent: 0 };
      }));
    }
    localStorage.setItem('gf_lastReset', today);
  }, []);

  // ── Computed Stats ────────────────────────────────────────
  const todayTasks = dailyTasks; // tasks are now permanent

  const completedGoals = goals.filter(g => isGoalDoneToday(g));
  const completedNormalTasks = dailyTasks.filter(t => (t.timeSpent || 0) >= (t.targetTime || 15));
  
  const totalItems = dailyTasks.length + goals.length;
  const completedItems = completedGoals.length + completedNormalTasks.length;
  const accuracy = totalItems === 0 ? 100 : Math.round((completedItems / totalItems) * 100);

  // Alerts
  const alerts = [];
  goals.forEach(goal => {
    if ((goal.missedDays || 0) >= 2) {
      alerts.push({ type: 'warning', message: `Goal "${goal.title}" — 2 missed days! Complete it today.` });
    }
  });
  if (totalItems > 0 && accuracy < 50) {
    alerts.push({ type: 'danger', message: `Low productivity today — only ${accuracy}% accuracy.` });
  }

  // ── Goal Actions ───────────────────────────────────────────
  const addGoal = (goal) => setGoals(prev => [{ ...goal, id: Date.now().toString(), progress: 0, streak: 0, missedDays: 0, createdAt: TODAY(), habits: [] }, ...prev]);
  const updateGoal = (id, updates) => setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  const deleteGoal = (id) => setGoals(prev => prev.filter(g => g.id !== id));

  const addHabit = (goalId, habit) => setGoals(prev => prev.map(g =>
    g.id === goalId ? { ...g, habits: [...g.habits, { ...habit, id: Date.now().toString(), timeSpent: 0 }] } : g
  ));
  const deleteHabit = (goalId, habitId) => setGoals(prev => prev.map(g =>
    g.id === goalId ? { ...g, habits: g.habits.filter(h => h.id !== habitId) } : g
  ));

  const logHabitTime = (goalId, habitId, minutes) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const updatedHabits = goal.habits.map(h => h.id === habitId ? { ...h, timeSpent: (h.timeSpent || 0) + minutes } : h);
      return { ...goal, habits: updatedHabits };
    }));
  };

  // ── Task Actions ───────────────────────────────────────────
  const addDailyTask = (task) => setDailyTasks(prev => [{ ...task, id: Date.now().toString(), timeSpent: 0, targetTime: task.targetTime || 30 }, ...prev]);
  const updateDailyTask = (id, updates) => setDailyTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  const deleteDailyTask = (id) => setDailyTasks(prev => prev.filter(t => t.id !== id));
  
  const logDailyTaskTime = (id, minutes) => {
    setDailyTasks(prev => prev.map(t => t.id === id ? { ...t, timeSpent: (t.timeSpent || 0) + minutes } : t));
  };

  // ── Focus ───────────────────────────────────────────
  const addFocusTimeToHabit = (goalId, habitId, seconds) => {
    const mins = seconds / 60;
    setFocusTime(prev => prev + seconds);
    if (goalId && habitId) {
      if (goalId === 'DAILY_TASK') {
        logDailyTaskTime(habitId, mins);
      } else {
        logHabitTime(goalId, habitId, mins);
      }
    }
  };
  const addFocusTime = (seconds) => setFocusTime(prev => prev + seconds);

  return (
    <AppContext.Provider value={{
      goals, addGoal, updateGoal, deleteGoal,
      addHabit, deleteHabit, logHabitTime,
      dailyTasks, todayTasks, addDailyTask, updateDailyTask, deleteDailyTask, logDailyTaskTime,
      focusTime, focusHistory, addFocusTime, addFocusTimeToHabit,
      taskLogs,
      theme, toggleTheme,
      accuracy, alerts, totalItems, completedItems,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
