import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, FileUp, Cloud, CloudOff, CloudLightning, LogIn, LogOut, ChevronDown, User, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { CharacterSelectionModal } from './components/CharacterSelectionModal';
import { CharacterTargetModal } from './components/CharacterTargetModal';
import { calculateRequirements, simulatePlannerInventory } from './utils/plannerCalculator';
import './App.css';
import characterMapData from './maps/characterMap.json';
import weaponMapData from './maps/weaponMap.json';
import { supabase, fetchUserProfiles, createCustomProfile, deleteUserProfile } from './supabase';
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

type TabType = 'planner' | 'characters' | 'weapons' | 'inventory';

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
    isAddingProfile,
    setIsAddingProfile,
    newProfileName,
    setNewProfileName,
    isCreatingProfile,
    setIsCreatingProfile,
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
  const [activeTab, setActiveTab] = useState<TabType>('planner');
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


  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const fileInputRef = useRef<HTMLInputElement>(null);





;

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
        setError('Failed to parse JSON file.');
        console.error(err);
      }
    };
    reader.readAsText(file);
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

    const draftWeapon = { ...planned, desired: target };
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
                                  const fallback = updated.find((prof: any) => prof.profile_name !== p.profile_name);
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
        </div>
      )}

      {/* Global Mouse Tracker Tooltip */}
      {hoveredItem && (
        <TooltipBox
          hoveredItem={hoveredItem}
          mousePos={mousePos}
        />
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
        onClose={() => {
          setSelectedCharacterKeyForTarget(null);
          setOpenedTargetFromPlanner(false);
        }}
        onCancel={openedTargetFromPlanner ? undefined : () => {
          setSelectedCharacterKeyForTarget(null);
          setIsCharacterSelectModalOpen(true);
        }}
        characterKey={selectedCharacterKeyForTarget}
        currentData={characters.find(c => c.key === selectedCharacterKeyForTarget)}
        plannedData={openedTargetFromPlanner && selectedCharacterKeyForTarget !== null ? plannedItems.find(p => (p.type === 'character' || !p.type) && p.key === selectedCharacterKeyForTarget) : undefined}
        onAccept={(planned) => {
          setPlannedItems(prev => {
            const characterPlan = {
              ...planned,
              type: 'character',
              id: `character:${planned.key}`,
              enabled: true
            };
            const exists = prev.findIndex(p => (p.type === 'character' || !p.type) && p.key === planned.key);
            if (exists >= 0) {
              const next = [...prev];
              characterPlan.enabled = prev[exists].enabled !== false;
              next[exists] = characterPlan;
              return next;
            }
            return [...prev, characterPlan];
          });
          setSelectedCharacterKeyForTarget(null);
          setOpenedTargetFromPlanner(false);
        }}
      />

      <WeaponSelectionModal
        isOpen={isWeaponSelectModalOpen}
        onClose={() => setIsWeaponSelectModalOpen(false)}
        ownedWeapons={weapons}
        plannedItems={plannedItems}
        onSelect={(idx) => {
          setIsWeaponSelectModalOpen(false);
          setSelectedWeaponIndexForTarget(idx);
          setSelectedWeaponKeyForTarget(weapons[idx].key);
        }}
      />

      <WeaponTargetModal
        isOpen={selectedWeaponIndexForTarget !== null && selectedWeaponKeyForTarget !== null}
        onClose={() => {
          setSelectedWeaponIndexForTarget(null);
          setSelectedWeaponKeyForTarget(null);
          setOpenedTargetFromPlanner(false);
        }}
        onCancel={openedTargetFromPlanner ? undefined : () => {
          setSelectedWeaponIndexForTarget(null);
          setSelectedWeaponKeyForTarget(null);
          setIsWeaponSelectModalOpen(true);
        }}
        weaponIndex={selectedWeaponIndexForTarget}
        weaponKey={selectedWeaponKeyForTarget}
        currentData={selectedWeaponIndexForTarget !== null ? weapons[selectedWeaponIndexForTarget] : undefined}
        plannedData={openedTargetFromPlanner && selectedWeaponIndexForTarget !== null ? plannedItems.find(p => p.type === 'weapon' && p.weaponIndex === selectedWeaponIndexForTarget) : undefined}
        onAccept={(planned) => {
          setPlannedItems(prev => {
            const weaponPlan = {
              ...planned,
              id: `weapon:${planned.weaponIndex}`,
              enabled: true
            };
            if (openedTargetFromPlanner) {
              const exists = prev.findIndex(p => p.type === 'weapon' && p.weaponIndex === planned.weaponIndex);
              if (exists >= 0) {
                const next = [...prev];
                weaponPlan.enabled = prev[exists].enabled !== false;
                next[exists] = weaponPlan;
                return next;
              }
            }
            return [...prev, weaponPlan];
          });
          setSelectedWeaponIndexForTarget(null);
          setSelectedWeaponKeyForTarget(null);
          setOpenedTargetFromPlanner(false);
        }}
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
}

const TooltipBox: React.FC<TooltipBoxProps> = ({ hoveredItem, mousePos }) => {
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
      {hoveredItem.data.sources && hoveredItem.data.sources.filter((src: string) => !src.includes('Placeholder')).length > 0 && (
        <div className="tooltip-sources">
          {hoveredItem.data.sources
            .filter((src: string) => !src.includes('Placeholder'))
            .map((src: string, i: number) => (
              <div key={i} className="tooltip-source-item">{src}</div>
            ))}
        </div>
      )}
    </div>
  );
};
