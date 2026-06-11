import { supabase } from './supabaseClient.js';
import { currentUser } from './auth.js';

// Local storage keys
const META_KEY = 'antigravity_meta';
const RUN_KEY = 'antigravity_run';

// ----------------------------------------------------------------------------
// Local Storage Base Operations
// ----------------------------------------------------------------------------
function getLocalMeta() {
  return JSON.parse(localStorage.getItem(META_KEY)) || { dna: 0, skillTree: {} };
}
function setLocalMeta(meta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

function getLocalRun() {
  const saved = localStorage.getItem(RUN_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.version === 1) return parsed.state;
    } catch (e) {
      console.warn('Failed to parse local save', e);
    }
  }
  return null;
}
function setLocalRun(state) {
  localStorage.setItem(RUN_KEY, JSON.stringify({ version: 1, state }));
}

// ----------------------------------------------------------------------------
// Cloud Sync Operations
// ----------------------------------------------------------------------------
let syncTimeout = null;

// Debounced cloud save
function queueCloudSave() {
  if (!currentUser) return;
  if (localStorage.getItem('antigravity_god_mode_flag') === 'true') return;
  
  if (syncTimeout) clearTimeout(syncTimeout);
  
  syncTimeout = setTimeout(async () => {
    try {
      const meta = getLocalMeta();
      const run = getLocalRun();
      
      const { data, error } = await supabase
        .from('saves')
        .update({
          meta_state: meta,
          run_state: run,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', currentUser.id)
        .select('updated_at')
        .single();
        
      if (error) console.error('Cloud save failed:', error);
      else if (data) {
        localStorage.setItem('antigravity_last_saved', data.updated_at);
        console.log('Saved to cloud.');
      }
    } catch (err) {
      console.error('Error during cloud sync:', err);
    }
  }, 2000); // Debounce for 2 seconds
}

export async function syncFromCloud() {
  if (!currentUser) return;
  try {
    const { data, error } = await supabase
      .from('saves')
      .select('meta_state, run_state, updated_at')
      .eq('user_id', currentUser.id)
      .single();
      
    if (error) {
      console.error('Failed to load from cloud:', error);
      return;
    }
    
    if (data) {
      const lastSyncedCloud = localStorage.getItem('antigravity_last_saved');
      const lastLocal = localStorage.getItem('antigravity_last_saved_local');
      
      // If cloud is same as what we last synced, no new cloud changes.
      if (lastSyncedCloud === data.updated_at) {
        return;
      }
      
      // If no local save at all, just apply cloud
      if (!lastLocal) {
        applyCloudData(data);
        return;
      }
      
      // We have a conflict! The cloud save is different from what we last synced,
      // AND we have local data. Prompt the user.
      const conflictEvent = new CustomEvent('saveConflict', {
        detail: {
           cloudData: data,
           localMeta: getLocalMeta(),
           localRun: getLocalRun(),
           cloudTime: data.updated_at,
           localTime: lastLocal
        }
      });
      window.dispatchEvent(conflictEvent);
    }
  } catch (err) {
    console.error('Error during cloud sync from:', err);
  }
}

export function applyCloudData(data) {
  if (data.meta_state && Object.keys(data.meta_state).length > 0) {
    setLocalMeta(data.meta_state);
  }
  if (data.run_state !== undefined) {
    if (data.run_state) setLocalRun(data.run_state);
    else localStorage.removeItem(RUN_KEY);
  }
  localStorage.setItem('antigravity_last_saved', data.updated_at);
  localStorage.setItem('antigravity_last_saved_local', data.updated_at);
  console.log('Applied cloud save.');
  
  // Reload the page to apply state cleanly
  window.location.reload();
}

export function keepLocalData() {
  // Overwrite cloud with local
  queueCloudSave();
  console.log('Kept local save.');
}

// ----------------------------------------------------------------------------
// Exported API
// ----------------------------------------------------------------------------
export function loadMetaState() {
  return getLocalMeta();
}

export function saveMetaState(metaState) {
  setLocalMeta(metaState);
  localStorage.setItem('antigravity_last_saved_local', new Date().toISOString());
  queueCloudSave();
}

export function loadRunState() {
  return getLocalRun();
}

export function saveRunState(state) {
  setLocalRun(state);
  localStorage.setItem('antigravity_last_saved_local', new Date().toISOString());
  queueCloudSave();
}

export function clearRunState() {
  localStorage.removeItem(RUN_KEY);
  queueCloudSave();
}
