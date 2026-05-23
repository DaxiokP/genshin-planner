import React from 'react';
import { Sword, User, Shield, Heart, Zap, Sparkles } from 'lucide-react';
import type { GoodWeapon, GoodCharacter } from '../App';
import characterMapData from '../maps/characterMap.json';

const characterMapRaw: Record<string, any> = characterMapData as any;
const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

const charIndex: Record<string, string> = {};
Object.keys(characterMapRaw).forEach(k => { charIndex[normalize(k)] = k; });

const lookupChar = (key: string) => {
  const normalizedKey = normalize(key === 'Traveler' ? 'Aether' : key);
  return characterMapRaw[charIndex[normalizedKey]] ?? null;
};

interface WeaponCardProps {
  weapon: GoodWeapon;
  weaponMapData: any; // resolved metadata containing name, rarity, type, id, substatType, stats
  equippedCharacter?: GoodCharacter;
}

const getMaxLevel = (ascension: number) => {
  switch (ascension) {
    case 0: return 20;
    case 1: return 40;
    case 2: return 50;
    case 3: return 60;
    case 4: return 70;
    case 5: return 80;
    case 6: return 90;
    default: return 90;
  }
};

const formatSubstatValue = (type: string, value: number) => {
  if (!type || value === 0) return '';
  const lowerType = type.toLowerCase();
  // Percentage check: if type contains CRIT, Recharge, Bonus, DMG, Rate or value is fractional (< 1)
  if (
    lowerType.includes('crit') ||
    lowerType.includes('recharge') ||
    lowerType.includes('percent') ||
    lowerType.includes('bonus') ||
    lowerType.includes('dmg') ||
    lowerType.includes('rate') ||
    (value < 1.0 && value > 0)
  ) {
    return `${(value * 100).toFixed(1)}%`;
  }
  return Math.round(value).toString();
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

const getSubstatIcon = (type: string) => {
  const lower = type.toLowerCase();
  if (lower.includes('crit')) return <Zap size={14} style={{ color: '#ffb74d' }} />;
  if (lower.includes('em') || lower.includes('mastery')) return <Sparkles size={14} style={{ color: '#81c784' }} />;
  if (lower.includes('energy') || lower.includes('recharge')) return <Zap size={14} style={{ color: '#64b5f6' }} />;
  if (lower.includes('hp')) return <Heart size={14} style={{ color: '#ff8a80' }} />;
  if (lower.includes('def')) return <Shield size={14} style={{ color: '#a1887f' }} />;
  return <Sword size={14} style={{ color: '#e0e0e0' }} />;
};

export const WeaponCard: React.FC<WeaponCardProps> = ({ weapon, weaponMapData, equippedCharacter }) => {
  const rarity = weaponMapData?.rarity || 1;
  const maxLvl = getMaxLevel(weapon.ascension);
  const type = weaponMapData?.type || 'Sword';
  const displayName = weaponMapData?.name || weapon.key;

  // Retrieve precalculated stats
  const statKey = `${weapon.level}-${weapon.ascension}`;
  const [atk, substatValue] = weaponMapData?.stats?.[statKey] || [0, 0];

  const substatLabel = weaponMapData?.substatType || '';
  const formattedSubstat = formatSubstatValue(substatLabel, substatValue);

  // Equipped Character data lookup
  const hasChar = weapon.location && weapon.location !== '';
  const charData = hasChar ? lookupChar(weapon.location) : null;
  const charName = charData?.name || weapon.location;

  return (
    <div className={`weapon-card bg-rarity-${rarity}`}>
      {/* Premium Header Block */}
      <div className={`weapon-card-header bg-rarity-${rarity}-solid`}>
        {/* Title & Type Icon */}
        <div className="weapon-title-row">
          <img src={getWeaponTypeIconPath(type)} alt={type} className="weapon-title-icon" />
          <div className="weapon-title-badge">
            {displayName}
          </div>
        </div>

        {/* Level and Refinement */}
        <div className="weapon-level-and-refinement">
          <div className="weapon-level-display">
            Lv. {weapon.level}<span className="weapon-max-level">/{maxLvl}</span>
          </div>
          <span className="weapon-refine-badge">R{weapon.refinement}</span>
        </div>

        {/* Stars */}
        <div className="weapon-stars">
          {Array.from({ length: rarity }).map((_, i) => (
            <span key={i} className="star">★</span>
          ))}
        </div>

        {/* Weapon Illustration */}
        <div className="weapon-image-wrapper">
          <img
            src={`${import.meta.env.BASE_URL}weapons/${weaponMapData?.id}.png`}
            alt={displayName}
            className="weapon-image"
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.dataset.fallback) {
                target.dataset.fallback = 'enka';
                target.src = `https://enka.network/ui/UI_EquipIcon_${weaponMapData?.id}.png`;
              } else if (!target.dataset.fallbackUi) {
                target.dataset.fallbackUi = 'ui';
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff&rounded=true&font-size=0.33`;
              }
            }}
          />
        </div>
      </div>

      {/* Stats Area */}
      <div className="weapon-card-body">
        <div className="weapon-stat-row">
          <div className="weapon-stat-left">
            <Sword size={14} className="weapon-stat-icon text-secondary" />
            <span>ATK</span>
          </div>
          <span className="weapon-stat-val">{atk > 0 ? atk : '--'}</span>
        </div>

        {substatLabel && (
          <div className="weapon-stat-row">
            <div className="weapon-stat-left">
              {getSubstatIcon(substatLabel)}
              <span>{substatLabel}</span>
            </div>
            <span className="weapon-stat-val">{formattedSubstat || '--'}</span>
          </div>
        )}
      </div>

      {/* Equipment Footer */}
      <div className="weapon-card-footer">
        {hasChar && charData ? (
          <div className="equipped-character-badge">
            <div className="equipped-avatar-wrapper">
              <img
                src={`${import.meta.env.BASE_URL}characters/${charData.id}.png`}
                alt={charName}
                className="equipped-avatar"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.fallback) {
                    target.dataset.fallback = 'enka';
                    target.src = `https://enka.network/ui/UI_AvatarIcon_${charData.id}.png`;
                  } else if (!target.dataset.fallbackUi) {
                    target.dataset.fallbackUi = 'ui';
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(charName)}&background=random&color=fff&rounded=true&font-size=0.4`;
                  }
                }}
              />
            </div>
            <span className="equipped-name">{charName}{equippedCharacter ? ` (Lv. ${equippedCharacter.level})` : ''}</span>
          </div>
        ) : (
          <div className="unequipped-badge">
            <User size={14} className="unequipped-icon" />
            <span>No Character</span>
          </div>
        )}
      </div>
    </div>
  );
};
