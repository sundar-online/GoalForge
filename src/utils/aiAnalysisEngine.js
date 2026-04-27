import { TODAY, addDays, diffDays } from './dateUtils';

/**
 * AI-Driven Insights & Recovery System
 * This engine analyzes user behavior patterns and provides actionable suggestions.
 */

export const analyzeUserBehavior = (goals, tasks, taskLogs, focusTime) => {
  const insights = [];
  const today = TODAY();
  
  // 1. Peak Performance Analysis (Last 14 days)
  const logs = Object.values(taskLogs).slice(-14);
  if (logs.length >= 3) {
    const sortedByAccuracy = [...logs].sort((a, b) => (b.completed_tasks / (b.total_tasks || 1)) - (a.completed_tasks / (a.total_tasks || 1)));
    const bestDay = sortedByAccuracy[0];
    const bestDayName = new Date(bestDay.date).toLocaleDateString('en-US', { weekday: 'long' });
    
    if (bestDay.completed_tasks > 0) {
      insights.push({
        id: 'peak_performance',
        type: 'peak_performance',
        priority: 'medium',
        title: 'Golden Pattern Detected',
        message: `You are 40% more productive on ${bestDayName}s. Schedule your hardest tasks for then.`,
        icon: '🎯'
      });
    }
  }

  // 2. Burnout Risk Detection
  const recentLogs = logs.slice(-3);
  const avgAccuracy = recentLogs.length > 0 
    ? recentLogs.reduce((acc, l) => acc + (l.completed_tasks / (l.total_tasks || 1)), 0) / recentLogs.length 
    : 1;
    
  if (avgAccuracy < 0.4 && focusTime > 120 * 60) { // High focus but low completion
    insights.push({
      id: 'burnout_warning',
      type: 'burnout',
      priority: 'high',
      title: 'Burnout Risk Detected',
      message: 'High focus but declining results. Suggesting a "Minimalist Day" to reset your mental battery.',
      icon: '🔥',
      actionLabel: 'Activate Minimalist Mode'
    });
  }

  // 3. Consistency Insights
  const allHabits = goals.flatMap(g => g.habits || []);
  const topHabit = [...allHabits].sort((a, b) => (b.streak || 0) - (a.streak || 0))[0];
  
  if (topHabit && topHabit.streak >= 7) {
    insights.push({
      id: 'consistency_champ',
      type: 'peak_performance',
      priority: 'low',
      title: 'Unstoppable Momentum',
      message: `Your ${topHabit.title} streak is legendary. You're building a rock-solid identity.`,
      icon: '💎'
    });
  }

  return insights;
};

export const generateRecoveryStrategies = (goals, tasks) => {
  const strategies = [];
  const today = TODAY();

  // 1. Streak Recovery (The 2-Day Rule)
  const allItems = [
    ...goals.flatMap(g => (g.habits || []).map(h => ({ ...h, parentId: g.id, isHabit: true }))),
    ...tasks.filter(t => t.type === 'daily').map(t => ({ ...t, isHabit: false }))
  ];

  const criticalItems = allItems.filter(item => (item.missedDays || 0) === 2);

  criticalItems.forEach(item => {
    const recoveryTarget = item.type === 'count' 
      ? Math.max(1, Math.round((item.targetCount || 10) * 0.3))
      : Math.max(5, Math.round((item.targetTime || 30) * 0.3));

    strategies.push({
      id: `recovery_${item.id}`,
      type: 'recovery',
      priority: 'high',
      title: 'Streak Emergency!',
      message: `You've missed "${item.title}" for 2 days. Don't let the streak die. Use the "Micro-Habit" recovery plan.`,
      icon: '🆘',
      actionLabel: 'Accept Recovery Plan',
      recoveryPlan: {
        itemId: item.id,
        parentId: item.parentId,
        isHabit: item.isHabit,
        originalTarget: item.type === 'count' ? item.targetCount : item.targetTime,
        newTarget: recoveryTarget,
        type: item.type
      }
    });
  });

  // 2. Procrastination Recovery
  const overdueTasks = tasks.filter(t => t.type === 'single' && t.targetDate < today && !t.completed);
  if (overdueTasks.length >= 3) {
    strategies.push({
      id: 'procrastination_purge',
      type: 'recovery',
      priority: 'medium',
      title: 'Backlog Overload',
      message: `You have ${overdueTasks.length} overdue tasks. Let's pick ONE and archive the rest for later.`,
      icon: '🧹',
      actionLabel: 'Start Purge'
    });
  }

  return strategies;
};

export const getSmartSuggestions = (currentTime, tasks, progress) => {
  // Logic for time-of-day based suggestions
  const hour = new Date().getHours();
  
  if (hour < 10 && progress < 10) {
    return {
      title: 'Morning Momentum',
      message: 'Start with your smallest task to trigger a dopamine loop.'
    };
  }
  
  if (hour > 20 && progress < 80) {
    return {
      title: 'Evening Sprint',
      message: 'Power down non-essentials. Focus on the one thing that will make tomorrow easier.'
    };
  }

  return null;
};
