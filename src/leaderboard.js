import { supabase } from './supabaseClient.js';
import { currentUser } from './auth.js';

// Fetch the top 100 players from the profiles table
export async function fetchLeaderboard() {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, highest_level')
    .order('highest_level', { ascending: false })
    .limit(100);
    
  if (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
  return data;
}

// Update the user's highest level if the new level is higher
export async function updateHighestLevel(newLevel) {
  if (!currentUser) return;

  try {
    // 1. Fetch current highest_level
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('highest_level')
      .eq('id', currentUser.id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Update if higher
    if (!profile.highest_level || newLevel > profile.highest_level) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ highest_level: newLevel })
        .eq('id', currentUser.id);

      if (updateError) throw updateError;
    }
  } catch (err) {
    console.error('Error updating highest level:', err);
  }
}
