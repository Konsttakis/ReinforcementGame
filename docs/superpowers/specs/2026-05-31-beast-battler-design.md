# Beast Battler (Auto-Battler with RL Optimization)
**Date:** 2026-05-31
**Platform:** Web Application (HTML, CSS, JS/Vite)

## 1. Overview
A Balatro-style roguelike auto-battler where the core mechanic is managing an economy to buy "compute time" for a Genetic Algorithm. The player acquires beasts with complex synergies, but cannot manually order them for combat. Instead, they spend gold to run epochs of a Genetic Algorithm that searches for the optimal attack order to defeat the level's Boss.

## 2. Core Game Loop
1. **Shop Phase:** Player uses Gold to buy new beasts, upgrade the shop tier, or purchase compute "Epochs" for the current level.
2. **Compute Phase:** The player clicks "Run Epochs". A highly aesthetic visualization shows the Genetic Algorithm evolving the best beast permutation.
3. **Combat Phase:** The beasts attack the Boss in the absolute best order found by the algorithm.
4. **Resolution:** If the Boss's HP hits 0, the player earns Gold and advances to the next level. If the Boss survives, the run ends (Game Over).

## 3. Combat & Synergies
Beasts attack one at a time. The order matters entirely because of synergies.
- **Base Stats:** Each beast has a Base Damage.
- **Status Effects/Synergies:** Beasts can apply buffs to themselves, debuffs to the boss, or multipliers to the *next* beast in the lineup.
- *Example:* "Venomous Beast" applies Poison. "Reaper Beast" deals 3x damage if the target is Poisoned. If Reaper attacks before Venomous, the synergy is lost.

## 4. The Genetic Algorithm
Instead of manual placement, a GA optimizes the ordering of the player's active beasts.
- **Genotype:** A permutation array of the current beast lineup.
- **Fitness Function:** The total damage output of the permutation against the Boss (simulated instantly in the background).
- **Selection:** Elitism (keeping the top scoring permutations) and Tournament selection (keeping some lower-scoring ones to avoid local minimums).
- **Crossover:** "Order Crossover" (OX1). Half the sequence is taken from Parent A, and the remaining beasts are filled in the order they appear in Parent B, ensuring no duplicate beasts in the child sequence.
- **Mutation:** Random swap mutation. Two beasts in the child sequence swap positions.
- **Economy Tie-in:** 1 "Epoch" = 1 Generation of the GA. Buying more epochs gives the algorithm a higher chance of finding the global maximum (the perfect synergy combo).

## 5. Technical Architecture & UI
- **Tech Stack:** Vanilla JavaScript (ES6+ module pattern), Vite, HTML5 Canvas or DOM-based UI, custom CSS.
- **Aesthetics:** Dark mode, glassmorphism, sleek typography, micro-animations. 
- **GA Visualization:** 
  - A dedicated UI panel during the Compute Phase showing a "Matrix" of permutations.
  - Rapidly updating lists showing red (culled) and green (surviving) orderings.
  - An animated line chart graphing `Best Damage Found` and `Average Damage` climbing over generations.
  - A satisfying "Lock-In" animation when the best sequence is finalized for Combat.
- **Secure Web Standards:** Built avoiding raw `innerHTML` injections; DOM manipulations will use `textContent` and `createElement` in adherence with security guidelines.

## 6. Development Milestones
1. Scaffold Vite project and implement base UI layout.
2. Build the Combat Engine (simulation of attacks and synergies).
3. Implement the Genetic Algorithm and its visual dashboard.
4. Implement the Shop and Economy (Balatro-style run loop).
5. Polish aesthetics and animations.
