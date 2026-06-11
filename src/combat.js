import { getSkillEffect } from './skilltree.js';
import { hasRelic, hasSynergy, getStatus, addStatus, clearStatus, setStatus } from './utils.js';
import { SynergyRegistry } from './engine/registries/synergies.js';
import { StatusRegistry } from './engine/registries/statuses.js';

export function createBeast(name, minDamage, maxDamage, appliesStatus, synergy) {
  return { name, minDamage, maxDamage, appliesStatus, synergy };
}

export function calculateDamage(beastArray, bossHp, bossStance = 'NONE', initialStatuses = {}, gameState = {}) {
  let totalDamage = 0;
  let currentStatuses = { ...initialStatuses };
  let actions = [];

  if (gameState.relics) {
    if (hasRelic('toxic_vial', gameState.relics)) currentStatuses['POISON'] = (currentStatuses['POISON'] || 0) + 1;
    if (hasRelic('brimstone_match', gameState.relics)) currentStatuses['FIRE'] = (currentStatuses['FIRE'] || 0) + 1;
    if (hasRelic('static_capacitor', gameState.relics)) currentStatuses['SHOCK'] = (currentStatuses['SHOCK'] || 0) + 1;
    if (hasRelic('cursed_doll', gameState.relics)) currentStatuses['VULNERABLE'] = (currentStatuses['VULNERABLE'] || 0) + 1;
    if (hasRelic('liquid_nitrogen', gameState.relics)) currentStatuses['FROSTBITE'] = (currentStatuses['FROSTBITE'] || 0) + 1;
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
    if (hasRelic('weighted_dice', gameState.relics)) {
      baseMinDmg = Math.floor(baseMinDmg * 1.2);
    }

    let minDmg = baseMinDmg + nextBeastBuff + globalBeastBuff + getSkillEffect('war_dmg', ms);
    let maxDmg = beast.maxDamage + nextBeastBuff + globalBeastBuff + getSkillEffect('war_dmg', ms);
    
    if (hasRelic('heavy_anvil', gameState.relics)) {
      minDmg += 10; maxDmg += 10;
    }
    nextBeastBuff = 0;

    let dmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
    
    let breakdown = null;
    let actionLog = null;
    if (gameState.generateLog) {
      breakdown = [{ label: 'Base Roll', value: dmg }];
      actionLog = { type: 'attack', beast, breakdown, originalHp: bossHp - totalDamage };
      actions.push(actionLog);
    }
    const track = (newDmg, label) => {
      if (breakdown && Math.floor(newDmg) !== Math.floor(dmg)) {
        let diff = Math.floor(newDmg) - Math.floor(dmg);
        breakdown.push({ label, value: diff > 0 ? '+' + diff : String(diff) });
      }
      dmg = Math.floor(newDmg);
    };

    if (zeroNextBeast) {
      track(0, 'BLOOD PRICE Penalty');
      zeroNextBeast = false;
    }
    
    // Chaos Reroll
    if (getSkillEffect('chaos_reroll', ms) > 0 && dmg === minDmg && !zeroNextBeast) {
       track(Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg, 'Chaos Reroll');
    }

    // Warfare Base Multipliers
    if (beastsAttacked === 0) {
      let firstDmg = dmg + getSkillEffect('war_first', ms) * 15;
      if (hasRelic('sharpening_stone', gameState.relics)) {
        firstDmg += 50;
      }
      track(firstDmg, 'Alpha Strike');
    }
    if (beastsAttacked === beastArray.length - 1) track(dmg + getSkillEffect('war_last', ms) * 30, 'Finale');

    // COMBO_SCALER synergy
    if (hasSynergy(beast, 'COMBO_SCALER')) {
      let comboScaling = 0.15 + (getSkillEffect('war_combo', ms) * 0.05);
      if (hasRelic('combo_meter', gameState.relics)) comboScaling += 0.10;
      track(dmg * (1 + comboScaling * beastsAttacked), 'Combo Scaler');
    }
    
    if (bossStance === 'ARMORED') {
      if (beast.synergy !== 'PIERCING') {
        const pen = getSkillEffect('res_armor_pen', ms);
        let baseReduction = 0.5;
        if (hasRelic('armor_piercing_rounds', gameState.relics)) baseReduction = 0.3; // Less reduction
        const reduction = Math.max(0, (1 - baseReduction) + (pen * 0.1));
        track(dmg * reduction, 'Boss Armor');
      }
    }
    
    // Crit simulation for GA (Average Damage)
    const critChance = 0.10 + (getSkillEffect('war_crit_chance', ms) * 0.05);
    const critDmg = 1.50 + (getSkillEffect('war_crit_dmg', ms) * 0.25);
    
    // In Execution mode (generateLog = true), we roll for crit rather than averaging
    if (gameState.generateLog) {
      let isCrit = Math.random() < critChance;
      if (isCrit) {
        track(dmg * critDmg, 'Critical Hit');
        actionLog.isCrit = true;
      }
    } else {
      dmg = dmg * (1 - critChance) + dmg * critChance * critDmg;
    }
    
    // Warfare Double Attack
    if (getSkillEffect('war_cap', ms) > 0) {
      if (gameState.generateLog) {
        if (Math.random() < 0.05) {
          track(dmg * 2, 'Berserker Rage');
          actionLog.isDouble = true;
        }
      } else {
        dmg *= 1.05;
      }
    }
    
    dmg = Math.floor(dmg);

        let ctx = {
      beast, index, beastArray, ms, gameState, bossHp, track,
      get dmg() { return dmg; }, set dmg(v) { dmg = v; },
      get currentStatuses() { return currentStatuses; },
      get totalDamage() { return totalDamage; },
      get nextBeastBuff() { return nextBeastBuff; }, set nextBeastBuff(v) { nextBeastBuff = v; },
      get globalBeastBuff() { return globalBeastBuff; }, set globalBeastBuff(v) { globalBeastBuff = v; },
      get bombTimer() { return bombTimer; }, set bombTimer(v) { bombTimer = v; },
      get bombDamage() { return bombDamage; }, set bombDamage(v) { bombDamage = v; },
      get zeroNextBeast() { return zeroNextBeast; }, set zeroNextBeast(v) { zeroNextBeast = v; },
      get lastDamage() { return lastDamage; }, get lastDamage2() { return lastDamage2; },
      get beastsAttacked() { return beastsAttacked; }
    };
    
    if (beast.synergy) {
      const syns = Array.isArray(beast.synergy) ? beast.synergy : [beast.synergy];
      syns.forEach(syn => {
        if (SynergyRegistry[syn]) SynergyRegistry[syn](ctx);
      });
    }

    let shockMult = 1.0 + (getSkillEffect('alc_shock', ms) * 0.5);
    if (hasRelic('conductive_wire', gameState.relics)) shockMult = 4.5;
    
    let vulnMult = 1.5 + (getSkillEffect('alc_vuln', ms) * 0.25);
    if (hasRelic('shattered_glass', gameState.relics)) vulnMult = 2.5;
    
    if (getStatus(currentStatuses, 'SHOCK') > 0) {
      track(Math.floor(dmg * shockMult), 'Shock Multiplier');
    }

    if (getStatus(currentStatuses, 'VULNERABLE') > 0) {
      track(Math.floor(dmg * vulnMult), 'Vulnerable Multiplier');
    }
    
    if (getStatus(currentStatuses, 'FROSTBITE') > 0) {
      let fbDmg = 5 + (getSkillEffect('alc_frost', ms) * 3);
      if (hasRelic('deep_freeze', gameState.relics)) fbDmg += 20;
      track(dmg + getStatus(currentStatuses, 'FROSTBITE') * fbDmg, 'Frostbite (Shatter)');
    }

    // Blood Chalice Relic Effect
    if (hasRelic('blood_chalice', gameState.relics)) {
      let restore = Math.floor(bossHp * 0.05);
      totalDamage -= restore; 
      if (gameState.generateLog) actions.push({ type: 'heal', amount: restore, source: 'Blood Chalice' });
      track(Math.floor(dmg * 1.5), 'Blood Chalice');
    }

    // Glass Cannon Relic Effect
    if (hasRelic('glass_cannon', gameState.relics)) {
      track(Math.floor(dmg * 1.3), 'Glass Cannon');
    }

    // Advanced Stances
    const isPoisonBeast = beast.appliesStatus === 'POISON' || beast.synergy?.includes('POISON');
    const isFireBeast = beast.appliesStatus === 'FIRE' || beast.synergy?.includes('FIRE');
    const isShockBeast = beast.appliesStatus === 'SHOCK' || beast.synergy?.includes('SHOCK');
    const isVulnBeast = beast.appliesStatus === 'VULNERABLE' || beast.synergy?.includes('VULNERABLE');

    if (bossStance === 'ETHEREAL' && ctx.index % 2 !== 0) {
       track(0, 'Ethereal Stance (Phased Out)');
    }

    if (bossStance === 'DECAY') {
       const decayVal = (10 - getSkillEffect('res_stance_weak', ms) * 2) / 100;
       track(Math.max(0, dmg * (1 - (ctx.index * decayVal))), 'Decay Stance');
    }

    if (bossStance === 'MOMENTUM') {
       const momVal = getSkillEffect('res_momentum', ms) > 0 ? 0.15 : 0.1;
       track(dmg * (1 + (ctx.index * momVal)), 'Momentum Stance');
    }

    if (bossStance === 'ANTI_MAGIC' && (isPoisonBeast || isFireBeast || isShockBeast || isVulnBeast || beast.appliesStatus === 'FROSTBITE' || beast.synergy?.includes('FROSTBITE'))) {
       let magicDmg = 0;
       if (hasRelic('anti_magic_amulet', gameState.relics)) magicDmg = Math.floor(dmg / 2);
       track(magicDmg, 'Anti-Magic Stance');
    }
    // Chaos Jackpot
    if (getSkillEffect('chaos_jackpot', ms) > 0) {
      if (gameState.generateLog) {
         if (Math.random() < 0.05) track(dmg * 3, 'Chaos Jackpot');
      } else {
         if (Math.random() < 0.05) dmg *= 3;
      }
    }

    if (actionLog) actionLog.totalDmg = dmg;
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
        if (gameState.generateLog) {
          actions.push({ type: 'bomb', dmg: bombDamage, source: 'Time Bomb' });
        }
      }
    }

    lastDamage2 = lastDamage;
    lastDamage = dmg;
    beastsAttacked++;
  }
  
    // End of Turn DoTs
  let dotDamage = 0;
  let dotCtx = { currentStatuses, ms, gameState };

  for (const [status, stacks] of Object.entries(currentStatuses)) {
    if (stacks > 0 && StatusRegistry[status] && StatusRegistry[status].onTick) {
      const dmg = StatusRegistry[status].onTick(dotCtx);
      dotDamage += dmg;
      if (gameState.generateLog) actions.push({ type: 'dot', status, dmg });
    }
  }

  totalDamage += dotDamage;

  // Resilience auto-kill
  if (getSkillEffect('res_cap', ms) > 0 && (bossHp - totalDamage) > 0 && (bossHp - totalDamage) <= bossHp * 0.1) {
     if (gameState.generateLog) actions.push({ type: 'execute_boss', dmg: bossHp - totalDamage, source: 'Resilience Capstone' });
     totalDamage = bossHp; // Execute!
  }

  if (gameState.generateLog) {
    let synergyTotals = {};
    actions.forEach(act => {
      if (act.type === 'attack' && act.breakdown) {
        act.breakdown.forEach(b => {
          if (b.label !== 'Base Roll' && b.label !== 'Boss Armor' && b.label.indexOf('Penalty') === -1) {
            const valStr = String(b.value).replace('+', '');
            const val = parseInt(valStr, 10);
            if (!isNaN(val) && val > 0) {
              synergyTotals[b.label] = (synergyTotals[b.label] || 0) + val;
            }
          }
        });
      } else if (act.type === 'dot') {
        const dotLabel = `${act.status} (DoT)`;
        synergyTotals[dotLabel] = (synergyTotals[dotLabel] || 0) + act.dmg;
      }
    });
    
    let mvpLabel = null;
    let mvpDamage = 0;
    for (const [lbl, dmg] of Object.entries(synergyTotals)) {
      if (dmg > mvpDamage) {
        mvpDamage = dmg;
        mvpLabel = lbl;
      }
    }
    
    if (mvpLabel && mvpDamage > 0) {
      actions.push({ type: 'mvp', label: mvpLabel, dmg: mvpDamage, percentage: Math.round((mvpDamage / totalDamage) * 100) });
    }
  }

  return { totalDamage, dotDamage, bossKilled: totalDamage >= bossHp, currentStatuses, actions };
}
