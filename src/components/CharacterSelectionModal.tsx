import React, { useState, useMemo } from 'react';
import { X, Search, Star } from 'lucide-react';
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

interface CharacterSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownedCharacters: GoodCharacter[];
  onSelect: (characterKey: string) => void;
}

export const CharacterSelectionModal: React.FC<CharacterSelectionModalProps> = ({
  isOpen,
  onClose,
  ownedCharacters,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'stars' | 'name'>('stars');
  const [filterElement, setFilterElement] = useState<string | null>(null);

  const elements = ['Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo'];

  const filteredAndSortedCharacters = useMemo(() => {
    let result = [...ownedCharacters];

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

    // Sort
    result.sort((a, b) => {
      const infoA = lookupChar(a.key);
      const infoB = lookupChar(b.key);
      const nameA = infoA?.name || a.key;
      const nameB = infoB?.name || b.key;
      const starsA = infoA?.rarity || 4;
      const starsB = infoB?.rarity || 4;

      if (sortBy === 'stars') {
        if (starsA !== starsB) return starsB - starsA; // Higher stars first
        // If same stars, fall back to level or name
        if (a.level !== b.level) return b.level - a.level;
        return nameA.localeCompare(nameB);
      } else {
        return nameA.localeCompare(nameB); // A-Z
      }
    });

    return result;
  }, [ownedCharacters, filterElement, searchQuery, sortBy]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container selection-modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Select Character</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
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
              onClick={() => setSortBy(prev => prev === 'stars' ? 'name' : 'stars')}
            >
              <Star size={16} fill={sortBy === 'stars' ? '#ffcc66' : 'none'} color={sortBy === 'stars' ? '#ffcc66' : 'currentColor'} />
              <span style={{ margin: '0 4px', opacity: 0.5 }}>/</span>
              <span style={{ fontWeight: sortBy === 'name' ? 'bold' : 'normal', color: sortBy === 'name' ? '#fff' : 'inherit' }}>Abc</span>
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
          {filteredAndSortedCharacters.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
              No characters found.
            </div>
          ) : (
            <div className="char-select-grid">
              {filteredAndSortedCharacters.map(char => {
                const charInfo = lookupChar(char.key);
                if (!charInfo) return null;
                const rarity = charInfo.rarity || 4;

                return (
                  <div
                    key={char.key}
                    className="char-select-item"
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
                      <div className="char-select-level-container">
                        <span className="char-select-level-text">Lv. {char.level}</span>
                        <span className="char-select-constellation">C{char.constellation || 0}</span>
                      </div>
                      <div className="char-select-talents-overlay">
                        <span className="char-select-talent">{char.talent.auto}</span>
                        <span className="char-select-talent">{char.talent.skill}</span>
                        <span className="char-select-talent">{char.talent.burst}</span>
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
