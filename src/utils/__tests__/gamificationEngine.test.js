/**
 * @vitest-environment node
 *
 * Regression tests for getLevelFromXP — the function that was resetting to
 * level 1 when totalXP crossed the Level 8 threshold.
 *
 * Key scenarios tested:
 *  - Exact threshold boundaries (one below / exact / one above) for L6, L7, L8
 *  - The previously broken L7→L8 transition
 *  - Levels beyond the hardcoded table (L13, L20) via the formula branch
 *  - Edge cases: 0 XP, negative XP, very large XP
 */

import { describe, it, expect } from 'vitest';
import { getLevelFromXP, LEVEL_THRESHOLDS, XP_PER_EXTRA_LEVEL } from '../gamificationEngine';

// ── Helpers ────────────────────────────────────────────────────────────────
const xpFor = (level) => {
  const tier = LEVEL_THRESHOLDS.find((t) => t.level === level);
  if (tier) return tier.xpRequired;
  // formula branch: level 13+
  const maxTier = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return maxTier.xpRequired + (level - maxTier.level) * XP_PER_EXTRA_LEVEL;
};

// ── Boundary correctness for levels 6, 7, 8 (the regression zone) ─────────
describe('getLevelFromXP — L6 / L7 / L8 boundaries', () => {
  it('returns level 6 at exactly 1 200 XP', () => {
    const { level } = getLevelFromXP(1200);
    expect(level).toBe(6);
  });

  it('returns level 6 at 1 699 XP (one below L7 gate)', () => {
    const { level } = getLevelFromXP(1699);
    expect(level).toBe(6);
  });

  it('returns level 7 at exactly 1 700 XP', () => {
    const { level } = getLevelFromXP(1700);
    expect(level).toBe(7);
  });

  it('returns level 7 at 2 399 XP (one below L8 gate) — was the regression case', () => {
    const { level } = getLevelFromXP(2399);
    expect(level).toBe(7);
  });

  it('returns level 8 at exactly 2 400 XP — PREVIOUSLY RETURNED 1', () => {
    const { level, title } = getLevelFromXP(2400);
    expect(level).toBe(8);
    expect(title).toBe('Architect');
  });

  it('returns level 8 at 3 299 XP (one below L9 gate)', () => {
    const { level } = getLevelFromXP(3299);
    expect(level).toBe(8);
  });
});

// ── Progress bar values are always finite and in [0, 100] ──────────────────
describe('getLevelFromXP — progress is always a valid percentage', () => {
  const testXps = [0, 99, 100, 1699, 1700, 2399, 2400, 7999, 8000, 8001, 10499, 10500, 28000];

  testXps.forEach((xp) => {
    it(`progress is in [0,100] and finite for ${xp} XP`, () => {
      const { progress } = getLevelFromXP(xp);
      expect(Number.isFinite(progress)).toBe(true);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });
});

// ── isMaxLevel is never true (no hard cap) ─────────────────────────────────
describe('getLevelFromXP — isMaxLevel is always false', () => {
  [0, 1700, 2400, 8000, 28000, 1_000_000].forEach((xp) => {
    it(`isMaxLevel is false at ${xp} XP`, () => {
      expect(getLevelFromXP(xp).isMaxLevel).toBe(false);
    });
  });
});

// ── Formula branch: levels 13+ scale indefinitely ─────────────────────────
describe('getLevelFromXP — formula branch (levels 13+)', () => {
  it('returns level 12 with progress toward 13 at 8 001 XP', () => {
    const info = getLevelFromXP(8001);
    expect(info.level).toBe(12);
    expect(info.xpForNext).toBe(8000 + XP_PER_EXTRA_LEVEL);
    // At 8001 XP, progress = Math.round(1/2500 * 100) = 0 — that's valid and in-range
    expect(info.progress).toBeGreaterThanOrEqual(0);
    expect(info.progress).toBeLessThan(100);
  });

  it('returns level 13 at exactly 10 500 XP (8 000 + 1 x 2 500)', () => {
    const xp = 8000 + XP_PER_EXTRA_LEVEL;
    const { level, title } = getLevelFromXP(xp);
    expect(level).toBe(13);
    expect(title).toBe('Level 13');
  });

  it('returns level 20 at 28 000 XP (8 000 + 8 x 2 500)', () => {
    const xp = xpFor(20); // 8000 + 8 * 2500 = 28 000
    expect(xp).toBe(28000);
    const { level } = getLevelFromXP(xp);
    expect(level).toBe(20);
  });

  it('xpForNext is always exactly xpForCurrent + XP_PER_EXTRA_LEVEL in formula branch', () => {
    [13, 20, 50, 100].forEach((lvl) => {
      const xp = xpFor(lvl);
      const info = getLevelFromXP(xp);
      expect(info.xpForNext - info.xpForCurrent).toBe(XP_PER_EXTRA_LEVEL);
    });
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────
describe('getLevelFromXP — edge cases', () => {
  it('returns level 1 for 0 XP', () => {
    expect(getLevelFromXP(0).level).toBe(1);
  });

  it('returns level 1 for negative XP (defensive)', () => {
    expect(getLevelFromXP(-50).level).toBe(1);
  });

  it('handles very large XP without throwing', () => {
    const info = getLevelFromXP(10_000_000);
    expect(info.level).toBeGreaterThan(12);
    expect(info.progress).toBeLessThanOrEqual(100);
  });
});
