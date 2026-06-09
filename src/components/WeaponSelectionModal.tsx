import React, { useState, useMemo } from 'react';
import { X, Search, Star, Calendar } from 'lucide-react';
import type { GoodWeapon } from '../App';
import weaponMapData from '../maps/weaponMap.json';

const weaponMapRaw: Record<string, any> = weaponMapData;
const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
const weaponIndex: Record<string, string> = {};
Object.keys(weaponMapRaw).forEach(k => { weaponIndex[normalize(k)] = k; });
const lookupWeapon = (key: string) => weaponMapRaw[weaponIndex[normalize(key)]] ?? null;

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

interface WeaponSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownedWeapons: GoodWeapon[];
  plannedItems: any[]; // planned_items to identify which weapon indexes are already planned
  onSelect: (weaponIndex: number, weaponKey?: string) => void;
}

const getWeaponTypeIconPath = (type: string) => {
  switch (type) {
    case 'Sword': return `${import.meta.env.BASE_URL}icons/sword.png`;
    case 'Claymore': return `${import.meta.env.BASE_URL}icons/claymore.png`;
    case 'Polearm': return `${import.meta.env.BASE_URL}icons/polearm.png`;
    case 'Bow': return `${import.meta.env.BASE_URL}icons/bow.png`;
    case 'Catalyst': return `${import.meta.env.BASE_URL}icons/catalyst.png`;
    default: return `${import.meta.env.BASE_URL}icons/sword.png`;
  }
};

export const WeaponSelectionModal: React.FC<WeaponSelectionModalProps> = ({
  isOpen,
  onClose,
  ownedWeapons,
  plannedItems,
  onSelect,
}) => {
  const [viewMode, setViewMode] = useState<'owned' | 'unowned' | 'all'>('owned');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterRarities, setFilterRarities] = useState<number[]>([5, 4, 3]);
  const [sortBy, setSortBy] = useState<'stars' | 'name' | 'release'>('stars');

  const weaponTypes = ['Sword', 'Claymore', 'Polearm', 'Bow', 'Catalyst'];
  const rarities = [5, 4, 3];

  const filteredAndSortedWeapons = useMemo(() => {
    let result: any[] = [];

    // Filter out already planned owned weapons
    const plannedIndexes = new Set(
      plannedItems
        .filter(item => item.type === 'weapon')
        .map(item => item.weaponIndex)
    );

    if (viewMode === 'owned') {
      const mapped = ownedWeapons.map((w, idx) => ({ ...w, originalIndex: idx }));

      result = mapped.filter(w => {
        // Exclude level 90
        if (w.level === 90) return false;
        // Exclude already planned copy
        if (plannedIndexes.has(w.originalIndex)) return false;

        const info = lookupWeapon(w.key);
        if (!info) return false;

        // Exclude 1* and 2* weapons
        if (info.rarity < 3) return false;

        // Filter by type
        if (filterType && info.type !== filterType) return false;

        // Filter by rarity
        if (!filterRarities.includes(info.rarity)) return false;

        // Filter by search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const displayName = info.name.toLowerCase();
          const keyName = w.key.toLowerCase();
          if (!displayName.includes(q) && !keyName.includes(q)) return false;
        }

        return true;
      });

      result.sort((a, b) => {
        const infoA = lookupWeapon(a.key);
        const infoB = lookupWeapon(b.key);
        const nameA = infoA?.name || a.key;
        const nameB = infoB?.name || b.key;
        const rarityA = infoA?.rarity || 3;
        const rarityB = infoB?.rarity || 3;

        if (sortBy === 'stars') {
          if (rarityA !== rarityB) return rarityB - rarityA; // Rarity desc
          if (a.level !== b.level) return b.level - a.level; // Level desc
          return nameA.localeCompare(nameB);
        } else if (sortBy === 'release') {
          const versionA = infoA?.version;
          const versionB = infoB?.version;
          const vComp = compareVersions(versionB, versionA);
          if (vComp !== 0) return vComp;
          if (rarityA !== rarityB) return rarityB - rarityA;
          if (a.level !== b.level) return b.level - a.level;
          return nameA.localeCompare(nameB);
        } else {
          const nameCompare = nameA.localeCompare(nameB);
          if (nameCompare !== 0) return nameCompare;
          if (a.level !== b.level) return b.level - a.level; // Level desc under same name
          return a.originalIndex - b.originalIndex; // Stable sorting index fallback
        }
      });
    } else {
      // viewMode === 'unowned' || viewMode === 'all'
      Object.keys(weaponMapRaw).forEach(wKey => {
        const info = weaponMapRaw[wKey];
        if (!info) return;

        // Exclude 1* and 2* weapons
        if (info.rarity < 3) return;

        // If unowned view mode, exclude owned weapons
        if (viewMode === 'unowned') {
          const isOwned = ownedWeapons.some(ow => normalize(ow.key) === normalize(wKey));
          if (isOwned) return;
        }

        // Filter by type
        if (filterType && info.type !== filterType) return;

        // Filter by rarity
        if (!filterRarities.includes(info.rarity)) return;

        // Filter by search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const displayName = info.name.toLowerCase();
          const keyName = wKey.toLowerCase();
          if (!displayName.includes(q) && !keyName.includes(q)) return;
        }

        result.push({
          key: wKey,
          level: 1,
          ascension: 0,
          refinement: 1,
          location: '',
          originalIndex: -1 // Special custom marker
        });
      });

      result.sort((a, b) => {
        const infoA = lookupWeapon(a.key);
        const infoB = lookupWeapon(b.key);
        const nameA = infoA?.name || a.key;
        const nameB = infoB?.name || b.key;
        const rarityA = infoA?.rarity || 3;
        const rarityB = infoB?.rarity || 3;

        if (sortBy === 'stars') {
          if (rarityA !== rarityB) return rarityB - rarityA; // Rarity desc
          return nameA.localeCompare(nameB);
        } else if (sortBy === 'release') {
          const versionA = infoA?.version;
          const versionB = infoB?.version;
          const vComp = compareVersions(versionB, versionA);
          if (vComp !== 0) return vComp;
          if (rarityA !== rarityB) return rarityB - rarityA;
          return nameA.localeCompare(nameB);
        } else {
          return nameA.localeCompare(nameB);
        }
      });
    }

    return result;
  }, [ownedWeapons, plannedItems, searchQuery, filterType, filterRarities, sortBy, viewMode]);

  if (!isOpen) return null;

  const toggleRarityFilter = (r: number) => {
    setFilterRarities(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container selection-modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Select Weapon</h2>
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
            Owned Weapons
          </button>
          <button 
            className={`modal-toggle-done-btn ${viewMode === 'unowned' ? 'active' : ''}`}
            onClick={() => { setViewMode('unowned'); setSortBy('release'); }}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Not Owned Weapons
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
            <div className="modal-search-wrapper" style={{ flex: 1 }}>
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
          </div>

          <div className="modal-filter-elements" style={{ alignItems: 'center', gap: '8px' }}>
            {weaponTypes.map(type => (
              <button
                key={type}
                className={`element-filter-btn ${filterType === type ? 'active' : ''}`}
                onClick={() => setFilterType(prev => prev === type ? null : type)}
                title={type}
                style={{
                  width: '40px',
                  height: '40px',
                  padding: '6px',
                  opacity: filterType === type ? 1 : 1,
                  background: filterType === type ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.3)',
                  borderColor: filterType === type ? '#ffcc66' : 'rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.15s ease'
                }}
              >
                <img
                  src={getWeaponTypeIconPath(type)}
                  alt={type}
                  style={{
                    width: '40px',
                    height: '40px',
                    objectFit: 'contain',
                    filter: filterType === type
                      ? 'brightness(0) invert(1) sepia(1) saturate(10000%) hue-rotate(330deg) drop-shadow(0 0 4px rgba(255,204,102,0.4))'
                      : 'brightness(0) invert(1) opacity(0.8) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5))',
                    transition: 'filter 0.15s ease'
                  }}
                />
              </button>
            ))}

            {/* Vertical separator */}
            <div style={{ width: '1px', height: '20px', background: 'var(--glass-border)', margin: '0 4px' }} />

            <div style={{ display: 'flex', gap: '6px' }}>
              {rarities.map(r => (
                <button
                  key={r}
                  className={`modal-sort-btn ${filterRarities.includes(r) ? 'active' : ''}`}
                  onClick={() => toggleRarityFilter(r)}
                  style={{
                    borderColor: filterRarities.includes(r) ? '#ffcc66' : 'var(--glass-border)',
                    background: filterRarities.includes(r)
                      ? r === 5 ? 'rgba(255, 204, 102, 0.2)' : r === 4 ? 'rgba(123, 106, 153, 0.2)' : 'rgba(255,255,255,0.15)'
                      : 'rgba(255,255,255,0.05)',
                    color: filterRarities.includes(r) ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 'bold',
                    height: '36px'
                  }}
                >
                  {r}★
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-content">
          {filteredAndSortedWeapons.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
              No available weapons found. (Level 90 or already planned weapons are hidden)
            </div>
          ) : (
            <div className="char-select-grid">
              {filteredAndSortedWeapons.map(w => {
                const info = lookupWeapon(w.key);
                if (!info) return null;
                const rarity = info.rarity || 4;

                return (
                  <div
                    key={viewMode === 'owned' ? w.originalIndex : w.key}
                    className="char-select-item"
                    onClick={() => onSelect(w.originalIndex, w.key)}
                  >
                    <div className={`material-icon-wrapper bg-rarity-${rarity}`} style={{ position: 'relative' }}>
                      <img
                        src={`${import.meta.env.BASE_URL}weapons/${info.id}.png`}
                        alt={info.name}
                        className="material-icon"
                        style={{ padding: '8px' }}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.fallback) {
                            target.dataset.fallback = 'enka';
                            target.src = `https://enka.network/ui/UI_EquipIcon_${info.id}.png`;
                          } else if (!target.dataset.fallbackUi) {
                            target.dataset.fallbackUi = 'ui';
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(info.name)}&background=random&color=fff&rounded=true&font-size=0.33`;
                          }
                        }}
                      />

                      {/* Weapon level and refine badges */}
                      <div className="char-select-level-container">
                        <span className="char-select-level-text">Lv. {w.level}</span>
                        <span className="char-select-constellation" style={{ background: '#ffcc66', color: '#1a1b24', fontWeight: 'bold' }}>
                          R{w.refinement}
                        </span>
                      </div>

                      {/* Equipped Character Banner at the bottom-center inside the icon box */}
                      {w.location && (
                        <div style={{
                          position: 'absolute',
                          bottom: '4px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'rgba(15, 17, 26, 0.85)',
                          color: 'rgba(255, 255, 255, 0.95)',
                          fontSize: '0.68rem',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          whiteSpace: 'nowrap',
                          maxWidth: '90%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          zIndex: 2,
                          pointerEvents: 'none'
                        }}>
                          {w.location}
                        </div>
                      )}
                    </div>

                    <div className="char-select-name" style={{
                      whiteSpace: 'normal',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '34px',
                      lineHeight: '1.2',
                      padding: '4px 6px'
                    }}>
                      <span style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '100%',
                        textAlign: 'center'
                      }}>{info.name}</span>
                    </div>
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
