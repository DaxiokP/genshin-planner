import React, { useState, useEffect } from 'react';
import { X, GripVertical } from 'lucide-react';
import type { PlannedCharacter } from '../App';
import characterMapData from '../maps/characterMap.json';

const characterMapRaw: Record<string, any> = characterMapData as any;

const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
const charIndex: Record<string, string> = {};
Object.keys(characterMapRaw).forEach(k => { charIndex[normalize(k)] = k; });

const lookupChar = (key: string) => {
  const normalizedKey = normalize(key === 'Traveler' ? 'Aether' : key);
  return characterMapRaw[charIndex[normalizedKey]] ?? null;
};

interface PriorityManagerModalProps {
  isOpen: boolean;
  plannedCharacters: PlannedCharacter[];
  onClose: () => void;
  onSave: (ordered: PlannedCharacter[]) => void;
}

export const PriorityManagerModal: React.FC<PriorityManagerModalProps> = ({
  isOpen,
  plannedCharacters,
  onClose,
  onSave,
}) => {
  const [draft, setDraft] = useState<PlannedCharacter[]>([]);
  const [savedOrder, setSavedOrder] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Initialize draft and savedOrder when modal opens
  useEffect(() => {
    if (isOpen) {
      setDraft([...plannedCharacters]);
      setSavedOrder(plannedCharacters.map(p => p.key));
      setDraggedIndex(null);
    }
  }, [isOpen, plannedCharacters]);

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

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-container priority-modal-container" 
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '550px',
          width: '100%',
          maxHeight: '85vh',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
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

        <div className="modal-content" style={{ padding: '1.25rem', overflowY: 'auto' }}>
          {draft.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
              No planned characters to prioritize. Add characters first!
            </div>
          ) : (
            <div className="priority-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {draft.map((planned, index) => {
                const charData = lookupChar(planned.key) || {
                  name: planned.key,
                  rarity: 5,
                  element: 'None',
                  id: '',
                };
                const rarity = charData.rarity || 4;
                const elementClass = charData.element ? charData.element.toLowerCase() : 'none';
                const originalNumber = savedOrder.indexOf(planned.key) + 1;
                const isDraggingThis = draggedIndex === index;
                const isEnabled = planned.enabled !== false;

                return (
                  <div
                    key={planned.key}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`priority-row bg-element-${elementClass} ${isDraggingThis ? 'dragging' : ''} ${!isEnabled ? 'disabled' : ''}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 14px',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      {/* Drag Handle */}
                      <GripVertical size={16} style={{ color: 'rgba(255,255,255,0.3)', cursor: 'grab' }} />
                      
                      {/* Order Number Badge */}
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
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
                          width: '36px',
                          height: '36px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundPosition: 'center',
                          backgroundSize: 'cover',
                        }}
                      >
                        <img
                          src={`${import.meta.env.BASE_URL}characters/${charData.id}.png`}
                          alt={charData.name}
                          style={{ width: '110%', height: '110%', objectFit: 'contain', objectPosition: 'bottom' }}
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
                      <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#fff' }}>
                        {charData.name}
                      </span>
                    </div>

                    {/* Faded indicator */}
                    {!isEnabled && (
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                        Standby
                      </span>
                    )}
                  </div>
                );
              })}
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
    </div>
  );
};
