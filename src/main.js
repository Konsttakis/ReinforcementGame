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

// --- Game State ---
let state = {
  level: 1,
  gold: 20, // Start with some gold to buy initial epochs
  epochs: 0,
  totalEpochsRun: 0,
  shopLevel: 1,
  upgradeCost: 20,
  shopOfferings: [],
  beasts: [
    makeBeast('Tanky', 5, 8, null, null, 'Common', '🐢'),
    makeBeast('Brawler', 10, 20, null, null, 'Common', '🥊'),
    makeBeast('Brawler', 10, 20, null, null, 'Common', '🥊')
  ]
};

let bossMaxHp = 40;
let bossHp = 40;

let bestSequence = [];
let bestExpectedDmg = 0;

// GA Params
const POP_SIZE = 20;

// --- DOM Elements ---
const elLevel = document.getElementById('level-display');
const elShopLevel = document.getElementById('shop-level-display');
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
const btnRunEpochs = document.getElementById('btn-run-epochs');
const btnFight = document.getElementById('btn-fight');
const canvas = document.getElementById('bump-chart');
const ctx = canvas.getContext('2d');

// --- GA State ---
let population = [];
let bestSequenceHistory = [];
const elOverlay = document.getElementById('screen-overlay');
const elOverlayContent = document.getElementById('overlay-content');
const elOverlayTitle = document.getElementById('overlay-title');
const elOverlayText = document.getElementById('overlay-text');
const btnRestart = document.getElementById('btn-restart');
const elToastContainer = document.getElementById('toast-container');

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
    btnRestart.onclick = () => location.reload();
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
  shuffle(state.beasts);
  rollShop();
  updateUI();
  renderShop();
  renderBeasts();
  bestSequence = [...state.beasts];
  renderFightArena();
}

// --- UI Updates ---
function updateUI() {
  elLevel.textContent = state.level;
  elShopLevel.textContent = state.shopLevel;
  elGold.textContent = state.gold;
  elEpochs.textContent = state.epochs;
  elBestDmg.textContent = bestExpectedDmg.toFixed(1);
  elBossHp.textContent = bossHp;
  elBossHpMax.textContent = bossMaxHp;
  elBossHpBar.style.width = `${Math.max(0, (bossHp / bossMaxHp) * 100)}%`;
}

function renderBeasts() {
  elBeastSlots.innerHTML = '';
  state.beasts.forEach((b, idx) => {
    const div = document.createElement('div');
    div.className = 'beast-item';
    div.innerHTML = `
      <div class="beast-header">
        <div class="beast-info">
          <div class="beast-name rarity-${b.rarity}">${b.icon} ${b.name}</div>
          <div class="beast-stats">Dmg: ${b.minDamage}-${b.maxDamage} ${b.appliesStatus ? `| Applies ${b.appliesStatus}` : ''} ${b.synergy ? `| ${b.synergy}` : ''}</div>
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
      if (!btnRunEpochs.disabled) {
        bestSequence = [...state.beasts];
        renderFightArena();
      }
    };

    elBeastSlots.appendChild(div);
  });
}

function renderFightArena(activeIndex = -1) {
  elArenaLeft.innerHTML = '';
  const activeSeq = bestSequence.slice(0, 5);
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
  { factory: () => makeBeast('Tanky', 5, 8, null, null, 'Common', '🐢', '#86efac'), rarity: 'Common' },
  { factory: () => makeBeast('Brawler', 10, 20, null, null, 'Common', '🥊', '#fca5a5'), rarity: 'Common' },
  { factory: () => makeBeast('Rat', 2, 6, null, null, 'Common', '🐀', '#d6d3d1'), rarity: 'Common' },
  { factory: () => makeBeast('Slime', 4, 8, null, null, 'Common', '💧', '#93c5fd'), rarity: 'Common' },
  { factory: () => makeBeast('Wolf', 8, 14, null, null, 'Common', '🐺', '#a8a29e'), rarity: 'Common' },
  { factory: () => makeBeast('Leech', 5, 10, 'VULNERABLE', null, 'Uncommon', '🦟', '#c084fc'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Cleric', 2, 5, null, 'BUFF_NEXT_20', 'Uncommon', '🧙', '#fde047'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Venomous', 5, 10, 'POISON', null, 'Uncommon', '🐍', '#4ade80'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Spider', 4, 8, 'POISON', null, 'Uncommon', '🕷️', '#22c55e'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Bear', 12, 18, null, null, 'Uncommon', '🐻', '#78716c'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Bat', 5, 12, 'VULNERABLE', null, 'Uncommon', '🦇', '#a855f7'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Fire Element', 10, 15, 'FIRE', null, 'Rare', '🔥', '#ef4444'), rarity: 'Rare' },
  { factory: () => makeBeast('Ice Element', 10, 15, 'ICE', null, 'Rare', '❄️', '#38bdf8'), rarity: 'Rare' },
  { factory: () => makeBeast('Electric Eel', 10, 15, 'SHOCK', null, 'Rare', '⚡', '#fbbf24'), rarity: 'Rare' },
  { factory: () => makeBeast('Earth Golem', 15, 25, null, null, 'Rare', '🪨', '#a8a29e'), rarity: 'Rare' },
  { factory: () => makeBeast('Frost Wyrm', 10, 20, 'ICE', null, 'Rare', '🐉', '#7dd3fc'), rarity: 'Rare' },
  { factory: () => makeBeast('Assassin', 5, 25, null, 'DOUBLE_IF_VULNERABLE', 'Rare', '🥷', '#52525b'), rarity: 'Rare' },
  { factory: () => makeBeast('Steam Roller', 15, 20, null, 'DOUBLE_IF_FIRE', 'Epic', '🚂', '#a1a1aa'), rarity: 'Epic' },
  { factory: () => makeBeast('Thunderbird', 15, 25, null, 'TRIPLE_IF_SHOCK', 'Epic', '🦅', '#fcd34d'), rarity: 'Epic' },
  { factory: () => makeBeast('Dragon', 20, 35, 'FIRE', 'DOUBLE_IF_FIRE', 'Epic', '🐲', '#dc2626'), rarity: 'Epic' },
  { factory: () => makeBeast('Paladin', 10, 15, null, 'BUFF_NEXT_40', 'Epic', '🛡️', '#fef08a'), rarity: 'Epic' },
  { factory: () => makeBeast('Gargoyle', 20, 30, null, 'CONSUME_POISON', 'Legendary', '🗿', '#57534e'), rarity: 'Legendary' },
  { factory: () => makeBeast('Reaper', 5, 15, null, 'DOUBLE_IF_POISONED', 'Legendary', '💀', '#000000'), rarity: 'Legendary' },
  { factory: () => makeBeast('Chimera', 15, 25, 'POISON', 'TRIPLE_IF_SHOCK', 'Legendary', '🦁', '#eab308'), rarity: 'Legendary' },
  { factory: () => makeBeast('Leviathan', 25, 40, 'VULNERABLE', 'DOUBLE_IF_VULNERABLE', 'Legendary', '🐋', '#0284c7'), rarity: 'Legendary' },
  { factory: () => makeBeast('Kraken', 30, 45, null, 'CONSUME_FIRE', 'Legendary', '🦑', '#db2777'), rarity: 'Legendary' }
];

function rollShop() {
  state.shopOfferings = [];
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
  refreshCard.innerHTML = `
    <span>Refresh</span>
    <span class="gold">5G</span>
  `;
  refreshCard.onclick = () => {
    if (state.gold >= 5) {
      state.gold -= 5;
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
      <h3 class="rarity-${randBeast.rarity}">${randBeast.icon} ${randBeast.name} <span style="font-size:0.7em">[${randBeast.rarity}]</span></h3>
      <p>Dmg: ${randBeast.minDamage}-${randBeast.maxDamage}</p>
      <p>${randBeast.appliesStatus ? `Applies ${randBeast.appliesStatus}` : ''}</p>
      <p>${randBeast.synergy ? `Synergy: ${randBeast.synergy}` : ''}</p>
      <button class="btn full-width">Buy (15 Gold)</button>
    `;
    card.querySelector('button').onclick = () => {
      if (state.beasts.length >= 8) {
        showToast("Your inventory is full (8 max)!");
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
  const activeSeq = seq.slice(0, 5);
  for (let i = 0; i < sims; i++) {
    total += calculateDamage(activeSeq, bossHp).totalDamage;
  }
  return total / sims;
}

function runEpochs() {
  if (state.epochs <= 0) {
    showToast("Not enough epochs! Buy more compute in the shop.");
    return;
  }

  btnRunEpochs.disabled = true;
  let currentGeneration = 0;
  const maxGenerations = Math.min(state.epochs, 50); // Run max 50 per click for visualization
  state.epochs -= maxGenerations;

  // Init population if first run or invalidated
  if (population.length === 0 || population[0].length !== state.beasts.length) {
    population = [];
    for (let i = 0; i < POP_SIZE; i++) {
      population.push([...state.beasts]);
      shuffle(population[i]);
    }
  }

  // Animation Loop
  function tick() {
    if (currentGeneration >= maxGenerations) {
      btnRunEpochs.disabled = false;
      updateUI();
      return;
    }

    // Evaluate
    const scored = population.map(seq => ({ seq, score: evaluateFitness(seq) }));
    scored.sort((a, b) => b.score - a.score); // Descending

    // Track best
    const prevSeq = bestSequence.slice(0, 5);
    if (scored[0].score > bestExpectedDmg) {
      bestExpectedDmg = scored[0].score;
      bestSequence = [...scored[0].seq];
    }

    // Always update Best Sequence slots
    const activeSeq = bestSequence.slice(0, 5);
    const slots = elBestSequenceDisplay.querySelectorAll('.sequence-slot');
    activeSeq.forEach((b, idx) => {
      const slot = slots[idx];
      const prevId = prevSeq[idx]?.id;
      const jumped = prevId && prevId !== b.id;

      slot.textContent = `${b.icon} ${b.name}`;
      slot.className = 'sequence-slot filled';
      if (jumped) {
        slot.classList.add('jumped');
        setTimeout(() => slot.classList.remove('jumped'), 500);
      }
    });
    // Clear unused slots
    for (let i = activeSeq.length; i < 5; i++) {
      slots[i].textContent = `${i + 1}`;
      slots[i].className = 'sequence-slot empty';
    }

    renderFightArena();

    // Render Matrix
    elMatrixView.innerHTML = '';
    for (let i = 0; i < Math.min(5, POP_SIZE); i++) {
      const isCulled = i >= POP_SIZE / 2;
      const div = document.createElement('div');
      div.className = `matrix-row ${isCulled ? 'culled' : ''}`;
      div.textContent = `[${scored[i].seq.map(b => b.name.substring(0, 3)).join('|')}] - Fit: ${scored[i].score.toFixed(1)}`;
      elMatrixView.appendChild(div);
    }

    // Chart Data
    state.totalEpochsRun++;
    bestSequenceHistory.push({
      epoch: state.totalEpochsRun,
      score: scored[0].score,
      seq: scored[0].seq.slice(0, 5)
    });
    if (bestSequenceHistory.length > 500) bestSequenceHistory.shift();
    drawBumpChart();

    // Selection & Crossover (Elitism + Top Half)
    const newPop = [];
    // Keep top 2 (Elitism)
    newPop.push([...scored[0].seq]);
    newPop.push([...scored[1].seq]);

    while (newPop.length < POP_SIZE) {
      // Select from top half
      const p1 = scored[Math.floor(Math.random() * (POP_SIZE / 2))].seq;
      const p2 = scored[Math.floor(Math.random() * (POP_SIZE / 2))].seq;

      const start = Math.floor(Math.random() * p1.length);
      const end = Math.floor(Math.random() * (p1.length - start)) + start + 1;
      let child = orderCrossover(p1, p2, start, end);

      if (Math.random() < 0.5) { // 50% mutation rate
        child = mutateSwap(child);
      }
      newPop.push(child);
    }
    population = newPop;
    currentGeneration++;
    updateUI();

    setTimeout(tick, 150); // Faster brutalist animation
  }

  tick();
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

  // Column centers aligned to the 5 grid slots above
  // Right-to-left orientation: index 0 is rightmost
  const colW = graphW / 5;
  const colCenters = [];
  for (let i = 0; i < 5; i++) {
    colCenters.push(MARGIN_LEFT + colW * (4 - i) + colW / 2);
  }

  // Draw stark vertical grid lines for position columns
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  colCenters.forEach(cx => {
    ctx.beginPath();
    ctx.moveTo(cx, MARGIN_TOP);
    ctx.lineTo(cx, requiredH - MARGIN_BOTTOM);
    ctx.stroke();
  });

  // Draw stark horizontal grid lines for epochs
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  for (let i = 0; i < numEpochs; i++) {
    const y = MARGIN_TOP + (numEpochs - 1 - i) * ROW_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(MARGIN_LEFT, y);
    ctx.lineTo(MARGIN_LEFT + graphW, y);
    ctx.stroke();
  }

  // Collect all unique beast IDs
  const allIds = new Set();
  bestSequenceHistory.forEach(h => h.seq.forEach(b => allIds.add(b.id)));

  // Assign colors and find names
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

  // Draw lines for each beast
  Array.from(allIds).forEach(id => {
    ctx.beginPath();
    ctx.strokeStyle = idColorMap[id];
    ctx.lineWidth = 4; // Bold brutalist lines
    ctx.lineJoin = 'round';
    let started = false;

    bestSequenceHistory.forEach((h, epochIdx) => {
      const posIdx = h.seq.findIndex(b => b.id === id);
      // Y: newest epoch (last in array) at top, oldest at bottom
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

    // Draw a dot at the most recent position
    const latest = bestSequenceHistory[bestSequenceHistory.length - 1];
    const latestPos = latest.seq.findIndex(b => b.id === id);
    if (latestPos !== -1) {
      const dotX = colCenters[latestPos];
      const dotY = MARGIN_TOP + 0; // newest is at top
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fillStyle = idColorMap[id];
      ctx.fill();
    }
  });

  // Draw epoch numbers & scores on the right margin
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

// --- Combat ---
function fight() {
  btnFight.disabled = true;
  elCombatLog.innerHTML = '';
  logCombat("--- COMBAT STARTED ---");
  logCombat(`Boss HP: ${bossHp}`);

  // Temporarily set beasts to bestSequence for visual
  state.beasts = [...bestSequence];
  renderBeasts();

  const activeSeq = bestSequence.slice(0, 5);

  // Fight! (Single simulation with actual variance)
  let currentStatuses = new Set();
  let index = 0;
  let nextBeastBuff = 0;

  function attackStep() {
    if (index >= activeSeq.length || bossHp <= 0) {
      finishCombat();
      return;
    }

    const beast = activeSeq[index];
    let minDmg = beast.minDamage + nextBeastBuff;
    let maxDmg = beast.maxDamage + nextBeastBuff;
    nextBeastBuff = 0;

    let dmg = Math.floor(Math.random() * (maxDmg - minDmg + 1)) + minDmg;
    let isCrit = false;

    // Fixed 10% base crit chance for variance demo
    if (Math.random() < 0.1) {
      dmg = Math.floor(dmg * 1.5);
      isCrit = true;
    }

    // Synergies
    if (beast.synergy === 'DOUBLE_IF_POISONED' && currentStatuses.has('POISON')) {
      dmg *= 2;
      logCombat(`${beast.name} exploits POISON!`, 'crit');
    }
    if (beast.synergy === 'DOUBLE_IF_FIRE' && currentStatuses.has('FIRE')) {
      dmg *= 2;
      logCombat(`${beast.name} exploits FIRE!`, 'crit');
    }
    if (beast.synergy === 'TRIPLE_IF_SHOCK' && currentStatuses.has('SHOCK')) {
      dmg *= 3;
      logCombat(`${beast.name} exploits SHOCK!`, 'crit');
    }
    if (beast.synergy === 'CONSUME_POISON' && currentStatuses.has('POISON')) {
      dmg += 50;
      currentStatuses.delete('POISON');
      logCombat(`${beast.name} consumed POISON for +50 Dmg!`, 'crit');
    }
    if (beast.synergy === 'BUFF_NEXT_20') {
      nextBeastBuff = 20;
      logCombat(`${beast.name} buffs next beast!`);
    }
    if (beast.synergy === 'DOUBLE_IF_VULNERABLE' && currentStatuses.has('VULNERABLE')) {
      dmg *= 2;
      logCombat(`${beast.name} exploits VULNERABLE!`, 'crit');
    }
    if (beast.synergy === 'CONSUME_FIRE' && currentStatuses.has('FIRE')) {
      dmg += 60;
      currentStatuses.delete('FIRE');
      logCombat(`${beast.name} consumed FIRE for +60 Dmg!`, 'crit');
    }
    if (beast.synergy === 'BUFF_NEXT_40') {
      nextBeastBuff = 40;
      logCombat(`${beast.name} mega-buffs next beast!`);
    }

    if (currentStatuses.has('VULNERABLE')) {
      dmg = Math.floor(dmg * 1.5);
    }

    bossHp -= dmg;
    logCombat(`${beast.name} attacks for ${dmg} damage! ${isCrit ? '(CRIT!)' : ''}`);

    if (beast.appliesStatus) {
      currentStatuses.add(beast.appliesStatus);
      logCombat(`${beast.name} applied ${beast.appliesStatus}!`);
    }

    updateUI();
    renderFightArena(index); // visually bump the active beast

    // Boss flash effect
    elArenaBoss.style.background = 'var(--danger)';
    setTimeout(() => { elArenaBoss.style.background = '#fff'; }, 150);

    index++;
    setTimeout(attackStep, 250);
  }

  attackStep();
}

function finishCombat() {
  renderFightArena(-1);
  if (bossHp <= 0) {
    logCombat("BOSS DEFEATED!", "kill");
    setTimeout(() => {
      showOverlay("Level Cleared!", "Congrats!", "win", false);
      setTimeout(() => {
        hideOverlay();
        state.level++;
        state.gold += 50 + (state.level * 10);
        bossMaxHp = Math.floor(40 * Math.pow(1.5, state.level - 1));
        bossHp = bossMaxHp;
        bestSequenceHistory = [];
        population = []; // Invalidate GA population for new level
        bestExpectedDmg = 0;
        rollShop();
        renderShop();
        updateUI();
        btnFight.disabled = false;
      }, 500); // Wait 500ms before removing the overlay
    }, 1000);
  } else {
    logCombat("YOU FAILED TO KILL THE BOSS.", "danger");
    setTimeout(() => {
      showOverlay("Game Over", "The Boss survived. Your beasts perished.", "loss", true);
    }, 1000);
  }
}

// Listeners
btnRunEpochs.addEventListener('click', runEpochs);
btnFight.addEventListener('click', fight);

init();
