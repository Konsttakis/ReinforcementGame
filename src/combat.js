import { getSkillEffect } from './skilltree.js';

export function createBeast(name, minDamage, maxDamage, appliesStatus, synergy) {
  return { name, minDamage, maxDamage, appliesStatus, synergy };
}

export function calculateDamage(beastArray, bossHp, bossStance = 'NONE', initialStatuses = {}, gameState = {}) {
  let totalDamage = 0;
  let currentStatuses = { ...initialStatuses };

  if (gameState.relics) {
    if (gameState.relics.some(r => r.id === 'toxic_vial')) currentStatuses['POISON'] = (currentStatuses['POISON'] || 0) + 1;
    if (gameState.relics.some(r => r.id === 'brimstone_match')) currentStatuses['FIRE'] = (currentStatuses['FIRE'] || 0) + 1;
    if (gameState.relics.some(r => r.id === 'static_capacitor')) currentStatuses['SHOCK'] = (currentStatuses['SHOCK'] || 0) + 1;
    if (gameState.relics.some(r => r.id === 'cursed_doll')) currentStatuses['VULNERABLE'] = (currentStatuses['VULNERABLE'] || 0) + 1;
    if (gameState.relics.some(r => r.id === 'liquid_nitrogen')) currentStatuses['FROSTBITE'] = (currentStatuses['FROSTBITE'] || 0) + 1;
  }

  let nextBeastBuff = 0;
  let globalBeastBuff = 0;
  let beastsAttacked = 0;
  let lastDamage = 0;
  let lastDamage2 = 0;
  let bombTimer = -1;
  let bombDamage = 0;
  let zeroNextBeast = false;

  const ms = gameState.metaState || { skillTree: {} };

  for (let index = 0; index < beastArray.length; index++) {
    const beast = beastArray[index];
    
    let baseMinDmg = beast.minDamage;
    if (gameState.relics && gameState.relics.some(r => r.id === 'weighted_dice')) {
      baseMinDmg = Math.floor(baseMinDmg * 1.2);
    }

    let minDmg = baseMinDmg + nextBeastBuff + globalBeastBuff + getSkillEffect('war_dmg', ms);
    let maxDmg = beast.maxDamage + nextBeastBuff + globalBeastBuff + getSkillEffect('war_dmg', ms);
    
    if (gameState.relics && gameState.relics.some(r => r.id === 'heavy_anvil')) {
      minDmg += 10; maxDmg += 10;
    }
    nextBeastBuff = 0;

    let dmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
    if (zeroNextBeast) {
      dmg = 0; zeroNextBeast = false;
    }
    
    // Chaos Reroll
    if (getSkillEffect('chaos_reroll', ms) > 0 && dmg === minDmg) {
       dmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
    }

    // Warfare Base Multipliers
    if (beastsAttacked === 0) {
      dmg += getSkillEffect('war_first', ms) * 15;
      if (gameState.relics && gameState.relics.some(r => r.id === 'sharpening_stone')) {
        dmg += 50;
      }
    }
    if (beastsAttacked === beastArray.length - 1) dmg += getSkillEffect('war_last', ms) * 30;

    // COMBO_SCALER synergy
    if (beast.synergy === 'COMBO_SCALER') {
      let comboScaling = 0.15 + (getSkillEffect('war_combo', ms) * 0.05);
      if (gameState.relics && gameState.relics.some(r => r.id === 'combo_meter')) comboScaling += 0.10;
      dmg = Math.floor(dmg * (1 + comboScaling * beastsAttacked));
    }
    
    if (bossStance === 'ARMORED') {
      if (beast.synergy !== 'PIERCING') {
        const pen = getSkillEffect('res_armor_pen', ms);
        let baseReduction = 0.5;
        if (gameState.relics && gameState.relics.some(r => r.id === 'armor_piercing_rounds')) baseReduction = 0.3; // Less reduction
        const reduction = Math.max(0, (1 - baseReduction) + (pen * 0.1));
        dmg = Math.floor(dmg * reduction);
      }
    }
    
    // Crit simulation for GA (Average Damage)
    const critChance = 0.10 + (getSkillEffect('war_crit_chance', ms) * 0.05);
    const critDmg = 1.50 + (getSkillEffect('war_crit_dmg', ms) * 0.25);
    dmg = dmg * (1 - critChance) + dmg * critChance * critDmg;
    
    // Warfare Double Attack
    if (getSkillEffect('war_cap', ms) > 0) {
       dmg *= 1.05;
    }
    
    dmg = Math.floor(dmg);

    // Existing Synergies
    if (beast.synergy === 'DOUBLE_IF_POISONED' && currentStatuses['POISON'] > 0) dmg *= 2;
    if (beast.synergy === 'DOUBLE_IF_FIRE' && currentStatuses['FIRE'] > 0) dmg *= 2;
    if (beast.synergy === 'TRIPLE_IF_SHOCK' && currentStatuses['SHOCK'] > 0) dmg *= 3;
    if (beast.synergy === 'DOUBLE_IF_VULNERABLE' && currentStatuses['VULNERABLE'] > 0) dmg *= 2;
    
    if (beast.synergy === 'CONSUME_POISON' && currentStatuses['POISON'] > 0) {
      dmg += 50 + getSkillEffect('alc_consume', ms) * 20;
      currentStatuses['POISON'] = 0;
    }
    if (beast.synergy === 'CONSUME_FIRE' && currentStatuses['FIRE'] > 0) {
      let consumeBonus = 50;
      if (gameState.relics && gameState.relics.some(r => r.id === 'ashes_to_ashes')) consumeBonus = 100;
      dmg += consumeBonus + getSkillEffect('alc_consume', ms) * 20;
      currentStatuses['FIRE'] = 0;
    }
    if (beast.synergy === 'BUFF_NEXT_20') nextBeastBuff = 20;
    if (beast.synergy === 'BUFF_NEXT_40') nextBeastBuff = 40;

    // New Synergies
    if (beast.synergy === 'CATALYST' && currentStatuses['POISON'] > 0) {
      const mult = 3 + getSkillEffect('alc_catalyst', ms);
      let consumeDmg = 15;
      if (gameState.relics && gameState.relics.some(r => r.id === 'catalytic_converter')) consumeDmg = 25;
      dmg += currentStatuses['POISON'] * consumeDmg * mult; 
      currentStatuses['POISON'] = 0;
    }
    if (beast.synergy === 'PROLIFERATE') {
      const bonusStacks = getSkillEffect('alc_prolif', ms);
      let prolifMult = 2;
      if (gameState.relics && gameState.relics.some(r => r.id === 'pandemic_spore')) prolifMult = 3;
      for (const [status, stacks] of Object.entries(currentStatuses)) {
        if (stacks > 0) currentStatuses[status] = (currentStatuses[status] * prolifMult) + bonusStacks;
      }
    }
    if (beast.synergy === 'EXECUTE') {
      let threshold = 0.3 + (getSkillEffect('war_execute', ms) * 0.05);
      if (gameState.relics && gameState.relics.some(r => r.id === 'executioners_axe')) threshold += 0.10;
      if ((bossHp - totalDamage) < bossHp * threshold) {
        let execMult = 4;
        if (gameState.relics && gameState.relics.some(r => r.id === 'ritual_dagger')) execMult = 6;
        dmg *= execMult;
      }
    }
    if (beast.synergy === 'CONSUME_ALL') {
      let removed = 0;
      for (const [status, stacks] of Object.entries(currentStatuses)) {
        if (stacks > 0) { removed++; currentStatuses[status] = 0; }
      }
      nextBeastBuff = removed * (50 + getSkillEffect('alc_consume', ms) * 20);
    }
    if (beast.synergy === 'SHATTER' && currentStatuses['FROSTBITE'] > 0) {
      dmg *= 3;
      currentStatuses['FROSTBITE'] = 0;
    }
    if (beast.synergy === 'DROWN' && currentStatuses['FROSTBITE'] > 0 && currentStatuses['VULNERABLE'] > 0) {
      dmg *= 5;
    }
    if (beast.synergy === 'OVERCHARGE') {
      if (currentStatuses['SHOCK'] === 3) dmg *= 10;
      else dmg = 1;
    }
    if (beast.synergy === 'REVERBERATE') {
      let baseEcho = 1.0;
      if (gameState.relics && gameState.relics.some(r => r.id === 'echo_chamber')) baseEcho = 1.5;
      const echoMult = baseEcho + (getSkillEffect('war_echo', ms) * 0.2);
      dmg += (lastDamage + lastDamage2) * echoMult;
    }
    if (beast.synergy === 'RHYTHM' && index % 2 === 1) {
      dmg *= 3;
    }
    if (beast.synergy === 'BLOOD_PRICE') {
      zeroNextBeast = true;
    }
    if (beast.synergy === 'OMNI_STRIKE') {
      currentStatuses['POISON'] = (currentStatuses['POISON'] || 0) + 1;
      currentStatuses['FIRE'] = (currentStatuses['FIRE'] || 0) + 1;
      currentStatuses['SHOCK'] = (currentStatuses['SHOCK'] || 0) + 1;
      currentStatuses['VULNERABLE'] = (currentStatuses['VULNERABLE'] || 0) + 1;
      currentStatuses['FROSTBITE'] = (currentStatuses['FROSTBITE'] || 0) + 1;
    }

    if (beast.synergy === 'TIME_BOMB') {
      bombTimer = 2;
      let baseBomb = 150;
      if (gameState.relics && gameState.relics.some(r => r.id === 'time_bomb_detonator')) baseBomb *= 2;
      bombDamage = baseBomb + getSkillEffect('war_bomb', ms) * 50;
    }
    if (beast.synergy === 'FINISHER' && index === beastArray.length - 1) {
      const finMult = 5 + getSkillEffect('war_finisher', ms);
      dmg *= finMult;
    }
    if (beast.synergy === 'PUNISHER') {
      let punishThresh = 15;
      if (gameState.relics && gameState.relics.some(r => r.id === 'punishers_whip')) punishThresh = 30;
      if (lastDamage > 0 && lastDamage < punishThresh) dmg *= 3;
    }
    if (beast.synergy === 'ECHO' && lastDamage > 0) {
      let baseEcho = 1.0;
      if (gameState.relics && gameState.relics.some(r => r.id === 'echo_chamber')) baseEcho = 1.5;
      const echoMult = baseEcho + (getSkillEffect('war_echo', ms) * 0.2);
      dmg += lastDamage * echoMult;
    }

    if (beast.synergy === 'TRIGGER_NEXT') {
      const nextBeast = beastArray[index + 1];
      if (nextBeast && nextBeast.appliesStatus) {
        currentStatuses[nextBeast.appliesStatus] = (currentStatuses[nextBeast.appliesStatus] || 0) + 1;
      }
    }
    if (beast.synergy === 'MIRROR_SYMMETRY') {
      const oppIdx = (beastArray.length - 1) - index;
      const oppBeast = beastArray[oppIdx];
      if (oppBeast) {
        const isMirrorMax = getSkillEffect('war_mirror', ms) > 0;
        const oppDmg = isMirrorMax ? oppBeast.maxDamage : (Math.floor(Math.random() * (oppBeast.maxDamage - oppBeast.minDamage + 1)) + oppBeast.minDamage);
        dmg += oppDmg;
        if (gameState.relics && gameState.relics.some(r => r.id === 'mirror_shield')) dmg += 50;
      }
    }
    if (beast.synergy === 'MOMENTUM_LOSS') {
      let penalty = 15;
      if (gameState.relics && gameState.relics.some(r => r.id === 'momentum_pendulum')) penalty = 7.5;
      dmg -= (penalty * beastsAttacked);
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
      let baseConv = 10;
      if (gameState.relics && gameState.relics.some(r => r.id === 'conversion_kit')) baseConv = 25;
      const convMult = baseConv + (getSkillEffect('alc_convert', ms) * 15);
      dmg += converted * convMult;
    }
    if (beast.synergy === 'VACUUM_SCALER') {
      let cleared = 0;
      for (const [status, stacks] of Object.entries(currentStatuses)) {
        if (stacks > 0) {
          cleared += stacks;
          currentStatuses[status] = 0;
        }
      }
      let vacDmg = 5;
      if (gameState.relics && gameState.relics.some(r => r.id === 'vacuum_cleaner')) vacDmg = 10;
      globalBeastBuff += cleared * vacDmg;
    }
    if (beast.synergy === 'MISSING_HP_SCALING') {
      const missingHp = Math.max(0, bossHp - totalDamage);
      dmg += Math.floor(missingHp * 0.15);
    }

    if (beast.synergy === 'FIRST_STRIKE' && beastsAttacked === 0) {
      let firstMult = 3;
      if (gameState.relics && gameState.relics.some(r => r.id === 'first_blood_medal')) firstMult = 4;
      dmg *= firstMult;
    }
    if (beast.synergy === 'HIDE') {
      if (beastsAttacked === 0 || beastsAttacked === 1) dmg = 0;
      if (gameState.relics && gameState.relics.some(r => r.id === 'telescope')) {
        nextBeastBuff += 20;
      }
    }
    if (beast.synergy === 'GROWTH') {
      let growthMult = 2;
      if (gameState.relics && gameState.relics.some(r => r.id === 'growth_hormone')) growthMult = 5;
      dmg += (growthMult * beastsAttacked);
    }
    if (beast.synergy === 'MINOR_BUFF') {
      nextBeastBuff += 5;
      if (gameState.relics && gameState.relics.some(r => r.id === 'cheerleader_pompoms')) globalBeastBuff += 10;
    }
    if (beast.synergy === 'KINDLING' && currentStatuses['FIRE'] > 0) {
      let kindleMult = 2;
      if (gameState.relics && gameState.relics.some(r => r.id === 'kindling_wood')) kindleMult = 3;
      dmg *= kindleMult;
    }
    if (beast.synergy === 'HIGH_ROLLER') {
      let rollChance = 0.5;
      if (gameState.relics && gameState.relics.some(r => r.id === 'high_roller_chips')) rollChance = 0.75;
      if (Math.random() < rollChance) dmg *= 2;
      else dmg = Math.floor(dmg / 2);
    }

    if (beast.synergy === 'GOLD_SCALING') {
      let goldMult = 1;
      if (gameState.relics && gameState.relics.some(r => r.id === 'gold_plating')) goldMult = 2;
      dmg += (gameState.gold || 0) * goldMult;
    }
    if (beast.synergy === 'EPOCH_SCALING') {
      let divisor = 50;
      if (gameState.relics && gameState.relics.some(r => r.id === 'epoch_clock')) divisor = 25;
      dmg += Math.floor((gameState.epochs || 0) / divisor);
    }
    if (beast.synergy === 'INVENTORY_SCALING') {
      let invBase = 5;
      if (gameState.relics && gameState.relics.some(r => r.id === 'collectors_edition')) invBase = 15;
      dmg += ((gameState.inventorySize || 0) * (invBase + getSkillEffect('inv_collector', ms) * 5));
    }
    if (beast.synergy === 'LEVEL_SCALING') {
      let lvlBase = 10;
      if (gameState.relics && gameState.relics.some(r => r.id === 'level_up_potion')) lvlBase = 20;
      dmg += ((gameState.level || 0) * lvlBase);
    }
    if (beast.synergy === 'LEGENDARY_MULTIPLIER') {
      const legCount = beastArray.filter(b => b.rarity === 'Legendary').length;
      let baseMult = 1.5;
      if (gameState.relics && gameState.relics.some(r => r.id === 'crown_of_legends')) baseMult = 2.0;
      dmg = Math.floor(dmg * Math.pow(baseMult, legCount));
    }

    let shockMult = 1.0 + (getSkillEffect('alc_shock', ms) * 0.5);
    if (gameState.relics && gameState.relics.some(r => r.id === 'conductive_wire')) shockMult = 4.5;
    
    let vulnMult = 1.5 + (getSkillEffect('alc_vuln', ms) * 0.25);
    if (gameState.relics && gameState.relics.some(r => r.id === 'shattered_glass')) vulnMult = 2.5;
    
    if (currentStatuses['SHOCK'] > 0) {
      dmg = Math.floor(dmg * shockMult);
    }

    if (currentStatuses['VULNERABLE'] > 0) {
      dmg = Math.floor(dmg * vulnMult);
    }
    
    if (currentStatuses['FROSTBITE'] > 0) {
      let fbDmg = 5 + (getSkillEffect('alc_frost', ms) * 3);
      if (gameState.relics && gameState.relics.some(r => r.id === 'deep_freeze')) fbDmg += 20;
      dmg += currentStatuses['FROSTBITE'] * fbDmg;
    }

    // Blood Chalice Relic Effect
    if (gameState.relics && gameState.relics.some(r => r.id === 'blood_chalice')) {
      totalDamage -= Math.floor(bossHp * 0.05); // Restore boss HP (reduce totalDamage)
      dmg = Math.floor(dmg * 1.5); // Beast deals +50% damage
    }

    // Glass Cannon Relic Effect
    if (gameState.relics && gameState.relics.some(r => r.id === 'glass_cannon')) {
      dmg = Math.floor(dmg * 1.3);
    }

    // Stance multipliers based on beast themes
    const isPoisonBeast = beast.appliesStatus === 'POISON' || beast.synergy?.includes('POISON');
    const isFireBeast = beast.appliesStatus === 'FIRE' || beast.synergy?.includes('FIRE');
    const isShockBeast = beast.appliesStatus === 'SHOCK' || beast.synergy?.includes('SHOCK');
    const isVulnBeast = beast.appliesStatus === 'VULNERABLE' || beast.synergy?.includes('VULNERABLE');

    let immunityDmg = 0;
    if (getSkillEffect('res_no_immune', ms) > 0) immunityDmg = Math.floor(dmg / 2); // Resistance instead of immunity
    if (gameState.relics && gameState.relics.some(r => r.id === 'fireproof_vest') && bossStance === 'FIRE_IMMUNITY') {
       immunityDmg = Math.floor(dmg / 2); // 50% instead of 0
    }

    if (bossStance === 'POISON_WEAKNESS' && isPoisonBeast) dmg *= (2 + getSkillEffect('res_stance_weak', ms));
    if (bossStance === 'FIRE_IMMUNITY' && isFireBeast) dmg = immunityDmg;
    if (bossStance === 'SHOCK_WEAKNESS' && isShockBeast) dmg *= (2 + getSkillEffect('res_stance_weak', ms));
    if (bossStance === 'VULNERABLE_WEAKNESS' && isVulnBeast) dmg *= (2 + getSkillEffect('res_stance_weak', ms));

    // Chaos Jackpot
    if (getSkillEffect('chaos_jackpot', ms) > 0 && Math.random() < 0.05) {
       dmg *= 3;
    }

    totalDamage += dmg;

    let appliedStatus = beast.appliesStatus;
    // Alchemy Cap (random status)
    if (!appliedStatus && getSkillEffect('alc_cap', ms) > 0 && Math.random() < 0.25) {
       const statuses = ['POISON', 'FIRE', 'SHOCK', 'VULNERABLE', 'FROSTBITE'];
       appliedStatus = statuses[Math.floor(Math.random() * statuses.length)];
    }

    if (appliedStatus) {
      let applyCount = 1;
      if (getSkillEffect('alc_double_apply', ms) > 0 && Math.random() < 0.1) applyCount++;
      currentStatuses[appliedStatus] = (currentStatuses[appliedStatus] || 0) + applyCount;
    }

    if (bombTimer > 0) {
      bombTimer--;
      if (bombTimer === 0) {
        totalDamage += bombDamage;
      }
    }

    lastDamage2 = lastDamage;
    lastDamage = dmg;
    beastsAttacked++;
  }
  
  // End of Turn DoTs
  let dotDamage = 0;
  if (currentStatuses['POISON'] > 0) {
    let poisonMultiplier = 15;
    if (gameState.relics && gameState.relics.some(r => r.id === 'venom_gland')) poisonMultiplier = 25;
    poisonMultiplier += getSkillEffect('alc_poison', ms) * 5;
    
    let ticks = 1;
    if (gameState.relics && gameState.relics.some(r => r.id === 'plague_rat')) ticks = 2;
    dotDamage += currentStatuses['POISON'] * poisonMultiplier * ticks;
  }
  if (currentStatuses['FIRE'] > 0) {
    let fireMult = 10 + getSkillEffect('alc_fire', ms) * 5;
    if (gameState.relics && gameState.relics.some(r => r.id === 'thermite_paste') && currentStatuses['VULNERABLE'] > 0) {
      fireMult *= (1 + (0.2 * currentStatuses['VULNERABLE']));
    }
    dotDamage += currentStatuses['FIRE'] * fireMult; 
    if (!gameState.relics || !gameState.relics.some(r => r.id === 'molten_core')) {
      const keepChance = getSkillEffect('alc_dot_persist', ms) * 0.25;
      if (Math.random() > keepChance) {
        currentStatuses['FIRE'] = Math.max(0, currentStatuses['FIRE'] - 1);
      }
    }
  }
  
  totalDamage += dotDamage;

  // Resilience auto-kill
  if (getSkillEffect('res_cap', ms) > 0 && (bossHp - totalDamage) > 0 && (bossHp - totalDamage) <= bossHp * 0.1) {
     totalDamage = bossHp; // Execute!
  }

  return { totalDamage, dotDamage, bossKilled: totalDamage >= bossHp, currentStatuses };
}
