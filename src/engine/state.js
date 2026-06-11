import { makeBeast } from '../data/beasts.js';
import { getSkillEffect } from '../skilltree.js';
import { hasRelic } from '../utils.js';

export const metaState = JSON.parse(localStorage.getItem('antigravity_meta')) || { dna: 0, skillTree: {} };
if (!metaState.skillTree) metaState.skillTree = {};
if (!metaState.settings) metaState.settings = { autoPlayTurns: false };

export function saveMetaState() {
  localStorage.setItem('antigravity_meta', JSON.stringify(metaState));
}

export const runState = {
  bossMaxHp: 60,
  bossHp: 60,
  currentStance: 'NONE',
  combatRound: 1,
  globalStatuses: {},
  bestSequence: [],
  bestExpectedDmg: 0,
  populationHistory: [],
  bestSequenceHistory: [],
  actions: []
};

export const state = {
  level: 1,
  gold: 40 + (getSkillEffect('eco_gold1', metaState) * 20),
  epochs: 0,
  totalEpochsRun: 0,
  shopLevel: 1,
  upgradeCost: 30,
  shopOfferings: [],
  relics: [],
  runHistory: [],
  beasts: [
    makeBeast('Vanguard', 10, 15, null, 'FIRST_STRIKE', 'Uncommon', '🛡️', '#78716c'),
    makeBeast('Coward', 15, 15, null, 'HIDE', 'Common', '🙈', '#d6d3d1'),
    makeBeast('Scout', 4, 8, null, 'GROWTH', 'Common', '🦅', '#93c5fd'),
    makeBeast('Cheerleader', 1, 5, null, 'BUFF_NEXT_20', 'Common', '📣', '#f472b6')
  ]
};

export function getPopSize() { 
  let pop = 12 + (getSkillEffect('gen_pop1', metaState) * 2) + (getSkillEffect('gen_pop2', metaState) * 4);
  if (hasRelic('quantum_processor', state?.relics)) pop += 5;
  return pop;
}

export function getMaxSlots() { 
  let slots = 4 + getSkillEffect('gen_slots1', metaState) + getSkillEffect('gen_slots2', metaState) + getSkillEffect('gen_slots3', metaState) + getSkillEffect('gen_slots4', metaState);
  if (hasRelic('glass_cannon', state?.relics)) slots -= 1;
  return Math.max(1, Math.min(8, slots)); 
}
