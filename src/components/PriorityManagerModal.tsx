import React, { useState, useEffect } from 'react';
import { X, GripVertical } from 'lucide-react';
import characterMapData from '../maps/characterMap.json';
import weaponMapData from '../maps/weaponMap.json';

const characterMapRaw: Record<string, any> = characterMapData as any;
const weaponMapRaw: Record<string, any> = weaponMapData as any;

const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

const charIndex: Record<string, string> = {};
Object.keys(characterMapRaw).forEach(k => { charIndex[normalize(k)] = k; });

const lookupChar = (key: string) => {
  const normalizedKey = normalize(key === 'Traveler' ? 'Aether' : key);
  return characterMapRaw[charIndex[normalizedKey]] ?? null;
};

const weaponIndex: Record<string, string> = {};
Object.keys(weaponMapRaw).forEach(k => { weaponIndex[normalize(k)] = k; });

const lookupWeapon = (key: string) => {
  return weaponMapRaw[weaponIndex[normalize(key)]] ?? null;
};

interface PriorityManagerModalProps {
  isOpen: boolean;
  plannedItems: any[];
  onClose: () => void;
  onSave: (ordered: any[]) => void;
}

export const PriorityManagerModal: React.FC<PriorityManagerModalProps> = ({
  isOpen,
  plannedItems,
  onClose,
  onSave,
}) => {
  const [draft, setDraft] = useState<any[]>([]);
  const [savedOrder, setSavedOrder] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Initialize draft and savedOrder when modal opens
  useEffect(() => {
    if (isOpen) {
      setDraft([...plannedItems]);
      setSavedOrder(plannedItems.map(p => p.id || (p.type === 'weapon' ? `weapon:${p.weaponIndex}` : `character:${p.key}`)));
      setDraggedIndex(null);
    }
  }, [isOpen, plannedItems]);

  if (!isOpen) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newDraft = [...draft];
    const itemToMove = newDraft[draggedIndex];
    newDraft.splice(draggedIndex, 1);
    newDraft.splice(index, 0, itemToMove);

    setDraggedIndex(index);
    setDraft(newDraft);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

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

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      {(() => {
        const itemCount = draft.length;
        const useColumns = itemCount > 0 && itemCount <= 60;
        const rowsPerCol = itemCount < 30 ? 10 : 15;
        const numCols = useColumns ? Math.ceil(itemCount / rowsPerCol) : 1;
        const modalWidth = useColumns ? `${Math.min(1200, 280 * numCols + 60)}px` : '550px';

        // Chunk draft into columns if using columns
        const columns: any[][] = [];
        if (useColumns) {
          for (let i = 0; i < numCols; i++) {
            columns.push(draft.slice(i * rowsPerCol, (i + 1) * rowsPerCol));
          }
        }

        const renderRow = (planned: any, index: number) => {
          const isWeapon = planned.type === 'weapon';
          const id = planned.id || (isWeapon ? `weapon:${planned.weaponIndex}` : `character:${planned.key}`);
          const isEnabled = planned.enabled !== false;
          const isDraggingThis = draggedIndex === index;
          const originalNumber = savedOrder.indexOf(id) + 1;

          if (isWeapon) {
            const wData = lookupWeapon(planned.key) || {
              name: planned.key,
              rarity: 4,
              id: '',
              type: '',
            };
            const rarity = wData.rarity || 4;
            
            // Setup custom premium background gradients & borders based on weapon rarity
            let bgStyle = 'rgba(255, 255, 255, 0.02)';
            let borderStyle = 'rgba(255,255,255,0.06)';
            if (rarity === 5) {
              bgStyle = 'linear-gradient(to right, rgba(255, 183, 77, 0.08), rgba(255, 183, 77, 0.02))';
              borderStyle = 'rgba(255, 183, 77, 0.15)';
            } else if (rarity === 4) {
              bgStyle = 'linear-gradient(to right, rgba(179, 136, 255, 0.08), rgba(179, 136, 255, 0.02))';
              borderStyle = 'rgba(179, 136, 255, 0.15)';
            } else if (rarity === 3) {
              bgStyle = 'linear-gradient(to right, rgba(79, 195, 247, 0.08), rgba(79, 195, 247, 0.02))';
              borderStyle = 'rgba(79, 195, 247, 0.15)';
            }

            return (
              <div
                key={id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`priority-row ${isDraggingThis ? 'dragging' : ''} ${!isEnabled ? 'disabled' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: `1px solid ${borderStyle}`,
                  background: bgStyle,
                  cursor: 'grab',
                  transition: 'transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease',
                  opacity: isDraggingThis ? 0.3 : (isEnabled ? 1 : 0.45),
                  transform: isDraggingThis ? 'scale(0.98)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <GripVertical size={14} style={{ color: 'rgba(255,255,255,0.3)', cursor: 'grab' }} />
                  
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      color: '#ffcc66',
                    }}
                  >
                    {originalNumber}
                  </div>

                  {/* Weapon Avatar */}
                  <div
                    className={`bg-rarity-${rarity}`}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={`${import.meta.env.BASE_URL}weapons/${wData.id}.png`}
                      alt={wData.name}
                      style={{ width: '110%', height: '110%', objectFit: 'contain' }}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.fallback) {
                          target.dataset.fallback = 'enka';
                          target.src = `https://enka.network/ui/UI_EquipIcon_${wData.id}.png`;
                        } else if (!target.dataset.fallbackUi) {
                          target.dataset.fallbackUi = 'ui';
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(wData.name)}&background=random&color=fff&rounded=true&font-size=0.4`;
                        }
                      }}
                    />
                  </div>

                  {/* Weapon Name Row (With type icon badge) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img 
                      src={getWeaponTypeIconPath(wData.type)} 
                      alt={wData.type} 
                      style={{ width: '14px', height: '14px', opacity: 0.6 }} 
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }} title={wData.name}>
                      {wData.name}
                    </span>
                  </div>
                </div>

                {/* Standby / Disabled State */}
                {!isEnabled && (
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: '4px' }}>
                    Standby
                  </span>
                )}
              </div>
            );
          } else {
            // Character Row
            const charData = lookupChar(planned.key) || {
              name: planned.key,
              rarity: 5,
              element: 'None',
              id: '',
            };
            const rarity = charData.rarity || 4;
            const elementClass = charData.element ? charData.element.toLowerCase() : 'none';

            return (
              <div
                key={id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`priority-row bg-element-${elementClass} ${isDraggingThis ? 'dragging' : ''} ${!isEnabled ? 'disabled' : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  cursor: 'grab',
                  transition: 'transform 0.15s ease, background-color 0.15s ease, border-color 0.15s ease',
                  opacity: isDraggingThis ? 0.3 : (isEnabled ? 1 : 0.45),
                  transform: isDraggingThis ? 'scale(0.98)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isDraggingThis) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDraggingThis) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <GripVertical size={14} style={{ color: 'rgba(255,255,255,0.3)', cursor: 'grab' }} />
                  
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      color: '#ffcc66',
                    }}
                  >
                    {originalNumber}
                  </div>

                  {/* Character Avatar */}
                  <div
                    className={`bg-rarity-${rarity}`}
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <img
                      src={`${import.meta.env.BASE_URL}characters/${charData.id}.png`}
                      alt={charData.name}
                      style={{ width: '115%', height: '115%', objectFit: 'contain', objectPosition: 'bottom' }}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.dataset.fallback) {
                          target.dataset.fallback = 'enka';
                          target.src = `https://enka.network/ui/UI_AvatarIcon_${charData.id}.png`;
                        } else if (!target.dataset.fallbackUi) {
                          target.dataset.fallbackUi = 'ui';
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(charData.name)}&background=random&color=fff&rounded=true&font-size=0.4`;
                        }
                      }}
                    />
                  </div>

                  {/* Character Name */}
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }} title={charData.name}>
                    {charData.name}
                  </span>
                </div>

                {!isEnabled && (
                  <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: '4px' }}>
                    Standby
                  </span>
                )}
              </div>
            );
          }
        };

        return (
          <div 
            className="modal-container priority-modal-container" 
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: modalWidth,
              width: '100%',
              maxHeight: '85vh',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              transition: 'max-width 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff', margin: 0 }}>Priority</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Drag to change order</span>
              </div>
              <button className="modal-close-btn" onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-content" style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
              {draft.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  No planned items to prioritize. Add characters or weapons first!
                </div>
              ) : useColumns ? (
                <div 
                  className="priority-columns-container" 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    gap: '16px', 
                    overflowX: 'auto', 
                    paddingBottom: '8px'
                  }}
                >
                  {columns.map((column, colIdx) => (
                    <div 
                      key={colIdx} 
                      className="priority-column" 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '6px', 
                        flex: 1,
                        minWidth: '220px'
                      }}
                    >
                      {column.map((planned, rowIdx) => {
                        const globalIndex = colIdx * rowsPerCol + rowIdx;
                        return renderRow(planned, globalIndex);
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="priority-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {draft.map((planned, index) => renderRow(planned, index))}
                </div>
              )}
            </div>

            <div 
              className="modal-footer" 
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                background: 'rgba(0,0,0,0.2)'
              }}
            >
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={draft.length === 0}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ffcc66 0%, #d4a345 100%)',
                  color: '#1a1d24',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: draft.length === 0 ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (draft.length > 0) {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.filter = 'brightness(1.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (draft.length > 0) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.filter = 'none';
                  }
                }}
              >
                Save Order
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
