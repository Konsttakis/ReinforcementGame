// Achievements System

const ACHIEVEMENTS = [];

// 1. Progression: Levels (20 achievements)
for (let i = 5; i <= 100; i += 5) {
  ACHIEVEMENTS.push({
    id: `level_${i}`,
    name: `Deep Dive ${i}`,
    desc: `Reach Level ${i}.`,
    type: 'progression',
    hidden: false,
    condition: (s) => s.level >= i
  });
}

// 2. Economy: Gold Hoarding (17 achievements)
const goldMilestones = [100, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000, 100000000];
goldMilestones.forEach(g => {
  ACHIEVEMENTS.push({
    id: `gold_${g}`,
    name: `Dragon's Hoard: ${g}`,
    desc: `Accumulate ${g} Gold in a single run.`,
    type: 'economy',
    hidden: false,
    condition: (s) => s.gold >= g
  });
});

// 3. Economy: Shop Level (6 achievements)
for (let i = 2; i <= 7; i++) {
  ACHIEVEMENTS.push({
    id: `shop_${i}`,
    name: `Premium Client ${i}`,
    desc: `Upgrade the Shop to Level ${i}.`,
    type: 'economy',
    hidden: false,
    condition: (s) => s.shopLevel >= i
  });
}

// 4. Combat: Damage Dealt (22 achievements)
const dmgMilestones = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000, 25000000, 50000000, 100000000, 500000000, 1000000000, 5000000000];
dmgMilestones.forEach(d => {
  ACHIEVEMENTS.push({
    id: `dmg_${d}`,
    name: `Destructive Force: ${d}`,
    desc: `Compute a sequence with an expected damage of at least ${d}.`,
    type: 'combat',
    hidden: false,
    condition: (s) => typeof bestExpectedDmg !== 'undefined' && bestExpectedDmg >= d
  });
});

// 5. Genetics: Compute Epochs (20 achievements)
const epochMilestones = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2000000, 3000000, 4000000, 5000000, 6000000, 7000000, 8000000, 9000000, 10000000];
epochMilestones.forEach(e => {
  ACHIEVEMENTS.push({
    id: `epochs_${e}`,
    name: `Evolutionary Leap: ${e}`,
    desc: `Accumulate ${e} total compute epochs in a single run.`,
    type: 'genetic',
    hidden: false,
    condition: (s) => typeof s.totalEpochsRun !== 'undefined' && s.totalEpochsRun >= e
  });
});

// 6. Meta: DNA Collection (15 achievements)
const dnaMilestones = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000, 10000000, 50000000];
dnaMilestones.forEach(d => {
  ACHIEVEMENTS.push({
    id: `dna_${d}`,
    name: `Biomass Hoarder: ${d}`,
    desc: `Hold ${d} DNA in your meta-progression.`,
    type: 'meta',
    hidden: false,
    condition: (s, m) => m && m.dna >= d
  });
});

// 7. Inventory: Beasts (20 achievements)
const invMilestones = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 150];
invMilestones.forEach(inv => {
  ACHIEVEMENTS.push({
    id: `inv_${inv}`,
    name: `Beastmaster: ${inv}`,
    desc: `Have ${inv} beasts in your inventory at once.`,
    type: 'collection',
    hidden: false,
    condition: (s) => s.beasts && s.beasts.length >= inv
  });
});

// 8. Relics (20 achievements)
for (let i = 1; i <= 20; i++) {
  ACHIEVEMENTS.push({
    id: `relic_${i}`,
    name: `Artifact Collector ${i}`,
    desc: `Have ${i} relics active simultaneously.`,
    type: 'collection',
    hidden: false,
    condition: (s) => s.relics && s.relics.length >= i
  });
}

// 9. Easter Eggs & Hidden (26 Custom Achievements)
const easterEggs = [
  { id: 'ee_broke', name: 'Broke', desc: 'Have exactly 0 Gold.', type: 'hidden', condition: s => s.gold === 0 },
  { id: 'ee_pacifist', name: 'The Pacifist', desc: 'Compute a sequence with exactly 0 expected damage.', type: 'hidden', condition: s => typeof bestExpectedDmg !== 'undefined' && bestExpectedDmg === 0 && s.beasts.length > 0 },
  { id: 'ee_overkill_2x', name: 'Overkill', desc: 'Expected damage is at least 2x the Boss Max HP.', type: 'hidden', condition: s => typeof bestExpectedDmg !== 'undefined' && typeof bossMaxHp !== 'undefined' && bestExpectedDmg >= bossMaxHp * 2 },
  { id: 'ee_overkill_10x', name: 'Ludicrous Gibs', desc: 'Expected damage is at least 10x the Boss Max HP.', type: 'hidden', condition: s => typeof bestExpectedDmg !== 'undefined' && typeof bossMaxHp !== 'undefined' && bestExpectedDmg >= bossMaxHp * 10 },
  { id: 'ee_clutch', name: 'Calculated Risk', desc: 'Boss is alive with exactly 1 HP left.', type: 'hidden', condition: s => typeof bossHp !== 'undefined' && bossHp === 1 },
  { id: 'ee_common_only_10', name: 'The Purist', desc: 'Reach Level 10 with ONLY Common beasts in inventory.', type: 'hidden', condition: s => s.level >= 10 && s.beasts.length > 0 && s.beasts.every(b => b.rarity === "Common") },
  { id: 'ee_no_relics_20', name: 'Naked Run', desc: 'Reach Level 20 without acquiring a single relic.', type: 'hidden', condition: s => s.level >= 20 && s.relics.length === 0 },
  { id: 'ee_all_legendary', name: 'Legendary Board', desc: 'Have at least 5 Legendary beasts in your inventory.', type: 'hidden', condition: s => s.beasts && s.beasts.filter(b => b.rarity === "Legendary").length >= 5 },
  { id: 'ee_lucky_shop', name: 'Lucky Roll', desc: 'Roll a shop containing at least 2 Legendary beasts.', type: 'hidden', condition: s => s.shopOfferings && s.shopOfferings.filter(o => o.beast.rarity === "Legendary").length >= 2 },
  { id: 'ee_unlucky_shop', name: 'Cursed Shop', desc: 'Roll a Level 5+ Shop with ONLY Common beasts.', type: 'hidden', condition: s => s.shopLevel >= 5 && s.shopOfferings && s.shopOfferings.length > 0 && s.shopOfferings.every(o => o.beast.rarity === "Common") },
  { id: 'ee_speedrun_epoch', name: 'Zero Thinking', desc: 'Defeat a boss having computed exactly 0 epochs in the run.', type: 'hidden', condition: s => s.level > 1 && s.totalEpochsRun === 0 },
  { id: 'ee_clone_army', name: 'Clone Army', desc: 'Have 10 of the exact same beast in your inventory.', type: 'hidden', condition: s => {
      if(!s.beasts) return false;
      const counts = {};
      for(let b of s.beasts) { counts[b.name] = (counts[b.name] || 0) + 1; if(counts[b.name]>=10) return true; }
      return false;
  }},
  { id: 'ee_one_beast', name: 'Lone Wolf', desc: 'Reach Level 15 with only 1 beast in your inventory.', type: 'hidden', condition: s => s.level >= 15 && s.beasts && s.beasts.length === 1 },
  { id: 'ee_max_slots', name: 'The General', desc: 'Unlock all 8 combat arena slots.', type: 'hidden', condition: (s, m) => typeof getMaxSlots === "function" && getMaxSlots() >= 8 },
  { id: 'ee_first_death', name: 'First Blood (Yours)', desc: 'Die to a boss for the first time.', type: 'hidden', condition: s => typeof bossHp !== 'undefined' && bossHp > 0 && typeof combatRound !== 'undefined' && combatRound > 3 },
  { id: 'ee_max_shop_level', name: 'Monopoly', desc: 'Reach Shop Level 6.', type: 'hidden', condition: s => s.shopLevel >= 6 },
  { id: 'ee_cowardice', name: 'Tactical Retreat', desc: 'Have 5 Cowards in your inventory.', type: 'hidden', condition: s => s.beasts && s.beasts.filter(b => b.name === "Coward").length >= 5 },
  { id: 'ee_vanguard', name: 'Shield Wall', desc: 'Have 5 Vanguards in your inventory.', type: 'hidden', condition: s => s.beasts && s.beasts.filter(b => b.name === "Vanguard").length >= 5 },
  { id: 'ee_hoarder', name: 'Digital Hoarder', desc: 'Fill your inventory completely (cap reached).', type: 'hidden', condition: (s, m) => s.beasts && m && s.beasts.length >= 20 + (m.skillTree && m.skillTree["inv_cap"] ? m.skillTree["inv_cap"].level * 5 : 0) },
  { id: 'ee_round3_kill', name: 'Down to the Wire', desc: 'Kill the boss on exactly Round 3.', type: 'hidden', condition: s => typeof bossHp !== 'undefined' && bossHp <= 0 && typeof combatRound !== 'undefined' && combatRound === 3 },
  { id: 'ee_round1_kill', name: 'One Punch', desc: 'Kill the boss on Round 1.', type: 'hidden', condition: s => typeof bossHp !== 'undefined' && bossHp <= 0 && typeof combatRound !== 'undefined' && combatRound === 1 },
  { id: 'ee_broke_late', name: 'Poverty Simulator', desc: 'Have exactly 0 Gold on Level 50+.', type: 'hidden', condition: s => s.gold === 0 && s.level >= 50 },
  { id: 'ee_rich_early', name: 'Trust Fund', desc: 'Have 1000 Gold before Level 10.', type: 'hidden', condition: s => s.gold >= 1000 && s.level < 10 },
  { id: 'ee_dna_hoard', name: 'Genetic Ascendance', desc: 'Have 100,000 DNA unspent.', type: 'hidden', condition: (s, m) => m && m.dna >= 100000 },
  { id: 'ee_god_mode', name: 'The Architect', desc: 'Reach Level 100.', type: 'hidden', condition: s => s.level >= 100 },
  { id: 'ee_impossible', name: 'Schrodingers Boss', desc: 'Boss is dead but combat round is 4.', type: 'hidden', condition: s => typeof bossHp !== 'undefined' && bossHp <= 0 && typeof combatRound !== 'undefined' && combatRound === 4 }
];

easterEggs.forEach(e => {
  e.hidden = true;
  ACHIEVEMENTS.push(e);
});

// Initialization & Storage Logic
if (typeof metaState !== 'undefined' && !metaState.achievements) metaState.achievements = [];

function checkAchievements() {
  if (typeof state === 'undefined' || typeof metaState === 'undefined') return;
  
  let newlyUnlocked = false;

  for (const ach of ACHIEVEMENTS) {
    if (!metaState.achievements.includes(ach.id)) {
      try {
        if (ach.condition(state, metaState)) {
          metaState.achievements.push(ach.id);
          newlyUnlocked = true;
          triggerAchievementToast(ach);
        }
      } catch(e) {
        // Safe fail
      }
    }
  }

  if (newlyUnlocked) {
    saveMetaState();
    if (typeof renderAchievementsModal !== 'undefined') {
        renderAchievementsModal(); // Live update if open
    }
  }
}

function triggerAchievementToast(ach) {
  const t = document.createElement('div');
  t.className = 'achievement-toast';
  t.innerHTML = `
    <div class="ach-icon">🏆</div>
    <div class="ach-content">
      <div class="ach-title">Achievement Unlocked!</div>
      <div class="ach-name">${ach.name}</div>
    </div>
  `;
  
  const container = document.getElementById('toast-container');
  if(container) {
      container.appendChild(t);
      // Sound effect could go here
      setTimeout(() => {
        t.style.opacity = '0';
        setTimeout(() => t.remove(), 500);
      }, 4000);
  }
}
