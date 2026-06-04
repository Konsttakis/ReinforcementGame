import { calculateDamage } from './combat.js';

self.onmessage = function(e) {
  const { population, maxSlots, sims, bossHp, currentStance, globalStatuses, gameState } = e.data;
  
  // Calculate fitness for all sequences in the population
  const results = population.map((seq, index) => {
    let total = 0;
    const activeSeq = seq.slice(0, maxSlots);
    for (let i = 0; i < sims; i++) {
      total += calculateDamage(activeSeq, bossHp, currentStance, globalStatuses, gameState).totalDamage;
    }
    return { index, score: total / sims };
  });

  self.postMessage(results);
};
