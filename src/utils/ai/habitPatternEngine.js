/**
 * Habit Pattern Analysis Engine
 *
 * Detects:
 * — Best performance day of the week (highest avg completion per weekday)
 * — Worst performance window (lowest 3-day rolling average in last 21 days)
 * — Improved habit co-completion pairing
 * — Weekend vs weekday momentum pattern
 *
 * Run frequency: Every 6 hours
 */

import { TODAY, addDays } from '../dateUtils';
import { makeInsight } from './insightSchema';

// ── Helpers ─────────────────────────────────────────────────────────────────

const logAccuracy = (log) =>
  log && log.total_tasks > 0 ? log.completed_tasks / log.total_tasks : 0;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getDayName = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return DAY_NAMES[d.getDay()];
};

// ── Main Export ──────────────────────────────────────────────────────────────

/**
 * @param {object[]} goals
 * @param {object} taskLogs — { [dateStr]: logObject }
 * @returns {object[]} insights
 */
export const analyzeHabitPatterns = (goals, taskLogs) => {
  const insights = [];
  const today = TODAY();

  const allLogs = Object.values(taskLogs || {})
    .filter(l => l && l.date && l.date !== today)
    .sort((a, b) => a.date > b.date ? 1 : -1)
    .slice(-21);

  const activeGoals = (goals || []).filter(g => !g.isMissingDream);
  const allHabits = activeGoals.flatMap(g => g.habits || []);

  // ── 1. Best & Worst Day of the Week ──────────────────────────────────────
  if (allLogs.length >= 7) {
    const byDay = {};
    for (const log of allLogs) {
      if (!log.date || log.total_tasks === 0) continue;
      const day = getDayName(log.date);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(logAccuracy(log));
    }

    const dayAvgs = Object.entries(byDay)
      .filter(([, accs]) => accs.length >= 2)
      .map(([day, accs]) => ({
        day,
        avg: accs.reduce((s, a) => s + a, 0) / accs.length,
        count: accs.length,
      }));

    if (dayAvgs.length >= 3) {
      const sorted = [...dayAvgs].sort((a, b) => b.avg - a.avg);
      const bestDay = sorted[0];
      const worstDay = sorted[sorted.length - 1];

      if (bestDay.avg >= 0.7) {
        insights.push(makeInsight({
          id: `habit_best_day_${bestDay.day}`,
          type: 'habit_pattern',
          priority: 'low',
          title: `📅 ${bestDay.day} is Your Peak Day`,
          message: `You average ${Math.round(bestDay.avg * 100)}% completion on ${bestDay.day}s. Schedule your most important habits on this day to maximize impact.`,
          dismissible: true,
          metadata: { bestDay: bestDay.day, avg: bestDay.avg },
        }));
      }

      if (worstDay.avg < 0.45 && bestDay.day !== worstDay.day) {
        insights.push(makeInsight({
          id: `habit_worst_day_${worstDay.day}`,
          type: 'habit_pattern',
          priority: 'low',
          title: `⚡ ${worstDay.day} Needs an Anchor`,
          message: `${worstDay.day}s average only ${Math.round(worstDay.avg * 100)}% completion. Consider adding a single easy "anchor habit" on ${worstDay.day}s to build momentum from a reliable win.`,
          dismissible: true,
          metadata: { worstDay: worstDay.day, avg: worstDay.avg },
        }));
      }
    }
  }

  // ── 2. Weekend vs Weekday Momentum ───────────────────────────────────────
  if (allLogs.length >= 5) {
    let weekdaySum = 0, weekdayCount = 0;
    let weekendSum = 0, weekendCount = 0;

    for (const log of allLogs) {
      if (!log.date || log.total_tasks === 0) continue;
      const day = getDayName(log.date);
      const isWeekend = day === 'Saturday' || day === 'Sunday';
      const acc = logAccuracy(log);
      if (isWeekend) { weekendSum += acc; weekendCount++; }
      else { weekdaySum += acc; weekdayCount++; }
    }

    const weekdayAvg = weekdayCount > 0 ? weekdaySum / weekdayCount : 0;
    const weekendAvg = weekendCount > 0 ? weekendSum / weekendCount : 0;

    if (weekendCount >= 2 && weekdayCount >= 3) {
      const diff = Math.abs(weekendAvg - weekdayAvg);
      if (diff >= 0.12) {
        const betterPeriod = weekendAvg > weekdayAvg ? 'weekends' : 'weekdays';
        const weakerPeriod = weekendAvg > weekdayAvg ? 'weekdays' : 'weekends';
        const betterPct = Math.round(Math.max(weekendAvg, weekdayAvg) * 100);
        const weakerPct = Math.round(Math.min(weekendAvg, weekdayAvg) * 100);

        insights.push(makeInsight({
          id: `habit_pattern_${betterPeriod}`,
          type: 'habit_pattern',
          priority: 'low',
          title: betterPeriod === 'weekends' ? '🌅 Weekend Momentum Peak' : '⚡ Weekday Focus Mastery',
          message: `You average ${betterPct}% on ${betterPeriod} vs ${weakerPct}% on ${weakerPeriod}. Consider scheduling a simple "anchor habit" on your weaker days to bridge the gap.`,
          dismissible: true,
          metadata: { weekdayAvg, weekendAvg },
        }));
      }
    }
  }

  // ── 3. Habit Co-Completion Pairing ───────────────────────────────────────
  if (allHabits.length >= 2) {
    let bestPair = null;
    let maxOverlap = 0;

    for (let i = 0; i < allHabits.length; i++) {
      for (let j = i + 1; j < allHabits.length; j++) {
        const h1 = allHabits[i];
        const h2 = allHabits[j];
        const dates1 = new Set(h1.completedDates || []);
        const dates2 = h2.completedDates || [];
        if (dates1.size < 4 || dates2.length < 4) continue;

        const overlap = dates2.filter(d => dates1.has(d)).length;
        const pairRate = overlap / Math.min(dates1.size, dates2.length);

        if (overlap >= 4 && pairRate >= 0.65 && overlap > maxOverlap) {
          maxOverlap = overlap;
          bestPair = { h1, h2, overlap, pairRate };
        }
      }
    }

    if (bestPair) {
      insights.push(makeInsight({
        id: 'habit_pairing_detected',
        type: 'habit_pattern',
        priority: 'low',
        title: '🧬 Power Habit Pair Detected',
        message: `"${bestPair.h1.title}" and "${bestPair.h2.title}" are completed together ${Math.round(bestPair.pairRate * 100)}% of the time. Schedule them back-to-back for maximum momentum.`,
        dismissible: true,
        metadata: { h1: bestPair.h1.title, h2: bestPair.h2.title, pairRate: bestPair.pairRate, overlap: bestPair.overlap },
      }));
    }
  }

  // ── 4. Steady Improvement Trend ──────────────────────────────────────────
  if (allLogs.length >= 6) {
    const half = Math.floor(allLogs.length / 2);
    const firstAvg = allLogs.slice(0, half).reduce((s, l) => s + logAccuracy(l), 0) / half;
    const secondAvg = allLogs.slice(half).reduce((s, l) => s + logAccuracy(l), 0) / (allLogs.length - half);

    if (secondAvg > firstAvg + 0.1) {
      insights.push(makeInsight({
        id: 'habit_steady_improvement',
        type: 'habit_pattern',
        priority: 'low',
        title: '📈 Consistency Compounding',
        message: `Your completion rate improved from ${Math.round(firstAvg * 100)}% to ${Math.round(secondAvg * 100)}% over the past 3 weeks. Compounding discipline is working — keep the chain unbroken.`,
        dismissible: true,
        metadata: { firstAvg, secondAvg },
      }));
    }
  }

  return insights;
};
