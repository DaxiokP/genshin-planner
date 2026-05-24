import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import type { GoodWeapon } from '../App';
import weaponMapData from '../maps/weaponMap.json';

const weaponMapRaw: Record<string, any> = weaponMapData;
const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
const weaponIndex: Record<string, string> = {};
Object.keys(weaponMapRaw).forEach(k => { weaponIndex[normalize(k)] = k; });
const lookupWeapon = (key: string) => weaponMapRaw[weaponIndex[normalize(key)]] ?? null;

interface WeaponSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownedWeapons: GoodWeapon[];
  plannedItems: any[]; // planned_items to identify which weapon indexes are already planned
  onSelect: (weaponIndex: number) => void;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterRarities, setFilterRarities] = useState<number[]>([5, 4, 3]);

  const weaponTypes = ['Sword', 'Claymore', 'Polearm', 'Bow', 'Catalyst'];
  const rarities = [5, 4, 3];

  const filteredAndSortedWeapons = useMemo(() => {
    // 1. Iterate owned weapons with array index mapping
    const mapped = ownedWeapons.map((w, idx) => ({ ...w, originalIndex: idx }));

    // 2. Filter out already planned weapons or level 90 weapons
    const plannedIndexes = new Set(
      plannedItems
        .filter(item => item.type === 'weapon')
        .map(item => item.weaponIndex)
    );

    let result = mapped.filter(w => {
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

    // 3. Sort: Rarity desc, then level desc, then alphabetical name
    result.sort((a, b) => {
      const infoA = lookupWeapon(a.key);
      const infoB = lookupWeapon(b.key);
      const rarityA = infoA?.rarity || 3;
      const rarityB = infoB?.rarity || 3;

      if (rarityA !== rarityB) return rarityB - rarityA; // Rarity desc
      if (a.level !== b.level) return b.level - a.level; // Level desc

      const nameA = infoA?.name || a.key;
      const nameB = infoB?.name || b.key;
      return nameA.localeCompare(nameB); // Alphabetical name
    });

    return result;
  }, [ownedWeapons, plannedItems, searchQuery, filterType, filterRarities]);

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
        
        <div className="modal-filter-bar">
          <div className="modal-filter-top">
            <div className="modal-search-wrapper" style={{ flex: 1 }}>
              <Search size={16} className="modal-search-icon" />
              <input 
                type="text" 
                placeholder="Search by weapon name..." 
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

            {/* Rarity filter checkboxes/pills */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginLeft: '12px' }}>
              {rarities.map(r => (
                <button
                  key={r}
                  onClick={() => toggleRarityFilter(r)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: filterRarities.includes(r)
                      ? r === 5 ? 'rgba(255, 204, 102, 0.2)' : r === 4 ? 'rgba(123, 106, 153, 0.2)' : 'rgba(255,255,255,0.1)'
                      : 'transparent',
                    color: filterRarities.includes(r) ? '#fff' : 'rgba(255,255,255,0.4)',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {r}★
                </button>
              ))}
            </div>
          </div>

          <div className="modal-filter-elements" style={{ justifyContent: 'center' }}>
            {weaponTypes.map(type => (
              <button 
                key={type}
                className={`element-filter-btn ${filterType === type ? 'active' : ''}`}
                onClick={() => setFilterType(prev => prev === type ? null : type)}
                title={type}
                style={{
                  background: filterType === type ? 'rgba(255,255,255,0.1)' : 'transparent',
                  padding: '6px',
                  borderRadius: '8px',
                  border: '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                <img 
                  src={getWeaponTypeIconPath(type)} 
                  alt={type} 
                  style={{ width: '24px', height: '24px', objectFit: 'contain' }} 
                />
              </button>
            ))}
          </div>
        </div>

        <div className="modal-content" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {filteredAndSortedWeapons.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
              No available weapons found. (Level 90 or already planned weapons are hidden)
            </div>
          ) : (
            <div className="char-select-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: '0.8rem',
              padding: '0.5rem'
            }}>
              {filteredAndSortedWeapons.map(w => {
                const info = lookupWeapon(w.key);
                if (!info) return null;
                const rarity = info.rarity || 4;

                return (
                  <div
                    key={w.originalIndex}
                    className="char-select-item"
                    onClick={() => onSelect(w.originalIndex)}
                    style={{
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '8px',
                      padding: '8px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                    }}
                  >
                    <div className={`material-icon-wrapper bg-rarity-${rarity}`} style={{ 
                      position: 'relative',
                      width: '80px',
                      height: '80px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(0,0,0,0.2)'
                    }}>
                      <img
                        src={`${import.meta.env.BASE_URL}weapons/${info.id}.png`}
                        alt={info.name}
                        style={{ width: '85%', height: '85%', objectFit: 'contain' }}
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
                      <div className="char-select-level-container" style={{
                        position: 'absolute',
                        bottom: '2px',
                        left: '2px',
                        right: '2px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.68rem',
                        fontWeight: 'bold',
                        color: '#fff',
                        background: 'rgba(0,0,0,0.6)',
                        padding: '1px 4px',
                        borderRadius: '3px'
                      }}>
                        <span>Lv. {w.level}</span>
                        <span style={{ color: '#ffcc66' }}>R{w.refinement}</span>
                      </div>
                    </div>
                    
                    <div className="char-select-name" style={{
                      marginTop: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: '#fff',
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      width: '100%'
                    }}>
                      {info.name}
                    </div>

                    {/* Location Badge (Equipped by...) */}
                    {w.location ? (
                      <span style={{
                        fontSize: '0.65rem',
                        color: 'rgba(255,255,255,0.4)',
                        marginTop: '2px',
                        fontStyle: 'italic',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '100%',
                        textAlign: 'center'
                      }}>
                        {w.location}
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.65rem',
                        color: 'rgba(255,255,255,0.25)',
                        marginTop: '2px',
                        textAlign: 'center'
                      }}>
                        Inventory
                      </span>
                    )}
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
