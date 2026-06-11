import { state, metaState } from './state.js';
import { shopPool } from '../data/beasts.js';
import { getSkillEffect } from '../skilltree.js';
import { hasRelic } from '../utils.js';

export function rollShop() {
  state.shopOfferings = [];
  state.relicOfferings = [];
  
  const levelWeights = {
    1: { 'Common': 80, 'Uncommon': 20 },
    2: { 'Common': 60, 'Uncommon': 30, 'Rare': 10 },
    3: { 'Common': 50, 'Uncommon': 30, 'Rare': 15, 'Epic': 5 },
    4: { 'Common': 40, 'Uncommon': 30, 'Rare': 15, 'Epic': 10, 'Legendary': 5 },
    5: { 'Common': 30, 'Uncommon': 30, 'Rare': 20, 'Epic': 12, 'Legendary': 8 }
  };
  
  const weights = { ...levelWeights[Math.min(state.shopLevel, 5)] };
  weights['Uncommon'] = (weights['Uncommon'] || 0) + getSkillEffect('inv_luck_unc', metaState) * 5;
  weights['Rare'] = (weights['Rare'] || 0) + getSkillEffect('inv_luck_rare', metaState) * 3;
  weights['Epic'] = (weights['Epic'] || 0) + getSkillEffect('inv_luck_epic', metaState) * 2;
  weights['Legendary'] = (weights['Legendary'] || 0) + getSkillEffect('inv_luck_leg', metaState) * 2;

  let extraSlots = getSkillEffect('eco_extra_shop', metaState);
  if (hasRelic('expanded_display', state.relics)) extraSlots += 1;
  
  for (let i = 0; i < 3 + extraSlots; i++) {
    let rand = Math.random() * 100;
    let chosenRarity = 'Common';
    let cumulative = 0;
    for (const [rarity, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (rand <= cumulative) {
        chosenRarity = rarity;
        break;
      }
    }

    const validBeasts = shopPool.filter(p => p.rarity === chosenRarity);
    let randBlueprint = validBeasts[Math.floor(Math.random() * validBeasts.length)];
    
    // Dupe chance
    if (i === 0 && getSkillEffect('inv_dupe', metaState) > 0 && Math.random() < 0.15 && state.beasts.length > 0) {
       const dupeName = state.beasts[Math.floor(Math.random() * state.beasts.length)].name;
       const dupeBp = shopPool.find(p => p.factory().name === dupeName);
       if (dupeBp) randBlueprint = dupeBp;
    }
    
    const randBeast = randBlueprint.factory();
    const isMidas = getSkillEffect('eco_cap', metaState) > 0;
    
    let baseCost = 15;
    if (chosenRarity === 'Uncommon') baseCost = 30;
    if (chosenRarity === 'Rare') baseCost = 60;
    if (chosenRarity === 'Epic') baseCost = 120;
    if (chosenRarity === 'Legendary') baseCost = 250;

    let discountPct = getSkillEffect('eco_bulk', metaState) === 1 ? 0.1 : (getSkillEffect('eco_bulk', metaState) === 2 ? 0.2 : 0);
    if (hasRelic('hagglers_charm', state.relics)) discountPct += 0.05;

    randBeast.cost = isMidas ? 10 : Math.floor(baseCost * (1 - discountPct));
    state.shopOfferings.push(randBeast);
  }
}
