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
      while (p2Idx < p2.length && child.includes(p2[p2Idx])) {
        p2Idx++;
      }
      if (p2Idx < p2.length) {
        child[i] = p2[p2Idx];
      } else {
        // Fallback for edge cases where p2 lacks unique elements (shouldn't happen with clones)
        child[i] = p1[i];
      }
    }
  }
  return child;
}

export function mutateSwap(seq) {
  if (seq.length < 2) return seq;
  const child = [...seq];
  
  // 50% chance to specifically swap an active beast with an inventory beast (if inventory exists)
  if (child.length > 5 && Math.random() < 0.5) {
    const activeIdx = Math.floor(Math.random() * 5);
    const invIdx = 5 + Math.floor(Math.random() * (child.length - 5));
    const temp = child[activeIdx];
    child[activeIdx] = child[invIdx];
    child[invIdx] = temp;
    return child;
  }
  
  // Otherwise, normal random swap anywhere
  const idx1 = Math.floor(Math.random() * child.length);
  let idx2 = Math.floor(Math.random() * child.length);
  while (idx1 === idx2) {
    idx2 = Math.floor(Math.random() * child.length);
  }
  const temp = child[idx1];
  child[idx1] = child[idx2];
  child[idx2] = temp;
  return child;
}
