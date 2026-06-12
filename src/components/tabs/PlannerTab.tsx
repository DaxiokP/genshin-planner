import './PlannerTab.css';
import React, { useState } from 'react';
import { UserPlus, Sword, ListOrdered, Pencil, Sparkles, Power, Trash2, RotateCw, Filter } from 'lucide-react';
import { SummaryPanel } from '../SummaryPanel';
import { formatCompact } from '../../utils/formatHelpers';
import { hasSingleStar } from '../../utils/upgradeHelpers';
import { moveItem } from '../../utils/plannerHelpers';
import { calculateRequirements } from '../../utils/plannerCalculator';
import materialMapData from '../../maps/materialMap.json';
import characterMapData from '../../maps/characterMap.json';
import weaponMapData from '../../maps/weaponMap.json';

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

// Helper to look up character data
const characterMapRaw: Record<string, any> = characterMapData as any;
const normalizeChar = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

const charIndex: Record<string, string> = {};
Object.keys(characterMapRaw).forEach(k => { charIndex[normalizeChar(k)] = k; });

const lookupChar = (key: string) => {
  const normalizedKey = normalizeChar(key === 'Traveler' ? 'Aether' : key);
  return characterMapRaw[charIndex[normalizedKey]] ?? null;
};

// Helper to look up weapon data
const weaponMapRaw: Record<string, any> = weaponMapData as any;
const normalizeWeapon = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

const weaponIndex: Record<string, string> = {};
Object.keys(weaponMapRaw).forEach(k => { weaponIndex[normalizeWeapon(k)] = k; });

const lookupWeapon = (key: string) => {
  return weaponMapRaw[weaponIndex[normalizeWeapon(key)]] ?? null;
};

interface PlannerTabProps {
  plannedItems: any[];
  setPlannedItems: React.Dispatch<React.SetStateAction<any[]>>;
  simulation: any;
  characters: any[];
  weapons: any[];
  selectedDayOffset: number;
  setSelectedDayOffset: React.Dispatch<React.SetStateAction<number>>;
  timeToReset: string;
  handleOpenQuickInventory: (key: string) => void;
  setHoveredItem: React.Dispatch<React.SetStateAction<any>>;
  setMousePos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setIsCharacterSelectModalOpen: (val: boolean) => void;
  setIsWeaponSelectModalOpen: (val: boolean) => void;
  setIsPriorityModalOpen: (val: boolean) => void;
  setOpenedTargetFromPlanner: (val: boolean) => void;
  setSelectedWeaponIndexForTarget: (val: number | null) => void;
  setSelectedWeaponKeyForTarget: (val: string | null) => void;
  setSelectedCharacterKeyForTarget: (val: string | null) => void;
  setSelectedUpgradeWeaponId: (val: string | null) => void;
  setIsUpgradeWeaponModalOpen: (val: boolean) => void;
  setSelectedUpgradeCharacterKey: (val: string | null) => void;
  setIsUpgradeModalOpen: (val: boolean) => void;
  setDeletingWeaponId: (val: string | null) => void;
  setDeletingCharacterKey: (val: string | null) => void;
}

export const PlannerTab: React.FC<PlannerTabProps> = ({
  plannedItems,
  setPlannedItems,
  simulation,
  characters,
  weapons,
  selectedDayOffset,
  setSelectedDayOffset,
  timeToReset,
  handleOpenQuickInventory,
  setHoveredItem,
  setMousePos,
  setIsCharacterSelectModalOpen,
  setIsWeaponSelectModalOpen,
  setIsPriorityModalOpen,
  setOpenedTargetFromPlanner,
  setSelectedWeaponIndexForTarget,
  setSelectedWeaponKeyForTarget,
  setSelectedCharacterKeyForTarget,
  setSelectedUpgradeWeaponId,
  setIsUpgradeWeaponModalOpen,
  setSelectedUpgradeCharacterKey,
  setIsUpgradeModalOpen,
  setDeletingWeaponId,
  setDeletingCharacterKey,
}) => {
  const [canDragCardKey, setCanDragCardKey] = useState<string | null>(null);
  const [draggedCardKey, setDraggedCardKey] = useState<string | null>(null);
  const [dragOverCardKey, setDragOverCardKey] = useState<string | null>(null);
  const [dropPlacement, setDropPlacement] = useState<'before' | 'after' | null>(null);
  const [readyFilter, setReadyFilter] = useState<'all' | 'highlight' | 'readyOnly'>('all');

  const getPlanStatus = (planned: any) => {
    const isWeapon = planned.type === 'weapon';
    const id = planned.id || (isWeapon ? `weapon:${planned.weaponIndex}` : `character:${planned.key}`);
    const requirements = planned.enabled !== false
      ? (simulation.requirements[id] || [])
      : calculateRequirements({ ...planned, enabled: true }, null);

    const isDone = requirements.length === 0;
    const isReady = planned.enabled !== false && !isDone && requirements.every((r: any) => r.isEnough);

    return { isDone, isReady, requirements };
  };

  const visiblePlannedItems = plannedItems.filter((planned) => {
    const { isDone, isReady } = getPlanStatus(planned);

    if (readyFilter !== 'all' && isDone) {
      return false;
    }

    if (readyFilter === 'readyOnly' && !isReady) {
      return false;
    }

    return true;
  });

  const handleCardDragStart = (e: React.DragEvent, key: string) => {
    setDraggedCardKey(key);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCardDragOver = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (draggedCardKey === targetKey) {
      setDragOverCardKey(null);
      setDropPlacement(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeft = x < rect.width / 2;

    setDragOverCardKey(targetKey);
    setDropPlacement(isLeft ? 'before' : 'after');
  };

  const handleCardDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (draggedCardKey && draggedCardKey !== targetKey && dropPlacement) {
      const updated = moveItem(plannedItems, draggedCardKey, targetKey, dropPlacement);
      setPlannedItems(updated);
    }
    setDraggedCardKey(null);
    setDragOverCardKey(null);
    setDropPlacement(null);
  };

  const togglePlannedCharacter = (key: string) => {
    setPlannedItems(prev => prev.map(p => {
      if ((p.type === 'character' || !p.type) && p.key === key) {
        return {
          ...p,
          enabled: p.enabled !== false ? false : true
        };
      }
      return p;
    }));
  };

  const removePlannedCharacter = (key: string) => {
    setDeletingCharacterKey(key);
  };

  const upgradePlannedCharacter = (key: string) => {
    setSelectedUpgradeCharacterKey(key);
    setIsUpgradeModalOpen(true);
  };

  const renderLevelsAndTalents = (planned: any) => {
    const charOwned = characters.find(c => c.key === planned.key);
    const constellation = charOwned?.constellation || 0;
    const isSkillBoosted = constellation >= 3;
    const isBurstBoosted = constellation >= 5;

    const skillCur = planned.current.talent.skill + (isSkillBoosted ? 3 : 0);
    const skillDes = planned.desired.talent.skill + (isSkillBoosted ? 3 : 0);
    const skillDiff = skillDes > skillCur;

    const burstCur = planned.current.talent.burst + (isBurstBoosted ? 3 : 0);
    const burstDes = planned.desired.talent.burst + (isBurstBoosted ? 3 : 0);
    const burstDiff = burstDes > burstCur;

    const autoCur = planned.current.talent.auto;
    const autoDes = planned.desired.talent.auto;
    const autoDiff = autoDes > autoCur;

    const boostedColor = '#38bdf8'; // light blue
    const normalColor = 'rgba(255,255,255,0.9)'; // off-white
    const labelColor = 'rgba(255,255,255,0.4)'; // gray label

    const renderTalentRow = (cur: number, des: number, diff: boolean, isBoosted: boolean, label: string) => {
      const textColor = isBoosted ? boostedColor : normalColor;
      const fontStyle = { color: textColor, fontWeight: isBoosted ? '700' : '500' };

      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '0.9rem',
          width: '100%',
          height: '22px',
          position: 'relative'
        }}>
          {/* Centered Transition Container */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '90px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
              {cur === des ? (
                <span style={{ ...fontStyle, width: '90px', textAlign: 'center', position: 'relative' }}>
                  {cur}
                  {/* Label: absolutely positioned on the right to preserve centering */}
                  <span style={{
                    color: labelColor,
                    fontSize: '0.75rem',
                    position: 'absolute',
                    left: '100%',
                    marginLeft: '12px',
                    whiteSpace: 'nowrap',
                    fontWeight: '500'
                  }}>
                    {label}
                  </span>
                </span>
              ) : (
                <>
                  <span style={{ ...fontStyle, width: '32px', textAlign: 'right' }}>{cur}</span>
                  <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.75rem', width: '26px', textAlign: 'center', fontWeight: 'bold' }}>➔</span>
                  <span style={{
                    color: isBoosted ? boostedColor : (diff ? '#ffcc66' : textColor),
                    fontWeight: isBoosted || diff ? 'bold' : '500',
                    width: '32px',
                    textAlign: 'left',
                    position: 'relative',
                    display: 'inline-flex',
                    alignItems: 'center'
                  }}>
                    {des}

                    {/* Label: absolutely positioned on the right to preserve centering */}
                    <span style={{
                      color: labelColor,
                      fontSize: '0.75rem',
                      position: 'absolute',
                      left: '100%',
                      marginLeft: '12px',
                      whiteSpace: 'nowrap',
                      fontWeight: '500'
                    }}>
                      {label}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Outfit', sans-serif",
        gap: '4px',
        marginTop: '0.35rem',
        width: '100%'
      }}>
        {/* Levels */}
        <div style={{ color: '#ffcc66', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Levels
        </div>
        <div style={{
          fontSize: '1.05rem',
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '24px',
          width: '100%'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '90px'
          }}>
            {planned.current.level === planned.desired.level && planned.current.ascension === planned.desired.ascension ? (
              <span style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: '0.95rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {planned.current.level}
                {hasSingleStar(planned.current.level, planned.current.ascension) && (
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginLeft: '2px' }}>✦</span>
                )}
              </span>
            ) : (
              <>
                <span style={{
                  color: 'rgba(255,255,255,0.9)',
                  width: '32px',
                  textAlign: 'right',
                  fontSize: '0.95rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end'
                }}>
                  {planned.current.level}
                  {hasSingleStar(planned.current.level, planned.current.ascension) && (
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginLeft: '2px' }}>✦</span>
                  )}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.85rem', width: '26px', textAlign: 'center', fontWeight: 'bold' }}>
                  ➔
                </span>
                <span style={{
                  color: planned.desired.level > planned.current.level ? '#ffcc66' : 'inherit',
                  width: '32px',
                  textAlign: 'left',
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '0.95rem'
                }}>
                  {planned.desired.level}
                  {hasSingleStar(planned.desired.level, planned.desired.ascension) && (
                    <span style={{
                      color: '#ffcc66',
                      fontSize: '0.8rem',
                      marginLeft: '2px'
                    }}>
                      ✦
                    </span>
                  )}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Talents */}
        <div style={{ color: '#ffcc66', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
          Talents
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', alignItems: 'center' }}>
          {renderTalentRow(autoCur, autoDes, autoDiff, false, 'Attack')}
          {renderTalentRow(skillCur, skillDes, skillDiff, isSkillBoosted, 'Skill')}
          {renderTalentRow(burstCur, burstDes, burstDiff, isBurstBoosted, 'Burst')}
        </div>
      </div>
    );
  };

  return (
    <section className="planner-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2>Plan Your Progress</h2>
          <p className="planner-subtitle">Select what you want to work on</p>
        </div>
        <div className="planner-actions">
          <button
            className="planner-btn planner-btn-character"
            onClick={() => setIsCharacterSelectModalOpen(true)}
          >
            <UserPlus size={20} />
            <span>Add Character</span>
          </button>
          <button
            className="planner-btn planner-btn-weapon"
            onClick={() => setIsWeaponSelectModalOpen(true)}
          >
            <Sword size={20} />
            <span>Add Weapon</span>
          </button>
          <button className="planner-btn planner-btn-priority" onClick={() => setIsPriorityModalOpen(true)}>
            <ListOrdered size={20} />
            <span>Manage Priority</span>
          </button>
        </div>
      </div>

      {plannedItems.length > 0 ? (
        <div className="planner-layout">
          <SummaryPanel
            simulation={simulation}
            selectedDayOffset={selectedDayOffset}
            setSelectedDayOffset={setSelectedDayOffset}
            timeToReset={timeToReset}
            handleOpenQuickInventory={handleOpenQuickInventory}
            setHoveredItem={setHoveredItem}
            setMousePos={setMousePos}
          />

          <div className="planner-cards-section">
            <div className="planner-filter-bar">
              <div className="planner-filter-label">
                <Filter size={16} />
                <span>Ready to Upgrade Filter:</span>
              </div>
              <div className="planner-filter-toggle-group">
                <button
                  className={`planner-filter-btn ${readyFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setReadyFilter('all')}
                >
                  Show All
                </button>
                <button
                  className={`planner-filter-btn ${readyFilter === 'highlight' ? 'active' : ''}`}
                  onClick={() => setReadyFilter('highlight')}
                >
                  Highlight Ready
                </button>
                <button
                  className={`planner-filter-btn ${readyFilter === 'readyOnly' ? 'active' : ''}`}
                  onClick={() => setReadyFilter('readyOnly')}
                >
                  Only Show Ready
                </button>
              </div>
            </div>

            <div className="planner-grid">
              {visiblePlannedItems.length === 0 ? (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '3rem',
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px dashed rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  color: 'var(--text-secondary)',
                  fontFamily: "'Outfit', sans-serif"
                }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>No matching characters or weapons</p>
                  <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                    {readyFilter === 'readyOnly'
                      ? 'No active plans are currently ready to upgrade.'
                      : 'All planned characters and weapons are completed.'}
                  </p>
                </div>
              ) : (
                visiblePlannedItems.map((planned) => {
                  const isWeapon = planned.type === 'weapon';
                  const id = planned.id || (isWeapon ? `weapon:${planned.weaponIndex}` : `character:${planned.key}`);
                  const { isReady, requirements } = getPlanStatus(planned);

                  // Custom Card Style overrides for the Highlight Filter
                  const cardStyle: React.CSSProperties = {
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'relative',
                    transition: 'all 0.3s ease',
                  };

                  if (readyFilter === 'highlight') {
                    if (isReady) {
                      cardStyle.filter = 'none';
                      cardStyle.border = '2px solid rgba(129, 199, 132, 0.85)';
                      cardStyle.boxShadow = '0 0 20px rgba(129, 199, 132, 0.4), 0 4px 15px rgba(0, 0, 0, 0.3)';
                      cardStyle.transform = 'scale(1.01)';
                    } else {
                      cardStyle.filter = 'grayscale(0.9) opacity(0.2)';
                      cardStyle.border = '2px solid rgba(255, 255, 255, 0.02)';
                      cardStyle.boxShadow = 'none';
                    }
                  } else {
                    cardStyle.filter = planned.enabled === false ? 'grayscale(0.75) opacity(0.45)' : 'none';
                  }

                if (isWeapon) {
                  const wInfo = lookupWeapon(planned.key) || {
                    name: planned.key,
                    rarity: 4,
                    id: '',
                    type: '',
                  };
                  const rarity = wInfo.rarity || 4;
                  const displayName = wInfo.name || planned.key;
                  const fontScale = displayName.length > 20 ? '0.8rem' : displayName.length > 12 ? '0.95rem' : '1.15rem';
                  const headerGradient = rarity === 5
                    ? 'linear-gradient(to right, #8c6a4a, #735438)' // 5* Gold
                    : rarity === 4
                      ? 'linear-gradient(to right, #7b6a99, #5a4b78)' // 4* Purple
                      : 'linear-gradient(to right, #3d3f45, #2e3035)'; // 3* Gray

                  return (
                    <div
                      key={id}
                      draggable={canDragCardKey === id}
                      onDragStart={(e) => handleCardDragStart(e, id)}
                      onDragOver={(e) => handleCardDragOver(e, id)}
                      onDragLeave={() => { setDragOverCardKey(null); setDropPlacement(null); }}
                      onDrop={(e) => handleCardDrop(e, id)}
                      onDragEnd={() => { setDraggedCardKey(null); setDragOverCardKey(null); setDropPlacement(null); }}
                      className={`character-card bg-rarity-${rarity} ${draggedCardKey === id ? 'dragging-card' : ''
                        } ${dragOverCardKey === id && dropPlacement === 'before' ? 'drop-before' : ''
                        } ${dragOverCardKey === id && dropPlacement === 'after' ? 'drop-after' : ''
                        }`}
                      style={cardStyle}
                    >
                      {/* Premium Header Bar */}
                      <div
                        className="planner-card-header-draggable"
                        onMouseDown={() => setCanDragCardKey(id)}
                        onMouseUp={() => setCanDragCardKey(null)}
                        style={{
                          background: headerGradient,
                          height: '46px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingLeft: '12px',
                          paddingRight: '12px',
                          borderBottom: '1px solid rgba(0,0,0,0.15)',
                          position: 'relative'
                        }}
                      >
                        {/* Left Buttons (Edit, Upgrade) */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => {
                              setOpenedTargetFromPlanner(true);
                              setSelectedWeaponIndexForTarget(planned.weaponIndex);
                              setSelectedWeaponKeyForTarget(planned.key);
                            }}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#eae3d2',
                              color: '#4a3c31',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              padding: 0,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                            }}
                            title="Edit target levels"
                          >
                            <Pencil size={15} style={{ strokeWidth: 2.2 }} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUpgradeWeaponId(id);
                              setIsUpgradeWeaponModalOpen(true);
                            }}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#eae3d2',
                              color: '#4a3c31',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              padding: 0,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                            }}
                            title="Mark as upgraded"
                          >
                            <Sparkles size={15} style={{ strokeWidth: 2.2 }} />
                          </button>
                        </div>

                        {/* Center Weapon Name */}
                        <div style={{
                          color: '#fff',
                          fontFamily: "'Outfit', sans-serif",
                          fontWeight: '700',
                          fontSize: fontScale,
                          letterSpacing: '0.01em',
                          display: '-webkit-box',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flex: 1,
                          textAlign: 'center',
                          lineHeight: '1.15',
                          padding: '0 4px',
                          maxHeight: '38px',
                          overflow: 'hidden',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          wordBreak: 'break-word'
                        } as any}>
                          <span>{displayName}</span>
                        </div>

                        {/* Right Buttons (Standby, Delete) */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => {
                              setPlannedItems(prev => prev.map(p => {
                                if (p.id === id) {
                                  return { ...p, enabled: p.enabled !== false ? false : true };
                                }
                                return p;
                              }));
                            }}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#12131a',
                              color: planned.enabled !== false ? '#fff' : '#555',
                              border: planned.enabled !== false ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.05)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              padding: 0,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                            }}
                            title={planned.enabled !== false ? "Put on Standby" : "Activate Plan"}
                          >
                            <Power size={14} style={{ strokeWidth: 2.5 }} />
                          </button>
                          <button
                            onClick={() => setDeletingWeaponId(id)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#eae3d2',
                              color: '#4a3c31',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              padding: 0,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                            }}
                            title="Remove plan"
                          >
                            <Trash2 size={14} style={{ strokeWidth: 2.2 }} />
                          </button>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div style={{
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        flex: 1
                      }}>
                        {/* Symmetrical side-by-side flex row */}
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', height: '146px' }}>
                          {/* Enlarged avatar frame */}
                          <div
                            className={`weapon-rarity-${rarity}`}
                            style={{
                              width: '120px',
                              height: '120px',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              position: 'relative',
                              flexShrink: 0,
                              border: '2px solid rgba(0,0,0,0.4)',
                              boxShadow: '0 6px 12px rgba(0,0,0,0.35), inset 0 2px 4px rgba(255,255,255,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <img
                              src={`${import.meta.env.BASE_URL}weapons/${wInfo.id}.png`}
                              alt={displayName}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (!target.dataset.fallback) {
                                  target.dataset.fallback = 'enka';
                                  target.src = `https://enka.network/ui/UI_EquipIcon_${wInfo.id}.png`;
                                } else if (!target.dataset.fallbackUi) {
                                  target.dataset.fallbackUi = 'ui';
                                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`;
                                }
                              }}
                            />
                            {/* Refinement badge overlay */}
                            <span
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                fontSize: '0.65rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontWeight: '700',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(0,0,0,0.65)',
                                color: '#ffcc66'
                              }}
                            >
                              R{weapons[planned.weaponIndex]?.refinement || 1}
                            </span>

                            {/* Equipped Character Banner at the bottom-center inside the icon box */}
                            {weapons[planned.weaponIndex]?.location && (
                              <div style={{
                                position: 'absolute',
                                bottom: '4px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(15, 17, 26, 0.85)',
                                color: 'rgba(255, 255, 255, 0.95)',
                                fontSize: '0.68rem',
                                fontWeight: '700',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                                maxWidth: '90%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                zIndex: 2,
                                pointerEvents: 'none'
                              }}>
                                {lookupChar(weapons[planned.weaponIndex].location)?.name || weapons[planned.weaponIndex].location}
                              </div>
                            )}
                          </div>

                          {/* Level indicators */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', height: '100%', paddingRight: '28px' }}>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'flex-start',
                              fontFamily: "'Outfit', sans-serif",
                              gap: '4px',
                              marginTop: '0.35rem',
                              width: '100%'
                            }}>
                              <div style={{ color: '#ffcc66', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Levels
                              </div>
                              <div style={{
                                fontSize: '1.05rem',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                height: '24px',
                                width: '100%'
                              }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '90px'
                                }}>
                                  {planned.current.level === planned.desired.level && planned.current.ascension === planned.desired.ascension ? (
                                    <span style={{
                                      color: 'rgba(255,255,255,0.9)',
                                      fontSize: '0.95rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      {planned.current.level}
                                      {hasSingleStar(planned.current.level, planned.current.ascension) && (
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginLeft: '2px' }}>✦</span>
                                      )}
                                    </span>
                                  ) : (
                                    <>
                                      <span style={{
                                        color: 'rgba(255,255,255,0.9)',
                                        width: '32px',
                                        textAlign: 'right',
                                        fontSize: '0.95rem',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end'
                                      }}>
                                        {planned.current.level}
                                        {hasSingleStar(planned.current.level, planned.current.ascension) && (
                                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginLeft: '2px' }}>✦</span>
                                        )}
                                      </span>
                                      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.85rem', width: '26px', textAlign: 'center', fontWeight: 'bold' }}>
                                        ➔
                                      </span>
                                      <span style={{
                                        color: planned.desired.level > planned.current.level ? '#ffcc66' : 'inherit',
                                        width: '32px',
                                        textAlign: 'left',
                                        position: 'relative',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        fontSize: '0.95rem'
                                      }}>
                                        {planned.desired.level}
                                        {hasSingleStar(planned.desired.level, planned.desired.ascension) && (
                                          <span style={{
                                            color: '#ffcc66',
                                            fontSize: '0.8rem',
                                            marginLeft: '2px'
                                          }}>
                                            ✦
                                          </span>
                                        )}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.15rem 0' }} />

                        {requirements.length === 0 ? (
                          <div style={{
                            textAlign: 'center',
                            padding: '1.25rem',
                            background: 'rgba(76, 175, 80, 0.08)',
                            border: '1px dashed rgba(76, 175, 80, 0.2)',
                            borderRadius: '8px',
                            color: '#a5d6a7',
                            fontSize: '0.85rem',
                            fontWeight: '500'
                          }}>
                            {planned.enabled === false ? "Plan disabled (Active power toggled off)" : "Target reached (No materials needed!)"}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              color: '#ffcc66',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontFamily: "'Outfit', sans-serif"
                            }}>
                              <span>Required Materials</span>
                              {planned.enabled === false ? (
                                <span style={{ fontSize: '0.7rem', color: '#9e9e9e', background: 'rgba(255, 255, 255, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>Disabled</span>
                              ) : requirements.every((r: any) => r.isEnough) ? (
                                <span style={{ fontSize: '0.7rem', color: '#81c784', background: 'rgba(76, 175, 80, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>Ready</span>
                              ) : (
                                <span style={{ fontSize: '0.7rem', color: '#ffb74d', background: 'rgba(255, 183, 77, 0.12)', padding: '1px 6px', borderRadius: '4px' }}>In Progress</span>
                              )}
                            </div>

                            {/* Materials grid */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
                              gap: '0.3rem'
                            }}>
                              {requirements.map((mat: any) => {
                                const isEnough = mat.isEnough ?? (mat.owned >= mat.required);
                                const pseudoRarity = mat.rarity || 1;
                                const originalEntry = materialMap[mat.key];
                                const isOreOrMora = mat.key === 'mysticenhancementore' || mat.key === 'mora';

                                return (
                                  <div
                                    key={mat.key}
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      borderRadius: '6px',
                                      overflow: 'hidden',
                                      border: '1px solid rgba(255, 255, 255, 0.08)',
                                      position: 'relative',
                                      cursor: 'pointer',
                                      aspectRatio: '50 / 62',
                                      opacity: isEnough ? 0.45 : 1,
                                      transition: 'opacity 0.2s ease',
                                    }}
                                    onClick={() => handleOpenQuickInventory(mat.key)}
                                    onMouseEnter={(e) => {
                                      if (originalEntry) {
                                        setHoveredItem({ key: mat.key, data: originalEntry });
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setMousePos({ x: rect.right + 12, y: rect.top });
                                      }
                                    }}
                                    onMouseLeave={() => setHoveredItem(null)}
                                  >
                                    <div style={{
                                      height: '20px',
                                      background: 'rgba(0, 0, 0, 0.6)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.8rem',
                                      fontWeight: '700',
                                      color: isEnough ? '#a5d6a7' : '#fff',
                                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                      fontFamily: "'Outfit', sans-serif"
                                    }}>
                                      {isEnough ? (
                                        isOreOrMora ? `~${formatCompact(mat.required)}` : formatCompact(mat.required)
                                      ) : (
                                        isOreOrMora ? `~${formatCompact(mat.missing)}` : formatCompact(mat.missing)
                                      )}
                                    </div>

                                    <div
                                      className={`bg-rarity-${pseudoRarity}`}
                                      style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative'
                                      } as any}
                                    >
                                      <img
                                        src={originalEntry?.localExt ? `${import.meta.env.BASE_URL}icons/${mat.iconId}${originalEntry.localExt}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(mat.name)}`}
                                        alt={mat.name}
                                        style={{ width: '80%', height: '80%', objectFit: 'contain', transform: 'scale(1.35)', transformOrigin: 'center' }}
                                        onError={(e) => {
                                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(mat.name)}&background=random&color=fff&rounded=true&font-size=0.33`;
                                        }}
                                      />

                                      {(() => {
                                        if (!isOreOrMora && mat.converted !== undefined && mat.owned < mat.required) {
                                          const convertValue = Math.min(mat.required - mat.owned, mat.converted);
                                          if (convertValue > 0) {
                                            return (
                                              <div style={{
                                                position: 'absolute',
                                                bottom: '2px',
                                                left: '2px',
                                                background: 'rgba(15, 17, 26, 0.85)',
                                                borderRadius: '4px',
                                                padding: '1px 3px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '2px',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
                                                zIndex: 2
                                              }}>
                                                <RotateCw size={8} style={{ strokeWidth: 2.8, color: '#ffcc66' }} />
                                                <span style={{ fontSize: '0.55rem', color: '#fff', fontWeight: '700', lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>
                                                  {formatCompact(convertValue)}
                                                </span>
                                              </div>
                                            );
                                          }
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                } else {
                  // Character Card Card
                  const charMapInfo = lookupChar(planned.key);
                  const name = charMapInfo?.name || planned.key;
                  const fontScale = name.length > 20 ? '0.8rem' : name.length > 12 ? '0.95rem' : '1.15rem';
                  const elementClass = charMapInfo?.element ? charMapInfo.element.toLowerCase() : 'none';

                  return (
                    <div
                      key={id}
                      draggable={canDragCardKey === id}
                      onDragStart={(e) => handleCardDragStart(e, id)}
                      onDragOver={(e) => handleCardDragOver(e, id)}
                      onDragLeave={() => { setDragOverCardKey(null); setDropPlacement(null); }}
                      onDrop={(e) => handleCardDrop(e, id)}
                      onDragEnd={() => { setDraggedCardKey(null); setDragOverCardKey(null); setDropPlacement(null); }}
                      className={`character-card bg-element-${elementClass} ${draggedCardKey === id ? 'dragging-card' : ''
                        } ${dragOverCardKey === id && dropPlacement === 'before' ? 'drop-before' : ''
                        } ${dragOverCardKey === id && dropPlacement === 'after' ? 'drop-after' : ''
                        }`}
                      style={cardStyle}
                    >
                      {/* Premium Rarity-Based Header Bar */}
                      <div
                        className="planner-card-header-draggable"
                        onMouseDown={() => setCanDragCardKey(id)}
                        onMouseUp={() => setCanDragCardKey(null)}
                        style={{
                          background: charMapInfo?.rarity === 5
                            ? 'linear-gradient(to right, #8c6a4a, #735438)' // 5* Gold
                            : 'linear-gradient(to right, #7b6a99, #5a4b78)', // 4* Purple
                          height: '46px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingLeft: '12px',
                          paddingRight: '12px',
                          borderBottom: '1px solid rgba(0,0,0,0.15)',
                          position: 'relative'
                        }}
                      >
                        {/* Left Buttons (Edit, Upgrade) */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => {
                              setOpenedTargetFromPlanner(true);
                              setSelectedCharacterKeyForTarget(planned.key);
                            }}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#eae3d2',
                              color: '#4a3c31',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              padding: 0,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                            }}
                            title="Edit target levels"
                          >
                            <Pencil size={15} style={{ strokeWidth: 2.2 }} />
                          </button>
                          <button
                            onClick={() => upgradePlannedCharacter(planned.key)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#eae3d2',
                              color: '#4a3c31',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              padding: 0,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                            }}
                            title="Mark as upgraded"
                          >
                            <Sparkles size={15} style={{ strokeWidth: 2.2 }} />
                          </button>
                        </div>

                        {/* Center Character Name */}
                        <div style={{
                          color: '#fff',
                          fontFamily: "'Outfit', sans-serif",
                          fontWeight: '700',
                          fontSize: fontScale,
                          letterSpacing: '0.01em',
                          display: '-webkit-box',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flex: 1,
                          textAlign: 'center',
                          lineHeight: '1.15',
                          padding: '0 4px',
                          maxHeight: '38px',
                          overflow: 'hidden',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          wordBreak: 'break-word'
                        } as any}>
                          <span>{name}</span>
                        </div>

                        {/* Right Buttons (Standby, Delete) */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => togglePlannedCharacter(planned.key)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#12131a',
                              color: planned.enabled !== false ? '#fff' : '#555',
                              border: planned.enabled !== false ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.05)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              padding: 0,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                            }}
                            title={planned.enabled !== false ? "Put on Standby" : "Activate Plan"}
                          >
                            <Power size={14} style={{ strokeWidth: 2.5 }} />
                          </button>
                          <button
                            onClick={() => removePlannedCharacter(planned.key)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#eae3d2',
                              color: '#4a3c31',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              padding: 0,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                            }}
                            title="Remove plan"
                          >
                            <Trash2 size={14} style={{ strokeWidth: 2.2 }} />
                          </button>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div style={{
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        flex: 1
                      }}>
                        {/* Symmetrical side-by-side flex row */}
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', height: '146px' }}>
                          {/* Enlarged avatar frame */}
                          <div
                            className={`bg-rarity-${charMapInfo?.rarity || 4}-solid bg-element-${elementClass}-gradient`}
                            style={{
                              width: '120px',
                              height: '120px',
                              borderRadius: '12px',
                              overflow: 'hidden',
                              position: 'relative',
                              flexShrink: 0,
                              border: '2px solid rgba(0,0,0,0.4)',
                              boxShadow: '0 6px 12px rgba(0,0,0,0.35), inset 0 2px 4px rgba(255,255,255,0.08)'
                            }}
                          >
                            <img
                              src={`${import.meta.env.BASE_URL}characters/${charMapInfo?.id}.png`}
                              alt={charMapInfo?.name || planned.key}
                              style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom' }}
                              onError={(e) => {
                                const target = e.currentTarget;
                                if (!target.dataset.fallback) {
                                  target.dataset.fallback = 'enka';
                                  target.src = `https://enka.network/ui/UI_AvatarIcon_${charMapInfo?.id || planned.key}.png`;
                                } else if (!target.dataset.fallbackUi) {
                                  target.dataset.fallbackUi = 'ui';
                                  target.src = `https://ui-avatars.com/api/?name=${charMapInfo?.name || planned.key}&background=random`;
                                }
                              }}
                            />
                            {/* Constellation Overlay inside avatar frame */}
                            <span
                              className={`char-constellation bg-element-${elementClass}-dark`}
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                fontSize: '0.65rem',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontWeight: '700',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                border: '1px solid rgba(255,255,255,0.1)'
                              }}
                            >
                              C{characters.find(c => c.key === planned.key)?.constellation || 0}
                            </span>
                          </div>

                          {/* Centered Levels and Talents Column */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', height: '100%', paddingRight: '28px' }}>
                            {renderLevelsAndTalents(planned)}
                          </div>
                        </div>

                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '0.15rem 0' }} />

                        {requirements.length === 0 ? (
                          <div style={{
                            textAlign: 'center',
                            padding: '1.25rem',
                            background: 'rgba(76, 175, 80, 0.08)',
                            border: '1px dashed rgba(76, 175, 80, 0.2)',
                            borderRadius: '8px',
                            color: '#a5d6a7',
                            fontSize: '0.85rem',
                            fontWeight: '500'
                          }}>
                            {planned.enabled === false ? "Plan disabled (Active power toggled off)" : "Target reached (No materials needed!)"}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              color: '#ffcc66',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontFamily: "'Outfit', sans-serif"
                            }}>
                              <span>Required Materials</span>
                              {planned.enabled === false ? (
                                <span style={{ fontSize: '0.7rem', color: '#9e9e9e', background: 'rgba(255, 255, 255, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>Disabled</span>
                              ) : requirements.every((r: any) => r.isEnough) ? (
                                <span style={{ fontSize: '0.7rem', color: '#81c784', background: 'rgba(76, 175, 80, 0.15)', padding: '1px 6px', borderRadius: '4px' }}>Ready</span>
                              ) : (
                                <span style={{ fontSize: '0.7rem', color: '#ffb74d', background: 'rgba(255, 183, 77, 0.12)', padding: '1px 6px', borderRadius: '4px' }}>In Progress</span>
                              )}
                            </div>

                            {/* Materials grid */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
                              gap: '0.3rem'
                            }}>
                              {requirements.map((mat: any) => {
                                const isEnough = mat.isEnough ?? (mat.owned >= mat.required);
                                const pseudoRarity = mat.rarity || 1;
                                const originalEntry = materialMap[mat.key];
                                const isExpOrMora = mat.key === 'heroswit' || mat.key === 'mora';

                                return (
                                  <div
                                    key={mat.key}
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      borderRadius: '6px',
                                      overflow: 'hidden',
                                      border: '1px solid rgba(255, 255, 255, 0.08)',
                                      position: 'relative',
                                      cursor: 'pointer',
                                      aspectRatio: '50 / 62',
                                      opacity: isEnough ? 0.45 : 1,
                                      transition: 'opacity 0.2s ease',
                                    }}
                                    onClick={() => handleOpenQuickInventory(mat.key)}
                                    onMouseEnter={(e) => {
                                      if (originalEntry) {
                                        setHoveredItem({ key: mat.key, data: originalEntry });
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setMousePos({ x: rect.right + 12, y: rect.top });
                                      }
                                    }}
                                    onMouseLeave={() => setHoveredItem(null)}
                                  >
                                    <div style={{
                                      height: '20px',
                                      background: 'rgba(0, 0, 0, 0.6)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.8rem',
                                      fontWeight: '700',
                                      color: isEnough ? '#a5d6a7' : '#fff',
                                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                                      fontFamily: "'Outfit', sans-serif"
                                    }}>
                                      {isEnough ? (
                                        isExpOrMora ? `~${formatCompact(mat.required)}` : formatCompact(mat.required)
                                      ) : (
                                        isExpOrMora ? `~${formatCompact(mat.missing)}` : formatCompact(mat.missing)
                                      )}
                                    </div>

                                    <div
                                      className={`bg-rarity-${pseudoRarity}`}
                                      style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative'
                                      }}
                                    >
                                      <img
                                        src={originalEntry?.localExt ? `${import.meta.env.BASE_URL}icons/${mat.iconId}${originalEntry.localExt}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(mat.name)}`}
                                        alt={mat.name}
                                        style={{ width: '80%', height: '80%', objectFit: 'contain', transform: 'scale(1.35)', transformOrigin: 'center' }}
                                        onError={(e) => {
                                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(mat.name)}&background=random&color=fff&rounded=true&font-size=0.33`;
                                        }}
                                      />

                                      {(() => {
                                        if (!isExpOrMora && mat.converted !== undefined && mat.owned < mat.required) {
                                          const convertValue = Math.min(mat.required - mat.owned, mat.converted);
                                          if (convertValue > 0) {
                                            return (
                                              <div style={{
                                                position: 'absolute',
                                                bottom: '2px',
                                                left: '2px',
                                                background: 'rgba(15, 17, 26, 0.85)',
                                                borderRadius: '4px',
                                                padding: '1px 3px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '2px',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
                                                zIndex: 2
                                              }}>
                                                <RotateCw size={8} style={{ strokeWidth: 2.8, color: '#ffcc66' }} />
                                                <span style={{ fontSize: '0.55rem', color: '#fff', fontWeight: '700', lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>
                                                  {formatCompact(convertValue)}
                                                </span>
                                              </div>
                                            );
                                          }
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              })
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px dashed var(--glass-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Your planner is empty. Add a character or a weapon to get started.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              className="planner-btn planner-btn-character"
              onClick={() => setIsCharacterSelectModalOpen(true)}
            >
              <UserPlus size={20} /> Add Character
            </button>
            <button
              className="planner-btn planner-btn-weapon"
              onClick={() => setIsWeaponSelectModalOpen(true)}
            >
              <Sword size={20} /> Add Weapon
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
export default PlannerTab;
