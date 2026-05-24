import React from 'react';


interface DeletePlanConfirmationModalProps {
  itemName: string;
  itemRarity: number;
  itemIconSrc: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeletePlanConfirmationModal: React.FC<DeletePlanConfirmationModalProps> = ({
  itemName,
  itemRarity,
  itemIconSrc,
  onClose,
  onConfirm,
}) => {
  // Dynamic header nameplate colors matching 3*, 4*, and 5* logic
  const nameplateGradient = itemRarity === 5
    ? 'linear-gradient(135deg, #8c6a4a 0%, #735438 100%)'
    : itemRarity === 4
    ? 'linear-gradient(135deg, #7b6a99 0%, #5a4b78 100%)'
    : 'linear-gradient(135deg, #3d3f45 0%, #2e3035 100%)';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content delete-confirm-modal"
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
          background: '#1b1d28',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Item Name Badge */}
        <div
          style={{
            background: nameplateGradient,
            color: '#fff',
            padding: '6px 20px',
            borderRadius: '20px',
            fontSize: '1.15rem',
            fontWeight: '700',
            letterSpacing: '0.02em',
            boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            marginBottom: '1.5rem',
            display: 'inline-block',
            border: '1px solid rgba(255,255,255,0.1)',
            maxWidth: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {itemName}
        </div>

        {/* Large Portrait Avatar Frame */}
        <div
          className={`bg-rarity-${itemRarity}`}
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
          <img
            src={itemIconSrc}
            alt={itemName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'bottom',
              transform: 'scale(1.15) translateY(2px)',
            }}
            onError={(e) => {
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(itemName)}&background=random&color=fff&rounded=true&font-size=0.4`;
            }}
          />
        </div>

        {/* Warning Message */}
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
          Delete Plan for <strong style={{ color: '#fff', fontWeight: '700' }}>{itemName}</strong>. Continue?
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

