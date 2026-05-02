import React from 'react';
import { X } from 'lucide-react';
import type { GoodCharacter } from '../App';
import characterMapData from '../maps/characterMap.json';

const characterMap: Record<string, any> = characterMapData;

const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
const charIndex: Record<string, string> = {};
Object.keys(characterMap).forEach(k => { charIndex[normalize(k)] = k; });
const lookupChar = (key: string) => {
  const normalizedKey = normalize(key === 'Traveler' ? 'Aether' : key);
  return characterMap[charIndex[normalizedKey]] ?? null;
};

interface CharacterSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownedCharacters: GoodCharacter[];
  onSelect: (characterKey: string) => void;
}

export const CharacterSelectionModal: React.FC<CharacterSelectionModalProps> = ({
  isOpen,
  onClose,
  ownedCharacters,
  onSelect,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Select Character</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-content">
          {ownedCharacters.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
              No characters available. Please import your GOOD data first.
            </div>
          ) : (
            <div className="char-select-grid">
              {ownedCharacters.map(char => {
                const charInfo = lookupChar(char.key);
                if (!charInfo) return null;
                const rarity = charInfo.rarity || 4;

                return (
                  <div
                    key={char.key}
                    className="char-select-item"
                    onClick={() => onSelect(char.key)}
                  >
                    <div className={`material-icon-wrapper bg-rarity-${rarity}`} style={{ position: 'relative' }}>
                      <img
                        src={`${import.meta.env.BASE_URL}characters/${charInfo.id}.png`}
                        alt={charInfo.name}
                        className="material-icon"
                        style={{ objectPosition: 'bottom' }}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.fallback) {
                            target.dataset.fallback = 'enka';
                            target.src = `https://enka.network/ui/UI_AvatarIcon_${charInfo.id}.png`;
                          } else if (!target.dataset.fallbackUi) {
                            target.dataset.fallbackUi = 'ui';
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(charInfo.name)}&background=random&color=fff&rounded=true&font-size=0.33`;
                          }
                        }}
                      />
                      <div className="char-select-level-container">
                        <span className="char-select-level-text">Lv. {char.level}</span>
                        <span className="char-select-constellation">C{char.constellation || 0}</span>
                      </div>
                      <div className="char-select-talents-overlay">
                        <span className="char-select-talent">{char.talent.auto}</span>
                        <span className="char-select-talent">{char.talent.skill}</span>
                        <span className="char-select-talent">{char.talent.burst}</span>
                      </div>
                    </div>
                    <div className="char-select-name">{charInfo.name}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
