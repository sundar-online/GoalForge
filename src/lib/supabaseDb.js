import { supabase } from './supabase';

// ═══════════════════════════════════════════════════════
// Supabase Database Helper — GoalForge
// All write operations are fire-and-forget with error logging.
// Read operations are awaited on initial load.
// ═══════════════════════════════════════════════════════

const log = (msg, err) => console.error(`[SupabaseDB] ${msg}`, err?.message || err);

// ── Goals ──────────────────────────────────────────────
export async function fetchGoals(userId) {
  const { data, error } = await supabase
    .from('goals')
    .select('*, habits(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { log('fetchGoals', error); return null; }
  // Map DB rows → app shape
  return (data || []).map(g => ({
    id: g.id,
    title: g.title,
    description: g.description || '',
    mode: g.mode || 'ALL',
    minHabits: g.min_habits || 1,
    tag: g.tag || 'General',
    deadline: g.deadline || null,
    progress: g.progress || 0,
    streak: g.streak || 0,
    missedDays: g.missed_days || 0,
    createdAt: g.created_at,
    habits: (g.habits || []).map(h => ({
      id: h.id,
      title: h.title,
      type: h.type || 'time',
      timeSpent: h.time_spent || 0,
      targetTime: h.target_time || 15,
      targetCount: h.target_count || 10,
      currentCount: h.current_count || 0,
      completed: h.completed || false,
    })),
  }));
}

export async function upsertGoal(userId, goal) {
  const { error } = await supabase.from('goals').upsert({
    id: goal.id,
    user_id: userId,
    title: goal.title,
    description: goal.description || '',
    mode: goal.mode || 'ALL',
    min_habits: goal.minHabits || 1,
    tag: goal.tag || 'General',
    deadline: goal.deadline || null,
    progress: goal.progress || 0,
    streak: goal.streak || 0,
    missed_days: goal.missedDays || 0,
    created_at: goal.createdAt,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) log('upsertGoal', error);
}

export async function deleteGoalDb(goalId) {
  const { error } = await supabase.from('goals').delete().eq('id', goalId);
  if (error) log('deleteGoal', error);
}

// ── Habits ─────────────────────────────────────────────
export async function upsertHabit(userId, goalId, habit) {
  const { error } = await supabase.from('habits').upsert({
    id: habit.id,
    goal_id: goalId,
    user_id: userId,
    title: habit.title,
    type: habit.type || 'time',
    time_spent: habit.timeSpent || 0,
    target_time: habit.targetTime || 15,
    target_count: habit.targetCount || 10,
    current_count: habit.currentCount || 0,
    completed: habit.completed || false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) log('upsertHabit', error);
}

export async function deleteHabitDb(habitId) {
  const { error } = await supabase.from('habits').delete().eq('id', habitId);
  if (error) log('deleteHabit', error);
}

export async function updateHabitTime(habitId, timeSpent) {
  const { error } = await supabase.from('habits').update({
    time_spent: timeSpent,
    updated_at: new Date().toISOString(),
  }).eq('id', habitId);
  if (error) log('updateHabitTime', error);
}

export async function updateHabitCount(habitId, currentCount) {
  const { error } = await supabase.from('habits').update({
    current_count: currentCount,
    updated_at: new Date().toISOString(),
  }).eq('id', habitId);
  if (error) log('updateHabitCount', error);
}

export async function updateHabitCheck(habitId, completed) {
  const { error } = await supabase.from('habits').update({
    completed,
    updated_at: new Date().toISOString(),
  }).eq('id', habitId);
  if (error) log('updateHabitCheck', error);
}

// ── Tasks ──────────────────────────────────────────────
export async function fetchTasks(userId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) { log('fetchTasks', error); return null; }
  return (data || []).map(t => ({
    id: t.id,
    title: t.title,
    type: t.type || 'daily',
    targetTime: t.target_time || 15,
    timeSpent: t.time_spent || 0,
    targetDate: t.target_date || null,
    startDate: t.start_date || null,
    endDate: t.end_date || null,
  }));
}

export async function upsertTask(userId, task) {
  const { error } = await supabase.from('tasks').upsert({
    id: task.id,
    user_id: userId,
    title: task.title,
    type: task.type || 'daily',
    target_time: task.targetTime || 15,
    time_spent: task.timeSpent || 0,
    target_date: task.targetDate || null,
    start_date: task.startDate || null,
    end_date: task.endDate || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) log('upsertTask', error);
}

export async function deleteTaskDb(taskId) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) log('deleteTask', error);
}

// ── Focus History ──────────────────────────────────────
export async function fetchFocusHistory(userId) {
  const { data, error } = await supabase
    .from('focus_history')
    .select('*')
    .eq('user_id', userId);
  if (error) { log('fetchFocusHistory', error); return null; }
  const history = {};
  (data || []).forEach(row => { history[row.date] = row.seconds; });
  return history;
}

export async function upsertFocusHistory(userId, date, seconds) {
  const { error } = await supabase.from('focus_history').upsert({
    user_id: userId,
    date,
    seconds,
  }, { onConflict: 'user_id,date' });
  if (error) log('upsertFocusHistory', error);
}

// ── Task Logs ──────────────────────────────────────────
export async function fetchTaskLogs(userId) {
  const { data, error } = await supabase
    .from('task_logs')
    .select('*')
    .eq('user_id', userId);
  if (error) { log('fetchTaskLogs', error); return null; }
  const logs = {};
  (data || []).forEach(row => {
    if (!logs[row.date]) logs[row.date] = {};
    logs[row.date][row.item_id] = row.time_spent;
  });
  return logs;
}

export async function upsertTaskLog(userId, date, itemId, timeSpent) {
  const { error } = await supabase.from('task_logs').upsert({
    user_id: userId,
    date,
    item_id: itemId,
    time_spent: timeSpent,
  }, { onConflict: 'user_id,date,item_id' });
  if (error) log('upsertTaskLog', error);
}

// ── User Settings ──────────────────────────────────────
export async function fetchUserSettings(userId) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') { log('fetchUserSettings', error); return null; }
  if (!data) return null;
  return {
    theme: data.theme || 'dark',
    focusTimeToday: data.focus_time_today || 0,
    lastReset: data.last_reset || null,
  };
}

export async function upsertUserSettings(userId, settings) {
  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    theme: settings.theme,
    focus_time_today: settings.focusTimeToday ?? 0,
    last_reset: settings.lastReset,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) log('upsertUserSettings', error);
}
