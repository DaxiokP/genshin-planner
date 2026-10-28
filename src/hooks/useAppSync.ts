import { useState, useRef, useEffect } from 'react';
import type { MaterialsData, GoodCharacter, GoodWeapon, GoodArtifact } from '../types';
import { supabase, fetchUserProfiles, saveProfileState } from '../supabase';
import { isTravelerKey, getTravelerElement, getCharacterPlanId, type TravelerKey } from '../utils/characterHelpers';

function normalizeLoadedPlannedItems(items: any[], traveler: TravelerKey): any[] {
  return (items || []).map(item => {
    if ((item.type === 'character' || !item.type) && isTravelerKey(item.key)) {
      const el = getTravelerElement(item);
      return {
        ...item,
        type: 'character',
        travelerElement: el,
        id: getCharacterPlanId(item, traveler, el),
      };
    }
    return item;
  });
}

function parseTravelerAndFavorites(
  rawFavorites: any,
  explicitTraveler?: any
): { traveler: TravelerKey; favorites: string[] } {
  const arr = Array.isArray(rawFavorites) ? rawFavorites : [];
  let resolvedTraveler: TravelerKey = 'Aether';

  if (explicitTraveler === 'Lumine' || explicitTraveler === 'Aether') {
    resolvedTraveler = explicitTraveler;
  } else {
    const tag = arr.find((k: any) => typeof k === 'string' && k.startsWith('__traveler:'));
    if (tag) {
      const val = tag.replace('__traveler:', '');
      if (val === 'Lumine' || val === 'Aether') {
        resolvedTraveler = val;
      }
    }
  }

  const favorites = arr.filter((k: any) => typeof k === 'string' && !k.startsWith('__traveler:'));
  return { traveler: resolvedTraveler, favorites };
}

export function useAppSync() {
  const [materials, setMaterials] = useState<MaterialsData | null>(null);
  const [characters, setCharacters] = useState<GoodCharacter[]>([]);
  const [weapons, setWeapons] = useState<GoodWeapon[]>([]);
  const [artifacts, setArtifacts] = useState<GoodArtifact[]>([]);
  const [plannedItems, setPlannedItems] = useState<any[]>([]);
  const [favoriteCharacterKeys, setFavoriteCharacterKeys] = useState<string[]>([]);
  const [traveler, setTraveler] = useState<TravelerKey>('Aether');

  // --- Supabase Authentication & Syncing State ---
  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfile, setActiveProfile] = useState<string>(() => {
    return localStorage.getItem('genshin_planner_active_profile') || '';
  });
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'local' | 'syncing' | 'synced' | 'error'>('local');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  useEffect(() => {
    if (activeProfile) {
      localStorage.setItem('genshin_planner_active_profile', activeProfile);
    }
  }, [activeProfile]);

  const isSavingBlocked = useRef(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const saveTimeoutRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Monitor Supabase Authentication Changes
  useEffect(() => {
    if (!supabase) return;

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        // If logged out, reset active profile and profiles
        setActiveProfile('');
        setProfiles([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync profile data when active profile or user changes
  useEffect(() => {
    let active = true;

    async function loadData() {
      isSavingBlocked.current = true;
      setIsLoadingProfile(true);
      setSyncStatus('syncing');

      try {
        if (user) {
          // Fetch cloud data
          const fetchedProfiles = await fetchUserProfiles(user.id);
          if (!active) return;

          setProfiles(fetchedProfiles);

          if (fetchedProfiles.length === 0) {
            setSyncStatus('synced');
            setIsLoadingProfile(false);
            isSavingBlocked.current = false;
            return;
          }

          // Determine target profile name
          let targetProfile = activeProfile;
          const exists = fetchedProfiles.some(
            p => p.profile_name.toLowerCase() === targetProfile.toLowerCase()
          );

          if (!targetProfile || !exists) {
            targetProfile = fetchedProfiles[0].profile_name;
            setActiveProfile(targetProfile);
          }

          const currentProfileData = fetchedProfiles.find(
            p => p.profile_name.toLowerCase() === targetProfile.toLowerCase()
          );

          let materialsData = currentProfileData?.materials || null;
          let charactersData = currentProfileData?.characters || [];
          let weaponsData = currentProfileData?.weapons || [];
          let artifactsData = currentProfileData?.artifacts || [];
          let plannedCharactersData = currentProfileData?.planned_characters || [];
          let plannedItemsData = currentProfileData?.planned_items || [];
          const parsedCloud = parseTravelerAndFavorites(
            currentProfileData?.favorite_character_keys,
            currentProfileData?.traveler
          );
          let favoriteCharacterKeysData = parsedCloud.favorites;
          let travelerData: TravelerKey = parsedCloud.traveler;

          // Migration logic: If cloud profile is empty but local has data, migrate it!
          const localDataStr = localStorage.getItem('genshin_planner_local_data');
          if (localDataStr && (!materialsData || Object.keys(materialsData).length === 0) && charactersData.length === 0) {
            try {
              const localData = JSON.parse(localDataStr);
              if (localData.materials && Object.keys(localData.materials).length > 0) {
                materialsData = localData.materials;
                charactersData = localData.characters || [];
                weaponsData = localData.weapons || [];
                artifactsData = localData.artifacts || [];
                plannedCharactersData = localData.planned_characters || [];
                plannedItemsData = localData.planned_items || [];
                const parsedLocal = parseTravelerAndFavorites(
                  localData.favorite_character_keys,
                  localData.traveler
                );
                favoriteCharacterKeysData = parsedLocal.favorites;
                travelerData = parsedLocal.traveler;

                if (plannedItemsData.length === 0 && plannedCharactersData.length > 0) {
                  plannedItemsData = plannedCharactersData.map((item: any) => ({
                    ...item,
                    type: 'character',
                    id: `character:${item.key}`
                  }));
                }

                // Save directly to DB
                await saveProfileState(user.id, targetProfile, {
                  materials: materialsData,
                  characters: charactersData,
                  weapons: weaponsData,
                  artifacts: artifactsData,
                  planned_characters: plannedCharactersData,
                  planned_items: plannedItemsData,
                  favorite_character_keys: favoriteCharacterKeysData,
                  traveler: travelerData
                });
                console.log(`Migrated local data to cloud for profile: ${targetProfile}`);

                // Refresh profiles
                const refreshed = await fetchUserProfiles(user.id);
                if (active) setProfiles(refreshed);
              }
            } catch (migrationErr) {
              console.error('Migration failed:', migrationErr);
            }
          }

          if (plannedItemsData.length === 0 && plannedCharactersData.length > 0) {
            plannedItemsData = plannedCharactersData.map((item: any) => ({
              ...item,
              type: 'character',
              id: `character:${item.key}`
            }));
          }
          plannedItemsData = normalizeLoadedPlannedItems(plannedItemsData, travelerData);

          setMaterials(materialsData);
          setCharacters(charactersData);
          setWeapons(weaponsData);
          setArtifacts(artifactsData);
          setPlannedItems(plannedItemsData);
          setFavoriteCharacterKeys(favoriteCharacterKeysData);
          setTraveler(travelerData);
          setSyncStatus('synced');
        } else {
          // Load local storage
          const localDataStr = localStorage.getItem('genshin_planner_local_data');
          if (!active) return;

          if (localDataStr) {
            const localData = JSON.parse(localDataStr);
            setMaterials(localData.materials);
            setCharacters(localData.characters || []);
            setWeapons(localData.weapons || []);
            setArtifacts(localData.artifacts || []);

            let plannedItemsData = localData.planned_items || [];
            if (plannedItemsData.length === 0 && localData.planned_characters && localData.planned_characters.length > 0) {
              plannedItemsData = localData.planned_characters.map((item: any) => ({
                ...item,
                type: 'character',
                id: `character:${item.key}`
              }));
            }

            const parsedLocal = parseTravelerAndFavorites(
              localData.favorite_character_keys,
              localData.traveler
            );
            plannedItemsData = normalizeLoadedPlannedItems(plannedItemsData, parsedLocal.traveler);
            setPlannedItems(plannedItemsData);
            setFavoriteCharacterKeys(parsedLocal.favorites);
            setTraveler(parsedLocal.traveler);
          } else {
            setMaterials(null);
            setCharacters([]);
            setWeapons([]);
            setArtifacts([]);
            setPlannedItems([]);
            setFavoriteCharacterKeys([]);
            setTraveler('Aether');
          }
          setSyncStatus('local');
        }
      } catch (err) {
        console.error('Error loading profile data:', err);
        setSyncStatus('error');
      } finally {
        if (active) {
          // Micro delay to let react state setters resolve before unblocking saves
          setTimeout(() => {
            isSavingBlocked.current = false;
            setIsLoadingProfile(false);
          }, 100);
        }
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [user, activeProfile]);

  // Save profile data automatically to cloud or local storage when any state updates
  useEffect(() => {
    if (isSavingBlocked.current || isLoadingProfile) {
      return;
    }

    const stateToSave = {
      materials,
      characters,
      weapons,
      artifacts,
      planned_characters: plannedItems.filter(item => item.type === 'character' || !item.type),
      planned_items: plannedItems,
      favorite_character_keys: favoriteCharacterKeys,
      traveler
    };

    if (user) {
      if (!activeProfile) return;

      setSyncStatus('syncing');
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await saveProfileState(user.id, activeProfile, stateToSave);
          setSyncStatus('synced');
        } catch (err) {
          console.error('Failed to sync to database:', err);
          setSyncStatus('error');
        }
      }, 1000); // 1-second debounce
    } else {
      localStorage.setItem('genshin_planner_local_data', JSON.stringify(stateToSave));
      setSyncStatus('local');
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [materials, characters, weapons, artifacts, plannedItems, favoriteCharacterKeys, traveler, user, activeProfile, isLoadingProfile]);

  return {
    materials,
    setMaterials,
    characters,
    setCharacters,
    weapons,
    setWeapons,
    artifacts,
    setArtifacts,
    plannedItems,
    setPlannedItems,
    favoriteCharacterKeys,
    setFavoriteCharacterKeys,
    traveler,
    setTraveler,
    user,
    setUser,
    profiles,
    setProfiles,
    activeProfile,
    setActiveProfile,
    isAddingProfile,
    setIsAddingProfile,
    newProfileName,
    setNewProfileName,
    isCreatingProfile,
    setIsCreatingProfile,
    syncStatus,
    setSyncStatus,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isProfileDropdownOpen,
    setIsProfileDropdownOpen,
    isLoadingProfile,
    dropdownRef,
  };
}
