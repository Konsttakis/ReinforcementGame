export const SKILL_TREE_DATA = [
  // TRUNK
  {
    id: 'genesis', name: 'Genesis', branch: 'trunk', tier: 0, localX: 0, maxLevel: 1, color: '#ffffff',
    costs: [0], desc: () => 'Unlocks the skill tree', prereq: []
  },
  {
    id: 'trunk_1', name: 'Neural Link', branch: 'trunk', tier: 1, localX: -1, maxLevel: 1, color: '#ffffff',
    costs: [20], desc: () => 'Unlocks Genome & Warfare branches', prereq: ['genesis']
  },
  {
    id: 'trunk_2', name: 'Trade Routes', branch: 'trunk', tier: 1, localX: 0, maxLevel: 1, color: '#ffffff',
    costs: [20], desc: () => 'Unlocks Fortune & Inventory branches', prereq: ['genesis']
  },
  {
    id: 'trunk_3', name: 'Dark Knowledge', branch: 'trunk', tier: 1, localX: 1, maxLevel: 1, color: '#ffffff',
    costs: [30], desc: () => 'Unlocks Alchemy & Resilience branches', prereq: ['genesis']
  },
  {
    id: 'trunk_4', name: 'Pandora\'s Box', branch: 'trunk', tier: 2, localX: 0, maxLevel: 1, color: '#ffffff',
    costs: [50], desc: () => 'Unlocks Chaos branch', prereq: ['trunk_1', 'trunk_2', 'trunk_3']
  },

  // GENOME (color: #00ff88)
  { id: 'gen_pop1', name: 'Overclocked AI I', branch: 'genome', tier: 2, localX: 0, maxLevel: 3, color: '#00ff88', costs: [30, 80, 150], desc: (l) => `+${l*2} GA Population Size`, prereq: ['trunk_1'] },
  { id: 'gen_epochs', name: 'Free Compute', branch: 'genome', tier: 2, localX: -1, maxLevel: 5, color: '#00ff88', costs: [20, 40, 80, 160, 320], desc: (l) => `Start run with +${l*25} free epochs`, prereq: ['trunk_1'] },
  { id: 'gen_slots1', name: 'Sequence Cap I', branch: 'genome', tier: 2, localX: 1, maxLevel: 1, color: '#00ff88', costs: [50], desc: () => `+1 max active beast slot`, prereq: ['trunk_1'] },
  { id: 'gen_mut', name: 'Hyper Mutation', branch: 'genome', tier: 3, localX: -0.5, maxLevel: 3, color: '#00ff88', costs: [40, 100, 200], desc: (l) => `+${l*5}% mutation rate`, prereq: ['gen_pop1'] },
  { id: 'gen_elite', name: 'Elitism', branch: 'genome', tier: 3, localX: 0.5, maxLevel: 2, color: '#00ff88', costs: [60, 150], desc: (l) => `Keep top ${1+l} sequences (Base 1)`, prereq: ['gen_pop1'] },
  { id: 'gen_slots2', name: 'Sequence Cap II', branch: 'genome', tier: 3, localX: 1.5, maxLevel: 1, color: '#00ff88', costs: [150], desc: () => `+1 max active beast slot`, prereq: ['gen_slots1'] },
  { id: 'gen_tourney', name: 'Tourney Pressure', branch: 'genome', tier: 4, localX: -0.5, maxLevel: 2, color: '#00ff88', costs: [80, 200], desc: (l) => `Tourney picks from top ${3 + l*2}`, prereq: ['gen_mut'] },
  { id: 'gen_sims', name: 'Simulation Depth', branch: 'genome', tier: 4, localX: 0.5, maxLevel: 3, color: '#00ff88', costs: [50, 120, 250], desc: (l) => `+${l*5} fitness evaluation sims`, prereq: ['gen_elite'] },
  { id: 'gen_slots3', name: 'Sequence Cap III', branch: 'genome', tier: 4, localX: 1.5, maxLevel: 1, color: '#00ff88', costs: [300], desc: () => `+1 max active beast slot`, prereq: ['gen_slots2'] },
  { id: 'gen_pop2', name: 'Parallel Proc', branch: 'genome', tier: 5, localX: 0, maxLevel: 3, color: '#00ff88', costs: [100, 200, 400], desc: (l) => `+${l*4} GA Population Size`, prereq: ['gen_pop1'] },
  { id: 'gen_slots4', name: 'Sequence Cap IV', branch: 'genome', tier: 5, localX: 1.5, maxLevel: 1, color: '#00ff88', costs: [500], desc: () => `+1 max active beast slot`, prereq: ['gen_slots3'] },
  { id: 'gen_cap', name: 'Omniscient AI', branch: 'genome', tier: 6, localX: 0.5, maxLevel: 1, color: '#00ff88', costs: [800], desc: () => `CAPSTONE: Keep all-time best sequence across rounds`, prereq: ['gen_sims', 'gen_slots4'] },

  // WARFARE (color: #ff3e00)
  { id: 'war_dmg', name: 'Sharpened Claws', branch: 'warfare', tier: 2, localX: 0, maxLevel: 5, color: '#ff3e00', costs: [15, 30, 60, 120, 250], desc: (l) => `All beasts +${l*2} min/max dmg`, prereq: ['trunk_1'] },
  { id: 'war_bomb', name: 'Heavy Ordnance', branch: 'warfare', tier: 2, localX: -1.5, maxLevel: 3, color: '#ff3e00', costs: [50, 130, 300], desc: (l) => `TIME BOMB dmg +${l*50}`, prereq: ['trunk_1'] },
  { id: 'war_crit_chance', name: 'Critical Eye', branch: 'warfare', tier: 3, localX: 0, maxLevel: 3, color: '#ff3e00', costs: [40, 100, 250], desc: (l) => `+${l*5}% crit chance`, prereq: ['war_dmg'] },
  { id: 'war_first', name: 'Alpha Strike', branch: 'warfare', tier: 3, localX: -1, maxLevel: 2, color: '#ff3e00', costs: [60, 180], desc: (l) => `First beast deals +${l*15} dmg`, prereq: ['war_dmg'] },
  { id: 'war_last', name: 'Finale', branch: 'warfare', tier: 3, localX: 1, maxLevel: 2, color: '#ff3e00', costs: [60, 180], desc: (l) => `Last beast deals +${l*15} dmg`, prereq: ['war_dmg'] },
  { id: 'war_crit_dmg', name: 'Critical Power', branch: 'warfare', tier: 4, localX: 0, maxLevel: 3, color: '#ff3e00', costs: [50, 120, 300], desc: (l) => `+${l*25}% crit damage`, prereq: ['war_crit_chance'] },
  { id: 'war_combo', name: 'Combo Master', branch: 'warfare', tier: 4, localX: -1, maxLevel: 3, color: '#ff3e00', costs: [40, 100, 250], desc: (l) => `COMBO synergy +${l*5}% per beast`, prereq: ['war_first'] },
  { id: 'war_execute', name: 'Executioner', branch: 'warfare', tier: 4, localX: 1, maxLevel: 2, color: '#ff3e00', costs: [80, 200], desc: (l) => `EXECUTE threshold +${l*5}% HP`, prereq: ['war_last'] },
  { id: 'war_echo', name: 'Resonance', branch: 'warfare', tier: 5, localX: -1, maxLevel: 2, color: '#ff3e00', costs: [70, 200], desc: (l) => `ECHO copies ${100+l*20}% of previous dmg`, prereq: ['war_combo'] },
  { id: 'war_finisher', name: 'Coup de Grace', branch: 'warfare', tier: 5, localX: 1, maxLevel: 2, color: '#ff3e00', costs: [100, 300], desc: (l) => `FINISHER multiplier to ${5+l}x`, prereq: ['war_execute'] },
  { id: 'war_mirror', name: 'Perfect Ref', branch: 'warfare', tier: 6, localX: -1, maxLevel: 1, color: '#ff3e00', costs: [200], desc: () => `MIRROR_SYMMETRY uses max dmg`, prereq: ['war_echo'] },
  { id: 'war_cap', name: 'Berserker Rage', branch: 'warfare', tier: 7, localX: 0, maxLevel: 1, color: '#ff3e00', costs: [700], desc: () => `CAPSTONE: 5% chance beast attacks twice`, prereq: ['war_crit_dmg', 'war_finisher'] },

  // FORTUNE (color: #ffaa00)
  { id: 'eco_gold1', name: 'Rich Ancestry', branch: 'fortune', tier: 2, localX: 0, maxLevel: 5, color: '#ffaa00', costs: [20, 50, 100, 200, 400], desc: (l) => `Start run with +${l*20}G`, prereq: ['trunk_2'] },
  { id: 'eco_refresh', name: 'Discount Rerolls', branch: 'fortune', tier: 2, localX: -1, maxLevel: 3, color: '#ffaa00', costs: [30, 80, 180], desc: (l) => `Shop reroll costs -${l}G`, prereq: ['trunk_2'] },
  { id: 'eco_bounty', name: 'Boss Bounty', branch: 'fortune', tier: 2, localX: 1, maxLevel: 3, color: '#ffaa00', costs: [40, 100, 250], desc: (l) => `+${l*15}G per boss kill`, prereq: ['trunk_2'] },
  { id: 'eco_shop_start', name: 'Head Start', branch: 'fortune', tier: 3, localX: -0.5, maxLevel: 2, color: '#ffaa00', costs: [60, 150], desc: (l) => `Start run with Shop Level ${1+l}`, prereq: ['eco_gold1'] },
  { id: 'eco_sell', name: 'Better Salvage', branch: 'fortune', tier: 3, localX: 0.5, maxLevel: 3, color: '#ffaa00', costs: [25, 60, 130], desc: (l) => `Sell price +${l*3}G`, prereq: ['eco_gold1'] },
  { id: 'eco_bulk', name: 'Bulk Discount', branch: 'fortune', tier: 3, localX: -1.5, maxLevel: 2, color: '#ffaa00', costs: [100, 250], desc: (l) => `Beast cost -${l===1?3:5}G`, prereq: ['eco_refresh'] },
  { id: 'eco_extra_shop', name: 'Extended Shelves', branch: 'fortune', tier: 3, localX: -2.5, maxLevel: 2, color: '#ffaa00', costs: [70, 200], desc: (l) => `Shop offers +${l} beast(s)`, prereq: ['eco_refresh'] },
  { id: 'eco_jackpot', name: 'Jackpot Kill', branch: 'fortune', tier: 3, localX: 1, maxLevel: 1, color: '#ffaa00', costs: [200], desc: () => `10% chance double gold on boss kill`, prereq: ['eco_bounty'] },
  { id: 'eco_interest', name: 'Gold Interest', branch: 'fortune', tier: 4, localX: 0.5, maxLevel: 3, color: '#ffaa00', costs: [80, 200, 400], desc: (l) => `+${l*5}% interest per clear`, prereq: ['eco_sell'] },
  { id: 'eco_reroll_free', name: 'Lucky Refresh', branch: 'fortune', tier: 4, localX: -2, maxLevel: 2, color: '#ffaa00', costs: [150, 350], desc: (l) => `${l} free rerolls per clear`, prereq: ['eco_extra_shop'] },
  { id: 'eco_cap', name: 'Midas Touch', branch: 'fortune', tier: 5, localX: -0.5, maxLevel: 1, color: '#ffaa00', costs: [600], desc: () => `CAPSTONE: All beasts cost 10G flat`, prereq: ['eco_interest', 'eco_bulk'] },

  // INVENTORY (color: #38bdf8)
  { id: 'inv_cap', name: 'Expanded Stables', branch: 'inventory', tier: 2, localX: 0, maxLevel: 3, color: '#38bdf8', costs: [30, 80, 200], desc: (l) => `Max inventory +${l*5}`, prereq: ['trunk_2'] },
  { id: 'inv_starter', name: 'Better Bloodline', branch: 'inventory', tier: 2, localX: -1, maxLevel: 2, color: '#38bdf8', costs: [60, 200], desc: (l) => `Start with +${l} Uncommon beast`, prereq: ['trunk_2'] },
  { id: 'inv_collector', name: 'Collector Bonus', branch: 'inventory', tier: 3, localX: 1, maxLevel: 3, color: '#38bdf8', costs: [40, 120, 300], desc: (l) => `INVENTORY_SCALING +${[7,10,15][l-1]} dmg per beast`, prereq: ['inv_cap'] },
  { id: 'inv_luck_unc', name: 'Uncommon Luck', branch: 'inventory', tier: 3, localX: 0, maxLevel: 3, color: '#38bdf8', costs: [25, 60, 150], desc: (l) => `+${l*5}% Uncommon drop rate`, prereq: ['inv_cap'] },
  { id: 'inv_dupe', name: 'Cloning Vats', branch: 'inventory', tier: 3, localX: -1, maxLevel: 1, color: '#38bdf8', costs: [250], desc: () => `15% chance shop offers a dupe`, prereq: ['inv_starter'] },
  { id: 'inv_starter_rare', name: 'Royal Bloodline', branch: 'inventory', tier: 3, localX: -2, maxLevel: 1, color: '#38bdf8', costs: [350], desc: () => `Start with 1 Rare beast`, prereq: ['inv_starter'] },
  { id: 'inv_luck_rare', name: 'Rare Luck', branch: 'inventory', tier: 4, localX: 0, maxLevel: 3, color: '#38bdf8', costs: [40, 100, 250], desc: (l) => `+${l*3}% Rare drop rate`, prereq: ['inv_luck_unc'] },
  { id: 'inv_keep', name: 'Inheritance', branch: 'inventory', tier: 4, localX: -1, maxLevel: 1, color: '#38bdf8', costs: [400], desc: () => `Keep 1 random beast on Game Over`, prereq: ['inv_dupe'] },
  { id: 'inv_luck_epic', name: 'Epic Luck', branch: 'inventory', tier: 5, localX: 0, maxLevel: 3, color: '#38bdf8', costs: [60, 150, 350], desc: (l) => `+${l*2}% Epic drop rate`, prereq: ['inv_luck_rare'] },
  { id: 'inv_luck_leg', name: 'Legendary Luck', branch: 'inventory', tier: 6, localX: 0, maxLevel: 2, color: '#38bdf8', costs: [200, 500], desc: (l) => `+${l*2}% Legendary drop rate`, prereq: ['inv_luck_epic'] },
  { id: 'inv_cap_node', name: 'Noah\'s Ark', branch: 'inventory', tier: 7, localX: -0.5, maxLevel: 1, color: '#38bdf8', costs: [800], desc: () => `CAPSTONE: Start run with 2 copies of every starter`, prereq: ['inv_luck_leg', 'inv_keep'] },

  // ALCHEMY (color: #9d00ff)
  { id: 'alc_poison', name: 'Concentrated Venom', branch: 'alchemy', tier: 2, localX: -1, maxLevel: 3, color: '#9d00ff', costs: [30, 80, 180], desc: (l) => `Poison tick +${l*5} dmg`, prereq: ['trunk_3'] },
  { id: 'alc_fire', name: 'Inferno', branch: 'alchemy', tier: 2, localX: 0, maxLevel: 3, color: '#9d00ff', costs: [30, 80, 180], desc: (l) => `Fire tick +${l*5} dmg`, prereq: ['trunk_3'] },
  { id: 'alc_shock', name: 'High Voltage', branch: 'alchemy', tier: 2, localX: 1, maxLevel: 3, color: '#9d00ff', costs: [40, 100, 250], desc: (l) => `SHOCK mult to ${[3.5, 4, 5][l-1]}x`, prereq: ['trunk_3'] },
  { id: 'alc_vuln', name: 'Expose Weakness', branch: 'alchemy', tier: 2, localX: 2, maxLevel: 3, color: '#9d00ff', costs: [40, 100, 250], desc: (l) => `VULNERABLE mult to ${[1.6, 1.75, 2][l-1]}x`, prereq: ['trunk_3'] },
  { id: 'alc_frost', name: 'Permafrost', branch: 'alchemy', tier: 3, localX: -1.5, maxLevel: 3, color: '#9d00ff', costs: [35, 90, 200], desc: (l) => `Frostbite dmg +${l*3}/stack`, prereq: ['alc_poison'] },
  { id: 'alc_catalyst', name: 'Volatile Catalyst', branch: 'alchemy', tier: 3, localX: -0.5, maxLevel: 2, color: '#9d00ff', costs: [80, 250], desc: (l) => `CATALYST mult to ${l===1?4:5}x`, prereq: ['alc_poison'] },
  { id: 'alc_dot_persist', name: 'Lingering Toxins', branch: 'alchemy', tier: 3, localX: 0.5, maxLevel: 2, color: '#9d00ff', costs: [80, 200], desc: (l) => `Statuses lose ${l} fewer stacks`, prereq: ['alc_fire'] },
  { id: 'alc_double_apply', name: 'Double Dose', branch: 'alchemy', tier: 3, localX: 1.5, maxLevel: 2, color: '#9d00ff', costs: [100, 300], desc: (l) => `${l*20}% chance to apply status twice`, prereq: ['alc_poison', 'alc_fire'] },
  { id: 'alc_convert', name: 'Transmuter', branch: 'alchemy', tier: 4, localX: -1.5, maxLevel: 1, color: '#9d00ff', costs: [250], desc: () => `CONVERSION does 15x dmg`, prereq: ['alc_frost'] },
  { id: 'alc_consume', name: 'Hungry Void', branch: 'alchemy', tier: 4, localX: -0.5, maxLevel: 2, color: '#9d00ff', costs: [60, 180], desc: (l) => `CONSUME bonus +${l*20} dmg`, prereq: ['alc_catalyst'] },
  { id: 'alc_prolif', name: 'Super Spreader', branch: 'alchemy', tier: 4, localX: 1.5, maxLevel: 2, color: '#9d00ff', costs: [100, 300], desc: (l) => `PROLIFERATE adds ${l+1}x stacks`, prereq: ['alc_double_apply'] },
  { id: 'alc_cap', name: 'Plague Lord', branch: 'alchemy', tier: 5, localX: 0.5, maxLevel: 1, color: '#9d00ff', costs: [750], desc: () => `CAPSTONE: All beasts apply random status`, prereq: ['alc_prolif', 'alc_consume'] },

  // RESILIENCE (color: #f472b6)
  { id: 'res_hp', name: 'Weakened Boss', branch: 'resilience', tier: 2, localX: 0, maxLevel: 5, color: '#f472b6', costs: [20, 50, 100, 200, 400], desc: (l) => `Boss HP -${l*3}%`, prereq: ['trunk_3'] },
  { id: 'res_round', name: 'Extended Battle', branch: 'resilience', tier: 2, localX: 1.5, maxLevel: 1, color: '#f472b6', costs: [300], desc: () => `4 combat rounds (from 3)`, prereq: ['trunk_3'] },
  { id: 'res_dna_bonus', name: 'DNA Siphon', branch: 'resilience', tier: 2, localX: -1.5, maxLevel: 3, color: '#f472b6', costs: [30, 70, 160], desc: (l) => `+${l*20}% DNA earned`, prereq: ['trunk_3'] },
  { id: 'res_stance_reveal', name: 'Scout Report', branch: 'resilience', tier: 3, localX: -1, maxLevel: 2, color: '#f472b6', costs: [40, 120], desc: (l) => l===1 ? `Reveal next stance` : `Reveal all stances`, prereq: ['res_hp'] },
  { id: 'res_armor_pen', name: 'Armor Piercing', branch: 'resilience', tier: 3, localX: 0, maxLevel: 3, color: '#f472b6', costs: [50, 130, 300], desc: (l) => `ARMORED reduction -${[10, 15, 25][l-1]}%`, prereq: ['res_hp'] },
  { id: 'res_boss_slow', name: 'Exhaustion', branch: 'resilience', tier: 3, localX: 1, maxLevel: 3, color: '#f472b6', costs: [40, 100, 250], desc: (l) => `Boss HP scale -${l*3}%`, prereq: ['res_hp'] },
  { id: 'res_second_chance', name: 'Undying', branch: 'resilience', tier: 3, localX: 2, maxLevel: 1, color: '#f472b6', costs: [400], desc: () => `1 emergency round if killed`, prereq: ['res_round'] },
  { id: 'res_stance_veto', name: 'Immunity', branch: 'resilience', tier: 4, localX: -1.5, maxLevel: 1, color: '#f472b6', costs: [250], desc: () => `Veto one stance per run`, prereq: ['res_stance_reveal'] },
  { id: 'res_stance_weak', name: 'Exploit Intel', branch: 'resilience', tier: 4, localX: -0.5, maxLevel: 2, color: '#f472b6', costs: [80, 250], desc: (l) => `Weakness stances do ${2+l*0.5}x`, prereq: ['res_stance_reveal'] },
  { id: 'res_no_immune', name: 'Vuln Serum', branch: 'resilience', tier: 4, localX: 0.5, maxLevel: 1, color: '#f472b6', costs: [200], desc: () => `FIRE IMMUNITY becomes RESISTANCE`, prereq: ['res_armor_pen'] },
  { id: 'res_level_gold', name: 'War Chest', branch: 'resilience', tier: 4, localX: 1.5, maxLevel: 3, color: '#f472b6', costs: [40, 100, 250], desc: (l) => `+${l*10}G per clear`, prereq: ['res_boss_slow'] },
  { id: 'res_cap', name: 'Final Stand', branch: 'resilience', tier: 5, localX: 1, maxLevel: 1, color: '#f472b6', costs: [700], desc: () => `CAPSTONE: Auto-kill boss if <10% HP`, prereq: ['res_second_chance', 'res_no_immune'] },

  // CHAOS (color: #fbbf24)
  { id: 'chaos_reroll', name: 'Fate\'s Hand', branch: 'chaos', tier: 3, localX: -0.5, maxLevel: 3, color: '#fbbf24', costs: [40, 100, 250], desc: (l) => `${l*10}% chance reroll min dmg`, prereq: ['trunk_4'] },
  { id: 'chaos_relic_extra', name: 'Relic Hunter', branch: 'chaos', tier: 3, localX: 0.5, maxLevel: 2, color: '#fbbf24', costs: [100, 300], desc: (l) => `Relic milestones offer ${3+l} choices`, prereq: ['trunk_4'] },
  { id: 'chaos_jackpot', name: 'Slot Machine', branch: 'chaos', tier: 4, localX: -1, maxLevel: 2, color: '#fbbf24', costs: [80, 200], desc: (l) => `${l*5}% chance 3x damage`, prereq: ['chaos_reroll'] },
  { id: 'chaos_free_beast', name: 'Void Gift', branch: 'chaos', tier: 4, localX: 0, maxLevel: 2, color: '#fbbf24', costs: [60, 200], desc: (l) => `${l*10}% chance free beast on clear`, prereq: ['chaos_reroll'] },
  { id: 'chaos_double_relic', name: 'Greedy Grab', branch: 'chaos', tier: 4, localX: 1, maxLevel: 1, color: '#fbbf24', costs: [500], desc: () => `Buy 2 relics per milestone`, prereq: ['chaos_relic_extra'] },
  { id: 'chaos_wild_card', name: 'Wild Mutation', branch: 'chaos', tier: 5, localX: -0.5, maxLevel: 1, color: '#fbbf24', costs: [250], desc: () => `5% chance to inject random beast in GA`, prereq: ['chaos_jackpot'] },
  { id: 'chaos_cap', name: 'Dice of Destiny', branch: 'chaos', tier: 6, localX: 0, maxLevel: 1, color: '#fbbf24', costs: [600], desc: () => `CAPSTONE: Free random skill each run`, prereq: ['chaos_wild_card', 'chaos_double_relic'] }
];

export function getSkillLevel(id, metaState) {
  if (!metaState || !metaState.skillTree) return 0;
  return metaState.skillTree[id] || 0;
}

export function canUnlock(id, metaState) {
  const node = SKILL_TREE_DATA.find(n => n.id === id);
  if (!node) return false;
  const curLevel = getSkillLevel(id, metaState);
  if (curLevel >= node.maxLevel) return false;
  if (node.costs[curLevel] > (metaState.dna || 0)) return false;

  if (!node.prereq || node.prereq.length === 0) return true;
  return node.prereq.some(reqId => getSkillLevel(reqId, metaState) > 0);
}

export function buySkill(id, metaState, saveCallback) {
  if (canUnlock(id, metaState)) {
    const node = SKILL_TREE_DATA.find(n => n.id === id);
    const curLevel = getSkillLevel(id, metaState);
    metaState.dna -= node.costs[curLevel];
    metaState.skillTree[id] = curLevel + 1;
    if (saveCallback) saveCallback(metaState);
    return true;
  }
  return false;
}

export function respecTree(metaState, saveCallback) {
  if (!metaState || !metaState.skillTree) return;
  let refundedDna = 0;
  for (const [id, level] of Object.entries(metaState.skillTree)) {
    const node = SKILL_TREE_DATA.find(n => n.id === id);
    if (node) {
      for (let i = 0; i < level; i++) {
        refundedDna += node.costs[i];
      }
    }
  }
  metaState.dna += refundedDna;
  metaState.skillTree = {}; // reset
  if (saveCallback) saveCallback(metaState);
}

export function getSkillEffect(id, metaState) {
  return getSkillLevel(id, metaState);
}
