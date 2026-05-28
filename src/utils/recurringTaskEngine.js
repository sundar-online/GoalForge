/**
 * recurringTaskEngine.js
 *
 * Manages recurring task identity, history lookups, and tracking key
 * generation. Used by toggleTaskComplete, updateTaskCount, logTaskTime,
 * and the daily reset in AppContext.
 *
 * All functions are pure — no React state, no side effects.
 */

export { getTaskTrackingKey } from './calculationUtils';

/**
 * Resolves the authoritative completedDates array for a recurring task.
 *
 * Priority: recurringHistory (Firestore-persisted, most authoritative) →
 *           task.completedDates (locally saved) → empty array.
 *
 * @param {object} task - The task object from state.
 * @param {object} recurringHistory - Map of recId → { completedDates, streak }.
 * @returns {string[]} A fresh copy of the completedDates array.
 */
export function getOrBuildRecDates(task, recurringHistory) {
  const recId = task.recurringId || _buildTrackingKey(task);
  const fromHistory = recurringHistory[recId]?.completedDates;
  if (fromHistory && fromHistory.length > 0) {
    return [...fromHistory];
  }
  return task.completedDates ? [...task.completedDates] : [];
}

/**
 * Builds the payload object to upsert into the recurringHistory collection.
 *
 * @param {object} task - The task object.
 * @param {string[]} recDates - The updated completedDates array.
 * @param {number} newStreak - The newly calculated streak value.
 * @returns {{ title: string, type: string, completedDates: string[], streak: number }}
 */
export function buildRecurringPayload(task, recDates, newStreak) {
  return {
    title: task.title,
    type: task.type || 'daily',
    completedDates: recDates,
    streak: newStreak,
  };
}

/**
 * Returns the recurring ID for a task (recurringId field, or derived key).
 * Keeps callers from importing getTaskTrackingKey directly when they already
 * have the recId concept.
 *
 * @param {object} task
 * @returns {string}
 */
export function getRecId(task) {
  return task.recurringId || _buildTrackingKey(task);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _buildTrackingKey(task) {
  const titlePart = (task.title || '').trim().toLowerCase();
  const typePart = task.type || 'daily';
  return `${titlePart}_${typePart}`;
}
