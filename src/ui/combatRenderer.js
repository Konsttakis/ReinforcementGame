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
  renderHistoricOrders();
}

export function renderHistoricOrders() {
  const container = DOM.elHistoricOrdersList;
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
    let hasBinoculars = hasRelic('scouts_binoculars', state?.relics);
    let displayStance = runState.currentStance === 'NONE' ? 'None' : runState.currentStance.replace(/_/g, ' ').toLowerCase();
    let tooltipText = 'No active effects.';

    if (runState.currentStance !== 'NONE' && !hasBinoculars) {
       displayStance = '???';
       tooltipText = "Stance is hidden. Acquire Scout's Binoculars to reveal.";
    } else {
      if (runState.currentStance === 'ARMORED') tooltipText = hasRelic('armor_piercing_rounds', state?.relics) ? 'Boss takes 30% reduced damage.' : 'Boss takes 50% reduced damage.';
      if (runState.currentStance === 'FIRE_IMMUNITY') tooltipText = hasRelic('fireproof_vest', state?.relics) ? 'FIRE beasts deal 50% damage.' : 'FIRE beasts deal 0 damage.';
      if (runState.currentStance === 'POISON_WEAKNESS') tooltipText = 'POISON beasts deal double damage.';
      if (runState.currentStance === 'SHOCK_WEAKNESS') tooltipText = 'SHOCK beasts deal double damage.';
      if (runState.currentStance === 'VULNERABLE_WEAKNESS') tooltipText = 'VULNERABLE beasts deal double damage.';
    }

    DOM.elBossStance.textContent = `Stance: ${displayStance}`;
    DOM.elBossStance.classList.add('has-tooltip');
    DOM.elBossStance.setAttribute('data-tooltip', tooltipText);
    DOM.elBossStance.style.display = 'block';
  }

  if (DOM.elMutationControl) {
    if (getSkillEffect('gen_mutate', metaState) > 0) {
      DOM.elMutationControl.classList.remove('hidden');
    } else {
      DOM.elMutationControl.classList.add('hidden');
    }
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

    div.querySelector('.btn-sell').onclick = () => {
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
    };

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
  
  if (breakdownHtml) {
    div.classList.add('has-combat-tooltip');
    div.classList.add('has-tooltip');
    div.setAttribute('data-tooltip', breakdownHtml.replace(/"/g, '&quot;'));
  }
  
  DOM.elCombatLog.appendChild(div);
  DOM.elCombatLog.scrollTop = DOM.elCombatLog.scrollHeight;
}

export function showFloatingText(text, type = 'normal') {
  const arena = DOM.elArenaBoss;
  if (!arena) return;
  const floatDiv = document.createElement('div');
  floatDiv.className = `floating-dmg ${type}`;
  floatDiv.textContent = text;
  
  const startX = (Math.random() - 0.5) * 40;
  const startY = (Math.random() - 0.5) * 40;

  floatDiv.style.left = `calc(50% + ${startX}px)`;
  floatDiv.style.top = `calc(50% + ${startY}px)`;
  floatDiv.style.transform = 'translate(-50%, -50%) scale(0.5)';
  floatDiv.style.opacity = 1;
  
  arena.parentElement.appendChild(floatDiv);

  // GSAP animation
  if (window.gsap) {
    window.gsap.to(floatDiv, {
      y: startY - 60,
      x: startX + (Math.random() - 0.5) * 30,
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
