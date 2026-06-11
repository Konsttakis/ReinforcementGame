import { DOM } from '../ui/dom.js';
import { state, metaState, runState, getPopSize, getMaxSlots, saveMetaState } from './state.js';
import { hasRelic } from '../utils.js';
import { getSkillEffect } from '../skilltree.js';
import { mutateSwap, orderCrossover, evaluateFitness } from './ga.js';
import { drawBumpChart, drawConvergenceChart } from '../ui/gaRenderer.js';
import { renderBestSequenceUI, renderBeasts, renderFightArena, updateUI, logCombat, showFloatingText } from '../ui/combatRenderer.js';
import { showOverlay, hideOverlay, showToast } from '../ui/overlayRenderer.js';
import { rollShop } from './shopLogic.js';
import { renderShop, triggerRelicMilestone } from '../ui/shopRenderer.js';
import { saveRunState, clearRunState } from './persistence.js';
import { calculateDamage } from '../combat.js';
import { makeBeast, shopPool } from '../data/beasts.js';

let population = [];
let bestSequenceHistory = [];
let preservedBeast = null;

const BOSS_STANCES = ['NONE', 'ARMORED', 'FIRE_IMMUNITY', 'POISON_WEAKNESS', 'SHOCK_WEAKNESS', 'VULNERABLE_WEAKNESS'];

// Expose invalidation
export function invalidatePopulation() {
  population = [];
}
window.invalidatePopulation = invalidatePopulation;

function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

export async function executeRound() {
  if (state.beasts.length === 0) return;
  if (DOM.btnFight) DOM.btnFight.disabled = true;
  if (DOM.elCombatLog) DOM.elCombatLog.innerHTML = '';
  if (DOM.elPreviousSequencesList) DOM.elPreviousSequencesList.innerHTML = '';
  
  logCombat(`--- TURN ${runState.combatRound}/3 STARTED ---`);
  const displayStance = runState.currentStance === 'NONE' ? 'None' : runState.currentStance.replace(/_/g, ' ');
  logCombat(`Boss Stance: ${displayStance}`);
  logCombat(`Boss HP: ${runState.bossHp}`);

  let epochsToRun = state.epochs;
  if (hasRelic('overclocked_cpu', state.relics)) epochsToRun += 50;
  
  if (epochsToRun > 0) {
    logCombat(`Computing ${epochsToRun} epochs...`);
    if (population.length === 0 || population[0].length !== state.beasts.length) {
      population = [];
      for (let i = 0; i < getPopSize(); i++) {
        population.push([...state.beasts]);
        shuffle(population[i]);
      }
    }

    let populationHistory = [];
    for (let gen = 0; gen < epochsToRun; gen++) {
      const sims = 10 + getSkillEffect('gen_sims', metaState) * 5;
      const scored = population.map(seq => ({ seq, score: evaluateFitness(seq, sims, getMaxSlots(), runState.bossHp, runState.currentStance, runState.globalStatuses, state, metaState) }));
      scored.sort((a, b) => b.score - a.score);

      populationHistory.push({
        scores: scored.map(s => s.score),
        bestSeq: scored[0].seq.slice(0, getMaxSlots())
      });

      if (scored[0].score > runState.bestExpectedDmg) {
        runState.bestExpectedDmg = scored[0].score;
        runState.bestSequence = [...scored[0].seq];
      }

      if (getSkillEffect('gen_cap', metaState) > 0) {
        if (!state.allTimeBestSequence) state.allTimeBestSequence = { seq: [...runState.bestSequence], score: runState.bestExpectedDmg };
        else if (runState.bestExpectedDmg > state.allTimeBestSequence.score) {
           state.allTimeBestSequence = { seq: [...runState.bestSequence], score: runState.bestExpectedDmg };
        }
      }

      const newPop = [];
      let elitesToKeep = 1 + getSkillEffect('gen_elite', metaState);
      if (hasRelic('elite_pedigree', state.relics)) elitesToKeep += 1;
      
      if (getSkillEffect('gen_cap', metaState) > 0 && state.allTimeBestSequence) {
        const isValid = state.allTimeBestSequence.seq.every(b => state.beasts.includes(b));
        if (isValid) {
          newPop.push([...state.allTimeBestSequence.seq]);
          elitesToKeep = Math.max(0, elitesToKeep - 1);
        } else {
          state.allTimeBestSequence = null; // Invalidate since it contains beasts we no longer own
        }
      }

      for (let i = 0; i < elitesToKeep && i < scored.length; i++) {
        if (newPop.length < getPopSize()) {
           newPop.push([...scored[i].seq]);
        }
      }

      const tournamentSelect = () => {
        const t = [];
        const tourneySize = 3 + getSkillEffect('gen_tourney', metaState) * 2;
        for (let i = 0; i < tourneySize; i++) {
          t.push(scored[Math.floor(Math.random() * getPopSize())]);
        }
        t.sort((a, b) => b.score - a.score);
        return t[0].seq;
      };

      while (newPop.length < getPopSize()) {
        const p1 = tournamentSelect();
        const p2 = tournamentSelect();
        const start = Math.floor(Math.random() * p1.length);
        const end = Math.floor(Math.random() * (p1.length - start)) + start + 1;
        let child = orderCrossover(p1, p2, start, end);
        let mutChance = 0.2;
        if (getSkillEffect('gen_mutate', metaState) > 0 && document.getElementById('mutation-slider')) {
          mutChance = parseInt(document.getElementById('mutation-slider').value, 10) / 100;
        }
        child = mutateSwap(child, getMaxSlots(), mutChance, 0.2);
        
        

        
        newPop.push(child);
      }
      population = newPop;
      state.totalEpochsRun++;

      bestSequenceHistory.push({
        epoch: state.totalEpochsRun,
        score: scored[0].score,
        seq: scored[0].seq.slice(0, getMaxSlots())
      });
      if (bestSequenceHistory.length > 500) bestSequenceHistory.shift();

      const imgCache = window.imageCache || {};
      drawConvergenceChart(populationHistory, epochsToRun, getMaxSlots(), imgCache);
      await new Promise(r => setTimeout(r, 20));
    }
    const imgCache = window.imageCache || {};
    drawBumpChart(bestSequenceHistory, getMaxSlots(), imgCache);

    renderBestSequenceUI();
  }

  const oldBeasts = new Set(runState.bestSequence);
  const newlyBoughtBeasts = state.beasts.filter(b => !oldBeasts.has(b));
  state.beasts = [...runState.bestSequence, ...newlyBoughtBeasts];
  renderBeasts();
  renderFightArena();
  updateUI();

  const activeSeq = runState.bestSequence.slice(0, getMaxSlots());

  const combatResult = calculateDamage(activeSeq, runState.bossHp, runState.currentStance, runState.globalStatuses, {
    gold: state.gold,
    epochs: state.totalEpochsRun,
    inventorySize: state.beasts.length,
    level: state.level,
    relics: state.relics,
    metaState: metaState,
    generateLog: true
  });

  const actions = combatResult.actions;
  
  if (!state.runHistory) state.runHistory = [];
  let currentLevelHistory = state.runHistory.find(h => h.level === state.level);
  if (!currentLevelHistory) {
    currentLevelHistory = { level: state.level, turns: [] };
    state.runHistory.push(currentLevelHistory);
    if (state.runHistory.length > 5) state.runHistory.shift();
  }
  currentLevelHistory.turns.push({
    round: runState.combatRound,
    seq: [...activeSeq],
    expectedDmg: runState.bestExpectedDmg,
    actions: [...actions]
  });

  let actionIndex = 0;

  function buildBreakdownHtml(breakdown, total) {
    if (!breakdown || breakdown.length === 0) return null;
    let html = '';
    breakdown.forEach(b => {
      html += `<div class="breakdown-row"><span>${b.label}</span><strong>${b.value}</strong></div>`;
    });
    html += `<div class="breakdown-row breakdown-total"><span>Total</span><strong>${total}</strong></div>`;
    return html;
  }

  if (!window.gsap) {
    // Fallback if GSAP fails to load
    function processNextAction() {
      if (runState.bossHp <= 0 || actionIndex >= actions.length) {
        setTimeout(finishRound, 100);
        return;
      }
      const action = actions[actionIndex++];
      if (action.type === 'attack') {
        const beast = action.beast;
        runState.bossHp -= action.totalDmg;
        logCombat(`${beast.icon} <strong>${beast.name}</strong> dealt ${action.totalDmg} damage!`, action.isCrit ? 'crit' : 'normal');
        updateUI();
        setTimeout(processNextAction, 300);
      } else {
        processNextAction();
      }
    }
    processNextAction();
    return;
  }

  // Build Master GSAP Timeline
  const tl = window.gsap.timeline({
    onComplete: () => setTimeout(finishRound, 100)
  });

  const uiBeasts = document.querySelectorAll('#arena-left .beast-icon');
  let attackIdx = 0;

  actions.forEach(action => {
    if (action.type === 'attack') {
      const activeBeastEl = uiBeasts[attackIdx];
      const beastImgContainer = activeBeastEl ? activeBeastEl.querySelector('.beast-sprite-container') : null;

      // 1) Prepare attack, highlight
      tl.call(() => {
        if (runState.bossHp <= 0) return;
        uiBeasts.forEach(b => b.classList.remove('active-attacker'));
        if (activeBeastEl) activeBeastEl.classList.add('active-attacker');
      });

      // 2) Squash and stretch lunge forward
      if (activeBeastEl && beastImgContainer) {
        tl.to(beastImgContainer, {
          scaleY: 0.85,
          scaleX: 1.15,
          duration: 0.1,
          ease: "power1.inOut"
        })
        .to(beastImgContainer, {
          y: -25,
          x: 15,
          scaleY: 1.1,
          scaleX: 0.9,
          duration: 0.15,
          ease: "power2.out"
        });
      } else {
        tl.to({}, { duration: 0.25 });
      }

      // 3) Apex Hit logic
      tl.call(() => {
        if (runState.bossHp <= 0) return;

        const beast = action.beast;
        const dmg = action.totalDmg;
        const breakdownHtml = buildBreakdownHtml(action.breakdown, dmg);
        
        let logType = action.isCrit ? 'crit' : 'normal';
        let msg = `${beast.icon} <strong>${beast.name}</strong> dealt ${dmg} damage!`;
        if (action.isDouble) msg = `${beast.icon} <strong>${beast.name}</strong> double-attacked for ${dmg} damage!`;
        
        logCombat(msg, logType, breakdownHtml);
        
        if (dmg > 0) {
           showFloatingText(dmg, logType);
           runState.bossHp -= dmg;
           updateUI();
           
           if (action.isCrit || dmg >= 30) {
             window.gsap.fromTo('.app-container', {x: -5, y: 3}, {x: 0, y: 0, duration: 0.1, ease: "rough({strength: 2, points: 5})"});
           }
           
           if (DOM.elArenaBoss) {
             const bossImg = DOM.elArenaBoss.querySelector('img');
             if (bossImg) {
               window.gsap.fromTo(bossImg, {scaleX: 1.1, scaleY: 0.9, filter: "brightness(10)"}, {scaleX: 1, scaleY: 1, filter: "brightness(1)", duration: 0.3, ease: "elastic.out(1, 0.5)"});
             }
           }
        } else {
           showFloatingText('0', 'normal');
        }

        if (runState.bossHp <= 0) {
           tl.kill();
           setTimeout(finishRound, 100);
        }
      });

      // 4) Snap back
      if (activeBeastEl && beastImgContainer) {
        tl.to(beastImgContainer, {
          y: 0,
          x: 0,
          scaleY: 1,
          scaleX: 1,
          duration: 0.2,
          ease: "back.out(1.5)"
        });
      } else {
        tl.to({}, { duration: 0.2 });
      }
      
      attackIdx++;
    } 
    else if (action.type === 'dot') {
      tl.call(() => {
        if (runState.bossHp <= 0) return;
        const isPoison = action.status === 'POISON';
        runState.bossHp -= action.dmg;
        logCombat(`${isPoison?'🟢':'🔥'} ${action.status} dealt ${action.dmg} damage!`, 'danger');
        showFloatingText(action.dmg, 'dot');
        updateUI();
        if (DOM.elArenaBoss) {
           const bossImg = DOM.elArenaBoss.querySelector('img');
           if (bossImg) {
               window.gsap.fromTo(bossImg, {filter: isPoison ? "sepia(1) hue-rotate(50deg) saturate(5)" : "sepia(1) hue-rotate(-50deg) saturate(5)"}, {filter: "none", duration: 0.3});
           }
        }
        if (runState.bossHp <= 0) {
           tl.kill();
           setTimeout(finishRound, 100);
        }
      });
      tl.to({}, { duration: 0.15 });
    }
    else if (action.type === 'bomb') {
      tl.call(() => {
        if (runState.bossHp <= 0) return;
        runState.bossHp -= action.dmg;
        logCombat(`💣 TIME BOMB detonated for ${action.dmg} damage!`, 'crit');
        showFloatingText(action.dmg, 'crit');
        updateUI();
        window.gsap.fromTo('.app-container', {scale: 1.02}, {scale: 1, duration: 0.2, ease: "bounce.out"});
        if (runState.bossHp <= 0) {
           tl.kill();
           setTimeout(finishRound, 100);
        }
      });
      tl.to({}, { duration: 0.3 });
    }
    else if (action.type === 'heal') {
      tl.call(() => {
        if (runState.bossHp <= 0) return;
        runState.bossHp += action.amount;
        logCombat(`🩸 Boss healed for ${action.amount} due to Blood Chalice!`, 'heal');
        showFloatingText(`+${action.amount}`, 'heal');
        updateUI();
      });
      tl.to({}, { duration: 0.15 });
    }
    else if (action.type === 'execute_boss') {
      tl.call(() => {
        if (runState.bossHp <= 0) return;
        runState.bossHp = 0;
        logCombat(`⚡ Boss EXECUTED by Resilience Capstone!`, 'crit');
        showFloatingText('EXECUTED', 'crit');
        updateUI();
        if (DOM.elArenaBoss) {
           const bossImg = DOM.elArenaBoss.querySelector('img');
           if (bossImg) {
               window.gsap.to(bossImg, {scale: 0.1, rotation: 180, opacity: 0, duration: 0.5, ease: "power2.in"});
           }
        }
        tl.kill();
        setTimeout(finishRound, 500);
      });
    }
  });
}

export function finishRound() {
  renderFightArena(-1);
  if (runState.bossHp <= 0) {
    logCombat("BOSS DEFEATED!", "kill");
    setTimeout(() => {
      showOverlay("Level Cleared!", "Congrats!", "win", false);
      setTimeout(() => {
        hideOverlay();
        state.level++;
        if (localStorage.getItem('antigravity_god_mode_flag') !== 'true') {
          if (window.updateHighestLevel) window.updateHighestLevel(state.level);
        }
        let goldReward = 30 + (state.level * 10);
        
        goldReward += getSkillEffect('eco_bounty', metaState) * 15;
        goldReward += getSkillEffect('res_level_gold', metaState) * 10;
        
        if (getSkillEffect('eco_jackpot', metaState) > 0 && Math.random() < 0.1) {
           goldReward *= 2;
           showToast("JACKPOT! Double boss gold!");
        }
        
        state.gold += goldReward;
        
        const interestRate = getSkillEffect('eco_interest', metaState) * 0.05;
        if (interestRate > 0) {
           const interest = Math.floor(state.gold * interestRate);
           state.gold += interest;
           showToast(`Earned ${interest}G interest!`);
        }
        
        state.freeRerolls = (state.freeRerolls || 0) + getSkillEffect('eco_reroll_free', metaState);
        if (hasRelic('golden_ticket', state.relics)) state.freeRerolls++;
        if (hasRelic('tax_evasion', state.relics)) state.gold += 10;
        if (hasRelic('merchants_ledger', state.relics)) state.gold += state.beasts.length;
        if (hasRelic('bounty_hunters_badge', state.relics)) state.gold += 30;
        
        const freeBeastChance = getSkillEffect('chaos_free_beast', metaState) * 0.1;
        if (freeBeastChance > 0 && Math.random() < freeBeastChance) {
           const validBeasts = shopPool; 
           const b = validBeasts[Math.floor(Math.random() * validBeasts.length)].factory();
           if (state.beasts.length < 20 + getSkillEffect('inv_cap', metaState)*5) {
              state.beasts.push(b);
              showToast(`Void Gift: Acquired ${b.name}!`);
           }
        }
        
        const hpScale = 1.28 - (getSkillEffect('res_boss_slow', metaState) * 0.03);
        const hpReduction = getSkillEffect('res_hp', metaState) * 0.03;
        
        let newMax = Math.floor(60 * Math.pow(hpScale, state.level - 1));
        newMax = Math.floor(newMax * (1 - hpReduction));
        if (hasRelic('exhaustion_gas', state.relics)) newMax = Math.floor(newMax * 0.9);
        
        runState.bossMaxHp = newMax;
        runState.bossHp = runState.bossMaxHp;
        runState.combatRound = 1;
        runState.currentStance = BOSS_STANCES[Math.floor(Math.random() * BOSS_STANCES.length)];
        runState.globalStatuses = {};
        bestSequenceHistory = [];
        population = [];
        runState.bestExpectedDmg = 0;
        rollShop();
        renderShop();
        updateUI();
        saveRunState();
        if (typeof window.checkAchievements !== 'undefined') window.checkAchievements();
        
        if ((state.level - 1) % 3 === 0) {
          triggerRelicMilestone();
        } else {
          if (DOM.btnFight) DOM.btnFight.disabled = false;
        }
      }, 500);
    }, 200);
  } else {
    runState.combatRound++;
    
    let isGameOver = runState.combatRound > 3 + getSkillEffect('res_round', metaState);
    if (isGameOver && getSkillEffect('res_second_chance', metaState) > 0 && !state.secondChanceUsed) {
       isGameOver = false;
       state.secondChanceUsed = true;
       logCombat("DEATH DEFIED! One more round!", "crit");
    }

    if (isGameOver) {
      logCombat("YOU FAILED TO KILL THE BOSS.", "danger");
      
      if (getSkillEffect('inv_keep', metaState) > 0 && state.beasts.length > 0) {
        preservedBeast = state.beasts[Math.floor(Math.random() * state.beasts.length)];
      }
      
      const baseDna = Math.floor(10 * Math.pow(1.15, state.level));
      let dnaMultiplier = 1 + (getSkillEffect('res_dna_bonus', metaState) * 0.2);
      if (hasRelic('dna_extractor', state.relics)) dnaMultiplier += 0.25;
      const dnaEarned = Math.floor(baseDna * dnaMultiplier);
      metaState.dna += dnaEarned;
      saveMetaState();
      if (typeof window.checkAchievements !== 'undefined') window.checkAchievements();
      clearRunState(); 
      setTimeout(() => {
        showOverlay("Game Over", `The Boss survived. You earned ${dnaEarned} DNA!`, "loss", true, resetRun);
      }, 200);
    } else {
      if (hasRelic('second_wind', state.relics)) state.epochs += 100;
      runState.currentStance = BOSS_STANCES[Math.floor(Math.random() * BOSS_STANCES.length)];
      const displayStance = runState.currentStance === 'NONE' ? 'None' : runState.currentStance.replace(/_/g, ' ');
      logCombat(`Boss shifts to: ${displayStance}`);
      runState.bestExpectedDmg = 0;
      if (DOM.btnFight) DOM.btnFight.disabled = false;
      updateUI();
      saveRunState();
      if (typeof window.checkAchievements !== 'undefined') window.checkAchievements();
      
      if (metaState.settings && metaState.settings.autoPlayTurns) {
        setTimeout(executeRound, 1000);
      }
    }
  }
}

export function resetRun() {
  hideOverlay();
  
  let initialBeasts = [
    makeBeast('Vanguard', 10, 15, null, 'FIRST_STRIKE', 'Uncommon', '🛡️', '#78716c'),
    makeBeast('Coward', 15, 15, null, 'HIDE', 'Common', '🙈', '#d6d3d1'),
    makeBeast('Scout', 4, 8, null, 'GROWTH', 'Common', '🦅', '#93c5fd'),
    makeBeast('Cheerleader', 1, 5, null, 'BUFF_NEXT_20', 'Common', '📣', '#f472b6')
  ];
  
  if (preservedBeast) {
    initialBeasts.push(preservedBeast);
    preservedBeast = null;
  }
  
  for (let i = 0; i < getSkillEffect('inv_starter', metaState); i++) {
    const pool = shopPool.filter(p => p.rarity === 'Uncommon');
    initialBeasts.push(pool[Math.floor(Math.random() * pool.length)].factory());
  }
  
  for (let i = 0; i < getSkillEffect('inv_starter_rare', metaState); i++) {
    const pool = shopPool.filter(p => p.rarity === 'Rare');
    initialBeasts.push(pool[Math.floor(Math.random() * pool.length)].factory());
  }
  
  if (getSkillEffect('inv_cap_node', metaState) > 0) {
    const cloned = initialBeasts.map(b => {
      const bp = shopPool.find(p => p.factory().name === b.name);
      return bp ? bp.factory() : makeBeast(b.name, b.minDmg, b.maxDmg, b.appliesStatus, b.synergy, b.rarity, b.icon, b.color, b.image);
    });
    initialBeasts = initialBeasts.concat(cloned);
  }

  const newState = {
    level: 1,
    gold: 40 + (getSkillEffect('eco_gold1', metaState) * 20),
    epochs: getSkillEffect('gen_epochs', metaState) * 25,
    totalEpochsRun: 0,
    shopLevel: 1 + getSkillEffect('eco_shop_start', metaState),
    upgradeCost: 30 * Math.max(1, (1 + getSkillEffect('eco_shop_start', metaState)) * (1 + getSkillEffect('eco_shop_start', metaState))),
    secondChanceUsed: false,
    shopOfferings: [],
    relicOfferings: [],
    temporarySkill: null
  };
  for (const k in state) delete state[k];
  Object.assign(state, newState);

  // We are omitting the SKILL_TREE_DATA dependency directly, we can read from metaState.skillTree indirectly if needed.
  // Actually, we need SKILL_TREE_DATA for random temporarySkill.
  // We'll skip temporary skill extraction for now or use window.SKILL_TREE_DATA.
  if (getSkillEffect('chaos_cap', metaState) > 0 && window.SKILL_TREE_DATA) {
    const candidates = window.SKILL_TREE_DATA.filter(s => s.tier > 0);
    if (candidates.length > 0) {
      const randomSkill = candidates[Math.floor(Math.random() * candidates.length)];
      state.temporarySkill = randomSkill.id;
    }
  }
  window.__activeTemporarySkill = state.temporarySkill;  
  state.relics = [];
  state.runHistory = [];
  state.beasts = initialBeasts;
  
  runState.bossMaxHp = 60;
  runState.bossHp = 60;
  runState.combatRound = 1;
  runState.currentStance = BOSS_STANCES[Math.floor(Math.random() * BOSS_STANCES.length)];
  runState.globalStatuses = {};
  runState.bestExpectedDmg = 0;
  population = [];
  bestSequenceHistory = [];
  
  if (DOM.elCombatLog) DOM.elCombatLog.innerHTML = '';
  if (DOM.elPreviousSequencesList) DOM.elPreviousSequencesList.innerHTML = '';
  
  runState.bestSequence = [...state.beasts];
  
  rollShop();
  renderBeasts();
  renderShop();
  renderFightArena();
  renderBestSequenceUI();
  updateUI();
  if (DOM.btnFight) DOM.btnFight.disabled = false;
  saveRunState();
  if (typeof window.skillTreeRenderer !== 'undefined' && window.skillTreeRenderer) window.skillTreeRenderer.render();
}
