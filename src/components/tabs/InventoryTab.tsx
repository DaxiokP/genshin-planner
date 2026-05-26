import React from 'react';
import { Search, X } from 'lucide-react';
import materialMapData from '../../maps/materialMap.json';

import type { MaterialsData } from '../../types';

interface MaterialMapEntry {
  id: string;
  name?: string;
  rarity: number;
  sources: string[];
  localExt?: string;
  sortGroup?: number;
  sortRank?: number;
}

const materialMap: Record<string, MaterialMapEntry> = materialMapData as any;

interface InventoryTabProps {
  materials: MaterialsData | null;
  setMaterials: React.Dispatch<React.SetStateAction<MaterialsData | null>>;
  search: string;
  setSearch: (val: string) => void;
  setHoveredItem: React.Dispatch<React.SetStateAction<any>>;
  setMousePos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  materials,
  setMaterials,
  search,
  setSearch,
  setHoveredItem,
  setMousePos,
}) => {
  // Build the display list from the FULL materialMap, merging counts from GOOD file
  const allMaterialEntries: [string, number][] = React.useMemo(() => {
    return Object.entries(materialMap).map(([key]) => {
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
  }, [materials]);

  const filteredMaterials = React.useMemo(() => {
    return allMaterialEntries
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
  }, [allMaterialEntries, search]);
  return (
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
                setMaterials((prev: MaterialsData | null) => {
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
                    setMaterials((prev: MaterialsData | null) => {
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
  );
};
