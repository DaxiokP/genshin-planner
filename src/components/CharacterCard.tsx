import React from 'react';
import { Heart } from 'lucide-react';
import type { GoodCharacter, GoodWeapon, GoodArtifact } from '../App';
import characterMapData from '../characterMap.json';
import weaponMapData from '../weaponMap.json';
import artifactMapData from '../artifactMap.json';

const characterMapRaw: Record<string, any> = characterMapData as any;
const weaponMapRaw: Record<string, any> = weaponMapData as any;
const artifactMapRaw: Record<string, any> = artifactMapData as any;

// Build case-insensitive lookup indexes (GOOD format keys may differ in casing)
const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
const charIndex: Record<string, string> = {};
Object.keys(characterMapRaw).forEach(k => { charIndex[normalize(k)] = k; });
const weaponIndex: Record<string, string> = {};
Object.keys(weaponMapRaw).forEach(k => { weaponIndex[normalize(k)] = k; });
const artifactIndex: Record<string, string> = {};
Object.keys(artifactMapRaw).forEach(k => { artifactIndex[normalize(k)] = k; });

const lookupChar = (key: string) => characterMapRaw[charIndex[normalize(key)]] ?? null;
const lookupWeapon = (key: string) => weaponMapRaw[weaponIndex[normalize(key)]] ?? null;
const lookupArtifact = (key: string) => artifactMapRaw[artifactIndex[normalize(key)]] ?? null;

interface CharacterCardProps {
  character: GoodCharacter;
  weapon?: GoodWeapon;
  artifacts?: GoodArtifact[];
}

const artifactSlotOrder = ['flower', 'plume', 'sands', 'goblet', 'circlet'];

const getFallbackIconName = (slot: string) => {
  switch (slot) {
    case 'flower': return 'flower.png';
    case 'plume': return 'feather.png';
    case 'sands': return 'sand.png';
    case 'goblet': return 'goblet.png';
    case 'circlet': return 'crown.png';
    default: return 'flower.png';
  }
};

const FallbackIcon = ({ slot }: { slot: string }) => {
  return (
    <img
      src={`${import.meta.env.BASE_URL}artifacts/${getFallbackIconName(slot)}`}
      alt={`Empty ${slot} slot`}
      style={{ opacity: 0.6, width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );
};

export const CharacterCard: React.FC<CharacterCardProps> = ({ character, weapon, artifacts = [] }) => {
  // Handle Traveler alias — GOOD uses "Traveler" but map has "Aether"/"Lumine"
  const charKey = character.key === 'Traveler' ? 'Aether' : character.key;
  const charData = lookupChar(charKey) || { name: character.key, rarity: 5, element: 'None', icon: '' };
  const elementClass = charData.element ? charData.element.toLowerCase() : 'none';

  const weaponData = weapon ? lookupWeapon(weapon.key) : null;

  // Arrange artifacts by slot
  const equippedArtifacts = artifactSlotOrder.map(slot =>
    artifacts.find(a => a.slotKey === slot)
  );

  return (
    <div className={`character-card bg-element-${elementClass}`}>
      <div className="char-card-header">
        <button className="heart-btn">
          <Heart size={14} className="heart-icon" />
        </button>
        <div className={`char-name-badge bg-element-${elementClass}-dark`}>
          {charData.name}
        </div>
      </div>

      <div className={`char-portrait-section bg-rarity-${charData.rarity}-solid bg-element-${elementClass}-gradient`}>
        <div className="char-portrait-wrapper">
          {charData.id ? (
            <img
              src={`${import.meta.env.BASE_URL}characters/${charData.id}.png`}
              alt={charData.name}
              className="char-portrait"
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.fallback) {
                  target.dataset.fallback = 'enka';
                  target.src = `https://enka.network/ui/UI_AvatarIcon_${charData.id}.png`;
                } else if (!target.dataset.fallbackUi) {
                  target.dataset.fallbackUi = 'ui';
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(charData.name)}&background=random&color=fff&rounded=true&font-size=0.4`;
                  target.style.objectFit = 'contain';
                  target.style.padding = '20px';
                }
              }}
            />
          ) : (
            <div className="char-placeholder">{charData.name[0]}</div>
          )}
        </div>

        <div className="char-info-overlay">
          <div className="char-level-row">
            <span className="char-level">Lv. {character.level}/90</span>
            <span className="char-constellation">C{character.constellation}</span>
          </div>
          <div className="char-talents">
            <span className="talent-badge">{character.talent.auto}</span>
            <span className="talent-badge">{character.talent.skill}</span>
            <span className="talent-badge">{character.talent.burst}</span>
          </div>
          <div className="char-stars">
            {Array.from({ length: charData.rarity }).map((_, i) => (
              <span key={i} className="star">★</span>
            ))}
          </div>
        </div>
      </div>

      <div className="char-equipment-row">
        <div className="equip-slot">
          <div className="equip-lvl-overlay">
            {weapon ? <span className="equip-lvl-text">{weapon.level}/90</span> : null}
            {weapon ? <span className="equip-refine">R{weapon.refinement}</span> : null}
          </div>
          <div className={`equip-icon-wrapper ${weaponData ? `bg-rarity-${weaponData.rarity || 1}` : 'empty-slot'}`}>
            {weaponData ? (
              <img
                src={`${import.meta.env.BASE_URL}weapons/${weaponData.id}.png`}
                alt={weapon!.key}
                title={weaponData.name || weapon!.key}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.fallback) {
                    target.dataset.fallback = 'enka';
                    target.src = `https://enka.network/ui/UI_EquipIcon_${weaponData.id}.png`;
                  } else if (!target.dataset.fallbackUi) {
                    target.dataset.fallbackUi = 'ui';
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(weaponData.name || weapon!.key)}&background=random&color=fff&rounded=true&font-size=0.33`;
                  }
                }}
              />
            ) : null}
          </div>
        </div>

        {equippedArtifacts.map((art, i) => {
          const artData = art ? lookupArtifact(art.setKey) : null;
          const slot = artifactSlotOrder[i];
          const artIconFilename = artData?.icons?.[`filename_${slot}`];
          const localArtSrc = artIconFilename
            ? `${import.meta.env.BASE_URL}artifacts/${artIconFilename}.png`
            : null;
          return (
            <div key={i} className="equip-slot">
              <div className="equip-lvl-overlay">
                {art && <span className="equip-lvl-text">+{art.level}</span>}
              </div>
              <div className={`equip-icon-wrapper ${art ? `bg-rarity-${art.rarity}` : 'empty-slot'}`}>
                {art ? (
                  <img
                    src={localArtSrc || `https://ui-avatars.com/api/?name=${art.setKey}`}
                    alt={art.setKey}
                    title={artData?.name || art.setKey}
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (artIconFilename && !target.dataset.fallback) {
                        target.dataset.fallback = 'enka';
                        target.src = `https://enka.network/ui/${artIconFilename}.png`;
                      } else if (!target.dataset.fallbackUi) {
                        target.dataset.fallbackUi = 'ui';
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(artData?.name || art.setKey)}&background=random&color=fff&rounded=true&font-size=0.33`;
                      }
                    }}
                  />
                ) : (
                  <FallbackIcon slot={slot} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

