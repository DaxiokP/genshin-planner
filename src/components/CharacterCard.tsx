import React from 'react';
import { Heart } from 'lucide-react';
import type { GoodCharacter, GoodWeapon, GoodArtifact } from '../App';
import characterMapData from '../characterMap.json';
import weaponMapData from '../weaponMap.json';
import artifactMapData from '../artifactMap.json';

const characterMap: Record<string, any> = characterMapData as any;
const weaponMap: Record<string, any> = weaponMapData as any;
const artifactMap: Record<string, any> = artifactMapData as any;

interface CharacterCardProps {
  character: GoodCharacter;
  weapon?: GoodWeapon;
  artifacts?: GoodArtifact[];
}

const artifactSlotOrder = ['flower', 'plume', 'sands', 'goblet', 'circlet'];

export const CharacterCard: React.FC<CharacterCardProps> = ({ character, weapon, artifacts = [] }) => {
  const charData = characterMap[character.key] || { name: character.key, rarity: 5, element: 'None', icon: '' };
  
  // Try to find the original id to construct Mihoyo static url if icon is missing.
  // Actually, we stored `icon: data.images.mihoyo_icon` in characterMap.
  const portraitUrl = charData.icon;
  const elementClass = charData.element.toLowerCase();
  
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
          {portraitUrl ? (
            <img src={portraitUrl} alt={charData.name} className="char-portrait" />
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
          <div className={`equip-icon-wrapper ${weapon ? `bg-rarity-${weaponMap[weapon.key]?.rarity || 1}` : 'empty-slot'}`}>
            {weapon ? (
              <img src={weaponMap[weapon.key]?.icon || `https://ui-avatars.com/api/?name=${weapon.key}`} alt={weapon.key} title={weaponMap[weapon.key]?.name || weapon.key} />
            ) : null}
          </div>
        </div>
        
        {equippedArtifacts.map((art, i) => {
          const artData = art ? artifactMap[art.setKey] : null;
          const artIcon = artData?.icons?.[artifactSlotOrder[i]] || artData?.icons?.filename_flower; // Fallback
          return (
            <div key={i} className="equip-slot">
              <div className="equip-lvl-overlay">
                {art && <span className="equip-lvl-text">+{art.level}</span>}
              </div>
              <div className={`equip-icon-wrapper ${art ? `bg-rarity-${art.rarity}` : 'empty-slot'}`}>
                {art ? (
                  <img src={artIcon || `https://ui-avatars.com/api/?name=${art.setKey}`} alt={art.setKey} title={artData?.name || art.setKey} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
