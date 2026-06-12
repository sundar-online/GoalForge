// ═══════════════════════════════════════════════════════════
// Gamification Engine — GoalForge
// Pure logic: XP, Levels, Identity Badges
// ═══════════════════════════════════════════════════════════

// ── XP Source Constants ───────────────────────────────────
export const XP_SOURCES = {
  HABIT_COMPLETE: 15,
  TASK_COMPLETE: 10,
  PERFECT_DAY: 25,
  FOCUS_SESSION: 20,
  STREAK_MILESTONE: 30,   // every 5-day streak
  FIRST_ACTION: 5,
};

// ── Level Thresholds ──────────────────────────────────────
export const LEVEL_THRESHOLDS = [
  { level: 1,  title: 'Recruit',      xpRequired: 0 },
  { level: 2,  title: 'Initiate',     xpRequired: 100 },
  { level: 3,  title: 'Apprentice',   xpRequired: 250 },
  { level: 4,  title: 'Practitioner', xpRequired: 500 },
  { level: 5,  title: 'Specialist',   xpRequired: 800 },
  { level: 6,  title: 'Strategist',   xpRequired: 1200 },
  { level: 7,  title: 'Commander',    xpRequired: 1700 },
  { level: 8,  title: 'Architect',    xpRequired: 2400 },
  { level: 9,  title: 'Vanguard',     xpRequired: 3300 },
  { level: 10, title: 'Titan',        xpRequired: 4500 },
  { level: 11, title: 'Mythic',       xpRequired: 6000 },
  { level: 12, title: 'Ascendant',    xpRequired: 8000 },
];

/**
 * Get level info from total XP.
 * @param {number} totalXP
 * @returns {{ level: number, title: string, xpForCurrent: number, xpForNext: number, progress: number, xpInLevel: number }}
 */
export function getLevelFromXP(totalXP) {
  let currentTier = LEVEL_THRESHOLDS[0];

  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i].xpRequired) {
      currentTier = LEVEL_THRESHOLDS[i];
      break;
    }
  }

  const nextTier = LEVEL_THRESHOLDS.find(t => t.level === currentTier.level + 1);
  const xpForCurrent = currentTier.xpRequired;
  const xpForNext = nextTier ? nextTier.xpRequired : currentTier.xpRequired;
  const xpInLevel = totalXP - xpForCurrent;
  const xpNeeded = xpForNext - xpForCurrent;
  const progress = nextTier ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;

  return {
    level: currentTier.level,
    title: currentTier.title,
    xpForCurrent,
    xpForNext,
    xpInLevel,
    progress,
    isMaxLevel: !nextTier,
  };
}

// ── Timezone-Safe Date Parsing & Accuracy Helpers ──────────
const parseLocalDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const getConsecutiveAccuracyDays = (state, minAccuracy) => {
  const taskLogs = state.taskLogs || {};
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAccuracy = state.accuracy ?? 100;

  const dates = Object.keys(taskLogs).filter(d => d !== todayStr);
  const accMap = {};
  dates.forEach(d => {
    const log = taskLogs[d];
    accMap[d] = log.total_tasks > 0 ? (log.completed_tasks / log.total_tasks) * 100 : 100;
  });
  accMap[todayStr] = todayAccuracy;

  const allDates = Object.keys(accMap).sort();
  if (allDates.length === 0) return 0;

  let maxStreak = 0;
  let currentStreak = 0;

  const firstDate = parseLocalDate(allDates[0]);
  const lastDate = parseLocalDate(todayStr);

  let curr = new Date(firstDate);
  while (curr <= lastDate) {
    const dStr = curr.getFullYear() + '-' + String(curr.getMonth() + 1).padStart(2, '0') + '-' + String(curr.getDate()).padStart(2, '0');
    const acc = accMap[dStr];

    if (acc !== undefined && acc >= minAccuracy) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
    curr.setDate(curr.getDate() + 1);
  }

  return maxStreak;
};

const getWeekendWarriorCount = (state) => {
  const taskLogs = state.taskLogs || {};
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAccuracy = state.accuracy ?? 100;

  const dates = Object.keys(taskLogs).filter(d => d !== todayStr);
  const accMap = {};
  dates.forEach(d => {
    const log = taskLogs[d];
    accMap[d] = log.total_tasks > 0 ? (log.completed_tasks / log.total_tasks) * 100 : 100;
  });
  accMap[todayStr] = todayAccuracy;

  const weekendCompletions = {};

  Object.keys(accMap).forEach(dStr => {
    const date = parseLocalDate(dStr);
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    if (day === 0 || day === 6) {
      const monday = new Date(date);
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      const weekKey = monday.getFullYear() + '-' + String(monday.getMonth() + 1).padStart(2, '0') + '-' + String(monday.getDate()).padStart(2, '0');

      if (!weekendCompletions[weekKey]) {
        weekendCompletions[weekKey] = { sat: false, sun: false };
      }

      const is100 = accMap[dStr] >= 100;
      if (day === 6) weekendCompletions[weekKey].sat = is100;
      if (day === 0) weekendCompletions[weekKey].sun = is100;
    }
  });

  let count = 0;
  Object.values(weekendCompletions).forEach(w => {
    if (w.sat && w.sun) count++;
  });

  return count;
};

const isLearningSession = (session, goals) => {
  const goal = (goals || []).find(g => String(g.id) === String(session.goalId));
  if (goal && goal.tag === 'Learning') return true;
  const title = (session.title || '').toLowerCase();
  const goalTitle = (session.goalTitle || '').toLowerCase();
  return title.includes('learn') || title.includes('study') || title.includes('read') || title.includes('course') ||
         goalTitle.includes('learn') || goalTitle.includes('study') || goalTitle.includes('read') || goalTitle.includes('course');
};

const getLearningSessionsCount = (state) => {
  return (state.sessionLogs || []).filter(s => isLearningSession(s, state.goals)).length;
};

// ── Identity Badge Definitions ────────────────────────────
export const BADGE_DEFINITIONS = [
  // ── Consistency Badges ──
  {
    id: 'streak_apprentice',
    title: 'Streak Apprentice',
    category: 'consistency',
    icon: '🔥',
    description: 'Started a solid habit loop.',
    hint: 'Reach a 7-day streak on any habit or task.',
    condition: (state) => {
      const maxStreak = Math.max(
        0,
        ...(state.goals || []).flatMap(g => (g.habits || []).map(h => h.streak ?? 0)),
        ...(state.tasks || []).map(t => t.currentStreak ?? 0)
      );
      return maxStreak >= 7;
    },
  },
  {
    id: 'streak_master',
    title: 'Streak Master',
    category: 'consistency',
    icon: '🔥',
    description: 'Your consistency is legendary.',
    hint: 'Reach a 30-day streak on any habit or task.',
    condition: (state) => {
      const maxStreak = Math.max(
        0,
        ...(state.goals || []).flatMap(g => (g.habits || []).map(h => h.streak ?? 0)),
        ...(state.tasks || []).map(t => t.currentStreak ?? 0)
      );
      return maxStreak >= 30;
    },
  },
  {
    id: 'iron_will',
    title: 'Iron Will',
    category: 'consistency',
    icon: '🔥',
    description: 'Nothing can shake your focus.',
    hint: 'Reach a 60-day streak on any habit or task.',
    condition: (state) => {
      const maxStreak = Math.max(
        0,
        ...(state.goals || []).flatMap(g => (g.habits || []).map(h => h.streak ?? 0)),
        ...(state.tasks || []).map(t => t.currentStreak ?? 0)
      );
      return maxStreak >= 60;
    },
  },
  {
    id: 'unbreakable',
    title: 'Unbreakable',
    category: 'consistency',
    icon: '🔥',
    description: 'You have forged a permanent routine.',
    hint: 'Reach a 100-day streak on any habit or task.',
    condition: (state) => {
      const maxStreak = Math.max(
        0,
        ...(state.goals || []).flatMap(g => (g.habits || []).map(h => h.streak ?? 0)),
        ...(state.tasks || []).map(t => t.currentStreak ?? 0)
      );
      return maxStreak >= 100;
    },
  },
  {
    id: 'eternal_forge',
    title: 'Eternal Forge',
    category: 'consistency',
    icon: '🔥',
    description: 'A full year of pure discipline.',
    hint: 'Reach a 365-day streak on any habit or task.',
    condition: (state) => {
      const maxStreak = Math.max(
        0,
        ...(state.goals || []).flatMap(g => (g.habits || []).map(h => h.streak ?? 0)),
        ...(state.tasks || []).map(t => t.currentStreak ?? 0)
      );
      return maxStreak >= 365;
    },
  },

  // ── Learning Badges ──
  {
    id: 'scholar',
    title: 'Scholar',
    category: 'learning',
    icon: '🧠',
    description: 'Acquiring knowledge systematically.',
    hint: 'Complete 10 learning sessions.',
    condition: (state) => getLearningSessionsCount(state) >= 10,
  },
  {
    id: 'knowledge_seeker',
    title: 'Knowledge Seeker',
    category: 'learning',
    icon: '🧠',
    description: 'Hunting for wisdom across disciplines.',
    hint: 'Complete 50 learning sessions.',
    condition: (state) => getLearningSessionsCount(state) >= 50,
  },
  {
    id: 'lifelong_learner',
    title: 'Lifelong Learner',
    category: 'learning',
    icon: '🧠',
    description: 'Growth is your permanent state of mind.',
    hint: 'Complete 100 learning sessions.',
    condition: (state) => getLearningSessionsCount(state) >= 100,
  },

  // ── Focus Badges ──
  {
    id: 'deep_worker',
    title: 'Deep Worker',
    category: 'focus',
    icon: '⚡',
    description: "You've become a Deep Worker.",
    hint: 'Accumulate 10+ hours of focus time.',
    condition: (state) => {
      const totalFocusSeconds = Object.values(state.focusHistory || {}).reduce((a, b) => a + b, 0) + (state.focusTime ?? 0);
      return totalFocusSeconds >= 10 * 3600;
    },
  },
  {
    id: 'focus_titan',
    title: 'Focus Titan',
    category: 'focus',
    icon: '⚡',
    description: 'Your focus is impenetrable.',
    hint: 'Accumulate 50+ hours of focus time.',
    condition: (state) => {
      const totalFocusSeconds = Object.values(state.focusHistory || {}).reduce((a, b) => a + b, 0) + (state.focusTime ?? 0);
      return totalFocusSeconds >= 50 * 3600;
    },
  },
  {
    id: 'time_architect',
    title: 'Time Architect',
    category: 'focus',
    icon: '⚡',
    description: 'Master of your own hours.',
    hint: 'Accumulate 100+ hours of focus time.',
    condition: (state) => {
      const totalFocusSeconds = Object.values(state.focusHistory || {}).reduce((a, b) => a + b, 0) + (state.focusTime ?? 0);
      return totalFocusSeconds >= 100 * 3600;
    },
  },

  // ── Accuracy Badges ──
  {
    id: 'sharpshooter',
    title: 'Sharpshooter',
    category: 'accuracy',
    icon: '🎯',
    description: 'Consistency of an elite striker.',
    hint: 'Maintain 90%+ accuracy for 7 days.',
    condition: (state) => getConsecutiveAccuracyDays(state, 90) >= 7,
  },
  {
    id: 'precision_master',
    title: 'Precision Master',
    category: 'accuracy',
    icon: '🎯',
    description: 'Your execution is flawless.',
    hint: 'Maintain 90%+ accuracy for 30 days.',
    condition: (state) => getConsecutiveAccuracyDays(state, 90) >= 30,
  },
  {
    id: 'perfectionist',
    title: 'Perfectionist',
    category: 'accuracy',
    icon: '🎯',
    description: 'Absolute precision achieved.',
    hint: 'Achieve 100% accuracy for 10 days.',
    condition: (state) => getConsecutiveAccuracyDays(state, 100) >= 10,
  },

  // ── Recovery Badges ──
  {
    id: 'comeback_king',
    title: 'Comeback King',
    category: 'recovery',
    icon: '🔄',
    description: 'Resilience is your edge.',
    hint: 'Recover from a broken streak.',
    condition: (state) => (state.comebackCount ?? 0) >= 1,
  },
  {
    id: 'phoenix_rising',
    title: 'Phoenix Rising',
    category: 'recovery',
    icon: '🔄',
    description: 'Rebuilt a streak to 30+ days after a setback.',
    hint: 'Rebuild a 30+ day streak.',
    condition: (state) => {
      const maxStreak = Math.max(
        0,
        ...(state.goals || []).flatMap(g => (g.habits || []).map(h => h.streak ?? 0)),
        ...(state.tasks || []).map(t => t.currentStreak ?? 0)
      );
      return (state.comebackCount ?? 0) >= 1 && maxStreak >= 30;
    },
  },
  {
    id: 'never_give_up',
    title: 'Never Give Up',
    category: 'recovery',
    icon: '🔄',
    description: 'Setbacks are just setups for comebacks.',
    hint: 'Recover from 3 major setbacks.',
    condition: (state) => (state.comebackCount ?? 0) >= 3,
  },

  // ── System Builder Badges ──
  {
    id: 'architect',
    title: 'Architect',
    category: 'system',
    icon: '🏗️',
    description: 'You think in systems.',
    hint: 'Create 5 goals.',
    condition: (state) => (state.goals || []).length >= 5,
  },
  {
    id: 'forge_master',
    title: 'Forge Master',
    category: 'system',
    icon: '🏗️',
    description: 'Orchestrating multiple paths to growth.',
    hint: 'Manage 10 active goals.',
    condition: (state) => (state.goals || []).filter(g => !g.isMissingDream).length >= 10,
  },
  {
    id: 'empire_builder',
    title: 'Empire Builder',
    category: 'system',
    icon: '🏗️',
    description: 'Your achievements span a massive kingdom.',
    hint: 'Complete 25 goals.',
    condition: (state) => {
      const completedGoalsCount = Math.max(
        (state.memories || []).length,
        (state.goals || []).filter(g => g.progress === 100).length
      );
      return completedGoalsCount >= 25;
    },
  },

  // ── Discipline Badges ──
  {
    id: 'diamond_hands',
    title: 'Diamond Hands',
    category: 'discipline',
    icon: '💎',
    description: 'You held the line.',
    hint: 'Maintain a streak despite difficult periods (Reach Level 5).',
    condition: (state) => (state.level || 1) >= 5,
  },
  {
    id: 'spartan_mind',
    title: 'Spartan Mind',
    category: 'discipline',
    icon: '💎',
    description: 'Habits are automatic actions for you.',
    hint: 'Complete habits for 50 consecutive days.',
    condition: (state) => {
      const maxHabitStreak = Math.max(
        0,
        ...(state.goals || []).flatMap(g => (g.habits || []).map(h => h.streak ?? 0))
      );
      return maxHabitStreak >= 50;
    },
  },
  {
    id: 'discipline_legend',
    title: 'Discipline Legend',
    category: 'discipline',
    icon: '💎',
    description: 'Your self-control is absolute.',
    hint: 'Reach 100 discipline points.',
    condition: (state) => (state.disciplineScore ?? 0) >= 100,
  },

  // ── Reflection Badges ──
  {
    id: 'chronicler',
    title: 'Chronicler',
    category: 'reflection',
    icon: '📖',
    description: 'Your thoughts shape reality.',
    hint: 'Write 10 notes.',
    condition: (state) => (state.notes || []).length >= 10,
  },
  {
    id: 'story_keeper',
    title: 'Story Keeper',
    category: 'reflection',
    icon: '📖',
    description: 'Documenting the steps of your climb.',
    hint: 'Write 50 notes.',
    condition: (state) => (state.notes || []).length >= 50,
  },
  {
    id: 'wisdom_archivist',
    title: 'Wisdom Archivist',
    category: 'reflection',
    icon: '📖',
    description: 'A library of personal realizations.',
    hint: 'Write 100 notes.',
    condition: (state) => (state.notes || []).length >= 100,
  },

  // ── Achievement Badges ──
  {
    id: 'centurion',
    title: 'Centurion',
    category: 'achievement',
    icon: '🏆',
    description: 'A hundred victories forged.',
    hint: 'Complete 100 tasks.',
    condition: (state) => (state.totalCompletions ?? 0) >= 100,
  },
  {
    id: 'champion',
    title: 'Champion',
    category: 'achievement',
    icon: '🏆',
    description: 'An unstoppable force of execution.',
    hint: 'Complete 500 tasks.',
    condition: (state) => (state.totalCompletions ?? 0) >= 500,
  },
  {
    id: 'legend',
    title: 'Legend',
    category: 'achievement',
    icon: '🏆',
    description: 'Your name is written in the history of the Forge.',
    hint: 'Complete 1000 tasks.',
    condition: (state) => (state.totalCompletions ?? 0) >= 1000,
  },

  // ── Hidden Legendary Badges ──
  {
    id: 'night_owl',
    title: 'Night Owl',
    category: 'legendary',
    icon: '🌟',
    description: 'Crushing goals when the world is asleep.',
    hint: 'Complete habits after 11 PM for 7 days.',
    condition: (state) => (state.nightOwlDates || []).length >= 7,
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    category: 'legendary',
    icon: '🌟',
    description: 'Crushing goals before the sunrise.',
    hint: 'Finish all goals before 8 AM for 7 days.',
    condition: (state) => (state.earlyBirdDates || []).length >= 7,
  },
  {
    id: 'weekend_warrior',
    title: 'Weekend Warrior',
    category: 'legendary',
    icon: '🌟',
    description: 'Maintaining peak protocol on weekends.',
    hint: '100% completion on 10 weekends.',
    condition: (state) => getWeekendWarriorCount(state) >= 10,
  },
  {
    id: 'renaissance_soul',
    title: 'Renaissance Soul',
    category: 'legendary',
    icon: '🌟',
    description: 'Master of all arts of the self.',
    hint: 'Unlock badges in every category.',
    condition: (state) => {
      const unlockedSet = new Set(state.earnedBadges || []);
      const categoriesToCheck = ['consistency', 'learning', 'focus', 'accuracy', 'recovery', 'system', 'discipline', 'reflection', 'achievement'];
      return categoriesToCheck.every(cat => {
        const catBadges = BADGE_DEFINITIONS.filter(b => b.category === cat).map(b => b.id);
        return catBadges.some(id => unlockedSet.has(id));
      });
    },
  },
  {
    id: 'the_goalforge',
    title: 'The GoalForge',
    category: 'legendary',
    icon: '🌟',
    description: 'Discipline absolute, identity complete.',
    hint: 'Unlock all other badges.',
    condition: (state) => {
      const unlockedSet = new Set(state.earnedBadges || []);
      const otherBadgeIds = BADGE_DEFINITIONS.filter(b => b.id !== 'the_goalforge').map(b => b.id);
      return otherBadgeIds.every(id => unlockedSet.has(id));
    },
  },
];

/**
 * Evaluate which badges have been earned given the current state.
 * @param {object} state
 * @returns {string[]} Array of earned badge IDs
 */
export function evaluateBadges(state) {
  return BADGE_DEFINITIONS
    .filter(badge => badge.condition(state))
    .map(badge => badge.id);
}

/**
 * Find newly earned badges by comparing previous and current earned sets.
 * @param {string[]} previousBadges
 * @param {string[]} currentBadges
 * @returns {object[]} Array of newly unlocked badge definitions
 */
export function getNewlyEarnedBadges(previousBadges, currentBadges) {
  const prevSet = new Set(previousBadges);
  const newIds = currentBadges.filter(id => !prevSet.has(id));
  return newIds.map(id => BADGE_DEFINITIONS.find(b => b.id === id)).filter(Boolean);
}

/**
 * Get the badge definition by ID.
 * @param {string} badgeId
 * @returns {object|undefined}
 */
export function getBadgeById(badgeId) {
  return BADGE_DEFINITIONS.find(b => b.id === badgeId);
}
