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
