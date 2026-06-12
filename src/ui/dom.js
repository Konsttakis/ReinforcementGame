export const DOM = {
  // Stats & Display
  get elLevel() { return document.getElementById('level-display'); },
  get elDna() { return document.getElementById('dna-display'); },
  get elGold() { return document.getElementById('gold-display'); },
  get elEpochs() { return document.getElementById('epochs-display'); },
  get elBestDmg() { return document.getElementById('best-dmg-display'); },
  
  // Boss & Combat
  get elBossHp() { return document.getElementById('boss-hp-display'); },
  get elBossHpMax() { return document.getElementById('boss-hp-max'); },
  get elBossHpBar() { return document.getElementById('boss-hp-bar'); },
  get elArenaLeft() { return document.getElementById('arena-left'); },
  get elArenaBoss() { return document.getElementById('arena-boss'); },
  get elCombatLog() { return document.getElementById('combat-log'); },
  get elBossStance() { return document.getElementById('boss-stance-display'); },
  get btnFight() { return document.getElementById('btn-fight'); },
  get bossVideo() { return document.getElementById('boss-video'); },
  
  // Inventory & Sequence
  get elBeastSlots() { return document.getElementById('beast-slots'); },
  get elBestSequenceDisplay() { return document.getElementById('best-sequence-display'); },
  get elPreviousSequencesList() { return document.getElementById('previous-sequences-list'); },

  get elHistoricOrdersList() { return document.getElementById('historic-orders-list'); },
  get elInventoryHeader() { return document.getElementById('inventory-header'); },
  
  // Shop & Relics
  get elShopItems() { return document.getElementById('shop-items'); },
  get elShopActions() { return document.getElementById('shop-actions'); },
  get elRelicSlots() { return document.getElementById('relic-slots'); },
  get elRelicChoiceOverlay() { return document.getElementById('relic-choice-overlay'); },
  get elRelicOptions() { return document.getElementById('relic-options'); },
  get btnSkipRelic() { return document.getElementById('btn-skip-relic'); },
  
  // Lab
  get elLabOverlay() { return document.getElementById('lab-overlay'); },
  get btnOpenLab() { return document.getElementById('btn-open-lab'); },
  get btnCloseLab() { return document.getElementById('btn-close-lab'); },
  get elLabDna() { return document.getElementById('lab-dna-display'); },
  
  // Charts
  get canvas() { return document.getElementById('bump-chart'); },
  get convCanvas() { return document.getElementById('convergence-chart'); },
  
  // Overlays & UI
  get elOverlay() { return document.getElementById('screen-overlay'); },
  get elOverlayContent() { return document.getElementById('overlay-content'); },
  get elOverlayTitle() { return document.getElementById('overlay-title'); },
  get elOverlayText() { return document.getElementById('overlay-text'); },
  get btnRestart() { return document.getElementById('btn-restart'); },
  get elToastContainer() { return document.getElementById('toast-container'); },
  get elGlobalTooltip() { return document.getElementById('global-tooltip'); },

  // Mobile Action Popup
  get elMobileActionPopup() { return document.getElementById('mobile-action-popup'); },
  get elMobileActionTitle() { return document.getElementById('mobile-action-title'); },
  get elMobileActionDesc() { return document.getElementById('mobile-action-desc'); },
  get elMobileActionExtra() { return document.getElementById('mobile-action-extra'); },
  get btnMobileActionPrimary() { return document.getElementById('btn-mobile-action-primary'); },
  get btnMobileActionClose() { return document.getElementById('btn-mobile-action-close'); },
  
  // Settings
  get btnOpenSettings() { return document.getElementById('btn-open-settings'); },
  get btnCloseSettings() { return document.getElementById('btn-close-settings'); },
  get elSettingsOverlay() { return document.getElementById('settings-overlay'); },
  get chkAutoPlay() { return document.getElementById('chk-autoplay-turns'); },
  get chkAutoPlayRuns() { return document.getElementById('chk-autoplay-runs'); },
  get btnHardReset() { return document.getElementById('btn-hard-reset'); },
  get btnAbandonRun() { return document.getElementById('btn-abandon-run'); },
  
  // History
  get btnOpenHistory() { return document.getElementById('btn-open-history'); },
  get btnCloseHistory() { return document.getElementById('btn-close-history'); },
  get elHistoryOverlay() { return document.getElementById('history-overlay'); },
  get elHistoryList() { return document.getElementById('history-list'); },
  
  // Achievements
  get btnOpenAchievements() { return document.getElementById('btn-open-achievements'); },
  get btnCloseAchievements() { return document.getElementById('btn-close-achievements'); },
  get elAchievementsOverlay() { return document.getElementById('achievements-overlay'); },
  get elAchievementsList() { return document.getElementById('achievements-list'); },
  get elAchievementsCount() { return document.getElementById('achievements-count'); },
  
  // God Mode
  get godOverlay() { return document.querySelector('.god-mode-panel'); },
  get btnGodOn() { return document.getElementById('btn-god-on'); },
  get btnGodOff() { return document.getElementById('btn-god-off'); },
  
  // Auth & Leaderboard
  get elBtnAuth() { return document.getElementById('btn-auth'); },
  get elBtnLeaderboard() { return document.getElementById('btn-open-leaderboard'); },
  get elAuthOverlay() { return document.getElementById('auth-overlay'); },
  get elLeaderboardOverlay() { return document.getElementById('leaderboard-overlay'); },
  get elBtnCloseAuth() { return document.getElementById('btn-close-auth'); },
  get elBtnCloseLeaderboard() { return document.getElementById('btn-close-leaderboard'); },
  get elAuthLoginView() { return document.getElementById('auth-login-view'); },
  get elAuthLoggedInView() { return document.getElementById('auth-logged-in-view'); },
  get elAuthCurrentUsername() { return document.getElementById('auth-current-username'); },
  get btnGoogleLogin() { return document.getElementById('btn-google-login'); },
  get btnLogout() { return document.getElementById('btn-logout'); },
  get btnChangeUsername() { return document.getElementById('btn-change-username'); },
  get authNewUsername() { return document.getElementById('auth-new-username'); },
  get authError() { return document.getElementById('auth-error'); },
  get btnEmailLogin() { return document.getElementById('btn-email-login'); },
  get authEmail() { return document.getElementById('auth-email'); },
  get authPassword() { return document.getElementById('auth-password'); },
  get btnEmailRegister() { return document.getElementById('btn-email-register'); },
  get authUsername() { return document.getElementById('auth-username'); },
  get elLeaderboardList() { return document.getElementById('leaderboard-list'); },
  
  // Stats Panel
  get statHighestLevel() { return document.getElementById('stat-highest-level'); },
  get statRunsPlayed() { return document.getElementById('stat-runs-played'); },
  get statDnaCollected() { return document.getElementById('stat-dna-collected'); },
  get statBossesSlain() { return document.getElementById('stat-bosses-slain'); },
  get statHighestDamage() { return document.getElementById('stat-highest-damage'); },
  
  // Cloud Conflict
  get elConflictOverlay() { return document.getElementById('conflict-overlay'); },
  get elCloudInfo() { return document.getElementById('conflict-cloud-info'); },
  get elLocalInfo() { return document.getElementById('conflict-local-info'); },
  get btnConflictCloud() { return document.getElementById('btn-conflict-cloud'); },
  get btnConflictLocal() { return document.getElementById('btn-conflict-local'); }
};
