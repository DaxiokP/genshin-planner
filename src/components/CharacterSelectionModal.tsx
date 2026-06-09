import React, { useState, useMemo } from 'react';
import { X, Search, Star, Calendar } from 'lucide-react';
import type { GoodCharacter } from '../App';
import characterMapData from '../maps/characterMap.json';

const characterMap: Record<string, any> = characterMapData;

const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
const charIndex: Record<string, string> = {};
Object.keys(characterMap).forEach(k => { charIndex[normalize(k)] = k; });
const lookupChar = (key: string) => {
  const normalizedKey = normalize(key === 'Traveler' ? 'Aether' : key);
  return characterMap[charIndex[normalizedKey]] ?? null;
};

const parseVersion = (v: string | number | undefined): [number, number] => {
  if (v === undefined || v === null) return [0, 0];
  const parts = String(v).split('.').map(p => parseInt(p) || 0);
  return [parts[0] || 0, parts[1] || 0];
};

const compareVersions = (v1: string | number | undefined, v2: string | number | undefined): number => {
  const [major1, minor1] = parseVersion(v1);
  const [major2, minor2] = parseVersion(v2);
  if (major1 !== major2) return major1 - major2;
  return minor1 - minor2;
};

interface CharacterSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownedCharacters: GoodCharacter[];
  onSelect: (characterKey: string) => void;
}

const isDoneCharacter = (char: GoodCharacter) => {
  const talents = char.talent || { auto: 1, skill: 1, burst: 1 };
  return (
    char.level >= 90 &&
    char.ascension >= 6 &&
    (talents.auto || 1) >= 10 &&
    (talents.skill || 1) >= 10 &&
    (talents.burst || 1) >= 10
  );
};

export const CharacterSelectionModal: React.FC<CharacterSelectionModalProps> = ({
  isOpen,
  onClose,
  ownedCharacters,
  onSelect,
}) => {
  const [viewMode, setViewMode] = useState<'owned' | 'unowned' | 'all'>('owned');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'stars' | 'name' | 'release'>('stars');
  const [filterElement, setFilterElement] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const elements = ['Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo'];

  const filteredAndSortedCharacters = useMemo(() => {
    let result: GoodCharacter[] = [];

    if (viewMode === 'owned') {
      result = [...ownedCharacters];
    } else if (viewMode === 'unowned') {
      // Get all characters from characterMap that are not owned
      Object.keys(characterMap).forEach(key => {
        const info = characterMap[key];
        if (!info) return;

        // Skip placeholder characters
        if (['MannequinBoy', 'MannequinGirl', 'PlayerBoy', 'PlayerGirl'].includes(info.id) && key !== 'Aether' && key !== 'Lumine') {
          return;
        }

        const ownedMatch = ownedCharacters.find(c => {
          const cNorm = normalize(c.key);
          const keyNorm = normalize(key);
          return cNorm === keyNorm || (cNorm === 'traveler' && keyNorm === 'aether');
        });

        if (!ownedMatch) {
          result.push({
            key: key,
            level: 1,
            constellation: 0,
            ascension: 0,
            talent: { auto: 1, skill: 1, burst: 1 }
          });
        }
      });
    } else {
      // Get all characters from characterMap
      Object.keys(characterMap).forEach(key => {
        const info = characterMap[key];
        if (!info) return;

        // Skip placeholder characters
        if (['MannequinBoy', 'MannequinGirl', 'PlayerBoy', 'PlayerGirl'].includes(info.id) && key !== 'Aether' && key !== 'Lumine') {
          return;
        }

        const ownedMatch = ownedCharacters.find(c => {
          const cNorm = normalize(c.key);
          const keyNorm = normalize(key);
          return cNorm === keyNorm || (cNorm === 'traveler' && keyNorm === 'aether');
        });

        if (ownedMatch) {
          result.push({
            ...ownedMatch,
            key: key // Keep characterMap key consistency
          });
        } else {
          result.push({
            key: key,
            level: 1,
            constellation: 0,
            ascension: 0,
            talent: { auto: 1, skill: 1, burst: 1 }
          });
        }
      });
    }

    // Filter by element
    if (filterElement) {
      result = result.filter(char => {
        const info = lookupChar(char.key);
        // If filter is active and char is Traveler (None), hide it as per requirements
        if (!info || info.element === 'None') return false;
        return info.element === filterElement;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(char => {
        const info = lookupChar(char.key);
        return info && info.name.toLowerCase().includes(q);
      });
    }

    const totalMatching = result.length;
    const doneCount = result.filter(isDoneCharacter).length;
    const allMatchingAreDone = totalMatching > 0 && doneCount === totalMatching;

    // Filter out done characters if showDone is false
    if (!showDone) {
      result = result.filter(char => !isDoneCharacter(char));
    }

    // Sort
    result.sort((a, b) => {
      // Put completed characters at the end when showing them
      const doneA = isDoneCharacter(a);
      const doneB = isDoneCharacter(b);
      if (doneA !== doneB) return doneA ? 1 : -1;

      const infoA = lookupChar(a.key);
      const infoB = lookupChar(b.key);
      const nameA = infoA?.name || a.key;
      const nameB = infoB?.name || b.key;
      const starsA = infoA?.rarity || 4;
      const starsB = infoB?.rarity || 4;
      const versionA = infoA?.version;
      const versionB = infoB?.version;

      if (sortBy === 'stars') {
        if (starsA !== starsB) return starsB - starsA; // Higher stars first
        // If same stars, fall back to level or name
        if (a.level !== b.level) return b.level - a.level;
        return nameA.localeCompare(nameB);
      } else if (sortBy === 'release') {
        const vComp = compareVersions(versionB, versionA); // Descending (newest first)
        if (vComp !== 0) return vComp;
        if (starsA !== starsB) return starsB - starsA; // Rarity fallback
        if (a.level !== b.level) return b.level - a.level;
        return nameA.localeCompare(nameB);
      } else {
        return nameA.localeCompare(nameB); // A-Z
      }
    });

    return {
      characters: result,
      allMatchingAreDone
    };
  }, [ownedCharacters, filterElement, searchQuery, sortBy, showDone, viewMode]);

  if (!isOpen) return null;

  const { characters: list, allMatchingAreDone } = filteredAndSortedCharacters;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container selection-modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Select Character</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-view-mode-tabs" style={{ display: 'flex', gap: '8px', padding: '1rem 1.5rem 0 1.5rem' }}>
          <button 
            className={`modal-toggle-done-btn ${viewMode === 'owned' ? 'active' : ''}`}
            onClick={() => { setViewMode('owned'); if (sortBy === 'release') setSortBy('stars'); }}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Owned Characters
          </button>
          <button 
            className={`modal-toggle-done-btn ${viewMode === 'unowned' ? 'active' : ''}`}
            onClick={() => { setViewMode('unowned'); setSortBy('release'); }}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Not Owned Characters
          </button>
          <button 
            className={`modal-toggle-done-btn ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => { setViewMode('all'); if (sortBy === 'release') setSortBy('stars'); }}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            All Game Database
          </button>
        </div>
        
        <div className="modal-filter-bar">
          <div className="modal-filter-top">
            <div className="modal-search-wrapper">
              <Search size={16} className="modal-search-icon" />
              <input 
                type="text" 
                placeholder="Search" 
                className="modal-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="modal-search-clear" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
            
            <button 
              className="modal-sort-btn" 
              onClick={() => setSortBy(prev => {
                if (prev === 'stars') return 'name';
                if (prev === 'name') return 'release';
                return 'stars';
              })}
            >
              <Star size={16} fill={sortBy === 'stars' ? '#ffcc66' : 'none'} color={sortBy === 'stars' ? '#ffcc66' : 'currentColor'} />
              <span style={{ margin: '0 4px', opacity: 0.5 }}>/</span>
              <span style={{ fontWeight: sortBy === 'name' ? 'bold' : 'normal', color: sortBy === 'name' ? '#fff' : 'inherit' }}>Abc</span>
              <span style={{ margin: '0 4px', opacity: 0.5 }}>/</span>
              <Calendar size={16} color={sortBy === 'release' ? '#ffcc66' : 'currentColor'} />
            </button>

            <button 
              className={`modal-toggle-done-btn ${showDone ? 'active' : ''}`}
              onClick={() => setShowDone(prev => !prev)}
            >
              <span>Show Done</span>
            </button>
          </div>

          <div className="modal-filter-elements">
            {elements.map(el => (
              <button 
                key={el}
                className={`element-filter-btn ${filterElement === el ? 'active' : ''}`}
                onClick={() => setFilterElement(prev => prev === el ? null : el)}
                title={el}
              >
                <img src={`${import.meta.env.BASE_URL}elements/${el.toLowerCase()}.png`} alt={el} />
              </button>
            ))}
          </div>
        </div>

        <div className="modal-content">
          {list.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
              {allMatchingAreDone 
                ? "All matching characters completed! Toggle 'Show Done' to view them." 
                : "No characters found."}
            </div>
          ) : (
            <div className="char-select-grid">
              {list.map(char => {
                const charInfo = lookupChar(char.key);
                if (!charInfo) return null;
                const rarity = charInfo.rarity || 4;
                const isDone = isDoneCharacter(char);

                return (
                  <div
                    key={char.key}
                    className={`char-select-item ${isDone ? 'done' : ''}`}
                    onClick={() => onSelect(char.key)}
                  >
                    <div className={`material-icon-wrapper bg-rarity-${rarity}`} style={{ position: 'relative' }}>
                      <img
                        src={`${import.meta.env.BASE_URL}characters/${charInfo.id}.png`}
                        alt={charInfo.name}
                        className="material-icon"
                        style={{ objectPosition: 'bottom' }}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.fallback) {
                            target.dataset.fallback = 'enka';
                            target.src = `https://enka.network/ui/UI_AvatarIcon_${charInfo.id}.png`;
                          } else if (!target.dataset.fallbackUi) {
                            target.dataset.fallbackUi = 'ui';
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(charInfo.name)}&background=random&color=fff&rounded=true&font-size=0.33`;
                          }
                        }}
                      />
                      {isDone && (
                        <div className="char-select-done-badge" title="Completed">
                          ✓
                        </div>
                      )}
                      <div className="char-select-level-container">
                        <span className="char-select-level-text">Lv. {char.level}</span>
                        <span className="char-select-constellation">C{char.constellation || 0}</span>
                      </div>
                      <div className="char-select-talents-overlay">
                        <span className="char-select-talent">{char.talent.auto}</span>
                        <span className={`char-select-talent ${char.constellation >= 3 ? 'boosted' : ''}`}>
                          {char.talent.skill + (char.constellation >= 3 ? 3 : 0)}
                        </span>
                        <span className={`char-select-talent ${char.constellation >= 5 ? 'boosted' : ''}`}>
                          {char.talent.burst + (char.constellation >= 5 ? 3 : 0)}
                        </span>
                      </div>
                    </div>
                    <div className="char-select-name">{charInfo.name}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
