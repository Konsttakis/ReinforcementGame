import gsap from 'gsap';
import { DOM } from './ui/dom.js';
import { shopPool } from './data/beasts.js';
import { state, metaState, saveMetaState } from './engine/state.js';
import { initSkillTree } from './skilltree-renderer.js';
import { loadMetaState, syncFromCloud, applyCloudData, keepLocalData } from './storage.js';
import { initAuth, signInWithGoogle, registerWithEmail, loginWithEmail, signOut, updateUsername, currentUser } from './auth.js';
import { fetchLeaderboard, updateHighestLevel } from './leaderboard.js';
import { ACHIEVEMENTS, checkAchievements } from './achievements.js';
import { executeRound, resetRun } from './engine/gameLoop.js';
import { loadRunState, clearRunState } from './engine/persistence.js';
import { renderBeasts, updateUI, renderFightArena, renderBestSequenceUI } from './ui/combatRenderer.js';
import { renderShop } from './ui/shopRenderer.js';
import { showToast } from './ui/overlayRenderer.js';
import { renderAchievementsModal, renderHistoryModal } from './ui/modals.js';
import { setupGodMode } from './ui/godMode.js';

window.imageCache = {};

// Expose globals for engine modules
window.checkAchievements = checkAchievements;
window.globalSaveMetaState = saveMetaState;
window.updateHighestLevel = updateHighestLevel;
window.gsap = gsap;

// Setup custom cursor
document.addEventListener('mousemove', (e) => {
  gsap.to('#custom-cursor', {
    x: e.clientX,
    y: e.clientY,
    xPercent: -50,
    yPercent: -50,
    duration: 0.1,
    ease: 'power2.out'
  });
});

function loadImage(src, retries = 3) {
  return new Promise((resolve) => {
    if (window.imageCache[src] && window.imageCache[src].complete && window.imageCache[src].naturalWidth > 0) {
      resolve(window.imageCache[src]);
      return;
    }
    const img = new Image();
    img.onload = () => {
      window.imageCache[src] = img;
      resolve(img);
    };
    img.onerror = () => {
      if (retries > 0) {
        console.warn(`[ImagePreload] Retrying ${src} (${retries} left)`);
        setTimeout(() => loadImage(src, retries - 1).then(resolve), 500);
      } else {
        console.error(`[ImagePreload] Failed to load ${src} after all retries`);
        resolve(null);
      }
    };
    img.src = src;
  });
}

async function preloadImages() {
  const imagePaths = new Set();

  // Collect all beast image paths
  shopPool.forEach(p => {
    const b = p.factory();
    if (b.image) imagePaths.add(b.image);
  });

  // Also preload the starter beast images (using the slug convention)
  ['vanguard', 'coward', 'scout', 'cheerleader'].forEach(name => {
    imagePaths.add(`assets/beasts/${name}.png`);
  });

  // Load all images in parallel with retry logic
  const results = await Promise.all(
    Array.from(imagePaths).map(src => loadImage(src))
  );

  const loaded = results.filter(r => r !== null).length;
  console.log(`[ImagePreload] ${loaded}/${imagePaths.size} images loaded successfully`);

  setTimeout(() => {
    window.skillTreeRenderer = initSkillTree(metaState, saveMetaState, () => {
      updateUI();
    });
  }, 100);

  updateUI();
  renderBeasts();
  renderShop();
}

async function init() {
  await preloadImages();
  await initAuth();
  await syncFromCloud();
  
  const loaded = loadMetaState();
  if (loaded) {
    for (const key in metaState) delete metaState[key];
    Object.assign(metaState, loaded);
  }
  
  if (!metaState.skillTree) metaState.skillTree = {};
  if (!metaState.settings) metaState.settings = { autoPlayTurns: false };
  if (!metaState.achievements) metaState.achievements = [];
  
  if (loadRunState()) {
    setTimeout(() => {
      window.skillTreeRenderer = initSkillTree(metaState, saveMetaState, () => {
        updateUI();
      });
    }, 100);

    if (DOM.elCombatLog) DOM.elCombatLog.innerHTML = '';
    if (DOM.elPreviousSequencesList) DOM.elPreviousSequencesList.innerHTML = '';
    
    renderBeasts();
    renderShop();
    renderFightArena();
    renderBestSequenceUI();
    updateUI();
    if (DOM.btnFight) DOM.btnFight.disabled = false;
    showToast("Run State Resumed!");
  } else {
    resetRun();
  }
}

// --- Event Listeners Setup ---

if (DOM.btnSkipRelic) DOM.btnSkipRelic.addEventListener('click', () => {
  DOM.elRelicChoiceOverlay.classList.add('hidden');
  if (DOM.btnFight) DOM.btnFight.disabled = false;
});

if (DOM.btnRestart) DOM.btnRestart.addEventListener('click', resetRun);

if (DOM.btnOpenLab) DOM.btnOpenLab.addEventListener('click', () => {
  if (window.skillTreeRenderer) window.skillTreeRenderer.refresh(metaState);
  DOM.elLabOverlay.classList.remove('hidden');
});
if (DOM.btnCloseLab) DOM.btnCloseLab.addEventListener('click', () => {
  DOM.elLabOverlay.classList.add('hidden');
});

if (DOM.btnAbandonRun) {
  DOM.btnAbandonRun.addEventListener('click', () => {
    if (confirm("Are you sure you want to abandon this run? You will start over at Level 1.")) {
      clearRunState();
      resetRun();
    }
  });
}

if (DOM.btnOpenAchievements) DOM.btnOpenAchievements.addEventListener('click', () => {
  renderAchievementsModal();
  DOM.elAchievementsOverlay.classList.remove('hidden');
});
if (DOM.btnCloseAchievements) DOM.btnCloseAchievements.addEventListener('click', () => {
  DOM.elAchievementsOverlay.classList.add('hidden');
});

document.body.addEventListener('click', (e) => {
  if (e.target.closest('button')) {
    setTimeout(checkAchievements, 50);
  }
});

if (DOM.btnFight) DOM.btnFight.addEventListener('click', executeRound);
if (DOM.elMutationSlider && DOM.elMutationSliderVal) {
  DOM.elMutationSlider.addEventListener('input', (e) => {
    DOM.elMutationSliderVal.textContent = e.target.value + '%';
  });
}

// Tooltips
document.body.addEventListener('mouseover', (e) => {
  const target = e.target.closest('.has-tooltip');
  if (target && DOM.elGlobalTooltip) {
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
      DOM.elGlobalTooltip.innerHTML = html;
      DOM.elGlobalTooltip.classList.remove('hidden');
      
      const rect = target.getBoundingClientRect();
      const tooltipRect = DOM.elGlobalTooltip.getBoundingClientRect();
      
      let x = rect.left + rect.width / 2 - tooltipRect.width / 2;
      let y = rect.bottom + 10;
      
      if (x < 10) x = 10;
      if (x + tooltipRect.width > window.innerWidth - 10) {
        x = window.innerWidth - tooltipRect.width - 10;
      }
      if (y + tooltipRect.height > window.innerHeight - 10) {
        y = rect.top - tooltipRect.height - 10;
      }
      
      DOM.elGlobalTooltip.style.left = `${x}px`;
      DOM.elGlobalTooltip.style.top = `${y}px`;
    }
  }
});

document.body.addEventListener('mouseout', (e) => {
  const target = e.target.closest('.has-tooltip');
  if (target && DOM.elGlobalTooltip) {
    if (!target.contains(e.relatedTarget)) {
      DOM.elGlobalTooltip.classList.add('hidden');
    }
  }
});

// 3D Tilt
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

// Boss Video
if (DOM.bossVideo) {
  DOM.bossVideo.pause();
  DOM.bossVideo.currentTime = 0;
  
  DOM.bossVideo.addEventListener('ended', () => {
    DOM.bossVideo.pause();
    DOM.bossVideo.currentTime = 0;
  });

  setInterval(() => {
    if (DOM.bossVideo.paused) {
      DOM.bossVideo.play().catch(e => console.error("Video play prevented:", e));
    }
  }, 7000);
}

// Settings
if (DOM.btnOpenSettings) DOM.btnOpenSettings.addEventListener('click', () => {
  if (DOM.chkAutoPlay) DOM.chkAutoPlay.checked = metaState.settings.autoPlayTurns || false;
  DOM.elSettingsOverlay.classList.remove('hidden');
});
if (DOM.btnCloseSettings) DOM.btnCloseSettings.addEventListener('click', () => {
  DOM.elSettingsOverlay.classList.add('hidden');
});
if (DOM.chkAutoPlay) DOM.chkAutoPlay.addEventListener('change', (e) => {
  metaState.settings.autoPlayTurns = e.target.checked;
  saveMetaState();
});

if (DOM.btnHardReset) {
  DOM.btnHardReset.addEventListener('click', () => {
    if (confirm("Are you absolutely sure you want to completely wipe all your progress? This cannot be undone.")) {
      localStorage.clear();
      window.location.reload();
    }
  });
}

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

// Run History
if (DOM.btnOpenHistory) DOM.btnOpenHistory.addEventListener('click', () => {
  renderHistoryModal();
  DOM.elHistoryOverlay.classList.remove('hidden');
});
if (DOM.btnCloseHistory) DOM.btnCloseHistory.addEventListener('click', () => {
  DOM.elHistoryOverlay.classList.add('hidden');
});

setupGodMode();

// Auth setup
if (DOM.elBtnAuth) DOM.elBtnAuth.addEventListener('click', () => DOM.elAuthOverlay.classList.remove('hidden'));
if (DOM.elBtnCloseAuth) DOM.elBtnCloseAuth.addEventListener('click', () => DOM.elAuthOverlay.classList.add('hidden'));

if (DOM.elBtnLeaderboard) {
  DOM.elBtnLeaderboard.addEventListener('click', async () => {
    DOM.elLeaderboardOverlay.classList.remove('hidden');
    if (DOM.elLeaderboardList) DOM.elLeaderboardList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">Fetching global scores...</div>';
    
    try {
      const players = await fetchLeaderboard();
      if (!players || players.length === 0) {
        if (DOM.elLeaderboardList) DOM.elLeaderboardList.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">No scores yet! Be the first!</div>';
        return;
      }
      
      let html = '';
      players.forEach((p, index) => {
        let rankColor = 'var(--text-main)';
        let rankIcon = '';
        if (index === 0) { rankColor = 'var(--gold)'; rankIcon = '🥇 '; }
        else if (index === 1) { rankColor = '#9ca3af'; rankIcon = '🥈 '; }
        else if (index === 2) { rankColor = '#b45309'; rankIcon = '🥉 '; }
        
        const username = p.username || 'Anonymous';
        const level = p.highest_level || 1;
        
        html += `
          <div style="display: flex; justify-content: space-between; padding: 12px 15px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-weight: bold; width: 30px; color: ${rankColor};">${index + 1}.</span>
              <span style="color: var(--text-main); font-weight: bold;">${rankIcon}${username}</span>
            </div>
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 1.2rem; color: var(--accent); font-weight: bold;">Lvl ${level}</span>
          </div>
        `;
      });
      if (DOM.elLeaderboardList) DOM.elLeaderboardList.innerHTML = html;
    } catch (err) {
      console.error('Leaderboard error:', err);
      if (DOM.elLeaderboardList) DOM.elLeaderboardList.innerHTML = '<div style="text-align: center; color: var(--danger); padding: 20px;">Failed to load leaderboard.</div>';
    }
  });
}

if (DOM.elBtnCloseLeaderboard) {
  DOM.elBtnCloseLeaderboard.addEventListener('click', () => DOM.elLeaderboardOverlay.classList.add('hidden'));
}

if (DOM.btnGoogleLogin) {
  DOM.btnGoogleLogin.addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      if (DOM.authError) DOM.authError.textContent = err.message;
    }
  });
}

export function updateAuthUI() {
  if (currentUser) {
    if (DOM.elBtnAuth) DOM.elBtnAuth.textContent = '👤 Profile';
    if (DOM.elAuthLoginView) DOM.elAuthLoginView.classList.add('hidden');
    if (DOM.elAuthLoggedInView) DOM.elAuthLoggedInView.classList.remove('hidden');
    if (DOM.elAuthCurrentUsername) {
      DOM.elAuthCurrentUsername.textContent = currentUser.user_metadata?.username || currentUser.email || 'User';
    }
    
    if (localStorage.getItem('antigravity_god_mode_flag') === 'true') {
      if (DOM.btnGodOff) DOM.btnGodOff.click();
    }
  } else {
    if (DOM.elBtnAuth) DOM.elBtnAuth.textContent = '👤 Login';
    if (DOM.elAuthLoginView) DOM.elAuthLoginView.classList.remove('hidden');
    if (DOM.elAuthLoggedInView) DOM.elAuthLoggedInView.classList.add('hidden');
  }
  
  if (DOM.statHighestLevel) DOM.statHighestLevel.textContent = metaState.highestLevel || state.level || 1;
  if (DOM.statRunsPlayed) DOM.statRunsPlayed.textContent = metaState.runsPlayed || 0;
  if (DOM.statDnaCollected) DOM.statDnaCollected.textContent = metaState.totalDnaCollected || metaState.dna || 0;
  if (DOM.statBossesSlain) DOM.statBossesSlain.textContent = metaState.bossesSlain || 0;
  if (DOM.statHighestDamage) DOM.statHighestDamage.textContent = Math.floor(metaState.highestDamage || 0);
}

// Ensure authUI responds to user state
window.updateAuthUI = updateAuthUI;

if (DOM.btnLogout) {
  DOM.btnLogout.addEventListener('click', async () => {
    await signOut();
    updateAuthUI();
  });
}

if (DOM.btnChangeUsername) {
  DOM.btnChangeUsername.addEventListener('click', async () => {
    const newName = DOM.authNewUsername.value;
    try {
      await updateUsername(newName);
      updateAuthUI();
      if (DOM.authError) DOM.authError.textContent = 'Username updated successfully!';
      setTimeout(() => { if (DOM.authError && DOM.authError.textContent === 'Username updated successfully!') DOM.authError.textContent = ''; }, 3000);
    } catch (err) {
      if (DOM.authError) DOM.authError.textContent = err.message;
    }
  });
}

if (DOM.btnEmailLogin) {
  DOM.btnEmailLogin.addEventListener('click', async () => {
    const email = DOM.authEmail.value;
    const pass = DOM.authPassword.value;
    try {
      await loginWithEmail(email, pass);
      updateAuthUI();
    } catch (err) {
      if (DOM.authError) DOM.authError.textContent = err.message;
    }
  });
}

if (DOM.btnEmailRegister) {
  DOM.btnEmailRegister.addEventListener('click', async () => {
    const email = DOM.authEmail.value;
    const pass = DOM.authPassword.value;
    const user = DOM.authUsername.value;
    try {
      await registerWithEmail(email, pass, user);
      updateAuthUI();
    } catch (err) {
      if (DOM.authError) DOM.authError.textContent = err.message;
    }
  });
}

window.addEventListener('saveConflict', (e) => {
  const { cloudData, localMeta, localRun, cloudTime, localTime } = e.detail;
  
  const cloudMeta = cloudData.meta_state || {};
  const cloudLevel = cloudData.run_state ? cloudData.run_state.level : 1;
  const cDate = new Date(cloudTime).toLocaleString();
  if (DOM.elCloudInfo) DOM.elCloudInfo.innerHTML = `Level: ${cloudLevel}<br/>DNA: ${cloudMeta.dna || 0}<br/>Saved: ${cDate}`;
  
  const locLevel = localRun ? localRun.level : 1;
  const lDate = localTime ? new Date(localTime).toLocaleString() : 'Unknown';
  if (DOM.elLocalInfo) DOM.elLocalInfo.innerHTML = `Level: ${locLevel}<br/>DNA: ${localMeta.dna || 0}<br/>Saved: ${lDate}`;
  
  if (DOM.elConflictOverlay) DOM.elConflictOverlay.classList.remove('hidden');
  
  if (DOM.btnConflictCloud) DOM.btnConflictCloud.onclick = () => {
    applyCloudData(cloudData);
    if (DOM.elConflictOverlay) DOM.elConflictOverlay.classList.add('hidden');
  };
  
  if (DOM.btnConflictLocal) DOM.btnConflictLocal.onclick = () => {
    keepLocalData();
    if (DOM.elConflictOverlay) DOM.elConflictOverlay.classList.add('hidden');
  };
});

init();
