import { DOM } from './dom.js';
import { state, metaState } from '../engine/state.js';
import { getTooltipText } from './tooltips.js';
import { ACHIEVEMENTS } from '../achievements.js';

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
    
    if (DOM.elAchievementsCount) {
      DOM.elAchievementsCount.textContent = `${unlockedCount} / ${ACHIEVEMENTS.length}`;
    }
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
