import React, { useState, useEffect } from 'react';
import { Check, X, Plus, Minus } from 'lucide-react';
import type { GoodWeapon } from '../App';
import weaponMapData from '../maps/weaponMap.json';

const weaponMapRaw: Record<string, any> = weaponMapData;
const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
const weaponIndexLookup: Record<string, string> = {};
Object.keys(weaponMapRaw).forEach(k => { weaponIndexLookup[normalize(k)] = k; });
const lookupWeapon = (key: string) => weaponMapRaw[weaponIndexLookup[normalize(key)]] ?? null;

interface WeaponTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel?: () => void;
  weaponIndex: number | null;
  weaponKey: string | null;
  currentData: GoodWeapon | undefined;
  plannedData?: any; // If editing an existing plan
  onAccept: (planned: {
    type: 'weapon';
    weaponIndex: number;
    key: string;
    current: { level: number; ascension: number };
    desired: { level: number; ascension: number };
  }) => void;
}

const LevelSelector = ({ level, ascension, minLevel, minAscension, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const getRank = (l: number, a: number) => l * 10 + a;

  const states = React.useMemo(() => {
    const s = [];
    for (let i = 1; i <= 90; i++) {
      let reqAsc = 0;
      if (i > 80) reqAsc = 6;
      else if (i > 70) reqAsc = 5;
      else if (i > 60) reqAsc = 4;
      else if (i > 50) reqAsc = 3;
      else if (i > 40) reqAsc = 2;
      else if (i > 20) reqAsc = 1;
      
      s.push({ level: i, ascension: reqAsc, display: i.toString() });
      if ([20, 40, 50, 60, 70, 80].includes(i)) {
        s.push({ level: i, ascension: reqAsc + 1, display: i.toString() + '✦' });
      }
    }
    return s;
  }, []);

  const currentIndex = states.findIndex(s => s.level === level && s.ascension === ascension);
  const minRank = getRank(minLevel, minAscension);
  const actualMinIndex = states.findIndex(s => getRank(s.level, s.ascension) >= minRank);

  const handleDec = () => {
    if (currentIndex > actualMinIndex) {
      onChange(states[currentIndex - 1].level, states[currentIndex - 1].ascension);
    }
  };
  
  const handleInc = () => {
    if (currentIndex < states.length - 1) {
      onChange(states[currentIndex + 1].level, states[currentIndex + 1].ascension);
    }
  };

  const handleSelect = (l: number, a: number) => {
    if (getRank(l, a) >= minRank) {
      onChange(l, a);
    }
    setIsOpen(false);
  };
  
  return (
    <div className="level-selector-wrapper">
      <button className="spinner-btn" onClick={handleDec} disabled={currentIndex <= actualMinIndex} type="button">
        <Minus size={16} />
      </button>
      <div className="level-value-display" onClick={() => setIsOpen(!isOpen)}>
        {states[currentIndex]?.display || level}
      </div>
      <button className="spinner-btn" onClick={handleInc} disabled={currentIndex >= states.length - 1} type="button">
        <Plus size={16} />
      </button>
      
      {isOpen && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} onClick={() => setIsOpen(false)} />
          <div className="level-selector-dropdown">
             <div className="level-dropdown-row">
               <button className="level-dropdown-btn" disabled={getRank(1, 0) < minRank} onClick={() => handleSelect(1, 0)} style={{ opacity: getRank(1, 0) < minRank ? 0.3 : 1 }} type="button">1</button>
             </div>
             {[20, 40, 50, 60, 70, 80].map(m => {
               const reqAsc = m === 80 ? 5 : m === 70 ? 4 : m === 60 ? 3 : m === 50 ? 2 : m === 40 ? 1 : 0;
               return (
                 <div className="level-dropdown-row" key={m}>
                   <button className="level-dropdown-btn" disabled={getRank(m, reqAsc) < minRank} onClick={() => handleSelect(m, reqAsc)} style={{ opacity: getRank(m, reqAsc) < minRank ? 0.3 : 1 }} type="button">{m}</button>
                   <button className="level-dropdown-btn" disabled={getRank(m, reqAsc + 1) < minRank} onClick={() => handleSelect(m, reqAsc + 1)} style={{ opacity: getRank(m, reqAsc + 1) < minRank ? 0.3 : 1 }} type="button">{m}✦</button>
                 </div>
               )
             })}
             <div className="level-dropdown-row">
               <button className="level-dropdown-btn" disabled={getRank(90, 6) < minRank} onClick={() => handleSelect(90, 6)} style={{ opacity: getRank(90, 6) < minRank ? 0.3 : 1 }} type="button">90</button>
             </div>
          </div>
        </>
      )}
    </div>
  );
};

export const WeaponTargetModal: React.FC<WeaponTargetModalProps> = ({
  isOpen,
  onClose,
  onCancel,
  weaponIndex,
  weaponKey,
  currentData,
  plannedData,
  onAccept,
}) => {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentAscension, setCurrentAscension] = useState(0);
  const [desiredLevel, setDesiredLevel] = useState(90);
  const [desiredAscension, setDesiredAscension] = useState(6);

  useEffect(() => {
    if (isOpen) {
      if (plannedData) {
        // Edit flow
        setCurrentLevel(plannedData.current.level);
        setCurrentAscension(plannedData.current.ascension);
        setDesiredLevel(plannedData.desired.level);
        setDesiredAscension(plannedData.desired.ascension);
      } else if (currentData) {
        // Add flow
        setCurrentLevel(currentData.level);
        setCurrentAscension(currentData.ascension);
        setDesiredLevel(Math.max(90, currentData.level));
        setDesiredAscension(Math.max(6, currentData.ascension));
      }
    }
  }, [isOpen, currentData, plannedData]);

  if (!isOpen || !weaponKey || weaponIndex === null) return null;

  const info = lookupWeapon(weaponKey);
  if (!info) return null;

  const minCurrentLevel = currentData?.level || 1;
  const minCurrentAscension = currentData?.ascension || 0;
  const rarity = info.rarity || 4;

  const handleAccept = () => {
    onAccept({
      type: 'weapon',
      weaponIndex,
      key: weaponKey,
      current: {
        level: currentLevel,
        ascension: currentAscension,
      },
      desired: {
        level: desiredLevel,
        ascension: desiredAscension,
      }
    });
  };

  const getRank = (l: number, a: number) => l * 10 + a;

  const handleCurrentLevelChange = (l: number, a: number) => {
    setCurrentLevel(l);
    setCurrentAscension(a);
    if (getRank(l, a) > getRank(desiredLevel, desiredAscension)) {
      setDesiredLevel(l);
      setDesiredAscension(a);
    }
  };

  const handleDesiredLevelChange = (l: number, a: number) => {
    setDesiredLevel(l);
    setDesiredAscension(a);
  };

  const imageSrc = `${import.meta.env.BASE_URL}weapons/${info.id}.png`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-container target-modal-container bg-rarity-${rarity}-solid`}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '600px', display: 'flex', flexDirection: 'row' }}
      >
        {/* Symmetrical Left Panel showcasing the weapon portrait */}
        <div style={{
          width: '200px',
          background: 'rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
          borderRight: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div className={`bg-rarity-${rarity}`} style={{
            width: '130px',
            height: '130px',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
            border: '2px solid rgba(255,255,255,0.08)'
          }}>
            <img
              src={imageSrc}
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
          </div>

          <div style={{
            marginTop: '1.25rem',
            textAlign: 'center',
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.4)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 'bold'
          }}>
            {info.type}
          </div>
          
          <div className="char-stars" style={{ marginTop: '0.3rem', justifyContent: 'center' }}>
            {Array.from({ length: rarity }).map((_, i) => (
              <span key={i} className="star">★</span>
            ))}
          </div>
        </div>

        {/* Right Panel containing targets input */}
        <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="target-modal-header" style={{
              fontSize: '1.35rem',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '1.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              paddingBottom: '0.5rem',
              fontFamily: "'Outfit', sans-serif"
            }}>
              {info.name}
            </div>

            <div className="modal-content" style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="target-row">
                <div className="target-row-title" style={{ fontSize: '0.95rem', color: '#ffcc66', fontWeight: 'bold' }}>Level & Ascension Target</div>
                <div className="target-inputs-group" style={{ gap: '1.5rem', marginTop: '0.5rem' }}>
                  <div className="target-input-col">
                    <span className="target-input-label">Current</span>
                    <LevelSelector 
                      level={currentLevel} 
                      ascension={currentAscension}
                      minLevel={minCurrentLevel}
                      minAscension={minCurrentAscension}
                      onChange={handleCurrentLevelChange}
                    />
                  </div>
                  <div className="target-input-col">
                    <span className="target-input-label">Desired</span>
                    <LevelSelector 
                      level={desiredLevel} 
                      ascension={desiredAscension}
                      minLevel={currentLevel}
                      minAscension={currentAscension}
                      onChange={handleDesiredLevelChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="target-modal-actions" style={{ marginTop: '2rem', padding: 0 }}>
            <button className="action-btn btn-cancel" onClick={onCancel || onClose} type="button">
              <X size={24} />
            </button>
            <button className="action-btn btn-accept" onClick={handleAccept} type="button">
              <Check size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
