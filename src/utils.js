/**
 * Utility functions for Antigravity Reinforcement Game.
 * Centralizes checks for relics, synergies, and statuses to improve readability and safety.
 */

export function hasRelic(relicId, relicsArray) {
  return Array.isArray(relicsArray) && relicsArray.some(r => r.id === relicId);
}

export function hasSynergy(beast, synergyId) {
  if (!beast || !beast.synergy) return false;
  if (Array.isArray(beast.synergy)) return beast.synergy.includes(synergyId);
  return beast.synergy === synergyId;
}

export function getStatus(statuses, type) {
  if (!statuses || typeof statuses !== 'object') return 0;
  return statuses[type] || 0;
}

export function addStatus(statuses, type, amount = 1) {
  if (!statuses || typeof statuses !== 'object') return;
  statuses[type] = getStatus(statuses, type) + amount;
}

export function setStatus(statuses, type, amount) {
  if (!statuses || typeof statuses !== 'object') return;
  statuses[type] = amount;
}

export function clearStatus(statuses, type) {
  if (!statuses || typeof statuses !== 'object') return;
  statuses[type] = 0;
}
