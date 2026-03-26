import React, { createContext, useContext, useState, useEffect } from 'react';
import * as db from '../lib/supabaseDb';
import { useAuth } from './AuthContext';

const AppContext = createContext();
const TODAY = () => new Date().toISOString().split('T')[0];

const addDays = (dateStr, n) => {
  const d = new Date(dateStr); d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

export const isGoalDoneToday = (goal) => {
  if (!goal.habits || goal.habits.length === 0) return false;
  const doneHabitsCount = goal.habits.filter(h => {
    if (h.type === 'check') return h.completed;
    if (h.type === 'count') return (h.currentCount || 0) >= (h.targetCount || 10);
    return (h.timeSpent || 0) >= (h.targetTime || 15);
  }).length;
  
  if (goal.mode === 'ANY') return doneHabitsCount > 0;
  if (goal.mode === 'CUSTOM') return doneHabitsCount >= (goal.minHabits || 1);
  return doneHabitsCount === goal.habits.length;
};

// ── Provider ──────────────────────────────────────────────
export const AppProvider = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Initial local state
  const [goals, setGoals] = useState(() => JSON.parse(localStorage.getItem('gf_goals_v3') || '[]'));
  const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem('gf_tasks_v3') || '[]'));
  const [focusTime, setFocusTime] = useState(() => JSON.parse(localStorage.getItem('gf_focusTime_v3') || '0'));
  const [focusHistory, setFocusHistory] = useState(() => JSON.parse(localStorage.getItem('gf_focusHistory_v3') || '{}'));
  const [taskLogs, setTaskLogs] = useState(() => JSON.parse(localStorage.getItem('gf_taskLogs_v3') || '{}'));
  const [theme, setTheme] = useState(() => localStorage.getItem('gf_theme_v3') || 'dark');
  const [notes, setNotes] = useState(() => JSON.parse(localStorage.getItem('gf_notes_v3') || '[]'));

  // ── Supabase Initial Load ────────────────────────────────
  useEffect(() => {
    async function loadData() {
      if (!user) { setLoading(false); return; }
      try {
        const [g, t, f, l, s] = await Promise.all([
          db.fetchGoals(user.id),
          db.fetchTasks(user.id),
          db.fetchFocusHistory(user.id),
          db.fetchTaskLogs(user.id),
          db.fetchUserSettings(user.id)
        ]);
        if (g) setGoals(g);
        if (t) setTasks(t);
        if (f) setFocusHistory(f);
        if (l) setTaskLogs(l);
        if (s) {
          setTheme(s.theme || 'dark');
          setFocusTime(s.focusTimeToday || 0);
        }
      } catch (err) {
        console.error('[Supabase Sync] Load failed:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  // ── Persistence Effects (Local) ──────────────────────────
  useEffect(() => { localStorage.setItem('gf_goals_v3', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem('gf_tasks_v3', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('gf_focusTime_v3', JSON.stringify(focusTime)); }, [focusTime]);
  useEffect(() => { localStorage.setItem('gf_focusHistory_v3', JSON.stringify(focusHistory)); }, [focusHistory]);
  useEffect(() => { localStorage.setItem('gf_taskLogs_v3', JSON.stringify(taskLogs)); }, [taskLogs]);
  useEffect(() => { localStorage.setItem('gf_notes_v3', JSON.stringify(notes)); }, [notes]);
  useEffect(() => {
    localStorage.setItem('gf_theme_v3', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    if (user) db.upsertUserSettings(user.id, { theme: newTheme, focusTimeToday: focusTime, lastReset: TODAY() });
  };

  // ── Daily Reset ───────────────────────────────────────────
  useEffect(() => {
    const lastReset = localStorage.getItem('gf_lastReset_v3');
    const today = TODAY();
    if (lastReset && lastReset !== today) {
      const yday = lastReset;
      
      const sessionFocus = focusTime;
      setFocusHistory(prev => ({ ...prev, [yday]: sessionFocus }));
      if (user) db.upsertFocusHistory(user.id, yday, sessionFocus);
      setFocusTime(0);

      setGoals(prev => prev.map(goal => {
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
        const updatedHabits = goal.habits.map(h => ({ ...h, timeSpent: 0, completed: false, currentCount: 0 }));
        const updatedGoal = { ...goal, habits: updatedHabits, streak: newStreak, missedDays: newMissed, progress: newProgress, deadline: newDeadline };
        
        if (user) {
          db.upsertGoal(user.id, updatedGoal);
          updatedHabits.forEach(h => db.upsertHabit(user.id, goal.id, h));
        }
        return updatedGoal;
      }));

      setTasks(prev => prev.map(t => {
        if (t.type === 'daily' || !t.type) {
           const resetTask = { ...t, timeSpent: 0 };
           if (user) db.upsertTask(user.id, resetTask);
           return resetTask;
        }
        return t;
      }));

      localStorage.setItem('gf_lastReset_v3', today);
      if (user) db.upsertUserSettings(user.id, { theme, focusTimeToday: 0, lastReset: today });
    }
  }, [user, theme]);

  // ── Computed Metrics ─────────────────────────────────────
  const todayTasks = tasks.filter(t => {
    const type = t.type || 'daily';
    if (type === 'daily') return true;
    if (type === 'single') return t.targetDate === TODAY();
    if (type === 'range') return t.startDate <= TODAY() && t.endDate >= TODAY();
    return false;
  });

  const allHabits = goals.flatMap(g => g.habits);
  const completedHabitsCount = allHabits.filter(h => {
    if (h.type === 'check') return h.completed;
    if (h.type === 'count') return (h.currentCount || 0) >= (h.targetCount || 10);
    return (h.timeSpent || 0) >= (h.targetTime || 15);
  }).length;

  const completedTasksCount = todayTasks.filter(t => (t.timeSpent || 0) >= (t.targetTime || 15)).length;
  const totalItems = todayTasks.length + allHabits.length;
  const completedItems = completedHabitsCount + completedTasksCount;
  const accuracy = totalItems === 0 ? 100 : Math.round((completedItems / totalItems) * 100);

  const avgStreak = goals.length === 0 ? 0 : goals.reduce((s, g) => s + (g.streak || 0), 0) / goals.length;
  const streakScore = Math.min(40, avgStreak * 5);
  const focusGoal = 120 * 60;
  const focusScore = Math.min(20, (focusTime / focusGoal) * 20);
  const accuracyScore = (accuracy / 100) * 40;
  const disciplineScore = Math.round(streakScore + focusScore + accuracyScore);
  const userLevel = disciplineScore >= 90 ? 'Elite' : disciplineScore >= 70 ? 'Focused' : disciplineScore >= 40 ? 'Consistent' : 'Beginner';

  const alerts = [];
  goals.forEach(goal => {
    if ((goal.missedDays || 0) >= 2) alerts.push({ type: 'warning', message: `Goal "${goal.title}" — 2 missed days! Complete it today.` });
  });

  const getInsights = () => {
    const insights = [];
    if (accuracy > 90) insights.push("Exceptional output today. Keep your momentum.");
    if (avgStreak >= 5) insights.push("Your consistency is reaching elite levels.");
    if (focusTime > focusGoal) insights.push("Deep work capacity is high. Stay in the zone.");
    if (accuracy < 50 && totalItems > 0) insights.push("Focus is drifting. Re-align with your top priority.");
    return insights;
  };

  // ── Actions ──────────────────────────────────────────────
  const addGoal = (goal) => {
    const newG = { ...goal, id: Date.now().toString(), progress: 0, streak: 0, missedDays: 0, createdAt: TODAY(), habits: [] };
    setGoals(prev => [newG, ...prev]);
    if (user) db.upsertGoal(user.id, newG);
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
  const deleteGoal = (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    if (user) db.deleteGoalDb(id);
  };

  const addHabit = (goalId, habit) => {
    const newH = { ...habit, id: Date.now().toString(), timeSpent: 0, currentCount: 0, completed: false };
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        if (user) db.upsertHabit(user.id, goalId, newH);
        return { ...g, habits: [...g.habits, newH] };
      }
      return g;
    }));
  };
  const deleteHabit = (goalId, habitId) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) {
        if (user) db.deleteHabitDb(habitId);
        return { ...g, habits: g.habits.filter(h => h.id !== habitId) };
      }
      return g;
    }));
  };

  const logHabitTime = (goalId, habitId, minutes) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const updatedHabits = goal.habits.map(h => {
        if (h.id === habitId) {
          const newTime = (h.timeSpent || 0) + minutes;
          if (user) db.updateHabitTime(habitId, newTime);
          return { ...h, timeSpent: newTime };
        }
        return h;
      });
      return { ...goal, habits: updatedHabits };
    }));
  };

  const toggleHabitCheck = (goalId, habitId) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const updatedHabits = goal.habits.map(h => {
        if (h.id === habitId) {
          const val = !h.completed;
          if (user) db.updateHabitCheck(habitId, val);
          return { ...h, completed: val };
        }
        return h;
      });
      return { ...goal, habits: updatedHabits };
    }));
  };

  const updateHabitCount = (goalId, habitId, delta) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const updatedHabits = goal.habits.map(h => {
        if (h.id === habitId) {
          const newCount = Math.max(0, (h.currentCount || 0) + delta);
          if (user) db.updateHabitCount(habitId, newCount);
          return { ...h, currentCount: newCount };
        }
        return h;
      });
      return { ...goal, habits: updatedHabits };
    }));
  };

  const addTask = (task) => {
    const newT = { ...task, id: Date.now().toString(), timeSpent: 0 };
    setTasks(prev => [newT, ...prev]);
    if (user) db.upsertTask(user.id, newT);
  };
  const updateTask = (id, updates) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const updated = { ...t, ...updates };
        if (user) db.upsertTask(user.id, updated);
        return updated;
      }
      return t;
    }));
  };
  const deleteTask = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (user) db.deleteTaskDb(id);
  };
  const logTaskTime = (id, mins) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const newTime = (t.timeSpent || 0) + mins;
        const updated = { ...t, timeSpent: newTime };
        if (user) db.upsertTask(user.id, updated);
        return updated;
      }
      return t;
    }));
  };

  const addFocusTimeToHabit = (goalId, habitId, seconds) => {
    const mins = seconds / 60;
    setFocusTime(prev => {
      const next = prev + seconds;
      if (user) db.upsertUserSettings(user.id, { theme, focusTimeToday: next, lastReset: TODAY() });
      return next;
    });
    if (goalId && habitId) {
      if (goalId === 'DAILY_TASK') logTaskTime(habitId, mins);
      else logHabitTime(goalId, habitId, mins);
    }
  };

  const addFocusTime = (seconds) => {
    setFocusTime(prev => {
      const next = prev + seconds;
      if (user) db.upsertUserSettings(user.id, { theme, focusTimeToday: next, lastReset: TODAY() });
      return next;
    });
  };

  const addNote = (note) => {
    const now = new Date().toISOString();
    const newN = { ...note, id: Date.now().toString(), created_at: now, updated_at: now };
    setNotes(prev => [newN, ...prev]);
    return newN;
  };
  const updateNote = (id, updates) => setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  const deleteNote = (id) => setNotes(prev => prev.filter(n => n.id !== id));

  return (
    <AppContext.Provider value={{
      goals, addGoal, updateGoal, deleteGoal,
      addHabit, deleteHabit, logHabitTime, toggleHabitCheck, updateHabitCount,
      tasks, todayTasks, addTask, updateTask, deleteTask, logTaskTime,
      focusTime, focusHistory, addFocusTime, addFocusTimeToHabit,
      theme, toggleTheme,
      accuracy, alerts, totalItems, completedItems, disciplineScore, userLevel,
      insights: getInsights(),
      notes, addNote, updateNote, deleteNote,
      loading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
