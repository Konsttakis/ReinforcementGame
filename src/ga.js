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
