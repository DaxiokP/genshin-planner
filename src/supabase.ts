import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables are missing. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env.local file. Falling back to local storage.'
  );
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface PlannerState {
  materials: Record<string, number> | null;
  characters: any[];
  weapons: any[];
  artifacts: any[];
  planned_characters: any[];
  planned_items?: any[];
  favorite_character_keys: string[];
}

// Fetch all profiles for an authenticated user
export async function fetchUserProfiles(userId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('user_planners')
    .select('*')
    .eq('user_id', userId)
    .order('profile_name', { ascending: true });

  if (error) {
    console.error('Error fetching user profiles:', error);
    throw error;
  }
  return data || [];
}

// Upsert a profile's data in the database
export async function saveProfileState(
  userId: string,
  profileName: string,
  state: PlannerState
) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('user_planners')
    .upsert({
      user_id: userId,
      profile_name: profileName,
      materials: state.materials || {},
      characters: state.characters,
      weapons: state.weapons,
      artifacts: state.artifacts,
      planned_characters: state.planned_characters,
      planned_items: state.planned_items || [],
      favorite_character_keys: state.favorite_character_keys || [],
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,profile_name'
    })
    .select();

  if (error) {
    console.error(`Error saving profile state for ${profileName}:`, error);
    throw error;
  }
  return data?.[0] || null;
}

// Ensure at least one profile exists (named after the username capitalized)
export async function ensureDefaultProfilesExist(userId: string, username: string) {
  if (!supabase) return;
  const profiles = await fetchUserProfiles(userId);
  if (profiles.length > 0) return; // User already has profiles

  // Capitalize first letter of username for a nice profile name
  const capitalizedName = username.charAt(0).toUpperCase() + username.slice(1);
  
  const defaultState = {
    materials: {},
    characters: [],
    weapons: [],
    artifacts: [],
    planned_characters: [],
    favorite_character_keys: []
  };

  const { error } = await supabase
    .from('user_planners')
    .insert({
      user_id: userId,
      profile_name: capitalizedName,
      ...defaultState
    });
      
  if (error) {
    console.error('Error creating default profile:', error);
  }
}

// Dynamically create a custom profile inside the shared account
export async function createCustomProfile(userId: string, profileName: string) {
  if (!supabase) return null;
  
  const defaultState = {
    materials: {},
    characters: [],
    weapons: [],
    artifacts: [],
    planned_characters: [],
    favorite_character_keys: []
  };

  const { data, error } = await supabase
    .from('user_planners')
    .insert({
      user_id: userId,
      profile_name: profileName.trim(),
      ...defaultState
    })
    .select();

  if (error) {
    console.error('Error creating custom profile:', error);
    throw error;
  }
  return data?.[0] || null;
}

// Safely delete a custom profile
export async function deleteUserProfile(userId: string, profileName: string) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('user_planners')
    .delete()
    .eq('user_id', userId)
    .eq('profile_name', profileName)
    .select();

  if (error) {
    console.error(`Error deleting profile ${profileName}:`, error);
    throw error;
  }
  return data;
}

// Rename an existing profile
export async function updateProfileName(userId: string, oldName: string, newName: string) {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('user_planners')
    .update({ profile_name: newName.trim() })
    .eq('user_id', userId)
    .eq('profile_name', oldName)
    .select();

  if (error) {
    console.error(`Error renaming profile from ${oldName} to ${newName}:`, error);
    throw error;
  }
  return data?.[0] || null;
}
