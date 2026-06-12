import { DOM } from './dom.js';
import { state, metaState, runState, getMaxSlots } from '../engine/state.js';
import { hasRelic } from '../utils.js';
import { getSkillEffect } from '../skilltree.js';
import { getTooltipText, getAbilityTitle } from './tooltips.js';
import { saveRunState } from '../engine/persistence.js';

let lastDnaAnim = -1;
let lastGoldAnim = -1;

export function renderBestSequenceUI() {
  if (!DOM.elBestSequenceDisplay) return;
  DOM.elBestSequenceDisplay.innerHTML = '';
  const activeSeq = runState.bestSequence.slice(0, getMaxSlots());
  
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
    DOM.elBestSequenceDisplay.appendChild(slot);
  }
}


export function updateUI() {
  if (DOM.elDna) {
    if (lastDnaAnim !== metaState.dna && lastDnaAnim !== -1 && metaState.dna > lastDnaAnim) {
      DOM.elDna.parentElement.classList.remove('pulse-scale');
      void DOM.elDna.parentElement.offsetWidth;
      DOM.elDna.parentElement.classList.add('pulse-scale');
    }
    DOM.elDna.textContent = metaState.dna;
    lastDnaAnim = metaState.dna;
  }
  if (DOM.elLevel) DOM.elLevel.textContent = state.level;
  
  if (DOM.elGold) {
    if (lastGoldAnim !== state.gold && lastGoldAnim !== -1 && state.gold > lastGoldAnim) {
      DOM.elGold.parentElement.classList.remove('pulse-scale');
      void DOM.elGold.parentElement.offsetWidth;
      DOM.elGold.parentElement.classList.add('pulse-scale');
    }
    DOM.elGold.textContent = state.gold;
    lastGoldAnim = state.gold;
  }
  
  if (DOM.elEpochs) DOM.elEpochs.textContent = state.epochs;
  if (DOM.elBestDmg) DOM.elBestDmg.textContent = runState.bestExpectedDmg.toFixed(1);
  if (DOM.elBossHp) DOM.elBossHp.textContent = runState.bossHp;
  if (DOM.elBossHpMax) DOM.elBossHpMax.textContent = runState.bossMaxHp;
  if (DOM.elBossHpBar) DOM.elBossHpBar.style.width = `${Math.max(0, (runState.bossHp / runState.bossMaxHp) * 100)}%`;

  if (DOM.elRelicSlots) {
    DOM.elRelicSlots.innerHTML = '';
    state.relics.forEach(r => {
      const rdiv = document.createElement('div');
      rdiv.className = 'relic-slot has-tooltip';
      if (r.image) {
        rdiv.innerHTML = `<img src="${r.image}" class="beast-sprite-small" />`;
      } else {
        rdiv.textContent = r.icon;
      }
      rdiv.setAttribute('data-tooltip', r.desc);
      DOM.elRelicSlots.appendChild(rdiv);
    });
  }

  if (DOM.elBossStance) {
    let displayStance = runState.currentStance === 'NONE' ? 'None' : runState.currentStance.replace(/_/g, ' ');
    let tooltipText = 'No active effects.';

    if (runState.currentStance === 'ARMORED') tooltipText = hasRelic('armor_piercing_rounds', state?.relics) ? 'Boss takes 30% reduced damage.' : 'Boss takes 50% reduced damage.';
    if (runState.currentStance === 'ETHEREAL') tooltipText = 'Beasts in Even slots (2, 4, 6, 8, 10) deal 0 damage.';
    if (runState.currentStance === 'DECAY') {
       const decayVal = 10 - getSkillEffect('res_stance_weak', metaState) * 2;
       tooltipText = `Each attack reduces the damage of subsequent beasts by ${decayVal}%.`;
    }
    if (runState.currentStance === 'MOMENTUM') {
       const momVal = getSkillEffect('res_momentum', metaState) > 0 ? 15 : 10;
       tooltipText = `Each attack increases the damage of subsequent beasts by ${momVal}%.`;
    }
    if (runState.currentStance === 'ANTI_MAGIC') tooltipText = hasRelic('anti_magic_amulet', state?.relics) ? 'Elemental beasts deal 50% reduced damage.' : 'Elemental beasts (FIRE, POISON, SHOCK, FROSTBITE) deal 0 damage.';

    DOM.elBossStance.textContent = `Stance: ${displayStance}`;
    DOM.elBossStance.classList.add('has-tooltip');
    DOM.elBossStance.setAttribute('data-tooltip', tooltipText);
    DOM.elBossStance.style.display = 'block';
  }



  if (DOM.btnFight) {
    if (runState.combatRound <= 3 && runState.bossHp > 0) {
      DOM.btnFight.textContent = `COMPUTE & EXECUTE TURN ${runState.combatRound}/3`;
    }
  }
}

export function renderBeasts() {
  const rarityVals = { 'Legendary': 5, 'Epic': 4, 'Rare': 3, 'Uncommon': 2, 'Common': 1 };
  state.beasts.sort((a, b) => {
    if (rarityVals[b.rarity] !== rarityVals[a.rarity]) {
      return rarityVals[b.rarity] - rarityVals[a.rarity];
    }
    return a.name.localeCompare(b.name);
  });

  const invHeader = DOM.elInventoryHeader;
  if (invHeader) {
    invHeader.textContent = `Your Inventory (${state.beasts.length} / 40)`;
  }
  
  if (!DOM.elBeastSlots) return;
  DOM.elBeastSlots.innerHTML = '';
  state.beasts.forEach((b, idx) => {
    const div = document.createElement('div');
    div.className = `beast-item beast-item-${b.rarity}`;
    const sellPrice = 5 + (getSkillEffect('eco_sell', metaState) * 3);
    div.innerHTML = `
      <div class="shop-card-icon">
        ${b.image ? `<img src="${b.image}" class="beast-sprite-large" />` : `<span class="beast-emoji-large">${b.icon}</span>`}
      </div>
      <div class="shop-card-info has-tooltip" data-tooltip="${getTooltipText(b).replace(/"/g, '&quot;')}">
        <h3 class="rarity-${b.rarity}">${b.name} <span style="font-size:0.7em">[${b.rarity}]</span></h3>
        <p>${getAbilityTitle(b)}</p>
      </div>
      <button class="btn danger btn-sell has-tooltip" data-tooltip="Sell Beast">Sell (${sellPrice}G)</button>
    `;

    div.querySelector('.btn-sell').addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      if (DOM.btnFight && DOM.btnFight.disabled && runState.bossHp > 0) return; // Prevent selling during computing/fighting
      let finalSellPrice = sellPrice;
      if (hasRelic('recycling_bin', state.relics) && b.cost) finalSellPrice = b.cost;
      state.beasts.splice(idx, 1);
      state.gold += finalSellPrice;
      if (hasRelic('supercomputer_cooling', state.relics)) state.epochs += 1;
      
      if (window.invalidatePopulation) window.invalidatePopulation();
      
      updateUI();
      renderBeasts();
      if (DOM.btnFight && !DOM.btnFight.disabled) {
        runState.bestSequence = [...state.beasts];
        renderFightArena();
      }
      saveRunState();
    });

    DOM.elBeastSlots.appendChild(div);
  });
}

export function renderFightArena(activeIndex = -1) {
  if (!DOM.elArenaLeft) return;
  DOM.elArenaLeft.innerHTML = '';
  const activeSeq = runState.bestSequence.slice(0, getMaxSlots());
  activeSeq.forEach((b, idx) => {
    const div = document.createElement('div');
    div.className = 'beast-icon has-tooltip';
    div.setAttribute('data-tooltip', `<b>${b.name}</b>\n${getTooltipText(b).replace(/"/g, '&quot;')}`);
    if (idx === activeIndex) div.classList.add('active');
    div.id = `arena-beast-${idx}`;
    let innerContent = b.image ? `<img src="${b.image}" class="beast-sprite-arena" />` : `<span class="beast-emoji-large">${b.icon}</span>`;
    div.innerHTML = `<div class="beast-sprite-container">${innerContent}</div>`;
    DOM.elArenaLeft.appendChild(div);
    
    // Idle animation
    if (window.gsap) {
      const container = div.querySelector('.beast-sprite-container');
      window.gsap.to(container, {
        y: -4 - Math.random() * 4,
        scaleY: 1.02 + Math.random() * 0.03,
        scaleX: 0.98 - Math.random() * 0.02,
        duration: 0.8 + Math.random() * 0.4,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        delay: Math.random() * 0.5
      });
    }
  });
}

export function logCombat(msg, type = 'normal', breakdownHtml = null) {
  if (!DOM.elCombatLog) return;
  const div = document.createElement('div');
  div.className = `log-entry ${type}`;
  div.innerHTML = msg; 
  div.dataset.level = state.level;
  
  if (breakdownHtml) {
    div.classList.add('has-combat-tooltip');
    div.classList.add('has-tooltip');
    div.setAttribute('data-tooltip', breakdownHtml.replace(/"/g, '&quot;'));
  }
  
  DOM.elCombatLog.appendChild(div);
  DOM.elCombatLog.scrollTop = DOM.elCombatLog.scrollHeight;
}

export function showFloatingText(text, type = 'normal', sourceElement = null) {
  const arena = DOM.elArenaBoss;
  if (!arena) return;
  const floatDiv = document.createElement('div');
  floatDiv.className = `floating-dmg ${type}`;
  floatDiv.textContent = text;
  
  const startX = (Math.random() - 0.5) * 40;
  
  let targetX, targetY;
  
  if (sourceElement) {
    const rect = sourceElement.getBoundingClientRect();
    targetX = rect.left + (rect.width / 2) + startX;
    targetY = rect.top;
  } else {
    const rect = arena.getBoundingClientRect();
    targetX = rect.left + 20 + startX;
    targetY = rect.top + 20; 
  }

  floatDiv.style.left = `${targetX}px`;
  floatDiv.style.top = `${targetY}px`;
  floatDiv.style.transform = 'translate(-50%, -50%)';
  floatDiv.style.opacity = 1;
  
  document.body.appendChild(floatDiv);
  setTimeout(() => floatDiv.remove(), 1200);

  // GSAP animation
  if (window.gsap) {
    window.gsap.to(floatDiv, {
      y: "-=60",
      x: "+=" + (Math.random() - 0.5) * 30,
      scale: 1.2,
      opacity: 0,
      duration: 1.2,
      ease: "power2.out",
      onComplete: () => floatDiv.remove()
    });
  } else {
    setTimeout(() => floatDiv.remove(), 1200);
  }
}
