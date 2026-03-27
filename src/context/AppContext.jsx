import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import * as db from '../lib/supabaseDb';
import { useAuth } from './AuthContext';
import { TODAY, addDays, diffDays } from '../utils/dateUtils';
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

  // ── Daily Reset & Streak Logic (Rule 2, 3, 4, 5) ─────────────────
  useEffect(() => {
    if (loading || !user) return;

    const todayStr = TODAY();
    const yesterdayStr = addDays(todayStr, -1);
    const lastGlobalReset = localStorage.getItem('gf_lastReset_v3');

    if (lastGlobalReset === todayStr) return; // Already reset for today

    setGoals(prev => {
      const updatedGoals = prev.map(goal => {
        const lastActive = goal.lastActiveDate || yesterdayStr;
        if (lastActive === todayStr) return goal;

        const daysDiff = Math.floor((new Date(todayStr) - new Date(lastActive)) / (1000 * 60 * 60 * 24));

        const updatedHabits = goal.habits.map(h => {
          let updatedH = { ...h };
          const wasLogicallyDoneOnLastActive = updatedH.completed || 
            (updatedH.type === 'time' && (updatedH.timeSpent || 0) >= (updatedH.targetTime || 15)) ||
            (updatedH.type === 'count' && (updatedH.currentCount || 0) >= (updatedH.targetCount || 10));

          // 1. Process the "lastActive" day performance
          if (wasLogicallyDoneOnLastActive) {
            if (updatedH.lastCompletedDate === addDays(lastActive, -1)) updatedH.streak += 1;
            else if (updatedH.lastCompletedDate !== lastActive) updatedH.streak = 1;
            updatedH.lastCompletedDate = lastActive;
            updatedH.missedDays = 0;
          } else {
            updatedH.missedDays += 1;
          }

          // 2. Catch up on any gaps (skipped days between lastActive and Today)
          if (daysDiff > 1) {
            for (let i = 1; i < daysDiff; i++) {
               updatedH.missedDays += 1;
               if (updatedH.missedDays >= 3) { updatedH.streak = 0; updatedH.missedDays = 0; }
            }
          }

          if (updatedH.missedDays >= 3) { updatedH.streak = 0; updatedH.missedDays = 0; }

          // Rule 2: Reset for today
          updatedH.timeSpent = 0;
          updatedH.completed = false;
          updatedH.currentCount = 0;
          return updatedH;
        });

        const wasGoalDoneOnLastActiveDay = habitsAfterProcess => {
          const doneHabitsCount = habitsAfterProcess.filter(hr => hr.lastCompletedDate === lastActive).length;
          const isDone = (goal.mode === 'ANY' && doneHabitsCount > 0) || (goal.mode === 'CUSTOM' && doneHabitsCount >= (goal.minHabits || 1)) || (goal.mode === 'ALL' && doneHabitsCount === habitsAfterProcess.length);
          return isDone;
        };

        let newDaysCompleted = goal.daysCompleted || 0;
        if (wasGoalDoneOnLastActiveDay(updatedHabits)) {
          newDaysCompleted += 1;
        }

        const totalDays = diffDays(goal.startDate || goal.createdAt || todayStr, goal.deadline || addDays(todayStr, 30));
        const updatedGoal = { 
          ...goal, 
          habits: updatedHabits, 
          daysCompleted: newDaysCompleted,
          progress: Math.min(100, Math.round((newDaysCompleted / totalDays) * 100)),
          lastActiveDate: todayStr 
        };

        if (user) db.upsertGoal(user.id, updatedGoal);
        updatedHabits.forEach(h => db.upsertHabit(user.id, goal.id, h));

        return updatedGoal;
      });
      return updatedGoals;
    });

    // Reset Focus Time & Daily Tasks
    setTasks(prev => prev.map(t => {
      const isDaily = (t.schedule_type || t.type) === 'daily';
      if (isDaily) {
         // Apply same streak logic to tasks
         const wasDone = isTaskDone(t);
         let newStreak = t.currentStreak || 0;
         let newMissed = t.missedDays || 0;
         let lastComp = t.lastCompletedDate;

         if (wasDone) {
           if (lastComp === addDays(lastGlobalReset || todayStr, -1)) newStreak += 1;
           else if (lastComp !== lastGlobalReset) newStreak = 1;
           lastComp = lastGlobalReset || todayStr;
           newMissed = 0;
         } else {
           newMissed += 1;
         }

         if (newMissed >= 3) { newStreak = 0; newMissed = 0; }
         return { ...t, timeSpent: 0, currentCount: 0, completed: false, currentStreak: newStreak, missedDays: newMissed, lastCompletedDate: lastComp };
      }
      return t;
    }));

    setFocusTime(0);
    localStorage.setItem('gf_lastReset_v3', todayStr);
    if (user) db.upsertUserSettings(user.id, { theme, focusTimeToday: 0, lastReset: todayStr });
    
  }, [loading, user]);


  // ── Automatic Daily Summary Sync ─────────────────────────
  useEffect(() => {
    if (loading) return;
    const today = TODAY();
    const todayTasks = tasks.filter(t => {
      const sType = t.schedule_type || t.type || 'daily';
      if (sType === 'daily') return true;
      if (sType === 'single') return t.targetDate === today || t.date === today;
      if (sType === 'range') return t.startDate <= today && t.endDate >= today;
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
  const todayStr = TODAY();
  const todayTasks = useMemo(() => tasks.filter(t => {
    const type = t.type || 'daily';
    if (type === 'daily') return true;
    if (type === 'single') return t.targetDate === todayStr || t.date === todayStr;
    if (type === 'range') return t.startDate <= todayStr && t.endDate >= todayStr;
    return false;
  }), [tasks, todayStr]);

  const allHabits = useMemo(() => goals.flatMap(g => g.habits || []), [goals]);
  const completedHabits = useMemo(() => allHabits.filter(h => {
    if (h.type === 'check') return h.completed;
    if (h.type === 'count') return (h.currentCount || 0) >= (h.targetCount || 10);
    return (h.timeSpent || 0) >= (h.targetTime || 15);
  }), [allHabits]);

  const completedTasks = useMemo(() => todayTasks.filter(isTaskDone), [todayTasks]);
  const totalItems = todayTasks.length + allHabits.length;
  const completedItems = completedHabits.length + completedTasks.length;

  const accuracy = useMemo(() => totalItems === 0 ? 100 : Math.round((completedItems / totalItems) * 100), [totalItems, completedItems]);
  const avgStreak = goals.length === 0 ? 0 : goals.reduce((acc, goal) => {
    const bestHabitStreak = goal.habits.length === 0 ? 0 : Math.max(...goal.habits.map(h => h.streak || 0));
    return acc + bestHabitStreak;
  }, 0) / goals.length;

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
    const goalId = Date.now().toString();
    const initialHabits = (goal.habits || []).map(h => ({
      ...h,
      id: h.id || (Date.now() + Math.random()).toString(),
      timeSpent: 0,
      currentCount: 0,
      completed: false,
      streak: 0,
      lastCompletedDate: null,
      missedDays: 0
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

  const deleteGoal = id => { setGoals(prev => prev.filter(g => g.id !== id)); if (user) db.deleteGoalDb(id); };

  const addHabit = (goalId, habit) => {
    const newH = { 
      ...habit, 
      id: Date.now().toString(), 
      timeSpent: 0, 
      currentCount: 0, 
      completed: false,
      streak: 0,
      lastCompletedDate: null,
      missedDays: 0
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
      if (g.id === goalId) { if (user) db.deleteHabitDb(habitId); return { ...g, habits: g.habits.filter(h => h.id !== habitId) }; }
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
          }
          
          if (user) db.upsertHabit(user.id, goalId, updatedH);
          return updatedH;
        }
        return h;
      });
      
      const updatedGoal = { ...goal, habits: updatedHabits };
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
          } else if (newCount < (h.targetCount || 10)) {
            updatedH.completed = false;
          }
          if (user) db.upsertHabit(user.id, goalId, updatedH);
          return updatedH;
        }
        return h;
      });

      const updatedGoal = { ...goal, habits: updatedHabits };
      updatedGoal.progress = calculateOverallProgress(updatedGoal);
      if (user) db.upsertGoal(user.id, updatedGoal);
      return updatedGoal;
    }));
  };

  const addTask = (task) => { 
    const newT = { 
      ...task, 
      id: Date.now().toString(), 
      timeSpent: 0, 
      currentCount: 0,
      completed: false
    }; 
    setTasks(prev => [newT, ...prev]); 
    if (user) db.upsertTask(user.id, newT); 
  };

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
        let isDone = false;
        let updated = { ...t };
        
        if (t.type === 'check') {
          updated.completed = !t.completed;
          isDone = updated.completed;
        } else if (t.type === 'count') {
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
        if (user) db.upsertTask(user.id, updated);
        return updated;
      }
      return t;
    }));
  };

  const updateTaskCount = (taskId, delta) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
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
      } else if (newCount < target) {
        updated.completed = false;
      }
      
      if (user) db.upsertTask(user.id, updated);
      return updated;
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
      return next;
    });
  };

  const addFocusTimeToHabit = (goalId, habitId, seconds) => {
    const mins = seconds / 60;
    // logFocusTimeToHabit doesn't call addFocusTime because the timer calls it every second
    if (goalId && habitId) {
      if (goalId === 'DAILY_TASK') logTaskTime(habitId, mins);
      else logHabitTime(goalId, habitId, mins);
    }
  };

  // Sync focus time to DB every minute or on change (debounced)
  useEffect(() => {
    if (!user || loading) return;
    const timer = setTimeout(() => {
      db.upsertUserSettings(user.id, { theme, focusTimeToday: focusTime, lastReset: TODAY() });
    }, 10000); // Wait for 10s of inactivity to sync
    return () => clearTimeout(timer);
  }, [focusTime, theme, user]);

  const addNote = note => { const now = new Date().toISOString(); const newN = { ...note, id: Date.now().toString(), created_at: now, updated_at: now }; setNotes(prev => [newN, ...prev]); return newN; };
  const updateNote = (id, updates) => setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  const deleteNote = id => setNotes(prev => prev.filter(n => n.id !== id));

  const value = {
    goals, addGoal, updateGoal, deleteGoal, extendGoalDeadline,
    addHabit, deleteHabit, logHabitTime, toggleHabitCheck, updateHabitCount,
    tasks, addTask, updateTask, deleteTask, logTaskTime, toggleTaskComplete, updateTaskCount,
    focusTime, focusHistory, addFocusTime, addFocusTimeToHabit,
    theme, toggleTheme,
    accuracy, alerts, disciplineScore, userLevel, insights: getInsights(accuracy, avgStreak, focusTime),
    notes, addNote, updateNote, deleteNote,
    loading, taskLogs,
    totalItems, completedItems, todayTasks, allHabits
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
