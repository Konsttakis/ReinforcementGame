import { expect, test } from 'vitest';
import { orderCrossover, mutateSwap } from '../src/engine/ga.js';

test('orderCrossover preserves exact elements without duplicates', () => {
  const p1 = [1, 2, 3, 4, 5];
  const p2 = [5, 4, 3, 2, 1];
  
  const child = orderCrossover(p1, p2, 1, 3); // Copy indices 1,2 from p1 -> [x, 2, 3, x, x]
  // Remaining from p2: 5, 4, 1
  // Expected child: [5, 2, 3, 4, 1]
  expect(child).toEqual([5, 2, 3, 4, 1]);
});

test('mutateSwap swaps two elements', () => {
  const seq = [1, 2, 3];
  const mutated = mutateSwap([...seq], 3, 0.0, 1.0);
  expect(mutated).not.toEqual(seq);
  expect(mutated.length).toBe(3);
  expect(mutated.includes(1)).toBe(true);
});
