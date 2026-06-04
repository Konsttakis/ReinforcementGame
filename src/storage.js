export function loadMetaState() {
  return JSON.parse(localStorage.getItem('antigravity_meta')) || { dna: 0, skillTree: {} };
}

export function saveMetaState(metaState) {
  localStorage.setItem('antigravity_meta', JSON.stringify(metaState));
}

export function loadRunState() {
  const saved = localStorage.getItem('antigravity_run');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.version === 1) {
        return parsed.state;
      }
    } catch (e) {
      console.warn('Failed to parse save', e);
    }
  }
  return null;
}

export function saveRunState(state) {
  localStorage.setItem('antigravity_run', JSON.stringify({ version: 1, state }));
}

export function clearRunState() {
  localStorage.removeItem('antigravity_run');
}
