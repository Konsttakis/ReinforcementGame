import { expect, test } from 'vitest';
import { buyBeast, buyEpochs } from '../src/economy.js';

test('buyBeast reduces gold and adds beast', () => {
  const state = { gold: 100, beasts: [] };
  const result = buyBeast(state, { name: 'Fire', cost: 30 });
  expect(result.gold).toBe(70);
  expect(result.beasts.length).toBe(1);
});

test('buyEpochs increases compute', () => {
  const state = { gold: 50, epochs: 10 };
  const result = buyEpochs(state, 20); // 1 epoch = 1 gold
  expect(result.gold).toBe(30);
  expect(result.epochs).toBe(30);
});
