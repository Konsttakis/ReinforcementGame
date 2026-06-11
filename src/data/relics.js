export const relicPool = [
  // Existing
  { id: 'venom_gland', name: 'Venom Gland', icon: '☠️', desc: 'Poison ticks for 25 dmg instead of 15', cost: 120, image: 'assets/relics/venom_gland.jpeg' },
  { id: 'molten_core', name: 'Molten Core', icon: '🌋', desc: 'Fire never degrades its stacks', cost: 150, image: 'assets/relics/molten_core.jpeg' },
  { id: 'heavy_anvil', name: 'Heavy Anvil', icon: '🗜️', desc: 'All beasts gain +10 minimum and maximum damage', cost: 100, image: 'assets/relics/heavy_anvil.jpeg' },
  { id: 'golden_dice', name: 'Golden Dice', icon: '🎲', desc: 'Shop refreshes cost 2G instead of 5G', cost: 200, image: 'assets/relics/golden_dice.jpeg' },

  // Combat & Damage
  { id: 'sharpening_stone', name: 'Sharpening Stone', icon: '🪨', desc: 'First beast deals +50 flat damage', cost: 80 },
  { id: 'glass_cannon', name: 'Glass Cannon', icon: '🧨', desc: 'All beasts deal +30% damage, but max active slots -1', cost: 240 },
  { id: 'ritual_dagger', name: 'Ritual Dagger', icon: '🗡️', desc: 'EXECUTE deals 6x damage instead of 4x', cost: 160 },
  { id: 'weighted_dice', name: 'Weighted Dice', icon: '🎲', desc: 'Minimum damage is increased by 20%', cost: 120 },
  { id: 'executioners_axe', name: 'Executioner\'s Axe', icon: '🪓', desc: 'Execution threshold is increased to 40% missing HP', cost: 200 },
  { id: 'mirror_shield', name: 'Mirror Shield', icon: '🛡️', desc: 'MIRROR_SYMMETRY beasts add +50 damage flat to their mirrored value', cost: 150 },
  { id: 'combo_meter', name: 'Combo Meter', icon: '📈', desc: 'COMBO_SCALER gets an additional +10% multiplier per beast', cost: 160 },
  { id: 'blood_chalice', name: 'Blood Chalice', icon: '🍷', desc: 'Restore 5% Boss HP per beast, but they all gain +50% damage', cost: 300 },
  { id: 'echo_chamber', name: 'Echo Chamber', icon: '🔊', desc: 'ECHO beasts copy 150% of previous damage instead of 100%', cost: 180 },
  { id: 'momentum_pendulum', name: 'Momentum Pendulum', icon: '🪀', desc: 'MOMENTUM_LOSS penalty is reduced by half', cost: 100 },

  // Status Effects
  { id: 'toxic_vial', name: 'Toxic Vial', icon: '🧪', desc: 'Applies 1 Poison stack at the start of combat', cost: 80 },
  { id: 'brimstone_match', name: 'Brimstone Match', icon: '🧨', desc: 'Applies 1 Fire stack at the start of combat', cost: 80 },
  { id: 'static_capacitor', name: 'Static Capacitor', icon: '🔋', desc: 'Applies 1 Shock stack at the start of combat', cost: 80 },
  { id: 'cursed_doll', name: 'Cursed Doll', icon: '🪆', desc: 'Applies 1 Vulnerable stack at the start of combat', cost: 100 },
  { id: 'liquid_nitrogen', name: 'Liquid Nitrogen', icon: '🧊', desc: 'Applies 1 Frostbite stack at the start of combat', cost: 100 },
  { id: 'plague_rat', name: 'Plague Rat', icon: '🐀', desc: 'POISON ticks trigger twice per round', cost: 180 },
  { id: 'thermite_paste', name: 'Thermite Paste', icon: '🥫', desc: 'FIRE deals +20% damage for each stack of VULNERABLE', cost: 160 },
  { id: 'conductive_wire', name: 'Conductive Wire', icon: '🔌', desc: 'SHOCK multiplier is increased to 4.5x', cost: 200 },
  { id: 'shattered_glass', name: 'Shattered Glass', icon: '🪞', desc: 'VULNERABLE multiplier is increased to 2.5x', cost: 200 },
  { id: 'deep_freeze', name: 'Deep Freeze', icon: '🥶', desc: 'FROSTBITE damage adds an extra +20 dmg/stack', cost: 150 },
  { id: 'catalytic_converter', name: 'Catalytic Converter', icon: '⚙️', desc: 'CATALYST consumes poison for 25x damage instead of 15x', cost: 240 },
  { id: 'ashes_to_ashes', name: 'Ashes to Ashes', icon: '⚱️', desc: 'CONSUME_FIRE grants +100 damage instead of 50', cost: 170 },
  { id: 'pandemic_spore', name: 'Pandemic Spore', icon: '🍄', desc: 'PROLIFERATE multiplies stacks by 3x instead of 2x', cost: 220 },

  // Economy & Shop
  { id: 'merchants_ledger', name: 'Merchant\'s Ledger', icon: '📜', desc: 'Gain +1 Gold for every beast in your inventory after a win', cost: 160 },
  { id: 'vip_card', name: 'VIP Card', icon: '💳', desc: 'Shop Level upgrades cost 20% less', cost: 200 },
  { id: 'rusty_piggy_bank', name: 'Rusty Piggy Bank', icon: '🐷', desc: 'Gain 50 Gold instantly, but lose 1 Gold per reroll', cost: 0 },
  { id: 'counterfeit_coin', name: 'Counterfeit Coin', icon: '🪙', desc: '5% chance to duplicate any beast bought from the shop', cost: 240 },
  { id: 'hagglers_charm', name: 'Haggler\'s Charm', icon: '🧿', desc: 'Beast costs in the shop are reduced by 1G', cost: 170 },
  { id: 'bounty_hunters_badge', name: 'Bounty Hunter\'s Badge', icon: '📛', desc: 'Boss kills grant +30 Gold', cost: 120 },
  { id: 'recycling_bin', name: 'Recycling Bin', icon: '♻️', desc: 'Selling a beast refunds its full base cost', cost: 300 },
  // GA & Lab
  { id: 'overclocked_cpu', name: 'Overclocked CPU', icon: '🖥️', desc: 'Start every GA round with +100 Epochs', cost: 160 },
  { id: 'elite_pedigree', name: 'Elite Pedigree', icon: '👑', desc: 'Elitism count is increased by 1', cost: 240 },
  { id: 'supercomputer_cooling', name: 'Supercomputer Cooling', icon: '❄️', desc: 'Gain +1 Epoch for every beast sold', cost: 150 },
  { id: 'dna_extractor', name: 'DNA Extractor', icon: '🧬', desc: 'Gain +25% DNA from all sources', cost: 260 },

  { id: 'quantum_processor', name: 'Quantum Processor', icon: '🧠', desc: 'GA Population size increased by 5', cost: 280 },
  { id: 'ancestral_skull', name: 'Ancestral Skull', icon: '💀', desc: 'Start the run with 200 extra DNA', cost: 200 },

  // Utility & Synergies
  { id: 'time_bomb_detonator', name: 'Time Bomb Detonator', icon: '💣', desc: 'TIME_BOMB base damage is doubled', cost: 180 },
  { id: 'first_blood_medal', name: 'First Blood Medal', icon: '🥇', desc: 'FIRST_STRIKE multiplier increased from 3x to 4x', cost: 160 },
  { id: 'growth_hormone', name: 'Growth Hormone', icon: '💊', desc: 'GROWTH beasts gain +5 damage per slot instead of +2', cost: 120 },
  { id: 'high_roller_chips', name: 'High Roller Chips', icon: '🎰', desc: 'HIGH_ROLLER beasts have a 75% chance to double damage', cost: 200 },
  { id: 'punishers_whip', name: 'Punisher\'s Whip', icon: '🪢', desc: 'PUNISHER activates if previous beast dealt < 30 damage', cost: 120 },
  { id: 'vacuum_cleaner', name: 'Vacuum Cleaner', icon: '🧹', desc: 'VACUUM_SCALER grants +10 damage per stack consumed', cost: 170 },
  { id: 'telescope', name: 'Telescope', icon: '🔭', desc: 'HIDE beasts give +20 damage to the next beast', cost: 100 },
  { id: 'cheerleader_pompoms', name: 'Cheerleader Pom-Poms', icon: '🎀', desc: 'MINOR_BUFF grants +10 damage to all subsequent beasts', cost: 100 },
  { id: 'gold_plating', name: 'Gold Plating', icon: '🏆', desc: 'GOLD_SCALING adds 2x your gold instead of 1x', cost: 220 },
  { id: 'epoch_clock', name: 'Epoch Clock', icon: '🕰️', desc: 'EPOCH_SCALING grants +1 damage per 25 epochs instead of 50', cost: 180 },
  { id: 'collectors_edition', name: 'Collector\'s Edition', icon: '📚', desc: 'INVENTORY_SCALING grants +15 damage per beast in inventory', cost: 240 },
  { id: 'level_up_potion', name: 'Level Up Potion', icon: '🧪', desc: 'LEVEL_SCALING grants +20 damage per level instead of 10', cost: 200 },
  { id: 'crown_of_legends', name: 'Crown of Legends', icon: '👑', desc: 'LEGENDARY_MULTIPLIER base is 2x per legendary instead of 1.5x', cost: 300 },
  { id: 'kindling_wood', name: 'Kindling Wood', icon: '🪵', desc: 'KINDLING triples fire damage instead of doubling it', cost: 180 },
  { id: 'conversion_kit', name: 'Conversion Kit', icon: '🧰', desc: 'STATUS_CONVERSION yields 25x damage per stack instead of 10x', cost: 260 },

  // Boss & Arena
  { id: 'exhaustion_gas', name: 'Exhaustion Gas', icon: '💨', desc: 'Boss maximum HP is reduced by 10%', cost: 200 },
  { id: 'armor_piercing_rounds', name: 'Armor Piercing Rounds', icon: '🎯', desc: 'ARMORED stance reduces damage by 30% instead of 50%', cost: 160 },
  { id: 'scouts_binoculars', name: 'Scout\'s Binoculars', icon: '🔭', desc: 'Boss stances are always revealed', cost: 120 },
  { id: 'fireproof_vest', name: 'Fireproof Vest', icon: '🦺', desc: 'FIRE_IMMUNITY stance only reduces damage by 50%', cost: 150 },
  { id: 'second_wind', name: 'Second Wind', icon: '🌬️', desc: 'If you fail a turn, gain 100 Epochs for the next computation', cost: 240 }
].map(r => {
  if (!r.image) {
    r.image = 'assets/relics/' + r.id + '.jpeg';
  }
  return r;
});
