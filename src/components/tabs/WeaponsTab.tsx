import './WeaponsTab.css';
import React, { useMemo } from 'react';
import { Search, X, Sword } from 'lucide-react';
import { WeaponCard } from '../WeaponCard';
import type { GoodWeapon, GoodCharacter } from '../../types';
import weaponMapData from '../../maps/weaponMap.json';
import { handleFilterToggle } from '../../utils/filterHelpers';

const weaponMapRaw: Record<string, any> = weaponMapData as any;
const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

const weaponIndex: Record<string, string> = {};
Object.keys(weaponMapRaw).forEach(k => { weaponIndex[normalize(k)] = k; });

const lookupWeapon = (key: string) => {
  return weaponMapRaw[weaponIndex[normalize(key)]] ?? null;
};

interface WeaponsTabProps {
  weapons: GoodWeapon[];
  characters: GoodCharacter[];
  weaponSearch: string;
  setWeaponSearch: (val: string) => void;
  selectedWeaponTypes: string[];
  setSelectedWeaponTypes: React.Dispatch<React.SetStateAction<string[]>>;
  selectedStarRarities: number[];
  setSelectedStarRarities: React.Dispatch<React.SetStateAction<number[]>>;
}

export const WeaponsTab: React.FC<WeaponsTabProps> = ({
  weapons,
  characters,
  weaponSearch,
  setWeaponSearch,
  selectedWeaponTypes,
  setSelectedWeaponTypes,
  selectedStarRarities,
  setSelectedStarRarities,
}) => {
  const getWeaponName = (w: GoodWeapon) => {
    const mapData = lookupWeapon(w.key);
    return mapData?.name || w.key;
  };

  const getWeaponRarity = (w: GoodWeapon) => {
    const mapData = lookupWeapon(w.key);
    return mapData?.rarity || 1;
  };

  // Filtered weapons
  const filteredWeapons = useMemo(() => {
    return weapons.filter(w => {
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
  }, [weapons, weaponSearch, selectedWeaponTypes, selectedStarRarities]);

  // Sorted weapons stable sorting
  const sortedWeapons = useMemo(() => {
    return [...filteredWeapons].sort((a, b) => {
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
  }, [filteredWeapons, weapons]);

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

    // Active counts based on weapons currently matching filters
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

  return (
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
      {weapons.length === 0 && (
        <div className="weapons-empty-state">
          <Sword size={48} className="empty-icon" />
          <h3>No Weapons Found</h3>
          <p>No weapons found in import.</p>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Go to <strong>Account Settings</strong> to import your GOOD format JSON file.</p>
        </div>
      )}

      {weapons.length > 0 && sortedWeapons.length === 0 && (
        <div className="weapons-empty-state">
          <Sword size={48} className="empty-icon" />
          <h3>No Matches</h3>
          <p>Try adjusting your search query or filter criteria.</p>
        </div>
      )}
    </section>
  );
};
export default WeaponsTab;
