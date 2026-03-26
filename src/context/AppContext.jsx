import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();
const TODAY = () => new Date().toISOString().split('T')[0];

const addDays = (dateStr, n) => {
  const d = new Date(dateStr); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

export const isGoalDoneToday = (goal) => {
  if (!goal.habits || goal.habits.length === 0) return false;
  const doneHabits = goal.habits.filter(h => {
    if (h.type === 'check') return h.completed;
    return (h.timeSpent || 0) >= (h.targetTime || 15);
  }).length;
  if (goal.mode === 'ANY') return doneHabits > 0;
  return doneHabits === goal.habits.length;
};

// ── Provider ──────────────────────────────────────────────
export const AppProvider = ({ children }) => {
  const [goals, setGoals] = useState(() => {
    try {
      const stored = localStorage.getItem('gf_goals_production');
      if (stored) return Array.isArray(JSON.parse(stored)) ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('[Storage ERROR] Failed to parse goals:', e);
    }
    return [];
  });

  const [tasks, setTasks] = useState(() => {
    try {
      const stored = localStorage.getItem('gf_tasks_prod_v2');
      if (stored) return Array.isArray(JSON.parse(stored)) ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('[Storage ERROR] Failed to parse tasks:', e);
    }
    return [];
  });

  const [focusTime, setFocusTime] = useState(() => JSON.parse(localStorage.getItem('gf_focusTime') || '0'));
  const [focusHistory, setFocusHistory] = useState(() => JSON.parse(localStorage.getItem('gf_focusHistory') || '{}'));
  const [taskLogs, setTaskLogs] = useState(() => JSON.parse(localStorage.getItem('gf_taskLogs') || '{}'));
  const [theme, setTheme] = useState(() => localStorage.getItem('gf_theme') || 'dark');

  const [notes, setNotes] = useState(() => {
    try {
      const stored = localStorage.getItem('gf_notes_v1');
      if (stored) return Array.isArray(JSON.parse(stored)) ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('[Storage ERROR] Failed to parse notes:', e);
    }
    return [];
  });

  // Persistence
  useEffect(() => { localStorage.setItem('gf_goals_production', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem('gf_tasks_prod_v2', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('gf_focusTime', JSON.stringify(focusTime)); }, [focusTime]);
  useEffect(() => { localStorage.setItem('gf_focusHistory', JSON.stringify(focusHistory)); }, [focusHistory]);
  useEffect(() => { localStorage.setItem('gf_taskLogs', JSON.stringify(taskLogs)); }, [taskLogs]);
  useEffect(() => { localStorage.setItem('gf_notes_v1', JSON.stringify(notes)); }, [notes]);
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
      
      setFocusHistory(prev => ({ ...prev, [yday]: JSON.parse(localStorage.getItem('gf_focusTime') || '0') }));
      setFocusTime(0);

      setGoals(prev => prev.map(goal => {
        goal.habits.forEach(h => {
          if (h.type !== 'check') {
            setTaskLogs(logs => ({ ...logs, [yday]: { ...(logs[yday] || {}), [h.id]: h.timeSpent || 0 } }));
          }
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
            newProgress = Math.min(100, newProgress + 2);
          } else {
            newMissed += 1;
            if (newMissed >= 3) {
              newStreak = 0;
              newMissed = 0;
              if (newDeadline) newDeadline = addDays(newDeadline, 3);
            }
          }
        }
        const updatedHabits = goal.habits.map(h => ({ ...h, timeSpent: 0, completed: false }));
        return { ...goal, habits: updatedHabits, streak: newStreak, missedDays: newMissed, progress: newProgress, deadline: newDeadline };
      }));

      // Only reset DAILY tasks
      setTasks(prev => prev.map(t => {
        if (t.type === 'daily' || !t.type) { // Default legacy ones to daily
          setTaskLogs(logs => ({ ...logs, [yday]: { ...(logs[yday] || {}), [t.id]: t.timeSpent || 0 } }));
          return { ...t, timeSpent: 0 };
        }
        return t; // Do not reset Single or Range tasks!
      }));
    }
    localStorage.setItem('gf_lastReset', today);
  }, []);

  // ── Computed Filtering ────────────────────────────────────
  const today = TODAY();
  const todayTasks = tasks.filter(t => {
    const type = t.type || 'daily';
    if (type === 'daily') return true;
    if (type === 'single') return t.targetDate === today;
    if (type === 'range') return t.startDate <= today && t.endDate >= today;
    return false;
  });

  const completedGoals = goals.filter(g => isGoalDoneToday(g));
  const completedNormalTasks = todayTasks.filter(t => (t.timeSpent || 0) >= (t.targetTime || 15));
  
  const allHabits = goals.flatMap(g => g.habits);
  const completedHabitsCount = allHabits.filter(h => {
    if (h.type === 'check') return h.completed;
    return (h.timeSpent || 0) >= (h.targetTime || 15);
  }).length;

  const totalItems = todayTasks.length + allHabits.length;
  const completedItems = completedNormalTasks.length + completedHabitsCount;
  const accuracy = totalItems === 0 ? 100 : Math.round((completedItems / totalItems) * 100);

  const alerts = [];
  goals.forEach(goal => {
    if ((goal.missedDays || 0) >= 2) {
      alerts.push({ type: 'warning', message: `Goal "${goal.title}" — 2 missed days! Complete it today.` });
    }
  });
  if (totalItems > 0 && accuracy < 50) {
    alerts.push({ type: 'danger', message: `Low productivity today — only ${accuracy}% accuracy.` });
  }

  // ── Actions ───────────────────────────────────────────
  const addGoal = (goal) => setGoals(prev => [{ ...goal, id: Date.now().toString(), progress: 0, streak: 0, missedDays: 0, createdAt: TODAY(), habits: [] }, ...prev]);
  const updateGoal = (id, updates) => setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  const deleteGoal = (id) => setGoals(prev => prev.filter(g => g.id !== id));

  const addHabit = (goalId, habit) => setGoals(prev => prev.map(g =>
    g.id === goalId ? { ...g, habits: [...g.habits, { ...habit, id: Date.now().toString(), timeSpent: 0, completed: false }] } : g
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

  const toggleHabitCheck = (goalId, habitId) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const updatedHabits = goal.habits.map(h => h.id === habitId ? { ...h, completed: !h.completed } : h);
      return { ...goal, habits: updatedHabits };
    }));
  };

  const addTask = (task) => setTasks(prev => [{ ...task, id: Date.now().toString(), timeSpent: 0 }, ...prev]);
  const updateTask = (id, updates) => setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  const deleteTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));
  
  const logTaskTime = (id, minutes) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, timeSpent: (t.timeSpent || 0) + minutes } : t));
  };

  // ── Notes Actions ────────────────────────────────────
  const addNote = (note) => {
    const now = new Date().toISOString();
    const newNote = { ...note, id: Date.now().toString(), created_at: now, updated_at: now };
    setNotes(prev => [newNote, ...prev]);
    return newNote;
  };
  const updateNote = (id, updates) => setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  const deleteNote = (id) => setNotes(prev => prev.filter(n => n.id !== id));

  const addFocusTimeToHabit = (goalId, habitId, seconds) => {
    const mins = seconds / 60;
    setFocusTime(prev => prev + seconds);
    if (goalId && habitId) {
      if (goalId === 'DAILY_TASK') {
        logTaskTime(habitId, mins);
      } else {
        logHabitTime(goalId, habitId, mins);
      }
    }
  };
  const addFocusTime = (seconds) => setFocusTime(prev => prev + seconds);

  return (
    <AppContext.Provider value={{
      goals, addGoal, updateGoal, deleteGoal,
      addHabit, deleteHabit, logHabitTime, toggleHabitCheck,
      tasks, todayTasks, addTask, updateTask, deleteTask, logTaskTime,
      focusTime, focusHistory, addFocusTime, addFocusTimeToHabit,
      taskLogs, theme, toggleTheme,
      accuracy, alerts, totalItems, completedItems, allHabits,
      notes, addNote, updateNote, deleteNote,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
