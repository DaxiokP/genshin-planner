import React, { useState, useEffect, useMemo } from 'react';
import { Cloud, CloudOff, CloudLightning, LogIn, LogOut, ChevronDown, Loader2, Sparkles, Settings } from 'lucide-react';
import { CharacterSelectionModal } from './components/CharacterSelectionModal';
import { CharacterTargetModal } from './components/CharacterTargetModal';
import { calculateRequirements, simulatePlannerInventory, getDomainMaterialWeekdayGroup, getRawCardRequirements } from './utils/plannerCalculator';
import './App.css';
import characterMapData from './maps/characterMap.json';
import weaponMapData from './maps/weaponMap.json';
import { supabase, createCustomProfile, deleteUserProfile } from './supabase';
import type { PlannedCharacter } from './types';
import { AuthModal } from './components/AuthModal';
import { DeletePlanConfirmationModal } from './components/DeletePlanConfirmationModal';
import { UpgradeCharacterModal } from './components/UpgradeCharacterModal';
import { UpgradeEstimateCorrectionModal } from './components/UpgradeEstimateCorrectionModal';
import { WeaponSelectionModal } from './components/WeaponSelectionModal';
import { WeaponTargetModal } from './components/WeaponTargetModal';
import { UpgradeWeaponModal } from './components/UpgradeWeaponModal';
import { WeaponUpgradeEstimateCorrectionModal } from './components/WeaponUpgradeEstimateCorrectionModal';
import { applyUpgradeInventoryMutations } from './utils/upgradeHelpers';
import { PriorityManagerModal } from './components/PriorityManagerModal';
import { QuickInventoryModal } from './components/QuickInventoryModal';
import { useAppSync } from './hooks/useAppSync';
import { PlannerTab } from './components/tabs/PlannerTab';
import { CharactersTab } from './components/tabs/CharactersTab';
import { WeaponsTab } from './components/tabs/WeaponsTab';
import { InventoryTab } from './components/tabs/InventoryTab';
import { syncPlannedItemsWithGoodImport } from './utils/plannerImportSync';
import { AccountSettingsTab } from './components/tabs/AccountSettingsTab';
import { CustomItemModal } from './components/CustomItemModal';

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


export type { GoodCharacter, GoodWeapon, GoodArtifact, PlannedCharacter, MaterialsData } from './types';

type TabType = 'planner' | 'characters' | 'weapons' | 'inventory' | 'settings';

function App() {
  const {
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
    user,
    setUser,
    profiles,
    setProfiles,
    activeProfile,
    setActiveProfile,
    syncStatus,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isProfileDropdownOpen,
    setIsProfileDropdownOpen,
    dropdownRef,
  } = useAppSync();
  const plannedCharacters = useMemo(() => {
    return plannedItems.filter(item => item.type === 'character' || !item.type) as PlannedCharacter[];
  }, [plannedItems]);

  const simulation = useMemo(() => {
    return simulatePlannerInventory(plannedItems, materials);
  }, [plannedItems, materials]);

  const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    return (localStorage.getItem('genshin_planner_active_tab') as TabType) || 'planner';
  });

  useEffect(() => {
    localStorage.setItem('genshin_planner_active_tab', activeTab);
  }, [activeTab]);
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [timeToReset, setTimeToReset] = useState<string>('');

  const [isQuickInventoryOpen, setIsQuickInventoryOpen] = useState(false);
  const [selectedQuickInventoryMaterial, setSelectedQuickInventoryMaterial] = useState<string | null>(null);

  const handleOpenQuickInventory = (key: string) => {
    setSelectedQuickInventoryMaterial(key);
    setIsQuickInventoryOpen(true);
  };


  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextReset = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        3, 0, 0, 0
      ));
      if (now.getTime() >= nextReset.getTime()) {
        nextReset.setUTCDate(nextReset.getUTCDate() + 1);
      }
      const diffMs = nextReset.getTime() - now.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      setTimeToReset(`${diffHrs}H ${diffMins}M to daily reset`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000);
    return () => clearInterval(interval);
  }, []);

  const [weaponSearch, setWeaponSearch] = useState<string>('');
  const [selectedWeaponTypes, setSelectedWeaponTypes] = useState<string[]>(['Sword', 'Claymore', 'Polearm', 'Bow', 'Catalyst']);
  const [selectedStarRarities, setSelectedStarRarities] = useState<number[]>([5, 4, 3, 2, 1]);

  const [characterSearch, setCharacterSearch] = useState<string>('');
  const [selectedCharacterWeaponTypes, setSelectedCharacterWeaponTypes] = useState<string[]>(['Sword', 'Claymore', 'Polearm', 'Bow', 'Catalyst']);
  const [selectedCharacterElements, setSelectedCharacterElements] = useState<string[]>(['Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo']);
  const [selectedCharacterRarities, setSelectedCharacterRarities] = useState<number[]>([5, 4]);
  const [characterSortBy, setCharacterSortBy] = useState<'level' | 'name'>('level');
  const [characterSortOrder, setCharacterSortOrder] = useState<'asc' | 'desc'>('desc');

  const [search, setSearch] = useState('');

  const [hoveredItem, setHoveredItem] = useState<{ key: string, data: any } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isCharacterSelectModalOpen, setIsCharacterSelectModalOpen] = useState(false);
  const [selectedCharacterKeyForTarget, setSelectedCharacterKeyForTarget] = useState<string | null>(null);

  const [isWeaponSelectModalOpen, setIsWeaponSelectModalOpen] = useState(false);
  const [selectedWeaponIndexForTarget, setSelectedWeaponIndexForTarget] = useState<number | null>(null);
  const [selectedWeaponKeyForTarget, setSelectedWeaponKeyForTarget] = useState<string | null>(null);
  const [deletingWeaponId, setDeletingWeaponId] = useState<string | null>(null);

  const [openedTargetFromPlanner, setOpenedTargetFromPlanner] = useState(false);
  const [deletingCharacterKey, setDeletingCharacterKey] = useState<string | null>(null);

  const [selectedUpgradeCharacterKey, setSelectedUpgradeCharacterKey] = useState<string | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpgradeCorrectionModalOpen, setIsUpgradeCorrectionModalOpen] = useState(false);
  const [upgradeDraftTarget, setUpgradeDraftTarget] = useState<any>(null);

  const [selectedUpgradeWeaponId, setSelectedUpgradeWeaponId] = useState<string | null>(null);
  const [isUpgradeWeaponModalOpen, setIsUpgradeWeaponModalOpen] = useState(false);
  const [isUpgradeWeaponCorrectionModalOpen, setIsUpgradeWeaponCorrectionModalOpen] = useState(false);
  const [upgradeWeaponDraftTarget, setUpgradeWeaponDraftTarget] = useState<any>(null);
  const [estimatedWeaponSpend, setEstimatedWeaponSpend] = useState<{ mora: number, mysticenhancementore: number }>({ mora: 0, mysticenhancementore: 0 });
  const [draftCraftingBonuses, setDraftCraftingBonuses] = useState<Record<string, number>>({});
  const [estimatedSpend, setEstimatedSpend] = useState<{ mora: number, heroswit: number }>({ mora: 0, heroswit: 0 });

  // Custom Item Modal State Hooks
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customModalType, setCustomModalType] = useState<'character' | 'weapon'>('character');
  const [editingCustomData, setEditingCustomData] = useState<any | null>(null);
  const [tempCustomItem, setTempCustomItem] = useState<any | null>(null);
  const [customModalSource, setCustomModalSource] = useState<'selection' | 'target'>('selection');

  // Replace mode state hooks
  const [replaceMode, setReplaceMode] = useState(false);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

  const processFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      alert('Please upload a valid JSON file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (data.format !== 'GOOD') {
          alert('Invalid file format. Make sure you upload a GOOD format JSON.');
          return;
        }

        if (!data.materials) {
          alert('No materials found in this file.');
          return;
        }

        const synchronizedPlannedItems = syncPlannedItemsWithGoodImport(
          plannedItems,
          data.characters || [],
          data.weapons || [],
          weapons
        );

        setMaterials(data.materials);
        setCharacters(data.characters || []);
        setWeapons(data.weapons || []);
        setArtifacts(data.artifacts || []);
        setPlannedItems(synchronizedPlannedItems);
      } catch (err) {
        alert('Failed to parse JSON file.');
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  const clearGoodData = () => {
    setMaterials({});
    setCharacters([]);
    setWeapons([]);
    setArtifacts([]);
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

    const draftChar = { ...planned, desired: target, enabled: true };
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
    setPlannedItems(prev => prev.map(p => {
      if ((p.type === 'character' || !p.type) && p.key === selectedUpgradeCharacterKey) {
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

  const handleWeaponUpgradeModalConfirm = (
    target: { level: number; ascension: number },
    craftingBonuses: Record<string, number>
  ) => {
    const planned = plannedItems.find(p => p.id === selectedUpgradeWeaponId);
    if (!planned) return;

    const draftWeapon = { ...planned, desired: target, enabled: true };
    const reqs = calculateRequirements(draftWeapon, materials);

    const moraReq = reqs.find(r => r.key === 'mora')?.required || 0;
    const mysticReq = reqs.find(r => r.key === 'mysticenhancementore')?.required || 0;

    setUpgradeWeaponDraftTarget(target);
    setDraftCraftingBonuses(craftingBonuses);
    setEstimatedWeaponSpend({ mora: moraReq, mysticenhancementore: mysticReq });
    setIsUpgradeWeaponCorrectionModalOpen(true);
  };

  const handleWeaponUpgradeFinalConfirmation = (
    correctedMora: number,
    correctedOres: {
      mysticenhancementore: number;
      fineenhancementore: number;
      enhancementore: number;
    }
  ) => {
    const planned = plannedItems.find(p => p.id === selectedUpgradeWeaponId);
    if (!planned || !upgradeWeaponDraftTarget || !materials) return;

    const mutatedMaterials = applyUpgradeInventoryMutations(
      planned,
      upgradeWeaponDraftTarget,
      materials,
      draftCraftingBonuses,
      correctedMora,
      correctedOres
    );

    setMaterials(mutatedMaterials);
    setPlannedItems(prev => prev.map(p => {
      if (p.id === selectedUpgradeWeaponId) {
        return {
          ...p,
          current: {
            level: upgradeWeaponDraftTarget.level,
            ascension: upgradeWeaponDraftTarget.ascension
          }
        };
      }
      return p;
    }));

    setWeapons(prev => prev.map((w, idx) => {
      if (idx === planned.weaponIndex) {
        return {
          ...w,
          level: upgradeWeaponDraftTarget.level,
          ascension: upgradeWeaponDraftTarget.ascension
        };
      }
      return w;
    }));

    setIsUpgradeWeaponCorrectionModalOpen(false);
    setIsUpgradeWeaponModalOpen(false);
    setSelectedUpgradeWeaponId(null);
    setUpgradeWeaponDraftTarget(null);
    setDraftCraftingBonuses({});
  };

  const toggleFavoriteCharacter = (key: string) => {
    setFavoriteCharacterKeys(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };
  const handleCustomItemAccept = (customData: any) => {
    const isChar = customModalType === 'character';
    if (editingCustomData) {
      const existsInPlanned = plannedItems.some(p => p.id === editingCustomData.id);
      if (existsInPlanned) {
        setPlannedItems(prev => {
          return prev.map(p => {
            if (p.id === editingCustomData.id) {
              return {
                ...p,
                ...customData,
              };
            }
            return p;
          });
        });
      } else {
        setTempCustomItem((prev: any) => ({
          ...prev,
          ...customData,
        }));
      }

      setIsCustomModalOpen(false);
      setEditingCustomData(null);
      
      if (isChar) {
        setSelectedCharacterKeyForTarget(customData.key);
      } else {
        setSelectedWeaponIndexForTarget(editingCustomData.weaponIndex);
        setSelectedWeaponKeyForTarget(customData.key);
      }
    } else {
      const plannedId = isChar ? `character:${customData.key}` : `weapon:${customData.key}`;
      
      let plannedItem: any = {
        ...customData,
        id: plannedId,
        current: isChar 
          ? { level: 1, ascension: 0, talent: { auto: 1, skill: 1, burst: 1 } }
          : { level: 1, ascension: 0 },
        desired: isChar
          ? { level: 90, ascension: 6, talent: { auto: 9, skill: 9, burst: 9 } }
          : { level: 90, ascension: 6 },
      };

      if (!isChar) {
        const customWeapons = plannedItems.filter(p => p.type === 'weapon' && p.weaponIndex < 0);
        const nextIdx = customWeapons.length > 0
          ? Math.min(...customWeapons.map(p => p.weaponIndex)) - 1
          : -1;
        plannedItem.weaponIndex = nextIdx;
      }

      setTempCustomItem(plannedItem);
      setIsCustomModalOpen(false);

      if (isChar) {
        setSelectedCharacterKeyForTarget(customData.key);
      } else {
        setSelectedWeaponIndexForTarget(plannedItem.weaponIndex);
        setSelectedWeaponKeyForTarget(customData.key);
      }
    }
  };

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
            {syncStatus === 'synced' && <Cloud size={16} />}
            {syncStatus === 'syncing' && <Loader2 size={16} className="animate-spin" />}
            {syncStatus === 'local' && <CloudOff size={16} />}
            {syncStatus === 'error' && <CloudLightning size={16} />}
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
                    </div>
                  ))}

                  <div className="profile-dropdown-divider"></div>

                  <button
                    className="profile-dropdown-item-btn"
                    onClick={() => {
                      setActiveTab('settings');
                      setIsProfileDropdownOpen(false);
                    }}
                  >
                    <Settings size={14} style={{ marginRight: '6px' }} />
                    <span>Account Settings</span>
                  </button>

                  <button
                    className="profile-dropdown-item-btn"
                    onClick={async () => {
                      if (supabase) {
                        await supabase.auth.signOut();
                      }
                      setIsProfileDropdownOpen(false);
                    }}
                  >
                    <LogOut size={14} style={{ marginRight: '6px' }} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {!user && (
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

      <div className="tab-content">
        {activeTab === 'inventory' && (
          <InventoryTab
            materials={materials}
            setMaterials={setMaterials}
            search={search}
            setSearch={setSearch}
            setHoveredItem={setHoveredItem}
            setMousePos={setMousePos}
          />
        )}

        {activeTab === 'characters' && (
          <CharactersTab
            characters={characters}
            weapons={weapons}
            artifacts={artifacts}
            favoriteCharacterKeys={favoriteCharacterKeys}
            toggleFavoriteCharacter={toggleFavoriteCharacter}
            characterSearch={characterSearch}
            setCharacterSearch={setCharacterSearch}
            selectedCharacterWeaponTypes={selectedCharacterWeaponTypes}
            setSelectedCharacterWeaponTypes={setSelectedCharacterWeaponTypes}
            selectedCharacterElements={selectedCharacterElements}
            setSelectedCharacterElements={setSelectedCharacterElements}
            selectedCharacterRarities={selectedCharacterRarities}
            setSelectedCharacterRarities={setSelectedCharacterRarities}
            characterSortBy={characterSortBy}
            setCharacterSortBy={setCharacterSortBy}
            characterSortOrder={characterSortOrder}
            setCharacterSortOrder={setCharacterSortOrder}
          />
        )}

        {activeTab === 'weapons' && (
          <WeaponsTab
            weapons={weapons}
            characters={characters}
            weaponSearch={weaponSearch}
            setWeaponSearch={setWeaponSearch}
            selectedWeaponTypes={selectedWeaponTypes}
            setSelectedWeaponTypes={setSelectedWeaponTypes}
            selectedStarRarities={selectedStarRarities}
            setSelectedStarRarities={setSelectedStarRarities}
          />
        )}

        {activeTab === 'planner' && (
          <PlannerTab
            plannedItems={plannedItems}
            setPlannedItems={setPlannedItems}
            simulation={simulation}
            characters={characters}
            weapons={weapons}
            selectedDayOffset={selectedDayOffset}
            setSelectedDayOffset={setSelectedDayOffset}
            timeToReset={timeToReset}
            handleOpenQuickInventory={handleOpenQuickInventory}
            setHoveredItem={setHoveredItem}
            setMousePos={setMousePos}
            setIsCharacterSelectModalOpen={setIsCharacterSelectModalOpen}
            setIsWeaponSelectModalOpen={setIsWeaponSelectModalOpen}
            setIsPriorityModalOpen={setIsPriorityModalOpen}
            setOpenedTargetFromPlanner={setOpenedTargetFromPlanner}
            setSelectedWeaponIndexForTarget={setSelectedWeaponIndexForTarget}
            setSelectedWeaponKeyForTarget={setSelectedWeaponKeyForTarget}
            setSelectedCharacterKeyForTarget={setSelectedCharacterKeyForTarget}
            setSelectedUpgradeWeaponId={setSelectedUpgradeWeaponId}
            setIsUpgradeWeaponModalOpen={setIsUpgradeWeaponModalOpen}
            setSelectedUpgradeCharacterKey={setSelectedUpgradeCharacterKey}
            setIsUpgradeModalOpen={setIsUpgradeModalOpen}
            setDeletingWeaponId={setDeletingWeaponId}
            setDeletingCharacterKey={setDeletingCharacterKey}
          />
        )}

        {activeTab === 'settings' && (
          <AccountSettingsTab
            user={user}
            profiles={profiles}
            activeProfile={activeProfile}
            setActiveProfile={setActiveProfile}
            setProfiles={setProfiles}
            deleteUserProfile={deleteUserProfile}
            createCustomProfile={createCustomProfile}
            processFile={processFile}
            clearGoodData={clearGoodData}
          />
        )}
      </div>

      {/* Global Mouse Tracker Tooltip */}
      {hoveredItem && (
        <TooltipBox
          hoveredItem={hoveredItem}
          mousePos={mousePos}
          plannedItems={plannedItems}
          weapons={weapons}
        />
      )}

      <CharacterSelectionModal
        isOpen={isCharacterSelectModalOpen}
        onClose={() => {
          setIsCharacterSelectModalOpen(false);
          setReplaceMode(false);
          setReplaceTargetId(null);
        }}
        ownedCharacters={characters}
        replaceMode={replaceMode}
        onAddCustom={() => {
          setCustomModalSource('selection');
          setCustomModalType('character');
          setEditingCustomData(null);
          setIsCustomModalOpen(true);
          setIsCharacterSelectModalOpen(false);
        }}
        onSelect={(key) => {
          setIsCharacterSelectModalOpen(false);
          if (replaceMode && replaceTargetId) {
            setPlannedItems(prev => {
              return prev.map(p => {
                if (p.id === replaceTargetId) {
                  const existingChar = characters.find(c => c.key === key);
                  const currentLevel = existingChar?.level || 1;
                  const currentAscension = existingChar?.ascension || 0;
                  const currentTalents = {
                    auto: existingChar?.talent?.auto || 1,
                    skill: existingChar?.talent?.skill || 1,
                    burst: existingChar?.talent?.burst || 1,
                  };

                  const desiredLevel = Math.max(p.desired.level, currentLevel);
                  const desiredAscension = Math.max(p.desired.ascension, currentAscension);
                  const desiredTalents = {
                    auto: Math.max(p.desired.talent.auto, currentTalents.auto),
                    skill: Math.max(p.desired.talent.skill, currentTalents.skill),
                    burst: Math.max(p.desired.talent.burst, currentTalents.burst),
                  };

                  return {
                    ...p,
                    key,
                    custom: false,
                    customName: undefined,
                    customRarity: undefined,
                    customMaterials: undefined,
                    current: {
                      level: currentLevel,
                      ascension: currentAscension,
                      talent: currentTalents
                    },
                    desired: {
                      level: desiredLevel,
                      ascension: desiredAscension,
                      talent: desiredTalents
                    }
                  };
                }
                return p;
              });
            });
            setReplaceMode(false);
            setReplaceTargetId(null);
          } else {
            setOpenedTargetFromPlanner(false);
            setSelectedCharacterKeyForTarget(key);
          }
        }}
      />

      <CharacterTargetModal
        isOpen={selectedCharacterKeyForTarget !== null}
        onClose={() => {
          setSelectedCharacterKeyForTarget(null);
          setOpenedTargetFromPlanner(false);
          setTempCustomItem(null);
        }}
        onCancel={openedTargetFromPlanner ? undefined : () => {
          setSelectedCharacterKeyForTarget(null);
          setTempCustomItem(null);
          setIsCharacterSelectModalOpen(true);
        }}
        characterKey={selectedCharacterKeyForTarget}
        currentData={characters.find(c => c.key === selectedCharacterKeyForTarget)}
        plannedData={openedTargetFromPlanner && selectedCharacterKeyForTarget !== null ? plannedItems.find(p => (p.type === 'character' || !p.type) && p.key === selectedCharacterKeyForTarget) : undefined}
        customInfo={selectedCharacterKeyForTarget ? (plannedItems.find(p => p.key === selectedCharacterKeyForTarget) || (tempCustomItem && tempCustomItem.key === selectedCharacterKeyForTarget ? tempCustomItem : undefined)) : undefined}
        onEditCustom={() => {
          const item = plannedItems.find(p => p.key === selectedCharacterKeyForTarget) || tempCustomItem;
          setEditingCustomData(item);
          setCustomModalSource('target');
          setCustomModalType('character');
          setIsCustomModalOpen(true);
          setSelectedCharacterKeyForTarget(null);
        }}
        onReplaceWithExisting={() => {
          setReplaceMode(true);
          setReplaceTargetId(plannedItems.find(p => p.key === selectedCharacterKeyForTarget)?.id || null);
          setIsCharacterSelectModalOpen(true);
          setSelectedCharacterKeyForTarget(null);
        }}
        onAccept={(planned) => {
          setPlannedItems(prev => {
            const characterPlan = {
              ...planned,
              type: 'character',
              id: `character:${planned.key}`,
              enabled: true
            };
            const existingItem = prev.find(p => (p.type === 'character' || !p.type) && p.key === planned.key) || tempCustomItem;
            if (existingItem) {
              characterPlan.custom = existingItem.custom;
              characterPlan.customName = existingItem.customName;
              characterPlan.customRarity = existingItem.customRarity;
              characterPlan.customMaterials = existingItem.customMaterials;
              characterPlan.enabled = existingItem.enabled !== false;
            }
            const exists = prev.findIndex(p => (p.type === 'character' || !p.type) && p.key === planned.key);
            if (exists >= 0) {
              const next = [...prev];
              next[exists] = characterPlan;
              return next;
            }
            return [...prev, characterPlan];
          });
          setSelectedCharacterKeyForTarget(null);
          setOpenedTargetFromPlanner(false);
          setTempCustomItem(null);
        }}
      />

      <WeaponSelectionModal
        isOpen={isWeaponSelectModalOpen}
        onClose={() => {
          setIsWeaponSelectModalOpen(false);
          setReplaceMode(false);
          setReplaceTargetId(null);
        }}
        ownedWeapons={weapons}
        plannedItems={plannedItems}
        replaceMode={replaceMode}
        onAddCustom={() => {
          setCustomModalSource('selection');
          setCustomModalType('weapon');
          setEditingCustomData(null);
          setIsCustomModalOpen(true);
          setIsWeaponSelectModalOpen(false);
        }}
        onSelect={(idx, key) => {
          setIsWeaponSelectModalOpen(false);
          if (replaceMode && replaceTargetId) {
            setPlannedItems(prev => {
              return prev.map(p => {
                if (p.id === replaceTargetId) {
                  const existingWeapon = weapons[idx];
                  const currentLevel = existingWeapon?.level || 1;
                  const currentAscension = existingWeapon?.ascension || 0;

                  const desiredLevel = Math.max(p.desired.level, currentLevel);
                  const desiredAscension = Math.max(p.desired.ascension, currentAscension);

                  return {
                    ...p,
                    key: existingWeapon.key,
                    weaponIndex: idx,
                    custom: false,
                    customName: undefined,
                    customRarity: undefined,
                    customWeaponType: undefined,
                    customMaterials: undefined,
                    current: {
                      level: currentLevel,
                      ascension: currentAscension
                    },
                    desired: {
                      level: desiredLevel,
                      ascension: desiredAscension
                    }
                  };
                }
                return p;
              });
            });
            setReplaceMode(false);
            setReplaceTargetId(null);
          } else if (idx === -1 && key) {
            const customWeapons = plannedItems.filter(p => p.type === 'weapon' && p.weaponIndex < 0);
            const nextIdx = customWeapons.length > 0
              ? Math.min(...customWeapons.map(p => p.weaponIndex)) - 1
              : -1;
            setSelectedWeaponIndexForTarget(nextIdx);
            setSelectedWeaponKeyForTarget(key);
          } else {
            setSelectedWeaponIndexForTarget(idx);
            setSelectedWeaponKeyForTarget(weapons[idx].key);
          }
        }}
      />

      <WeaponTargetModal
        isOpen={selectedWeaponIndexForTarget !== null && selectedWeaponKeyForTarget !== null}
        onClose={() => {
          setSelectedWeaponIndexForTarget(null);
          setSelectedWeaponKeyForTarget(null);
          setOpenedTargetFromPlanner(false);
          setTempCustomItem(null);
        }}
        onCancel={openedTargetFromPlanner ? undefined : () => {
          setSelectedWeaponIndexForTarget(null);
          setSelectedWeaponKeyForTarget(null);
          setTempCustomItem(null);
          setIsWeaponSelectModalOpen(true);
        }}
        weaponIndex={selectedWeaponIndexForTarget}
        weaponKey={selectedWeaponKeyForTarget}
        currentData={selectedWeaponIndexForTarget !== null && selectedWeaponIndexForTarget >= 0 ? weapons[selectedWeaponIndexForTarget] : undefined}
        plannedData={openedTargetFromPlanner && selectedWeaponIndexForTarget !== null ? plannedItems.find(p => p.type === 'weapon' && p.weaponIndex === selectedWeaponIndexForTarget) : undefined}
        customInfo={selectedWeaponKeyForTarget ? (plannedItems.find(p => p.key === selectedWeaponKeyForTarget) || (tempCustomItem && tempCustomItem.key === selectedWeaponKeyForTarget ? tempCustomItem : undefined)) : undefined}
        onEditCustom={() => {
          const item = plannedItems.find(p => p.key === selectedWeaponKeyForTarget) || tempCustomItem;
          setEditingCustomData(item);
          setCustomModalSource('target');
          setCustomModalType('weapon');
          setIsCustomModalOpen(true);
          setSelectedWeaponIndexForTarget(null);
          setSelectedWeaponKeyForTarget(null);
        }}
        onReplaceWithExisting={() => {
          setReplaceMode(true);
          setReplaceTargetId(plannedItems.find(p => p.key === selectedWeaponKeyForTarget)?.id || null);
          setIsWeaponSelectModalOpen(true);
          setSelectedWeaponIndexForTarget(null);
          setSelectedWeaponKeyForTarget(null);
        }}
        onAccept={(planned) => {
          setPlannedItems(prev => {
            const weaponPlan = {
              ...planned,
              id: `weapon:${planned.weaponIndex}`,
              enabled: true
            };
            const existingItem = prev.find(p => p.type === 'weapon' && p.weaponIndex === planned.weaponIndex) || tempCustomItem;
            if (existingItem) {
              // Preserve custom attributes if editing custom target levels
              weaponPlan.custom = existingItem.custom;
              weaponPlan.customName = existingItem.customName;
              weaponPlan.customRarity = existingItem.customRarity;
              weaponPlan.customWeaponType = existingItem.customWeaponType;
              weaponPlan.customMaterials = existingItem.customMaterials;
              weaponPlan.enabled = existingItem.enabled !== false;
            }
            const exists = prev.findIndex(p => p.type === 'weapon' && p.weaponIndex === planned.weaponIndex);
            if (exists >= 0) {
              const next = [...prev];
              next[exists] = weaponPlan;
              return next;
            }
            return [...prev, weaponPlan];
          });
          setSelectedWeaponIndexForTarget(null);
          setSelectedWeaponKeyForTarget(null);
          setOpenedTargetFromPlanner(false);
          setTempCustomItem(null);
        }}
      />

      <CustomItemModal
        isOpen={isCustomModalOpen}
        onClose={() => {
          setIsCustomModalOpen(false);
          setEditingCustomData(null);
          if (customModalSource === 'target' && editingCustomData) {
            if (customModalType === 'character') {
              setSelectedCharacterKeyForTarget(editingCustomData.key);
            } else {
              setSelectedWeaponIndexForTarget(editingCustomData.weaponIndex);
              setSelectedWeaponKeyForTarget(editingCustomData.key);
            }
          } else if (customModalSource === 'selection') {
            if (customModalType === 'character') {
              setIsCharacterSelectModalOpen(true);
            } else {
              setIsWeaponSelectModalOpen(true);
            }
          }
        }}
        type={customModalType}
        existingData={editingCustomData}
        onAccept={handleCustomItemAccept}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(usr) => setUser(usr)}
      />

      {deletingCharacterKey && (
        (() => {
          const charData = lookupChar(deletingCharacterKey);
          return (
            <DeletePlanConfirmationModal
              itemName={charData?.name || deletingCharacterKey}
              itemRarity={charData?.rarity || 5}
              itemIconSrc={`${import.meta.env.BASE_URL}characters/${charData?.id}.png`}
              onClose={() => setDeletingCharacterKey(null)}
              onConfirm={() => {
                setPlannedItems(prev => prev.filter(p => !((p.type === 'character' || !p.type) && p.key === deletingCharacterKey)));
                setDeletingCharacterKey(null);
              }}
            />
          );
        })()
      )}

      {deletingWeaponId && (
        (() => {
          const weaponPlan = plannedItems.find(p => p.id === deletingWeaponId);
          if (!weaponPlan) return null;
          const wInfo = lookupWeapon(weaponPlan.key);
          const rarity = wInfo?.rarity || 4;
          const name = wInfo?.name || weaponPlan.key;
          const iconSrc = `${import.meta.env.BASE_URL}weapons/${wInfo?.id}.png`;
          return (
            <DeletePlanConfirmationModal
              itemName={name}
              itemRarity={rarity}
              itemIconSrc={iconSrc}
              onClose={() => setDeletingWeaponId(null)}
              onConfirm={() => {
                setPlannedItems(prev => prev.filter(p => p.id !== deletingWeaponId));
                setDeletingWeaponId(null);
              }}
            />
          );
        })()
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
          handleOpenQuickInventory={handleOpenQuickInventory}
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

      {isUpgradeWeaponModalOpen && selectedUpgradeWeaponId && (
        (() => {
          const planned = plannedItems.find(p => p.id === selectedUpgradeWeaponId);
          if (!planned) return null;
          return (
            <UpgradeWeaponModal
              isOpen={isUpgradeWeaponModalOpen}
              onClose={() => {
                setIsUpgradeWeaponModalOpen(false);
                setSelectedUpgradeWeaponId(null);
              }}
              planned={planned}
              currentData={weapons[planned.weaponIndex]}
              materials={materials}
              onUpgradeClick={handleWeaponUpgradeModalConfirm}
              handleOpenQuickInventory={handleOpenQuickInventory}
            />
          );
        })()
      )}

      {isUpgradeWeaponCorrectionModalOpen && selectedUpgradeWeaponId && (
        <WeaponUpgradeEstimateCorrectionModal
          isOpen={isUpgradeWeaponCorrectionModalOpen}
          onClose={() => setIsUpgradeWeaponCorrectionModalOpen(false)}
          materials={materials}
          estimatedSpend={estimatedWeaponSpend}
          onConfirm={handleWeaponUpgradeFinalConfirmation}
        />
      )}

      <PriorityManagerModal
        isOpen={isPriorityModalOpen}
        plannedItems={plannedItems}
        onClose={() => setIsPriorityModalOpen(false)}
        onSave={(ordered) => setPlannedItems(ordered)}
      />

      <QuickInventoryModal
        isOpen={isQuickInventoryOpen}
        onClose={() => {
          setIsQuickInventoryOpen(false);
          setSelectedQuickInventoryMaterial(null);
        }}
        materialKey={selectedQuickInventoryMaterial}
        materials={materials}
        onSave={(updated) => setMaterials(updated)}
        setHoveredItem={setHoveredItem}
        setMousePos={setMousePos}
      />
    </div>
  );
}

export default App;

interface TooltipBoxProps {
  hoveredItem: { key: string; data: any };
  mousePos: { x: number; y: number };
  plannedItems: any[];
  weapons: any[];
}

const getDomainInfo = (key: string, sortGroup?: number, sortRank?: number) => {
  const weekday = getDomainMaterialWeekdayGroup(key, sortGroup, sortRank);
  if (!weekday) return null;

  const lowerKey = key.toLowerCase();
  let name = 'Domain';

  if (sortGroup === 500) {
    // Talent books
    if (['freedom', 'resistance', 'ballad'].some(n => lowerKey.includes(n))) {
      name = 'Forsaken Rift';
    } else if (['prosperity', 'diligence', 'gold'].some(n => lowerKey.includes(n))) {
      name = 'Taishan Mansion';
    } else if (['transience', 'elegance', 'light'].some(n => lowerKey.includes(n))) {
      name = 'Violet Court';
    } else if (['admonition', 'ingenuity', 'praxis'].some(n => lowerKey.includes(n))) {
      name = 'Steeple of Ignorance';
    } else if (['equity', 'justice', 'order'].some(n => lowerKey.includes(n))) {
      name = 'Pale Forgotten Glory';
    } else if (['contention', 'kindling', 'conflict'].some(n => lowerKey.includes(n))) {
      name = 'Blazing Ruins';
    } else if (['moonlight', 'elysium', 'vagrancy'].some(n => lowerKey.includes(n))) {
      name = 'Lightless Capital';
    } else if (['charity', 'fortitude', 'glory'].some(n => lowerKey.includes(n))) {
      name = 'Relics of the Fallen Grace';
    }
  } else if (sortGroup === 600) {
    // Weapon materials
    if (['decarabian', 'borealwolf', 'dandeliongladiator'].some(n => lowerKey.includes(n))) {
      name = 'Cecilia Garden';
    } else if (['guyun', 'mistveiled', 'aerosiderite'].some(n => lowerKey.includes(n))) {
      name = 'Hidden Palace of Lianshan Formula';
    } else if (['coralbranch', 'narukami', 'wickedlieutenant'].some(n => lowerKey.includes(n))) {
      name = 'Court of Flowing Sand';
    } else if (['forestdew', 'oasisgarden', 'echoingfissures'].some(n => lowerKey.includes(n))) {
      name = 'Tower of Abject Pride';
    } else if (['ancientchord', 'sacreddew', 'pristinesea'].some(n => lowerKey.includes(n))) {
      name = 'Echoes of the Deep Tides';
    } else if (['sacrificialheart', 'longnightflint', 'artfuldevice'].some(n => lowerKey.includes(n))) {
      name = 'Ancient Watchtower';
    } else if (['palestararmy', 'palestar', 'cellaredspiritualnectar', 'cellarnectar', 'spiritualnectar', 'frostemperor', 'thefrostemperor'].some(n => lowerKey.includes(n))) {
      name = 'Domain of Forgery: Cast Iron';
    }
  }

  let dayString = '';
  if (weekday === 'Monday/Thursday') {
    dayString = '(Monday/Thursday/Sunday)';
  } else if (weekday === 'Tuesday/Friday') {
    dayString = '(Tuesday/Friday/Sunday)';
  } else if (weekday === 'Wednesday/Saturday') {
    dayString = '(Wednesday/Saturday/Sunday)';
  }

  return { name, days: dayString };
};

const isGenericMaterial = (key: string) => {
  const k = key.toLowerCase();
  return k === 'mora' || 
         k === 'heroswit' || 
         k === 'adventurersexperience' || 
         k === 'wanderersadvice' || 
         k === 'mysticenhancementore' || 
         k === 'fineenhancementore' || 
         k === 'enhancementore';
};

const TooltipBox: React.FC<TooltipBoxProps> = ({ hoveredItem, mousePos, plannedItems, weapons }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ x: mousePos.x, y: mousePos.y });
  const [measured, setMeasured] = React.useState(false);

  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width || 220;
    const height = rect.height || 150;

    let x = mousePos.x;
    let y = mousePos.y;

    // If it overflows right, render it to the left of the anchor
    if (x + width > window.innerWidth - 16) {
      // Shift left by width + 24 to place on the left of the material tile
      x = mousePos.x - width - 24;
      if (x < 16) {
        x = window.innerWidth - width - 16;
      }
    }

    if (y + height > window.innerHeight - 16) {
      y = window.innerHeight - height - 16;
    }

    if (x < 16) x = 16;
    if (y < 16) y = 16;

    setPos({ x, y });
    setMeasured(true);
  }, [mousePos, hoveredItem]);

  const domainInfo = getDomainInfo(hoveredItem.key, hoveredItem.data.sortGroup, hoveredItem.data.sortRank);
  const regularSources = (hoveredItem.data.sources || []).filter((src: string) => !src.includes('Placeholder'));
  const hasSources = domainInfo || regularSources.length > 0;

  // Find all characters/weapons from the planner that also use this material (unless it is generic)
  const requiredItems = React.useMemo(() => {
    if (hoveredItem.data.custom) {
      return (hoveredItem.data.requiredBy || []).map((rb: any) => {
        const isWep = rb.type === 'weapon';
        const fallbackImageSrc = `https://ui-avatars.com/api/?name=${encodeURIComponent(rb.name)}&background=random&color=fff&rounded=true`;
        return {
          type: rb.type,
          key: rb.key,
          id: rb.id || '',
          name: rb.name,
          rarity: rb.rarity,
          title: rb.name,
          imageSrc: isWep 
            ? `${import.meta.env.BASE_URL}icons/${rb.weaponType?.toLowerCase()}.png`
            : `${import.meta.env.BASE_URL}characters/CustomCharacter.png`,
          fallbackImageSrc
        };
      });
    }

    if (isGenericMaterial(hoveredItem.key)) return [];

    const items: {
      type: 'character' | 'weapon';
      key: string;
      id: string;
      name: string;
      rarity: number;
      title: string;
      imageSrc: string;
      fallbackImageSrc: string;
    }[] = [];

    plannedItems.forEach(planned => {
      const isWeapon = planned.type === 'weapon';
      const cardReqs = getRawCardRequirements(planned);
      if (cardReqs[hoveredItem.key.toLowerCase()] > 0) {
        if (planned.custom) {
          const rarity = planned.customRarity || (isWeapon ? 4 : 5);
          const name = planned.customName || planned.key;
          items.push({
            type: planned.type,
            key: planned.key,
            id: isWeapon ? '' : 'MannequinBoy',
            name,
            rarity,
            title: name,
            imageSrc: isWeapon 
              ? `${import.meta.env.BASE_URL}icons/${planned.customWeaponType?.toLowerCase()}.png`
              : `${import.meta.env.BASE_URL}characters/CustomCharacter.png`,
            fallbackImageSrc: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&rounded=true`
          });
        } else if (!isWeapon) {
          const meta = lookupChar(planned.key);
          if (meta) {
            items.push({
              type: 'character',
              key: planned.key,
              id: meta.id,
              name: meta.name || planned.key,
              rarity: meta.rarity,
              title: meta.name || planned.key,
              imageSrc: `${import.meta.env.BASE_URL}characters/${meta.id}.png`,
              fallbackImageSrc: `https://ui-avatars.com/api/?name=${encodeURIComponent(meta.name || planned.key)}&background=random&color=fff&rounded=true`
            });
          }
        } else {
          const wInfo = lookupWeapon(planned.key);
          if (wInfo) {
            const location = weapons[planned.weaponIndex]?.location;
            const equippedChar = location ? lookupChar(location) : null;
            const equippedName = equippedChar?.name || location;
            const title = wInfo.name ? (location ? `${wInfo.name} (Equipped on ${equippedName})` : wInfo.name) : planned.key;

            items.push({
              type: 'weapon',
              key: planned.key,
              id: wInfo.id,
              name: wInfo.name || planned.key,
              rarity: wInfo.rarity,
              title,
              imageSrc: `${import.meta.env.BASE_URL}weapons/${wInfo.id}.png`,
              fallbackImageSrc: `https://ui-avatars.com/api/?name=${encodeURIComponent(wInfo.name || planned.key)}&background=random&color=fff&rounded=true`
            });
          }
        }
      }
    });

    return items;
  }, [hoveredItem.key, hoveredItem.data.custom, hoveredItem.data.requiredBy, plannedItems, weapons]);

  return (
    <div
      ref={ref}
      className="tooltip-box global"
      style={{
        left: pos.x,
        top: pos.y,
        position: 'fixed',
        visibility: measured ? 'visible' : 'hidden',
        pointerEvents: 'none'
      }}
    >
      <div className="tooltip-header">
        <span className="tooltip-name">{hoveredItem.data.name || hoveredItem.key}</span>
        <div className={`tooltip-icon-wrapper bg-rarity-${hoveredItem.data.rarity || 1}`} style={{ background: hoveredItem.key.startsWith('?') ? '#0a0b0d' : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {hoveredItem.key.startsWith('?') ? (
            <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#ece5d8' }}>?</span>
          ) : (
            <img
              src={hoveredItem.data.localExt ? `${import.meta.env.BASE_URL}icons/${hoveredItem.data.id}${hoveredItem.data.localExt}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(hoveredItem.data.name || hoveredItem.key)}&background=random&color=fff&rounded=true&font-size=0.33`}
              alt=""
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(hoveredItem.data.name || hoveredItem.key)}&background=random&color=fff&rounded=true&font-size=0.33`;
              }}
            />
          )}
        </div>
      </div>
      {hasSources && (
        <div className="tooltip-sources">
          {domainInfo && (
            <div className="tooltip-source-item" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontWeight: '700', color: '#0b0c10', fontSize: '0.85rem' }}>{domainInfo.name}</span>
              <span style={{ color: '#0284c7', fontWeight: '600', fontSize: '0.8rem' }}>{domainInfo.days}</span>
            </div>
          )}
          {regularSources.map((src: string, i: number) => (
            <div key={i} className="tooltip-source-item">{src}</div>
          ))}
        </div>
      )}
      {requiredItems.length > 0 && (
        <div style={{ padding: '0 12px 12px 12px', background: '#ede7dc', borderRadius: '0 0 3px 3px' }}>
          <div className="tooltip-required-by" style={{
            background: '#fff',
            border: '1px solid #d5d0c3',
            padding: '8px',
            borderRadius: '2px',
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: '700', fontSize: '0.85rem', color: '#0b0c10', marginBottom: '6px' }}>Required by</div>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {requiredItems.map((item: any, idx: number) => (
                <div key={`${item.type}-${item.key}-${idx}`} className={`bg-rarity-${item.rarity || 5}`} style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  border: '1px solid rgba(0,0,0,0.15)',
                  position: 'relative'
                }}>
                  <img
                    src={item.imageSrc}
                    alt={item.name}
                    title={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.src = item.fallbackImageSrc;
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
