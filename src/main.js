import { createBeast, calculateDamage } from './combat.js';
import { orderCrossover, mutateSwap } from './ga.js';
import { buyBeast, buyEpochs } from './economy.js';
import { getSkillEffect, SKILL_TREE_DATA } from './skilltree.js';
import { initSkillTree } from './skilltree-renderer.js';

function makeBeast(name, min, max, stat, syn, rarity, icon, color, image = null) {
  if (!image) {
    const slug = name.toLowerCase().replace(/ /g, '_');
    image = 'assets/beasts/beast_' + slug + '.jpeg';
  }
  const b = createBeast(name, min, max, stat, syn);
  b.rarity = rarity;
  b.icon = icon;
  b.color = color || '#a1a1aa';
  b.image = image;
  b.id = Math.random().toString(36).substr(2, 9);
  return b;
}

// --- Meta Progression State ---
let metaState = JSON.parse(localStorage.getItem('antigravity_meta')) || { dna: 0, skillTree: {} };
if (!metaState.skillTree) metaState.skillTree = {};
if (!metaState.settings) metaState.settings = { autoPlayTurns: false };

function saveMetaState() {
  localStorage.setItem('antigravity_meta', JSON.stringify(metaState));
}

function getPopSize() { return 12 + (getSkillEffect('gen_pop1', metaState) * 2) + (getSkillEffect('gen_pop2', metaState) * 4); }
function getMaxSlots() { return Math.min(8, 4 + getSkillEffect('gen_slots1', metaState) + getSkillEffect('gen_slots2', metaState) + getSkillEffect('gen_slots3', metaState) + getSkillEffect('gen_slots4', metaState)); }


// --- Game Run State ---
let state = {
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
    makeBeast('Vanguard', 10, 15, null, 'FIRST_STRIKE', 'Uncommon', '🛡️', '#78716c', 'assets/beasts/vanguard.png'),
    makeBeast('Coward', 15, 15, null, 'HIDE', 'Common', '🙈', '#d6d3d1', 'assets/beasts/coward.png'),
    makeBeast('Scout', 4, 8, null, 'GROWTH', 'Common', '🦅', '#93c5fd', 'assets/beasts/scout.png'),
    makeBeast('Cheerleader', 1, 5, null, 'BUFF_NEXT_20', 'Common', '📣', '#f472b6', 'assets/beasts/cheerleader.png')
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

// --- Run State Persistence ---
function saveRunState() {
  const runState = {
    state,
    bossHp,
    bossMaxHp,
    combatRound,
    currentStance,
    globalStatuses,
    bestSequence,
    bestExpectedDmg
  };
  localStorage.setItem('antigravity_run', JSON.stringify(runState));
}

function loadRunState() {
  const saved = localStorage.getItem('antigravity_run');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state = parsed.state;
      window.__activeTemporarySkill = state.temporarySkill;
      bossHp = parsed.bossHp;
      bossMaxHp = parsed.bossMaxHp;
      combatRound = parsed.combatRound;
      currentStance = parsed.currentStance;
      globalStatuses = parsed.globalStatuses || {};
      bestSequence = parsed.bestSequence || [];
      bestExpectedDmg = parsed.bestExpectedDmg || 0;

      const fixImagePath = (imgUrl) => {
        if (!imgUrl) return imgUrl;
        if (imgUrl.includes('/beasts/') && !imgUrl.endsWith('.jpeg')) {
          const file = imgUrl.split('/').pop();
          const slug = file.replace('beast_', '').replace('.png', '').replace('.jpeg', '');
          return `assets/beasts/beast_${slug}.jpeg`;
        }
        if (imgUrl.includes('/relics/') && !imgUrl.endsWith('.jpeg')) {
          return imgUrl.replace('.png', '.jpeg');
        }
        return imgUrl;
      };

      if (state.beasts) state.beasts.forEach(b => { b.image = fixImagePath(b.image); });
      if (state.shopOfferings) state.shopOfferings.forEach(b => { b.image = fixImagePath(b.image); });
      if (state.relics) state.relics.forEach(r => { r.image = fixImagePath(r.image); });
      if (state.relicOfferings) state.relicOfferings.forEach(r => { r.image = fixImagePath(r.image); });
      if (bestSequence) bestSequence.forEach(b => { b.image = fixImagePath(b.image); });

      return true;
    } catch (e) {
      console.error("Failed to load run state", e);
      return false;
    }
  }
  return false;
}

function clearRunState() {
  localStorage.removeItem('antigravity_run');
}

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

const canvas = document.getElementById('bump-chart');
const ctx = canvas.getContext('2d');
const convCanvas = document.getElementById('convergence-chart');
const convCtx = convCanvas ? convCanvas.getContext('2d') : null;

let skillTreeRenderer;

// --- GA State ---
let population = [];
let bestSequenceHistory = [];
let preservedBeast = null;
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
const imageCache = {};
function preloadImages() {
  shopPool.forEach(p => {
    const b = p.factory();
    if (b.image && !imageCache[b.image]) {
      const img = new Image();
      img.src = b.image;
      imageCache[b.image] = img;
    }
  });

  // Initialize the new tech tree renderer
  setTimeout(() => {
    skillTreeRenderer = initSkillTree(metaState, saveMetaState, () => {
      updateUI();
    });
  }, 100);

  updateUI();
  renderBeasts();
  renderShop();
}

let lastGoldAnim = -1;
let lastDnaAnim = -1;

function init() {
  preloadImages();
  if (loadRunState()) {
    // Loaded an active run! Initialize UI with loaded state.
    setTimeout(() => {
      skillTreeRenderer = initSkillTree(metaState, saveMetaState, () => {
        updateUI();
      });
    }, 100);

    elCombatLog.innerHTML = '';
    if (elPreviousSequencesList) elPreviousSequencesList.innerHTML = '';
    
    renderBeasts();
    renderShop();
    renderFightArena();
    renderBestSequenceUI();
    updateUI();
    btnFight.disabled = false;
    showToast("Run State Resumed!");
  } else {
    resetRun();
  }
}

function renderBestSequenceUI() {
  if (!elBestSequenceDisplay) return;
  elBestSequenceDisplay.innerHTML = '';
  const activeSeq = bestSequence.slice(0, getMaxSlots());
  
  for (let i = 0; i < getMaxSlots(); i++) {
    const slot = document.createElement('div');
    if (i < activeSeq.length) {
      const b = activeSeq[i];
      if (b.image) {
        slot.innerHTML = `<img src="${b.image}" class="beast-sprite-small" />`;
      } else {
        slot.textContent = b.icon;
      }
      slot.className = 'sequence-slot filled has-tooltip';
      slot.setAttribute('data-tooltip', getTooltipText(b));
    } else {
      slot.textContent = i + 1;
      slot.className = 'sequence-slot empty';
    }
    elBestSequenceDisplay.appendChild(slot);
  }
  renderHistoricOrders();
}

function renderHistoricOrders() {
  const container = document.getElementById('historic-orders-list');
  if (!container) return;
  container.innerHTML = '';
  
  if (!state.runHistory || state.runHistory.length === 0) {
    container.innerHTML = '<div style="font-size: 0.8rem; color: #666; text-align: center;">No previous turns yet.</div>';
    return;
  }
  
  let allTurns = [];
  state.runHistory.forEach(lvl => {
    lvl.turns.forEach(t => {
      allTurns.push({ level: lvl.level, ...t });
    });
  });
  
  const last3 = allTurns.slice(-3).reverse();
  
  last3.forEach(turn => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.background = '#0f0f0f';
    row.style.padding = '6px';
    row.style.borderRadius = '4px';
    row.style.borderLeft = '2px solid var(--accent)';
    
    let seqHtml = '';
    turn.seq.forEach(b => {
      if (b.image) {
        seqHtml += `<div class="sequence-slot filled" style="width: 20px; height: 20px; min-width: 20px; margin-right: 2px;"><img src="${b.image}" class="beast-sprite-small" style="width: 100%; height: 100%; margin: 0; display: block;"/></div>`;
      } else {
        seqHtml += `<div class="sequence-slot filled" style="width: 20px; height: 20px; min-width: 20px; margin-right: 2px; font-size: 0.6rem; display: flex; align-items: center; justify-content: center;">${b.icon}</div>`;
      }
    });
    
    row.innerHTML = `
      <div style="font-size: 0.75rem; color: #ccc; font-family: monospace; line-height: 1.1; width: 40px;">
        L${turn.level}<br/>
        <span style="color: var(--gold)">T${turn.round}</span>
      </div>
      <div style="display: flex; flex-direction: row-reverse;">
        ${seqHtml}
      </div>
      <div style="font-size: 0.8rem; font-weight: bold; color: var(--accent); width: 45px; text-align: right;">
        ${Math.floor(turn.expectedDmg)}
      </div>
    `;
    container.appendChild(row);
  });
}

// --- UI Updates ---
function updateUI() {
  if (elDna) {
    if (lastDnaAnim !== metaState.dna && lastDnaAnim !== -1 && metaState.dna > lastDnaAnim) {
      elDna.parentElement.classList.remove('pulse-scale');
      void elDna.parentElement.offsetWidth;
      elDna.parentElement.classList.add('pulse-scale');
    }
    elDna.textContent = metaState.dna;
    lastDnaAnim = metaState.dna;
  }
  elLevel.textContent = state.level;
  
  if (lastGoldAnim !== state.gold && lastGoldAnim !== -1 && state.gold > lastGoldAnim) {
    elGold.parentElement.classList.remove('pulse-scale');
    void elGold.parentElement.offsetWidth;
    elGold.parentElement.classList.add('pulse-scale');
  }
  elGold.textContent = state.gold;
  lastGoldAnim = state.gold;
  
  elEpochs.textContent = state.epochs;
  elBestDmg.textContent = bestExpectedDmg.toFixed(1);
  if (document.getElementById('boss-hp-display')) document.getElementById('boss-hp-display').textContent = bossHp;
  if (document.getElementById('boss-hp-max')) document.getElementById('boss-hp-max').textContent = bossMaxHp;
  if (document.getElementById('boss-hp-bar')) document.getElementById('boss-hp-bar').style.width = `${Math.max(0, (bossHp / bossMaxHp) * 100)}%`;

  // Render Run Relics
  if (elRelicSlots) {
    elRelicSlots.innerHTML = '';
    state.relics.forEach(r => {
      const rdiv = document.createElement('div');
      rdiv.className = 'relic-slot has-tooltip';
      if (r.image) {
        rdiv.innerHTML = `<img src="${r.image}" class="beast-sprite-small" />`;
      } else {
        rdiv.textContent = r.icon;
      }
      rdiv.setAttribute('data-tooltip', r.desc);
      elRelicSlots.appendChild(rdiv);
    });
  }

  if (elBossStance) {
    const displayStance = currentStance === 'NONE' ? 'None' : currentStance.replace(/_/g, ' ').toLowerCase();
    elBossStance.textContent = `Stance: ${displayStance}`;
    elBossStance.classList.add('has-tooltip');
    
    let tooltipText = 'No active effects.';
    if (currentStance === 'ARMORED') tooltipText = state.relics.some(r => r.id === 'armor_piercing_rounds') ? 'Boss takes 30% reduced damage.' : 'Boss takes 50% reduced damage.';
    if (currentStance === 'FIRE_IMMUNITY') tooltipText = state.relics.some(r => r.id === 'fireproof_vest') ? 'FIRE beasts deal 50% damage.' : 'FIRE beasts deal 0 damage.';
    if (currentStance === 'POISON_WEAKNESS') tooltipText = 'POISON beasts deal double damage.';
    if (currentStance === 'SHOCK_WEAKNESS') tooltipText = 'SHOCK beasts deal double damage.';
    if (currentStance === 'VULNERABLE_WEAKNESS') tooltipText = 'VULNERABLE beasts deal double damage.';
    
    elBossStance.setAttribute('data-tooltip', tooltipText);
    elBossStance.style.display = 'block';
  }
  if (btnFight) {
    if (combatRound <= 3 && bossHp > 0) {
      btnFight.textContent = `COMPUTE & EXECUTE ROUND ${combatRound}/3`;
    }
  }
}

function getTooltipText(b) {
  let text = `Damage: ${b.minDamage}-${b.maxDamage}\n`;
  if (b.appliesStatus) text += `Applies: ${b.appliesStatus.replace(/_/g, ' ')}\n`;
  if (b.synergy) {
    text += `Synergy: ${b.synergy.replace(/_/g, ' ')}\n`;
    if (b.synergy === 'TIME_BOMB') text += `Detonates after 2 attacks for 150 dmg.`;
    else if (b.synergy === 'FINISHER') text += `Deals 5x damage if placed in the last slot.`;
    else if (b.synergy === 'PUNISHER') text += `Deals 3x damage if previous beast dealt < 15 dmg.`;
    else if (b.synergy === 'ECHO') text += `Deals extra damage equal to previous beast's damage.`;
    else if (b.synergy === 'COMBO_SCALER') text += `+20% damage per beast that attacked before it.`;
    else if (b.synergy === 'BUFF_NEXT_20') text += `Adds +20 base damage to the next beast.`;
    else if (b.synergy === 'BUFF_NEXT_40') text += `Adds +40 base damage to the next beast.`;
    else if (b.synergy === 'CONSUME_ALL') text += `Removes all status effects, gains +50 damage per removed.`;
    else if (b.synergy === 'SHATTER') text += `Deals 3x damage to FROSTBITTEN bosses, but removes FROSTBITE.`;
    else if (b.synergy === 'PIERCING') text += `Ignores the damage reduction of the ARMORED boss stance.`;
    else if (b.synergy === 'DROWN') text += `Deals 5x damage if the Boss has both FROSTBITE and VULNERABLE.`;
    else if (b.synergy === 'OVERCHARGE') text += `Deals 10x damage if the Boss has EXACTLY 3 stacks of SHOCK. Otherwise, deals 1 damage.`;
    else if (b.synergy === 'REVERBERATE') text += `Copies the sum of the damage dealt by the last TWO beasts.`;
    else if (b.synergy === 'RHYTHM') text += `Deals 3x damage if placed in an EVEN numbered slot (Slot 2, 4, 6, 8).`;
    else if (b.synergy === 'BLOOD_PRICE') text += `Forces the next beast in the sequence to deal 0 damage.`;
    else if (b.synergy === 'OMNI_STRIKE') text += `Applies 1 stack of Poison, Fire, Shock, Vulnerable, and Frostbite.`;
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
    else if (b.synergy === 'EPOCH_SCALING') text += `Deals +1 damage for every 5 GA Epochs run.`;
    else if (b.synergy === 'INVENTORY_SCALING') text += `Deals +5 damage for every beast in your inventory.`;
    else if (b.synergy === 'LEVEL_SCALING') text += `Deals +10 damage for every Level cleared.`;
    else if (b.synergy === 'LEGENDARY_MULTIPLIER') text += `Damage is multiplied by 1.8x for every Legendary on the board.`;
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
      'LEGENDARY_MULTIPLIER': 'Fractal Resonance 💠',
      'SHATTER': 'Ice Breaker 🧊',
      'PIERCING': 'Armor Piercing 🎯',
      'DROWN': 'Abyssal Drown 🌊',
      'OVERCHARGE': 'Overcharge 🔋',
      'REVERBERATE': 'Reverberate 🔊',
      'RHYTHM': 'Dance Rhythm 💃',
      'BLOOD_PRICE': 'Blood Price 🩸',
      'OMNI_STRIKE': 'Omni Strike ☄️'
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

  const invHeader = document.getElementById('inventory-header');
  if (invHeader) {
    invHeader.textContent = `Your Inventory (${state.beasts.length} / 40)`;
  }
  
  elBeastSlots.innerHTML = '';
  state.beasts.forEach((b, idx) => {
    const div = document.createElement('div');
    div.className = `beast-item beast-item-${b.rarity}`;
    const sellPrice = 5 + (getSkillEffect('eco_sell', metaState) * 3);
    div.innerHTML = `
      <div class="beast-header">
        <div class="beast-info has-tooltip" data-tooltip="${getTooltipText(b).replace(/"/g, '&quot;')}">
          <div class="beast-name rarity-${b.rarity}">${b.image ? `<img src="${b.image}" class="beast-sprite-small" />` : b.icon} ${b.name}</div>
          <div class="beast-stats">${getAbilityTitle(b)}</div>
        </div>
        <button class="btn-sell" title="Sell Beast">Sell (${sellPrice}G)</button>
      </div>
    `;

    div.querySelector('.btn-sell').onclick = () => {
      if (btnFight.disabled && bossHp > 0) return; // Prevent selling during computing/fighting
      let finalSellPrice = sellPrice;
      if (state.relics.some(r => r.id === 'recycling_bin') && b.cost) finalSellPrice = b.cost;
      state.beasts.splice(idx, 1);
      state.gold += finalSellPrice;
      if (state.relics.some(r => r.id === 'supercomputer_cooling')) state.epochs += 1;
      population = []; // Invalidate GA population
      updateUI();
      renderBeasts();
      if (!btnFight.disabled) {
        bestSequence = [...state.beasts];
        renderFightArena();
      }
      saveRunState();
    };

    elBeastSlots.appendChild(div);
  });
}

function renderFightArena(activeIndex = -1) {
  elArenaLeft.innerHTML = '';
  const activeSeq = bestSequence.slice(0, getMaxSlots());
  activeSeq.forEach((b, idx) => {
    const div = document.createElement('div');
    div.className = 'beast-icon has-tooltip';
    div.setAttribute('data-tooltip', `<b>${b.name}</b>\n${getTooltipText(b).replace(/"/g, '&quot;')}`);
    if (idx === activeIndex) div.classList.add('active');
    if (b.image) {
      div.innerHTML = `<img src="${b.image}" class="beast-sprite-arena" />`;
    } else {
      div.textContent = b.icon;
    }
    elArenaLeft.appendChild(div);
  });
}

function logCombat(msg, type = 'normal', breakdownHtml = null) {
  const div = document.createElement('div');
  div.className = `log-entry ${type}`;
  div.innerHTML = msg; // allow icons in text
  
  if (breakdownHtml) {
    div.classList.add('has-combat-tooltip');
    const tooltip = document.createElement('div');
    tooltip.className = 'combat-tooltip';
    tooltip.innerHTML = breakdownHtml;
    div.appendChild(tooltip);
  }
  
  elCombatLog.appendChild(div);
  elCombatLog.scrollTop = elCombatLog.scrollHeight;
}

function showFloatingText(text, type = 'normal') {
  const arena = document.getElementById('arena-boss');
  if (!arena) return;
  const floatDiv = document.createElement('div');
  floatDiv.className = `floating-dmg ${type}`;
  floatDiv.textContent = text;
  
  // Randomize start position slightly
  const offsetX = (Math.random() - 0.5) * 60;
  const offsetY = (Math.random() - 0.5) * 30;
  floatDiv.style.left = `calc(50% + ${offsetX}px)`;
  floatDiv.style.top = `calc(50% + ${offsetY}px)`;
  floatDiv.style.transform = 'translate(-50%, -50%)';
  
  arena.parentElement.appendChild(floatDiv);
  setTimeout(() => {
    if (floatDiv.parentElement) floatDiv.parentElement.removeChild(floatDiv);
  }, 1200);
}

// --- Shop Logic ---
const shopPool = [
  { factory: () => makeBeast('Coward', 15, 15, null, 'HIDE', 'Common', '🙈', '#d6d3d1', 'assets/beasts/coward.png'), rarity: 'Common' },
  { factory: () => makeBeast('Scout', 4, 8, null, 'GROWTH', 'Common', '🦅', '#93c5fd', 'assets/beasts/scout.png'), rarity: 'Common' },
  { factory: () => makeBeast('Cheerleader', 2, 4, null, 'MINOR_BUFF', 'Common', '📣', '#fca5a5', 'assets/beasts/cheerleader.png'), rarity: 'Common' },
  { factory: () => makeBeast('Static Slime', 4, 8, 'SHOCK', null, 'Common', '💧', '#fbbf24', 'assets/beasts/static_slime.png'), rarity: 'Common' },
  { factory: () => makeBeast('Bomber', 5, 10, null, 'TIME_BOMB', 'Rare', '💣', '#ef4444', 'assets/beasts/bomber.png'), rarity: 'Rare' },
  { factory: () => makeBeast('Blood Mage', 5, 15, null, 'MISSING_HP_SCALING', 'Epic', '🩸', '#991b1b', 'assets/beasts/blood_mage.png'), rarity: 'Epic' },
  { factory: () => makeBeast('Conductor', 10, 20, null, 'TRIGGER_NEXT', 'Epic', '🎼', '#fbcfe8', 'assets/beasts/conductor.png'), rarity: 'Epic' },
  { factory: () => makeBeast('Doppelganger', 5, 10, null, 'MIRROR_SYMMETRY', 'Rare', '👥', '#a78bfa', 'assets/beasts/doppelganger.png'), rarity: 'Rare' },
  { factory: () => makeBeast('Leech', 5, 10, 'VULNERABLE', null, 'Uncommon', '🦟', '#c084fc', 'assets/beasts/leech.png'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Cleric', 2, 5, null, 'BUFF_NEXT_20', 'Uncommon', '🧙', '#fde047', 'assets/beasts/cleric.png'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Venomous', 5, 10, 'POISON', null, 'Uncommon', '🐍', '#4ade80', 'assets/beasts/venomous.png'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Frost Weaver', 4, 8, 'FROSTBITE', null, 'Uncommon', '🕸️', '#38bdf8'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Bat', 5, 12, null, 'ECHO', 'Uncommon', '🦇', '#a855f7', 'assets/beasts/bat.png'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Vanguard', 10, 15, null, 'FIRST_STRIKE', 'Uncommon', '🛡️', '#78716c', 'assets/beasts/vanguard.png'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Firefly', 5, 8, 'FIRE', 'KINDLING', 'Uncommon', '🪲', '#f97316', 'assets/beasts/firefly.png'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Gambler', 1, 25, null, 'HIGH_ROLLER', 'Uncommon', '🎲', '#fef08a', 'assets/beasts/gambler.png'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Taskmaster', 5, 10, null, 'PUNISHER', 'Uncommon', '💢', '#b45309'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Sniper', 8, 12, null, 'PIERCING', 'Uncommon', '🎯', '#166534'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Dancer', 5, 10, null, 'RHYTHM', 'Uncommon', '💃', '#f43f5e'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Fire Element', 10, 15, 'FIRE', null, 'Rare', '🔥', '#ef4444', 'assets/beasts/fire_element.png'), rarity: 'Rare' },
  { factory: () => makeBeast('Ice Element', 10, 15, 'FROSTBITE', null, 'Rare', '❄️', '#38bdf8', 'assets/beasts/ice_element.png'), rarity: 'Rare' },
  { factory: () => makeBeast('Electric Eel', 10, 15, 'SHOCK', null, 'Rare', '⚡', '#fbbf24', 'assets/beasts/electric_eel.png'), rarity: 'Rare' },
  { factory: () => makeBeast('Fatigue Giant', 60, 80, null, 'MOMENTUM_LOSS', 'Rare', '🥱', '#d6d3d1', 'assets/beasts/fatigue_giant.png'), rarity: 'Rare' },
  { factory: () => makeBeast('Blademaster', 10, 15, null, 'COMBO_SCALER', 'Rare', '⚔️', '#52525b', 'assets/beasts/blademaster.png'), rarity: 'Rare' },
  { factory: () => makeBeast('Assassin', 5, 25, null, 'FINISHER', 'Rare', '🥷', '#52525b', 'assets/beasts/assassin.png'), rarity: 'Rare' },
  { factory: () => makeBeast('Glacier Golem', 10, 15, null, 'SHATTER', 'Rare', '🧊', '#bae6fd'), rarity: 'Rare' },
  { factory: () => makeBeast('Blood Priest', 150, 200, null, 'BLOOD_PRICE', 'Rare', '🩸', '#991b1b'), rarity: 'Rare' },
  { factory: () => makeBeast('Steam Roller', 15, 20, null, 'CONSUME_FIRE', 'Epic', '🚂', '#a1a1aa', 'assets/beasts/steam_roller.png'), rarity: 'Epic' },
  { factory: () => makeBeast('Thunderbird', 15, 25, null, 'TRIPLE_IF_SHOCK', 'Epic', '🦅', '#fcd34d', 'assets/beasts/thunderbird.png'), rarity: 'Epic' },
  { factory: () => makeBeast('Dragon', 20, 35, 'FIRE', 'DOUBLE_IF_FIRE', 'Epic', '🐲', '#dc2626', 'assets/beasts/dragon.png'), rarity: 'Epic' },
  { factory: () => makeBeast('Paladin', 10, 15, null, 'BUFF_NEXT_40', 'Epic', '🛡️', '#fef08a', 'assets/beasts/paladin.png'), rarity: 'Epic' },
  { factory: () => makeBeast('Plague Doctor', 5, 10, 'POISON', 'PROLIFERATE', 'Epic', '🐦‍⬛', '#16a34a', 'assets/beasts/plague_doctor.png'), rarity: 'Epic' },
  { factory: () => makeBeast('Prism Slime', 10, 15, null, 'STATUS_CONVERSION', 'Epic', '🌈', '#f472b6', 'assets/beasts/prism_slime.png'), rarity: 'Epic' },
  { factory: () => makeBeast('Gold Hoarder', 5, 15, null, 'GOLD_SCALING', 'Epic', '💰', '#eab308', 'assets/beasts/gold_hoarder.png'), rarity: 'Epic' },
  { factory: () => makeBeast('The Collector', 5, 10, null, 'INVENTORY_SCALING', 'Epic', '🐝', '#65a30d'), rarity: 'Epic' },
  { factory: () => makeBeast('Executioner', 15, 25, null, 'EXECUTE', 'Epic', '🪓', '#991b1b'), rarity: 'Epic' },
  { factory: () => makeBeast('Void Terror', 15, 20, null, 'CONSUME_ALL', 'Epic', '🌌', '#581c87'), rarity: 'Epic' },
  { factory: () => makeBeast('Tesla Coil', 10, 20, null, 'OVERCHARGE', 'Epic', '🔋', '#0284c7'), rarity: 'Epic' },
  { factory: () => makeBeast('Siren', 10, 15, null, 'REVERBERATE', 'Epic', '🧜‍♀️', '#0ea5e9'), rarity: 'Epic' },
  { factory: () => makeBeast('Gargoyle', 20, 30, null, 'CONSUME_POISON', 'Legendary', '🗿', '#57534e'), rarity: 'Legendary' },
  { factory: () => makeBeast('Reaper', 5, 15, null, 'CATALYST', 'Legendary', '💀', '#000000'), rarity: 'Legendary' },
  { factory: () => makeBeast('Chimera', 15, 25, 'POISON', 'TRIPLE_IF_SHOCK', 'Legendary', '🦁', '#eab308'), rarity: 'Legendary' },
  { factory: () => makeBeast('Leviathan', 25, 40, 'VULNERABLE', 'DOUBLE_IF_VULNERABLE', 'Legendary', '🐋', '#0284c7'), rarity: 'Legendary' },
  { factory: () => makeBeast('Kraken', 30, 45, 'FROSTBITE', 'DROWN', 'Legendary', '🦑', '#db2777', 'assets/beasts/kraken.png'), rarity: 'Legendary' },
  { factory: () => makeBeast('Vacuum Ooze', 20, 30, null, 'VACUUM_SCALER', 'Legendary', '🌪️', '#94a3b8'), rarity: 'Legendary' },
  { factory: () => makeBeast('Time Traveler', 10, 20, null, 'EPOCH_SCALING', 'Legendary', '⏳', '#0284c7'), rarity: 'Legendary' },
  { factory: () => makeBeast('Blood Thirster', 15, 25, null, 'LEVEL_SCALING', 'Legendary', '🩸', '#991b1b'), rarity: 'Legendary' },
  { factory: () => makeBeast('Infinite Fractal', 5, 10, null, 'LEGENDARY_MULTIPLIER', 'Legendary', '💠', '#c084fc'), rarity: 'Legendary' },
  { factory: () => makeBeast('Chromatic Dragon', 20, 30, null, 'OMNI_STRIKE', 'Legendary', '🐉', '#d946ef'), rarity: 'Legendary' }
];

const relicPool = [
  // Existing
  { id: 'venom_gland', name: 'Venom Gland', icon: '☠️', desc: 'Poison ticks for 25 dmg instead of 15', cost: 120, image: 'assets/relics/venom_gland.jpeg' },
  { id: 'molten_core', name: 'Molten Core', icon: '🌋', desc: 'Fire never degrades its stacks', cost: 150, image: 'assets/relics/molten_core.jpeg' },
  { id: 'heavy_anvil', name: 'Heavy Anvil', icon: '🗜️', desc: 'All beasts gain +10 minimum and maximum damage', cost: 100, image: 'assets/relics/heavy_anvil.jpeg' },
  { id: 'golden_dice', name: 'Golden Dice', icon: '🎲', desc: 'Shop refreshes cost 2G instead of 5G', cost: 200, image: 'assets/relics/golden_dice.jpeg' },

  // Combat & Damage
  { id: 'sharpening_stone', name: 'Sharpening Stone', icon: '🪨', desc: 'First beast deals +50 flat damage', cost: 80 },
  { id: 'glass_cannon', name: 'Glass Cannon', icon: '🧨', desc: 'All beasts deal +30% damage, but max active slots -1', cost: 240 },
  { id: 'ritual_dagger', name: 'Ritual Dagger', icon: '🗡️', desc: 'EXECUTE deals 6x damage instead of 4x', cost: 160 },
  { id: 'weighted_dice', name: 'Weighted Dice', icon: '🎲', desc: 'Minimum damage is increased by 20%', cost: 120 },
  { id: 'executioners_axe', name: 'Executioner\'s Axe', icon: '🪓', desc: 'Execution threshold is increased to 40% missing HP', cost: 200 },
  { id: 'mirror_shield', name: 'Mirror Shield', icon: '🛡️', desc: 'MIRROR_SYMMETRY beasts add +50 damage flat to their mirrored value', cost: 150 },
  { id: 'combo_meter', name: 'Combo Meter', icon: '📈', desc: 'COMBO_SCALER gets an additional +10% multiplier per beast', cost: 160 },
  { id: 'blood_chalice', name: 'Blood Chalice', icon: '🍷', desc: 'Restore 5% Boss HP per beast, but they all gain +50% damage', cost: 300 },
  { id: 'echo_chamber', name: 'Echo Chamber', icon: '🔊', desc: 'ECHO beasts copy 150% of previous damage instead of 100%', cost: 180 },
  { id: 'momentum_pendulum', name: 'Momentum Pendulum', icon: '🪀', desc: 'MOMENTUM_LOSS penalty is reduced by half', cost: 100 },

  // Status Effects
  { id: 'toxic_vial', name: 'Toxic Vial', icon: '🧪', desc: 'Applies 1 Poison stack at the start of combat', cost: 80 },
  { id: 'brimstone_match', name: 'Brimstone Match', icon: '🧨', desc: 'Applies 1 Fire stack at the start of combat', cost: 80 },
  { id: 'static_capacitor', name: 'Static Capacitor', icon: '🔋', desc: 'Applies 1 Shock stack at the start of combat', cost: 80 },
  { id: 'cursed_doll', name: 'Cursed Doll', icon: '🪆', desc: 'Applies 1 Vulnerable stack at the start of combat', cost: 100 },
  { id: 'liquid_nitrogen', name: 'Liquid Nitrogen', icon: '🧊', desc: 'Applies 1 Frostbite stack at the start of combat', cost: 100 },
  { id: 'plague_rat', name: 'Plague Rat', icon: '🐀', desc: 'POISON ticks trigger twice per round', cost: 180 },
  { id: 'thermite_paste', name: 'Thermite Paste', icon: '🥫', desc: 'FIRE deals +20% damage for each stack of VULNERABLE', cost: 160 },
  { id: 'conductive_wire', name: 'Conductive Wire', icon: '🔌', desc: 'SHOCK multiplier is increased to 4.5x', cost: 200 },
  { id: 'shattered_glass', name: 'Shattered Glass', icon: '🪞', desc: 'VULNERABLE multiplier is increased to 2.5x', cost: 200 },
  { id: 'deep_freeze', name: 'Deep Freeze', icon: '🥶', desc: 'FROSTBITE damage adds an extra +20 dmg/stack', cost: 150 },
  { id: 'catalytic_converter', name: 'Catalytic Converter', icon: '⚙️', desc: 'CATALYST consumes poison for 25x damage instead of 15x', cost: 240 },
  { id: 'ashes_to_ashes', name: 'Ashes to Ashes', icon: '⚱️', desc: 'CONSUME_FIRE grants +100 damage instead of 50', cost: 170 },
  { id: 'pandemic_spore', name: 'Pandemic Spore', icon: '🍄', desc: 'PROLIFERATE multiplies stacks by 3x instead of 2x', cost: 220 },

  // Economy & Shop
  { id: 'merchants_ledger', name: 'Merchant\'s Ledger', icon: '📜', desc: 'Gain +1 Gold for every beast in your inventory after a win', cost: 160 },
  { id: 'vip_card', name: 'VIP Card', icon: '💳', desc: 'Shop Level upgrades cost 20% less', cost: 200 },
  { id: 'rusty_piggy_bank', name: 'Rusty Piggy Bank', icon: '🐷', desc: 'Gain 50 Gold instantly, but lose 1 Gold per reroll', cost: 0 },
  { id: 'counterfeit_coin', name: 'Counterfeit Coin', icon: '🪙', desc: '5% chance to duplicate any beast bought from the shop', cost: 240 },
  { id: 'hagglers_charm', name: 'Haggler\'s Charm', icon: '🧿', desc: 'Beast costs in the shop are reduced by 1G', cost: 170 },
  { id: 'bounty_hunters_badge', name: 'Bounty Hunter\'s Badge', icon: '📛', desc: 'Boss kills grant +30 Gold', cost: 120 },
  { id: 'recycling_bin', name: 'Recycling Bin', icon: '♻️', desc: 'Selling a beast refunds its full base cost', cost: 300 },
  { id: 'golden_ticket', name: 'Golden Ticket', icon: '🎟️', desc: '1 free reroll every shop visit', cost: 260 },
  { id: 'tax_evasion', name: 'Tax Evasion', icon: '💼', desc: 'Gain +10 Gold every time you enter the shop', cost: 140 },
  { id: 'expanded_display', name: 'Expanded Display', icon: '🏪', desc: 'Shop offers an additional beast every refresh', cost: 180 },

  // GA & Lab
  { id: 'overclocked_cpu', name: 'Overclocked CPU', icon: '🖥️', desc: 'Start every GA round with +100 Epochs', cost: 160 },
  { id: 'mutation_serum', name: 'Mutation Serum', icon: '💉', desc: 'Mutation rate is passively increased by 10%', cost: 200 },
  { id: 'elite_pedigree', name: 'Elite Pedigree', icon: '👑', desc: 'Elitism count is increased by 1', cost: 240 },
  { id: 'supercomputer_cooling', name: 'Supercomputer Cooling', icon: '❄️', desc: 'Gain +1 Epoch for every beast sold', cost: 150 },
  { id: 'dna_extractor', name: 'DNA Extractor', icon: '🧬', desc: 'Gain +25% DNA from all sources', cost: 260 },
  { id: 'gene_splicer', name: 'Gene Splicer', icon: '✂️', desc: '5% chance during mutation to upgrade a beast\'s rarity', cost: 300 },
  { id: 'quantum_processor', name: 'Quantum Processor', icon: '🧠', desc: 'GA Population size increased by 5', cost: 280 },
  { id: 'ancestral_skull', name: 'Ancestral Skull', icon: '💀', desc: 'Start the run with 200 extra DNA', cost: 200 },

  // Utility & Synergies
  { id: 'time_bomb_detonator', name: 'Time Bomb Detonator', icon: '💣', desc: 'TIME_BOMB base damage is doubled', cost: 180 },
  { id: 'first_blood_medal', name: 'First Blood Medal', icon: '🥇', desc: 'FIRST_STRIKE multiplier increased from 3x to 4x', cost: 160 },
  { id: 'growth_hormone', name: 'Growth Hormone', icon: '💊', desc: 'GROWTH beasts gain +5 damage per slot instead of +2', cost: 120 },
  { id: 'high_roller_chips', name: 'High Roller Chips', icon: '🎰', desc: 'HIGH_ROLLER beasts have a 75% chance to double damage', cost: 200 },
  { id: 'punishers_whip', name: 'Punisher\'s Whip', icon: '🪢', desc: 'PUNISHER activates if previous beast dealt < 30 damage', cost: 120 },
  { id: 'vacuum_cleaner', name: 'Vacuum Cleaner', icon: '🧹', desc: 'VACUUM_SCALER grants +10 damage per stack consumed', cost: 170 },
  { id: 'telescope', name: 'Telescope', icon: '🔭', desc: 'HIDE beasts give +20 damage to the next beast', cost: 100 },
  { id: 'cheerleader_pompoms', name: 'Cheerleader Pom-Poms', icon: '🎀', desc: 'MINOR_BUFF grants +10 damage to all subsequent beasts', cost: 100 },
  { id: 'gold_plating', name: 'Gold Plating', icon: '🏆', desc: 'GOLD_SCALING adds 2x your gold instead of 1x', cost: 220 },
  { id: 'epoch_clock', name: 'Epoch Clock', icon: '🕰️', desc: 'EPOCH_SCALING grants +1 damage per 25 epochs instead of 50', cost: 180 },
  { id: 'collectors_edition', name: 'Collector\'s Edition', icon: '📚', desc: 'INVENTORY_SCALING grants +15 damage per beast in inventory', cost: 240 },
  { id: 'level_up_potion', name: 'Level Up Potion', icon: '🧪', desc: 'LEVEL_SCALING grants +20 damage per level instead of 10', cost: 200 },
  { id: 'crown_of_legends', name: 'Crown of Legends', icon: '👑', desc: 'LEGENDARY_MULTIPLIER base is 2x per legendary instead of 1.5x', cost: 300 },
  { id: 'kindling_wood', name: 'Kindling Wood', icon: '🪵', desc: 'KINDLING triples fire damage instead of doubling it', cost: 180 },
  { id: 'conversion_kit', name: 'Conversion Kit', icon: '🧰', desc: 'STATUS_CONVERSION yields 25x damage per stack instead of 10x', cost: 260 },

  // Boss & Arena
  { id: 'exhaustion_gas', name: 'Exhaustion Gas', icon: '💨', desc: 'Boss maximum HP is reduced by 10%', cost: 200 },
  { id: 'armor_piercing_rounds', name: 'Armor Piercing Rounds', icon: '🎯', desc: 'ARMORED stance reduces damage by 30% instead of 50%', cost: 160 },
  { id: 'scouts_binoculars', name: 'Scout\'s Binoculars', icon: '🔭', desc: 'Boss stances are always revealed', cost: 120 },
  { id: 'fireproof_vest', name: 'Fireproof Vest', icon: '🦺', desc: 'FIRE_IMMUNITY stance only reduces damage by 50%', cost: 150 },
  { id: 'second_wind', name: 'Second Wind', icon: '🌬️', desc: 'If you fail a round, gain 100 Epochs for the next computation', cost: 240 }
].map(r => {
  if (!r.image) {
    r.image = 'assets/relics/' + r.id + '.jpeg';
  }
  return r;
});

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
  const weights = {...levelWeights[Math.min(state.shopLevel, 5)]};
  weights['Uncommon'] = (weights['Uncommon'] || 0) + getSkillEffect('inv_luck_unc', metaState) * 5;
  weights['Rare'] = (weights['Rare'] || 0) + getSkillEffect('inv_luck_rare', metaState) * 3;
  weights['Epic'] = (weights['Epic'] || 0) + getSkillEffect('inv_luck_epic', metaState) * 2;
  weights['Legendary'] = (weights['Legendary'] || 0) + getSkillEffect('inv_luck_leg', metaState) * 2;

  let extraSlots = getSkillEffect('eco_extra_shop', metaState);
  if (state.relics && state.relics.some(r => r.id === 'expanded_display')) extraSlots += 1;
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
    if (state.relics.some(r => r.id === 'hagglers_charm')) discountPct += 0.05;

    randBeast.cost = isMidas ? 10 : Math.floor(baseCost * (1 - discountPct));
    state.shopOfferings.push(randBeast);
  }

}

function renderShop() {
  elShopItems.innerHTML = '';
  elShopActions.innerHTML = '';

  // Refresh item
  const refreshCard = document.createElement('button');
  refreshCard.className = 'shop-action-btn';
  const baseRefreshCost = state.relics.some(r => r.id === 'golden_dice') ? Math.max(1, 2 * state.shopLevel) : 5 * state.shopLevel;
  let refreshCost = Math.max(1, baseRefreshCost - getSkillEffect('eco_refresh', metaState));
  if (state.relics.some(r => r.id === 'rusty_piggy_bank')) refreshCost += 1;
  if (state.freeRerolls > 0) refreshCost = 0;
  
  refreshCard.innerHTML = `
    <span>Refresh</span>
    <span class="gold">${refreshCost === 0 ? 'FREE' : refreshCost + 'G'}</span>
  `;
  refreshCard.onclick = () => {
    const isGod = localStorage.getItem('antigravity_god_mode_flag') === 'true';
    if (state.gold >= refreshCost || refreshCost === 0 || isGod) {
      if (refreshCost === 0 && state.freeRerolls > 0 && !isGod) {
        state.freeRerolls--;
      } else if (!isGod) {
        state.gold -= refreshCost;
      }
      rollShop();
      renderShop();
      updateUI();
      saveRunState();
    } else {
      showToast("Not enough gold!");
    }
  };
  elShopActions.appendChild(refreshCard);

  // Epoch item
  const epochCard = document.createElement('button');
  epochCard.className = 'shop-action-btn';
  epochCard.innerHTML = `
    <span>+5 Epochs</span>
    <span class="gold">5G</span>
  `;
  epochCard.onclick = () => {
    const isGod = localStorage.getItem('antigravity_god_mode_flag') === 'true';
    if (state.gold >= 5 || isGod) {
      if (!isGod) state.gold -= 5;
      state.epochs += 5;
      updateUI();
      saveRunState();
    } else {
      showToast("Not enough gold!");
    }
  };
  elShopActions.appendChild(epochCard);

  // Upgrade Shop item
  if (state.shopLevel < 5) {
    let actualUpgCost = state.upgradeCost;
    if (state.relics.some(r => r.id === 'vip_card')) actualUpgCost = Math.floor(actualUpgCost * 0.8);
    
    const upgCard = document.createElement('button');
    upgCard.className = 'shop-action-btn';
    upgCard.innerHTML = `
      <span>Upgrade Shop</span>
      <span class="gold">${actualUpgCost}G</span>
    `;
    upgCard.onclick = () => {
      const isGod = localStorage.getItem('antigravity_god_mode_flag') === 'true';
      if (state.gold >= actualUpgCost || isGod) {
        if (!isGod) state.gold -= actualUpgCost;
        state.shopLevel++;
        state.upgradeCost = 30 * state.shopLevel * state.shopLevel;
        renderShop();
        updateUI();
        saveRunState();
      } else {
        showToast("Not enough gold!");
      }
    };
    elShopActions.appendChild(upgCard);
  }

  // Render Offerings
  state.shopOfferings.forEach((randBeast, idx) => {
    const card = document.createElement('div');
    card.className = `shop-card beast-item-${randBeast.rarity}`;
    card.innerHTML = `
      <div class="shop-card-icon">
        ${randBeast.image ? `<img src="${randBeast.image}" class="beast-sprite-large" />` : `<span class="beast-emoji-large">${randBeast.icon}</span>`}
      </div>
      <div class="shop-card-info has-tooltip" data-tooltip="${getTooltipText(randBeast).replace(/"/g, '&quot;')}">
        <h3 class="rarity-${randBeast.rarity}">${randBeast.name} <span style="font-size:0.7em">[${randBeast.rarity}]</span></h3>
        <p>${getAbilityTitle(randBeast)}</p>
      </div>
      <button class="btn shop-buy-btn">${randBeast.cost}G</button>
    `;
    card.querySelector('button').onclick = () => {
      if (state.beasts.length >= 40) {
        showToast("Your inventory is full (40 max)!");
        return;
      }
      const oldBeastCount = state.beasts.length;
      state = buyBeast(state, randBeast);
      if (state.beasts.length > oldBeastCount) { // Success
        state.shopOfferings.splice(idx, 1);
        if (state.relics.some(r => r.id === 'counterfeit_coin') && Math.random() < 0.05) {
          if (state.beasts.length < 40) {
            state.beasts.push(randBeast);
            showToast(`Counterfeit Coin activated! You got a duplicate!`);
          }
        }
        population = []; // Invalidate GA population
        renderBeasts();
        updateUI();
        renderShop();
        saveRunState();
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
      level: state.level,
      relics: state.relics,
      metaState: metaState
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
        if (beast.image && imageCache[beast.image] && imageCache[beast.image].complete) {
          convCtx.drawImage(imageCache[beast.image], x - 7, y - 10, 14, 14);
        } else {
          convCtx.fillText(beast.icon, x, y);
        }
      });
      
      if (elPreviousSequencesList && epochIdx === history.length - 1) {
        const row = document.createElement('div');
        row.className = 'previous-sequence-row';
        
        let slotsHtml = '';
        pop.bestSeq.forEach(b => {
          if (b.image) {
            slotsHtml += `<div class="sequence-slot filled has-tooltip" data-tooltip="${getTooltipText(b).replace(/\"/g, '&quot;')}"><img src="${b.image}" class="beast-sprite-small" /></div>`;
          } else {
            slotsHtml += `<div class="sequence-slot filled has-tooltip" data-tooltip="${getTooltipText(b).replace(/\"/g, '&quot;')}">${b.icon}</div>`;
          }
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
  if (state.relics.some(r => r.id === 'overclocked_cpu')) epochsToRun += 50;
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
      const sims = 10 + getSkillEffect('gen_sims', metaState) * 5;
      const scored = population.map(seq => ({ seq, score: evaluateFitness(seq, sims) }));
      scored.sort((a, b) => b.score - a.score);

      populationHistory.push({
        scores: scored.map(s => s.score),
        bestSeq: scored[0].seq.slice(0, getMaxSlots())
      });

      if (scored[0].score > bestExpectedDmg) {
        bestExpectedDmg = scored[0].score;
        bestSequence = [...scored[0].seq];
      }

      if (getSkillEffect('gen_cap', metaState) > 0) {
        if (!state.allTimeBestSequence) state.allTimeBestSequence = { seq: [...bestSequence], score: bestExpectedDmg };
        else if (bestExpectedDmg > state.allTimeBestSequence.score) {
           state.allTimeBestSequence = { seq: [...bestSequence], score: bestExpectedDmg };
        }
      }

      const newPop = [];
      let elitesToKeep = 1 + getSkillEffect('gen_elite', metaState);
      if (state.relics.some(r => r.id === 'elite_pedigree')) elitesToKeep += 1;
      
      if (getSkillEffect('gen_cap', metaState) > 0 && state.allTimeBestSequence) {
        newPop.push([...state.allTimeBestSequence.seq]);
        elitesToKeep = Math.max(0, elitesToKeep - 1);
      }

      for (let i = 0; i < elitesToKeep && i < scored.length; i++) {
        if (newPop.length < getPopSize()) {
           newPop.push([...scored[i].seq]);
        }
      }

      const tournamentSelect = () => {
        const t = [];
        const tourneySize = 3 + getSkillEffect('gen_tourney', metaState) * 2;
        for (let i = 0; i < tourneySize; i++) {
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
        let mutChance = 0.4;
        if (state.relics.some(r => r.id === 'mutation_serum')) mutChance += 0.10;
        if (Math.random() < mutChance) child = mutateSwap(child);
        
        if (state.relics.some(r => r.id === 'gene_splicer') && Math.random() < 0.05) {
          const rarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
          const randomIdx = Math.floor(Math.random() * child.length);
          const currentRarityIdx = rarities.indexOf(child[randomIdx].rarity);
          if (currentRarityIdx < rarities.length - 1 && currentRarityIdx !== -1) {
             const nextRarity = rarities[currentRarityIdx + 1];
             const validPool = shopPool.filter(p => p.rarity === nextRarity);
             if (validPool.length > 0) {
                child[randomIdx] = validPool[Math.floor(Math.random() * validPool.length)].factory();
             }
          }
        }
        
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

  // --- Unified Combat Execution ---
  // We call calculateDamage with generateLog: true to get the exact sequence of actions
  const combatResult = calculateDamage(activeSeq, bossHp, currentStance, globalStatuses, {
    gold: state.gold,
    epochs: state.totalEpochsRun,
    inventorySize: state.beasts.length,
    level: state.level,
    relics: state.relics,
    metaState: metaState,
    generateLog: true
  });

  const actions = combatResult.actions;
  
  if (!state.runHistory) state.runHistory = [];
  let currentLevelHistory = state.runHistory.find(h => h.level === state.level);
  if (!currentLevelHistory) {
    currentLevelHistory = { level: state.level, turns: [] };
    state.runHistory.push(currentLevelHistory);
    if (state.runHistory.length > 5) state.runHistory.shift();
  }
  currentLevelHistory.turns.push({
    round: combatRound,
    seq: [...activeSeq],
    expectedDmg: bestExpectedDmg,
    actions: [...actions]
  });

  let actionIndex = 0;

  function buildBreakdownHtml(breakdown, total) {
    if (!breakdown || breakdown.length === 0) return null;
    let html = '';
    breakdown.forEach(b => {
      html += `<div class="breakdown-row"><span>${b.label}</span><strong>${b.value}</strong></div>`;
    });
    html += `<div class="breakdown-row breakdown-total"><span>Total</span><strong>${total}</strong></div>`;
    return html;
  }

  function processNextAction() {
    if (bossHp <= 0 || actionIndex >= actions.length) {
      setTimeout(finishRound, 100);
      return;
    }

    const action = actions[actionIndex];
    actionIndex++;

    if (action.type === 'attack') {
      const beast = action.beast;
      const dmg = action.totalDmg;
      const breakdownHtml = buildBreakdownHtml(action.breakdown, dmg);
      
      let logType = action.isCrit ? 'crit' : 'normal';
      let msg = `${beast.icon} <strong>${beast.name}</strong> dealt ${dmg} damage!`;
      if (action.isDouble) msg = `${beast.icon} <strong>${beast.name}</strong> double-attacked for ${dmg} damage!`;
      
      logCombat(msg, logType, breakdownHtml);
      
      if (dmg > 0) {
         showFloatingText(dmg, logType);
         bossHp -= dmg;
         updateUI();
         elArenaBoss.classList.add('hit-anim');
         setTimeout(() => elArenaBoss.classList.remove('hit-anim'), 150);
      } else {
         showFloatingText('0', 'normal');
      }

      const uiBeasts = document.querySelectorAll('#arena-sequence .beast-item');
      uiBeasts.forEach(b => b.classList.remove('active-attacker'));
      const attackIdx = actions.slice(0, actionIndex).filter(a => a.type === 'attack').length - 1;
      if (uiBeasts[attackIdx]) uiBeasts[attackIdx].classList.add('active-attacker');

      setTimeout(processNextAction, 300);
    } 
    else if (action.type === 'dot') {
      const isPoison = action.status === 'POISON';
      bossHp -= action.dmg;
      logCombat(`${isPoison?'🟢':'🔥'} ${action.status} dealt ${action.dmg} damage!`, 'danger');
      showFloatingText(action.dmg, 'dot');
      updateUI();
      elArenaBoss.style.background = 'var(--danger)';
      setTimeout(() => { elArenaBoss.style.background = '#fff'; processNextAction(); }, 150);
    }
    else if (action.type === 'bomb') {
      bossHp -= action.dmg;
      logCombat(`💣 TIME BOMB detonated for ${action.dmg} damage!`, 'crit');
      showFloatingText(action.dmg, 'crit');
      updateUI();
      setTimeout(processNextAction, 300);
    }
    else if (action.type === 'heal') {
      bossHp += action.amount;
      logCombat(`🩸 Boss healed for ${action.amount} due to Blood Chalice!`, 'heal');
      showFloatingText(`+${action.amount}`, 'heal');
      updateUI();
      setTimeout(processNextAction, 150);
    }
    else if (action.type === 'execute_boss') {
      bossHp = 0;
      logCombat(`⚡ Boss EXECUTED by Resilience Capstone!`, 'crit');
      showFloatingText('EXECUTED', 'crit');
      updateUI();
      setTimeout(processNextAction, 300);
    }
    else {
      processNextAction();
    }
  }

  processNextAction();
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
        let goldReward = 30 + (state.level * 10);
        
        // Eco Bounty
        goldReward += getSkillEffect('eco_bounty', metaState) * 15;
        // Res Level Gold
        goldReward += getSkillEffect('res_level_gold', metaState) * 10;
        
        if (getSkillEffect('eco_jackpot', metaState) > 0 && Math.random() < 0.1) {
           goldReward *= 2;
           showToast("JACKPOT! Double boss gold!");
        }
        
        state.gold += goldReward;
        
        // Interest
        const interestRate = getSkillEffect('eco_interest', metaState) * 0.05;
        if (interestRate > 0) {
           const interest = Math.floor(state.gold * interestRate);
           state.gold += interest;
           showToast(`Earned ${interest}G interest!`);
        }
        
        // Free Rerolls
        state.freeRerolls = (state.freeRerolls || 0) + getSkillEffect('eco_reroll_free', metaState);
        if (state.relics.some(r => r.id === 'golden_ticket')) state.freeRerolls++;
        if (state.relics.some(r => r.id === 'tax_evasion')) state.gold += 10;
        if (state.relics.some(r => r.id === 'merchants_ledger')) state.gold += state.beasts.length;
        if (state.relics.some(r => r.id === 'bounty_hunters_badge')) state.gold += 30;
        
        // Chaos Free Beast
        const freeBeastChance = getSkillEffect('chaos_free_beast', metaState) * 0.1;
        if (freeBeastChance > 0 && Math.random() < freeBeastChance) {
           const validBeasts = shopPool; // any beast
           const b = validBeasts[Math.floor(Math.random() * validBeasts.length)].factory();
           if (state.beasts.length < 20 + getSkillEffect('inv_cap', metaState)*5) {
              state.beasts.push(b);
              showToast(`Void Gift: Acquired ${b.name}!`);
           }
        }
        
        // Boss HP Scaling reduction
        const hpScale = 1.28 - (getSkillEffect('res_boss_slow', metaState) * 0.03);
        const hpReduction = getSkillEffect('res_hp', metaState) * 0.03;
        
        let newMax = Math.floor(60 * Math.pow(hpScale, state.level - 1));
        newMax = Math.floor(newMax * (1 - hpReduction));
        if (state.relics.some(r => r.id === 'exhaustion_gas')) newMax = Math.floor(newMax * 0.9);
        
        bossMaxHp = newMax;
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
        saveRunState();
        if (typeof checkAchievements !== 'undefined') checkAchievements();
        
        if ((state.level - 1) % 3 === 0) {
          triggerRelicMilestone();
        } else {
          btnFight.disabled = false;
        }
      }, 500);
    }, 200);
  } else {
    combatRound++;
    
    let isGameOver = combatRound > 3 + getSkillEffect('res_round', metaState);
    if (isGameOver && getSkillEffect('res_second_chance', metaState) > 0 && !state.secondChanceUsed) {
       isGameOver = false;
       state.secondChanceUsed = true;
       logCombat("DEATH DEFIED! One more round!", "crit");
    }

    if (isGameOver) {
      logCombat("YOU FAILED TO KILL THE BOSS.", "danger");
      
      // Inheritance (Keep 1 Beast)
      if (getSkillEffect('inv_keep', metaState) > 0 && state.beasts.length > 0) {
        preservedBeast = state.beasts[Math.floor(Math.random() * state.beasts.length)];
      }
      
      const baseDna = Math.floor(10 * Math.pow(1.15, state.level));
      let dnaMultiplier = 1 + (getSkillEffect('res_dna_bonus', metaState) * 0.2);
      if (state.relics.some(r => r.id === 'dna_extractor')) dnaMultiplier += 0.25;
      const dnaEarned = Math.floor(baseDna * dnaMultiplier);
      metaState.dna += dnaEarned;
      saveMetaState();
      if (typeof checkAchievements !== 'undefined') checkAchievements();
      clearRunState(); // Wipe the save file so they start fresh
      setTimeout(() => {
        showOverlay("Game Over", `The Boss survived. You earned ${dnaEarned} DNA!`, "loss", true);
      }, 200);
    } else {
      if (state.relics.some(r => r.id === 'second_wind')) state.epochs += 100;
      currentStance = BOSS_STANCES[Math.floor(Math.random() * BOSS_STANCES.length)];
      logCombat(`--- PREPARING ROUND ${combatRound} ---`, 'crit');
      logCombat(`Boss shifts to: ${currentStance}`);
      bestExpectedDmg = 0; // Reset so GA evaluates properly against new stance!
      btnFight.disabled = false;
      updateUI();
      saveRunState();
      if (typeof checkAchievements !== 'undefined') checkAchievements();
      
      if (metaState.settings && metaState.settings.autoPlayTurns) {
        setTimeout(executeRound, 1000);
      }
    }
  }
}
function resetRun() {
  hideOverlay();
  
  let initialBeasts = [
    makeBeast('Vanguard', 10, 15, null, 'FIRST_STRIKE', 'Uncommon', '🛡️', '#78716c', 'assets/beasts/vanguard.png'),
    makeBeast('Coward', 15, 15, null, 'HIDE', 'Common', '🙈', '#d6d3d1', 'assets/beasts/coward.png'),
    makeBeast('Scout', 4, 8, null, 'GROWTH', 'Common', '🦅', '#93c5fd', 'assets/beasts/scout.png'),
    makeBeast('Cheerleader', 1, 5, null, 'BUFF_NEXT_20', 'Common', '📣', '#f472b6', 'assets/beasts/cheerleader.png')
  ];
  
  if (preservedBeast) {
    initialBeasts.push(preservedBeast);
    preservedBeast = null;
  }
  
  for (let i = 0; i < getSkillEffect('inv_starter', metaState); i++) {
    const pool = shopPool.filter(p => p.rarity === 'Uncommon');
    initialBeasts.push(pool[Math.floor(Math.random() * pool.length)].factory());
  }
  
  for (let i = 0; i < getSkillEffect('inv_starter_rare', metaState); i++) {
    const pool = shopPool.filter(p => p.rarity === 'Rare');
    initialBeasts.push(pool[Math.floor(Math.random() * pool.length)].factory());
  }
  
  if (getSkillEffect('inv_cap_node', metaState) > 0) {
    const cloned = initialBeasts.map(b => {
      const bp = shopPool.find(p => p.factory().name === b.name);
      return bp ? bp.factory() : makeBeast(b.name, b.minDmg, b.maxDmg, b.appliesStatus, b.synergy, b.rarity, b.icon, b.color, b.image);
    });
    initialBeasts = initialBeasts.concat(cloned);
  }

  state = {
    level: 1,
    gold: 40 + (getSkillEffect('eco_gold1', metaState) * 20),
    epochs: getSkillEffect('gen_epochs', metaState) * 25,
    totalEpochsRun: 0,
    shopLevel: 1 + getSkillEffect('eco_shop_start', metaState),
    upgradeCost: 30 * Math.max(1, (1 + getSkillEffect('eco_shop_start', metaState)) * (1 + getSkillEffect('eco_shop_start', metaState))),
    secondChanceUsed: false,
    shopOfferings: [],
    relicOfferings: [],
    temporarySkill: null
  };

  if (getSkillEffect('chaos_cap', metaState) > 0) {
    const candidates = SKILL_TREE_DATA.filter(s => s.tier > 0);
    if (candidates.length > 0) {
      const randomSkill = candidates[Math.floor(Math.random() * candidates.length)];
      state.temporarySkill = randomSkill.id;
    }
  }
  window.__activeTemporarySkill = state.temporarySkill;  state.relics = [];
  state.runHistory = [];
  state.beasts = initialBeasts;
  
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
  saveRunState();
}

function triggerRelicMilestone() {
  elRelicOptions.innerHTML = '';
  
  // Pick 3 random unique relics
  const availableRelics = relicPool.filter(r => !state.relics.some(owned => owned.id === r.id));
  shuffle(availableRelics);
  const numChoices = Math.min(availableRelics.length, 3 + getSkillEffect('chaos_relic_extra', metaState));
  const options = availableRelics.slice(0, numChoices);
  
  let picksRemaining = 1 + getSkillEffect('chaos_double_relic', metaState);
  
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
    card.style.flexDirection = 'column';
    card.style.background = '#1e293b';
    card.style.color = '#fff';
    card.innerHTML = `
      <div style="font-size: 3rem; margin-bottom: 10px;">${relic.image ? `<img src="${relic.image}" style="width: 48px; height: 48px; object-fit: contain;" onerror="this.style.display='none'; this.parentNode.textContent='${relic.icon}'" />` : relic.icon}</div>
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
      const isGod = localStorage.getItem('antigravity_god_mode_flag') === 'true';
      if ((state.gold >= relic.cost || isGod) && picksRemaining > 0) {
        if (!isGod) state.gold -= relic.cost;
        if (relic.id === 'rusty_piggy_bank') state.gold += 50;
        if (relic.id === 'ancestral_skull') {
           metaState.dna = (metaState.dna || 0) + 200;
           saveMetaState();
        }
        state.relics.push(relic);
        picksRemaining--;
        btn.disabled = true;
        btn.textContent = 'Acquired';
        card.style.opacity = '0.5';
        updateUI();
        showToast(`Acquired ${relic.name}!`);
        saveRunState();
        
        if (picksRemaining <= 0 || state.relics.length >= relicPool.length) {
          elRelicChoiceOverlay.classList.add('hidden');
          btnFight.disabled = false;
        }
      }
    };
    elRelicOptions.appendChild(card);
  });
  
  elRelicChoiceOverlay.classList.remove('hidden');
}

// Listeners
if (btnSkipRelic) btnSkipRelic.addEventListener('click', () => {
  elRelicChoiceOverlay.classList.add('hidden');
  btnFight.disabled = false;
});

if (btnRestart) btnRestart.addEventListener('click', resetRun);

if (btnOpenLab) btnOpenLab.addEventListener('click', () => {
  if (skillTreeRenderer) skillTreeRenderer.refresh(metaState);
  elLabOverlay.classList.remove('hidden');
});
if (btnCloseLab) btnCloseLab.addEventListener('click', () => {
  elLabOverlay.classList.add('hidden');
});

const btnAbandonRun = document.getElementById('btn-abandon-run');
if (btnAbandonRun) {
  btnAbandonRun.addEventListener('click', () => {
    if (confirm("Are you sure you want to abandon this run? You will start over at Level 1.")) {
      clearRunState();
      resetRun();
    }
  });
}

const btnOpenAchievements = document.getElementById('btn-open-achievements');
const btnCloseAchievements = document.getElementById('btn-close-achievements');
const elAchievementsOverlay = document.getElementById('achievements-overlay');
const elAchievementsList = document.getElementById('achievements-list');
const elAchievementsCount = document.getElementById('achievements-count');

if (btnOpenAchievements) btnOpenAchievements.addEventListener('click', () => {
  renderAchievementsModal();
  elAchievementsOverlay.classList.remove('hidden');
});
if (btnCloseAchievements) btnCloseAchievements.addEventListener('click', () => {
  elAchievementsOverlay.classList.add('hidden');
});

// Render logic for achievements
window.renderAchievementsModal = function() {
  if (!elAchievementsList || !metaState) return;
  if (!metaState.achievements) metaState.achievements = [];
  elAchievementsList.innerHTML = '';
  
  let unlockedCount = 0;
  
  if (typeof ACHIEVEMENTS !== 'undefined') {
    ACHIEVEMENTS.forEach(ach => {
      const isUnlocked = metaState.achievements.includes(ach.id);
      if (isUnlocked) unlockedCount++;
      
      const card = document.createElement('div');
      card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
      
      let icon = '🏆';
      if (ach.type === 'economy') icon = '🪙';
      if (ach.type === 'combat') icon = '⚔️';
      if (ach.type === 'genetic') icon = '🧬';
      if (ach.type === 'collection') icon = '🎴';
      if (ach.type === 'hidden') icon = '👁️';
      if (ach.type === 'meta') icon = '🔬';
      if (ach.type === 'progression') icon = '🔥';
      
      const title = (!isUnlocked && ach.hidden) ? '???' : ach.name;
      let desc = ach.desc;
      if (!isUnlocked && ach.hidden) {
        desc = ach.hint ? ach.hint : 'Hidden Easter Egg. Discover it through gameplay.';
      }
      
      card.innerHTML = `
        <div class="icon">${icon}</div>
        <div class="details">
          <div class="title">${title}</div>
          <div class="desc">${desc}</div>
        </div>
      `;
      elAchievementsList.appendChild(card);
    });
    
    if (elAchievementsCount) {
      elAchievementsCount.textContent = `${unlockedCount} / ${ACHIEVEMENTS.length}`;
    }
  }
};

// Global Listener for Achievements Validation
document.body.addEventListener('click', (e) => {
  if (e.target.closest('button')) {
    if (typeof checkAchievements !== 'undefined') {
      // Defer slightly to ensure state is completely updated before checking
      setTimeout(checkAchievements, 50);
    }
  }
});

btnFight.addEventListener('click', executeRound);

document.body.addEventListener('mouseover', (e) => {
  const target = e.target.closest('.has-tooltip');
  if (target) {
    const text = target.getAttribute('data-tooltip');
    if (text) {
      let html = `<div style="display: flex; gap: 15px;">`;
      html += `<div style="min-width: 200px;">${text.replace(/\n/g, '<br>')}</div>`;
      
      let extra = [];
      const upText = text.toUpperCase();
      if (upText.includes('POISON')) extra.push('<b style="color:#22c55e">POISON</b><br/>Deals 5 damage per stack at the end of the round. Loses 1 stack per round.');
      if (upText.includes('FIRE')) extra.push('<b style="color:#ef4444">FIRE</b><br/>Deals 10 damage per stack at the end of the round. Loses 2 stacks per round.');
      if (upText.includes('SHOCK')) extra.push('<b style="color:#eab308">SHOCK</b><br/>Multiplies next damage by 1.5x per stack, then removes all stacks.');
      if (upText.includes('VULNERABLE')) extra.push('<b style="color:#a855f7">VULNERABLE</b><br/>Multiplies all damage taken by 1.5x. Loses 1 stack per round.');
      if (upText.includes('FROSTBITE')) extra.push('<b style="color:#0ea5e9">FROSTBITE</b><br/>Deals 2 damage per stack when taking direct damage. Does not decay naturally.');
      if (upText.includes('CONSUME')) extra.push('<b style="color:#f43f5e">CONSUME</b><br/>Removes all status effect stacks from the Boss.');
      if (upText.includes('PROLIFERATE')) extra.push('<b style="color:#8b5cf6">PROLIFERATE</b><br/>Multiplies the current stacks of all active statuses.');
      
      if (extra.length > 0) {
        html += `<div style="border-left: 1px dashed #555; padding-left: 15px; width: 220px; font-size: 0.8rem; color: #bbb;">`;
        html += extra.join('<br/><br/>');
        html += `</div>`;
      }
      html += `</div>`;
      elGlobalTooltip.innerHTML = html;
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

// 3D Tilt Physics for Casino Aesthetic
document.body.addEventListener('mousemove', (e) => {
  const card = e.target.closest('.shop-card') || e.target.closest('.beast-item');
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const rotateX = ((y - centerY) / centerY) * -15;
  const rotateY = ((x - centerX) / centerX) * 15;
  
  card.style.transform = `perspective(800px) scale(1.05) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
});

document.body.addEventListener('mouseout', (e) => {
  const card = e.target.closest('.shop-card') || e.target.closest('.beast-item');
  if (card && !card.contains(e.relatedTarget)) {
    card.style.transform = '';
  }
});

// Boss Video Animation Logic
const bossVideo = document.getElementById('boss-video');
if (bossVideo) {
  // Ensure it starts paused on the first frame
  bossVideo.pause();
  bossVideo.currentTime = 0;
  
  bossVideo.addEventListener('ended', () => {
    bossVideo.pause();
    bossVideo.currentTime = 0;
  });

  setInterval(() => {
    if (bossVideo.paused) {
      bossVideo.play().catch(e => console.error("Video play prevented:", e));
    }
  }, 7000);
}

// Settings Overlay Logic
const btnOpenSettings = document.getElementById('btn-open-settings');
const btnCloseSettings = document.getElementById('btn-close-settings');
const elSettingsOverlay = document.getElementById('settings-overlay');
const chkAutoPlay = document.getElementById('chk-autoplay-turns');

if (btnOpenSettings) btnOpenSettings.addEventListener('click', () => {
  if (chkAutoPlay) chkAutoPlay.checked = metaState.settings.autoPlayTurns || false;
  elSettingsOverlay.classList.remove('hidden');
});
if (btnCloseSettings) btnCloseSettings.addEventListener('click', () => {
  elSettingsOverlay.classList.add('hidden');
});
if (chkAutoPlay) chkAutoPlay.addEventListener('change', (e) => {
  metaState.settings.autoPlayTurns = e.target.checked;
  saveMetaState();
});

// Settings Tabs Logic
const tabBtns = document.querySelectorAll('.settings-tab-btn');
const tabPanes = document.querySelectorAll('.settings-tab-pane');
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(`settings-tab-${tabId}`).classList.remove('hidden');
  });
});

// Run History Overlay Logic
const btnOpenHistory = document.getElementById('btn-open-history');
const btnCloseHistory = document.getElementById('btn-close-history');
const elHistoryOverlay = document.getElementById('history-overlay');
const elHistoryList = document.getElementById('history-list');

if (btnOpenHistory) btnOpenHistory.addEventListener('click', () => {
  renderHistoryModal();
  elHistoryOverlay.classList.remove('hidden');
});
if (btnCloseHistory) btnCloseHistory.addEventListener('click', () => {
  elHistoryOverlay.classList.add('hidden');
});

function renderHistoryModal() {
  if (!elHistoryList) return;
  elHistoryList.innerHTML = '';
  
  if (!state.runHistory || state.runHistory.length === 0) {
    elHistoryList.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">No history available yet. Compute rounds to see the algorithm history.</p>';
    return;
  }
  
  state.runHistory.slice().reverse().forEach(lvlHistory => {
    const card = document.createElement('div');
    card.className = 'history-level-card';
    card.innerHTML = `<div class="history-level-header">Boss Level ${lvlHistory.level}</div>`;
    
    lvlHistory.turns.forEach(turn => {
      const turnRow = document.createElement('div');
      turnRow.className = 'history-turn-row';
      
      let seqHtml = '';
      turn.seq.forEach((b, index) => {
        // Try to find the corresponding attack action to build a tooltip
        let breakdownTooltip = getTooltipText(b);
        if (turn.actions) {
          const actionCountForThisBeast = turn.actions.filter(a => a.type === 'attack').findIndex((a, i) => i === index);
          // Wait, finding the action is simple since actions are strictly in sequence for 'attack'.
          const attacks = turn.actions.filter(a => a.type === 'attack');
          const myAction = attacks[index];
          if (myAction && myAction.breakdown) {
             breakdownTooltip += '\n\n-- Damage Breakdown --\n';
             myAction.breakdown.forEach(bk => {
               breakdownTooltip += `${bk.label}: ${bk.value}\n`;
             });
             breakdownTooltip += `Total: ${myAction.totalDmg}`;
          }
        }
        
        const safeTooltip = breakdownTooltip.replace(/\"/g, '&quot;');

        if (b.image) {
          seqHtml += `<div class="sequence-slot filled has-tooltip" data-tooltip="${safeTooltip}"><img src="${b.image}" class="beast-sprite-small" /></div>`;
        } else {
          seqHtml += `<div class="sequence-slot filled has-tooltip" data-tooltip="${safeTooltip}">${b.icon}</div>`;
        }
      });
      
      turnRow.innerHTML = `
        <div class="history-turn-info">
          <span>Turn ${turn.round}/3</span>
          <span class="dmg">Expected Dmg: ${Math.floor(turn.expectedDmg)}</span>
        </div>
        <div class="history-turn-seq">
          ${seqHtml}
        </div>
      `;
      card.appendChild(turnRow);
    });
    
    elHistoryList.appendChild(card);
  });
}

// Local-Only God Mode
const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

if (isLocalDev) {
  const godOverlay = document.createElement('div');
  godOverlay.className = 'god-mode-panel';
  godOverlay.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 10px; color: gold; text-shadow: 0 0 5px gold; text-align: center;">GOD MODE</div>
    <button id="btn-god-on" class="btn" style="width: 100%; margin-bottom: 5px; background: #333; color: gold; border-color: gold;">ACTIVATE</button>
    <button id="btn-god-off" class="btn hidden" style="width: 100%; background: #333; color: white;">DEACTIVATE</button>
  `;
  document.body.appendChild(godOverlay);

  const btnGodOn = document.getElementById('btn-god-on');
  const btnGodOff = document.getElementById('btn-god-off');

  const isGodMode = localStorage.getItem('antigravity_god_mode_flag') === 'true';
  if (isGodMode) {
    document.body.classList.add('god-mode-active');
    btnGodOn.classList.add('hidden');
    btnGodOff.classList.remove('hidden');
  }

  btnGodOn.addEventListener('click', () => {
    localStorage.setItem('antigravity_god_backup_state', JSON.stringify(state));
    localStorage.setItem('antigravity_god_backup_meta', JSON.stringify(metaState));
    localStorage.setItem('antigravity_god_mode_flag', 'true');

    metaState.dna = 9999999;
    
    import('./skilltree.js').then(module => {
      module.SKILL_TREE_DATA.forEach(skill => {
        metaState.skillTree[skill.id] = skill.maxLevel;
      });
      saveMetaState();
      if (skillTreeRenderer) skillTreeRenderer.render();
    });

    shopPool.forEach(poolItem => {
      const b = poolItem.factory();
      b.id = b.name + '_' + Math.random().toString(36).substr(2, 9);
      b.rarity = poolItem.rarity;
      state.beasts.push(b);
    });

    document.body.classList.add('god-mode-active');
    btnGodOn.classList.add('hidden');
    btnGodOff.classList.remove('hidden');

    saveState();
    saveMetaState();
    updateUI();
    renderBeasts();
    renderSequence();
    renderRelics();
    renderShop();
  });

  btnGodOff.addEventListener('click', () => {
    const backupState = localStorage.getItem('antigravity_god_backup_state');
    const backupMeta = localStorage.getItem('antigravity_god_backup_meta');
    
    if (backupState) state = JSON.parse(backupState);
    if (backupMeta) metaState = JSON.parse(backupMeta);
    
    localStorage.removeItem('antigravity_god_mode_flag');
    
    document.body.classList.remove('god-mode-active');
    btnGodOff.classList.add('hidden');
    btnGodOn.classList.remove('hidden');

    saveState();
    saveMetaState();
    updateUI();
    renderBeasts();
    renderSequence();
    renderRelics();
    renderShop();
    if (skillTreeRenderer) skillTreeRenderer.render();
  });
}

init();

