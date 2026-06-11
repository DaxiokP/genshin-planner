import React, { useState, useEffect } from 'react';
import { X, Check, Plus, Minus, RotateCw } from 'lucide-react';
import type { GoodCharacter, PlannedCharacter } from '../App';
import characterMapData from '../maps/characterMap.json';
import materialMapData from '../maps/materialMap.json';
import { simulateUpgrade, hasSingleStar } from '../utils/upgradeHelpers';

const characterMap: Record<string, any> = characterMapData;
const materialMap = materialMapData as Record<string, {
  id: string;
  name?: string;
  rarity: number;
  sources: string[];
  localExt?: string;
  sortGroup?: number;
  sortRank?: number;
}>;

interface UpgradeCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  planned: PlannedCharacter | undefined;
  currentData: GoodCharacter | undefined;
  materials: Record<string, number> | null;
  onUpgradeClick: (
    target: {
      level: number;
      ascension: number;
      talent: { auto: number; skill: number; burst: number };
    },
    craftingBonuses: Record<string, number>
  ) => void;
  handleOpenQuickInventory: (key: string) => void;
}

const getMaxTalentForAscension = (asc: number) => {
  if (asc <= 1) return 1;
  if (asc === 2) return 2;
  if (asc === 3) return 4;
  if (asc === 4) return 6;
  if (asc === 5) return 8;
  return 10;
};

const NumberSpinner = ({ value, min, max, onChange, isBoosted }: { value: number, min: number, max: number, onChange: (val: number) => void, isBoosted?: boolean }) => {
  return (
    <div className="number-spinner">
      <button 
        className="spinner-btn" 
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        type="button"
      >-</button>
      <input 
        type="number" 
        className={`spinner-input ${isBoosted ? 'boosted-talent' : ''}`} 
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
        type="button"
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

export const UpgradeCharacterModal: React.FC<UpgradeCharacterModalProps> = ({
  isOpen,
  onClose,
  planned,
  currentData,
  materials,
  onUpgradeClick,
  handleOpenQuickInventory,
}) => {
  const [desiredLevel, setDesiredLevel] = useState(90);
  const [desiredAscension, setDesiredAscension] = useState(6);
  const [desiredTalents, setDesiredTalents] = useState({ auto: 9, skill: 9, burst: 9 });
  const [craftingBonuses, setCraftingBonuses] = useState<Record<string, number>>({});

  useEffect(() => {
    if (planned) {
      setDesiredLevel(planned.desired.level);
      setDesiredAscension(planned.desired.ascension);
      setDesiredTalents({
        auto: planned.desired.talent.auto,
        skill: planned.desired.talent.skill,
        burst: planned.desired.talent.burst,
      });
      setCraftingBonuses({});
    }
  }, [planned, isOpen]);

  useEffect(() => {
    if (planned) {
      const maxTalent = getMaxTalentForAscension(desiredAscension);
      setDesiredTalents(prev => ({
        auto: Math.max(planned.current.talent.auto, Math.min(prev.auto, maxTalent)),
        skill: Math.max(planned.current.talent.skill, Math.min(prev.skill, maxTalent)),
        burst: Math.max(planned.current.talent.burst, Math.min(prev.burst, maxTalent)),
      }));
    }
  }, [desiredAscension, planned]);

  if (!isOpen || !planned) return null;

  const charInfo = characterMap[planned.key];
  if (!charInfo) return null;

  const constellation = currentData?.constellation || 0;
  const isSkillBoosted = constellation >= 3;
  const isBurstBoosted = constellation >= 5;

  const currentLevel = planned.current.level;
  const currentAscension = planned.current.ascension;
  const currentTalents = planned.current.talent;

  const handleDesiredLevelChange = (l: number, a: number) => {
    setDesiredLevel(l);
    setDesiredAscension(a);
  };

  const handleBonusChange = (key: string, val: number) => {
    setCraftingBonuses(prev => ({
      ...prev,
      [key]: Math.max(0, val),
    }));
  };

  const targetLevels = {
    level: desiredLevel,
    ascension: desiredAscension,
    talent: desiredTalents,
  };

  // Run the conversion simulation
  const { requirements, crafts, isSufficient } = simulateUpgrade(
    planned,
    targetLevels,
    materials,
    craftingBonuses
  );

  // Identify which materials can receive crafting bonuses
  // Rules:
  // - Talent materials
  // - Monster materials
  // - Part of the active chains in this upgrade (meaning they exist in the raw requirements' chains)
  const activeChainGroups = new Set<string>();
  requirements.forEach(req => {
    const data = materialMap[req.key];
    if (data && data.sortGroup !== undefined && data.sortRank !== undefined && req.key !== 'crownofinsight') {
      if (data.sortGroup === 100 || data.sortGroup === 500) {
        activeChainGroups.add(`${data.sortGroup}_${data.sortRank}`);
      }
    }
  });

  const bonusEligibleMaterials: { key: string; name: string; id: string; rarity: number }[] = [];
  Object.entries(materialMap).forEach(([key, data]) => {
    if (data.sortGroup !== undefined && data.sortRank !== undefined) {
      const chainKey = `${data.sortGroup}_${data.sortRank}`;
      if (activeChainGroups.has(chainKey)) {
        // Exclude crowns of insight
        if (key !== 'crownofinsight') {
          bonusEligibleMaterials.push({
            key,
            name: data.name || key,
            id: data.id,
            rarity: data.rarity,
          });
        }
      }
    }
  });

  // Sort eligible bonus materials by sortGroup, then sortRank, then rarity
  bonusEligibleMaterials.sort((a, b) => {
    const mapA = materialMap[a.key];
    const mapB = materialMap[b.key];
    const groupA = mapA?.sortGroup ?? 0;
    const groupB = mapB?.sortGroup ?? 0;
    if (groupA !== groupB) return groupA - groupB;
    const rankA = mapA?.sortRank ?? 0;
    const rankB = mapB?.sortRank ?? 0;
    if (rankA !== rankB) return rankA - rankB;
    return a.rarity - b.rarity;
  });

  const handleUpgradeClick = () => {
    if (!isSufficient) return;
    onUpgradeClick(targetLevels, craftingBonuses);
  };

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

  // Helper to format values compact
  const formatCompact = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
    }
    if (num >= 100000) {
      return (num / 1000).toFixed(0) + 'K';
    }
    if (num >= 1000) {
      const kValue = num / 1000;
      return kValue % 1 === 0 ? kValue.toFixed(0) + 'K' : kValue.toFixed(1).replace('.0', '') + 'K';
    }
    return num.toString();
  };

  // Check if at least one non-estimated material is insufficient
  const estimatedKeys = new Set(['mora', 'heroswit', 'adventurersexperience', 'wanderersadvice']);
  const hasInsufficientNonEstimated = requirements.some(req => !estimatedKeys.has(req.key) && !req.isEnough);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-container bg-rarity-${charInfo.rarity || 4}-solid`} 
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '1000px',
          width: '95%',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Title Bar */}
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
            Upgrade {charInfo.name}
          </h2>
          <button className="modal-close-btn" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Left Column: Target Controls */}
          <div 
            style={{ 
              width: '340px', 
              padding: '1.5rem', 
              borderRight: '1px solid rgba(255, 255, 255, 0.08)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'rgba(0,0,0,0.15)'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffcc66', fontFamily: "'Outfit', sans-serif", borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem' }}>
              Select Target Levels
            </h3>

            {/* Lv. Selection Row */}
            <div className="target-row" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.75rem 0' }}>
              <div className="target-row-title" style={{ color: '#ffcc66', fontSize: '0.95rem', marginBottom: '0.4rem' }}>Level & Ascension</div>
              <div className="target-inputs-group" style={{ gap: '1.5rem' }}>
                <div className="target-input-col">
                  <span className="target-input-label">Current</span>
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: '#aaa',
                    border: '1px solid rgba(255,255,255,0.05)',
                    minWidth: '50px',
                    textAlign: 'center'
                  }}>
                    {currentLevel}{hasSingleStar(currentLevel, currentAscension) ? '✦' : ''}
                  </div>
                </div>
                <div className="target-input-col">
                  <span className="target-input-label" style={{ color: '#ffcc66' }}>Target</span>
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

            {/* Normal Attack talent spinner */}
            <div className="target-row" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.75rem 0' }}>
              <div className="target-row-title" style={{ color: '#ffcc66', fontSize: '0.95rem', marginBottom: '0.4rem' }}>Normal Attack</div>
              <div className="target-inputs-group" style={{ gap: '1.5rem' }}>
                <div className="target-input-col">
                  <span className="target-input-label">Current</span>
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: '#aaa',
                    border: '1px solid rgba(255,255,255,0.05)',
                    minWidth: '50px',
                    textAlign: 'center'
                  }}>
                    {currentTalents.auto}
                  </div>
                </div>
                <div className="target-input-col">
                  <span className="target-input-label" style={{ color: '#ffcc66' }}>Target</span>
                  <NumberSpinner 
                    value={desiredTalents.auto} 
                    min={currentTalents.auto} 
                    max={getMaxTalentForAscension(desiredAscension)} 
                    onChange={v => setDesiredTalents({...desiredTalents, auto: v})} 
                  />
                </div>
              </div>
            </div>

            {/* Elemental Skill talent spinner */}
            <div className="target-row" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '0.75rem 0' }}>
              <div className="target-row-title" style={{ color: '#ffcc66', fontSize: '0.95rem', marginBottom: '0.4rem' }}>Elemental Skill</div>
              <div className="target-inputs-group" style={{ gap: '1.5rem' }}>
                <div className="target-input-col">
                  <span className="target-input-label">Current</span>
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: isSkillBoosted ? '#38bdf8' : '#aaa',
                    border: '1px solid rgba(255,255,255,0.05)',
                    minWidth: '50px',
                    textAlign: 'center'
                  }}>
                    {currentTalents.skill + (isSkillBoosted ? 3 : 0)}
                  </div>
                </div>
                <div className="target-input-col">
                  <span className="target-input-label" style={{ color: '#ffcc66' }}>Target</span>
                  <NumberSpinner 
                    value={desiredTalents.skill + (isSkillBoosted ? 3 : 0)} 
                    min={currentTalents.skill + (isSkillBoosted ? 3 : 0)} 
                    max={getMaxTalentForAscension(desiredAscension) + (isSkillBoosted ? 3 : 0)} 
                    onChange={v => setDesiredTalents({...desiredTalents, skill: v - (isSkillBoosted ? 3 : 0)})} 
                    isBoosted={isSkillBoosted}
                  />
                </div>
              </div>
            </div>

            {/* Elemental Burst talent spinner */}
            <div className="target-row" style={{ padding: '0.75rem 0' }}>
              <div className="target-row-title" style={{ color: '#ffcc66', fontSize: '0.95rem', marginBottom: '0.4rem' }}>Elemental Burst</div>
              <div className="target-inputs-group" style={{ gap: '1.5rem' }}>
                <div className="target-input-col">
                  <span className="target-input-label">Current</span>
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: isBurstBoosted ? '#38bdf8' : '#aaa',
                    border: '1px solid rgba(255,255,255,0.05)',
                    minWidth: '50px',
                    textAlign: 'center'
                  }}>
                    {currentTalents.burst + (isBurstBoosted ? 3 : 0)}
                  </div>
                </div>
                <div className="target-input-col">
                  <span className="target-input-label" style={{ color: '#ffcc66' }}>Target</span>
                  <NumberSpinner 
                    value={desiredTalents.burst + (isBurstBoosted ? 3 : 0)} 
                    min={currentTalents.burst + (isBurstBoosted ? 3 : 0)} 
                    max={getMaxTalentForAscension(desiredAscension) + (isBurstBoosted ? 3 : 0)} 
                    onChange={v => setDesiredTalents({...desiredTalents, burst: v - (isBurstBoosted ? 3 : 0)})} 
                    isBoosted={isBurstBoosted}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Materials Calculations */}
          <div 
            style={{ 
              flex: 1, 
              padding: '1.5rem', 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}
          >
            
            {/* 1. Materials Area */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.3rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#ffcc66', fontFamily: "'Outfit', sans-serif" }}>
                  Materials
                </h3>
                {hasInsufficientNonEstimated && (
                  <span id="insufficient-materials-text" style={{ color: '#ff4d4d', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    Insufficient materials
                  </span>
                )}
              </div>

              {requirements.length === 0 ? (
                <div style={{
                  padding: '1rem',
                  background: 'rgba(76, 175, 80, 0.08)',
                  border: '1px dashed rgba(76, 175, 80, 0.2)',
                  borderRadius: '8px',
                  color: '#a5d6a7',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  textAlign: 'center'
                }}>
                  Target already reached! (No materials needed)
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
                  gap: '0.5rem'
                }}>
                  {requirements.map(mat => {
                    const isExpOrMora = mat.key === 'heroswit' || mat.key === 'mora' || mat.key === 'adventurersexperience' || mat.key === 'wanderersadvice';
                    const satisfies = mat.isEnough;
                    const finalColor = satisfies ? '#a5d6a7' : '#ff4d4d';
                    
                    return (
                      <div
                        key={mat.key}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: `1px solid ${satisfies ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 77, 77, 0.4)'}`,
                          background: satisfies ? 'transparent' : 'rgba(255, 77, 77, 0.03)',
                          position: 'relative',
                          aspectRatio: '68 / 85',
                          opacity: 1, // Don't fade the icons on the Materials
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                        }}
                        title={mat.name}
                        onClick={() => handleOpenQuickInventory(mat.key)}
                      >
                        {/* Top Value: Inventory/Required */}
                        {(() => {
                          const baseOwned = mat.key === 'heroswit'
                            ? mat.owned
                            : getRawOwnedCount(mat.key) + (craftingBonuses[mat.key] || 0);
                          const craftCount = mat.converted || 0;
                          const displayOwned = Math.min(mat.required, baseOwned);
                          
                          const displayValue = isExpOrMora
                            ? `${formatCompact(displayOwned)}/~${formatCompact(mat.required)}`
                            : `${formatCompact(Math.min(mat.required, baseOwned + craftCount))}/${formatCompact(mat.required)}`;
                          return (
                            <div style={{
                              height: '24px',
                              background: 'rgba(0, 0, 0, 0.6)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              color: finalColor,
                              borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                              fontFamily: "'Outfit', sans-serif"
                            }}>
                              {displayValue}
                            </div>
                          );
                        })()}

                        {/* Rarity BG and Icon */}
                        <div 
                          className={`bg-rarity-${mat.rarity || 1}`}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative'
                          }}
                        >
                          <img
                            src={materialMap[mat.key]?.localExt ? `${import.meta.env.BASE_URL}icons/${mat.iconId}${materialMap[mat.key].localExt}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(mat.name)}`}
                            alt={mat.name}
                            style={{ width: '80%', height: '80%', objectFit: 'contain', transform: 'scale(1.25)' }}
                            onError={(e) => {
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(mat.name)}&background=random&color=fff&rounded=true&font-size=0.33`;
                            }}
                          />
                        </div>

                        {/* Bottom Value: Craft conversions (if > 0) */}
                        {mat.converted && mat.converted > 0 ? (
                          <div style={{
                            position: 'absolute',
                            bottom: '2px',
                            left: '2px',
                            background: 'rgba(15, 17, 26, 0.85)',
                            borderRadius: '4px',
                            padding: '1px 4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
                            zIndex: 2
                          }}>
                            <RotateCw size={8} style={{ strokeWidth: 2.8, color: '#ffcc66' }} />
                            <span style={{
                              fontSize: '0.6rem',
                              color: '#fff',
                              fontWeight: '700',
                              lineHeight: 1,
                              fontFamily: "'Outfit', sans-serif"
                            }}>
                              {formatCompact(mat.converted)}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Craft Area */}
            <div>
              <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.1rem', color: '#ffcc66', fontFamily: "'Outfit', sans-serif", borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.3rem' }}>
                Craft
              </h3>
              <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Below are the amounts you need to craft based on your inventory.
              </p>

              {(() => {
                const activeCrafts = Object.entries(crafts).filter(([_, count]) => count > 0);
                if (activeCrafts.length === 0) {
                  return (
                    <div style={{
                      padding: '0.75rem',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px dashed rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      textAlign: 'center'
                    }}>
                      No crafting/conversions needed for this upgrade target!
                    </div>
                  );
                }
                return (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
                    gap: '0.5rem'
                  }}>
                    {activeCrafts.map(([key, count]) => {
                      const data = materialMap[key];
                      if (!data) return null;
                      return (
                        <div
                          key={key}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            position: 'relative',
                            aspectRatio: '68 / 85',
                            cursor: 'pointer'
                          }}
                          title={data.name || key}
                          onClick={() => handleOpenQuickInventory(key)}
                        >
                          {/* Header Count */}
                          <div style={{
                            height: '24px',
                            background: 'rgba(0, 0, 0, 0.6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            color: '#ffcc66',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          }}>
                            {formatCompact(count)}
                          </div>

                          {/* Rarity Icon wrapper */}
                          <div 
                            className={`bg-rarity-${data.rarity || 1}`}
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <img
                              src={data.localExt ? `${import.meta.env.BASE_URL}icons/${data.id}${data.localExt}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || key)}`}
                              alt={data.name || key}
                              style={{ width: '80%', height: '80%', objectFit: 'contain', transform: 'scale(1.25)' }}
                              onError={(e) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || key)}&background=random&color=fff&rounded=true&font-size=0.33`;
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* 3. Crafting Bonus Area */}
            <div>
              <h3 style={{ margin: '0 0 0.2rem 0', fontSize: '1.1rem', color: '#ffcc66', fontFamily: "'Outfit', sans-serif", borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.3rem' }}>
                Crafting bonus
              </h3>
              <p style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                Input any additional items gained via alchemy crafting bonuses (e.g. Sucrose or Albedo double yields).
              </p>

              {bonusEligibleMaterials.length === 0 ? (
                <div style={{
                  padding: '0.75rem',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px dashed rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  textAlign: 'center'
                }}>
                  No craftable talent/monster drops in requirements.
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
                  gap: '0.5rem'
                }}>
                  {bonusEligibleMaterials.map(item => {
                    const bonusVal = craftingBonuses[item.key] || 0;
                    return (
                      <div
                        key={item.key}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          background: 'rgba(0,0,0,0.2)',
                          position: 'relative',
                        }}
                      >
                        {/* Icon Wrapper */}
                        <div 
                          className={`bg-rarity-${item.rarity || 1}`}
                          style={{
                            height: '56px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleOpenQuickInventory(item.key)}
                        >
                          <img
                            src={materialMap[item.key]?.localExt ? `${import.meta.env.BASE_URL}icons/${item.id}${materialMap[item.key].localExt}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}`}
                            alt={item.name}
                            style={{ width: '80%', height: '80%', objectFit: 'contain', transform: 'scale(1.25)' }}
                          />
                        </div>

                        {/* Input Below */}
                        <div style={{ padding: '4px', display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
                          <input
                            type="number"
                            style={{
                              width: '100%',
                              background: '#1a1b24',
                              color: '#ffcc66',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '4px',
                              padding: '2px 4px',
                              textAlign: 'center',
                              fontWeight: 'bold',
                              fontSize: '0.82rem',
                              outline: 'none'
                            }}
                            min="0"
                            value={bonusVal === 0 ? '' : bonusVal}
                            placeholder="0"
                            onChange={e => {
                              const v = parseInt(e.target.value, 10);
                              handleBonusChange(item.key, isNaN(v) ? 0 : v);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer Buttons */}
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
            id="CloseButton"
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
            type="button"
          >
            <X size={16} />
            Close
          </button>
          
          <button 
            id="UpgradeButton"
            className="action-btn"
            style={{
              borderRadius: '8px',
              padding: '0 1.5rem',
              height: '38px',
              width: 'auto',
              background: isSufficient ? '#4caf50' : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${isSufficient ? '#4caf50' : 'rgba(255, 255, 255, 0.04)'}`,
              color: isSufficient ? 'white' : 'rgba(255, 255, 255, 0.15)',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isSufficient ? 'pointer' : 'not-allowed'
            }}
            disabled={!isSufficient}
            onClick={handleUpgradeClick}
            type="button"
          >
            <Check size={16} />
            Upgrade
          </button>
        </div>

      </div>
    </div>
  );
};
