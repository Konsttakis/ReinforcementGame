export function createBeast(name, minDamage, maxDamage, appliesStatus, synergy) {
  return { name, minDamage, maxDamage, appliesStatus, synergy };
}

export function calculateDamage(beastArray, bossHp) {
  let totalDamage = 0;
  let currentStatuses = new Set();

  for (const beast of beastArray) {
    let dmg = Math.floor(Math.random() * (beast.maxDamage - beast.minDamage + 1)) + beast.minDamage;
    
    if (beast.synergy === 'DOUBLE_IF_POISONED' && currentStatuses.has('POISON')) {
      dmg *= 2;
    }

    totalDamage += dmg;

    if (beast.appliesStatus) {
      currentStatuses.add(beast.appliesStatus);
    }
  }

  return { totalDamage, bossKilled: totalDamage >= bossHp };
}
