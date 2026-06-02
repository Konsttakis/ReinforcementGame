export function createBeast(name, minDamage, maxDamage, appliesStatus, synergy) {
  return { name, minDamage, maxDamage, appliesStatus, synergy };
}

export function calculateDamage(beastArray, bossHp, bossStance = 'NONE', initialStatuses = {}, gameState = {}) {
  let totalDamage = 0;
  let currentStatuses = { ...initialStatuses };
  let nextBeastBuff = 0;
  let globalBeastBuff = 0;
  let beastsAttacked = 0;
  let lastDamage = 0;
  let bombTimer = -1;
  let bombDamage = 0;

  for (const beast of beastArray) {
    let minDmg = beast.minDamage + nextBeastBuff + globalBeastBuff;
    let maxDmg = beast.maxDamage + nextBeastBuff + globalBeastBuff;
    if (gameState.relics && gameState.relics.some(r => r.id === 'heavy_anvil')) {
      minDmg += 10; maxDmg += 10;
    }
    nextBeastBuff = 0; // reset buff

    let dmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
    
    // COMBO_SCALER synergy
    if (beast.synergy === 'COMBO_SCALER') {
      dmg = Math.floor(dmg * (1 + 0.15 * beastsAttacked));
    }
    
    if (bossStance === 'ARMORED') {
      dmg = Math.floor(dmg / 2);
    }
    
    // Existing Synergies
    if (beast.synergy === 'DOUBLE_IF_POISONED' && currentStatuses['POISON'] > 0) dmg *= 2;
    if (beast.synergy === 'DOUBLE_IF_FIRE' && currentStatuses['FIRE'] > 0) dmg *= 2;
    if (beast.synergy === 'TRIPLE_IF_SHOCK' && currentStatuses['SHOCK'] > 0) dmg *= 3;
    if (beast.synergy === 'DOUBLE_IF_VULNERABLE' && currentStatuses['VULNERABLE'] > 0) dmg *= 2;
    
    if (beast.synergy === 'CONSUME_POISON' && currentStatuses['POISON'] > 0) {
      dmg += 50;
      currentStatuses['POISON'] = 0;
    }
    if (beast.synergy === 'CONSUME_FIRE' && currentStatuses['FIRE'] > 0) {
      dmg += 60;
      currentStatuses['FIRE'] = 0;
    }
    if (beast.synergy === 'BUFF_NEXT_20') nextBeastBuff = 20;
    if (beast.synergy === 'BUFF_NEXT_40') nextBeastBuff = 40;

    // New Synergies
    if (beast.synergy === 'CATALYST' && currentStatuses['POISON'] > 0) {
      dmg += currentStatuses['POISON'] * 15 * 3; 
      currentStatuses['POISON'] = 0;
    }
    if (beast.synergy === 'PROLIFERATE') {
      for (const [status, stacks] of Object.entries(currentStatuses)) {
        if (stacks > 0) currentStatuses[status] *= 2;
      }
    }
    if (beast.synergy === 'EXECUTE' && (bossHp - totalDamage) < bossHp * 0.3) {
      dmg *= 4;
    }
    if (beast.synergy === 'CONSUME_ALL') {
      let removed = 0;
      for (const [status, stacks] of Object.entries(currentStatuses)) {
        if (stacks > 0) { removed++; currentStatuses[status] = 0; }
      }
      nextBeastBuff = removed * 50;
    }

    // New Complex Synergies
    if (beast.synergy === 'TIME_BOMB') {
      bombTimer = 2;
      bombDamage = 150;
    }
    if (beast.synergy === 'FINISHER' && beastsAttacked === beastArray.length - 1) {
      dmg *= 5;
    }
    if (beast.synergy === 'PUNISHER' && lastDamage > 0 && lastDamage < 15) {
      dmg *= 3;
    }
    if (beast.synergy === 'ECHO' && lastDamage > 0) {
      dmg += lastDamage;
    }

    // New Brainstormed Synergies
    if (beast.synergy === 'TRIGGER_NEXT') {
      const nextBeast = beastArray[beastsAttacked + 1];
      if (nextBeast && nextBeast.appliesStatus) {
        currentStatuses[nextBeast.appliesStatus] = (currentStatuses[nextBeast.appliesStatus] || 0) + 1;
      }
    }
    if (beast.synergy === 'MIRROR_SYMMETRY') {
      const oppIdx = (beastArray.length - 1) - beastsAttacked;
      const oppBeast = beastArray[oppIdx];
      if (oppBeast) {
        const oppDmg = Math.floor(Math.random() * (oppBeast.maxDamage - oppBeast.minDamage + 1)) + oppBeast.minDamage;
        dmg += oppDmg;
      }
    }
    if (beast.synergy === 'MOMENTUM_LOSS') {
      dmg -= (15 * beastsAttacked);
      if (dmg < 0) dmg = 0;
    }
    if (beast.synergy === 'STATUS_CONVERSION') {
      let converted = 0;
      if (currentStatuses['POISON'] > 0) {
        converted += currentStatuses['POISON'];
        currentStatuses['FROSTBITE'] = (currentStatuses['FROSTBITE'] || 0) + currentStatuses['POISON'];
        currentStatuses['POISON'] = 0;
      }
      if (currentStatuses['FIRE'] > 0) {
        converted += currentStatuses['FIRE'];
        currentStatuses['SHOCK'] = (currentStatuses['SHOCK'] || 0) + currentStatuses['FIRE'];
        currentStatuses['FIRE'] = 0;
      }
      dmg += converted * 10;
    }
    if (beast.synergy === 'VACUUM_SCALER') {
      let cleared = 0;
      for (const [status, stacks] of Object.entries(currentStatuses)) {
        if (stacks > 0) {
          cleared += stacks;
          currentStatuses[status] = 0;
        }
      }
      globalBeastBuff += cleared * 5;
    }
    if (beast.synergy === 'MISSING_HP_SCALING') {
      const missingHp = Math.max(0, bossHp - totalDamage);
      dmg += Math.floor(missingHp * 0.15);
    }

    // Early Game Variety
    if (beast.synergy === 'FIRST_STRIKE' && beastsAttacked === 0) {
      dmg *= 3;
    }
    if (beast.synergy === 'HIDE') {
      if (beastsAttacked === 0 || beastsAttacked === 1) {
        dmg = 0;
      }
    }
    if (beast.synergy === 'GROWTH') {
      dmg += (2 * beastsAttacked);
    }
    if (beast.synergy === 'MINOR_BUFF') {
      nextBeastBuff += 5;
    }
    if (beast.synergy === 'KINDLING' && currentStatuses['FIRE'] > 0) {
      dmg *= 2;
    }
    if (beast.synergy === 'HIGH_ROLLER') {
      if (dmg % 2 !== 0) {
        dmg *= 2;
      } else {
        dmg = Math.floor(dmg / 2);
      }
    }

    // Super Late Game Scalers
    if (beast.synergy === 'GOLD_SCALING') {
      dmg += (gameState.gold || 0);
    }
    if (beast.synergy === 'EPOCH_SCALING') {
      dmg += Math.floor((gameState.epochs || 0) / 50);
    }
    if (beast.synergy === 'INVENTORY_SCALING') {
      dmg += ((gameState.inventorySize || 0) * 5);
    }
    if (beast.synergy === 'LEVEL_SCALING') {
      dmg += ((gameState.level || 0) * 10);
    }
    if (beast.synergy === 'LEGENDARY_MULTIPLIER') {
      const legCount = beastArray.filter(b => b.rarity === 'Legendary').length;
      dmg = Math.floor(dmg * Math.pow(1.5, legCount));
    }

    if (currentStatuses['VULNERABLE'] > 0) {
      dmg = Math.floor(dmg * 1.5);
    }
    if (currentStatuses['FROSTBITE'] > 0) {
      dmg += currentStatuses['FROSTBITE'] * 5;
    }

    // Stance multipliers based on beast themes
    const isPoisonBeast = beast.appliesStatus === 'POISON' || beast.synergy?.includes('POISON');
    const isFireBeast = beast.appliesStatus === 'FIRE' || beast.synergy?.includes('FIRE');
    const isShockBeast = beast.appliesStatus === 'SHOCK' || beast.synergy?.includes('SHOCK');
    const isVulnBeast = beast.appliesStatus === 'VULNERABLE' || beast.synergy?.includes('VULNERABLE');

    if (bossStance === 'POISON_WEAKNESS' && isPoisonBeast) dmg *= 2;
    if (bossStance === 'FIRE_IMMUNITY' && isFireBeast) dmg = 0;
    if (bossStance === 'SHOCK_WEAKNESS' && isShockBeast) dmg *= 2;
    if (bossStance === 'VULNERABLE_WEAKNESS' && isVulnBeast) dmg *= 2;

    totalDamage += dmg;

    if (beast.appliesStatus) {
      currentStatuses[beast.appliesStatus] = (currentStatuses[beast.appliesStatus] || 0) + 1;
    }

    if (bombTimer > 0) {
      bombTimer--;
      if (bombTimer === 0) {
        totalDamage += bombDamage;
      }
    }

    lastDamage = dmg;
    beastsAttacked++;
  }
  
  // End of Turn DoTs
  let dotDamage = 0;
  if (currentStatuses['POISON'] > 0) {
    let poisonMultiplier = (gameState.relics && gameState.relics.some(r => r.id === 'venom_gland')) ? 25 : 15;
    dotDamage += currentStatuses['POISON'] * poisonMultiplier;
  }
  if (currentStatuses['FIRE'] > 0) {
    dotDamage += currentStatuses['FIRE'] * 10; 
    if (!gameState.relics || !gameState.relics.some(r => r.id === 'molten_core')) {
      currentStatuses['FIRE'] = Math.max(0, currentStatuses['FIRE'] - 1); // Decay fire
    }
  }
  
  totalDamage += dotDamage;

  return { totalDamage, dotDamage, bossKilled: totalDamage >= bossHp, currentStatuses };
}
