import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import * as db from '../lib/supabaseDb';
import { useAuth } from './AuthContext';
import { TODAY, addDays } from '../utils/dateUtils';
import { 
  isGoalDoneToday, 
  isTaskDone, 
  calculateAccuracy, 
  calculateDisciplineScore, 
  getUserLevel, 
  getInsights 
} from '../utils/calculationUtils';

const AppContext = createContext();

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

  // ── Daily Reset & Streak Protection ───────────────────────
  useEffect(() => {
    const lastReset = localStorage.getItem('gf_lastReset_v3');
    const todayStr = TODAY();
    if (lastReset && lastReset !== todayStr) {
      const yday = lastReset;
      
      const sessionFocus = focusTime;
      setFocusHistory(prev => ({ ...prev, [yday]: sessionFocus }));
      if (user) db.upsertFocusHistory(user.id, yday, sessionFocus);
      setFocusTime(0);

      const daysDiff = Math.floor((new Date(todayStr) - new Date(yday)) / (1000 * 60 * 60 * 24));

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
            if (newMissed >= 3) { newStreak = 0; newMissed = 0; if (newDeadline) newDeadline = addDays(newDeadline, 3); }
          }
          if (daysDiff > 1) {
             for (let i = 1; i < daysDiff; i++) { newMissed += 1; if (newMissed >= 3) { newStreak = 0; newMissed = 0; } }
          }
        }
        const updatedHabits = goal.habits.map(h => ({ ...h, timeSpent: 0, completed: false, currentCount: 0 }));
        const updatedGoal = { ...goal, habits: updatedHabits, streak: newStreak, missedDays: newMissed, progress: newProgress, deadline: newDeadline };
        if (user) { db.upsertGoal(user.id, updatedGoal); updatedHabits.forEach(h => db.upsertHabit(user.id, goal.id, h)); }
        return updatedGoal;
      }));

      setTasks(prev => prev.map(t => {
        if (t.type === 'daily') {
           const wasDone = isTaskDone(t);
           let newStreak = t.currentStreak || 0;
           let newMissed = t.missedDays || 0;
           if (!wasDone) { newMissed += 1; if (newMissed >= 3) { newStreak = 0; newMissed = 0; } }
           if (daysDiff > 1) { for (let i = 1; i < daysDiff; i++) { newMissed += 1; if (newMissed >= 3) { newStreak = 0; newMissed = 0; } } }
           const resetTask = { ...t, timeSpent: 0, completed: false, currentStreak: newStreak, missedDays: newMissed };
           if (user) db.upsertTask(user.id, resetTask);
           return resetTask;
        }
        return t;
      }));

      localStorage.setItem('gf_lastReset_v3', todayStr);
      if (user) db.upsertUserSettings(user.id, { theme, focusTimeToday: 0, lastReset: todayStr });
    }
  }, [user, theme, tasks, goals, focusTime]);

  // ── Automatic Daily Summary Sync ─────────────────────────
  useEffect(() => {
    if (loading) return;
    const today = TODAY();
    const todayTasks = tasks.filter(t => {
      const type = t.type || 'daily';
      if (type === 'daily') return true;
      if (type === 'single') return t.targetDate === today || t.date === today;
      if (type === 'range') return t.startDate <= today && t.endDate >= today;
      return false;
    });
    const allHabits = goals.flatMap(g => g.habits || []);
    const taskDone = todayTasks.filter(isTaskDone).length;
    const habitsDone = allHabits.filter(h => {
      if (h.type === 'check') return h.completed;
      if (h.type === 'count') return (h.currentCount || 0) >= (h.targetCount || 10);
      return (h.timeSpent || 0) >= (h.targetTime || 15);
    }).length;
    
    const summary = {
      date: today,
      total_tasks: todayTasks.length + allHabits.length,
      completed_tasks: taskDone + habitsDone,
      time_spent: todayTasks.reduce((acc, t) => acc + (t.timeSpent || 0), 0) + allHabits.reduce((acc, h) => acc + (h.timeSpent || 0), 0),
      auto_completed: true
    };
    
    setTaskLogs(prev => {
      const current = prev[today];
      if (current && current.total_tasks === summary.total_tasks && current.completed_tasks === summary.completed_tasks && current.time_spent === summary.time_spent) return prev;
      return { ...prev, [today]: summary };
    });
    if (user) db.upsertTaskLog(user.id, summary);
  }, [tasks, goals, loading, user]);

  // ── Computed Metrics ─────────────────────────────────────
  const accuracy = useMemo(() => calculateAccuracy(tasks, goals), [tasks, goals]);
  const avgStreak = goals.length === 0 ? 0 : goals.reduce((s, g) => s + (g.streak || 0), 0) / goals.length;
  const disciplineScore = calculateDisciplineScore(accuracy, avgStreak, focusTime);
  const userLevel = getUserLevel(disciplineScore);

  const alerts = useMemo(() => {
    const arr = [];
    goals.forEach(g => { if ((g.missedDays || 0) >= 2) arr.push({ type: 'warning', message: `Goal "${g.title}" — 2 missed days!` }); });
    tasks.forEach(t => { if (t.type === 'daily' && (t.missedDays || 0) >= 2) arr.push({ type: 'warning', message: `Task "${t.title}" — 2 missed days!` }); });
    return arr;
  }, [goals, tasks]);

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

  const deleteGoal = id => { setGoals(prev => prev.filter(g => g.id !== id)); if (user) db.deleteGoalDb(id); };

  const addHabit = (goalId, habit) => {
    const newH = { ...habit, id: Date.now().toString(), timeSpent: 0, currentCount: 0, completed: false };
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) { if (user) db.upsertHabit(user.id, goalId, newH); return { ...g, habits: [...g.habits, newH] }; }
      return g;
    }));
  };

  const deleteHabit = (goalId, habitId) => {
    setGoals(prev => prev.map(g => {
      if (g.id === goalId) { if (user) db.deleteHabitDb(habitId); return { ...g, habits: g.habits.filter(h => h.id !== habitId) }; }
      return g;
    }));
  };

  const logHabitTime = (goalId, habitId, minutes) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal;
      const updatedHabits = goal.habits.map(h => {
        if (h.id === habitId) { const newTime = (h.timeSpent || 0) + minutes; if (user) db.updateHabitTime(habitId, newTime); return { ...h, timeSpent: newTime }; }
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
          if (h.type === 'check') { const val = !h.completed; if (user) db.updateHabitCheck(habitId, val); return { ...h, completed: val }; }
          else if (h.type === 'count') { const target = h.targetCount || 10; const isDone = (h.currentCount || 0) >= target; const newVal = isDone ? 0 : target; if (user) db.updateHabitCount(habitId, newVal); return { ...h, currentCount: newVal }; }
          else { const target = h.targetTime || 15; const isDone = (h.timeSpent || 0) >= target; const newVal = isDone ? 0 : target; if (user) db.updateHabitTime(habitId, newVal); return { ...h, timeSpent: newVal }; }
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
        if (h.id === habitId) { const newCount = Math.max(0, (h.currentCount || 0) + delta); if (user) db.updateHabitCount(habitId, newCount); return { ...h, currentCount: newCount }; }
        return h;
      });
      return { ...goal, habits: updatedHabits };
    }));
  };

  const addTask = (task) => { const newT = { ...task, id: Date.now().toString(), timeSpent: 0 }; setTasks(prev => [newT, ...prev]); if (user) db.upsertTask(user.id, newT); };

  const updateTask = (id, updates) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) { const updated = { ...t, ...updates }; if (user) db.upsertTask(user.id, updated); return updated; }
      return t;
    }));
  };

  const deleteTask = id => { setTasks(prev => prev.filter(t => t.id !== id)); if (user) db.deleteTaskDb(id); };

  const toggleTaskComplete = (taskId) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        let updated = { ...t, completed: !t.completed };
        if (updated.completed && t.type === 'daily') {
          const todayStr = TODAY();
          const yesterdayStr = addDays(todayStr, -1);
          let newStreak = t.currentStreak || 0;
          if (t.lastCompletedDate === yesterdayStr) newStreak += 1;
          else if (t.lastCompletedDate !== todayStr) newStreak = 1;
          updated = { ...updated, currentStreak: newStreak, lastCompletedDate: todayStr, missedDays: 0 };
        }
        if (user) db.upsertTask(user.id, updated);
        return updated;
      }
      return t;
    }));
  };

  const logTaskTime = (id, mins) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const newTime = (t.timeSpent || 0) + mins;
        let updated = { ...t, timeSpent: newTime };
        if (newTime >= (t.targetTime || 15)) {
          if (!updated.completed && t.type === 'daily') {
            const todayStr = TODAY();
            const yesterdayStr = addDays(todayStr, -1);
            let newStreak = t.currentStreak || 0;
            if (t.lastCompletedDate === yesterdayStr) newStreak += 1;
            else if (t.lastCompletedDate !== todayStr) newStreak = 1;
            updated = { ...updated, currentStreak: newStreak, lastCompletedDate: todayStr, missedDays: 0 };
          }
          updated.completed = true;
        }
        if (user) db.upsertTask(user.id, updated);
        return updated;
      }
      return t;
    }));
  };

  const addFocusTime = (seconds) => {
    setFocusTime(prev => {
      const next = prev + seconds;
      if (user) db.upsertUserSettings(user.id, { theme, focusTimeToday: next, lastReset: TODAY() });
      return next;
    });
  };

  const addFocusTimeToHabit = (goalId, habitId, seconds) => {
    const mins = seconds / 60;
    addFocusTime(seconds);
    if (goalId && habitId) {
      if (goalId === 'DAILY_TASK') logTaskTime(habitId, mins);
      else logHabitTime(goalId, habitId, mins);
    }
  };

  const addNote = note => { const now = new Date().toISOString(); const newN = { ...note, id: Date.now().toString(), created_at: now, updated_at: now }; setNotes(prev => [newN, ...prev]); return newN; };
  const updateNote = (id, updates) => setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  const deleteNote = id => setNotes(prev => prev.filter(n => n.id !== id));

  const value = {
    goals, addGoal, updateGoal, deleteGoal, extendGoalDeadline,
    addHabit, deleteHabit, logHabitTime, toggleHabitCheck, updateHabitCount,
    tasks, addTask, updateTask, deleteTask, logTaskTime, toggleTaskComplete,
    focusTime, focusHistory, addFocusTime, addFocusTimeToHabit,
    theme, toggleTheme,
    accuracy, alerts, disciplineScore, userLevel, insights: getInsights(accuracy, avgStreak, focusTime),
    notes, addNote, updateNote, deleteNote,
    loading, taskLogs
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
