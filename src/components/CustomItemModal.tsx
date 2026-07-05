import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { SelectMaterialModal } from './SelectMaterialModal';
import materialMapData from '../maps/materialMap.json';

const materialMap = materialMapData as Record<string, any>;

interface CustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'character' | 'weapon';
  existingData?: any; // For editing
  onAccept: (customData: any) => void;
}

export const CustomItemModal: React.FC<CustomItemModalProps> = ({
  isOpen,
  onClose,
  type,
  existingData,
  onAccept,
}) => {
  const [name, setName] = useState('');
  const [rarity, setRarity] = useState<number>(type === 'character' ? 5 : 4);
  const [weaponType, setWeaponType] = useState<'Sword' | 'Claymore' | 'Polearm' | 'Bow' | 'Catalyst'>('Sword');
  
  // Custom slots
  const [mats, setMats] = useState<Record<string, string>>({});

  // Sub-modal state for selecting material
  const [isSelectMatOpen, setIsSelectMatOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (existingData) {
        setName(existingData.customName || existingData.name || '');
        setRarity(existingData.customRarity || existingData.rarity || (type === 'character' ? 5 : 4));
        setWeaponType(existingData.customWeaponType || 'Sword');
        setMats(existingData.customMaterials || {});
      } else {
        setName('');
        setRarity(type === 'character' ? 5 : 5);
        setWeaponType('Sword');
        setMats({});
      }
    }
  }, [isOpen, existingData, type]);

  if (!isOpen) return null;

  const isCharacter = type === 'character';

  const charSlots = [
    { label: 'Common', key: 'common', category: 'common' as const },
    { label: 'Local Specialty', key: 'localSpecialty', category: 'localSpecialty' as const },
    { label: 'Boss Material', key: 'bossMaterial', category: 'bossMaterial' as const },
    { label: 'Elemental Gem', key: 'elementalGem', category: 'elementalGem' as const },
    { label: 'Talent Book', key: 'talentBook', category: 'talentBook' as const },
    { label: 'Weekly Material', key: 'weeklyMaterial', category: 'weeklyMaterial' as const },
  ];

  const weaponSlots = [
    { label: 'Common', key: 'common', category: 'common' as const },
    { label: 'Uncommon', key: 'uncommon', category: 'uncommon' as const },
    { label: 'Domain Material', key: 'domainMaterial', category: 'domainMaterial' as const },
  ];

  const activeSlots = isCharacter ? charSlots : weaponSlots;

  const isFormValid = () => {
    if (!name.trim()) return false;
    for (const slot of activeSlots) {
      if (!mats[slot.key]) return false;
    }
    return true;
  };

  const handleOpenSelect = (slotKey: string) => {
    setActiveSlot(slotKey);
    setIsSelectMatOpen(true);
  };

  const handleSelectMaterial = (matKey: string) => {
    if (activeSlot) {
      setMats(prev => ({ ...prev, [activeSlot]: matKey }));
    }
    setIsSelectMatOpen(false);
    setActiveSlot(null);
  };

  const handleCreate = () => {
    if (!isFormValid()) return;

    const resultKey = existingData?.key || `custom_${type}_${Date.now()}`;
    const result: any = {
      key: resultKey,
      name: name.trim(),
      customName: name.trim(),
      customRarity: rarity,
      customMaterials: mats,
      custom: true,
      type,
      enabled: existingData ? existingData.enabled !== false : true,
    };

    if (!isCharacter) {
      result.customWeaponType = weaponType;
    }

    onAccept(result);
  };

  // Helper to render slot content
  const renderSlotIcon = (slotKey: string) => {
    const value = mats[slotKey];
    if (!value) {
      return (
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.2)' }}>
          <span style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>+</span>
        </div>
      );
    }

    if (value.startsWith('?')) {
      return (
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#0a0b0d', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: '1.3rem', color: '#ece5d8', fontWeight: 'bold' }}>?</span>
        </div>
      );
    }

    const matInfo = materialMap[value];
    if (!matInfo) return null;

    return (
      <div className={`bg-rarity-${matInfo.rarity || 1}`} style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0,0,0,0.2)' }}>
        <img
          src={matInfo.localExt ? `${import.meta.env.BASE_URL}icons/${matInfo.id}${matInfo.localExt}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(matInfo.name)}`}
          alt={matInfo.name}
          style={{ width: '80%', height: '80%', objectFit: 'contain', transform: 'scale(1.2)' }}
        />
      </div>
    );
  };

  const getSlotMaterialName = (slotKey: string) => {
    const value = mats[slotKey];
    if (!value) return 'Not Selected';
    if (value.startsWith('?')) return 'New Material (?)';
    return materialMap[value]?.name || value;
  };

  const activeCategory = activeSlots.find(s => s.key === activeSlot)?.category || 'common';

  return (
    <>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
        <div 
          className="modal-container" 
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: '580px', width: '90%', background: '#1c1d24', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h2>{existingData ? 'Edit' : 'Add'} Custom {isCharacter ? 'Character' : 'Weapon'}</h2>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="modal-content" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Name Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <input
                type="text"
                placeholder={isCharacter ? 'Enter character name...' : 'Enter weapon name...'}
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  width: '100%',
                  background: '#eae3d2',
                  border: '2px solid #5a4f43',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#4a3c31',
                  fontSize: '1rem',
                  fontWeight: '600',
                  outline: 'none',
                  textAlign: 'center'
                }}
              />
            </div>

            {/* Weapon Type Selector (only for Weapon) */}
            {!isCharacter && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                <span style={{ color: '#ffcc66', fontSize: '0.85rem', fontWeight: 'bold', fontFamily: "'Outfit', sans-serif" }}>Type</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  {(['Sword', 'Claymore', 'Polearm', 'Bow', 'Catalyst'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setWeaponType(t)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: weaponType === t ? '#4299e1' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${weaponType === t ? '#4299e1' : 'rgba(255,255,255,0.08)'}`,
                        color: '#fff',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <img 
                        src={`${import.meta.env.BASE_URL}icons/${t.toLowerCase()}.png`} 
                        alt={t} 
                        style={{ width: '16px', height: '16px', objectFit: 'contain' }} 
                      />
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rarity Stars Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
              <span style={{ color: '#ffcc66', fontSize: '0.85rem', fontWeight: 'bold', fontFamily: "'Outfit', sans-serif" }}>Stars</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(isCharacter ? [4, 5] : [3, 4, 5]).map(stars => (
                  <button
                    key={stars}
                    onClick={() => setRarity(stars)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: rarity === stars ? '#ffcc66' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${rarity === stars ? '#ffcc66' : 'rgba(255,255,255,0.08)'}`,
                      color: rarity === stars ? '#1a1b24' : '#fff',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {Array.from({ length: stars }).map((_, i) => (
                      <span key={i} style={{ fontSize: '0.9rem' }}>★</span>
                    ))}
                  </button>
                ))}
              </div>
            </div>

            {/* Material Slots */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {activeSlots.map(slot => (
                  <div
                    key={slot.key}
                    onClick={() => handleOpenSelect(slot.key)}
                    style={{
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '8px',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                      minWidth: 0
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
                  >
                    {renderSlotIcon(slot.key)}
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                      <span style={{ fontSize: '0.75rem', color: '#ffcc66', fontWeight: 'bold' }}>{slot.label}</span>
                      <span style={{ fontSize: '0.8rem', color: mats[slot.key] ? '#fff' : 'rgba(255,255,255,0.4)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {getSlotMaterialName(slot.key)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            padding: '1rem 1.5rem',
            background: 'rgba(0,0,0,0.15)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '0 0 8px 8px'
          }}>
            <button
              className="action-btn"
              style={{
                borderRadius: '8px',
                padding: '0 1.25rem',
                height: '38px',
                width: 'auto',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'var(--text-secondary)',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
              onClick={onClose}
            >
              <X size={16} />
              Cancel
            </button>

            <button
              className="action-btn"
              style={{
                borderRadius: '8px',
                padding: '0 1.5rem',
                height: '38px',
                width: 'auto',
                background: isFormValid() ? '#4caf50' : 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${isFormValid() ? '#4caf50' : 'rgba(255, 255, 255, 0.04)'}`,
                color: isFormValid() ? 'white' : 'rgba(255, 255, 255, 0.15)',
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isFormValid() ? 'pointer' : 'not-allowed'
              }}
              disabled={!isFormValid()}
              onClick={handleCreate}
            >
              <Check size={16} />
              {existingData ? 'Save Changes' : 'Create Custom'}
            </button>
          </div>
        </div>
      </div>

      <SelectMaterialModal
        isOpen={isSelectMatOpen}
        onClose={() => { setIsSelectMatOpen(false); setActiveSlot(null); }}
        category={activeCategory}
        onSelect={handleSelectMaterial}
      />
    </>
  );
};
