import { DOM } from './dom.js';
import { state, metaState, saveMetaState } from '../engine/state.js';
import { getSkillEffect } from '../skilltree.js';
import { hasRelic } from '../utils.js';
import { buyBeast } from '../economy.js';
import { rollShop } from '../engine/shopLogic.js';
import { getTooltipText, getAbilityTitle } from './tooltips.js';
import { showToast } from './overlayRenderer.js';
import { renderBeasts, updateUI, renderFightArena } from './combatRenderer.js';
import { saveRunState } from '../engine/persistence.js';
import { relicPool } from '../data/relics.js';

function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

export function renderShop() {
  if (!DOM.elShopItems || !DOM.elShopActions) return;
  DOM.elShopItems.innerHTML = '';
  DOM.elShopActions.innerHTML = '';

  // Refresh item
  const refreshCard = document.createElement('button');
  refreshCard.className = 'btn secondary shop-action-btn';
  const baseRefreshCost = hasRelic('golden_dice', state.relics) ? Math.max(1, 2 * state.shopLevel) : 5 * state.shopLevel;
  let refreshCost = Math.max(1, baseRefreshCost - getSkillEffect('eco_refresh', metaState));
  if (hasRelic('rusty_piggy_bank', state.relics)) refreshCost += 1;
  if (state.freeRerolls > 0) refreshCost = 0;
  
  refreshCard.innerHTML = `
    <span>Refresh</span>
    <span class="gold">${refreshCost === 0 ? 'FREE' : refreshCost + 'G'}</span>
  `;
  refreshCard.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
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
  });
  
  // Epoch item
  const epochCard = document.createElement('button');
  epochCard.className = 'btn secondary shop-action-btn';
  epochCard.innerHTML = `
    <span>+5 Epochs</span>
    <span class="gold">5G</span>
  `;
  epochCard.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const isGod = localStorage.getItem('antigravity_god_mode_flag') === 'true';
    if (state.gold >= 5 || isGod) {
      if (!isGod) state.gold -= 5;
      state.epochs += 5;
      updateUI();
      saveRunState();
    } else {
      showToast("Not enough gold!");
    }
  });
  
  // Upgrade Shop item
  if (state.shopLevel < 5) {
    let actualUpgCost = state.upgradeCost;
    if (hasRelic('vip_card', state.relics)) actualUpgCost = Math.floor(actualUpgCost * 0.8);
    
    const upgCard = document.createElement('button');
    upgCard.className = 'btn secondary shop-action-btn';
    upgCard.innerHTML = `
      <span>Upgrade Shop</span>
      <span class="gold">${actualUpgCost}G</span>
    `;
    upgCard.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
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
    });
    DOM.elShopActions.appendChild(upgCard);
  }
  
  DOM.elShopActions.appendChild(epochCard);
  DOM.elShopActions.appendChild(refreshCard);

  // Render Offerings
  if (state.shopOfferings) {
    state.shopOfferings.forEach((randBeast, idx) => {
      const card = document.createElement('div');
      card.className = `shop-card beast-item-${randBeast.rarity}`;
      card.style.position = 'relative';
      if (randBeast.isFrozen) card.style.boxShadow = '0 0 10px #38bdf8';
      card.innerHTML = `
        <div class="shop-card-freeze" style="position: absolute; top: 5px; right: 5px; cursor: pointer; font-size: 1.2em; filter: grayscale(${randBeast.isFrozen ? '0' : '100%'}); opacity: ${randBeast.isFrozen ? '1' : '0.3'};">❄️</div>
        <div class="shop-card-icon">
          ${randBeast.image ? `<img src="${randBeast.image}" class="beast-sprite-large" />` : `<span class="beast-emoji-large">${randBeast.icon}</span>`}
        </div>
        <div class="shop-card-info has-tooltip" data-tooltip="${getTooltipText(randBeast).replace(/"/g, '&quot;')}">
          <h3 class="rarity-${randBeast.rarity}">${randBeast.name} <span style="font-size:0.7em">[${randBeast.rarity}]</span></h3>
          <p>${getAbilityTitle(randBeast)}</p>
        </div>
        <button class="btn shop-buy-btn">${randBeast.cost}G</button>
      `;
      card.querySelector('.shop-card-freeze').addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        randBeast.isFrozen = !randBeast.isFrozen;
        renderShop();
      });
      card.querySelector('.shop-buy-btn').addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        if (state.beasts.length >= 40) {
          showToast("Your inventory is full (40 max)!");
          return;
        }
        const oldBeastCount = state.beasts.length;
        const newState = buyBeast(state, randBeast);
        for (const k in state) delete state[k];
        Object.assign(state, newState);
        if (state.beasts.length > oldBeastCount) { // Success
          state.shopOfferings.splice(idx, 1);
          if (hasRelic('counterfeit_coin', state.relics) && Math.random() < 0.05) {
            if (state.beasts.length < 40) {
              state.beasts.push({ ...randBeast, id: Math.random().toString(36).substr(2, 9) });
              showToast(`Counterfeit Coin activated! You got a duplicate!`);
            }
          }
          // Note: we'll have to expose population invalidation. 
          // For now, we'll assume gameLoop will handle population reset if lengths mismatch, which it does.
          if (window.invalidatePopulation && (!DOM.btnFight || !DOM.btnFight.disabled)) window.invalidatePopulation();
          
          renderBeasts();
          updateUI();
          renderShop();
          saveRunState();
          if (!metaState.discoveredBeasts) metaState.discoveredBeasts = [];
          if (!metaState.discoveredBeasts.includes(randBeast.name)) {
            metaState.discoveredBeasts.push(randBeast.name);
            saveMetaState();
          }
          
          showToast(`Bought ${randBeast.name}!`);
        } else {
          showToast("Not enough gold!");
        }
      });
      DOM.elShopItems.appendChild(card);
    });
  }
}

export function triggerRelicMilestone() {
  if (!DOM.elRelicOptions || !DOM.elRelicChoiceOverlay) return;
  DOM.elRelicOptions.innerHTML = '';
  
  const availableRelics = relicPool.filter(r => !state.relics.some(owned => owned.id === r.id));
  shuffle(availableRelics);
  const numChoices = Math.min(availableRelics.length, 3 + getSkillEffect('chaos_relic_extra', metaState));
  const options = availableRelics.slice(0, numChoices);
  
  let picksRemaining = 1 + getSkillEffect('chaos_double_relic', metaState);
  
  const levelReward = 50 + ((state.level - 1) * 10);
  if (state.level <= 20 && !options.some(r => r.cost <= levelReward)) {
    const cheapRelics = availableRelics.filter(r => r.cost <= levelReward);
    if (cheapRelics.length > 0) {
      options[0] = cheapRelics[0];
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
      <button class="btn primary full-width">Buy: ${relic.cost}G</button>
    `;
    const btn = card.querySelector('button');
    if (state.gold < relic.cost) {
      btn.disabled = true;
      btn.textContent = `Too Expensive (${relic.cost}G)`;
    }
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const isGod = localStorage.getItem('antigravity_god_mode_flag') === 'true';
      if ((state.gold >= relic.cost || isGod) && picksRemaining > 0) {
        if (!isGod) state.gold -= relic.cost;
        if (relic.id === 'rusty_piggy_bank') state.gold += 50;
        if (relic.id === 'ancestral_skull') {
           metaState.dna = (metaState.dna || 0) + 200;
           // We might need a saveMetaState call here.
           if (window.globalSaveMetaState) window.globalSaveMetaState();
        }
        state.relics.push(relic);
        if (!metaState.discoveredRelics) metaState.discoveredRelics = [];
        if (!metaState.discoveredRelics.includes(relic.id)) {
          metaState.discoveredRelics.push(relic.id);
          saveMetaState();
        }
        
        picksRemaining--;
        btn.disabled = true;
        btn.textContent = 'Acquired';
        card.style.opacity = '0.5';
        updateUI();
        showToast(`Acquired ${relic.name}!`);
        saveRunState();
        
        if (picksRemaining <= 0 || state.relics.length >= relicPool.length) {
          DOM.elRelicChoiceOverlay.classList.add('hidden');
          if (DOM.btnFight) DOM.btnFight.disabled = false;
        }
      }
    });
    DOM.elRelicOptions.appendChild(card);
  });
  
  DOM.elRelicChoiceOverlay.classList.remove('hidden');
}
