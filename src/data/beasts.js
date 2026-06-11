import { createBeast } from '../combat.js';

export function makeBeast(name, min, max, stat, syn, rarity, icon, color, image = null) {
  if (!image) {
    const slug = name.toLowerCase().replace(/ /g, '_');
    image = 'assets/beasts/' + slug + '.png';
  }
  const b = createBeast(name, min, max, stat, syn);
  b.rarity = rarity;
  b.icon = icon;
  b.color = color || '#a1a1aa';
  b.image = image;
  b.id = Math.random().toString(36).substr(2, 9);

  // Eagerly warm the image cache for dynamically-created beasts
  if (typeof window !== 'undefined' && window.imageCache && !window.imageCache[image]) {
    const img = new Image();
    img.onload = () => { window.imageCache[image] = img; };
    img.src = image;
  }

  return b;
}

export const shopPool = [
  { factory: () => makeBeast('Coward', 15, 15, null, 'HIDE', 'Common', '🙈', '#d6d3d1'), rarity: 'Common' },
  { factory: () => makeBeast('Scout', 4, 8, null, 'GROWTH', 'Common', '🦅', '#93c5fd'), rarity: 'Common' },
  { factory: () => makeBeast('Cheerleader', 2, 4, null, 'MINOR_BUFF', 'Common', '📣', '#fca5a5'), rarity: 'Common' },
  { factory: () => makeBeast('Static Slime', 4, 8, 'SHOCK', null, 'Common', '💧', '#fbbf24'), rarity: 'Common' },
  { factory: () => makeBeast('Bomber', 5, 10, null, 'TIME_BOMB', 'Rare', '💣', '#ef4444'), rarity: 'Rare' },
  { factory: () => makeBeast('Blood Mage', 5, 15, null, 'MISSING_HP_SCALING', 'Epic', '🩸', '#991b1b'), rarity: 'Epic' },
  { factory: () => makeBeast('Conductor', 10, 20, null, 'TRIGGER_NEXT', 'Epic', '🎼', '#fbcfe8'), rarity: 'Epic' },
  { factory: () => makeBeast('Doppelganger', 5, 10, null, 'MIRROR_SYMMETRY', 'Rare', '👥', '#a78bfa'), rarity: 'Rare' },
  { factory: () => makeBeast('Leech', 5, 10, 'VULNERABLE', null, 'Uncommon', '🦟', '#c084fc'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Cleric', 2, 5, null, 'BUFF_NEXT_20', 'Uncommon', '🧙', '#fde047'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Venomous', 5, 10, 'POISON', null, 'Uncommon', '🐍', '#4ade80'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Frost Weaver', 4, 8, 'FROSTBITE', null, 'Uncommon', '🕸️', '#38bdf8'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Bat', 5, 12, null, 'ECHO', 'Uncommon', '🦇', '#a855f7'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Vanguard', 10, 15, null, 'FIRST_STRIKE', 'Uncommon', '🛡️', '#78716c'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Firefly', 5, 8, 'FIRE', 'KINDLING', 'Uncommon', '🪲', '#f97316'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Gambler', 1, 25, null, 'HIGH_ROLLER', 'Uncommon', '🎲', '#fef08a'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Taskmaster', 5, 10, null, 'PUNISHER', 'Uncommon', '💢', '#b45309'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Sniper', 8, 12, null, 'PIERCING', 'Uncommon', '🎯', '#166534'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Dancer', 5, 10, null, 'RHYTHM', 'Uncommon', '💃', '#f43f5e'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Fire Element', 10, 15, 'FIRE', null, 'Rare', '🔥', '#ef4444'), rarity: 'Rare' },
  { factory: () => makeBeast('Ice Element', 10, 15, 'FROSTBITE', null, 'Rare', '❄️', '#38bdf8'), rarity: 'Rare' },
  { factory: () => makeBeast('Electric Eel', 10, 15, 'SHOCK', null, 'Rare', '⚡', '#fbbf24'), rarity: 'Rare' },
  { factory: () => makeBeast('Fatigue Giant', 60, 80, null, 'MOMENTUM_LOSS', 'Rare', '🥱', '#d6d3d1'), rarity: 'Rare' },
  { factory: () => makeBeast('Blademaster', 10, 15, null, 'COMBO_SCALER', 'Rare', '⚔️', '#52525b'), rarity: 'Rare' },
  { factory: () => makeBeast('Assassin', 5, 25, null, 'FINISHER', 'Rare', '🥷', '#52525b'), rarity: 'Rare' },
  { factory: () => makeBeast('Glacier Golem', 10, 15, null, 'SHATTER', 'Rare', '🧊', '#bae6fd'), rarity: 'Rare' },
  { factory: () => makeBeast('Blood Priest', 150, 200, null, 'BLOOD_PRICE', 'Rare', '🩸', '#991b1b'), rarity: 'Rare' },
  { factory: () => makeBeast('Steam Roller', 15, 20, null, 'CONSUME_FIRE', 'Epic', '🚂', '#a1a1aa'), rarity: 'Epic' },
  { factory: () => makeBeast('Thunderbird', 15, 25, null, 'TRIPLE_IF_SHOCK', 'Epic', '🦅', '#fcd34d'), rarity: 'Epic' },
  { factory: () => makeBeast('Dragon', 20, 35, 'FIRE', 'DOUBLE_IF_FIRE', 'Epic', '🐲', '#dc2626'), rarity: 'Epic' },
  { factory: () => makeBeast('Paladin', 10, 15, null, 'BUFF_NEXT_40', 'Epic', '🛡️', '#fef08a'), rarity: 'Epic' },
  { factory: () => makeBeast('Plague Doctor', 5, 10, 'POISON', 'PROLIFERATE', 'Epic', '🐦‍⬛', '#16a34a'), rarity: 'Epic' },
  { factory: () => makeBeast('Prism Slime', 10, 15, null, 'STATUS_CONVERSION', 'Epic', '🌈', '#f472b6'), rarity: 'Epic' },
  { factory: () => makeBeast('Gold Hoarder', 5, 15, null, 'GOLD_SCALING', 'Epic', '💰', '#eab308'), rarity: 'Epic' },
  { factory: () => makeBeast('The Collector', 5, 10, null, 'INVENTORY_SCALING', 'Epic', '🐝', '#65a30d'), rarity: 'Epic' },
  { factory: () => makeBeast('Executioner', 15, 25, null, 'EXECUTE', 'Epic', '🪓', '#991b1b'), rarity: 'Epic' },
  { factory: () => makeBeast('Void Terror', 15, 20, null, 'CONSUME_ALL', 'Epic', '🌌', '#581c87'), rarity: 'Epic' },
  { factory: () => makeBeast('Tesla Coil', 10, 20, null, 'OVERCHARGE', 'Epic', '🔋', '#0284c7'), rarity: 'Epic' },
  { factory: () => makeBeast('Siren', 10, 15, null, 'REVERBERATE', 'Epic', '🧜‍♀️', '#0ea5e9'), rarity: 'Epic' },
  { factory: () => makeBeast('Gargoyle', 20, 30, null, 'CONSUME_POISON', 'Legendary', '🗿', '#57534e'), rarity: 'Legendary' },
  { factory: () => makeBeast('Reaper', 5, 15, null, 'CATALYST', 'Legendary', '💀', '#000000'), rarity: 'Legendary' },
  { factory: () => makeBeast('Chimera', 15, 25, 'POISON', 'TRIPLE_IF_SHOCK', 'Legendary', '🦁', '#eab308'), rarity: 'Legendary' },
  { factory: () => makeBeast('Static Slime', 4, 8, 'SHOCK', null, 'Common', '💧', '#fbbf24'), rarity: 'Common' },
  { factory: () => makeBeast('Bomber', 5, 10, null, 'TIME_BOMB', 'Rare', '💣', '#ef4444'), rarity: 'Rare' },
  { factory: () => makeBeast('Blood Mage', 5, 15, null, 'MISSING_HP_SCALING', 'Epic', '🩸', '#991b1b'), rarity: 'Epic' },
  { factory: () => makeBeast('Conductor', 10, 20, null, 'TRIGGER_NEXT', 'Epic', '🎼', '#fbcfe8'), rarity: 'Epic' },
  { factory: () => makeBeast('Doppelganger', 5, 10, null, 'MIRROR_SYMMETRY', 'Rare', '👥', '#a78bfa'), rarity: 'Rare' },
  { factory: () => makeBeast('Leech', 5, 10, 'VULNERABLE', null, 'Uncommon', '🦟', '#c084fc'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Cleric', 2, 5, null, 'BUFF_NEXT_20', 'Uncommon', '🧙', '#fde047'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Venomous', 5, 10, 'POISON', null, 'Uncommon', '🐍', '#4ade80'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Frost Weaver', 4, 8, 'FROSTBITE', null, 'Uncommon', '🕸️', '#38bdf8'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Bat', 5, 12, null, 'ECHO', 'Uncommon', '🦇', '#a855f7'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Vanguard', 10, 15, null, 'FIRST_STRIKE', 'Uncommon', '🛡️', '#78716c'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Firefly', 5, 8, 'FIRE', 'KINDLING', 'Uncommon', '🪲', '#f97316'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Gambler', 1, 25, null, 'HIGH_ROLLER', 'Uncommon', '🎲', '#fef08a'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Taskmaster', 5, 10, null, 'PUNISHER', 'Uncommon', '💢', '#b45309'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Sniper', 8, 12, null, 'PIERCING', 'Uncommon', '🎯', '#166534'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Dancer', 5, 10, null, 'RHYTHM', 'Uncommon', '💃', '#f43f5e'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Fire Element', 10, 15, 'FIRE', null, 'Rare', '🔥', '#ef4444'), rarity: 'Rare' },
  { factory: () => makeBeast('Ice Element', 10, 15, 'FROSTBITE', null, 'Rare', '❄️', '#38bdf8'), rarity: 'Rare' },
  { factory: () => makeBeast('Electric Eel', 10, 15, 'SHOCK', null, 'Rare', '⚡', '#fbbf24'), rarity: 'Rare' },
  { factory: () => makeBeast('Fatigue Giant', 60, 80, null, 'MOMENTUM_LOSS', 'Rare', '🥱', '#d6d3d1'), rarity: 'Rare' },
  { factory: () => makeBeast('Blademaster', 10, 15, null, 'COMBO_SCALER', 'Rare', '⚔️', '#52525b'), rarity: 'Rare' },
  { factory: () => makeBeast('Assassin', 5, 25, null, 'FINISHER', 'Rare', '🥷', '#52525b'), rarity: 'Rare' },
  { factory: () => makeBeast('Glacier Golem', 10, 15, null, 'SHATTER', 'Rare', '🧊', '#bae6fd'), rarity: 'Rare' },
  { factory: () => makeBeast('Blood Priest', 150, 200, null, 'BLOOD_PRICE', 'Rare', '🩸', '#991b1b'), rarity: 'Rare' },
  { factory: () => makeBeast('Steam Roller', 15, 20, null, 'CONSUME_FIRE', 'Epic', '🚂', '#a1a1aa'), rarity: 'Epic' },
  { factory: () => makeBeast('Thunderbird', 15, 25, null, 'TRIPLE_IF_SHOCK', 'Epic', '🦅', '#fcd34d'), rarity: 'Epic' },
  { factory: () => makeBeast('Dragon', 20, 35, 'FIRE', 'DOUBLE_IF_FIRE', 'Epic', '🐲', '#dc2626'), rarity: 'Epic' },
  { factory: () => makeBeast('Paladin', 10, 15, null, 'BUFF_NEXT_40', 'Epic', '🛡️', '#fef08a'), rarity: 'Epic' },
  { factory: () => makeBeast('Plague Doctor', 5, 10, 'POISON', 'PROLIFERATE', 'Epic', '🐦‍⬛', '#16a34a'), rarity: 'Epic' },
  { factory: () => makeBeast('Prism Slime', 10, 15, null, 'STATUS_CONVERSION', 'Epic', '🌈', '#f472b6'), rarity: 'Epic' },
  { factory: () => makeBeast('Gold Hoarder', 5, 15, null, 'GOLD_SCALING', 'Epic', '💰', '#eab308'), rarity: 'Epic' },
  { factory: () => makeBeast('The Collector', 5, 10, null, 'INVENTORY_SCALING', 'Epic', '🐝', '#65a30d'), rarity: 'Epic' },
  { factory: () => makeBeast('Executioner', 15, 25, null, 'EXECUTE', 'Epic', '🪓', '#991b1b'), rarity: 'Epic' },
  { factory: () => makeBeast('Void Terror', 15, 20, null, 'CONSUME_ALL', 'Epic', '🌌', '#581c87'), rarity: 'Epic' },
  { factory: () => makeBeast('Tesla Coil', 10, 20, null, 'OVERCHARGE', 'Epic', '🔋', '#0284c7'), rarity: 'Epic' },
  { factory: () => makeBeast('Siren', 10, 15, null, 'REVERBERATE', 'Epic', '🧜‍♀️', '#0ea5e9'), rarity: 'Epic' },
  { factory: () => makeBeast('Gargoyle', 20, 30, null, 'CONSUME_POISON', 'Legendary', '🗿', '#57534e'), rarity: 'Legendary' },
  { factory: () => makeBeast('Reaper', 5, 15, null, 'CATALYST', 'Legendary', '💀', '#000000'), rarity: 'Legendary' },
  { factory: () => makeBeast('Chimera', 15, 25, 'POISON', 'TRIPLE_IF_SHOCK', 'Legendary', '🦁', '#eab308'), rarity: 'Legendary' },
  { factory: () => makeBeast('Leviathan', 25, 40, 'VULNERABLE', 'DOUBLE_IF_VULNERABLE', 'Legendary', '🐋', '#0284c7'), rarity: 'Legendary' },
  { factory: () => makeBeast('Kraken', 30, 45, 'FROSTBITE', 'DROWN', 'Legendary', '🦑', '#db2777'), rarity: 'Legendary' },
  { factory: () => makeBeast('Vacuum Ooze', 20, 30, null, 'VACUUM_SCALER', 'Legendary', '🌪️', '#94a3b8'), rarity: 'Legendary' },
  { factory: () => makeBeast('Time Traveler', 10, 20, null, 'EPOCH_SCALING', 'Legendary', '⏳', '#0284c7'), rarity: 'Legendary' },
  { factory: () => makeBeast('Blood Thirster', 15, 25, null, 'LEVEL_SCALING', 'Legendary', '🩸', '#991b1b'), rarity: 'Legendary' },
  { factory: () => makeBeast('Infinite Fractal', 5, 10, null, 'LEGENDARY_MULTIPLIER', 'Legendary', '💠', '#c084fc'), rarity: 'Legendary' },
  { factory: () => makeBeast('Chromatic Dragon', 20, 30, null, 'OMNI_STRIKE', 'Legendary', '🐉', '#d946ef'), rarity: 'Legendary' },
  { factory: () => makeBeast('Math Wizard', 5, 10, null, 'PRIME_NUMBER_STRIKE', 'Uncommon', '🦉', '#a855f7'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Echo Slime', 4, 8, null, 'REPEATER', 'Uncommon', '🦠', '#22c55e'), rarity: 'Uncommon' },
  { factory: () => makeBeast('Alpha Wolf', 10, 15, null, 'LONE_WOLF', 'Rare', '🐺', '#64748b'), rarity: 'Rare' },
  { factory: () => makeBeast('Mimic', 8, 12, null, 'SANDWICH', 'Rare', '📦', '#f59e0b'), rarity: 'Rare' },
  { factory: () => makeBeast('Goblin Sapper', 10, 20, null, 'DETONATOR', 'Rare', '🧨', '#84cc16'), rarity: 'Rare' },
  { factory: () => makeBeast('Sacrificial Lamb', 25, 40, null, 'MARTYRDOM', 'Rare', '🐑', '#f1f5f9'), rarity: 'Rare' },
  { factory: () => makeBeast('Glass Golem', 10, 20, null, 'STATUS_MIRROR', 'Epic', '🪞', '#cbd5e1'), rarity: 'Epic' },
  { factory: () => makeBeast('Ascendant', 15, 25, null, 'ELEVATOR', 'Epic', '🛗', '#38bdf8'), rarity: 'Epic' },
  { factory: () => makeBeast('Mad Hatter', 10, 20, null, 'RUSSIAN_ROULETTE', 'Legendary', '🎩', '#a21caf'), rarity: 'Legendary' },
  { factory: () => makeBeast('Purifier', 10, 15, null, 'ALL_OR_NOTHING', 'Legendary', '🕊️', '#facc15'), rarity: 'Legendary' }
];
