import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';
import materialMapData from '../maps/materialMap.json';

interface SelectMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: 'common' | 'localSpecialty' | 'bossMaterial' | 'elementalGem' | 'talentBook' | 'weeklyMaterial' | 'uncommon' | 'domainMaterial';
  onSelect: (materialKey: string) => void;
}

export const SelectMaterialModal: React.FC<SelectMaterialModalProps> = ({
  isOpen,
  onClose,
  category,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const availableMaterials = useMemo(() => {
    const materials = Object.entries(materialMapData).map(([key, val]: any) => ({
      key,
      ...val
    }));

    let filtered: any[] = [];

    if (category === 'common' || category === 'uncommon') {
      const group100 = materials.filter(m => m.sortGroup === 100);
      const chains: Record<number, any[]> = {};
      group100.forEach(m => {
        if (m.sortRank !== undefined) {
          if (!chains[m.sortRank]) chains[m.sortRank] = [];
          chains[m.sortRank].push(m);
        }
      });

      const baseItems = Object.values(chains).map(chain => {
        return chain.reduce((min, curr) => curr.rarity < min.rarity ? curr : min, chain[0]);
      });

      if (category === 'common') {
        filtered = baseItems.filter(item => item.rarity === 1);
      } else {
        filtered = baseItems.filter(item => item.rarity === 2);
      }
    } else if (category === 'elementalGem') {
      const group400 = materials.filter(m => m.sortGroup === 400);
      const chains: Record<number, any[]> = {};
      group400.forEach(m => {
        if (m.sortRank !== undefined) {
          if (!chains[m.sortRank]) chains[m.sortRank] = [];
          chains[m.sortRank].push(m);
        }
      });
      filtered = Object.values(chains).map(chain => {
        return chain.reduce((min, curr) => curr.rarity < min.rarity ? curr : min, chain[0]);
      });
    } else if (category === 'talentBook') {
      const group500 = materials.filter(m => m.sortGroup === 500 && m.key !== 'crownofinsight');
      const chains: Record<number, any[]> = {};
      group500.forEach(m => {
        if (m.sortRank !== undefined) {
          if (!chains[m.sortRank]) chains[m.sortRank] = [];
          chains[m.sortRank].push(m);
        }
      });
      filtered = Object.values(chains).map(chain => {
        return chain.reduce((min, curr) => curr.rarity < min.rarity ? curr : min, chain[0]);
      });
    } else if (category === 'domainMaterial') {
      const group600 = materials.filter(m => m.sortGroup === 600);
      const chains: Record<number, any[]> = {};
      group600.forEach(m => {
        if (m.sortRank !== undefined) {
          if (!chains[m.sortRank]) chains[m.sortRank] = [];
          chains[m.sortRank].push(m);
        }
      });
      filtered = Object.values(chains).map(chain => {
        return chain.reduce((min, curr) => curr.rarity < min.rarity ? curr : min, chain[0]);
      });
    } else if (category === 'bossMaterial') {
      filtered = materials.filter(m => m.sortGroup === 300);
    } else if (category === 'localSpecialty') {
      filtered = materials.filter(m => m.sortGroup === 700);
    } else if (category === 'weeklyMaterial') {
      filtered = materials.filter(m => m.sortGroup === 200);
    }

    // Sort by name
    return filtered
      .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [category, searchQuery]);

  if (!isOpen) return null;

  const handleSelectUnknown = () => {
    onSelect(`?_${category.toLowerCase()}`);
  };

  const getCategoryTitle = () => {
    switch (category) {
      case 'common': return 'Common Drops';
      case 'localSpecialty': return 'Local Specialties';
      case 'bossMaterial': return 'Boss Materials';
      case 'elementalGem': return 'Elemental Gems';
      case 'talentBook': return 'Talent Books';
      case 'weeklyMaterial': return 'Weekly Boss Materials';
      case 'uncommon': return 'Uncommon Elite Drops';
      case 'domainMaterial': return 'Weapon Domain Materials';
      default: return 'Material';
    }
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose} 
      style={{ 
        zIndex: 1100, 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'center', 
        paddingTop: '10vh' 
      }}
    >
      <div 
        className="modal-container" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '500px', width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <h2>Select {getCategoryTitle()}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-filter-bar" style={{ padding: '1rem' }}>
          <div className="modal-search-wrapper" style={{ width: '100%' }}>
            <Search size={16} className="modal-search-icon" />
            <input 
              type="text" 
              placeholder="Search materials..." 
              className="modal-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            {searchQuery && (
              <button className="modal-search-clear" onClick={() => setSearchQuery('')}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="modal-content" style={{ padding: '0 1rem 1rem 1rem', overflowY: 'auto', flex: 1 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
            gap: '0.75rem',
            justifyItems: 'center'
          }}>
            {availableMaterials.map((mat) => (
              <div
                key={mat.key}
                onClick={() => onSelect(mat.key)}
                className="char-select-item"
                style={{ width: '70px', cursor: 'pointer', textAlign: 'center' }}
                title={mat.name}
              >
                <div 
                  className={`material-icon-wrapper bg-rarity-${mat.rarity || 1}`} 
                  style={{ 
                    width: '60px', 
                    height: '60px', 
                    position: 'relative', 
                    borderRadius: '50%', 
                    overflow: 'hidden', 
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <img
                    src={mat.localExt ? `${import.meta.env.BASE_URL}icons/${mat.id}${mat.localExt}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(mat.name)}`}
                    alt={mat.name}
                    className="material-icon"
                    style={{ width: '80%', height: '80%', objectFit: 'contain', transform: 'scale(1.25)', transformOrigin: 'center' }}
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(mat.name)}&background=random&color=fff&rounded=true&font-size=0.33`;
                    }}
                  />
                </div>
              </div>
            ))}

            {/* Question Mark Option */}
            <div
              onClick={handleSelectUnknown}
              className="char-select-item"
              style={{ width: '70px', cursor: 'pointer', textAlign: 'center' }}
              title="New Material"
            >
              <div 
                className="material-icon-wrapper" 
                style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  background: '#0a0b0d', 
                  border: '2px solid rgba(255,255,255,0.1)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto'
                }}
              >
                <span style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ece5d8' }}>?</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
