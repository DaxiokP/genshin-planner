import React, { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import type { GoodCharacter, PlannedCharacter } from '../App';
import characterMapData from '../maps/characterMap.json';

const characterMap: Record<string, any> = characterMapData;

interface CharacterTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterKey: string | null;
  currentData: GoodCharacter | undefined;
  onAccept: (planned: PlannedCharacter) => void;
}

const NumberSpinner = ({ value, min, max, onChange }: { value: number, min: number, max: number, onChange: (val: number) => void }) => {
  return (
    <div className="number-spinner">
      <button 
        className="spinner-btn" 
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
      >-</button>
      <input 
        type="number" 
        className="spinner-input" 
        value={value} 
        onChange={(e) => {
          let val = parseInt(e.target.value);
          if (isNaN(val)) val = min;
          if (val > max) val = max;
          if (val < min) val = min;
          onChange(val);
        }} 
      />
      <button 
        className="spinner-btn" 
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
      >+</button>
    </div>
  );
};

export const CharacterTargetModal: React.FC<CharacterTargetModalProps> = ({
  isOpen,
  onClose,
  characterKey,
  currentData,
  onAccept,
}) => {
  // State for targets
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentAscension, setCurrentAscension] = useState(0);
  const [currentTalents, setCurrentTalents] = useState({ auto: 1, skill: 1, burst: 1 });
  
  const [desiredLevel, setDesiredLevel] = useState(90);
  const [desiredAscension, setDesiredAscension] = useState(6);
  const [desiredTalents, setDesiredTalents] = useState({ auto: 9, skill: 9, burst: 9 });

  useEffect(() => {
    if (currentData) {
      setCurrentLevel(currentData.level || 1);
      setCurrentAscension(currentData.ascension || 0);
      setCurrentTalents({
        auto: currentData.talent?.auto || 1,
        skill: currentData.talent?.skill || 1,
        burst: currentData.talent?.burst || 1,
      });

      // Default desired to be higher or equal to current
      setDesiredLevel(Math.max(90, currentData.level || 1));
      setDesiredAscension(Math.max(6, currentData.ascension || 0));
      setDesiredTalents({
        auto: Math.max(9, currentData.talent?.auto || 1),
        skill: Math.max(9, currentData.talent?.skill || 1),
        burst: Math.max(9, currentData.talent?.burst || 1),
      });
    }
  }, [currentData, characterKey]);

  if (!isOpen || !characterKey) return null;

  const charInfo = characterMap[characterKey];
  if (!charInfo) return null;

  const handleAccept = () => {
    onAccept({
      key: characterKey,
      current: {
        level: currentLevel,
        ascension: currentAscension,
        talent: currentTalents,
      },
      desired: {
        level: desiredLevel,
        ascension: desiredAscension,
        talent: desiredTalents,
      }
    });
  };

  // Helper to determine ascension based on level
  const getMinAscensionForLevel = (level: number) => {
    if (level <= 20) return 0;
    if (level <= 40) return 1;
    if (level <= 50) return 2;
    if (level <= 60) return 3;
    if (level <= 70) return 4;
    if (level <= 80) return 5;
    return 6;
  };

  const handleDesiredLevelChange = (val: number) => {
    setDesiredLevel(val);
    setDesiredAscension(Math.max(desiredAscension, getMinAscensionForLevel(val)));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-container target-modal-container bg-rarity-${charInfo.rarity || 4}-solid`} onClick={e => e.stopPropagation()}>
        
        <div className="target-modal-right">
          <img
            src={`${import.meta.env.BASE_URL}characters/${charInfo.id}.png`}
            alt={charInfo.name}
            className="target-modal-portrait"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.fallback) {
                target.dataset.fallback = 'enka';
                target.src = `https://enka.network/ui/UI_Gacha_AvatarImg_${charInfo.id}.png`;
              }
            }}
          />
        </div>

        <div className="target-modal-left">
          <div className="target-modal-header">
            {charInfo.name}
          </div>
          <div className="modal-content" style={{ padding: 0 }}>
          
          <div className="target-row">
            <div className="target-row-title">Lv.</div>
            <div className="target-inputs-group">
              <div className="target-input-col">
                <span className="target-input-label">Current</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <NumberSpinner value={currentLevel} min={1} max={90} onChange={(val) => {
                    setCurrentLevel(val);
                    setCurrentAscension(Math.max(currentAscension, getMinAscensionForLevel(val)));
                  }} />
                  {/* Ascension Toggle if at a cap */}
                  {[20, 40, 50, 60, 70, 80].includes(currentLevel) && (
                    <button 
                      onClick={() => setCurrentAscension(currentAscension > getMinAscensionForLevel(currentLevel - 1) ? getMinAscensionForLevel(currentLevel - 1) : getMinAscensionForLevel(currentLevel))}
                      style={{ background: 'none', color: currentAscension > getMinAscensionForLevel(currentLevel - 1) ? '#ffcc66' : '#666', fontSize: '1.2rem', padding: '0 4px' }}
                    >
                      ✦
                    </button>
                  )}
                </div>
              </div>
              <div className="target-input-col">
                <span className="target-input-label">Desired</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <NumberSpinner value={desiredLevel} min={currentLevel} max={90} onChange={handleDesiredLevelChange} />
                  {[20, 40, 50, 60, 70, 80].includes(desiredLevel) && (
                    <button 
                      onClick={() => setDesiredAscension(desiredAscension > getMinAscensionForLevel(desiredLevel - 1) ? getMinAscensionForLevel(desiredLevel - 1) : getMinAscensionForLevel(desiredLevel))}
                      style={{ background: 'none', color: desiredAscension > getMinAscensionForLevel(desiredLevel - 1) ? '#ffcc66' : '#666', fontSize: '1.2rem', padding: '0 4px' }}
                    >
                      ✦
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="target-row">
            <div className="target-row-title">Normal Attack</div>
            <div className="target-inputs-group">
              <div className="target-input-col">
                <span className="target-input-label">Current</span>
                <NumberSpinner value={currentTalents.auto} min={1} max={10} onChange={v => setCurrentTalents({...currentTalents, auto: v})} />
              </div>
              <div className="target-input-col">
                <span className="target-input-label">Desired</span>
                <NumberSpinner value={desiredTalents.auto} min={currentTalents.auto} max={10} onChange={v => setDesiredTalents({...desiredTalents, auto: v})} />
              </div>
            </div>
          </div>

          <div className="target-row">
            <div className="target-row-title">Elemental Skill</div>
            <div className="target-inputs-group">
              <div className="target-input-col">
                <span className="target-input-label">Current</span>
                <NumberSpinner value={currentTalents.skill} min={1} max={13} onChange={v => setCurrentTalents({...currentTalents, skill: v})} />
              </div>
              <div className="target-input-col">
                <span className="target-input-label">Desired</span>
                <NumberSpinner value={desiredTalents.skill} min={currentTalents.skill} max={13} onChange={v => setDesiredTalents({...desiredTalents, skill: v})} />
              </div>
            </div>
          </div>

          <div className="target-row">
            <div className="target-row-title">Elemental Burst</div>
            <div className="target-inputs-group">
              <div className="target-input-col">
                <span className="target-input-label">Current</span>
                <NumberSpinner value={currentTalents.burst} min={1} max={13} onChange={v => setCurrentTalents({...currentTalents, burst: v})} />
              </div>
              <div className="target-input-col">
                <span className="target-input-label">Desired</span>
                <NumberSpinner value={desiredTalents.burst} min={currentTalents.burst} max={13} onChange={v => setDesiredTalents({...desiredTalents, burst: v})} />
              </div>
            </div>
          </div>
        </div>
        <div className="target-modal-actions">
          <button className="action-btn btn-cancel" onClick={onClose}>
            <X size={24} />
          </button>
          <button className="action-btn btn-accept" onClick={handleAccept}>
            <Check size={24} />
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};
