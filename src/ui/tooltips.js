export function getTooltipText(b) {
  let text = `Damage: ${b.minDamage}-${b.maxDamage}\n`;
  if (b.appliesStatus) text += `Applies: ${b.appliesStatus.replace(/_/g, ' ')}\n`;
  if (b.synergy) {
    text += `Synergy: ${b.synergy.replace(/_/g, ' ')}\n`;
    if (b.synergy === 'TIME_BOMB') text += `Detonates after 2 attacks for 150 dmg.`;
    else if (b.synergy === 'FINISHER') text += `Deals 5x damage if placed in the last slot.`;
    else if (b.synergy === 'PUNISHER') text += `Deals 3x damage if previous beast dealt < 15 dmg.`;
    else if (b.synergy === 'ECHO') text += `Deals extra damage equal to previous beast's damage.`;
    else if (b.synergy === 'COMBO_SCALER') text += `+20% damage per beast that attacked before it.`;
    else if (b.synergy === 'BUFF_NEXT_20') text += `Adds +20 base damage to the next beast.`;
    else if (b.synergy === 'BUFF_NEXT_40') text += `Adds +40 base damage to the next beast.`;
    else if (b.synergy === 'CONSUME_ALL') text += `Removes all status effects, gains +50 damage per removed.`;
    else if (b.synergy === 'SHATTER') text += `Deals 3x damage to FROSTBITTEN bosses, but removes FROSTBITE.`;
    else if (b.synergy === 'PIERCING') text += `Ignores the damage reduction of the ARMORED boss stance.`;
    else if (b.synergy === 'DROWN') text += `Deals 5x damage if the Boss has both FROSTBITE and VULNERABLE.`;
    else if (b.synergy === 'OVERCHARGE') text += `Deals 10x damage if the Boss has EXACTLY 3 stacks of SHOCK. Otherwise, deals 1 damage.`;
    else if (b.synergy === 'REVERBERATE') text += `Copies the sum of the damage dealt by the last TWO beasts.`;
    else if (b.synergy === 'RHYTHM') text += `Deals 3x damage if placed in an EVEN numbered slot (Slot 2, 4, 6, 8).`;
    else if (b.synergy === 'BLOOD_PRICE') text += `Forces the next beast in the sequence to deal 0 damage.`;
    else if (b.synergy === 'OMNI_STRIKE') text += `Applies 1 stack of Poison, Fire, Shock, Vulnerable, and Frostbite.`;
    else if (b.synergy === 'EXECUTE') text += `Deals 4x damage if Boss HP < 30%.`;
    else if (b.synergy === 'DOUBLE_IF_POISONED') text += `Deals 2x damage if boss is POISONED.`;
    else if (b.synergy === 'DOUBLE_IF_FIRE') text += `Deals 2x damage if boss is ON FIRE.`;
    else if (b.synergy === 'TRIPLE_IF_SHOCK') text += `Deals 3x damage if boss is SHOCKED.`;
    else if (b.synergy === 'DOUBLE_IF_VULNERABLE') text += `Deals 2x damage if boss is VULNERABLE.`;
    else if (b.synergy === 'CONSUME_POISON') text += `Consumes POISON for +50 damage.`;
    else if (b.synergy === 'CONSUME_FIRE') text += `Consumes FIRE for +60 damage.`;
    else if (b.synergy === 'CATALYST') text += `Detonates POISON for massive damage.`;
    else if (b.synergy === 'PROLIFERATE') text += `Doubles all current status effect stacks.`;
    else if (b.synergy === 'TRIGGER_NEXT') text += `Triggers the status effect of the NEXT beast instantly.`;
    else if (b.synergy === 'MIRROR_SYMMETRY') text += `Copies the damage of the beast in the opposite slot.`;
    else if (b.synergy === 'MOMENTUM_LOSS') text += `-15 damage for every beast that attacked before it.`;
    else if (b.synergy === 'STATUS_CONVERSION') text += `Converts Poison->Frostbite and Fire->Shock. Does 10x converted damage.`;
    else if (b.synergy === 'VACUUM_SCALER') text += `Clears all statuses. Gives +5 damage to all following beasts per stack cleared.`;
    else if (b.synergy === 'MISSING_HP_SCALING') text += `Deals 15% of the Boss's missing HP.`;
    else if (b.synergy === 'FIRST_STRIKE') text += `Deals 3x damage if placed in Slot 1.`;
    else if (b.synergy === 'HIDE') text += `Deals 0 damage if placed in Slot 1 or 2.`;
    else if (b.synergy === 'GROWTH') text += `Gains +2 damage for every beast that attacked before it.`;
    else if (b.synergy === 'MINOR_BUFF') text += `Adds +5 base damage to the next beast.`;
    else if (b.synergy === 'KINDLING') text += `Deals 2x damage if the Boss is ON FIRE.`;
    else if (b.synergy === 'HIGH_ROLLER') text += `Double damage if it rolls odd, half damage if it rolls even.`;
    else if (b.synergy === 'GOLD_SCALING') text += `Deals +1 damage for every 1 Gold you hold.`;
    else if (b.synergy === 'EPOCH_SCALING') text += `Deals +1 damage for every 5 GA Epochs run.`;
    else if (b.synergy === 'INVENTORY_SCALING') text += `Deals +5 damage for every beast in your inventory.`;
    else if (b.synergy === 'LEVEL_SCALING') text += `Deals +10 damage for every Level cleared.`;
    else if (b.synergy === 'LEGENDARY_MULTIPLIER') text += `Damage is multiplied by 1.8x for every Legendary on the board.`;
  }
  return text.trim();
}

export function getAbilityTitle(b) {
  if (b.synergy) {
    const titles = {
      'TIME_BOMB': 'Tick Tock 💣',
      'FINISHER': 'The Last Laugh 🎭',
      'PUNISHER': 'Bully Tactics 💢',
      'ECHO': 'Copycat 🪞',
      'COMBO_SCALER': 'Combo Chain ⛓️',
      'BUFF_NEXT_20': 'Minor Blessing ✨',
      'BUFF_NEXT_40': 'Battle Cry 🗣️',
      'CONSUME_ALL': 'Void Collapse 🌌',
      'EXECUTE': 'Guillotine 🪓',
      'DOUBLE_IF_POISONED': 'Venom Strike 🐍',
      'DOUBLE_IF_FIRE': 'Fan The Flames 🔥',
      'TRIPLE_IF_SHOCK': 'Lightning Rod ⚡',
      'DOUBLE_IF_VULNERABLE': 'Merciless 🩸',
      'CONSUME_POISON': 'Toxin Drinker 🧪',
      'CONSUME_FIRE': 'Fire Eater 🌋',
      'CATALYST': 'Chemical Reaction 💥',
      'PROLIFERATE': 'Pandemic 🦠',
      'TRIGGER_NEXT': 'The Conductor 🎼',
      'MIRROR_SYMMETRY': 'Mirror Entity 🪞',
      'MOMENTUM_LOSS': 'Fatigue Giant 🥱',
      'STATUS_CONVERSION': 'Prismatic Slime 🌈',
      'VACUUM_SCALER': 'Vacuum Ooze 🌪️',
      'MISSING_HP_SCALING': 'Blood Mage 🩸',
      'FIRST_STRIKE': 'Vanguard Charge 🛡️',
      'HIDE': 'Cowardice 🙈',
      'GROWTH': 'Momentum 📈',
      'MINOR_BUFF': 'Cheer 📣',
      'KINDLING': 'Kindling 🪵',
      'HIGH_ROLLER': 'All In 🎲',
      'GOLD_SCALING': 'Bribe 💰',
      'EPOCH_SCALING': 'Time Dilation ⏳',
      'INVENTORY_SCALING': 'Swarm Tactics 🐝',
      'LEVEL_SCALING': 'Bloodlust 🩸',
      'LEGENDARY_MULTIPLIER': 'Fractal Resonance 💠',
      'SHATTER': 'Ice Breaker 🧊',
      'PIERCING': 'Armor Piercing 🎯',
      'DROWN': 'Abyssal Drown 🌊',
      'OVERCHARGE': 'Overcharge 🔋',
      'REVERBERATE': 'Reverberate 🔊',
      'RHYTHM': 'Dance Rhythm 💃',
      'BLOOD_PRICE': 'Blood Price 🩸',
      'OMNI_STRIKE': 'Omni Strike ☄️'
    };
    return titles[b.synergy] || 'Special Skill';
  } else if (b.appliesStatus) {
    const titles = {
      'POISON': 'Toxic Spit 🤢',
      'FIRE': 'Ignite 🔥',
      'SHOCK': 'Static Zap ⚡',
      'VULNERABLE': 'Armor Break 🛡️',
      'FROSTBITE': 'Deep Freeze ❄️'
    };
    return titles[b.appliesStatus] || 'Status Effect';
  }
  return 'Basic Attack ⚔️';
}
