import { createBeast, calculateDamage } from './combat.js';
import { orderCrossover, mutateSwap } from './ga.js';
import { buyBeast, buyEpochs } from './economy.js';

function makeBeast(name, min, max, stat, syn, rarity, icon, color) {
  const b = createBeast(name, min, max, stat, syn);
  b.rarity = rarity;
  b.icon = icon;
  b.color = color || '#a1a1aa';
  b.id = Math.random().toString(36).substr(2, 9);
  return b;
}

// --- Meta Progression State ---
let metaState = JSON.parse(localStorage.getItem('antigravity_meta')) || { dna: 0, skillTree: {} };
if (!metaState.skillTree) metaState.skillTree = {};
metaState.skillTree.extraSlots = metaState.skillTree.extraSlots || 0;
metaState.skillTree.startingGold = metaState.skillTree.startingGold || 0;
metaState.skillTree.popSize = metaState.skillTree.popSize || 0;

function saveMetaState() {
  localStorage.setItem('antigravity_meta', JSON.stringify(metaState));
}

function getPopSize() { return 12 + (metaState.skillTree.popSize * 2); }
function getMaxSlots() { return Math.min(8, 4 + metaState.skillTree.extraSlots); }

// --- Game Run State ---
let state = {
  level: 1,
  gold: 20 + (metaState.skillTree.startingGold * 20),
  epochs: 0,
  totalEpochsRun: 0,
  shopLevel: 1,
  upgradeCost: 20,
  shopOfferings: [],
  relics: [],
  beasts: [
    makeBeast('Vanguard', 10, 15, null, 'FIRST_STRIKE', 'Uncommon', '🛡️', '#78716c'),
    makeBeast('Coward', 15, 15, null, 'HIDE', 'Common', '🙈', '#d6d3d1'),
    makeBeast('Scout', 4, 8, null, 'GROWTH', 'Common', '🦅', '#93c5fd'),
    makeBeast('Cheerleader', 1, 5, null, 'BUFF_NEXT_20', 'Common', '📣', '#f472b6')
  ]
};

let bossMaxHp = 60;
let bossHp = 60;
const BOSS_STANCES = ['NONE', 'ARMORED', 'POISON_WEAKNESS', 'FIRE_IMMUNITY', 'SHOCK_WEAKNESS', 'VULNERABLE_WEAKNESS'];
let currentStance = 'NONE';
let combatRound = 1;
let globalStatuses = {};

let bestSequence = [];
let bestExpectedDmg = 0;

// --- DOM Elements ---
const elLevel = document.getElementById('level-display');
const elDna = document.getElementById('dna-display');
const elGold = document.getElementById('gold-display');
const elEpochs = document.getElementById('epochs-display');
const elBestDmg = document.getElementById('best-dmg-display');
const elBossHp = document.getElementById('boss-hp-display');
const elBossHpMax = document.getElementById('boss-hp-max');
const elBossHpBar = document.getElementById('boss-hp-bar');
const elBeastSlots = document.getElementById('beast-slots');
const elArenaLeft = document.getElementById('arena-left');
const elArenaBoss = document.getElementById('arena-boss');
const elCombatLog = document.getElementById('combat-log');
const elMatrixView = document.getElementById('matrix-view');
const elBestSequenceDisplay = document.getElementById('best-sequence-display');
const elShopItems = document.getElementById('shop-items');
const elShopActions = document.getElementById('shop-actions');
const elRelicSlots = document.getElementById('relic-slots');
const elBossStance = document.getElementById('boss-stance-display');
const btnFight = document.getElementById('btn-fight');

// Relic Choice Modal Elements
const elRelicChoiceOverlay = document.getElementById('relic-choice-overlay');
const elRelicOptions = document.getElementById('relic-options');
const btnSkipRelic = document.getElementById('btn-skip-relic');

// Lab Elements
const elLabOverlay = document.getElementById('lab-overlay');
const btnOpenLab = document.getElementById('btn-open-lab');
const btnCloseLab = document.getElementById('btn-close-lab');
const elLabDna = document.getElementById('lab-dna-display');

// Lab Upgrade UI
const labNodes = {
  slots: { rank: document.getElementById('rank-slots'), cost: document.getElementById('cost-slots'), btn: document.getElementById('btn-upgrade-slots') },
  gold: { rank: document.getElementById('rank-gold'), cost: document.getElementById('cost-gold'), btn: document.getElementById('btn-upgrade-gold') },
  pop: { rank: document.getElementById('rank-pop'), cost: document.getElementById('cost-pop'), btn: document.getElementById('btn-upgrade-pop') }
};
const labCosts = { slots: [50, 150, 300, 500], gold: [20, 50, 100, 200, 400], pop: [30, 80, 150, 300, 500, 800] };
const canvas = document.getElementById('bump-chart');
const ctx = canvas.getContext('2d');
const convCanvas = document.getElementById('convergence-chart');
const convCtx = convCanvas ? convCanvas.getContext('2d') : null;

// --- GA State ---
let population = [];
let bestSequenceHistory = [];
const elOverlay = document.getElementById('screen-overlay');
const elOverlayContent = document.getElementById('overlay-content');
const elOverlayTitle = document.getElementById('overlay-title');
const elOverlayText = document.getElementById('overlay-text');
const btnRestart = document.getElementById('btn-restart');
const elToastContainer = document.getElementById('toast-container');
const elGlobalTooltip = document.getElementById('global-tooltip');
const elPreviousSequencesList = document.getElementById('previous-sequences-list');

// --- Custom UI Overlays ---
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  elToastContainer.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, 2000);
}

function showOverlay(title, text, type, showRestart) {
  elOverlayContent.className = `overlay-content ${type}`;
  elOverlayTitle.textContent = title;
  elOverlayText.textContent = text;
  if (showRestart) {
    btnRestart.classList.remove('hidden');
    btnRestart.onclick = () => resetRun();
  } else {
    btnRestart.classList.add('hidden');
  }
  elOverlay.classList.remove('hidden');
}

function hideOverlay() {
  elOverlay.classList.add('hidden');
}

// --- Init ---
function init() {
  resetRun();
}

function renderBestSequenceUI() {
  elBestSequenceDisplay.innerHTML = '';
  const activeSeq = bestSequence.slice(0, getMaxSlots());
  
  for (let i = 0; i < getMaxSlots(); i++) {
    const slot = document.createElement('div');
    if (i < activeSeq.length) {
      const b = activeSeq[i];
      slot.textContent = b.icon;
      slot.className = 'sequence-slot filled has-tooltip';
      slot.setAttribute('data-tooltip', getTooltipText(b));
    } else {
      slot.textContent = i + 1;
      slot.className = 'sequence-slot empty';
    }
    elBestSequenceDisplay.appendChild(slot);
  }
}

// --- UI Updates ---
function updateUI() {
  if (elDna) elDna.textContent = metaState.dna;
  elLevel.textContent = state.level;
  elGold.textContent = state.gold;
  elEpochs.textContent = state.epochs;
  elBestDmg.textContent = bestExpectedDmg.toFixed(1);
  elBossHp.textContent = bossHp;
  elBossHpMax.textContent = bossMaxHp;
  elBossHpBar.style.width = `${Math.max(0, (bossHp / bossMaxHp) * 100)}%`;

  // Render Run Relics
  if (elRelicSlots) {
    elRelicSlots.innerHTML = '';
    state.relics.forEach(r => {
      const rdiv = document.createElement('div');
      rdiv.className = 'relic-slot has-tooltip';
      rdiv.textContent = r.icon;
      rdiv.setAttribute('data-tooltip', r.desc);
      elRelicSlots.appendChild(rdiv);
    });
  }

  if (elBossStance) {
    elBossStance.textContent = `STANCE: ${currentStance}`;
  }
  if (btnFight) {
    if (combatRound <= 3 && bossHp > 0 && btnFight.disabled === false) {
      btnFight.textContent = `COMPUTE & EXECUTE ROUND ${combatRound}/3`;
    }
  }
}

function getTooltipText(b) {
  let text = `Damage: ${b.minDamage}-${b.maxDamage}\n`;
  if (b.appliesStatus) text += `Applies: ${b.appliesStatus}\n`;
  if (b.synergy) {
    text += `Synergy: ${b.synergy}\n`;
    if (b.synergy === 'TIME_BOMB') text += `Detonates after 2 attacks for 150 dmg.`;
    else if (b.synergy === 'FINISHER') text += `Deals 5x damage if placed in the last slot.`;
    else if (b.synergy === 'PUNISHER') text += `Deals 3x damage if previous beast dealt < 15 dmg.`;
    else if (b.synergy === 'ECHO') text += `Deals extra damage equal to previous beast's damage.`;
    else if (b.synergy === 'COMBO_SCALER') text += `+15% damage per beast that attacked before it.`;
    else if (b.synergy === 'BUFF_NEXT_20') text += `Adds +20 base damage to the next beast.`;
    else if (b.synergy === 'BUFF_NEXT_40') text += `Adds +40 base damage to the next beast.`;
    else if (b.synergy === 'CONSUME_ALL') text += `Removes all status effects, gains +50 damage per removed.`;
    else if (b.synergy === 'EXECUTE') text += `Deals 4x damage if Boss HP < 30%.`;
    else if (b.synergy === 'DOUBLE_IF_POISONED') text += `Deals 2x damage if boss is POISONED.`;
    else if (b.synergy === 'DOUBLE_IF_FIRE') text += `Deals 2x damage if boss is ON FIRE.`;
    else if (b.synergy === 'TRIPLE_IF_SHOCK') text += `Deals 3x damage if boss is SHOCKED.`;
    else if (b.synergy === 'DOUBLE_IF_VULNERABLE') text += `Deals 2x damage if boss is VULNERABLE.`;
    else if (b.synergy === 'CONSUME_POISON') text += `Consumes POISON for +50 damage.`;
    else if (b.synergy === 'CONSUME_FIRE') text += `Consumes FIRE for +60 damage.`;
    else if (b.synergy === 'CATALYST') text += `Detonates POISON for massive damage.`;
    else if (b.synergy === 'PROLIFERATE') text += `Doubles all current status effect stacks.`;
    else if (b.synergy === 'TRIGGER_NEXT') text += `Triggers the status effect of the NEXT beast instantly.`;
    else if (b.synergy === 'MIRROR_SYMMETRY') text += `Copies the damage of the beast in the opposite slot.`;
    else if (b.synergy === 'MOMENTUM_LOSS') text += `-15 damage for every beast that attacked before it.`;
    else if (b.synergy === 'STATUS_CONVERSION') text += `Converts Poison->Frostbite and Fire->Shock. Does 10x converted damage.`;
    else if (b.synergy === 'VACUUM_SCALER') text += `Clears all statuses. Gives +5 damage to all following beasts per stack cleared.`;
    else if (b.synergy === 'MISSING_HP_SCALING') text += `Deals 15% of the Boss's missing HP.`;
    else if (b.synergy === 'FIRST_STRIKE') text += `Deals 3x damage if placed in Slot 1.`;
    else if (b.synergy === 'HIDE') text += `Deals 0 damage if placed in Slot 1 or 2.`;
    else if (b.synergy === 'GROWTH') text += `Gains +2 damage for every beast that attacked before it.`;
    else if (b.synergy === 'MINOR_BUFF') text += `Adds +5 base damage to the next beast.`;
    else if (b.synergy === 'KINDLING') text += `Deals 2x damage if the Boss is ON FIRE.`;
    else if (b.synergy === 'HIGH_ROLLER') text += `Double damage if it rolls odd, half damage if it rolls even.`;
    else if (b.synergy === 'GOLD_SCALING') text += `Deals +1 damage for every 1 Gold you hold.`;
    else if (b.synergy === 'EPOCH_SCALING') text += `Deals +1 damage for every 50 GA Epochs run.`;
    else if (b.synergy === 'INVENTORY_SCALING') text += `Deals +5 damage for every beast in your inventory.`;
    else if (b.synergy === 'LEVEL_SCALING') text += `Deals +10 damage for every Level cleared.`;
    else if (b.synergy === 'LEGENDARY_MULTIPLIER') text += `Damage is multiplied by 1.5x for every Legendary on the board.`;
  }
  return text.trim();
}

function getAbilityTitle(b) {
  if (b.synergy) {
    const titles = {
      'TIME_BOMB': 'Tick Tock 💣',
      'FINISHER': 'The Last Laugh 🎭',
      'PUNISHER': 'Bully Tactics 💢',
      'ECHO': 'Copycat 🪞',
      'COMBO_SCALER': 'Combo Chain ⛓️',
      'BUFF_NEXT_20': 'Minor Blessing ✨',
      'BUFF_NEXT_40': 'Battle Cry 🗣️',
      'CONSUME_ALL': 'Void Collapse 🌌',
      'EXECUTE': 'Guillotine 🪓',
      'DOUBLE_IF_POISONED': 'Venom Strike 🐍',
      'DOUBLE_IF_FIRE': 'Fan The Flames 🔥',
      'TRIPLE_IF_SHOCK': 'Lightning Rod ⚡',
      'DOUBLE_IF_VULNERABLE': 'Merciless 🩸',
      'CONSUME_POISON': 'Toxin Drinker 🧪',
      'CONSUME_FIRE': 'Fire Eater 🌋',
      'CATALYST': 'Chemical Reaction 💥',
      'PROLIFERATE': 'Pandemic 🦠',
      'TRIGGER_NEXT': 'The Conductor 🎼',
      'MIRROR_SYMMETRY': 'Mirror Entity 🪞',
      'MOMENTUM_LOSS': 'Fatigue Giant 🥱',
      'STATUS_CONVERSION': 'Prismatic Slime 🌈',
      'VACUUM_SCALER': 'Vacuum Ooze 🌪️',
      'MISSING_HP_SCALING': 'Blood Mage 🩸',
      'FIRST_STRIKE': 'Vanguard Charge 🛡️',
      'HIDE': 'Cowardice 🙈',
      'GROWTH': 'Momentum 📈',
      'MINOR_BUFF': 'Cheer 📣',
      'KINDLING': 'Kindling 🪵',
      'HIGH_ROLLER': 'All In 🎲',
      'GOLD_SCALING': 'Bribe 💰',
      'EPOCH_SCALING': 'Time Dilation ⏳',
      'INVENTORY_SCALING': 'Swarm Tactics 🐝',
      'LEVEL_SCALING': 'Bloodlust 🩸',
      'LEGENDARY_MULTIPLIER': 'Fractal Resonance 💠'
    };
    return titles[b.synergy] || 'Special Skill';
  } else if (b.appliesStatus) {
    const titles = {
      'POISON': 'Toxic Spit 🤢',
      'FIRE': 'Ignite 🔥',
      'SHOCK': 'Static Zap ⚡',
      'VULNERABLE': 'Armor Break 🛡️',
      'FROSTBITE': 'Deep Freeze ❄️'
    };
    return titles[b.appliesStatus] || 'Status Effect';
  }
  return 'Basic Attack ⚔️';
}

function renderBeasts() {
  const rarityVals = { 'Legendary': 5, 'Epic': 4, 'Rare': 3, 'Uncommon': 2, 'Common': 1 };
  state.beasts.sort((a, b) => {
    if (rarityVals[b.rarity] !== rarityVals[a.rarity]) {
      return rarityVals[b.rarity] - rarityVals[a.rarity];
    }
    return a.name.localeCompare(b.name);
  });

  elBeastSlots.innerHTML = '';
  state.beasts.forEach((b, idx) => {
    const div = document.createElement('div');
    div.className = 'beast-item';
    div.innerHTML = `
      <div class="beast-header">
        <div class="beast-info has-tooltip" data-tooltip="${getTooltipText(b).replace(/"/g, '&quot;')}">
          <div class="beast-name rarity-${b.rarity}">${b.icon} ${b.name}</div>
          <div class="beast-stats">${getAbilityTitle(b)}</div>
        </div>
        <button class="btn-sell">Sell (5G)</button>
      </div>
    `;

    div.querySelector('.btn-sell').onclick = () => {
      if (btnFight.disabled && bossHp > 0) return; // Prevent selling during computing/fighting
      state.beasts.splice(idx, 1);
      state.gold += 5;
      population = []; // Invalidate GA population
      updateUI();
      renderBeasts();
      if (!btnFight.disabled) {
        bestSequence = [...state.beasts];
        renderFightArena();
      }
    };

    elBeastSlots.appendChild(div);
  });
}

function renderFightArena(activeIndex = -1) {
  elArenaLeft.innerHTML = '';
  const activeSeq = bestSequence.slice(0, getMaxSlots());
  activeSeq.forEach((b, idx) => {
    const div = document.createElement('div');
    div.className = 'beast-icon';
    if (idx === activeIndex) div.classList.add('active');
    div.textContent = b.icon;
    div.title = b.name;
    elArenaLeft.appendChild(div);
  });
}

function logCombat(msg, type = 'normal') {
  const div = document.createElement('div');
  div.className = `log-entry ${type}`;
  div.textContent = msg;
  elCombatLog.appendChild(div);
  elCombatLog.scrollTop = elCombatLog.scrollHeight;
}

// --- Shop Logic ---
const shopPool = [
  { factory: () => makeBeast('Coward', 15, 15, null, 'HIDE', 'Common', '🙈', '#d6d3d1'), rarity: 'Common' },
  { factory: () => makeBeast('Scout', 4, 8, null, 'GROWTH', 'Common', '🦅', '#93c5fd'), rarity: 'Common' },
  { factory: () => makeBeast('Cheerleader', 2, 4, null, 'MINOR_BUFF', 'Common', '📣', '#fca5a5'), rarity: 'Common' },
  { factory: () => makeBeast('Static Slime', 4, 8, 'SHOCK', null, 'Common', '💧', '#fbbf24'), rarity: 'Common' },
  { factory: () => makeBeast('Bomber', 5, 10, null, 'TIME_BOMB', 'Rare', '💣', '#ef4444'), rarity: 'Rare' },
  { factory: () => makeBeast('Blood Mage', 5, 15, null, 'MISSING_HP_SCALING', 'Epic', '🩸', '#991b1b'), rarity: 'Epic' },
  { factory: () => makeBeast('Conductor', 10, 20, null, 'TRIGGER_NEXT', 'Epic', '🎼', '#fbcfe8'), rarity: 'Epic' },
  { factory: () => makeBeast('Doppelganger', 5, 10, null, 'MIRROR_SYMMETRY', 'Rare', '👥', '#a78bfa'), rarity: 'Rare' },
  { factory: () => makeBeast('Leech', 5, 10, 'VULNERABLE', null, 'Uncommon', '🦟', '#c084fc'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Cleric', 2, 5, null, 'BUFF_NEXT_20', 'Uncommon', '🧙', '#fde047'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Venomous', 5, 10, 'POISON', null, 'Uncommon', '🐍', '#4ade80'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Spider', 4, 8, 'POISON', null, 'Uncommon', '🕷️', '#22c55e'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Bat', 5, 12, 'VULNERABLE', null, 'Uncommon', '🦇', '#a855f7'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Vanguard', 10, 15, null, 'FIRST_STRIKE', 'Uncommon', '🛡️', '#78716c'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Firefly', 5, 8, 'FIRE', 'KINDLING', 'Uncommon', '🪲', '#f97316'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Gambler', 1, 25, null, 'HIGH_ROLLER', 'Uncommon', '🎲', '#fef08a'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Fire Element', 10, 15, 'FIRE', null, 'Rare', '🔥', '#ef4444'), rarity: 'Rare' },
  { factory: () => makeBeast('Ice Element', 10, 15, 'FROSTBITE', null, 'Rare', '❄️', '#38bdf8'), rarity: 'Rare' },
  { factory: () => makeBeast('Electric Eel', 10, 15, 'SHOCK', null, 'Rare', '⚡', '#fbbf24'), rarity: 'Rare' },
  { factory: () => makeBeast('Fatigue Giant', 60, 80, null, 'MOMENTUM_LOSS', 'Rare', '🥱', '#d6d3d1'), rarity: 'Rare' },
  { factory: () => makeBeast('Blademaster', 10, 15, null, 'COMBO_SCALER', 'Rare', '⚔️', '#52525b'), rarity: 'Rare' },
  { factory: () => makeBeast('Assassin', 5, 25, null, 'EXECUTE', 'Rare', '🥷', '#52525b'), rarity: 'Rare' },
  { factory: () => makeBeast('Steam Roller', 15, 20, null, 'DOUBLE_IF_FIRE', 'Epic', '🚂', '#a1a1aa'), rarity: 'Epic' },
  { factory: () => makeBeast('Thunderbird', 15, 25, null, 'TRIPLE_IF_SHOCK', 'Epic', '🦅', '#fcd34d'), rarity: 'Epic' },
  { factory: () => makeBeast('Dragon', 20, 35, 'FIRE', 'DOUBLE_IF_FIRE', 'Epic', '🐲', '#dc2626'), rarity: 'Epic' },
  { factory: () => makeBeast('Paladin', 10, 15, null, 'BUFF_NEXT_40', 'Epic', '🛡️', '#fef08a'), rarity: 'Epic' },
  { factory: () => makeBeast('Plague Doctor', 5, 10, 'POISON', 'PROLIFERATE', 'Epic', '🐦‍⬛', '#16a34a'), rarity: 'Epic' },
  { factory: () => makeBeast('Prism Slime', 10, 15, null, 'STATUS_CONVERSION', 'Epic', '🌈', '#f472b6'), rarity: 'Epic' },
  { factory: () => makeBeast('Gold Hoarder', 5, 15, null, 'GOLD_SCALING', 'Epic', '💰', '#eab308'), rarity: 'Epic' },
  { factory: () => makeBeast('The Collector', 5, 10, null, 'INVENTORY_SCALING', 'Epic', '🐝', '#65a30d'), rarity: 'Epic' },
  { factory: () => makeBeast('Gargoyle', 20, 30, null, 'CONSUME_POISON', 'Legendary', '🗿', '#57534e'), rarity: 'Legendary' },
  { factory: () => makeBeast('Reaper', 5, 15, null, 'DOUBLE_IF_POISONED', 'Legendary', '💀', '#000000'), rarity: 'Legendary' },
  { factory: () => makeBeast('Chimera', 15, 25, 'POISON', 'TRIPLE_IF_SHOCK', 'Legendary', '🦁', '#eab308'), rarity: 'Legendary' },
  { factory: () => makeBeast('Leviathan', 25, 40, 'VULNERABLE', 'DOUBLE_IF_VULNERABLE', 'Legendary', '🐋', '#0284c7'), rarity: 'Legendary' },
  { factory: () => makeBeast('Kraken', 30, 45, null, 'CONSUME_FIRE', 'Legendary', '🦑', '#db2777'), rarity: 'Legendary' },
  { factory: () => makeBeast('Vacuum Ooze', 20, 30, null, 'VACUUM_SCALER', 'Legendary', '🌪️', '#94a3b8'), rarity: 'Legendary' },
  { factory: () => makeBeast('Time Traveler', 10, 20, null, 'EPOCH_SCALING', 'Legendary', '⏳', '#0284c7'), rarity: 'Legendary' },
  { factory: () => makeBeast('Blood Thirster', 15, 25, null, 'LEVEL_SCALING', 'Legendary', '🩸', '#991b1b'), rarity: 'Legendary' },
  { factory: () => makeBeast('Infinite Fractal', 5, 10, null, 'LEGENDARY_MULTIPLIER', 'Legendary', '💠', '#c084fc'), rarity: 'Legendary' }
];

const relicPool = [
  { id: 'venom_gland', name: 'Venom Gland', icon: '☠️', desc: 'Poison ticks for 25 dmg instead of 15', cost: 60 },
  { id: 'molten_core', name: 'Molten Core', icon: '🌋', desc: 'Fire never degrades its stacks', cost: 75 },
  { id: 'heavy_anvil', name: 'Heavy Anvil', icon: '🗜️', desc: 'All beasts gain +10 minimum and maximum damage', cost: 50 },
  { id: 'golden_dice', name: 'Golden Dice', icon: '🎲', desc: 'Shop refreshes cost 2G instead of 5G', cost: 100 }
];

function rollShop() {
  state.shopOfferings = [];
  state.relicOfferings = [];
  const levelWeights = {
    1: { 'Common': 80, 'Uncommon': 20 },
    2: { 'Common': 60, 'Uncommon': 30, 'Rare': 10 },
    3: { 'Common': 50, 'Uncommon': 30, 'Rare': 15, 'Epic': 5 },
    4: { 'Common': 40, 'Uncommon': 30, 'Rare': 15, 'Epic': 10, 'Legendary': 5 },
    5: { 'Common': 30, 'Uncommon': 30, 'Rare': 20, 'Epic': 12, 'Legendary': 8 }
  };
  const weights = levelWeights[Math.min(state.shopLevel, 5)];

  for (let i = 0; i < 3; i++) {
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
    const randBlueprint = validBeasts[Math.floor(Math.random() * validBeasts.length)];
    const randBeast = randBlueprint.factory();
    randBeast.cost = 15;
    state.shopOfferings.push(randBeast);
  }

}

function renderShop() {
  elShopItems.innerHTML = '';
  elShopActions.innerHTML = '';

  // Refresh item
  const refreshCard = document.createElement('button');
  refreshCard.className = 'shop-action-btn';
  const refreshCost = state.relics.some(r => r.id === 'golden_dice') ? 2 : 5;
  refreshCard.innerHTML = `
    <span>Refresh</span>
    <span class="gold">${refreshCost}G</span>
  `;
  refreshCard.onclick = () => {
    if (state.gold >= refreshCost) {
      state.gold -= refreshCost;
      rollShop();
      renderShop();
      updateUI();
    } else {
      showToast("Not enough gold!");
    }
  };
  elShopActions.appendChild(refreshCard);

  // Epoch item
  const epochCard = document.createElement('button');
  epochCard.className = 'shop-action-btn';
  epochCard.innerHTML = `
    <span>+10 Epochs</span>
    <span class="gold">5G</span>
  `;
  epochCard.onclick = () => {
    if (state.gold >= 5) {
      state.gold -= 5;
      state.epochs += 10;
      updateUI();
    } else {
      showToast("Not enough gold!");
    }
  };
  elShopActions.appendChild(epochCard);

  // Upgrade Shop item
  if (state.shopLevel < 5) {
    const upgCard = document.createElement('button');
    upgCard.className = 'shop-action-btn';
    upgCard.innerHTML = `
      <span>Upgrade Shop</span>
      <span class="gold">${state.upgradeCost}G</span>
    `;
    upgCard.onclick = () => {
      if (state.gold >= state.upgradeCost) {
        state.gold -= state.upgradeCost;
        state.shopLevel++;
        state.upgradeCost += 20;
        updateUI();
        renderShop();
      } else {
        showToast("Not enough gold!");
      }
    };
    elShopActions.appendChild(upgCard);
  }

  // Render Offerings
  state.shopOfferings.forEach((randBeast, idx) => {
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <div class="shop-card-info has-tooltip" data-tooltip="${getTooltipText(randBeast).replace(/"/g, '&quot;')}">
        <h3 class="rarity-${randBeast.rarity}">${randBeast.icon} ${randBeast.name} <span style="font-size:0.7em">[${randBeast.rarity}]</span></h3>
        <p>${getAbilityTitle(randBeast)}</p>
      </div>
      <button class="btn shop-buy-btn">15G</button>
    `;
    card.querySelector('button').onclick = () => {
      if (state.beasts.length >= 20) {
        showToast("Your inventory is full (20 max)!");
        return;
      }
      const oldGold = state.gold;
      state = buyBeast(state, randBeast);
      if (state.gold < oldGold) { // Success
        state.shopOfferings.splice(idx, 1);
        population = []; // Invalidate GA population
        renderBeasts();
        updateUI();
        renderShop();
      } else {
        showToast("Not enough gold!");
      }
    };
    elShopItems.appendChild(card);
  });


}

// --- GA Implementation ---

// Shuffle array
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

// Evaluate fitness with variance (average of N simulations)
function evaluateFitness(seq, sims = 10) {
  let total = 0;
  const activeSeq = seq.slice(0, getMaxSlots());
  for (let i = 0; i < sims; i++) {
    total += calculateDamage(activeSeq, bossHp, currentStance, globalStatuses, {
      gold: state.gold,
      epochs: state.totalEpochsRun,
      inventorySize: state.beasts.length,
      level: state.level
    }).totalDamage;
  }
  return total / sims;
}


function drawBumpChart() {
  const container = canvas.parentElement;
  const displayW = container.clientWidth;
  if (bestSequenceHistory.length < 1) return;

  const numEpochs = bestSequenceHistory.length;
  const ROW_HEIGHT = 20; // 20px per epoch
  const MARGIN_TOP = 15;
  const MARGIN_BOTTOM = 15;
  const MARGIN_LEFT = 0;
  const MARGIN_RIGHT = 65;

  const requiredH = Math.max(container.clientHeight, (numEpochs - 1) * ROW_HEIGHT + MARGIN_TOP + MARGIN_BOTTOM);
  canvas.style.height = `${requiredH}px`;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = displayW * dpr;
  canvas.height = requiredH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, displayW, requiredH);

  const graphW = displayW - MARGIN_LEFT - MARGIN_RIGHT;

  const colW = graphW / getMaxSlots();
  const colCenters = [];
  for (let i = 0; i < getMaxSlots(); i++) {
    colCenters.push(MARGIN_LEFT + colW * (getMaxSlots() - 1 - i) + colW / 2);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  colCenters.forEach(cx => {
    ctx.beginPath();
    ctx.moveTo(cx, MARGIN_TOP);
    ctx.lineTo(cx, requiredH - MARGIN_BOTTOM);
    ctx.stroke();
  });

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  for (let i = 0; i < numEpochs; i++) {
    const y = MARGIN_TOP + (numEpochs - 1 - i) * ROW_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(MARGIN_LEFT, y);
    ctx.lineTo(MARGIN_LEFT + graphW, y);
    ctx.stroke();
  }

  const allIds = new Set();
  bestSequenceHistory.forEach(h => h.seq.forEach(b => allIds.add(b.id)));

  const idColorMap = {};
  const idNameMap = {};
  Array.from(allIds).forEach((id) => {
    bestSequenceHistory.forEach(h => {
      const b = h.seq.find(b => b.id === id);
      if (b) {
        idNameMap[id] = b.icon;
        idColorMap[id] = b.color || '#fff';
      }
    });
  });

  Array.from(allIds).forEach(id => {
    ctx.beginPath();
    ctx.strokeStyle = idColorMap[id];
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    let started = false;

    bestSequenceHistory.forEach((h, epochIdx) => {
      const posIdx = h.seq.findIndex(b => b.id === id);
      const y = MARGIN_TOP + (numEpochs - 1 - epochIdx) * ROW_HEIGHT;

      if (posIdx !== -1) {
        const x = colCenters[posIdx];
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      } else {
        started = false;
      }
    });
    ctx.stroke();

    const latest = bestSequenceHistory[bestSequenceHistory.length - 1];
    const latestPos = latest.seq.findIndex(b => b.id === id);
    if (latestPos !== -1) {
      const dotX = colCenters[latestPos];
      const dotY = MARGIN_TOP + 0;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fillStyle = idColorMap[id];
      ctx.fill();
    }
  });

  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  for (let i = 0; i < numEpochs; i++) {
    const h = bestSequenceHistory[i];
    const y = MARGIN_TOP + (numEpochs - 1 - i) * ROW_HEIGHT;
    const isLatest = (i === numEpochs - 1);

    ctx.fillStyle = isLatest ? '#fff' : 'rgba(255,255,255,0.5)';
    ctx.fillText(`E${h.epoch}`, MARGIN_LEFT + graphW + 5, y + 3);
    ctx.fillStyle = isLatest ? 'var(--success)' : 'rgba(255,255,255,0.4)';
    ctx.fillText(`${h.score.toFixed(0)}`, MARGIN_LEFT + graphW + 35, y + 3);
  }
}

function drawConvergenceChart(history, epochsToRun) {
  if (!convCanvas || !convCtx) return;
  const w = convCanvas.width;
  const h = convCanvas.height;
  convCtx.clearRect(0, 0, w, h);

  if (history.length === 0) return;

  const dpr = window.devicePixelRatio || 1;
  convCanvas.width = convCanvas.clientWidth * dpr;
  convCanvas.height = convCanvas.clientHeight * dpr;
  convCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const drawW = convCanvas.clientWidth;
  const drawH = convCanvas.clientHeight;

  let maxScore = 1;
  let minScore = Infinity;
  history.forEach(pop => pop.scores.forEach(score => {
    if (score > maxScore) maxScore = score;
    if (score < minScore) minScore = score;
  }));
  if (minScore === Infinity) minScore = 0;
  if (maxScore === minScore) maxScore = minScore + 10;
  const scoreRange = maxScore - minScore;

  // Draw Background Grid & Labels
  convCtx.fillStyle = 'rgba(255,255,255,0.9)';
  convCtx.font = 'bold 12px JetBrains Mono, monospace';
  convCtx.textAlign = 'center';
  convCtx.fillText('POPULATION FITNESS DISTRIBUTION', drawW / 2, 16);

  convCtx.textAlign = 'left';
  convCtx.fillStyle = 'rgba(255,255,255,0.5)';
  convCtx.font = '10px JetBrains Mono, monospace';
  convCtx.fillText(`Max: ${maxScore.toFixed(0)}`, 10, 30);
  convCtx.fillText(`Min: ${minScore.toFixed(0)}`, 10, drawH - 25);

  convCtx.textAlign = 'right';
  convCtx.fillText('Epochs \u2192', drawW - 10, drawH - 10);

  // Draw Axis lines
  convCtx.strokeStyle = 'rgba(255,255,255,0.2)';
  convCtx.lineWidth = 1;
  convCtx.beginPath();
  convCtx.moveTo(40, 20);
  convCtx.lineTo(40, drawH - 20);
  convCtx.lineTo(drawW - 10, drawH - 20);
  convCtx.stroke();

  const pointRadius = 2.5;

  let lastDrawnEpoch = -100;
  let lastDrawnScore = -1;
  let lastDrawnSeqString = "";

  history.forEach((pop, epochIdx) => {
    const x = 45 + (epochIdx / Math.max(1, epochsToRun - 1)) * (drawW - 60);
    let epochMaxScore = 0;

    pop.scores.forEach(score => {
      if (score > epochMaxScore) epochMaxScore = score;
      const y = drawH - 25 - ((score - minScore) / scoreRange) * (drawH - 50);
      convCtx.beginPath();
      if (score >= maxScore - 0.1) {
        convCtx.fillStyle = '#ffaa00'; // Gold for the best sequence
        convCtx.arc(x, y, pointRadius + 1.5, 0, Math.PI * 2);
      } else {
        convCtx.fillStyle = 'rgba(0, 255, 100, 0.3)'; // Dim green for others
        convCtx.arc(x, y, pointRadius, 0, Math.PI * 2);
      }
      convCtx.fill();
    });

    const currentSeqString = pop.bestSeq.map(b => b.icon).join('');
    const isNewSequence = currentSeqString !== lastDrawnSeqString;
    const isBigJump = epochMaxScore >= lastDrawnScore * 1.15;

    if (epochIdx === 0 || (isNewSequence && isBigJump)) {
      lastDrawnEpoch = epochIdx;
      lastDrawnScore = epochMaxScore;
      lastDrawnSeqString = currentSeqString;

      convCtx.globalAlpha = 1.0;
      convCtx.fillStyle = '#ffffff'; // Force solid color so emojis aren't semi-transparent green
      convCtx.font = '12px sans-serif';
      convCtx.textAlign = 'center';
      
      const emojiStartY = drawH - 25;
      
      pop.bestSeq.forEach((beast, idx) => {
        const y = emojiStartY - (((getMaxSlots() - 1) - idx) * 14);
        convCtx.fillText(beast.icon, x, y);
      });
      
      if (elPreviousSequencesList && epochIdx === history.length - 1) {
        const row = document.createElement('div');
        row.className = 'previous-sequence-row';
        
        let slotsHtml = '';
        pop.bestSeq.forEach(b => {
          slotsHtml += `<div class="sequence-slot filled has-tooltip" data-tooltip="${getTooltipText(b).replace(/"/g, '&quot;')}">${b.icon}</div>`;
        });

        row.innerHTML = `
          <div class="previous-sequence-info">
            <span class="epoch">Epoch ${epochIdx}</span>
            <span class="dmg">Dmg: ${epochMaxScore.toFixed(0)}</span>
          </div>
          <div class="previous-sequence-slots">
            ${slotsHtml}
          </div>
        `;
        elPreviousSequencesList.prepend(row);
      }
    }
  });
}

async function executeRound() {
  if (state.beasts.length === 0) return;
  btnFight.disabled = true;
  elCombatLog.innerHTML = '';
  if (elPreviousSequencesList) elPreviousSequencesList.innerHTML = '';
  logCombat(`--- ROUND ${combatRound}/3 STARTED ---`);
  logCombat(`Boss Stance: ${currentStance}`);
  logCombat(`Boss HP: ${bossHp}`);

  let epochsToRun = state.epochs;
  if (epochsToRun > 0) {
    logCombat(`Computing ${epochsToRun} epochs...`);
    if (population.length === 0 || population[0].length !== state.beasts.length) {
      population = [];
      for (let i = 0; i < getPopSize(); i++) {
        population.push([...state.beasts]);
        shuffle(population[i]);
      }
    }

    let populationHistory = [];
    for (let gen = 0; gen < epochsToRun; gen++) {
      const scored = population.map(seq => ({ seq, score: evaluateFitness(seq, 10) }));
      scored.sort((a, b) => b.score - a.score);

      populationHistory.push({
        scores: scored.map(s => s.score),
        bestSeq: scored[0].seq.slice(0, getMaxSlots())
      });

      if (scored[0].score > bestExpectedDmg) {
        bestExpectedDmg = scored[0].score;
        bestSequence = [...scored[0].seq];
      }

      const newPop = [];
      newPop.push([...scored[0].seq]);

      const tournamentSelect = () => {
        const t = [];
        for (let i = 0; i < 3; i++) {
          t.push(scored[Math.floor(Math.random() * getPopSize())]);
        }
        t.sort((a, b) => b.score - a.score);
        return t[0].seq;
      };

      while (newPop.length < getPopSize()) {
        const p1 = tournamentSelect();
        const p2 = tournamentSelect();
        const start = Math.floor(Math.random() * p1.length);
        const end = Math.floor(Math.random() * (p1.length - start)) + start + 1;
        let child = orderCrossover(p1, p2, start, end);
        if (Math.random() < 0.4) child = mutateSwap(child); // increased mutation chance
        newPop.push(child);
      }
      population = newPop;
      state.totalEpochsRun++;

      bestSequenceHistory.push({
        epoch: state.totalEpochsRun,
        score: scored[0].score,
        seq: scored[0].seq.slice(0, getMaxSlots())
      });
      if (bestSequenceHistory.length > 500) bestSequenceHistory.shift();

      // Animate convergence
      drawConvergenceChart(populationHistory, epochsToRun);
      await new Promise(r => setTimeout(r, 20));
    }
    // Still run the invisible bump chart just in case we bring it back later
    drawBumpChart();

    renderBestSequenceUI();
  }

  const oldBeasts = new Set(bestSequence);
  const newlyBoughtBeasts = state.beasts.filter(b => !oldBeasts.has(b));
  state.beasts = [...bestSequence, ...newlyBoughtBeasts];
  renderBeasts();
  renderFightArena();
  updateUI();

  const activeSeq = bestSequence.slice(0, getMaxSlots());
  let index = 0;
  let nextBeastBuff = 0;
  let globalBeastBuff = 0;
  let beastsAttacked = 0;
  let lastDamage = 0;
  let bombTimer = -1;
  let bombDamage = 0;

  function attackStep() {
    if (index >= activeSeq.length || bossHp <= 0) {
      let dotDamage = 0;
      if (globalStatuses['POISON'] > 0) {
        let poisonMultiplier = state.relics.some(r => r.id === 'venom_gland') ? 25 : 15;
        let dmg = globalStatuses['POISON'] * poisonMultiplier;
        dotDamage += dmg;
        logCombat(`POISON deals ${dmg} damage!`, 'danger');
      }
      if (globalStatuses['FIRE'] > 0) {
        let dmg = globalStatuses['FIRE'] * 10;
        dotDamage += dmg;
        logCombat(`FIRE deals ${dmg} damage!`, 'danger');
        if (!state.relics.some(r => r.id === 'molten_core')) {
          globalStatuses['FIRE'] = Math.max(0, globalStatuses['FIRE'] - 1);
        }
      }
      if (dotDamage > 0) {
        bossHp -= dotDamage;
        updateUI();
        elArenaBoss.style.background = 'var(--danger)';
        setTimeout(() => { elArenaBoss.style.background = '#fff'; }, 150);
      }
      setTimeout(finishRound, 500);
      return;
    }

    const beast = activeSeq[index];
    let minDmg = beast.minDamage + nextBeastBuff + globalBeastBuff;
    let maxDmg = beast.maxDamage + nextBeastBuff + globalBeastBuff;
    
    if (state.relics.some(r => r.id === 'heavy_anvil')) {
      minDmg += 10;
      maxDmg += 10;
    }
    
    nextBeastBuff = 0;

    let dmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
    let isCrit = false;

    if (beast.synergy === 'COMBO_SCALER') {
      dmg = Math.floor(dmg * (1 + 0.15 * beastsAttacked));
      logCombat(`${beast.name} scales from combo!`);
    }

    if (currentStance === 'ARMORED') dmg = Math.floor(dmg / 2);

    if (Math.random() < 0.1) {
      dmg = Math.floor(dmg * 1.5);
      isCrit = true;
    }

    if (beast.synergy === 'DOUBLE_IF_POISONED' && globalStatuses['POISON'] > 0) {
      dmg *= 2; logCombat(`${beast.name} exploits POISON!`, 'crit');
    }
    if (beast.synergy === 'DOUBLE_IF_FIRE' && globalStatuses['FIRE'] > 0) {
      dmg *= 2; logCombat(`${beast.name} exploits FIRE!`, 'crit');
    }
    if (beast.synergy === 'TRIPLE_IF_SHOCK' && globalStatuses['SHOCK'] > 0) {
      dmg *= 3; logCombat(`${beast.name} exploits SHOCK!`, 'crit');
    }
    if (beast.synergy === 'CONSUME_POISON' && globalStatuses['POISON'] > 0) {
      dmg += 50; globalStatuses['POISON'] = 0; logCombat(`${beast.name} consumed POISON!`, 'crit');
    }
    if (beast.synergy === 'BUFF_NEXT_20') {
      nextBeastBuff = 20; logCombat(`${beast.name} buffs next beast!`);
    }
    if (beast.synergy === 'DOUBLE_IF_VULNERABLE' && globalStatuses['VULNERABLE'] > 0) {
      dmg *= 2; logCombat(`${beast.name} exploits VULNERABLE!`, 'crit');
    }
    if (beast.synergy === 'CONSUME_FIRE' && globalStatuses['FIRE'] > 0) {
      dmg += 60; globalStatuses['FIRE'] = 0; logCombat(`${beast.name} consumed FIRE!`, 'crit');
    }
    if (beast.synergy === 'BUFF_NEXT_40') {
      nextBeastBuff = 40; logCombat(`${beast.name} mega-buffs next beast!`);
    }
    if (beast.synergy === 'CATALYST' && globalStatuses['POISON'] > 0) {
      dmg += globalStatuses['POISON'] * 15 * 3; globalStatuses['POISON'] = 0; logCombat(`${beast.name} detonate POISON!`, 'crit');
    }
    if (beast.synergy === 'PROLIFERATE') {
      for (const [status, stacks] of Object.entries(globalStatuses)) {
        if (stacks > 0) globalStatuses[status] *= 2;
      }
      logCombat(`${beast.name} proliferated statuses!`, 'crit');
    }
    if (beast.synergy === 'EXECUTE' && bossHp <= bossMaxHp * 0.3) {
      dmg *= 4; logCombat(`${beast.name} executes!`, 'crit');
    }
    if (beast.synergy === 'CONSUME_ALL') {
      let removed = 0;
      for (const [status, stacks] of Object.entries(globalStatuses)) {
        if (stacks > 0) { removed++; globalStatuses[status] = 0; }
      }
      nextBeastBuff = removed * 50; logCombat(`${beast.name} consumed the void!`);
    }

    if (beast.synergy === 'TIME_BOMB') {
      bombTimer = 2;
      bombDamage = 150;
      logCombat(`${beast.name} planted a TIME BOMB!`, 'danger');
    }
    if (beast.synergy === 'FINISHER' && beastsAttacked === activeSeq.length - 1) {
      dmg *= 5;
      logCombat(`${beast.name} activated FINISHER!`, 'crit');
    }
    if (beast.synergy === 'PUNISHER' && lastDamage > 0 && lastDamage < 15) {
      dmg *= 3;
      logCombat(`${beast.name} PUNISHED the weak attack!`, 'crit');
    }
    if (beast.synergy === 'ECHO' && lastDamage > 0) {
      dmg += lastDamage;
      logCombat(`${beast.name} ECHOED for ${lastDamage} extra damage!`);
    }

    // Previous Complex Synergies
    if (beast.synergy === 'TRIGGER_NEXT') {
      const nextB = activeSeq[index + 1];
      if (nextB && nextB.appliesStatus) {
        globalStatuses[nextB.appliesStatus] = (globalStatuses[nextB.appliesStatus] || 0) + 1;
        logCombat(`${beast.name} triggered ${nextB.name}'s status early!`);
      }
    }
    if (beast.synergy === 'MIRROR_SYMMETRY') {
      const oppIdx = (activeSeq.length - 1) - index;
      const oppBeast = activeSeq[oppIdx];
      if (oppBeast) {
        const oppDmg = Math.floor(Math.random() * (oppBeast.maxDamage - oppBeast.minDamage + 1)) + oppBeast.minDamage;
        dmg += oppDmg;
        logCombat(`${beast.name} mirrored damage! (+${oppDmg})`);
      }
    }
    if (beast.synergy === 'MOMENTUM_LOSS') {
      dmg -= (15 * beastsAttacked);
      if (dmg < 0) dmg = 0;
      logCombat(`${beast.name} lost momentum...`);
    }
    if (beast.synergy === 'STATUS_CONVERSION') {
      let converted = 0;
      if (globalStatuses['POISON'] > 0) {
        converted += globalStatuses['POISON'];
        globalStatuses['FROSTBITE'] = (globalStatuses['FROSTBITE'] || 0) + globalStatuses['POISON'];
        globalStatuses['POISON'] = 0;
      }
      if (globalStatuses['FIRE'] > 0) {
        converted += globalStatuses['FIRE'];
        globalStatuses['SHOCK'] = (globalStatuses['SHOCK'] || 0) + globalStatuses['FIRE'];
        globalStatuses['FIRE'] = 0;
      }
      dmg += converted * 10;
      if (converted > 0) logCombat(`${beast.name} converted statuses!`);
    }
    if (beast.synergy === 'VACUUM_SCALER') {
      let cleared = 0;
      for (const [status, stacks] of Object.entries(globalStatuses)) {
        if (stacks > 0) { cleared += stacks; globalStatuses[status] = 0; }
      }
      globalBeastBuff += cleared * 5;
      if (cleared > 0) logCombat(`${beast.name} vacuumed the board!`);
    }
    if (beast.synergy === 'MISSING_HP_SCALING') {
      const missingHp = Math.max(0, bossMaxHp - bossHp);
      dmg += Math.floor(missingHp * 0.15);
    }

    // Early Game Variety
    if (beast.synergy === 'FIRST_STRIKE' && beastsAttacked === 0) {
      dmg *= 3; logCombat(`${beast.name} First Strike!`, 'crit');
    }
    if (beast.synergy === 'HIDE') {
      if (beastsAttacked === 0 || beastsAttacked === 1) {
        dmg = 0; logCombat(`${beast.name} hides in fear!`, 'danger');
      }
    }
    if (beast.synergy === 'GROWTH') {
      dmg += (2 * beastsAttacked); logCombat(`${beast.name} grows from combo!`);
    }
    if (beast.synergy === 'MINOR_BUFF') {
      nextBeastBuff += 5; logCombat(`${beast.name} cheers the next beast!`);
    }
    if (beast.synergy === 'KINDLING' && globalStatuses['FIRE'] > 0) {
      dmg *= 2; logCombat(`${beast.name} ignited kindling!`, 'crit');
    }
    if (beast.synergy === 'HIGH_ROLLER') {
      if (dmg % 2 !== 0) { dmg *= 2; logCombat(`${beast.name} rolls HIGH!`, 'crit'); }
      else { dmg = Math.floor(dmg / 2); logCombat(`${beast.name} rolls LOW!`, 'danger'); }
    }

    // Super Late Game Scalers
    if (beast.synergy === 'GOLD_SCALING') {
      dmg += (state.gold || 0); logCombat(`${beast.name} cashes in!`);
    }
    if (beast.synergy === 'EPOCH_SCALING') {
      dmg += Math.floor((state.totalEpochsRun || 0) / 50); logCombat(`${beast.name} shifts time!`);
    }
    if (beast.synergy === 'INVENTORY_SCALING') {
      dmg += ((state.beasts.length || 0) * 5); logCombat(`${beast.name} rallies the reserve!`);
    }
    if (beast.synergy === 'LEVEL_SCALING') {
      dmg += ((state.level || 0) * 10); logCombat(`${beast.name} draws blood!`);
    }
    if (beast.synergy === 'LEGENDARY_MULTIPLIER') {
      const legCount = activeSeq.filter(b => b.rarity === 'Legendary').length;
      if (legCount > 0) {
        dmg = Math.floor(dmg * Math.pow(1.5, legCount));
        logCombat(`${beast.name} forms fractal!`);
      }
    }

    if (globalStatuses['VULNERABLE'] > 0) {
      dmg = Math.floor(dmg * 1.5);
    }
    if (globalStatuses['FROSTBITE'] > 0) {
      dmg += globalStatuses['FROSTBITE'] * 5;
    }

    const isPoisonBeast = beast.appliesStatus === 'POISON' || (beast.synergy && beast.synergy.includes('POISON'));
    const isFireBeast = beast.appliesStatus === 'FIRE' || (beast.synergy && beast.synergy.includes('FIRE'));
    const isShockBeast = beast.appliesStatus === 'SHOCK' || (beast.synergy && beast.synergy.includes('SHOCK'));
    const isVulnBeast = beast.appliesStatus === 'VULNERABLE' || (beast.synergy && beast.synergy.includes('VULNERABLE'));

    if (currentStance === 'POISON_WEAKNESS' && isPoisonBeast) { dmg *= 2; logCombat(`POISON WEAKNESS EXPLOITED!`, 'crit'); }
    if (currentStance === 'FIRE_IMMUNITY' && isFireBeast) { dmg = 0; logCombat(`FIRE IMMUNITY BLOCKED DAMAGE!`, 'danger'); }
    if (currentStance === 'SHOCK_WEAKNESS' && isShockBeast) { dmg *= 2; logCombat(`SHOCK WEAKNESS EXPLOITED!`, 'crit'); }
    if (currentStance === 'VULNERABLE_WEAKNESS' && isVulnBeast) { dmg *= 2; logCombat(`VULNERABLE WEAKNESS EXPLOITED!`, 'crit'); }

    bossHp -= dmg;
    logCombat(`${beast.name} attacks for ${dmg} damage! ${isCrit ? '(CRIT!)' : ''}`);

    if (beast.appliesStatus) {
      globalStatuses[beast.appliesStatus] = (globalStatuses[beast.appliesStatus] || 0) + 1;
      logCombat(`${beast.name} applied ${beast.appliesStatus}!`);
    }

    if (bombTimer > 0) {
      bombTimer--;
      if (bombTimer === 0) {
        bossHp -= bombDamage;
        logCombat(`TIME BOMB EXPLODED for ${bombDamage} damage!`, 'crit');
      }
    }

    lastDamage = dmg;
    beastsAttacked++;

    updateUI();
    renderFightArena(index);

    elArenaBoss.style.background = 'var(--danger)';
    setTimeout(() => { elArenaBoss.style.background = '#fff'; }, 150);

    index++;
    setTimeout(attackStep, 250);
  }

  attackStep();
}

function finishRound() {
  renderFightArena(-1);
  if (bossHp <= 0) {
    logCombat("BOSS DEFEATED!", "kill");
    setTimeout(() => {
      showOverlay("Level Cleared!", "Congrats!", "win", false);
      setTimeout(() => {
        hideOverlay();
        state.level++;
        state.gold += 50 + (state.level * 10);
        bossMaxHp = Math.floor(60 * Math.pow(1.4, state.level - 1));
        bossHp = bossMaxHp;
        combatRound = 1;
        currentStance = BOSS_STANCES[Math.floor(Math.random() * BOSS_STANCES.length)];
        globalStatuses = {};
        bestSequenceHistory = [];
        population = [];
        bestExpectedDmg = 0;
        rollShop();
        renderShop();
        updateUI();
        
        if ((state.level - 1) % 3 === 0) {
          triggerRelicMilestone();
        } else {
          btnFight.disabled = false;
        }
      }, 500);
    }, 1000);
  } else {
    combatRound++;
    if (combatRound > 3) {
      logCombat("YOU FAILED TO KILL THE BOSS IN 3 ROUNDS.", "danger");
      const dnaEarned = state.level * 10;
      metaState.dna += dnaEarned;
      saveMetaState();
      setTimeout(() => {
        showOverlay("Game Over", `The Boss survived. You earned ${dnaEarned} DNA!`, "loss", true);
      }, 1000);
    } else {
      currentStance = BOSS_STANCES[Math.floor(Math.random() * BOSS_STANCES.length)];
      logCombat(`--- PREPARING ROUND ${combatRound} ---`, 'crit');
      logCombat(`Boss shifts to: ${currentStance}`);
      bestExpectedDmg = 0; // Reset so GA evaluates properly against new stance!
      btnFight.disabled = false;
      updateUI();
    }
  }
}
function resetRun() {
  hideOverlay();
  state = {
    level: 1,
    gold: 20 + ((metaState.skillTree.startingGold || 0) * 20),
    epochs: 0,
    totalEpochsRun: 0,
    shopLevel: 1,
    upgradeCost: 20,
    shopOfferings: [],
    relicOfferings: [],
    relics: [],
    beasts: [
      makeBeast('Vanguard', 10, 15, null, 'FIRST_STRIKE', 'Uncommon', '🛡️', '#78716c'),
      makeBeast('Coward', 15, 15, null, 'HIDE', 'Common', '🙈', '#d6d3d1'),
      makeBeast('Scout', 4, 8, null, 'GROWTH', 'Common', '🦅', '#93c5fd'),
      makeBeast('Cheerleader', 1, 5, null, 'BUFF_NEXT_20', 'Common', '📣', '#f472b6')
    ]
  };
  bossMaxHp = 60;
  bossHp = 60;
  combatRound = 1;
  currentStance = BOSS_STANCES[Math.floor(Math.random() * BOSS_STANCES.length)];
  globalStatuses = {};
  bestExpectedDmg = 0;
  population = [];
  bestSequenceHistory = [];
  
  elCombatLog.innerHTML = '';
  if (elPreviousSequencesList) elPreviousSequencesList.innerHTML = '';
  
  bestSequence = [...state.beasts];
  
  rollShop();
  renderBeasts();
  renderShop();
  renderFightArena();
  renderBestSequenceUI();
  updateUI();
  btnFight.disabled = false;
}

function triggerRelicMilestone() {
  elRelicOptions.innerHTML = '';
  
  // Pick 3 random unique relics
  const availableRelics = relicPool.filter(r => !state.relics.some(owned => owned.id === r.id));
  shuffle(availableRelics);
  const options = availableRelics.slice(0, 3);
  
  // Rule: Ensure at least one relic costs less than the level reward if level <= 20
  const levelReward = 50 + ((state.level - 1) * 10);
  if (state.level <= 20 && !options.some(r => r.cost <= levelReward)) {
    const cheapRelics = availableRelics.filter(r => r.cost <= levelReward);
    if (cheapRelics.length > 0) {
      options[0] = cheapRelics[0]; // Force a cheap relic into slot 1
    }
  }
  
  options.forEach(relic => {
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.style.width = '200px';
    card.style.flex = 'none';
    card.style.background = '#1e293b';
    card.style.color = '#fff';
    card.innerHTML = `
      <div style="font-size: 3rem; margin-bottom: 10px;">${relic.icon}</div>
      <h3 style="color: #fcd34d; margin: 0 0 5px 0;">${relic.name}</h3>
      <p style="font-size: 0.85rem; color: #cbd5e1; margin: 0 0 15px 0; min-height: 40px;">${relic.desc}</p>
      <button class="btn primary" style="width: 100%;">Buy: ${relic.cost}G</button>
    `;
    const btn = card.querySelector('button');
    if (state.gold < relic.cost) {
      btn.disabled = true;
      btn.textContent = `Too Expensive (${relic.cost}G)`;
    }
    btn.onclick = () => {
      if (state.gold >= relic.cost) {
        state.gold -= relic.cost;
        state.relics.push(relic);
        updateUI();
        elRelicChoiceOverlay.classList.add('hidden');
        btnFight.disabled = false;
        showToast(`Acquired ${relic.name}!`);
      }
    };
    elRelicOptions.appendChild(card);
  });
  
  elRelicChoiceOverlay.classList.remove('hidden');
}

function updateLabUI() {
  if (elLabDna) elLabDna.textContent = metaState.dna;
  
  const sRank = metaState.skillTree.extraSlots || 0;
  labNodes.slots.rank.textContent = sRank;
  if (sRank < 4) {
    labNodes.slots.cost.textContent = labCosts.slots[sRank];
    labNodes.slots.btn.disabled = metaState.dna < labCosts.slots[sRank];
    labNodes.slots.btn.textContent = `Upgrade (Cost: ${labCosts.slots[sRank]})`;
  } else {
    labNodes.slots.btn.disabled = true;
    labNodes.slots.btn.textContent = 'MAXED';
  }

  const gRank = metaState.skillTree.startingGold || 0;
  labNodes.gold.rank.textContent = gRank;
  if (gRank < 5) {
    labNodes.gold.cost.textContent = labCosts.gold[gRank];
    labNodes.gold.btn.disabled = metaState.dna < labCosts.gold[gRank];
    labNodes.gold.btn.textContent = `Upgrade (Cost: ${labCosts.gold[gRank]})`;
  } else {
    labNodes.gold.btn.disabled = true;
    labNodes.gold.btn.textContent = 'MAXED';
  }

  const pRank = metaState.skillTree.popSize || 0;
  labNodes.pop.rank.textContent = pRank;
  if (pRank < 6) {
    labNodes.pop.cost.textContent = labCosts.pop[pRank];
    labNodes.pop.btn.disabled = metaState.dna < labCosts.pop[pRank];
    labNodes.pop.btn.textContent = `Upgrade (Cost: ${labCosts.pop[pRank]})`;
  } else {
    labNodes.pop.btn.disabled = true;
    labNodes.pop.btn.textContent = 'MAXED';
  }
}

function buyUpgrade(type) {
  let rank = metaState.skillTree[type] || 0;
  const max = type === 'extraSlots' ? 4 : (type === 'startingGold' ? 5 : 6);
  const costs = type === 'extraSlots' ? labCosts.slots : (type === 'startingGold' ? labCosts.gold : labCosts.pop);
  
  if (rank < max && metaState.dna >= costs[rank]) {
    metaState.dna -= costs[rank];
    metaState.skillTree[type] = rank + 1;
    saveMetaState();
    updateLabUI();
    updateUI(); // Update header DNA
  }
}


// Listeners
if (btnSkipRelic) btnSkipRelic.addEventListener('click', () => {
  elRelicChoiceOverlay.classList.add('hidden');
  btnFight.disabled = false;
});

if (btnRestart) btnRestart.addEventListener('click', resetRun);

if (btnOpenLab) btnOpenLab.addEventListener('click', () => {
  updateLabUI();
  elLabOverlay.classList.remove('hidden');
});
if (btnCloseLab) btnCloseLab.addEventListener('click', () => {
  elLabOverlay.classList.add('hidden');
});

if (labNodes.slots.btn) labNodes.slots.btn.addEventListener('click', () => buyUpgrade('extraSlots'));
if (labNodes.gold.btn) labNodes.gold.btn.addEventListener('click', () => buyUpgrade('startingGold'));
if (labNodes.pop.btn) labNodes.pop.btn.addEventListener('click', () => buyUpgrade('popSize'));

btnFight.addEventListener('click', executeRound);

document.body.addEventListener('mouseover', (e) => {
  const target = e.target.closest('.has-tooltip');
  if (target) {
    const text = target.getAttribute('data-tooltip');
    if (text) {
      elGlobalTooltip.innerHTML = text.replace(/\n/g, '<br>');
      elGlobalTooltip.classList.remove('hidden');
      
      const rect = target.getBoundingClientRect();
      const tooltipRect = elGlobalTooltip.getBoundingClientRect();
      
      let x = rect.left + rect.width / 2 - tooltipRect.width / 2;
      let y = rect.bottom + 10;
      
      if (x < 10) x = 10;
      if (x + tooltipRect.width > window.innerWidth - 10) {
        x = window.innerWidth - tooltipRect.width - 10;
      }
      if (y + tooltipRect.height > window.innerHeight - 10) {
        y = rect.top - tooltipRect.height - 10;
      }
      
      elGlobalTooltip.style.left = `${x}px`;
      elGlobalTooltip.style.top = `${y}px`;
    }
  }
});

document.body.addEventListener('mouseout', (e) => {
  const target = e.target.closest('.has-tooltip');
  if (target) {
    if (!target.contains(e.relatedTarget)) {
      elGlobalTooltip.classList.add('hidden');
    }
  }
});

init();
