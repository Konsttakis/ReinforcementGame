import { createBeast, calculateDamage } from './combat.js';
import { orderCrossover, mutateSwap } from './ga.js';
import { buyBeast, buyEpochs } from './economy.js';

function makeBeast(name, min, max, stat, syn, rarity) {
  const b = createBeast(name, min, max, stat, syn);
  b.rarity = rarity;
  return b;
}

// --- Game State ---
let state = {
  level: 1,
  gold: 20, // Start with some gold to buy initial epochs
  epochs: 0,
  shopLevel: 1,
  upgradeCost: 20,
  beasts: [
    makeBeast('Tanky', 5, 8, null, null, 'Common'),
    makeBeast('Brawler', 10, 20, null, null, 'Common'),
    makeBeast('Brawler', 10, 20, null, null, 'Common')
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
const elCombatLog = document.getElementById('combat-log');
const elMatrixView = document.getElementById('matrix-view');
const elBestSequenceDisplay = document.getElementById('best-sequence-display');
const elShopItems = document.getElementById('shop-items');
const btnRunEpochs = document.getElementById('btn-run-epochs');
const btnFight = document.getElementById('btn-fight');
const canvas = document.getElementById('ga-chart');
const ctx = canvas.getContext('2d');

// --- Chart State ---
let chartData = [];

// --- Init ---
function init() {
  shuffle(state.beasts);
  updateUI();
  generateShop();
  renderBeasts();
  bestSequence = [...state.beasts];
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
    const status = idx < 5 ? 'Active' : 'Bench';
    div.innerHTML = `
      <div class="beast-header">
        <div class="beast-info">
          <div class="beast-name rarity-${b.rarity}">[${status}] ${idx + 1}. ${b.name}</div>
          <div class="beast-stats">Dmg: ${b.minDamage}-${b.maxDamage} ${b.appliesStatus ? `| Applies ${b.appliesStatus}` : ''} ${b.synergy ? `| ${b.synergy}` : ''}</div>
        </div>
        <button class="btn-sell">Sell (5G)</button>
      </div>
    `;
    if (idx >= 5) div.style.opacity = '0.6';
    
    div.querySelector('.btn-sell').onclick = () => {
      if (btnFight.disabled && bossHp > 0) return; // Prevent selling during computing/fighting
      state.beasts.splice(idx, 1);
      state.gold += 5;
      updateUI();
      renderBeasts();
    };

    elBeastSlots.appendChild(div);
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
  () => makeBeast('Tanky', 5, 8, null, null, 'Common'),
  () => makeBeast('Brawler', 10, 20, null, null, 'Common'),
  () => makeBeast('Leech', 5, 10, 'VULNERABLE', null, 'Uncommon'),
  () => makeBeast('Cleric', 2, 5, null, 'BUFF_NEXT_20', 'Uncommon'),
  () => makeBeast('Venomous', 5, 10, 'POISON', null, 'Uncommon'),
  () => makeBeast('Fire Element', 10, 15, 'FIRE', null, 'Rare'),
  () => makeBeast('Ice Element', 10, 15, 'ICE', null, 'Rare'),
  () => makeBeast('Electric Eel', 10, 15, 'SHOCK', null, 'Rare'),
  () => makeBeast('Steam Roller', 15, 20, null, 'DOUBLE_IF_FIRE', 'Epic'),
  () => makeBeast('Thunderbird', 15, 25, null, 'TRIPLE_IF_SHOCK', 'Epic'),
  () => makeBeast('Gargoyle', 20, 30, null, 'CONSUME_POISON', 'Legendary'),
  () => makeBeast('Reaper', 5, 15, null, 'DOUBLE_IF_POISONED', 'Legendary')
];

function generateShop() {
  elShopItems.innerHTML = '';
  
  // Epoch item
  const epochCard = document.createElement('div');
  epochCard.className = 'shop-card';
  epochCard.innerHTML = `
    <h3>2 Epochs</h3>
    <p>Give the GA more compute time.</p>
    <button class="btn full-width">Buy (5 Gold)</button>
  `;
  epochCard.querySelector('button').onclick = () => {
    if (state.gold >= 5) {
      state.gold -= 5;
      state.epochs += 2;
      updateUI();
    } else {
      alert("Not enough gold!");
    }
  };
  elShopItems.appendChild(epochCard);

  // Upgrade Shop item
  if (state.shopLevel < 5) {
    const upgCard = document.createElement('div');
    upgCard.className = 'shop-card';
    upgCard.innerHTML = `
      <h3>Upgrade Shop</h3>
      <p>Unlock better beasts.</p>
      <button class="btn full-width">Buy (${state.upgradeCost} Gold)</button>
    `;
    upgCard.querySelector('button').onclick = () => {
      if (state.gold >= state.upgradeCost) {
        state.gold -= state.upgradeCost;
        state.shopLevel++;
        state.upgradeCost += 20;
        updateUI();
        generateShop();
      } else {
        alert("Not enough gold!");
      }
    };
    elShopItems.appendChild(upgCard);
  }

  const levelLimits = {
    1: ['Common', 'Uncommon'],
    2: ['Common', 'Uncommon', 'Rare'],
    3: ['Common', 'Uncommon', 'Rare', 'Epic'],
    4: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
    5: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']
  };
  const allowed = levelLimits[Math.min(state.shopLevel, 5)];

  // Random Beasts
  for (let i=0; i<3; i++) {
    let randBeast;
    while(true) {
      randBeast = shopPool[Math.floor(Math.random() * shopPool.length)]();
      if (allowed.includes(randBeast.rarity)) break;
    }
    
    randBeast.cost = 15;
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.innerHTML = `
      <h3 class="rarity-${randBeast.rarity}">${randBeast.name}</h3>
      <p>Dmg: ${randBeast.minDamage}-${randBeast.maxDamage}</p>
      <p>${randBeast.appliesStatus ? `Applies ${randBeast.appliesStatus}` : ''}</p>
      <p>${randBeast.synergy ? `Synergy: ${randBeast.synergy}` : ''}</p>
      <button class="btn full-width">Buy (15 Gold)</button>
    `;
    card.querySelector('button').onclick = () => {
      if (state.beasts.length >= 8) {
        alert("Your inventory is full (8 beasts max)!");
        return;
      }
      const oldGold = state.gold;
      state = buyBeast(state, randBeast);
      if (state.gold < oldGold) { // Success
        renderBeasts();
        updateUI();
        card.remove();
      }
    };
    elShopItems.appendChild(card);
  }
}

// --- GA Implementation ---

// Shuffle array
function shuffle(array) {
  let currentIndex = array.length,  randomIndex;
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
  for (let i=0; i<sims; i++) {
    total += calculateDamage(activeSeq, bossHp).totalDamage;
  }
  return total / sims;
}

function runEpochs() {
  if (state.epochs <= 0) {
    alert("Not enough epochs! Buy more compute in the shop.");
    return;
  }
  
  btnRunEpochs.disabled = true;
  let currentGeneration = 0;
  const maxGenerations = Math.min(state.epochs, 50); // Run max 50 per click for visualization
  state.epochs -= maxGenerations;
  
  // Init population if first run
  let population = [];
  for (let i = 0; i < POP_SIZE; i++) {
    population.push([...state.beasts]);
    shuffle(population[i]);
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
    let newBestFound = false;
    if (scored[0].score > bestExpectedDmg) {
      bestExpectedDmg = scored[0].score;
      bestSequence = [...scored[0].seq];
      newBestFound = true;
    }
    
    // Update Best Sequence UI
    if (newBestFound || currentGeneration === 0) {
      elBestSequenceDisplay.innerHTML = '';
      bestSequence.slice(0, 5).forEach(b => {
        const div = document.createElement('div');
        div.className = 'best-sequence-item highlight';
        div.textContent = b.name;
        elBestSequenceDisplay.appendChild(div);
      });
      setTimeout(() => {
        Array.from(elBestSequenceDisplay.children).forEach(c => c.classList.remove('highlight'));
      }, 500);
    }
    
    // Render Matrix
    elMatrixView.innerHTML = '';
    for (let i=0; i<Math.min(5, POP_SIZE); i++) {
      const isCulled = i >= POP_SIZE / 2;
      const div = document.createElement('div');
      div.className = `matrix-row ${isCulled ? 'culled' : ''}`;
      div.textContent = `[${scored[i].seq.map(b => b.name.substring(0,3)).join('|')}] - Fit: ${scored[i].score.toFixed(1)}`;
      elMatrixView.appendChild(div);
    }

    // Chart Data
    const avg = scored.reduce((sum, item) => sum + item.score, 0) / POP_SIZE;
    chartData.push({ best: bestExpectedDmg, avg });
    if (chartData.length > 50) chartData.shift();
    drawChart();

    // Selection & Crossover (Elitism + Top Half)
    const newPop = [];
    // Keep top 2 (Elitism)
    newPop.push([...scored[0].seq]);
    newPop.push([...scored[1].seq]);
    
    while(newPop.length < POP_SIZE) {
      // Select from top half
      const p1 = scored[Math.floor(Math.random() * (POP_SIZE/2))].seq;
      const p2 = scored[Math.floor(Math.random() * (POP_SIZE/2))].seq;
      
      const start = Math.floor(Math.random() * p1.length);
      const end = Math.floor(Math.random() * (p1.length - start)) + start + 1;
      let child = orderCrossover(p1, p2, start, end);
      
      if (Math.random() < 0.2) { // 20% mutation rate
        child = mutateSwap(child);
      }
      newPop.push(child);
    }
    population = newPop;
    currentGeneration++;
    updateUI();
    
    setTimeout(tick, 1000); // Slower animation (1 epoch per second)
  }
  
  tick();
}

function drawChart() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (chartData.length < 2) return;
  
  const minVal = 0;
  const maxVal = Math.max(...chartData.map(d => d.best)) * 1.2;
  
  const dx = canvas.width / (chartData.length - 1);
  const scaleY = val => canvas.height - (val / maxVal) * canvas.height;

  // Draw Avg (Blue)
  ctx.beginPath();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  chartData.forEach((d, i) => {
    if (i===0) ctx.moveTo(i * dx, scaleY(d.avg));
    else ctx.lineTo(i * dx, scaleY(d.avg));
  });
  ctx.stroke();

  // Draw Best (Green)
  ctx.beginPath();
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  chartData.forEach((d, i) => {
    if (i===0) ctx.moveTo(i * dx, scaleY(d.best));
    else ctx.lineTo(i * dx, scaleY(d.best));
  });
  ctx.stroke();
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

    if (currentStatuses.has('VULNERABLE')) {
      dmg = Math.floor(dmg * 1.5);
    }

    bossHp -= dmg;
    logCombat(`${beast.name} attacks for ${dmg} damage! ${isCrit?'(CRIT!)':''}`);
    
    if (beast.appliesStatus) {
      currentStatuses.add(beast.appliesStatus);
      logCombat(`${beast.name} applied ${beast.appliesStatus}!`);
    }

    updateUI();
    index++;
    setTimeout(attackStep, 500);
  }
  
  attackStep();
}

function finishCombat() {
  if (bossHp <= 0) {
    logCombat("BOSS DEFEATED!", "kill");
    setTimeout(() => {
      state.level++;
      state.gold += 50 + (state.level * 10);
      bossMaxHp = Math.floor(40 * Math.pow(1.5, state.level - 1));
      bossHp = bossMaxHp;
      chartData = [];
      bestExpectedDmg = 0;
      generateShop();
      updateUI();
      btnFight.disabled = false;
      alert(`Level ${state.level-1} Cleared! You earned gold.`);
    }, 1500);
  } else {
    logCombat("YOU FAILED TO KILL THE BOSS.", "danger");
    setTimeout(() => {
      alert("GAME OVER. The Boss survived. Refresh to restart.");
    }, 1000);
  }
}

// Listeners
btnRunEpochs.addEventListener('click', runEpochs);
btnFight.addEventListener('click', fight);

init();
