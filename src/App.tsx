import React, { useState, useRef } from 'react';
import { Upload, FileUp, Sparkles, X, Search, UserPlus, Sword, ListOrdered } from 'lucide-react';
import { CharacterCard } from './components/CharacterCard';
import { CharacterSelectionModal } from './components/CharacterSelectionModal';
import { CharacterTargetModal } from './components/CharacterTargetModal';
import './App.css';
import materialMapData from './maps/materialMap.json';
import characterMapData from './maps/characterMap.json';

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
const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
const charIndex: Record<string, string> = {};
Object.keys(characterMapRaw).forEach(k => { charIndex[normalize(k)] = k; });
const lookupChar = (key: string) => {
  const normalizedKey = normalize(key === 'Traveler' ? 'Aether' : key);
  return characterMapRaw[charIndex[normalizedKey]] ?? null;
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
}

type TabType = 'planner' | 'characters' | 'weapons' | 'inventory';

function App() {
  const [materials, setMaterials] = useState<MaterialsData | null>(null);
  const [characters, setCharacters] = useState<GoodCharacter[]>([]);
  const [weapons, setWeapons] = useState<GoodWeapon[]>([]);
  const [artifacts, setArtifacts] = useState<GoodArtifact[]>([]);
  const [plannedCharacters, setPlannedCharacters] = useState<PlannedCharacter[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('inventory');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [hoveredItem, setHoveredItem] = useState<{ key: string, data: MaterialMapEntry } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isCharacterSelectModalOpen, setIsCharacterSelectModalOpen] = useState(false);
  const [selectedCharacterKeyForTarget, setSelectedCharacterKeyForTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
              <div className="characters-grid">
                {characters.map((char) => (
                  <CharacterCard 
                    key={char.key} 
                    character={char} 
                    weapon={weapons.find(w => w.location === char.key)} 
                    artifacts={artifacts.filter(a => a.location === char.key)} 
                  />
                ))}
              </div>
              {characters.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  No characters found in import.
                </div>
              )}
            </section>
          )}

          {activeTab === 'weapons' && (
            <section className="coming-soon">
              <h2>Weapons</h2>
              <p>Weapon tracking features will be added here soon.</p>
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
                  <button className="planner-btn planner-btn-priority">
                    <ListOrdered size={20} />
                    <span>Manage Priority</span>
                  </button>
                </div>
              </div>

              {plannedCharacters.length > 0 ? (
                <div className="planner-grid">
                  {plannedCharacters.map((planned) => {
                    // const charData = characters.find(c => c.key === planned.key);
                    const charMapInfo = lookupChar(planned.key);
                    
                    return (
                      <div key={planned.key} className="character-card bg-element-none" style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <img 
                            src={`${import.meta.env.BASE_URL}characters/${charMapInfo?.id}.png`} 
                            alt={charMapInfo?.name || planned.key}
                            style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'contain', background: 'rgba(0,0,0,0.3)' }}
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
                          <div style={{ flex: 1 }}>
                            <h3 style={{ margin: 0, color: '#ffcc66' }}>{charMapInfo?.name || planned.key}</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                              <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Level:</span><br/>
                                {planned.current.level} ➔ {planned.desired.level}
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-secondary)' }}>Auto:</span> {planned.current.talent.auto} ➔ {planned.desired.talent.auto}<br/>
                                <span style={{ color: 'var(--text-secondary)' }}>Skill:</span> {planned.current.talent.skill} ➔ {planned.desired.talent.skill}<br/>
                                <span style={{ color: 'var(--text-secondary)' }}>Burst:</span> {planned.current.talent.burst} ➔ {planned.desired.talent.burst}
                              </div>
                            </div>
                          </div>
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
          setSelectedCharacterKeyForTarget(key);
        }}
      />

      <CharacterTargetModal 
        isOpen={selectedCharacterKeyForTarget !== null}
        onClose={() => setSelectedCharacterKeyForTarget(null)}
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
    </div>
  );
}

export default App;
