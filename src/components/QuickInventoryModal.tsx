import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Plus } from 'lucide-react';
import materialMapData from '../maps/materialMap.json';
import bossMappingsData from '../maps/bossMappings.json';

const materialMap = materialMapData as Record<string, {
  id: string;
  name?: string;
  rarity: number;
  sources: string[];
  localExt?: string;
  sortGroup?: number;
  sortRank?: number;
}>;

const bossMappings = bossMappingsData as Record<string, {
  enemyName: string;
  drops: string[];
  gems: string[];
}>;

const GEM_ELEMENTS: Record<string, string> = {
  agnidusagate: 'Pyro Gems',
  varunadalazurite: 'Hydro Gems',
  vajradaamethyst: 'Electro Gems',
  vayudaturquoise: 'Anemo Gems',
  shivadajade: 'Cryo Gems',
  prithivatopaz: 'Geo Gems',
  nagadusemerald: 'Dendro Gems'
};

function getSharedTitle(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  
  // Split each name into words and strip special chars
  const wordLists = names.map(n => 
    n.split(/\s+/).map(w => w.replace(/[^a-zA-Z0-9]/g, ''))
  );
  
  // Find words that are present in all names
  const firstList = wordLists[0];
  const commonWords = firstList.filter(w => 
    w.length > 0 && wordLists.every(list => 
      list.some(lw => lw.toLowerCase() === w.toLowerCase())
    )
  );
  
  if (commonWords.length > 0) {
    return commonWords.join(' ');
  }
  
  return names[names.length - 1];
}

interface GroupedMaterials {
  title: string;
  groups: { title?: string; items: string[] }[];
}

function resolveGroupedMaterials(materialKey: string): GroupedMaterials {
  const lowerKey = materialKey.toLowerCase();
  
  // 1. Mora
  if (lowerKey === 'mora') {
    return {
      title: 'Mora',
      groups: [{ items: ['mora'] }]
    };
  }
  
  // 2. Character EXP
  if (['heroswit', 'adventurersexperience', 'wanderersadvice'].includes(lowerKey)) {
    return {
      title: 'Character EXP',
      groups: [{ items: ['heroswit', 'adventurersexperience', 'wanderersadvice'] }]
    };
  }
  
  // 3. Weapon EXP
  if (['mysticenhancementore', 'fineenhancementore', 'enhancementore'].includes(lowerKey)) {
    return {
      title: 'Weapon EXP',
      groups: [{ items: ['mysticenhancementore', 'fineenhancementore', 'enhancementore'] }]
    };
  }
  
  // 4. Boss / Weekly Boss
  if (bossMappings[lowerKey]) {
    const bossInfo = bossMappings[lowerKey];
    
    const gemGroups: Record<string, string[]> = {};
    bossInfo.gems.forEach(gemKey => {
      let matchedFamily = 'Other Gems';
      for (const [prefix, familyName] of Object.entries(GEM_ELEMENTS)) {
        if (gemKey.startsWith(prefix)) {
          matchedFamily = familyName;
          break;
        }
      }
      if (!gemGroups[matchedFamily]) gemGroups[matchedFamily] = [];
      gemGroups[matchedFamily].push(gemKey);
    });
    
    const sortedGemGroups = Object.entries(gemGroups).map(([title, items]) => {
      const sortedItems = [...items].sort((a, b) => {
        const rarityA = materialMap[a]?.rarity || 1;
        const rarityB = materialMap[b]?.rarity || 1;
        return rarityB - rarityA;
      });
      return { title, items: sortedItems };
    });
    
    return {
      title: bossInfo.enemyName,
      groups: [
        { title: 'Boss Material', items: bossInfo.drops },
        ...sortedGemGroups
      ]
    };
  }
  
  // 5. Standard multi-tier grouping
  const clickedMat = materialMap[lowerKey];
  if (clickedMat && clickedMat.sortGroup !== undefined && clickedMat.sortRank !== undefined) {
    const sg = clickedMat.sortGroup;
    const sr = clickedMat.sortRank;
    
    if (![700, 300, 200, 800].includes(sg)) {
      const items: string[] = [];
      Object.entries(materialMap).forEach(([key, val]) => {
        if (val.sortGroup === sg && val.sortRank === sr) {
          items.push(key);
        }
      });
      
      if (items.length > 1) {
        items.sort((a, b) => {
          const rarityA = materialMap[a]?.rarity || 1;
          const rarityB = materialMap[b]?.rarity || 1;
          return rarityB - rarityA;
        });
        
        let title = '';
        if (sg === 100) {
          title = getSharedTitle(items.map(k => materialMap[k]?.name || k));
        } else if (sg === 500 || sg === 600) {
          title = getSharedTitle(items.map(k => materialMap[k]?.name || k));
        } else {
          title = clickedMat.name || materialKey;
        }
        
        return {
          title,
          groups: [{ items }]
        };
      }
    }
  }
  
  return {
    title: clickedMat?.name || materialKey,
    groups: [{ items: [lowerKey] }]
  };
}

interface QuickInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialKey: string | null;
  materials: Record<string, number> | null;
  onSave: (updatedCounts: Record<string, number>) => void;
  setHoveredItem: (item: { key: string; data: any } | null) => void;
  setMousePos: (pos: { x: number; y: number }) => void;
}

export const QuickInventoryModal: React.FC<QuickInventoryModalProps> = ({
  isOpen,
  onClose,
  materialKey,
  materials,
  onSave,
  setHoveredItem,
  setMousePos,
}) => {
  const [draftCounts, setDraftCounts] = useState<Record<string, string>>({});
  const [draftDeltas, setDraftDeltas] = useState<Record<string, string>>({});

  const displayedInfo = useMemo(() => {
    if (!materialKey) return null;
    return resolveGroupedMaterials(materialKey);
  }, [materialKey]);

  const getRawOwnedCount = (key: string): number => {
    if (!materials) return 0;
    const lower = key.toLowerCase();
    for (const gk of Object.keys(materials)) {
      if (gk.toLowerCase() === lower) {
        return materials[gk];
      }
    }
    return 0;
  };

  useEffect(() => {
    if (isOpen && displayedInfo) {
      const counts: Record<string, string> = {};
      const deltas: Record<string, string> = {};

      displayedInfo.groups.forEach(g => {
        g.items.forEach(key => {
          const original = getRawOwnedCount(key);
          counts[key] = String(original);
          deltas[key] = '0';
        });
      });

      setDraftCounts(counts);
      setDraftDeltas(deltas);
    }
  }, [isOpen, displayedInfo, materials]);

  if (!isOpen || !materialKey || !displayedInfo) return null;

  const handleInventoryChange = (key: string, valueStr: string) => {
    const original = getRawOwnedCount(key);
    setDraftCounts(prev => ({ ...prev, [key]: valueStr }));

    const parsedInv = parseInt(valueStr);
    const finalInv = isNaN(parsedInv) ? 0 : Math.max(0, parsedInv);
    const delta = finalInv - original;

    setDraftDeltas(prev => ({ ...prev, [key]: String(delta) }));
  };

  const handleDeltaChange = (key: string, valueStr: string) => {
    const original = getRawOwnedCount(key);
    setDraftDeltas(prev => ({ ...prev, [key]: valueStr }));

    const parsedDelta = parseInt(valueStr);
    const finalDelta = isNaN(parsedDelta) ? 0 : parsedDelta;
    let finalInv = original + finalDelta;

    if (finalInv < 0) {
      finalInv = 0;
      const clampedDelta = 0 - original;
      setDraftDeltas(prev => ({ ...prev, [key]: String(clampedDelta) }));
    }

    setDraftCounts(prev => ({ ...prev, [key]: String(finalInv) }));
  };

  const handleAddMoraLeyline = () => {
    const key = 'mora';
    const currentInvVal = parseInt(draftCounts[key]) || 0;
    const currentDeltaVal = parseInt(draftDeltas[key]) || 0;

    const newInv = currentInvVal + 60000;
    const newDelta = currentDeltaVal + 60000;

    setDraftCounts(prev => ({ ...prev, [key]: String(newInv) }));
    setDraftDeltas(prev => ({ ...prev, [key]: String(newDelta) }));
  };

  const handleSaveClick = () => {
    if (!materials) return;
    const updatedMaterials = { ...materials };

    displayedInfo.groups.forEach(g => {
      g.items.forEach(key => {
        const parsedInv = parseInt(draftCounts[key]);
        const finalValue = isNaN(parsedInv) ? 0 : Math.max(0, parsedInv);

        const lowerKey = key.toLowerCase();
        let matchedKey = key;
        for (const existingKey of Object.keys(materials)) {
          if (existingKey.toLowerCase() === lowerKey) {
            matchedKey = existingKey;
            break;
          }
        }

        updatedMaterials[matchedKey] = finalValue;
      });
    });

    onSave(updatedMaterials);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container quick-inventory-modal-container"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '850px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div className="modal-header quick-inventory-modal-header">
          <h2>{displayedInfo.title}</h2>
          <button className="modal-close-btn" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-content quick-inventory-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {(() => {
            const numGroups = displayedInfo.groups.length;
            let gridColsClass = 'grid-cols-1';
            if (numGroups === 2) {
              gridColsClass = 'grid-cols-2';
            } else if (numGroups === 3 || numGroups === 4) {
              gridColsClass = 'grid-cols-2';
            } else if (numGroups === 5 || numGroups === 6) {
              gridColsClass = 'grid-cols-3';
            } else if (numGroups >= 7) {
              gridColsClass = 'grid-cols-3';
            }

            return (
              <div className={`quick-inventory-sections-wrapper ${gridColsClass}`}>
                {displayedInfo.groups.map((g, groupIdx) => {
                  const isMora = g.items.includes('mora');
                  return (
                    <div key={groupIdx} className="quick-inventory-group-section">
                      {g.title && (
                        <h3 className="quick-inventory-group-title">
                          {g.title}
                        </h3>
                      )}

                      <div className="quick-inventory-compact-grid">
                        {/* Icons Row */}
                        <div className="quick-inventory-grid-row">
                          <div className="quick-inventory-row-label-cell spacer-label"></div>
                          {g.items.map(key => {
                            const originalEntry = materialMap[key];
                            const rarity = originalEntry?.rarity || 1;
                            const isMoraItem = key === 'mora';
                            return (
                              <div 
                                key={`header-${key}`} 
                                className={`quick-inventory-icon-cell ${isMoraItem ? 'mora-cell' : ''}`}
                                onMouseEnter={(e) => {
                                  if (originalEntry) {
                                    setHoveredItem({ key, data: originalEntry });
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setMousePos({ x: rect.right + 12, y: rect.top });
                                  }
                                }}
                                onMouseLeave={() => setHoveredItem(null)}
                              >
                                <div className={`bg-rarity-${rarity} quick-inventory-compact-icon-wrapper`}>
                                  <img
                                    src={originalEntry?.localExt ? `${import.meta.env.BASE_URL}icons/${originalEntry.id}${originalEntry.localExt}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(originalEntry?.name || key)}`}
                                    alt={originalEntry?.name || key}
                                    onError={(e) => {
                                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(originalEntry?.name || key)}&background=random&color=fff&rounded=true&font-size=0.33`;
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Inventory Row */}
                        <div className="quick-inventory-grid-row">
                          <div className="quick-inventory-row-label-cell">Inventory</div>
                          {g.items.map(key => (
                            <div key={`inv-${key}`} className={`quick-inventory-input-cell ${key === 'mora' ? 'mora-cell' : ''}`}>
                              <input
                                type="number"
                                className={`quick-inventory-compact-input ${key === 'mora' ? 'mora-input' : ''}`}
                                value={draftCounts[key] ?? ''}
                                onChange={(e) => handleInventoryChange(key, e.target.value)}
                                onFocus={(e) => e.target.select()}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Add/Subtract Row */}
                        <div className="quick-inventory-grid-row">
                          <div className="quick-inventory-row-label-cell">Add/Subtract</div>
                          {g.items.map(key => (
                            <div key={`delta-${key}`} className={`quick-inventory-input-cell ${key === 'mora' ? 'mora-cell' : ''}`}>
                              <input
                                type="number"
                                className={`quick-inventory-compact-input ${key === 'mora' ? 'mora-input' : ''}`}
                                value={draftDeltas[key] ?? ''}
                                onChange={(e) => handleDeltaChange(key, e.target.value)}
                                onFocus={(e) => e.target.select()}
                                placeholder="0"
                                style={{
                                  color: (parseInt(draftDeltas[key]) || 0) > 0 ? '#1b5e20' : (parseInt(draftDeltas[key]) || 0) < 0 ? '#b71c1c' : '#111111',
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {isMora && (
                        <div className="mora-leyline-action-wrapper" style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'center', width: '100%' }}>
                          <button
                            className="mora-leyline-btn"
                            onClick={handleAddMoraLeyline}
                            type="button"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: 'rgba(255, 204, 102, 0.1)',
                              border: '1px solid rgba(255, 204, 102, 0.3)',
                              color: '#ffcc66',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 204, 102, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 204, 102, 0.1)';
                            }}
                          >
                            <Plus size={16} />
                            Add mora leyline amount (+60k)
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Footer Actions */}
        <div 
          className="modal-footer quick-inventory-modal-footer" 
          style={{ 
            padding: '1rem 1.5rem', 
            borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '1rem',
            background: 'rgba(0, 0, 0, 0.15)'
          }}
        >
          <button 
            className="planner-btn" 
            onClick={onClose} 
            type="button"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#ccc',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '8px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button 
            className="planner-btn" 
            onClick={handleSaveClick}
            type="button"
            style={{
              background: '#ffcc66',
              color: '#332200',
              border: 'none',
              padding: '8px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(255, 204, 102, 0.2)'
            }}
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
