import React from 'react';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import materialMapData from '../maps/materialMap.json';
import { formatCompact } from '../utils/formatHelpers';

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

interface SummaryPanelProps {
  simulation: {
    summaryMissing: any[];
    domainMissing: Record<string, any[]>;
  };
  selectedDayOffset: number;
  setSelectedDayOffset: React.Dispatch<React.SetStateAction<number>>;
  timeToReset: string;
  handleOpenQuickInventory: (key: string) => void;
  setHoveredItem: React.Dispatch<React.SetStateAction<any>>;
  setMousePos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
  simulation,
  selectedDayOffset,
  setSelectedDayOffset,
  timeToReset,
  handleOpenQuickInventory,
  setHoveredItem,
  setMousePos,
}) => {
  const { summaryMissing, domainMissing } = simulation;

  // 1. Calculate current game day index (reset is at 3:00 AM UTC, matching Portugal winter time)
  const getGameDayIndex = (): number => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    let day = now.getUTCDay();
    if (utcHours < 3) {
      day = (day + 6) % 7;
    }
    return day;
  };

  const gameDayIndex = getGameDayIndex();
  const displayedDayIndex = (gameDayIndex + selectedDayOffset + 35) % 7;
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // 2. Fetch farmable domain materials for the displayed day index
  let farmableMaterials: any[] = [];
  if (displayedDayIndex === 0) {
    // Sunday: All domain materials are farmable
    const domainKeys = new Set([
      ...(domainMissing['Monday/Thursday'] || []).map(i => i.key),
      ...(domainMissing['Tuesday/Friday'] || []).map(i => i.key),
      ...(domainMissing['Wednesday/Saturday'] || []).map(i => i.key)
    ]);
    farmableMaterials = summaryMissing.filter(item => domainKeys.has(item.key));
  } else if (displayedDayIndex === 1 || displayedDayIndex === 4) {
    farmableMaterials = domainMissing['Monday/Thursday'] || [];
  } else if (displayedDayIndex === 2 || displayedDayIndex === 5) {
    farmableMaterials = domainMissing['Tuesday/Friday'] || [];
  } else if (displayedDayIndex === 3 || displayedDayIndex === 6) {
    farmableMaterials = domainMissing['Wednesday/Saturday'] || [];
  }

  const miscKeys = new Set(['mora', 'heroswit', 'mysticenhancementore', 'crownofinsight']);

  const misc = summaryMissing.filter(item => miscKeys.has(item.key));
  const localSpecialties = summaryMissing.filter(item => item.sortGroup === 700);
  const worldBoss = summaryMissing.filter(item => item.sortGroup === 300);
  const weeklyBoss = summaryMissing.filter(item => item.sortGroup === 200);
  const common = summaryMissing.filter(item => item.sortGroup === 100 || item.sortGroup === 400);

  const hasAnyMissing = summaryMissing.length > 0;

  const renderSummaryTile = (item: any) => {
    const originalEntry = materialMap[item.key];
    const pseudoRarity = item.rarity || 1;
    const isOreOrMora = item.key === 'mysticenhancementore' || item.key === 'mora';
    const displayMissing = isOreOrMora ? `~${formatCompact(item.missing)}` : formatCompact(item.missing);

    return (
      <div
        key={item.key}
        className="summary-material-tile"
        onClick={() => handleOpenQuickInventory(item.key)}
        onMouseEnter={() => originalEntry && setHoveredItem({ key: item.key, data: originalEntry })}
        onMouseLeave={() => setHoveredItem(null)}
        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
        style={{ cursor: 'pointer' }}
      >
        <div className="summary-tile-count">
          {displayMissing}
        </div>
        <div className={`summary-tile-icon-wrapper bg-rarity-${pseudoRarity}`}>
          <img
            src={originalEntry?.localExt ? `${import.meta.env.BASE_URL}icons/${item.iconId}${originalEntry.localExt}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}`}
            alt={item.name}
            className="summary-tile-icon"
            onError={(e) => {
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random&color=fff&rounded=true&font-size=0.33`;
            }}
          />
        </div>
      </div>
    );
  };

  const renderSummaryCategory = (title: string, items: any[]) => {
    return (
      <div className="summary-category-group" key={title}>
        <h4 className="summary-category-title">{title}</h4>
        <div className="summary-material-grid">
          {items.map(renderSummaryTile)}
        </div>
      </div>
    );
  };

  const renderSummaryDomainDay = (dayTitle: string, items: any[]) => {
    return (
      <div className="summary-domain-day-group" key={dayTitle}>
        <h5 className="summary-domain-day-title">{dayTitle}</h5>
        <div className="summary-material-grid">
          {items.map(renderSummaryTile)}
        </div>
      </div>
    );
  };

  return (
    <div className="planner-summary-panel">
      {/* Daily Domains Banner */}
      <div className="planner-daily-domains">
        <div className="daily-domains-header">
          <button 
            className="daily-nav-btn" 
            onClick={() => setSelectedDayOffset(prev => prev - 1)}
            disabled={selectedDayOffset === 0}
            style={{
              opacity: selectedDayOffset === 0 ? 0.35 : 1,
              cursor: selectedDayOffset === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="daily-day-title">
            {displayedDayIndex === gameDayIndex ? 'Today' : weekdayNames[displayedDayIndex]}
          </span>
          <button className="daily-nav-btn" onClick={() => setSelectedDayOffset(prev => prev + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
        
        <div className="daily-domains-countdown">
          {timeToReset}
        </div>

        {farmableMaterials.length === 0 ? (
          <div className="daily-domains-empty">
            No materials to farm today.
          </div>
        ) : (
          <div className="daily-material-grid">
            {farmableMaterials.map(renderSummaryTile)}
          </div>
        )}
      </div>

      <div className="daily-domains-divider" />

      <h3 className="summary-title">Missing Materials</h3>
      <p className="summary-subtitle">Global allocated requirements</p>

      {!hasAnyMissing ? (
        <div className="summary-empty-state">
          <Sparkles size={20} className="summary-empty-icon" style={{ color: '#ffcc66' }} />
          <p>All planned items fully funded!</p>
        </div>
      ) : (
        <div className="summary-categories">
          {misc.length > 0 && renderSummaryCategory('Misc', misc)}
          {common.length > 0 && renderSummaryCategory('Common', common)}
          {localSpecialties.length > 0 && renderSummaryCategory('Local Specialties', localSpecialties)}
          {worldBoss.length > 0 && renderSummaryCategory('World Boss', worldBoss)}
          {weeklyBoss.length > 0 && renderSummaryCategory('Weekly Boss', weeklyBoss)}
          {(domainMissing['Monday/Thursday'].length > 0 ||
            domainMissing['Tuesday/Friday'].length > 0 ||
            domainMissing['Wednesday/Saturday'].length > 0) && (
              <div className="summary-category-group">
                <h4 className="summary-category-title">Domains</h4>
                <div className="summary-domain-days">
                  {domainMissing['Monday/Thursday'].length > 0 &&
                    renderSummaryDomainDay('Monday / Thursday', domainMissing['Monday/Thursday'])}
                  {domainMissing['Tuesday/Friday'].length > 0 &&
                    renderSummaryDomainDay('Tuesday / Friday', domainMissing['Tuesday/Friday'])}
                  {domainMissing['Wednesday/Saturday'].length > 0 &&
                    renderSummaryDomainDay('Wednesday / Saturday', domainMissing['Wednesday/Saturday'])}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
};
