import { state, runState } from './state.js';
import { saveRunState as storageSaveRunState, loadRunState as storageLoadRunState, clearRunState as storageClearRunState } from '../storage.js';

export function saveRunState() {
  const rs = {
    state,
    bossHp: runState.bossHp,
    bossMaxHp: runState.bossMaxHp,
    combatRound: runState.combatRound,
    currentStance: runState.currentStance,
    globalStatuses: runState.globalStatuses,
    bestSequence: runState.bestSequence,
    bestExpectedDmg: runState.bestExpectedDmg
  };
  storageSaveRunState(rs);
}

export function loadRunState() {
  const parsed = storageLoadRunState();
  if (parsed) {
    try {
      Object.assign(state, parsed.state);
      window.__activeTemporarySkill = state.temporarySkill;
      runState.bossHp = parsed.bossHp;
      runState.bossMaxHp = parsed.bossMaxHp;
      runState.combatRound = parsed.combatRound;
      runState.currentStance = parsed.currentStance;
      runState.globalStatuses = parsed.globalStatuses || {};
      runState.bestSequence = parsed.bestSequence || [];
      runState.bestExpectedDmg = parsed.bestExpectedDmg || 0;

      const fixImagePath = (imgUrl) => {
        if (!imgUrl) return imgUrl;
        if (imgUrl.includes('/beasts/')) {
          const file = imgUrl.split('/').pop();
          const slug = file.replace('beast_', '').replace('.png', '').replace('.jpeg', '');
          return `assets/beasts/${slug}.png`;
        }
        if (imgUrl.includes('/relics/') && !imgUrl.endsWith('.jpeg')) {
          return imgUrl.replace('.png', '.jpeg');
        }
        return imgUrl;
      };

      if (state.beasts) state.beasts.forEach(b => { b.image = fixImagePath(b.image); });
      if (state.shopOfferings) state.shopOfferings.forEach(b => { b.image = fixImagePath(b.image); });
      if (state.relics) state.relics.forEach(r => { r.image = fixImagePath(r.image); });
      if (state.relicOfferings) state.relicOfferings.forEach(r => { r.image = fixImagePath(r.image); });
      if (runState.bestSequence) runState.bestSequence.forEach(b => { b.image = fixImagePath(b.image); });

      return true;
    } catch (e) {
      console.error("Failed to load run state", e);
      return false;
    }
  }
  return false;
}

export function clearRunState() {
  storageClearRunState();
}
