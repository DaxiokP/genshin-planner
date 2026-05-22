import React from 'react';
import characterMapData from '../maps/characterMap.json';

const characterMapRaw: Record<string, any> = characterMapData as any;

const normalize = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
const charIndex: Record<string, string> = {};
Object.keys(characterMapRaw).forEach(k => { charIndex[normalize(k)] = k; });

const lookupChar = (key: string) => {
  const normalizedKey = normalize(key === 'Traveler' ? 'Aether' : key);
  return characterMapRaw[charIndex[normalizedKey]] ?? null;
};

interface DeletePlanConfirmationModalProps {
  characterKey: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeletePlanConfirmationModal: React.FC<DeletePlanConfirmationModalProps> = ({
  characterKey,
  onClose,
  onConfirm,
}) => {
  const charData = lookupChar(characterKey) || {
    name: characterKey,
    rarity: 5,
    element: 'None',
    id: '',
  };

  const elementClass = charData.element ? charData.element.toLowerCase() : 'none';
  const rarity = charData.rarity || 5;

  // Dynamic header nameplate colors matching the 4* and 5* logic
  const nameplateGradient = rarity === 4
    ? 'linear-gradient(135deg, #7b6a99 0%, #5a4b78 100%)'
    : 'linear-gradient(135deg, #8c6a4a 0%, #735438 100%)';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className={`modal-content delete-confirm-modal bg-element-${elementClass} bg-element-${elementClass}-gradient`}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '380px',
          width: '100%',
          padding: '2rem 1.5rem',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Character Name Badge */}
        <div
          style={{
            background: nameplateGradient,
            color: '#fff',
            padding: '6px 20px',
            borderRadius: '20px',
            fontSize: '1.25rem',
            fontWeight: '700',
            letterSpacing: '0.02em',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            marginBottom: '1.5rem',
            display: 'inline-block',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {charData.name}
        </div>

        {/* Character Large Portrait Avatar Frame */}
        <div
          className={`bg-rarity-${rarity}`}
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '3px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            backgroundPosition: 'center',
            backgroundSize: 'cover',
            position: 'relative',
          }}
        >
          {charData.id ? (
            <img
              src={`${import.meta.env.BASE_URL}characters/${charData.id}.png`}
              alt={charData.name}
              style={{
                width: '110%',
                height: '110%',
                objectFit: 'contain',
                objectPosition: 'bottom',
                transform: 'scale(1.05) translateY(2px)',
              }}
              onError={(e) => {
                const target = e.currentTarget;
                if (!target.dataset.fallback) {
                  target.dataset.fallback = 'enka';
                  target.src = `https://enka.network/ui/UI_AvatarIcon_${charData.id}.png`;
                } else if (!target.dataset.fallbackUi) {
                  target.dataset.fallbackUi = 'ui';
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(charData.name)}&background=random&color=fff&rounded=true&font-size=0.4`;
                }
              }}
            />
          ) : (
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)' }}>
              {charData.name[0]}
            </div>
          )}
        </div>

        {/* Sub-title Warning Message */}
        <div
          style={{
            fontSize: '1rem',
            color: 'rgba(255, 255, 255, 0.85)',
            lineHeight: '1.5',
            marginBottom: '2rem',
            padding: '0 10px',
            fontWeight: '500',
          }}
        >
          Delete Plan for <strong style={{ color: '#fff', fontWeight: '700' }}>{charData.name}</strong>. Continue?
        </div>

        {/* Buttons Decline / Accept Group */}
        <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
          <button
            onClick={onClose}
            className="delete-modal-btn delete-modal-btn-decline"
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
            }}
          >
            Decline
          </button>
          <button
            onClick={onConfirm}
            className="delete-modal-btn delete-modal-btn-accept"
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #e05252 0%, #c23b3b 100%)',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(224, 82, 82, 0.25)',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(224, 82, 82, 0.4)';
              e.currentTarget.style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(224, 82, 82, 0.25)';
              e.currentTarget.style.filter = 'none';
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};
