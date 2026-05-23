import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import materialMapData from '../maps/materialMap.json';

import { calculateRemainingExpBooks } from '../utils/upgradeHelpers';

const materialMap = materialMapData as Record<string, {
  id: string;
  name?: string;
  rarity: number;
  sources: string[];
  localExt?: string;
  sortGroup?: number;
  sortRank?: number;
}>;

interface UpgradeEstimateCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Record<string, number> | null;
  estimatedSpend: {
    mora: number;
    heroswit: number;
  };
  onConfirm: (
    correctedMora: number,
    correctedExp: {
      heroswit: number;
      adventurersexperience: number;
      wanderersadvice: number;
    }
  ) => void;
}

export const UpgradeEstimateCorrectionModal: React.FC<UpgradeEstimateCorrectionModalProps> = ({
  isOpen,
  onClose,
  materials,
  estimatedSpend,
  onConfirm,
}) => {
  const [moraInput, setMoraInput] = useState(0);
  const [herosWitInput, setHerosWitInput] = useState(0);
  const [adventurersExperienceInput, setAdventurersExperienceInput] = useState(0);
  const [wanderersAdviceInput, setWanderersAdviceInput] = useState(0);

  // Helper to retrieve owned count case-insensitively
  const getOwnedCount = (key: string): number => {
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
    if (isOpen && materials) {
      const currentMora = getOwnedCount('mora');
      const currentHerosWit = getOwnedCount('heroswit');
      const currentAdventurersExperience = getOwnedCount('adventurersexperience');
      const currentWanderersAdvice = getOwnedCount('wanderersadvice');

      setMoraInput(Math.max(0, currentMora - estimatedSpend.mora));

      const remainingBooks = calculateRemainingExpBooks(
        estimatedSpend.heroswit,
        currentHerosWit,
        currentAdventurersExperience,
        currentWanderersAdvice
      );

      setHerosWitInput(remainingBooks.heroswit);
      setAdventurersExperienceInput(remainingBooks.adventurersexperience);
      setWanderersAdviceInput(remainingBooks.wanderersadvice);
    }
  }, [isOpen, materials, estimatedSpend]);

  if (!isOpen) return null;

  const getMaterialIconSrc = (key: string) => {
    const data = materialMap[key];
    if (!data) return `${import.meta.env.BASE_URL}icons/202.png`;
    return `${import.meta.env.BASE_URL}icons/${data.id}${data.localExt || '.png'}`;
  };

  const getMaterialName = (key: string) => {
    return materialMap[key]?.name || key;
  };

  const getMaterialRarity = (key: string) => {
    return materialMap[key]?.rarity || 3;
  };

  const handleConfirm = () => {
    onConfirm(moraInput, {
      heroswit: herosWitInput,
      adventurersexperience: adventurersExperienceInput,
      wanderersadvice: wanderersAdviceInput,
    });
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div 
        className="modal-container"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '550px',
          width: '90%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 15px 50px rgba(0, 0, 0, 0.7)',
          background: '#1b1d28',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        {/* Title */}
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: '#ffcc66' }}>
            Verify Final Mora & EXP
          </h2>
          <button className="modal-close-btn" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.5 }}>
            We tried to estimate how much Mora and how many EXP items you should have left in your inventory after the upgrade, but there are many variables we can't account for. Enter correct amounts if necessary.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            
            {/* Mora Row */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                background: 'rgba(0,0,0,0.2)', 
                padding: '8px 12px', 
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.04)' 
              }}
            >
              <div 
                className={`bg-rarity-${getMaterialRarity('mora')}`}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px',
                  flexShrink: 0
                }}
              >
                <img src={getMaterialIconSrc('mora')} alt="Mora" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 'bold' }}>
                  {getMaterialName('mora')}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#ffcc66', fontWeight: 'bold' }}>
                  Spend Estimate: -{estimatedSpend.mora.toLocaleString()}
                </div>
              </div>
              <input
                type="number"
                min="0"
                style={{
                  background: '#11121a',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  width: '140px',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textAlign: 'right',
                  outline: 'none'
                }}
                value={moraInput === 0 ? '' : moraInput}
                placeholder="0"
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  setMoraInput(isNaN(v) ? 0 : Math.max(0, v));
                }}
              />
            </div>

            {/* Hero's Wit Row */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                background: 'rgba(0,0,0,0.2)', 
                padding: '8px 12px', 
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.04)' 
              }}
            >
              <div 
                className={`bg-rarity-${getMaterialRarity('heroswit')}`}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px',
                  flexShrink: 0
                }}
              >
                <img src={getMaterialIconSrc('heroswit')} alt="Hero's Wit" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 'bold' }}>
                  {getMaterialName('heroswit')}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#ffb84d', fontWeight: 'bold' }}>
                  Spend Estimate: -{estimatedSpend.heroswit}
                </div>
              </div>
              <input
                type="number"
                min="0"
                style={{
                  background: '#11121a',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  width: '140px',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textAlign: 'right',
                  outline: 'none'
                }}
                value={herosWitInput === 0 ? '' : herosWitInput}
                placeholder="0"
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  setHerosWitInput(isNaN(v) ? 0 : Math.max(0, v));
                }}
              />
            </div>

            {/* Adventurer's Experience Row */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                background: 'rgba(0,0,0,0.2)', 
                padding: '8px 12px', 
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.04)' 
              }}
            >
              <div 
                className={`bg-rarity-${getMaterialRarity('adventurersexperience')}`}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px',
                  flexShrink: 0
                }}
              >
                <img src={getMaterialIconSrc('adventurersexperience')} alt="Adventurer's Experience" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 'bold' }}>
                  {getMaterialName('adventurersexperience')}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#90caf9' }}>
                  Remaining
                </div>
              </div>
              <input
                type="number"
                min="0"
                style={{
                  background: '#11121a',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  width: '140px',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textAlign: 'right',
                  outline: 'none'
                }}
                value={adventurersExperienceInput === 0 ? '' : adventurersExperienceInput}
                placeholder="0"
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  setAdventurersExperienceInput(isNaN(v) ? 0 : Math.max(0, v));
                }}
              />
            </div>

            {/* Wanderer's Advice Row */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                background: 'rgba(0,0,0,0.2)', 
                padding: '8px 12px', 
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.04)' 
              }}
            >
              <div 
                className={`bg-rarity-${getMaterialRarity('wanderersadvice')}`}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px',
                  flexShrink: 0
                }}
              >
                <img src={getMaterialIconSrc('wanderersadvice')} alt="Wanderer's Advice" style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 'bold' }}>
                  {getMaterialName('wanderersadvice')}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#a5d6a7' }}>
                  Remaining
                </div>
              </div>
              <input
                type="number"
                min="0"
                style={{
                  background: '#11121a',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  width: '140px',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textAlign: 'right',
                  outline: 'none'
                }}
                value={wanderersAdviceInput === 0 ? '' : wanderersAdviceInput}
                placeholder="0"
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  setWanderersAdviceInput(isNaN(v) ? 0 : Math.max(0, v));
                }}
              />
            </div>

          </div>
        </div>

        {/* Footer */}
        <div 
          className="target-modal-actions" 
          style={{ 
            padding: '1rem 1.5rem', 
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '1rem',
            background: 'rgba(255, 255, 255, 0.01)'
          }}
        >
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
              cursor: 'pointer'
            }}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          
          <button 
            className="action-btn"
            style={{
              borderRadius: '8px',
              padding: '0 1.5rem',
              height: '38px',
              width: 'auto',
              background: '#4caf50',
              border: '1px solid #4caf50',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer'
            }}
            onClick={handleConfirm}
            type="button"
          >
            <Check size={16} style={{ marginRight: '6px' }} />
            Confirm Upgrade
          </button>
        </div>

      </div>
    </div>
  );
};
