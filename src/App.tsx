import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, FileUp, Sparkles, X, Check, Search, UserPlus, Sword, ListOrdered, Cloud, CloudOff, CloudLightning, LogIn, LogOut, ChevronDown, User, Loader2, Trash2, Pencil, Power, RotateCw, ArrowUpNarrowWide, ArrowDownNarrowWide } from 'lucide-react';
import { CharacterCard } from './components/CharacterCard';
import { WeaponCard } from './components/WeaponCard';
import { CharacterSelectionModal } from './components/CharacterSelectionModal';
import { CharacterTargetModal } from './components/CharacterTargetModal';
import { calculateRequirements } from './utils/plannerCalculator';
import './App.css';
import materialMapData from './maps/materialMap.json';
import characterMapData from './maps/characterMap.json';
import weaponMapData from './maps/weaponMap.json';
import { supabase, fetchUserProfiles, saveProfileState, createCustomProfile, deleteUserProfile } from './supabase';
import { AuthModal } from './components/AuthModal';
import { DeletePlanConfirmationModal } from './components/DeletePlanConfirmationModal';
import { UpgradeCharacterModal } from './components/UpgradeCharacterModal';
import { UpgradeEstimateCorrectionModal } from './components/UpgradeEstimateCorrectionModal';
import { applyUpgradeInventoryMutations, hasSingleStar } from './utils/upgradeHelpers';
import { moveItem } from './utils/plannerHelpers';
import { PriorityManagerModal } from './components/PriorityManagerModal';


type MaterialMapEntry = {
  id: string;
  name?: string;
  rarity: number;
  sources: string[];
  localExt?: string;
  sortGroup?: number;
  sortRank?: number;
};
const materialMap: Record<string, MaterialMapEntry> = materialMapData as any;

// Build case-insensitive lookup indexes (GOOD format keys may differ in casing)
const characterMapRaw: Record<string, any> = characterMapData as any;
const weaponMapRaw: Record<string, any> = weaponMapData as any;
const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

const charIndex: Record<string, string> = {};
Object.keys(characterMapRaw).forEach(k => { charIndex[normalize(k)] = k; });
const lookupChar = (key: string) => {
  const normalizedKey = normalize(key === 'Traveler' ? 'Aether' : key);
  return characterMapRaw[charIndex[normalizedKey]] ?? null;
};

const weaponIndex: Record<string, string> = {};
Object.keys(weaponMapRaw).forEach(k => { weaponIndex[normalize(k)] = k; });
const lookupWeapon = (key: string) => {
  return weaponMapRaw[weaponIndex[normalize(key)]] ?? null;
};


// Type definition for what we expect in the materials section
type MaterialsData = Record<string, number>;

export interface GoodCharacter {
  key: string;
  level: number;
  constellation: number;
  ascension: number;
  talent: {
    auto: number;
    skill: number;
    burst: number;
  };
}

export interface GoodWeapon {
  key: string;
  level: number;
  ascension: number;
  refinement: number;
  location: string;
}

export interface GoodArtifact {
  setKey: string;
  slotKey: 'flower' | 'plume' | 'sands' | 'goblet' | 'circlet';
  level: number;
  rarity: number;
  location: string;
}

export interface PlannedCharacter {
  key: string;
  current: {
    level: number;
    ascension: number;
    talent: { auto: number; skill: number; burst: number };
  };
  desired: {
    level: number;
    ascension: number;
    talent: { auto: number; skill: number; burst: number };
  };
  enabled?: boolean;
}

type TabType = 'planner' | 'characters' | 'weapons' | 'inventory';

function App() {
  const [materials, setMaterials] = useState<MaterialsData | null>(null);
  const [characters, setCharacters] = useState<GoodCharacter[]>([]);
  const [weapons, setWeapons] = useState<GoodWeapon[]>([]);
  const [artifacts, setArtifacts] = useState<GoodArtifact[]>([]);
  const [plannedCharacters, setPlannedCharacters] = useState<PlannedCharacter[]>([]);
  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [canDragCardKey, setCanDragCardKey] = useState<string | null>(null);
  const [draggedCardKey, setDraggedCardKey] = useState<string | null>(null);
  const [dragOverCardKey, setDragOverCardKey] = useState<string | null>(null);
  const [dropPlacement, setDropPlacement] = useState<'before' | 'after' | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('planner');

  const [weaponSearch, setWeaponSearch] = useState<string>('');
  const [selectedWeaponTypes, setSelectedWeaponTypes] = useState<string[]>(['Sword', 'Claymore', 'Polearm', 'Bow', 'Catalyst']);
  const [selectedStarRarities, setSelectedStarRarities] = useState<number[]>([5, 4, 3, 2, 1]);

  const [characterSearch, setCharacterSearch] = useState<string>('');
  const [selectedCharacterWeaponTypes, setSelectedCharacterWeaponTypes] = useState<string[]>(['Sword', 'Claymore', 'Polearm', 'Bow', 'Catalyst']);
  const [selectedCharacterElements, setSelectedCharacterElements] = useState<string[]>(['Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo']);
  const [selectedCharacterRarities, setSelectedCharacterRarities] = useState<number[]>([5, 4]);
  const [characterSortBy, setCharacterSortBy] = useState<'level' | 'name'>('level');
  const [characterSortOrder, setCharacterSortOrder] = useState<'asc' | 'desc'>('desc');
  const [favoriteCharacterKeys, setFavoriteCharacterKeys] = useState<string[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [hoveredItem, setHoveredItem] = useState<{ key: string, data: MaterialMapEntry } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isCharacterSelectModalOpen, setIsCharacterSelectModalOpen] = useState(false);
  const [selectedCharacterKeyForTarget, setSelectedCharacterKeyForTarget] = useState<string | null>(null);
  const [openedTargetFromPlanner, setOpenedTargetFromPlanner] = useState(false);
  const [deletingCharacterKey, setDeletingCharacterKey] = useState<string | null>(null);
  const [selectedUpgradeCharacterKey, setSelectedUpgradeCharacterKey] = useState<string | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpgradeCorrectionModalOpen, setIsUpgradeCorrectionModalOpen] = useState(false);
  const [upgradeDraftTarget, setUpgradeDraftTarget] = useState<any>(null);
  const [draftCraftingBonuses, setDraftCraftingBonuses] = useState<Record<string, number>>({});
  const [estimatedSpend, setEstimatedSpend] = useState<{ mora: number, heroswit: number }>({ mora: 0, heroswit: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Supabase Authentication & Syncing State ---
  const [user, setUser] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfile, setActiveProfile] = useState<string>('');
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'local' | 'syncing' | 'synced' | 'error'>('local');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const isSavingBlocked = useRef(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const saveTimeoutRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const formatCompact = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
    }
    if (num >= 100000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    if (num >= 1000) {
      const kValue = num / 1000;
      return kValue % 1 === 0 ? kValue.toFixed(0) + 'K' : kValue.toFixed(1).replace('.0', '') + 'K';
    }
    return num.toString();
  };

  const renderLevelsAndTalents = (planned: PlannedCharacter) => {
    const charOwned = characters.find(c => c.key === planned.key);
    const constellation = charOwned?.constellation || 0;
    const isSkillBoosted = constellation >= 3;
    const isBurstBoosted = constellation >= 5;

    const skillCur = planned.current.talent.skill + (isSkillBoosted ? 3 : 0);
    const skillDes = planned.desired.talent.skill + (isSkillBoosted ? 3 : 0);
    const skillDiff = skillDes > skillCur;

    const burstCur = planned.current.talent.burst + (isBurstBoosted ? 3 : 0);
    const burstDes = planned.desired.talent.burst + (isBurstBoosted ? 3 : 0);
    const burstDiff = burstDes > burstCur;

    const autoCur = planned.current.talent.auto;
    const autoDes = planned.desired.talent.auto;
    const autoDiff = autoDes > autoCur;

    const boostedColor = '#38bdf8'; // light blue
    const normalColor = 'rgba(255,255,255,0.9)'; // off-white
    const labelColor = 'rgba(255,255,255,0.4)'; // gray label

    const renderTalentRow = (cur: number, des: number, diff: boolean, isBoosted: boolean, label: string) => {
      const textColor = isBoosted ? boostedColor : normalColor;
      const fontStyle = { color: textColor, fontWeight: isBoosted ? '700' : '500' };

      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '0.9rem',
          width: '100%',
          height: '22px',
          position: 'relative'
        }}>
          {/* Centered Transition Container */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '90px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
              <span style={{ ...fontStyle, width: '32px', textAlign: 'right' }}>{cur}</span>
              <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem', width: '26px', textAlign: 'center', fontWeight: 'bold' }}>➔</span>
              <span style={{
                color: isBoosted ? boostedColor : (diff ? '#ffcc66' : textColor),
                fontWeight: isBoosted || diff ? 'bold' : '500',
                width: '32px',
                textAlign: 'left',
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center'
              }}>
                {des}

                {/* Label: absolutely positioned on the right to preserve centering */}
                <span style={{
                  color: labelColor,
                  fontSize: '0.75rem',
                  position: 'absolute',
                  left: '100%',
                  marginLeft: '12px',
                  whiteSpace: 'nowrap',
                  fontWeight: '500'
                }}>
                  {label}
                </span>
              </span>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Outfit', sans-serif",
        gap: '4px',
        marginTop: '0.35rem',
        width: '100%'
      }}>
        {/* Levels */}
        <div style={{ color: '#ffcc66', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Levels
        </div>
        <div style={{
          fontSize: '1.05rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '24px',
          width: '100%'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '90px'
          }}>
            <span style={{
              color: 'rgba(255,255,255,0.9)',
              width: '32px',
              textAlign: 'right',
              fontSize: '0.95rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'flex-end'
            }}>
              {planned.current.level}
              {hasSingleStar(planned.current.level, planned.current.ascension) && (
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginLeft: '2px' }}>✦</span>
              )}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.85rem', width: '26px', textAlign: 'center', fontWeight: 'bold' }}>
              ➔
            </span>
            <span style={{
              color: planned.desired.level > planned.current.level ? '#ffcc66' : 'inherit',
              width: '32px',
              textAlign: 'left',
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '0.95rem'
            }}>
              {planned.desired.level}
              {hasSingleStar(planned.desired.level, planned.desired.ascension) && (
                <span style={{
                  color: '#ffcc66',
                  fontSize: '0.8rem',
                  marginLeft: '2px'
                }}>
                  ✦
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Talents */}
        <div style={{ color: '#ffcc66', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
          Talents
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', alignItems: 'center' }}>
          {renderTalentRow(autoCur, autoDes, autoDiff, false, 'Attack')}
          {renderTalentRow(skillCur, skillDes, skillDiff, isSkillBoosted, 'Skill')}
          {renderTalentRow(burstCur, burstDes, burstDiff, isBurstBoosted, 'Burst')}
        </div>
      </div>
    );
  };

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
          let favoriteCharacterKeysData = currentProfileData?.favorite_character_keys || [];

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
                favoriteCharacterKeysData = localData.favorite_character_keys || [];

                // Save directly to DB
                await saveProfileState(user.id, targetProfile, {
                  materials: materialsData,
                  characters: charactersData,
                  weapons: weaponsData,
                  artifacts: artifactsData,
                  planned_characters: plannedCharactersData,
                  favorite_character_keys: favoriteCharacterKeysData
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

          setMaterials(materialsData);
          setCharacters(charactersData);
          setWeapons(weaponsData);
          setArtifacts(artifactsData);
          setPlannedCharacters(plannedCharactersData);
          setFavoriteCharacterKeys(favoriteCharacterKeysData);
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
            setPlannedCharacters(localData.planned_characters || []);
            setFavoriteCharacterKeys(localData.favorite_character_keys || []);
          } else {
            setMaterials(null);
            setCharacters([]);
            setWeapons([]);
            setArtifacts([]);
            setPlannedCharacters([]);
            setFavoriteCharacterKeys([]);
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
      planned_characters: plannedCharacters,
      favorite_character_keys: favoriteCharacterKeys
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
  }, [materials, characters, weapons, artifacts, plannedCharacters, favoriteCharacterKeys, user, activeProfile, isLoadingProfile]);

  const handleCardDragStart = (e: React.DragEvent, key: string) => {
    setDraggedCardKey(key);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCardDragOver = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (draggedCardKey === targetKey) {
      setDragOverCardKey(null);
      setDropPlacement(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeft = x < rect.width / 2;
    
    setDragOverCardKey(targetKey);
    setDropPlacement(isLeft ? 'before' : 'after');
  };

  const handleCardDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (draggedCardKey && draggedCardKey !== targetKey && dropPlacement) {
      const updated = moveItem(plannedCharacters, draggedCardKey, targetKey, dropPlacement);
      setPlannedCharacters(updated);
    }
    setDraggedCardKey(null);
    setDragOverCardKey(null);
    setDropPlacement(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (file: File) => {
    setError(null);
    if (!file.name.endsWith('.json')) {
      setError('Please upload a valid JSON file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (data.format !== 'GOOD') {
          setError('Invalid file format. Make sure you upload a GOOD format JSON.');
          return;
        }

        if (!data.materials) {
          setError('No materials found in this file.');
          return;
        }

        setMaterials(data.materials);
        setCharacters(data.characters || []);
        setWeapons(data.weapons || []);
        setArtifacts(data.artifacts || []);
      } catch (err) {
        setError('Failed to parse JSON file.');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const removePlannedCharacter = (key: string) => {
    setDeletingCharacterKey(key);
  };

  const upgradePlannedCharacter = (key: string) => {
    const planned = plannedCharacters.find(p => p.key === key);
    if (!planned) return;
    setSelectedUpgradeCharacterKey(key);
    setIsUpgradeModalOpen(true);
  };

  const handleUpgradeModalConfirm = (
    target: {
      level: number;
      ascension: number;
      talent: { auto: number; skill: number; burst: number };
    },
    craftingBonuses: Record<string, number>
  ) => {
    const planned = plannedCharacters.find(p => p.key === selectedUpgradeCharacterKey);
    if (!planned) return;

    const draftChar = { ...planned, desired: target };
    const reqs = calculateRequirements(draftChar, materials);
    
    const moraReq = reqs.find(r => r.key === 'mora')?.required || 0;
    const heroswitReq = reqs.find(r => r.key === 'heroswit')?.required || 0;

    setUpgradeDraftTarget(target);
    setDraftCraftingBonuses(craftingBonuses);
    setEstimatedSpend({ mora: moraReq, heroswit: heroswitReq });
    setIsUpgradeCorrectionModalOpen(true);
  };

  const handleUpgradeFinalConfirmation = (
    correctedMora: number,
    correctedExp: {
      heroswit: number;
      adventurersexperience: number;
      wanderersadvice: number;
    }
  ) => {
    const planned = plannedCharacters.find(p => p.key === selectedUpgradeCharacterKey);
    if (!planned || !upgradeDraftTarget || !materials) return;

    const mutatedMaterials = applyUpgradeInventoryMutations(
      planned,
      upgradeDraftTarget,
      materials,
      draftCraftingBonuses,
      correctedMora,
      correctedExp
    );

    setMaterials(mutatedMaterials);
    setPlannedCharacters(prev => prev.map(p => {
      if (p.key === selectedUpgradeCharacterKey) {
        return {
          ...p,
          current: {
            level: upgradeDraftTarget.level,
            ascension: upgradeDraftTarget.ascension,
            talent: { ...upgradeDraftTarget.talent }
          }
        };
      }
      return p;
    }));

    setCharacters(prev => prev.map(c => {
      if (c.key === selectedUpgradeCharacterKey) {
        return {
          ...c,
          level: upgradeDraftTarget.level,
          ascension: upgradeDraftTarget.ascension,
          talent: { ...upgradeDraftTarget.talent }
        };
      }
      return c;
    }));

    setIsUpgradeCorrectionModalOpen(false);
    setIsUpgradeModalOpen(false);
    setSelectedUpgradeCharacterKey(null);
    setUpgradeDraftTarget(null);
    setDraftCraftingBonuses({});
  };

  const togglePlannedCharacter = (key: string) => {
    setPlannedCharacters(prev => prev.map(p => {
      if (p.key === key) {
        return {
          ...p,
          enabled: p.enabled !== false ? false : true
        };
      }
      return p;
    }));
  };

  const toggleFavoriteCharacter = (key: string) => {
    setFavoriteCharacterKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Build the display list from the FULL materialMap, merging counts from GOOD file
  const allMaterialEntries: [string, number][] = Object.entries(materialMap).map(([key]) => {
    // Try to find matching GOOD key (GOOD uses CamelCase, our map uses lowercase-no-special-chars)
    let count = 0;
    if (materials) {
      // Check direct match first
      for (const goodKey of Object.keys(materials)) {
        if (goodKey.toLowerCase() === key) {
          count = materials[goodKey];
          break;
        }
      }
    }
    return [key, count] as [string, number];
  });

  const filteredMaterials = allMaterialEntries
    .filter(([key]) => {
      const data = materialMap[key];
      const displayName = data?.name || key;
      return displayName.toLowerCase().includes(search.toLowerCase());
    })
    // Sort by category group, then by sortRank (ID-based) within each group
    .sort((a, b) => {
      const da = materialMap[a[0]];
      const db = materialMap[b[0]];
      const groupA = da?.sortGroup ?? 999;
      const groupB = db?.sortGroup ?? 999;
      if (groupA !== groupB) return groupA - groupB;
      const rankA = da?.sortRank ?? 0;
      const rankB = db?.sortRank ?? 0;
      return rankA - rankB;
    });

  const getWeaponName = (w: GoodWeapon) => {
    const mapData = lookupWeapon(w.key);
    return mapData?.name || w.key;
  };

  const getWeaponRarity = (w: GoodWeapon) => {
    const mapData = lookupWeapon(w.key);
    return mapData?.rarity || 1;
  };

  const filteredWeapons = weapons.filter(w => {
    const mapData = lookupWeapon(w.key);
    const displayName = mapData?.name || w.key;
    const type = mapData?.type || '';
    const rarity = mapData?.rarity || 1;

    // Search query
    if (weaponSearch.trim() !== '') {
      const q = weaponSearch.toLowerCase();
      const matchesSearch = displayName.toLowerCase().includes(q) || w.key.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // Type filter
    if (type && !selectedWeaponTypes.includes(type)) {
      return false;
    }

    // Rarity filter
    if (!selectedStarRarities.includes(rarity)) {
      return false;
    }

    return true;
  });

  const sortedWeapons = [...filteredWeapons].sort((a, b) => {
    // 1. level descending
    if (b.level !== a.level) return b.level - a.level;

    // 2. rarity descending
    const rarityA = getWeaponRarity(a);
    const rarityB = getWeaponRarity(b);
    if (rarityB !== rarityA) return rarityB - rarityA;

    // 3. weapon name ascending
    const nameA = getWeaponName(a);
    const nameB = getWeaponName(b);
    const nameComp = nameA.localeCompare(nameB);
    if (nameComp !== 0) return nameComp;

    // 4. equipped weapons before unequipped weapons
    const eqA = a.location ? 1 : 0;
    const eqB = b.location ? 1 : 0;
    if (eqB !== eqA) return eqB - eqA;

    // 5. refinement descending
    if (b.refinement !== a.refinement) return b.refinement - a.refinement;

    // 6. original import order as stable fallback
    return weapons.indexOf(a) - weapons.indexOf(b);
  });

  // Counts for Weapon filter badges based on owned weapons and active filters
  const weaponCounts = useMemo(() => {
    const counts = {
      weaponTypes: {
        Sword: { active: 0, total: 0 },
        Claymore: { active: 0, total: 0 },
        Polearm: { active: 0, total: 0 },
        Bow: { active: 0, total: 0 },
        Catalyst: { active: 0, total: 0 }
      } as Record<string, { active: number, total: number }>,
      rarities: {
        5: { active: 0, total: 0 },
        4: { active: 0, total: 0 },
        3: { active: 0, total: 0 },
        2: { active: 0, total: 0 },
        1: { active: 0, total: 0 }
      } as Record<number, { active: number, total: number }>
    };

    // Total counts based on owned weapons
    weapons.forEach(w => {
      const mapData = lookupWeapon(w.key);
      if (mapData) {
        const type = mapData.type;
        const rarity = mapData.rarity;
        if (type in counts.weaponTypes) {
          counts.weaponTypes[type].total++;
        }
        if (rarity in counts.rarities) {
          counts.rarities[rarity].total++;
        }
      }
    });

    // Active counts based on weapons currently matching ALL active filters
    filteredWeapons.forEach(w => {
      const mapData = lookupWeapon(w.key);
      if (mapData) {
        const type = mapData.type;
        const rarity = mapData.rarity;
        if (type in counts.weaponTypes) {
          counts.weaponTypes[type].active++;
        }
        if (rarity in counts.rarities) {
          counts.rarities[rarity].active++;
        }
      }
    });

    return counts;
  }, [weapons, filteredWeapons]);

  // Helper for smart filter toggling
  const handleFilterToggle = (
    currentSelection: any[],
    allOptions: any[],
    clickedOption: any,
    setSelection: (vals: any[]) => void
  ) => {
    // Case 1: All options are currently selected -> isolate the clicked option
    if (currentSelection.length === allOptions.length) {
      setSelection([clickedOption]);
    }
    // Case 2: Only the clicked option is currently selected -> select all options again
    else if (currentSelection.length === 1 && currentSelection.includes(clickedOption)) {
      setSelection([...allOptions]);
    }
    // Case 3: Multiple options selected, click on an active one -> unselect it
    else if (currentSelection.includes(clickedOption)) {
      const next = currentSelection.filter(x => x !== clickedOption);
      if (next.length === 0) {
        setSelection([...allOptions]); // fallback to all selected to avoid 'no match'
      } else {
        setSelection(next);
      }
    }
    // Case 4: Click on an inactive option -> add to selection
    else {
      setSelection([...currentSelection, clickedOption]);
    }
  };

  // Filtered characters memo
  const filteredCharacters = useMemo(() => {
    // If any filter category has no selection, show empty array
    if (
      selectedCharacterWeaponTypes.length === 0 ||
      selectedCharacterElements.length === 0 ||
      selectedCharacterRarities.length === 0
    ) {
      return [];
    }

    return characters.filter(char => {
      const info = lookupChar(char.key);
      if (!info) return false;

      // 1. Search filter
      if (characterSearch.trim()) {
        const q = characterSearch.toLowerCase();
        const displayName = info.name || char.key;
        const matchesSearch = displayName.toLowerCase().includes(q) || char.key.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // 2. Weapon type filter
      if (!selectedCharacterWeaponTypes.includes(info.weaponType)) {
        return false;
      }

      // 3. Element filter
      if (!selectedCharacterElements.includes(info.element)) {
        return false;
      }

      // 4. Rarity filter
      if (!selectedCharacterRarities.includes(info.rarity)) {
        return false;
      }

      return true;
    });
  }, [characters, characterSearch, selectedCharacterWeaponTypes, selectedCharacterElements, selectedCharacterRarities]);

  // Counts for Character filter badges based on owned characters and active filters
  const characterCounts = useMemo(() => {
    const counts = {
      weaponTypes: {
        Sword: { active: 0, total: 0 },
        Claymore: { active: 0, total: 0 },
        Polearm: { active: 0, total: 0 },
        Bow: { active: 0, total: 0 },
        Catalyst: { active: 0, total: 0 }
      } as Record<string, { active: number, total: number }>,
      elements: {
        Pyro: { active: 0, total: 0 },
        Hydro: { active: 0, total: 0 },
        Anemo: { active: 0, total: 0 },
        Electro: { active: 0, total: 0 },
        Dendro: { active: 0, total: 0 },
        Cryo: { active: 0, total: 0 },
        Geo: { active: 0, total: 0 }
      } as Record<string, { active: number, total: number }>,
      rarities: {
        5: { active: 0, total: 0 },
        4: { active: 0, total: 0 }
      } as Record<number, { active: number, total: number }>
    };

    // Total counts based on owned characters
    characters.forEach(char => {
      const info = lookupChar(char.key);
      if (info) {
        if (info.weaponType in counts.weaponTypes) {
          counts.weaponTypes[info.weaponType].total++;
        }
        if (info.element in counts.elements) {
          counts.elements[info.element].total++;
        }
        if (info.rarity === 5 || info.rarity === 4) {
          counts.rarities[info.rarity].total++;
        }
      }
    });

    // Active counts based on characters currently matching ALL active filters
    filteredCharacters.forEach(char => {
      const info = lookupChar(char.key);
      if (info) {
        if (info.weaponType in counts.weaponTypes) {
          counts.weaponTypes[info.weaponType].active++;
        }
        if (info.element in counts.elements) {
          counts.elements[info.element].active++;
        }
        if (info.rarity === 5 || info.rarity === 4) {
          counts.rarities[info.rarity].active++;
        }
      }
    });

    return counts;
  }, [characters, filteredCharacters]);

  // Sorted characters memo
  const sortedCharacters = useMemo(() => {
    const list = [...filteredCharacters];
    list.sort((a, b) => {
      const isFavA = favoriteCharacterKeys.includes(a.key);
      const isFavB = favoriteCharacterKeys.includes(b.key);

      // 1. Favorite characters first
      if (isFavA !== isFavB) {
        return isFavA ? -1 : 1;
      }

      const infoA = lookupChar(a.key);
      const infoB = lookupChar(b.key);
      const nameA = infoA?.name || a.key;
      const nameB = infoB?.name || b.key;

      const orderMultiplier = characterSortOrder === 'asc' ? 1 : -1;

      if (characterSortBy === 'level') {
        // 2. Character level sort
        if (a.level !== b.level) {
          return (a.level - b.level) * orderMultiplier;
        }
        // 3. Rarity sort (secondary sort under level)
        const rarityA = infoA?.rarity || 4;
        const rarityB = infoB?.rarity || 4;
        if (rarityA !== rarityB) {
          return (rarityA - rarityB) * orderMultiplier;
        }
        // 4. Display name ascending fallback (always alphabetical A-Z)
        return nameA.localeCompare(nameB);
      } else {
        // Name sort
        return nameA.localeCompare(nameB) * orderMultiplier;
      }
    });
    return list;
  }, [filteredCharacters, characterSortBy, characterSortOrder, favoriteCharacterKeys]);


  return (
    <div className="app-container">
      <header className="header">
        <div className="title-section">
          <h1><Sparkles className="inline" size={28} /> Genshin Planner</h1>
          <p>Optimize your ascensions</p>
        </div>
        <nav className="nav-menu">
          <button className={`nav-tab ${activeTab === 'planner' ? 'active' : ''}`} onClick={() => setActiveTab('planner')}>Planner</button>
          <button className={`nav-tab ${activeTab === 'characters' ? 'active' : ''}`} onClick={() => setActiveTab('characters')}>Characters</button>
          <button className={`nav-tab ${activeTab === 'weapons' ? 'active' : ''}`} onClick={() => setActiveTab('weapons')}>Weapons</button>
          <button className={`nav-tab ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>Inventory</button>
        </nav>
        <div className="sync-controls">
          <div className={`sync-status-badge ${syncStatus}`} title={
            syncStatus === 'synced' ? 'All changes synced securely to database.' :
              syncStatus === 'syncing' ? 'Saving changes to database...' :
                syncStatus === 'local' ? 'Data saved in local browser storage only.' :
                  'Error synchronizing data with database.'
          }>
            {syncStatus === 'synced' && (
              <>
                <Cloud size={16} />
                <span>Cloud Synced</span>
              </>
            )}
            {syncStatus === 'syncing' && (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Syncing...</span>
              </>
            )}
            {syncStatus === 'local' && (
              <>
                <CloudOff size={16} />
                <span>Local Saving</span>
              </>
            )}
            {syncStatus === 'error' && (
              <>
                <CloudLightning size={16} />
                <span>Sync Error</span>
              </>
            )}
          </div>

          {user && (
            <div className="profile-switcher" ref={dropdownRef}>
              <button
                className="profile-active-btn"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              >
                <span>Profile: {activeProfile}</span>
                <ChevronDown size={14} />
              </button>
              {isProfileDropdownOpen && (
                <div className="profile-dropdown-menu">
                  {profiles.map(p => (
                    <div
                      key={p.profile_name}
                      className={`profile-dropdown-row ${activeProfile === p.profile_name ? 'active' : ''}`}
                    >
                      <button
                        className="profile-dropdown-item-btn"
                        onClick={() => {
                          setActiveProfile(p.profile_name);
                          setIsProfileDropdownOpen(false);
                        }}
                      >
                        <span>{p.profile_name}</span>
                        {activeProfile === p.profile_name && <span style={{ color: '#ffcc66', marginLeft: '6px' }}>✓</span>}
                      </button>

                      {profiles.length > 1 && (
                        <button
                          className="profile-delete-btn"
                          title={`Delete profile ${p.profile_name}`}
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete the profile "${p.profile_name}"? This action cannot be undone.`)) {
                              try {
                                await deleteUserProfile(user.id, p.profile_name);
                                const updated = await fetchUserProfiles(user.id);
                                setProfiles(updated);

                                // If the deleted profile was active, switch to another one
                                if (activeProfile === p.profile_name) {
                                  const fallback = updated.find(prof => prof.profile_name !== p.profile_name);
                                  if (fallback) {
                                    setActiveProfile(fallback.profile_name);
                                  }
                                }
                              } catch (err: any) {
                                alert(err.message || 'Failed to delete profile.');
                              }
                            }
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}

                  <div className="profile-dropdown-divider"></div>

                  {!isAddingProfile ? (
                    <button
                      className="profile-dropdown-add-btn"
                      onClick={() => {
                        setIsAddingProfile(true);
                        setNewProfileName('');
                      }}
                    >
                      <span>+ Create Profile</span>
                    </button>
                  ) : (
                    <form
                      className="profile-dropdown-add-form"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const trimmed = newProfileName.trim();
                        if (!trimmed) return;
                        if (profiles.some(p => p.profile_name.toLowerCase() === trimmed.toLowerCase())) {
                          alert('A profile with this name already exists.');
                          return;
                        }
                        setIsCreatingProfile(true);
                        try {
                          const newProfile = await createCustomProfile(user.id, trimmed);
                          if (newProfile) {
                            const updatedProfiles = await fetchUserProfiles(user.id);
                            setProfiles(updatedProfiles);
                            setActiveProfile(trimmed);
                            setIsAddingProfile(false);
                            setIsProfileDropdownOpen(false);
                          }
                        } catch (err: any) {
                          alert(err.message || 'Failed to create profile.');
                        } finally {
                          setIsCreatingProfile(false);
                        }
                      }}
                    >
                      <input
                        type="text"
                        required
                        maxLength={15}
                        placeholder="Profile name..."
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        className="profile-add-input"
                        disabled={isCreatingProfile}
                        autoFocus
                      />
                      <div className="profile-add-actions">
                        <button
                          type="submit"
                          className="profile-add-btn-confirm"
                          disabled={isCreatingProfile}
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          className="profile-add-btn-cancel"
                          onClick={() => setIsAddingProfile(false)}
                          disabled={isCreatingProfile}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {user ? (
            <button
              className="user-menu-btn"
              onClick={async () => {
                if (supabase) {
                  await supabase.auth.signOut();
                }
              }}
              title={`Logged in as ${user.email.split('@')[0].split('.')[0]}. Click to Log Out.`}
            >
              <User size={16} />
              <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email.split('@')[0].split('.')[0]}
              </span>
              <LogOut size={14} style={{ marginLeft: '4px' }} />
            </button>
          ) : (
            <button
              className="auth-trigger-btn"
              onClick={() => setIsAuthModalOpen(true)}
            >
              <LogIn size={16} />
              <span>Sign In & Sync</span>
            </button>
          )}
        </div>
      </header>

      {!materials ? (
        <section
          className={`upload-section ${isDragging ? 'drag-active' : ''}`}
        >
          <div
            className={`upload-card ${isDragging ? 'drag-active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <FileUp size={48} className="upload-icon mx-auto" />
            <h2>Import your data</h2>
            <p className="upload-hint mb-4">Upload your GOOD format .json export file</p>

            {error && <div style={{ color: 'var(--danger)', margin: '1rem 0' }}>{error}</div>}

            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              className="upload-input"
              onChange={handleFileUpload}
              id="file-upload"
            />
            <label htmlFor="file-upload" className="upload-label">
              <Upload size={18} style={{ display: 'inline', marginRight: '8px' }} />
              Browse Files
            </label>
            <p className="upload-hint mt-2">or drag and drop here</p>
          </div>
        </section>
      ) : (
        <div className="tab-content">
          {activeTab === 'inventory' && (
            <section className="materials-container">
              <div className="materials-header">
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search materials..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="search-bar"
                  />
                  <Search size={18} style={{ position: 'absolute', right: '12px', top: '12px', color: 'var(--text-secondary)' }} />
                </div>
                <button className="clear-btn" onClick={() => setMaterials(null)}>
                  <X size={16} /> Clear Import
                </button>
              </div>
              {/* Mora Currency Banner */}
              {(() => {
                const moraData = materialMap['mora'];
                const moraEntry = allMaterialEntries.find(([k]) => k === 'mora');
                const moraCount = moraEntry ? moraEntry[1] : 0;
                if (!moraData) return null;
                return (
                  <div className="mora-banner">
                    <div className="mora-icon-wrapper">
                      <img
                        src={moraData.localExt ? `${import.meta.env.BASE_URL}icons/${moraData.id}${moraData.localExt}` : `${import.meta.env.BASE_URL}icons/202.png`}
                        alt="Mora"
                        className="mora-icon"
                      />
                    </div>
                    <input
                      type="text"
                      className="mora-count-input"
                      value={moraCount.toLocaleString()}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/,/g, '');
                        const val = parseInt(raw, 10);
                        setMaterials(prev => {
                          if (!prev) return prev;
                          // Find the original GOOD key for Mora
                          for (const gk of Object.keys(prev)) {
                            if (gk.toLowerCase() === 'mora') {
                              return { ...prev, [gk]: isNaN(val) ? 0 : val };
                            }
                          }
                          return { ...prev, Mora: isNaN(val) ? 0 : val };
                        });
                      }}
                    />
                  </div>
                );
              })()}

              <div className="materials-grid">
                {filteredMaterials.filter(([key]) => key !== 'mora').map(([key, count]) => {
                  const data = materialMap[key];
                  if (!data) return null;

                  const itemID = data.id;
                  const pseudoRarity = data.rarity || 1;
                  const formattedName = data.name || key;

                  return (
                    <div
                      key={key}
                      className="material-card"
                      onMouseEnter={() => setHoveredItem({ key, data })}
                      onMouseLeave={() => setHoveredItem(null)}
                      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                    >
                      <div className={`material-icon-wrapper bg-rarity-${pseudoRarity}`}>
                        <img
                          src={data.localExt ? `${import.meta.env.BASE_URL}icons/${itemID}${data.localExt}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(formattedName)}&background=random&color=fff&rounded=true&font-size=0.33`}
                          alt={formattedName}
                          className="material-icon"
                          onError={(e) => {
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formattedName)}&background=random&color=fff&rounded=true&font-size=0.33`;
                          }}
                        />
                      </div>
                      <div className="material-info">
                        <input
                          type="number"
                          className="material-count-input"
                          value={count}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setMaterials(prev => {
                              if (!prev) return prev;
                              let updatedKey = key;
                              for (const gk of Object.keys(prev)) {
                                if (gk.toLowerCase() === key) {
                                  updatedKey = gk;
                                  break;
                                }
                              }
                              return { ...prev, [updatedKey]: isNaN(val) ? 0 : val };
                            });
                          }}
                          min="0"
                        />
                      </div>
                    </div>
                  );
                })}

                {filteredMaterials.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    No materials match your search.
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'characters' && (
            <section className="characters-container">
              {/* Filters Bar */}
              <div className="weapons-filters-bar">
                <div className="weapon-search-group">
                  <div className="weapon-search-wrapper">
                    <Search size={18} className="weapon-search-icon" />
                    <input
                      type="text"
                      placeholder="Search characters..."
                      value={characterSearch}
                      onChange={(e) => setCharacterSearch(e.target.value)}
                      className="weapon-search-input"
                    />
                    {characterSearch && (
                      <button
                        onClick={() => setCharacterSearch('')}
                        className="weapon-search-clear"
                        title="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contiguous Weapon Filter Group */}
                <div className="weapon-filter-group">
                  <div className="filter-button-group">
                    {['Sword', 'Claymore', 'Polearm', 'Bow', 'Catalyst'].map(type => {
                      const count = characterCounts.weaponTypes[type] || { active: 0, total: 0 };
                      return (
                        <button
                          key={type}
                          className={`weapon-filter-badge type-${type.toLowerCase()} ${selectedCharacterWeaponTypes.includes(type) ? 'active' : ''}`}
                          onClick={() => handleFilterToggle(selectedCharacterWeaponTypes, ['Sword', 'Claymore', 'Polearm', 'Bow', 'Catalyst'], type, setSelectedCharacterWeaponTypes)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          title={type}
                        >
                          <img
                            src={`${import.meta.env.BASE_URL}icons/${type.toLowerCase()}.png`}
                            alt={type}
                            className="weapon-filter-icon"
                          />
                          <span className="badge-count-pill">{count.active}/{count.total}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Contiguous Element Filter Group */}
                <div className="weapon-filter-group">
                  <div className="filter-button-group">
                    {['Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo'].map(el => {
                      const count = characterCounts.elements[el] || { active: 0, total: 0 };
                      return (
                        <button
                          key={el}
                          className={`weapon-filter-badge element-${el.toLowerCase()} ${selectedCharacterElements.includes(el) ? 'active' : ''}`}
                          onClick={() => handleFilterToggle(selectedCharacterElements, ['Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo'], el, setSelectedCharacterElements)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          title={el}
                        >
                          <img
                            src={`${import.meta.env.BASE_URL}elements/${el.toLowerCase()}.png`}
                            alt={el}
                            className="weapon-filter-icon"
                          />
                          <span className="badge-count-pill">{count.active}/{count.total}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Contiguous Rarity Filter Group */}
                <div className="weapon-filter-group">
                  <div className="filter-button-group">
                    {[5, 4].map(stars => {
                      const count = characterCounts.rarities[stars] || { active: 0, total: 0 };
                      return (
                        <button
                          key={stars}
                          className={`weapon-filter-badge rarity-${stars} ${selectedCharacterRarities.includes(stars) ? 'active' : ''}`}
                          onClick={() => handleFilterToggle(selectedCharacterRarities, [5, 4], stars, setSelectedCharacterRarities)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          title={`${stars}★ Rarity`}
                        >
                          <span style={{ fontSize: '0.95rem', fontWeight: '800' }}>{stars}★</span>
                          <span className="badge-count-pill">{count.active}/{count.total}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Contiguous Sorting Group */}
                <div className="weapon-filter-group">
                  <div className="filter-button-group">
                    <button
                      className="weapon-filter-badge active sort-by-btn"
                      onClick={() => setCharacterSortBy(prev => prev === 'level' ? 'name' : 'level')}
                      title="Toggle Level / Name sort"
                    >
                      Sort: {characterSortBy === 'level' ? 'Level' : 'Name'}
                    </button>
                    <button
                      className="weapon-filter-badge active sort-order-btn"
                      onClick={() => setCharacterSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      title="Toggle Sort Order"
                    >
                      {characterSortOrder === 'asc' ? (
                        <>
                          <ArrowUpNarrowWide size={15} />
                          <span>Ascending</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownNarrowWide size={15} />
                          <span>Descending</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Characters Grid */}
              <div className="characters-grid">
                {sortedCharacters.map((char: GoodCharacter) => (
                  <CharacterCard
                    key={char.key}
                    character={char}
                    weapon={weapons.find(w => w.location === char.key)}
                    artifacts={artifacts.filter(a => a.location === char.key)}
                    isFavorite={favoriteCharacterKeys.includes(char.key)}
                    onToggleFavorite={() => toggleFavoriteCharacter(char.key)}
                  />
                ))}
              </div>

              {/* Empty States */}
              {characters.length === 0 && (
                <div className="characters-empty-state">
                  <User size={48} className="empty-icon" />
                  <h3>No Characters Found</h3>
                  <p>No characters found in import.</p>
                </div>
              )}

              {characters.length > 0 && sortedCharacters.length === 0 && (
                <div className="characters-empty-state">
                  <Search size={48} className="empty-icon" />
                  <h3>No Matches</h3>
                  <p>No characters match your filters.</p>
                </div>
              )}
            </section>
          )}

          {activeTab === 'weapons' && (
            <section className="weapons-container">
              {/* Filters Bar */}
              <div className="weapons-filters-bar">
                <div className="weapon-search-group">
                  <div className="weapon-search-wrapper">
                    <Search size={18} className="weapon-search-icon" />
                    <input
                      type="text"
                      placeholder="Search weapons..."
                      value={weaponSearch}
                      onChange={(e) => setWeaponSearch(e.target.value)}
                      className="weapon-search-input"
                    />
                    {weaponSearch && (
                      <button
                        onClick={() => setWeaponSearch('')}
                        className="weapon-search-clear"
                        title="Clear search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Contiguous Weapon Type Filter Group */}
                <div className="weapon-filter-group">
                  <div className="filter-button-group">
                    {['Sword', 'Claymore', 'Polearm', 'Bow', 'Catalyst'].map(type => {
                      const count = weaponCounts.weaponTypes[type] || { active: 0, total: 0 };
                      return (
                        <button
                          key={type}
                          className={`weapon-filter-badge type-${type.toLowerCase()} ${selectedWeaponTypes.includes(type) ? 'active' : ''}`}
                          onClick={() => handleFilterToggle(selectedWeaponTypes, ['Sword', 'Claymore', 'Polearm', 'Bow', 'Catalyst'], type, setSelectedWeaponTypes)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          title={type}
                        >
                          <img
                            src={`${import.meta.env.BASE_URL}icons/${type.toLowerCase()}.png`}
                            alt={type}
                            className="weapon-filter-icon"
                          />
                          <span className="badge-count-pill">{count.active}/{count.total}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Contiguous Weapon Rarity Filter Group */}
                <div className="weapon-filter-group">
                  <div className="filter-button-group">
                    {[5, 4, 3, 2, 1].map(stars => {
                      const count = weaponCounts.rarities[stars] || { active: 0, total: 0 };
                      return (
                        <button
                          key={stars}
                          className={`weapon-filter-badge rarity-${stars} ${selectedStarRarities.includes(stars) ? 'active' : ''}`}
                          onClick={() => handleFilterToggle(selectedStarRarities, [5, 4, 3, 2, 1], stars, setSelectedStarRarities)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          title={`${stars}★ Rarity`}
                        >
                          <span style={{ fontSize: '0.95rem', fontWeight: '800' }}>{stars}★</span>
                          <span className="badge-count-pill">{count.active}/{count.total}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Weapons Grid */}
              <div className="weapons-grid">
                {sortedWeapons.map((weapon, idx) => {
                  const mapData = lookupWeapon(weapon.key);
                  const equippedChar = characters.find(c => c.key === weapon.location);
                  return (
                    <WeaponCard
                      key={`${weapon.key}-${weapon.location}-${idx}`}
                      weapon={weapon}
                      weaponMapData={mapData}
                      equippedCharacter={equippedChar}
                    />
                  );
                })}
              </div>

              {/* Empty State */}
              {sortedWeapons.length === 0 && (
                <div className="weapons-empty-state">
                  <Sword size={48} className="empty-icon" />
                  <h3>No Weapons Found</h3>
                  <p>Try adjusting your search query or filter criteria.</p>
                </div>
              )}
            </section>
          )}


          {activeTab === 'planner' && (
            <section className="planner-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h2>Plan Your Progress</h2>
                  <p className="planner-subtitle">Select what you want to work on</p>
                </div>
                <div className="planner-actions">
                  <button
                    className="planner-btn planner-btn-character"
                    onClick={() => setIsCharacterSelectModalOpen(true)}
                  >
                    <UserPlus size={20} />
                    <span>Add Character</span>
                  </button>
                  <button className="planner-btn planner-btn-weapon">
                    <Sword size={20} />
                    <span>Add Weapon</span>
                  </button>
                  <button className="planner-btn planner-btn-priority" onClick={() => setIsPriorityModalOpen(true)}>
                    <ListOrdered size={20} />
                    <span>Manage Priority</span>
                  </button>
                </div>
              </div>

              {plannedCharacters.length > 0 ? (
                <div className="planner-grid">
                  {plannedCharacters.map((planned) => {
                    const charMapInfo = lookupChar(planned.key);
                    const name = charMapInfo?.name || planned.key;
                    const fontScale = name.length > 20 ? '0.8rem' : name.length > 12 ? '0.95rem' : '1.15rem';
                    const elementClass = charMapInfo?.element ? charMapInfo.element.toLowerCase() : 'none';
                    const requirements = calculateRequirements(planned, materials);

                    return (
                      <div
                        key={planned.key}
                        draggable={canDragCardKey === planned.key}
                        onDragStart={(e) => handleCardDragStart(e, planned.key)}
                        onDragOver={(e) => handleCardDragOver(e, planned.key)}
                        onDragLeave={() => { setDragOverCardKey(null); setDropPlacement(null); }}
                        onDrop={(e) => handleCardDrop(e, planned.key)}
                        onDragEnd={() => { setDraggedCardKey(null); setDragOverCardKey(null); setDropPlacement(null); }}
                        className={`character-card bg-element-${elementClass} ${
                          draggedCardKey === planned.key ? 'dragging-card' : ''
                        } ${
                          dragOverCardKey === planned.key && dropPlacement === 'before' ? 'drop-before' : ''
                        } ${
                          dragOverCardKey === planned.key && dropPlacement === 'after' ? 'drop-after' : ''
                        }`}
                        style={{
                          padding: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden',
                          position: 'relative',
                          filter: planned.enabled === false ? 'grayscale(0.75) opacity(0.45)' : 'none',
                          transition: 'filter 0.3s ease, opacity 0.3s ease'
                        }}
                      >
                        {/* Premium Rarity-Based Header Bar */}
                        <div
                          className="planner-card-header-draggable"
                          onMouseDown={() => setCanDragCardKey(planned.key)}
                          onMouseUp={() => setCanDragCardKey(null)}
                          style={{
                            background: charMapInfo?.rarity === 5
                              ? 'linear-gradient(to right, #8c6a4a, #735438)' // 5* Gold
                              : 'linear-gradient(to right, #7b6a99, #5a4b78)', // 4* Purple
                            height: '46px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingLeft: '12px',
                            paddingRight: '12px',
                            borderBottom: '1px solid rgba(0,0,0,0.15)',
                            position: 'relative'
                          }}
                        >
                          {/* Left Buttons (Edit, Upgrade) */}
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              onClick={() => {
                                setOpenedTargetFromPlanner(true);
                                setSelectedCharacterKeyForTarget(planned.key);
                              }}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#eae3d2',
                                color: '#4a3c31',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                padding: 0,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.9';
                                e.currentTarget.style.transform = 'scale(1.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title="Edit target levels"
                            >
                              <Pencil size={15} style={{ strokeWidth: 2.2 }} />
                            </button>
                            <button
                              onClick={() => upgradePlannedCharacter(planned.key)}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#eae3d2',
                                color: '#4a3c31',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                padding: 0,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.9';
                                e.currentTarget.style.transform = 'scale(1.05)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title="Mark as upgraded"
                            >
                              <Sparkles size={15} style={{ strokeWidth: 2.2 }} />
                            </button>
                          </div>

                          {/* Center Character Name */}
                          <div style={{
                            color: '#fff',
                            fontFamily: "'Outfit', sans-serif",
                            fontWeight: '700',
                            fontSize: fontScale,
                            letterSpacing: '0.01em',
                            display: '-webkit-box',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: 1,
                            textAlign: 'center',
                            lineHeight: '1.15',
                            padding: '0 4px',
                            maxHeight: '38px',
                            overflow: 'hidden',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            wordBreak: 'break-word'
                          } as any}>
                            <span>{name}</span>
                          </div>

                          {/* Right Buttons (Standby, Delete) */}
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              onClick={() => togglePlannedCharacter(planned.key)}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#12131a',
                                color: planned.enabled !== false ? '#fff' : '#555',
                                border: planned.enabled !== false ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                padding: 0,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'scale(1.05)';
                                if (planned.enabled !== false) {
                                  e.currentTarget.style.color = '#ffcc66';
                                } else {
                                  e.currentTarget.style.color = '#777';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.color = planned.enabled !== false ? '#fff' : '#555';
                              }}
                              title={planned.enabled !== false ? "Put on Standby" : "Activate Plan"}
                            >
                              <Power size={14} style={{ strokeWidth: 2.5 }} />
                            </button>
                            <button
                              onClick={() => removePlannedCharacter(planned.key)}
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#eae3d2',
                                color: '#4a3c31',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                padding: 0,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = '0.9';
                                e.currentTarget.style.transform = 'scale(1.05)';
                                e.currentTarget.style.color = '#ff3333';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = '1';
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.color = '#4a3c31';
                              }}
                              title="Remove plan"
                            >
                              <Trash2 size={14} style={{ strokeWidth: 2.2 }} />
                            </button>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div style={{
                          padding: '1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                          flex: 1
                        }}>
                          {/* Symmetrical side-by-side flex row */}
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            {/* Enlarged premium avatar frame */}
                            <div
                              className={`bg-rarity-${charMapInfo?.rarity || 4}-solid bg-element-${elementClass}-gradient`}
                              style={{
                                width: '120px',
                                height: '120px',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                position: 'relative',
                                flexShrink: 0,
                                border: '2px solid rgba(0,0,0,0.4)',
                                boxShadow: '0 6px 12px rgba(0,0,0,0.35), inset 0 2px 4px rgba(255,255,255,0.08)'
                              }}
                            >
                              <img
                                src={`${import.meta.env.BASE_URL}characters/${charMapInfo?.id}.png`}
                                alt={charMapInfo?.name || planned.key}
                                style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom' }}
                                onError={(e) => {
                                  const target = e.currentTarget;
                                  if (!target.dataset.fallback) {
                                    target.dataset.fallback = 'enka';
                                    target.src = `https://enka.network/ui/UI_AvatarIcon_${charMapInfo?.id || planned.key}.png`;
                                  } else if (!target.dataset.fallbackUi) {
                                    target.dataset.fallbackUi = 'ui';
                                    target.src = `https://ui-avatars.com/api/?name=${charMapInfo?.name || planned.key}&background=random`;
                                  }
                                }}
                              />
                              {/* Character Constellation Overlay inside avatar frame */}
                              <span
                                className={`char-constellation bg-element-${elementClass}-dark`}
                                style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  fontSize: '0.65rem',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  fontWeight: '700',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                  border: '1px solid rgba(255,255,255,0.1)'
                                }}
                              >
                                C{characters.find(c => c.key === planned.key)?.constellation || 0}
                              </span>
                            </div>

                            {/* Centered Levels and Talents Column */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingRight: '28px' }}>
                              {renderLevelsAndTalents(planned)}
                            </div>
                          </div>

                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.15rem 0' }} />

                          {requirements.length === 0 ? (
                            <div style={{
                              textAlign: 'center',
                              padding: '1.25rem',
                              background: 'rgba(76, 175, 80, 0.08)',
                              border: '1px dashed rgba(76, 175, 80, 0.2)',
                              borderRadius: '8px',
                              color: '#a5d6a7',
                              fontSize: '0.85rem',
                              fontWeight: '500'
                            }}>
                              {planned.enabled === false ? "Plan on standby (Active power toggled off)" : "Target reached (No materials needed!)"}
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <div style={{
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                color: '#ffcc66',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontFamily: "'Outfit', sans-serif"
                              }}>
                                <span>Required Materials</span>
                                {requirements.every(r => r.isEnough) ? (
                                  <span style={{ fontSize: '0.7rem', color: '#81c784', background: 'rgba(76, 175, 80, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>Ready</span>
                                ) : (
                                  <span style={{ fontSize: '0.7rem', color: '#ffb74d', background: 'rgba(255, 183, 77, 0.12)', padding: '1px 6px', borderRadius: '4px' }}>In Progress</span>
                                )}
                              </div>

                              {/* Materials grid */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
                                gap: '0.3rem'
                              }}>
                                {requirements.map((mat) => {
                                  const isEnough = mat.isEnough ?? (mat.owned >= mat.required);
                                  const pseudoRarity = mat.rarity || 1;
                                  const originalEntry = materialMap[mat.key];
                                  const isExpOrMora = mat.key === 'heroswit' || mat.key === 'mora';

                                  return (
                                    <div
                                      key={mat.key}
                                      style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        borderRadius: '6px',
                                        overflow: 'hidden',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        aspectRatio: '50 / 62',
                                        opacity: isEnough ? 0.45 : 1,
                                        transition: 'opacity 0.2s ease',
                                      }}
                                      onMouseEnter={() => originalEntry && setHoveredItem({ key: mat.key, data: originalEntry })}
                                      onMouseLeave={() => setHoveredItem(null)}
                                      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                                    >
                                      {/* Header bar with Required numbers (large) */}
                                      <div style={{
                                        height: '20px',
                                        background: 'rgba(0, 0, 0, 0.6)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.8rem',
                                        fontWeight: '700',
                                        color: isEnough ? '#a5d6a7' : '#fff',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                        fontFamily: "'Outfit', sans-serif"
                                      }}>
                                        {isEnough ? (
                                          isExpOrMora ? `~${formatCompact(mat.required)}` : formatCompact(mat.required)
                                        ) : (
                                          isExpOrMora ? `~${formatCompact(mat.missing)}` : formatCompact(mat.missing)
                                        )}
                                      </div>

                                      {/* Icon Bottom Area */}
                                      <div
                                        className={`bg-rarity-${pseudoRarity}`}
                                        style={{
                                          flex: 1,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          position: 'relative'
                                        }}
                                      >
                                        <img
                                          src={originalEntry?.localExt ? `${import.meta.env.BASE_URL}icons/${mat.iconId}${originalEntry.localExt}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(mat.name)}`}
                                          alt={mat.name}
                                          style={{ width: '80%', height: '80%', objectFit: 'contain', transform: 'scale(1.35)', transformOrigin: 'center' }}
                                          onError={(e) => {
                                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(mat.name)}&background=random&color=fff&rounded=true&font-size=0.33`;
                                          }}
                                        />

                                        {/* Owned sync badge pill overlaid bottom-left */}
                                        {(() => {
                                          if (!isExpOrMora && mat.converted !== undefined && mat.owned < mat.required) {
                                            const convertValue = Math.min(mat.required - mat.owned, mat.converted);
                                            if (convertValue > 0) {
                                              return (
                                                <div style={{
                                                  position: 'absolute',
                                                  bottom: '2px',
                                                  left: '2px',
                                                  background: 'rgba(15, 17, 26, 0.85)',
                                                  borderRadius: '4px',
                                                  padding: '1px 3px',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '2px',
                                                  border: '1px solid rgba(255, 255, 255, 0.08)',
                                                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
                                                  zIndex: 2
                                                }}>
                                                  <RotateCw size={8} style={{ strokeWidth: 2.8, color: '#ffcc66' }} />
                                                  <span style={{
                                                    fontSize: '0.58rem',
                                                    color: '#fff',
                                                    fontWeight: '700',
                                                    lineHeight: 1,
                                                    fontFamily: "'Outfit', sans-serif"
                                                  }}>
                                                    {formatCompact(convertValue)}
                                                  </span>
                                                </div>
                                              );
                                            }
                                          }
                                          return null;
                                        })()}

                                        {/* Done overlay checkmark */}
                                        {isEnough && (
                                          <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'rgba(0, 0, 0, 0.15)',
                                            zIndex: 3
                                          }}>
                                            <Check size={22} color="#4caf50" style={{ strokeWidth: 4, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }} />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px dashed var(--glass-border)' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>Your planner is empty.</p>
                  <button
                    className="planner-btn planner-btn-character"
                    style={{ margin: '0 auto' }}
                    onClick={() => setIsCharacterSelectModalOpen(true)}
                  >
                    <UserPlus size={20} /> Add your first character
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Global Mouse Tracker Tooltip */}
      {hoveredItem && (
        <div
          className="tooltip-box global"
          style={{
            left: mousePos.x + 20,
            top: mousePos.y + 15,
            position: 'fixed'
          }}
        >
          <div className="tooltip-header">
            <span className="tooltip-name">{hoveredItem.data.name || hoveredItem.key}</span>
            <div className={`tooltip-icon-wrapper bg-rarity-${hoveredItem.data.rarity || 1}`}>
              <img
                src={hoveredItem.data.localExt ? `${import.meta.env.BASE_URL}icons/${hoveredItem.data.id}${hoveredItem.data.localExt}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(hoveredItem.data.name || hoveredItem.key)}&background=random&color=fff&rounded=true&font-size=0.33`}
                alt=""
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(hoveredItem.data.name || hoveredItem.key)}&background=random&color=fff&rounded=true&font-size=0.33`;
                }}
              />
            </div>
          </div>
          {hoveredItem.data.sources && hoveredItem.data.sources.filter(src => !src.includes('Placeholder')).length > 0 && (
            <div className="tooltip-sources">
              {hoveredItem.data.sources
                .filter(src => !src.includes('Placeholder'))
                .map((src, i) => (
                  <div key={i} className="tooltip-source-item">{src}</div>
                ))}
            </div>
          )}
        </div>
      )}

      <CharacterSelectionModal
        isOpen={isCharacterSelectModalOpen}
        onClose={() => setIsCharacterSelectModalOpen(false)}
        ownedCharacters={characters}
        onSelect={(key) => {
          setIsCharacterSelectModalOpen(false);
          setOpenedTargetFromPlanner(false);
          setSelectedCharacterKeyForTarget(key);
        }}
      />

      <CharacterTargetModal
        isOpen={selectedCharacterKeyForTarget !== null}
        onClose={() => setSelectedCharacterKeyForTarget(null)}
        onCancel={openedTargetFromPlanner ? undefined : () => {
          setSelectedCharacterKeyForTarget(null);
          setIsCharacterSelectModalOpen(true);
        }}
        characterKey={selectedCharacterKeyForTarget}
        currentData={characters.find(c => c.key === selectedCharacterKeyForTarget)}
        onAccept={(planned) => {
          setPlannedCharacters(prev => {
            const exists = prev.findIndex(p => p.key === planned.key);
            if (exists >= 0) {
              const next = [...prev];
              next[exists] = planned;
              return next;
            }
            return [...prev, planned];
          });
          setSelectedCharacterKeyForTarget(null);
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(usr) => setUser(usr)}
      />

      {deletingCharacterKey && (
        <DeletePlanConfirmationModal
          characterKey={deletingCharacterKey}
          onClose={() => setDeletingCharacterKey(null)}
          onConfirm={() => {
            setPlannedCharacters(prev => prev.filter(p => p.key !== deletingCharacterKey));
            setDeletingCharacterKey(null);
          }}
        />
      )}

      {isUpgradeModalOpen && selectedUpgradeCharacterKey && (
        <UpgradeCharacterModal
          isOpen={isUpgradeModalOpen}
          onClose={() => {
            setIsUpgradeModalOpen(false);
            setSelectedUpgradeCharacterKey(null);
          }}
          planned={plannedCharacters.find(p => p.key === selectedUpgradeCharacterKey)}
          currentData={characters.find(c => c.key === selectedUpgradeCharacterKey)}
          materials={materials}
          onUpgradeClick={handleUpgradeModalConfirm}
        />
      )}

      {isUpgradeCorrectionModalOpen && selectedUpgradeCharacterKey && (
        <UpgradeEstimateCorrectionModal
          isOpen={isUpgradeCorrectionModalOpen}
          onClose={() => setIsUpgradeCorrectionModalOpen(false)}
          materials={materials}
          estimatedSpend={estimatedSpend}
          onConfirm={handleUpgradeFinalConfirmation}
        />
      )}

      <PriorityManagerModal
        isOpen={isPriorityModalOpen}
        plannedCharacters={plannedCharacters}
        onClose={() => setIsPriorityModalOpen(false)}
        onSave={(ordered) => setPlannedCharacters(ordered)}
      />
    </div>
  );
}

export default App;
