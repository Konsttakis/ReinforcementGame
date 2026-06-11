import { DOM } from './dom.js';
import { state, metaState } from '../engine/state.js';
import { shopPool } from '../data/beasts.js';
import { saveRunState } from '../engine/persistence.js';
import { updateUI, renderBeasts, renderBestSequenceUI, renderFightArena } from './combatRenderer.js';
import { renderShop } from './shopRenderer.js';
import { currentUser } from '../auth.js';

export function setupGodMode() {
  const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  if (isLocalDev) {
    if (!DOM.godOverlay) {
      const godOverlay = document.createElement('div');
      godOverlay.className = 'god-mode-panel';
      godOverlay.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 10px; color: gold; text-shadow: 0 0 5px gold; text-align: center;">GOD MODE</div>
        <button id="btn-god-on" class="btn gold full-width mb-1">ACTIVATE</button>
        <button id="btn-god-off" class="btn hidden full-width" style="background: #333; color: white;">DEACTIVATE</button>
      `;
      document.body.appendChild(godOverlay);
    }

    const btnGodOn = document.getElementById('btn-god-on');
    const btnGodOff = document.getElementById('btn-god-off');

    const isGodMode = localStorage.getItem('antigravity_god_mode_flag') === 'true';
    if (isGodMode) {
      document.body.classList.add('god-mode-active');
      btnGodOn.classList.add('hidden');
      btnGodOff.classList.remove('hidden');
    }

    btnGodOn.addEventListener('pointerdown', (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
      if (currentUser) {
        alert("God Mode is only available when playing locally (not logged in).");
        return;
      }
      localStorage.setItem('antigravity_god_backup_state', JSON.stringify(state));
      localStorage.setItem('antigravity_god_backup_meta', JSON.stringify(metaState));
      localStorage.setItem('antigravity_god_mode_flag', 'true');

      metaState.dna = 9999999;
      
      if (window.SKILL_TREE_DATA) {
        window.SKILL_TREE_DATA.forEach(skill => {
          metaState.skillTree[skill.id] = skill.maxLevel;
        });
        if (window.globalSaveMetaState) window.globalSaveMetaState();
        if (window.skillTreeRenderer) window.skillTreeRenderer.render();
      }

      shopPool.forEach(poolItem => {
        const b = poolItem.factory();
        b.id = b.name + '_' + Math.random().toString(36).substr(2, 9);
        b.rarity = poolItem.rarity;
        state.beasts.push(b);
      });

      document.body.classList.add('god-mode-active');
      btnGodOn.classList.add('hidden');
      btnGodOff.classList.remove('hidden');

      saveRunState();
      if (window.globalSaveMetaState) window.globalSaveMetaState();
      updateUI();
      renderBeasts();
      renderBestSequenceUI();
      renderFightArena();
      renderShop();
    });

    btnGodOff.addEventListener('pointerdown', (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
      const backupState = localStorage.getItem('antigravity_god_backup_state');
      const backupMeta = localStorage.getItem('antigravity_god_backup_meta');
      
      if (backupState) {
        const parsed = JSON.parse(backupState);
        for (const key in state) delete state[key];
        Object.assign(state, parsed);
      }
      if (backupMeta) {
        const parsed = JSON.parse(backupMeta);
        for (const key in metaState) delete metaState[key];
        Object.assign(metaState, parsed);
      }
      
      localStorage.removeItem('antigravity_god_mode_flag');
      
      document.body.classList.remove('god-mode-active');
      btnGodOff.classList.add('hidden');
      btnGodOn.classList.remove('hidden');

      saveRunState();
      if (window.globalSaveMetaState) window.globalSaveMetaState();
      updateUI();
      renderBeasts();
      renderBestSequenceUI();
      renderFightArena();
      renderShop();
      if (window.skillTreeRenderer) window.skillTreeRenderer.refresh(metaState);
    });
  }
}
