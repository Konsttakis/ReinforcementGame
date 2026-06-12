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
import { getTooltipText, getAbilityTitle, getTooltipExtraHtml } from './ui/tooltips.js';

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

if (DOM.btnSkipRelic) DOM.btnSkipRelic.addEventListener('pointerdown', (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
  DOM.elRelicChoiceOverlay.classList.add('hidden');
  if (DOM.btnFight) DOM.btnFight.disabled = false;
});

if (DOM.btnRestart) DOM.btnRestart.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; e.preventDefault(); resetRun(e); });

if (DOM.btnOpenLab) DOM.btnOpenLab.addEventListener('pointerdown', (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
  if (window.skillTreeRenderer) window.skillTreeRenderer.refresh(metaState);
  DOM.elLabOverlay.classList.remove('hidden');
});
if (DOM.btnCloseLab) DOM.btnCloseLab.addEventListener('pointerdown', (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
  DOM.elLabOverlay.classList.add('hidden');
});

if (DOM.btnAbandonRun) {
  DOM.btnAbandonRun.addEventListener('pointerdown', (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
    if (confirm("Are you sure you want to abandon this run? You will start over at Level 1.")) {
      clearRunState();
      resetRun();
    }
  });
}

if (DOM.btnOpenAchievements) DOM.btnOpenAchievements.addEventListener('pointerdown', (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
  renderAchievementsModal();
  DOM.elAchievementsOverlay.classList.remove('hidden');
});
if (DOM.btnCloseAchievements) DOM.btnCloseAchievements.addEventListener('pointerdown', (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
  DOM.elAchievementsOverlay.classList.add('hidden');
});

document.body.addEventListener('pointerdown', (e) => { if (e.button !== 0) return;
  if (e.target.closest('button')) {
    setTimeout(checkAchievements, 50);
  }
});

if (DOM.btnFight) DOM.btnFight.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; e.preventDefault(); executeRound(e); });
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
      
      const extraHtml = getTooltipExtraHtml(text);
      if (extraHtml) {
        html += `<div style="border-left: 1px dashed #555; padding-left: 15px; width: 220px; font-size: 0.8rem; color: #bbb;">`;
        html += extraHtml;
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

// Mobile Action Popup (Tooltips & Shop interactions)
document.body.addEventListener('pointerdown', (e) => {
  if (window.innerWidth > 768) return; // Only on mobile
  
  // Exclude buttons in the top bar to avoid catching things we shouldn't
  if (e.target.closest('button.btn-sm') || e.target.closest('.lab-header')) return;
  
  const shopCard = e.target.closest('.shop-card');
  const tooltipTarget = e.target.closest('.has-tooltip');
  
  if (shopCard && DOM.elMobileActionPopup) {
    e.preventDefault(); // Stop normal event flow
    const tooltipText = shopCard.querySelector('.has-tooltip')?.getAttribute('data-tooltip') || '';
    const name = shopCard.querySelector('h3')?.innerText || 'Shop Item';
    
    DOM.elMobileActionTitle.innerText = name;
    DOM.elMobileActionDesc.innerHTML = tooltipText.replace(/\n/g, '<br>');
    
    const extraHtml = getTooltipExtraHtml(tooltipText);
    if (extraHtml && DOM.elMobileActionExtra) {
      DOM.elMobileActionExtra.innerHTML = extraHtml;
      DOM.elMobileActionExtra.style.display = 'block';
    } else if (DOM.elMobileActionExtra) {
      DOM.elMobileActionExtra.style.display = 'none';
    }
    
    const actualBuyBtn = shopCard.querySelector('.shop-buy-btn');
    if (actualBuyBtn) {
      DOM.btnMobileActionPrimary.classList.remove('hidden');
      DOM.btnMobileActionPrimary.innerText = 'Buy - ' + actualBuyBtn.innerText;
      DOM.btnMobileActionPrimary.onclick = () => {
         actualBuyBtn.dispatchEvent(new PointerEvent('pointerdown', { button: 0 }));
         DOM.elMobileActionPopup.classList.add('hidden');
      };
    } else {
      DOM.btnMobileActionPrimary.classList.add('hidden');
    }
    
    DOM.elMobileActionPopup.classList.remove('hidden');
    return;
  }
  
  if (tooltipTarget && DOM.elMobileActionPopup) {
    // Regular tooltip on mobile
    const text = tooltipTarget.getAttribute('data-tooltip');
    if (text) {
      DOM.elMobileActionTitle.innerText = "Information";
      DOM.elMobileActionDesc.innerHTML = text.replace(/\n/g, '<br>');
      
      const extraHtml = getTooltipExtraHtml(text);
      if (extraHtml && DOM.elMobileActionExtra) {
        DOM.elMobileActionExtra.innerHTML = extraHtml;
        DOM.elMobileActionExtra.style.display = 'block';
      } else if (DOM.elMobileActionExtra) {
        DOM.elMobileActionExtra.style.display = 'none';
      }
      
      DOM.btnMobileActionPrimary.classList.add('hidden');
      DOM.elMobileActionPopup.classList.remove('hidden');
    }
  }
});

if (DOM.btnMobileActionClose) {
  DOM.btnMobileActionClose.addEventListener('pointerdown', () => {
    DOM.elMobileActionPopup.classList.add('hidden');
  });
}

// Global Escape Key Handler
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // Close tooltips and mobile popups
    if (DOM.elGlobalTooltip) DOM.elGlobalTooltip.classList.add('hidden');
    if (DOM.elMobileActionPopup) DOM.elMobileActionPopup.classList.add('hidden');
    
    // Close overlays
    if (DOM.elSettingsOverlay && !DOM.elSettingsOverlay.classList.contains('hidden')) DOM.elSettingsOverlay.classList.add('hidden');
    if (DOM.elAchievementsOverlay && !DOM.elAchievementsOverlay.classList.contains('hidden')) DOM.elAchievementsOverlay.classList.add('hidden');
    if (DOM.elHistoryOverlay && !DOM.elHistoryOverlay.classList.contains('hidden')) DOM.elHistoryOverlay.classList.add('hidden');
    
    // Special handling for lab overlay to also pause/resume game correctly
    const labOverlay = document.getElementById('lab-overlay');
    if (labOverlay && !labOverlay.classList.contains('hidden')) {
      labOverlay.classList.add('hidden');
    }
    
    // Special handling for skill purchase modal
    const skillModal = document.getElementById('skill-purchase-modal');
    if (skillModal && !skillModal.classList.contains('hidden')) {
      skillModal.classList.add('hidden');
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
if (DOM.btnOpenSettings) DOM.btnOpenSettings.addEventListener('pointerdown', (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
  if (DOM.chkAutoPlay) DOM.chkAutoPlay.checked = metaState.settings.autoPlayTurns || false;
  if (DOM.chkAutoPlayRuns) DOM.chkAutoPlayRuns.checked = metaState.settings.autoPlayRuns || false;
  DOM.elSettingsOverlay.classList.remove('hidden');
});
if (DOM.btnCloseSettings) DOM.btnCloseSettings.addEventListener('pointerdown', (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
  DOM.elSettingsOverlay.classList.add('hidden');
});
if (DOM.chkAutoPlay) DOM.chkAutoPlay.addEventListener('change', (e) => {
  metaState.settings.autoPlayTurns = e.target.checked;
  saveMetaState();
});
if (DOM.chkAutoPlayRuns) DOM.chkAutoPlayRuns.addEventListener('change', (e) => {
  metaState.settings.autoPlayRuns = e.target.checked;
  saveMetaState();
});

if (DOM.btnHardReset) {
  DOM.btnHardReset.addEventListener('pointerdown', (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
    if (confirm("Are you absolutely sure you want to completely wipe all your progress? This cannot be undone.")) {
      localStorage.clear();
      window.location.reload();
    }
  });
}

const tabBtns = document.querySelectorAll('.settings-tab-btn');
const tabPanes = document.querySelectorAll('.settings-tab-pane');
tabBtns.forEach(btn => {
  btn.addEventListener('pointerdown', (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanes.forEach(p => p.classList.add('hidden'));
    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(`settings-tab-${tabId}`).classList.remove('hidden');
  });
});

// Console Tabs Logic (Algorithm / Camp)
const consoleTabBtns = document.querySelectorAll('.console-tab');
const consoleTabPanes = document.querySelectorAll('.tab-pane');
consoleTabBtns.forEach(btn => {
  btn.addEventListener('pointerdown', (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
    consoleTabBtns.forEach(b => {
      b.classList.remove('active');
      b.style.opacity = '0.6';
      b.style.background = '';
    });
    consoleTabPanes.forEach(p => {
      p.style.display = 'none';
      p.classList.remove('active');
    });
    
    btn.classList.add('active');
    btn.style.opacity = '1';
    btn.style.background = 'var(--panel-bg)';
    
    const targetId = btn.getAttribute('data-target');
    const targetPane = document.getElementById(targetId);
    if (targetPane) {
      targetPane.style.display = 'flex';
      targetPane.classList.add('active');
    }
  });
});

// Run History
if (DOM.btnOpenHistory) DOM.btnOpenHistory.addEventListener('pointerdown', (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
  renderHistoryModal();
  DOM.elHistoryOverlay.classList.remove('hidden');
});
if (DOM.btnCloseHistory) DOM.btnCloseHistory.addEventListener('pointerdown', (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
  DOM.elHistoryOverlay.classList.add('hidden');
});

setupGodMode();

// Auth setup
if (DOM.elBtnAuth) DOM.elBtnAuth.addEventListener('click', () => DOM.elAuthOverlay.classList.remove('hidden'));
if (DOM.elBtnCloseAuth) DOM.elBtnCloseAuth.addEventListener('click', () => DOM.elAuthOverlay.classList.add('hidden'));

if (DOM.elBtnLeaderboard) {
  DOM.elBtnLeaderboard.addEventListener('pointerdown', async (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
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
  DOM.btnGoogleLogin.addEventListener('pointerdown', async (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
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
      if (DOM.btnGodOff) DOM.btnGodOff.dispatchEvent(new PointerEvent('pointerdown', {button: 0, bubbles: true}));
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
  DOM.btnLogout.addEventListener('pointerdown', async (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
    await signOut();
    updateAuthUI();
  });
}

if (DOM.btnChangeUsername) {
  DOM.btnChangeUsername.addEventListener('pointerdown', async (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
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
  DOM.btnEmailLogin.addEventListener('pointerdown', async (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
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
  DOM.btnEmailRegister.addEventListener('pointerdown', async (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();
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
  
  if (DOM.btnConflictCloud) DOM.btnConflictCloud.onpointerdown = (e) => {
    if (e.button !== 0) return; e.preventDefault();
    applyCloudData(cloudData);
    if (DOM.elConflictOverlay) DOM.elConflictOverlay.classList.add('hidden');
  };
  
  if (DOM.btnConflictLocal) DOM.btnConflictLocal.onpointerdown = (e) => {
    if (e.button !== 0) return; e.preventDefault();
    keepLocalData();
    if (DOM.elConflictOverlay) DOM.elConflictOverlay.classList.add('hidden');
  };
});

init();
window.addEventListener('resize', () => { import('./ui/shiftLines.js').then(m => m.drawSequenceShiftLines()); });
