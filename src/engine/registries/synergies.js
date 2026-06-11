import { getSkillEffect } from '../../skilltree.js';
import { hasRelic, getStatus, clearStatus } from '../../utils.js';

export const SynergyRegistry = {
  DOUBLE_IF_POISONED: (ctx) => {
    if (getStatus(ctx.currentStatuses, 'POISON') > 0) ctx.track(ctx.dmg * 2, 'Double vs Poison');
  },
  DOUBLE_IF_FIRE: (ctx) => {
    if (getStatus(ctx.currentStatuses, 'FIRE') > 0) ctx.track(ctx.dmg * 2, 'Double vs Fire');
  },
  TRIPLE_IF_SHOCK: (ctx) => {
    if (getStatus(ctx.currentStatuses, 'SHOCK') > 0) ctx.track(ctx.dmg * 3, 'Triple vs Shock');
  },
  DOUBLE_IF_VULNERABLE: (ctx) => {
    if (getStatus(ctx.currentStatuses, 'VULNERABLE') > 0) ctx.track(ctx.dmg * 2, 'Double vs Vulnerable');
  },
  
  CONSUME_POISON: (ctx) => {
    if (getStatus(ctx.currentStatuses, 'POISON') > 0) {
      ctx.track(ctx.dmg + 50 + getSkillEffect('alc_consume', ctx.ms) * 20, 'Consume Poison');
      clearStatus(ctx.currentStatuses, 'POISON');
    }
  },
  CONSUME_FIRE: (ctx) => {
    if (getStatus(ctx.currentStatuses, 'FIRE') > 0) {
      let consumeBonus = 50;
      if (hasRelic('ashes_to_ashes', ctx.gameState.relics)) consumeBonus = 100;
      ctx.track(ctx.dmg + consumeBonus + getSkillEffect('alc_consume', ctx.ms) * 20, 'Consume Fire');
      clearStatus(ctx.currentStatuses, 'FIRE');
    }
  },
  BUFF_NEXT_20: (ctx) => { ctx.nextBeastBuff = 20; },
  BUFF_NEXT_40: (ctx) => { ctx.nextBeastBuff = 40; },

  CATALYST: (ctx) => {
    if (getStatus(ctx.currentStatuses, 'POISON') > 0) {
      const mult = 3 + getSkillEffect('alc_catalyst', ctx.ms);
      let consumeDmg = 15;
      if (hasRelic('catalytic_converter', ctx.gameState.relics)) consumeDmg = 25;
      ctx.track(ctx.dmg + getStatus(ctx.currentStatuses, 'POISON') * consumeDmg * mult, 'Catalyst'); 
      clearStatus(ctx.currentStatuses, 'POISON');
    }
  },
  PROLIFERATE: (ctx) => {
    const bonusStacks = getSkillEffect('alc_prolif', ctx.ms);
    let prolifMult = 2;
    if (hasRelic('pandemic_spore', ctx.gameState.relics)) prolifMult = 3;
    for (const [status, stacks] of Object.entries(ctx.currentStatuses)) {
      if (stacks > 0) ctx.currentStatuses[status] = (ctx.currentStatuses[status] * prolifMult) + bonusStacks;
    }
  },
  EXECUTE: (ctx) => {
    let threshold = 0.3 + (getSkillEffect('war_execute', ctx.ms) * 0.05);
    if (hasRelic('executioners_axe', ctx.gameState.relics)) threshold += 0.10;
    if ((ctx.bossHp - ctx.totalDamage) < ctx.bossHp * threshold) {
      let execMult = 4;
      if (hasRelic('ritual_dagger', ctx.gameState.relics)) execMult = 6;
      ctx.track(ctx.dmg * execMult, 'Executioner');
    }
  },
  CONSUME_ALL: (ctx) => {
    let removed = 0;
    for (const [status, stacks] of Object.entries(ctx.currentStatuses)) {
      if (stacks > 0) { removed++; ctx.currentStatuses[status] = 0; }
    }
    ctx.nextBeastBuff = removed * (50 + getSkillEffect('alc_consume', ctx.ms) * 20);
  },
  SHATTER: (ctx) => {
    if (getStatus(ctx.currentStatuses, 'FROSTBITE') > 0) {
      ctx.track(ctx.dmg * 3, 'Shatter');
      clearStatus(ctx.currentStatuses, 'FROSTBITE');
    }
  },
  DROWN: (ctx) => {
    if (getStatus(ctx.currentStatuses, 'FROSTBITE') > 0 && getStatus(ctx.currentStatuses, 'VULNERABLE') > 0) {
      ctx.track(ctx.dmg * 5, 'Drown');
    }
  },
  OVERCHARGE: (ctx) => {
    if (getStatus(ctx.currentStatuses, 'SHOCK') === 3) ctx.track(ctx.dmg * 10, 'Overcharge');
    else ctx.track(1, 'Overcharge Penalty');
  },
  REVERBERATE: (ctx) => {
    let baseEcho = 1.0;
    if (hasRelic('echo_chamber', ctx.gameState.relics)) baseEcho = 1.5;
    const echoMult = baseEcho + (getSkillEffect('war_echo', ctx.ms) * 0.2);
    ctx.track(ctx.dmg + (ctx.lastDamage + ctx.lastDamage2) * echoMult, 'Reverberate');
  },
  RHYTHM: (ctx) => {
    if (ctx.index % 2 === 1) ctx.track(ctx.dmg * 3, 'Rhythm');
  },
  BLOOD_PRICE: (ctx) => {
    ctx.zeroNextBeast = true;
  },
  OMNI_STRIKE: (ctx) => {
    ctx.currentStatuses['POISON'] = (ctx.currentStatuses['POISON'] || 0) + 1;
    ctx.currentStatuses['FIRE'] = (ctx.currentStatuses['FIRE'] || 0) + 1;
    ctx.currentStatuses['SHOCK'] = (ctx.currentStatuses['SHOCK'] || 0) + 1;
    ctx.currentStatuses['VULNERABLE'] = (ctx.currentStatuses['VULNERABLE'] || 0) + 1;
    ctx.currentStatuses['FROSTBITE'] = (ctx.currentStatuses['FROSTBITE'] || 0) + 1;
  },

  TIME_BOMB: (ctx) => {
    ctx.bombTimer = 2;
    let baseBomb = 150;
    if (hasRelic('time_bomb_detonator', ctx.gameState.relics)) baseBomb *= 2;
    ctx.bombDamage = baseBomb + getSkillEffect('war_bomb', ctx.ms) * 50;
  },
  FINISHER: (ctx) => {
    if (ctx.index === ctx.beastArray.length - 1) {
      const finMult = 5 + getSkillEffect('war_finisher', ctx.ms);
      ctx.track(ctx.dmg * finMult, 'Finisher');
    }
  },
  PUNISHER: (ctx) => {
    let punishThresh = 15;
    if (hasRelic('punishers_whip', ctx.gameState.relics)) punishThresh = 30;
    if (ctx.lastDamage > 0 && ctx.lastDamage < punishThresh) ctx.track(ctx.dmg * 3, 'Punisher');
  },
  ECHO: (ctx) => {
    if (ctx.lastDamage > 0) {
      let baseEcho = 1.0;
      if (hasRelic('echo_chamber', ctx.gameState.relics)) baseEcho = 1.5;
      const echoMult = baseEcho + (getSkillEffect('war_echo', ctx.ms) * 0.2);
      ctx.track(ctx.dmg + ctx.lastDamage * echoMult, 'Echo');
    }
  },

  TRIGGER_NEXT: (ctx) => {
    const nextBeast = ctx.beastArray[ctx.index + 1];
    if (nextBeast && nextBeast.appliesStatus) {
      ctx.currentStatuses[nextBeast.appliesStatus] = (ctx.currentStatuses[nextBeast.appliesStatus] || 0) + 1;
    }
  },
  MIRROR_SYMMETRY: (ctx) => {
    const oppIdx = (ctx.beastArray.length - 1) - ctx.index;
    const oppBeast = ctx.beastArray[oppIdx];
    if (oppBeast) {
      const isMirrorMax = getSkillEffect('war_mirror', ctx.ms) > 0;
      const oppDmg = isMirrorMax ? oppBeast.maxDamage : (Math.floor(Math.random() * (oppBeast.maxDamage - oppBeast.minDamage + 1)) + oppBeast.minDamage);
      let newDmg = ctx.dmg + oppDmg;
      if (hasRelic('mirror_shield', ctx.gameState.relics)) newDmg += 50;
      ctx.track(newDmg, 'Mirror Symmetry');
    }
  },
  MOMENTUM_LOSS: (ctx) => {
    let penalty = 15;
    if (hasRelic('momentum_pendulum', ctx.gameState.relics)) penalty = 7.5;
    let newDmg = ctx.dmg - (penalty * ctx.beastsAttacked);
    if (newDmg < 0) newDmg = 0;
    ctx.track(newDmg, 'Momentum Loss');
  },
  STATUS_CONVERSION: (ctx) => {
    let converted = 0;
    if (getStatus(ctx.currentStatuses, 'POISON') > 0) {
      converted += ctx.currentStatuses['POISON'];
      ctx.currentStatuses['FROSTBITE'] = (ctx.currentStatuses['FROSTBITE'] || 0) + ctx.currentStatuses['POISON'];
      clearStatus(ctx.currentStatuses, 'POISON');
    }
    if (getStatus(ctx.currentStatuses, 'FIRE') > 0) {
      converted += ctx.currentStatuses['FIRE'];
      ctx.currentStatuses['SHOCK'] = (ctx.currentStatuses['SHOCK'] || 0) + ctx.currentStatuses['FIRE'];
      clearStatus(ctx.currentStatuses, 'FIRE');
    }
    let baseConv = 10;
    if (hasRelic('conversion_kit', ctx.gameState.relics)) baseConv = 25;
    const convMult = baseConv + (getSkillEffect('alc_convert', ctx.ms) * 15);
    ctx.track(ctx.dmg + converted * convMult, 'Status Conversion');
  },
  VACUUM_SCALER: (ctx) => {
    let cleared = 0;
    for (const [status, stacks] of Object.entries(ctx.currentStatuses)) {
      if (stacks > 0) {
        cleared += stacks;
        ctx.currentStatuses[status] = 0;
      }
    }
    let vacDmg = 5;
    if (hasRelic('vacuum_cleaner', ctx.gameState.relics)) vacDmg = 10;
    ctx.globalBeastBuff += cleared * vacDmg;
  },
  MISSING_HP_SCALING: (ctx) => {
    const missingHp = Math.max(0, ctx.bossHp - ctx.totalDamage);
    ctx.track(ctx.dmg + Math.floor(missingHp * 0.15), 'Missing HP Scaling');
  },

  FIRST_STRIKE: (ctx) => {
    if (ctx.beastsAttacked === 0) {
      let firstMult = 3;
      if (hasRelic('first_blood_medal', ctx.gameState.relics)) firstMult = 4;
      ctx.track(ctx.dmg * firstMult, 'First Strike');
    }
  },
  HIDE: (ctx) => {
    if (ctx.beastsAttacked === 0 || ctx.beastsAttacked === 1) ctx.track(0, 'Hide');
    if (hasRelic('telescope', ctx.gameState.relics)) {
      ctx.nextBeastBuff += 20;
    }
  },
  GROWTH: (ctx) => {
    let growthMult = 2;
    if (hasRelic('growth_hormone', ctx.gameState.relics)) growthMult = 5;
    ctx.track(ctx.dmg + (growthMult * ctx.beastsAttacked), 'Growth');
  },
  MINOR_BUFF: (ctx) => {
    ctx.nextBeastBuff += 5;
    if (hasRelic('cheerleader_pompoms', ctx.gameState.relics)) ctx.globalBeastBuff += 10;
  },
  KINDLING: (ctx) => {
    if (getStatus(ctx.currentStatuses, 'FIRE') > 0) {
      let kindleMult = 2;
      if (hasRelic('kindling_wood', ctx.gameState.relics)) kindleMult = 3;
      ctx.track(ctx.dmg * kindleMult, 'Kindling');
    }
  },
  HIGH_ROLLER: (ctx) => {
    let rollChance = 0.5;
    if (hasRelic('high_roller_chips', ctx.gameState.relics)) rollChance = 0.75;
    if (Math.random() < rollChance) ctx.track(ctx.dmg * 2, 'High Roller (Win)');
    else ctx.track(Math.floor(ctx.dmg / 2), 'High Roller (Loss)');
  },

  GOLD_SCALING: (ctx) => {
    let goldMult = 1;
    if (hasRelic('gold_plating', ctx.gameState.relics)) goldMult = 2;
    ctx.track(ctx.dmg + (ctx.gameState.gold || 0) * goldMult, 'Gold Scaling');
  },
  EPOCH_SCALING: (ctx) => {
    let divisor = 50;
    if (hasRelic('epoch_clock', ctx.gameState.relics)) divisor = 25;
    ctx.track(ctx.dmg + Math.floor((ctx.gameState.epochs || 0) / divisor), 'Epoch Scaling');
  },
  INVENTORY_SCALING: (ctx) => {
    let invBase = 5;
    if (hasRelic('collectors_edition', ctx.gameState.relics)) invBase = 15;
    ctx.track(ctx.dmg + ((ctx.gameState.inventorySize || 0) * (invBase + getSkillEffect('inv_collector', ctx.ms) * 5)), 'Inventory Scaling');
  },
  LEVEL_SCALING: (ctx) => {
    let lvlBase = 10;
    if (hasRelic('level_up_potion', ctx.gameState.relics)) lvlBase = 20;
    ctx.track(ctx.dmg + ((ctx.gameState.level || 0) * lvlBase), 'Level Scaling');
  },
  LEGENDARY_MULTIPLIER: (ctx) => {
    const legCount = ctx.beastArray.filter(b => b.rarity === 'Legendary').length;
    let baseMult = 1.5;
    if (hasRelic('crown_of_legends', ctx.gameState.relics)) baseMult = 2.0;
    ctx.track(Math.floor(ctx.dmg * Math.pow(baseMult, legCount)), 'Legendary Multiplier');
  },
  PRIME_NUMBER_STRIKE: (ctx) => {
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29];
    if (primes.includes(ctx.index + 1)) ctx.track(ctx.dmg * 3, 'Prime Number Strike');
  },
  LONE_WOLF: (ctx) => {
    const myRarity = ctx.beast.rarity;
    const sameRarityCount = ctx.beastArray.filter(b => b.rarity === myRarity).length;
    if (sameRarityCount === 1) ctx.track(ctx.dmg * 5, 'Lone Wolf');
  },
  SANDWICH: (ctx) => {
    const prev = ctx.beastArray[ctx.index - 1];
    const next = ctx.beastArray[ctx.index + 1];
    if (prev && next && prev.rarity === next.rarity) ctx.track(ctx.dmg * 3, 'Sandwich Multiplier');
  },
  STATUS_MIRROR: (ctx) => {
    let totalStacks = 0;
    for (const stacks of Object.values(ctx.currentStatuses)) totalStacks += stacks;
    ctx.track(ctx.dmg + totalStacks * 15, 'Status Mirror');
  },
  DETONATOR: (ctx) => {
    if (ctx.bombTimer >= 0) {
      ctx.track(ctx.dmg + (ctx.bombDamage * 2.5), 'Detonator');
      ctx.bombTimer = -1;
      ctx.bombDamage = 0;
    }
  },
  MARTYRDOM: (ctx) => {
    ctx.globalBeastBuff += Math.floor(ctx.beast.maxDamage * 0.5);
    ctx.track(0, 'Martyrdom');
  },
  RUSSIAN_ROULETTE: (ctx) => {
    if (Math.random() < (1 / 6)) {
      ctx.track(ctx.dmg * 50, 'Russian Roulette (BANG!)');
    } else {
      for (const status of Object.keys(ctx.currentStatuses)) ctx.currentStatuses[status] = 0;
      ctx.track(0, 'Russian Roulette (Click)');
    }
  },
  ALL_OR_NOTHING: (ctx) => {
    let totalStacks = 0;
    for (const stacks of Object.values(ctx.currentStatuses)) totalStacks += stacks;
    if (totalStacks === 0) ctx.track(ctx.dmg * 10, 'All Or Nothing');
    else ctx.track(1, 'All Or Nothing Penalty');
  },
  REPEATER: (ctx) => {
    const prev = ctx.beastArray[ctx.index - 1];
    if (prev && prev.name === ctx.beast.name) ctx.track(ctx.dmg * 3, 'Repeater');
  },
  ELEVATOR: (ctx) => {
    ctx.track(ctx.dmg * (1 + (ctx.index * 0.5)), 'Elevator');
  }
};
