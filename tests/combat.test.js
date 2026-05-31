import { expect, test } from 'vitest';
import { calculateDamage, createBeast } from '../src/combat.js';

test('calculateDamage handles variance and synergies', () => {
  const beastA = createBeast('Venomous', 10, 15, 'POISON', null);
  const beastB = createBeast('Reaper', 20, 25, null, 'DOUBLE_IF_POISONED');
  
  // Test B then A (No synergy)
  const dmg1 = calculateDamage([beastB, beastA], 100); 
  // Expected roughly 20-25 + 10-15 = 30-40.
  expect(dmg1.totalDamage).toBeGreaterThanOrEqual(30);
  expect(dmg1.totalDamage).toBeLessThanOrEqual(40);

  // Test A then B (Synergy active!)
  const dmg2 = calculateDamage([beastA, beastB], 100);
  // Expected roughly 10-15 + (20-25 * 2) = 50-65.
  expect(dmg2.totalDamage).toBeGreaterThanOrEqual(50);
  expect(dmg2.totalDamage).toBeLessThanOrEqual(65);
});

test('calculateDamage handles VULNERABLE, SHOCK, and CONSUME_POISON', () => {
  const leech = createBeast('Leech', 10, 10, 'VULNERABLE', null);
  const shocker = createBeast('Electric', 10, 10, 'SHOCK', null);
  const tbird = createBeast('Thunderbird', 10, 10, null, 'TRIPLE_IF_SHOCK');
  const venom = createBeast('Venomous', 10, 10, 'POISON', null);
  const gargoyle = createBeast('Gargoyle', 10, 10, null, 'CONSUME_POISON');
  const cleric = createBeast('Cleric', 10, 10, null, 'BUFF_NEXT_20');
  const normal = createBeast('Normal', 10, 10, null, null);

  // VULNERABLE Test
  const dmgVuln = calculateDamage([leech, normal], 100);
  expect(dmgVuln.totalDamage).toBe(10 + 15); // 10 + (10 * 1.5) = 25

  // SHOCK Test
  const dmgShock = calculateDamage([shocker, tbird], 100);
  expect(dmgShock.totalDamage).toBe(10 + 30); // 10 + (10 * 3) = 40

  // CONSUME POISON Test
  const dmgCons = calculateDamage([venom, gargoyle, tbird], 100); 
  // venom applies POISON
  // gargoyle consumes POISON -> dmg = 10 + 50 = 60. POISON is gone.
  // tbird does normal dmg = 10.
  expect(dmgCons.totalDamage).toBe(10 + 60 + 10); // 80

  // BUFF_NEXT Test
  const dmgBuff = calculateDamage([cleric, normal], 100);
  expect(dmgBuff.totalDamage).toBe(10 + 30); // 10 + (10 + 20) = 40
});
