import './CharactersTab.css';
import React, { useMemo } from 'react';
import { Search, X, User, ArrowUpNarrowWide, ArrowDownNarrowWide } from 'lucide-react';
import { CharacterCard } from '../CharacterCard';
import type { GoodCharacter, GoodWeapon, GoodArtifact } from '../../types';
import characterMapData from '../../maps/characterMap.json';
import { handleFilterToggle } from '../../utils/filterHelpers';

const characterMapRaw: Record<string, any> = characterMapData as any;
const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

const charIndex: Record<string, string> = {};
Object.keys(characterMapRaw).forEach(k => { charIndex[normalize(k)] = k; });

const lookupChar = (key: string) => {
  const normalizedKey = normalize(key === 'Traveler' ? 'Aether' : key);
  return characterMapRaw[charIndex[normalizedKey]] ?? null;
};

interface CharactersTabProps {
  characters: GoodCharacter[];
  weapons: GoodWeapon[];
  artifacts: GoodArtifact[];
  favoriteCharacterKeys: string[];
  toggleFavoriteCharacter: (key: string) => void;
  characterSearch: string;
  setCharacterSearch: (val: string) => void;
  selectedCharacterWeaponTypes: string[];
  setSelectedCharacterWeaponTypes: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCharacterElements: string[];
  setSelectedCharacterElements: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCharacterRarities: number[];
  setSelectedCharacterRarities: React.Dispatch<React.SetStateAction<number[]>>;
  characterSortBy: 'level' | 'name';
  setCharacterSortBy: React.Dispatch<React.SetStateAction<'level' | 'name'>>;
  characterSortOrder: 'asc' | 'desc';
  setCharacterSortOrder: React.Dispatch<React.SetStateAction<'asc' | 'desc'>>;
}

export const CharactersTab: React.FC<CharactersTabProps> = ({
  characters,
  weapons,
  artifacts,
  favoriteCharacterKeys,
  toggleFavoriteCharacter,
  characterSearch,
  setCharacterSearch,
  selectedCharacterWeaponTypes,
  setSelectedCharacterWeaponTypes,
  selectedCharacterElements,
  setSelectedCharacterElements,
  selectedCharacterRarities,
  setSelectedCharacterRarities,
  characterSortBy,
  setCharacterSortBy,
  characterSortOrder,
  setCharacterSortOrder,
}) => {
  // Filtered characters memo
  const filteredCharacters = useMemo(() => {
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
              onClick={() => setCharacterSortBy(characterSortBy === 'level' ? 'name' : 'level')}
              title="Toggle Level / Name sort"
            >
              Sort: {characterSortBy === 'level' ? 'Level' : 'Name'}
            </button>
            <button
              className="weapon-filter-badge active sort-order-btn"
              onClick={() => setCharacterSortOrder(characterSortOrder === 'asc' ? 'desc' : 'asc')}
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
  );
};
