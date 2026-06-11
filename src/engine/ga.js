import { calculateDamage } from '../combat.js';

export function orderCrossover(p1, p2, startIdx, endIdx) {
  const child = new Array(p1.length).fill(null);
  const childSet = new Set();
  
  for (let i = startIdx; i < endIdx; i++) {
    child[i] = p1[i];
    childSet.add(p1[i]);
  }
  
  let p2Idx = 0;
  for (let i = 0; i < child.length; i++) {
    if (child[i] === null) {
      while (p2Idx < p2.length && childSet.has(p2[p2Idx])) {
        p2Idx++;
      }
      if (p2Idx < p2.length) {
        child[i] = p2[p2Idx];
        childSet.add(p2[p2Idx]);
      } else {
        child[i] = p1[i];
      }
    }
  }
  return child;
}

export function mutateSwap(seq, maxSlots, playerSwapChance = 0.2, fixedSwapChance = 0.2) {
  if (seq.length < 2) return seq;
  const child = [...seq];

  // Phase 1: Inventory Swap (Only if sequence has inactive beasts)
  if (child.length > maxSlots && Math.random() < playerSwapChance) {
    const activeIdx = Math.floor(Math.random() * maxSlots);
    const benchIdx = maxSlots + Math.floor(Math.random() * (child.length - maxSlots));
    const temp = child[activeIdx];
    child[activeIdx] = child[benchIdx];
    child[benchIdx] = temp;
  }

  // Phase 2: Ordering Swap
  if (Math.random() < fixedSwapChance) {
    const idx1 = Math.floor(Math.random() * Math.min(maxSlots, child.length));
    let idx2 = Math.floor(Math.random() * Math.min(maxSlots, child.length));
    while (idx1 === idx2 && maxSlots > 1) idx2 = Math.floor(Math.random() * Math.min(maxSlots, child.length));
    if (idx1 !== idx2) {
      const temp = child[idx1];
      child[idx1] = child[idx2];
      child[idx2] = temp;
    }
  }

  return child;
}

export function evaluateFitness(seq, sims, maxSlots, bossHp, currentStance, globalStatuses, state, metaState) {
  let total = 0;
  const activeSeq = seq.slice(0, maxSlots);
  for (let i = 0; i < sims; i++) {
    total += calculateDamage(activeSeq, bossHp, currentStance, globalStatuses, {
      gold: state.gold,
      epochs: state.totalEpochsRun,
      inventorySize: state.beasts.length,
      level: state.level,
      relics: state.relics,
      metaState: metaState
    }).totalDamage;
  }
  return total / sims;
}
