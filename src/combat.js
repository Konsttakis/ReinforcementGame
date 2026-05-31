export function createBeast(name, minDamage, maxDamage, appliesStatus, synergy) {
  return { name, minDamage, maxDamage, appliesStatus, synergy };
}

export function calculateDamage(beastArray, bossHp) {
  let totalDamage = 0;
  let currentStatuses = new Set();
  let nextBeastBuff = 0;

  for (const beast of beastArray) {
    let minDmg = beast.minDamage + nextBeastBuff;
    let maxDmg = beast.maxDamage + nextBeastBuff;
    nextBeastBuff = 0; // reset buff

    let dmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
    
    if (beast.synergy === 'DOUBLE_IF_POISONED' && currentStatuses.has('POISON')) {
      dmg *= 2;
    }
    if (beast.synergy === 'DOUBLE_IF_FIRE' && currentStatuses.has('FIRE')) {
      dmg *= 2;
    }
    if (beast.synergy === 'TRIPLE_IF_SHOCK' && currentStatuses.has('SHOCK')) {
      dmg *= 3;
    }
    if (beast.synergy === 'CONSUME_POISON' && currentStatuses.has('POISON')) {
      dmg += 50;
      currentStatuses.delete('POISON');
    }
    if (beast.synergy === 'BUFF_NEXT_20') {
      nextBeastBuff = 20;
    }

    if (currentStatuses.has('VULNERABLE')) {
      dmg = Math.floor(dmg * 1.5);
    }

    totalDamage += dmg;

    if (beast.appliesStatus) {
      currentStatuses.add(beast.appliesStatus);
    }
  }

  return { totalDamage, bossKilled: totalDamage >= bossHp };
}
