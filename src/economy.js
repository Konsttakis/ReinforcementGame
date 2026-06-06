export function buyBeast(state, beast) {
  const isGodMode = localStorage.getItem('antigravity_god_mode_flag') === 'true';
  const cost = isGodMode ? 0 : beast.cost;
  if (state.gold >= cost) {
    return {
      ...state,
      gold: state.gold - cost,
      beasts: [...state.beasts, beast]
    };
  }
  return state;
}

export function buyEpochs(state, amount) {
  const isGodMode = localStorage.getItem('antigravity_god_mode_flag') === 'true';
  const cost = isGodMode ? 0 : amount;
  if (state.gold >= cost) {
    return {
      ...state,
      gold: state.gold - cost,
      epochs: state.epochs + amount
    };
  }
  return state;
}
