import React, { useState, useEffect } from 'react';
import { Check, X, Plus, Minus } from 'lucide-react';
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

const getMaxTalentForAscension = (asc: number) => {
  if (asc <= 1) return 1;
  if (asc === 2) return 2;
  if (asc === 3) return 4;
  if (asc === 4) return 6;
  if (asc === 5) return 8;
  return 10;
};

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
      <button className="spinner-btn" onClick={handleDec} disabled={currentIndex <= actualMinIndex}>
        <Minus size={16} />
      </button>
      <div className="level-value-display" onClick={() => setIsOpen(!isOpen)}>
        {states[currentIndex]?.display || level}
      </div>
      <button className="spinner-btn" onClick={handleInc} disabled={currentIndex >= states.length - 1}>
        <Plus size={16} />
      </button>
      
      {isOpen && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} onClick={() => setIsOpen(false)} />
          <div className="level-selector-dropdown">
             <div className="level-dropdown-row">
               <button className="level-dropdown-btn" disabled={getRank(1, 0) < minRank} onClick={() => handleSelect(1, 0)} style={{ opacity: getRank(1, 0) < minRank ? 0.3 : 1 }}>1</button>
             </div>
             {[20, 40, 50, 60, 70, 80].map(m => {
               const reqAsc = m === 80 ? 5 : m === 70 ? 4 : m === 60 ? 3 : m === 50 ? 2 : m === 40 ? 1 : 0;
               return (
                 <div className="level-dropdown-row" key={m}>
                   <button className="level-dropdown-btn" disabled={getRank(m, reqAsc) < minRank} onClick={() => handleSelect(m, reqAsc)} style={{ opacity: getRank(m, reqAsc) < minRank ? 0.3 : 1 }}>{m}</button>
                   <button className="level-dropdown-btn" disabled={getRank(m, reqAsc + 1) < minRank} onClick={() => handleSelect(m, reqAsc + 1)} style={{ opacity: getRank(m, reqAsc + 1) < minRank ? 0.3 : 1 }}>{m}✦</button>
                 </div>
               )
             })}
             <div className="level-dropdown-row">
               <button className="level-dropdown-btn" disabled={getRank(90, 6) < minRank} onClick={() => handleSelect(90, 6)} style={{ opacity: getRank(90, 6) < minRank ? 0.3 : 1 }}>90</button>
             </div>
          </div>
        </>
      )}
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
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentAscension, setCurrentAscension] = useState(0);
  const [currentTalents, setCurrentTalents] = useState({ auto: 1, skill: 1, burst: 1 });
  
  const [desiredLevel, setDesiredLevel] = useState(90);
  const [desiredAscension, setDesiredAscension] = useState(6);
  const [desiredTalents, setDesiredTalents] = useState({ auto: 9, skill: 9, burst: 9 });

  const minCurrentLevel = currentData?.level || 1;
  const minCurrentAscension = currentData?.ascension || 0;
  const minCurrentAuto = currentData?.talent?.auto || 1;
  const minCurrentSkill = currentData?.talent?.skill || 1;
  const minCurrentBurst = currentData?.talent?.burst || 1;

  useEffect(() => {
    if (currentData) {
      setCurrentLevel(currentData.level || 1);
      setCurrentAscension(currentData.ascension || 0);
      setCurrentTalents({
        auto: currentData.talent?.auto || 1,
        skill: currentData.talent?.skill || 1,
        burst: currentData.talent?.burst || 1,
      });

      setDesiredLevel(Math.max(90, currentData.level || 1));
      setDesiredAscension(Math.max(6, currentData.ascension || 0));
      setDesiredTalents({
        auto: Math.max(9, currentData.talent?.auto || 1),
        skill: Math.max(9, currentData.talent?.skill || 1),
        burst: Math.max(9, currentData.talent?.burst || 1),
      });
    }
  }, [currentData, characterKey]);

  useEffect(() => {
    const maxTalent = getMaxTalentForAscension(desiredAscension);
    setDesiredTalents(prev => ({
      auto: Math.max(currentTalents.auto, Math.min(prev.auto, maxTalent)),
      skill: Math.max(currentTalents.skill, Math.min(prev.skill, maxTalent)),
      burst: Math.max(currentTalents.burst, Math.min(prev.burst, maxTalent))
    }));
  }, [desiredAscension, currentTalents]);

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

  const handleCurrentTalentChange = (key: 'auto'|'skill'|'burst', val: number) => {
    setCurrentTalents(prev => ({ ...prev, [key]: val }));
    setDesiredTalents(prev => ({ ...prev, [key]: Math.max(prev[key], val) }));
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
          <div className="target-modal-header" style={{ display: 'flex', alignItems: 'center' }}>
            {charInfo.name}
            <span style={{ 
              background: '#4caf50', 
              color: 'white', 
              padding: '4px 8px', 
              borderRadius: '6px', 
              marginLeft: '12px',
              fontSize: '1.2rem',
              lineHeight: 1
            }}>
              C{currentData?.constellation || 0}
            </span>
          </div>
          <div className="modal-content" style={{ padding: 0 }}>
          
          <div className="target-row">
            <div className="target-row-title">Lv.</div>
            <div className="target-inputs-group">
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

          <div className="target-row">
            <div className="target-row-title">Normal Attack</div>
            <div className="target-inputs-group">
              <div className="target-input-col">
                <span className="target-input-label">Current</span>
                <NumberSpinner 
                  value={currentTalents.auto} 
                  min={minCurrentAuto} 
                  max={getMaxTalentForAscension(currentAscension)} 
                  onChange={v => handleCurrentTalentChange('auto', v)} 
                />
              </div>
              <div className="target-input-col">
                <span className="target-input-label">Desired</span>
                <NumberSpinner 
                  value={desiredTalents.auto} 
                  min={currentTalents.auto} 
                  max={getMaxTalentForAscension(desiredAscension)} 
                  onChange={v => setDesiredTalents({...desiredTalents, auto: v})} 
                />
              </div>
            </div>
          </div>

          <div className="target-row">
            <div className="target-row-title">Elemental Skill</div>
            <div className="target-inputs-group">
              <div className="target-input-col">
                <span className="target-input-label">Current</span>
                <NumberSpinner 
                  value={currentTalents.skill} 
                  min={minCurrentSkill} 
                  max={getMaxTalentForAscension(currentAscension)} 
                  onChange={v => handleCurrentTalentChange('skill', v)} 
                />
              </div>
              <div className="target-input-col">
                <span className="target-input-label">Desired</span>
                <NumberSpinner 
                  value={desiredTalents.skill} 
                  min={currentTalents.skill} 
                  max={getMaxTalentForAscension(desiredAscension)} 
                  onChange={v => setDesiredTalents({...desiredTalents, skill: v})} 
                />
              </div>
            </div>
          </div>

          <div className="target-row">
            <div className="target-row-title">Elemental Burst</div>
            <div className="target-inputs-group">
              <div className="target-input-col">
                <span className="target-input-label">Current</span>
                <NumberSpinner 
                  value={currentTalents.burst} 
                  min={minCurrentBurst} 
                  max={getMaxTalentForAscension(currentAscension)} 
                  onChange={v => handleCurrentTalentChange('burst', v)} 
                />
              </div>
              <div className="target-input-col">
                <span className="target-input-label">Desired</span>
                <NumberSpinner 
                  value={desiredTalents.burst} 
                  min={currentTalents.burst} 
                  max={getMaxTalentForAscension(desiredAscension)} 
                  onChange={v => setDesiredTalents({...desiredTalents, burst: v})} 
                />
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
