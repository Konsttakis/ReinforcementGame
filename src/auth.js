import { supabase } from './supabaseClient.js';

// Current logged in user object
export let currentUser = null;

// Auth state callbacks
const authStateListeners = [];

export function onAuthStateChange(callback) {
  authStateListeners.push(callback);
}

function notifyListeners(user) {
  authStateListeners.forEach(cb => cb(user));
}

// Initialize and listen to auth state changes
export async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  notifyListeners(currentUser);

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    notifyListeners(currentUser);
  });
  return currentUser;
}

// Google OAuth
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
}

// Email & Password Register
export async function registerWithEmail(email, password, username) {
  let finalUsername = username;
  if (!finalUsername || finalUsername.trim() === '') {
    finalUsername = 'Player_' + Math.floor(1000 + Math.random() * 9000);
  }
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: finalUsername,
      }
    }
  });
  if (error) throw error;
  return data;
}

// Email & Password Login
export async function loginWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

// Sign Out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Update Username
export async function updateUsername(newUsername) {
  if (!currentUser) throw new Error("Not logged in");
  
  if (!newUsername || newUsername.trim() === '') {
    throw new Error("Username cannot be empty");
  }

  // 1. Update profiles table
  const { error } = await supabase
    .from('profiles')
    .update({ username: newUsername.trim() })
    .eq('id', currentUser.id);
    
  if (error) throw error;
  
  // 2. Update auth user metadata
  const { data, error: authError } = await supabase.auth.updateUser({
    data: { username: newUsername.trim() }
  });
  
  if (authError) throw authError;
  
  if (data?.user) {
    currentUser = data.user;
    notifyListeners(currentUser);
  }
}
