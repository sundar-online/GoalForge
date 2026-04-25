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

// ── Identity Badge Definitions ────────────────────────────
export const BADGE_DEFINITIONS = [
  {
    id: 'streak_master',
    title: 'Streak Master',
    icon: '🔥',
    description: 'Your consistency is legendary.',
    hint: 'Reach a 10-day streak on any habit.',
    condition: (state) => {
      const maxStreak = Math.max(
        0,
        ...state.goals.flatMap(g => (g.habits || []).map(h => h.streak || 0)),
        ...state.tasks.map(t => t.currentStreak || 0)
      );
      return maxStreak >= 10;
    },
  },
  {
    id: 'deep_worker',
    title: 'Deep Worker',
    icon: '🧠',
    description: "You've become a Deep Worker.",
    hint: 'Accumulate 10+ hours of focus time.',
    condition: (state) => {
      const totalFocusSeconds = Object.values(state.focusHistory || {}).reduce((a, b) => a + b, 0) + (state.focusTime || 0);
      return totalFocusSeconds >= 10 * 3600; // 10 hours
    },
  },
  {
    id: 'sharpshooter',
    title: 'Sharpshooter',
    icon: '🎯',
    description: 'Precision is your superpower.',
    hint: 'Hit 100% accuracy on 5 separate days.',
    condition: (state) => (state.perfectDays || 0) >= 5,
  },
  {
    id: 'architect',
    title: 'Architect',
    icon: '🏗️',
    description: 'You think in systems.',
    hint: 'Create 5 or more goals.',
    condition: (state) => (state.goals || []).length >= 5,
  },
  {
    id: 'chronicler',
    title: 'Chronicler',
    icon: '📝',
    description: 'Your thoughts shape reality.',
    hint: 'Write 10 or more notes.',
    condition: (state) => (state.notes || []).length >= 10,
  },
  {
    id: 'comeback_king',
    title: 'Comeback King',
    icon: '🔄',
    description: 'Resilience is your edge.',
    hint: 'Recover a streak after hitting 2 missed days.',
    condition: (state) => (state.comebackCount || 0) >= 1,
  },
  {
    id: 'diamond_hands',
    title: 'Diamond Hands',
    icon: '💎',
    description: 'You held the line.',
    hint: 'Reach Level 5.',
    condition: (state) => (state.level || 1) >= 5,
  },
  {
    id: 'mythic_status',
    title: 'Mythic Status',
    icon: '🌟',
    description: 'Welcome to the pantheon.',
    hint: 'Reach Level 10.',
    condition: (state) => (state.level || 1) >= 10,
  },
  {
    id: 'centurion',
    title: 'Centurion',
    icon: '⚡',
    description: 'A hundred victories forged.',
    hint: 'Complete 100 total habits or tasks.',
    condition: (state) => (state.totalCompletions || 0) >= 100,
  },
];

/**
 * Evaluate which badges have been earned given the current state.
 * @param {object} state — { goals, tasks, notes, focusHistory, focusTime, perfectDays, level, comebackCount, totalCompletions }
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
