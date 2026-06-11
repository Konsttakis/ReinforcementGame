import { getSkillEffect } from '../../skilltree.js';
import { hasRelic, getStatus } from '../../utils.js';

export const StatusRegistry = {
  POISON: {
    onTick: (ctx) => {
      let poisonMultiplier = 15;
      if (hasRelic('venom_gland', ctx.gameState.relics)) poisonMultiplier = 25;
      poisonMultiplier += getSkillEffect('alc_poison', ctx.ms) * 5;
      
      let ticks = 1;
      if (hasRelic('plague_rat', ctx.gameState.relics)) ticks = 2;
      let dmg = getStatus(ctx.currentStatuses, 'POISON') * poisonMultiplier * ticks;
      return dmg;
    }
  },
  FIRE: {
    onTick: (ctx) => {
      let fireMult = 10 + getSkillEffect('alc_fire', ctx.ms) * 5;
      if (hasRelic('thermite_paste', ctx.gameState.relics) && getStatus(ctx.currentStatuses, 'VULNERABLE') > 0) {
        fireMult *= (1 + (0.2 * ctx.currentStatuses['VULNERABLE']));
      }
      let dmg = getStatus(ctx.currentStatuses, 'FIRE') * fireMult;
      
      if (!ctx.gameState.relics || !hasRelic('molten_core', ctx.gameState.relics)) {
        const keepChance = getSkillEffect('alc_dot_persist', ctx.ms) * 0.25;
        if (Math.random() > keepChance) {
          ctx.currentStatuses['FIRE'] = Math.max(0, ctx.currentStatuses['FIRE'] - 1);
        }
      }
      return dmg;
    }
  }
};
