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
