import { DOM } from './dom.js';
import { state, metaState } from '../engine/state.js';
import { getTooltipText } from './tooltips.js';
import { ACHIEVEMENTS } from '../achievements.js';
import { relicPool } from '../data/relics.js';
import { shopPool } from '../data/beasts.js';

export function renderAchievementsModal() {
  if (!DOM.elAchievementsList || !metaState) return;
  if (!metaState.achievements) metaState.achievements = [];
  DOM.elAchievementsList.innerHTML = '';
  
  let unlockedCount = 0;
  
  if (ACHIEVEMENTS && ACHIEVEMENTS.length > 0) {
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
      DOM.elAchievementsList.appendChild(card);
    });
    
    if (document.getElementById('achievements-count')) {
      document.getElementById('achievements-count').textContent = `${unlockedCount} / ${ACHIEVEMENTS.length}`;
    }
  }
  
  renderRelicsModal();
  renderBeastsModal();
}

function renderRelicsModal() {
  const list = document.getElementById('relics-list');
  if (!list || !metaState) return;
  if (!metaState.discoveredRelics) metaState.discoveredRelics = [];
  list.innerHTML = '';
  
  let unlockedCount = 0;
  
  relicPool.forEach(relic => {
    const isUnlocked = metaState.discoveredRelics.includes(relic.id);
    if (isUnlocked) unlockedCount++;
    
    const card = document.createElement('div');
    card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
    card.style.flexDirection = 'column';
    card.style.alignItems = 'center';
    card.style.textAlign = 'center';
    card.style.padding = '15px';
    
    const title = isUnlocked ? relic.name : '???';
    const desc = isUnlocked ? relic.desc : 'Undiscovered artifact.';
    const iconHtml = relic.image 
      ? `<img src="${relic.image}" style="width: 48px; height: 48px; object-fit: contain; filter: ${isUnlocked ? 'none' : 'brightness(0) invert(0.5)'}; opacity: ${isUnlocked ? 1 : 0.3};" onerror="this.style.display='none'; this.parentNode.textContent='${relic.icon}'" />` 
      : `<span style="font-size: 3rem; opacity: ${isUnlocked ? 1 : 0.3}; filter: ${isUnlocked ? 'none' : 'grayscale(100%)'};">${relic.icon}</span>`;
      
    card.innerHTML = `
      <div style="margin-bottom: 10px; height: 48px; display: flex; justify-content: center; align-items: center;">${iconHtml}</div>
      <div class="details" style="margin-left: 0;">
        <div class="title" style="color: ${isUnlocked ? '#fcd34d' : '#64748b'};">${title}</div>
        <div class="desc" style="font-size: 0.8rem; line-height: 1.2;">${desc}</div>
      </div>
    `;
    list.appendChild(card);
  });
  
  if (document.getElementById('relics-count')) {
    document.getElementById('relics-count').textContent = `${unlockedCount} / ${relicPool.length}`;
  }
}

function renderBeastsModal() {
  const list = document.getElementById('beasts-list');
  if (!list || !metaState) return;
  if (!metaState.discoveredBeasts) metaState.discoveredBeasts = [];
  list.innerHTML = '';
  
  let unlockedCount = 0;
  
  shopPool.forEach(entry => {
    // Generate the beast to get its info
    const b = entry.factory();
    const isUnlocked = metaState.discoveredBeasts.includes(b.name);
    if (isUnlocked) unlockedCount++;
    
    const card = document.createElement('div');
    card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
    card.style.flexDirection = 'column';
    card.style.alignItems = 'center';
    card.style.textAlign = 'center';
    card.style.padding = '15px';
    
    const title = isUnlocked ? b.name : '???';
    const desc = isUnlocked ? `[${b.rarity}]` : 'Undiscovered beast.';
    const iconHtml = b.image 
      ? `<img src="${b.image}" style="width: 64px; height: 64px; object-fit: contain; filter: ${isUnlocked ? 'none' : 'brightness(0) invert(0.5)'}; opacity: ${isUnlocked ? 1 : 0.3};" onerror="this.style.display='none'; this.parentNode.textContent='${b.icon}'" />` 
      : `<span style="font-size: 3rem; opacity: ${isUnlocked ? 1 : 0.3}; filter: ${isUnlocked ? 'none' : 'grayscale(100%)'};">${b.icon}</span>`;
      
    card.innerHTML = `
      <div style="margin-bottom: 10px; height: 64px; display: flex; justify-content: center; align-items: center;">${iconHtml}</div>
      <div class="details" style="margin-left: 0;">
        <div class="title rarity-${isUnlocked ? b.rarity.toLowerCase() : 'locked'}" style="color: ${isUnlocked ? '' : '#64748b'};">${title}</div>
        <div class="desc" style="font-size: 0.8rem; line-height: 1.2;">${desc}</div>
      </div>
    `;
    list.appendChild(card);
  });
  
  if (document.getElementById('beasts-count')) {
    document.getElementById('beasts-count').textContent = `${unlockedCount} / ${shopPool.length}`;
  }
}

export function renderHistoryModal() {
  if (!DOM.elHistoryList) return;
  DOM.elHistoryList.innerHTML = '';
  
  if (!state.runHistory || state.runHistory.length === 0) {
    DOM.elHistoryList.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 20px;">No history available yet. Compute rounds to see the algorithm history.</p>';
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
        let breakdownTooltip = getTooltipText(b);
        if (turn.actions) {
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
        
        const safeTooltip = breakdownTooltip.replace(/"/g, '&quot;');

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
    
    DOM.elHistoryList.appendChild(card);
  });
}
