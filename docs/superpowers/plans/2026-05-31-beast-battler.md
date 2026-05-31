# Beast Battler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a web-based auto-battler where the player manages an economy to run Genetic Algorithm epochs to optimize beast attack order, featuring damage variance and complex synergies.

**Architecture:** Pure Vanilla JavaScript (ESM) with Vite for bundling and Vitest for TDD. UI is DOM-based using `createElement`. Logic is split into core modules: `combat`, `ga`, `economy`, and `ui`.

**Tech Stack:** JavaScript (ES6+), HTML5, CSS3, Vite, Vitest

---

### Task 1: Project Setup & Test Infrastructure

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`

- [ ] **Step 1: Initialize project and write test script**

```json
{
  "name": "beast-battler",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 2: Run npm install**

Run: `npm install`
Expected: Node modules installed.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: setup vite and vitest"
```

### Task 2: Combat Engine & Synergies

**Files:**
- Create: `src/combat.js`
- Create: `tests/combat.test.js`

- [ ] **Step 1: Write the failing test for basic combat and variance**

```javascript
// tests/combat.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL with "createBeast is not defined"

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/combat.js
export function createBeast(name, minDamage, maxDamage, appliesStatus, synergy) {
  return { name, minDamage, maxDamage, appliesStatus, synergy };
}

export function calculateDamage(beastArray, bossHp) {
  let totalDamage = 0;
  let currentStatuses = new Set();

  for (const beast of beastArray) {
    let dmg = Math.floor(Math.random() * (beast.maxDamage - beast.minDamage + 1)) + beast.minDamage;
    
    if (beast.synergy === 'DOUBLE_IF_POISONED' && currentStatuses.has('POISON')) {
      dmg *= 2;
    }

    totalDamage += dmg;

    if (beast.appliesStatus) {
      currentStatuses.add(beast.appliesStatus);
    }
  }

  return { totalDamage, bossKilled: totalDamage >= bossHp };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/combat.js tests/combat.test.js
git commit -m "feat: implement combat engine with variance and synergies"
```

### Task 3: Genetic Algorithm (Order Crossover & Mutation)

**Files:**
- Create: `src/ga.js`
- Create: `tests/ga.test.js`

- [ ] **Step 1: Write the failing test for Order Crossover (OX1)**

```javascript
// tests/ga.test.js
import { expect, test } from 'vitest';
import { orderCrossover, mutateSwap } from '../src/ga.js';

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
  const mutated = mutateSwap([...seq]);
  expect(mutated).not.toEqual(seq);
  expect(mutated.length).toBe(3);
  expect(mutated.includes(1)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL with "orderCrossover is not defined"

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/ga.js
export function orderCrossover(p1, p2, startIdx, endIdx) {
  const child = new Array(p1.length).fill(null);
  
  // Copy segment from p1
  for (let i = startIdx; i < endIdx; i++) {
    child[i] = p1[i];
  }
  
  // Fill rest from p2
  let p2Idx = 0;
  for (let i = 0; i < child.length; i++) {
    if (child[i] === null) {
      while (child.includes(p2[p2Idx])) {
        p2Idx++;
      }
      child[i] = p2[p2Idx];
    }
  }
  return child;
}

export function mutateSwap(seq) {
  if (seq.length < 2) return seq;
  const idx1 = Math.floor(Math.random() * seq.length);
  let idx2 = Math.floor(Math.random() * seq.length);
  while (idx1 === idx2) {
    idx2 = Math.floor(Math.random() * seq.length);
  }
  const temp = seq[idx1];
  seq[idx1] = seq[idx2];
  seq[idx2] = temp;
  return seq;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ga.js tests/ga.test.js
git commit -m "feat: implement GA crossover and mutation"
```

### Task 4: Economy & Shop

**Files:**
- Create: `src/economy.js`
- Create: `tests/economy.test.js`

- [ ] **Step 1: Write the failing test for economy**

```javascript
// tests/economy.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test`
Expected: FAIL with module not found

- [ ] **Step 3: Write minimal implementation**

```javascript
// src/economy.js
export function buyBeast(state, beast) {
  if (state.gold >= beast.cost) {
    return {
      ...state,
      gold: state.gold - beast.cost,
      beasts: [...state.beasts, beast]
    };
  }
  return state;
}

export function buyEpochs(state, amount) {
  if (state.gold >= amount) {
    return {
      ...state,
      gold: state.gold - amount,
      epochs: state.epochs + amount
    };
  }
  return state;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/economy.js tests/economy.test.js
git commit -m "feat: implement shop economy logic"
```
