import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ClearInventoryConfirmationModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export const ClearInventoryConfirmationModal: React.FC<ClearInventoryConfirmationModalProps> = ({
  onClose,
  onConfirm,
}) => {
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
        <div style={{
          background: 'rgba(224, 82, 82, 0.15)',
          borderRadius: '50%',
          padding: '1rem',
          marginBottom: '1.5rem',
          color: '#e05252'
        }}>
          <AlertTriangle size={48} strokeWidth={1.5} />
        </div>

        <div
          style={{
            fontSize: '1.15rem',
            color: '#fff',
            fontWeight: '700',
            marginBottom: '0.5rem',
          }}
        >
          Clear Inventory
        </div>

        <div
          style={{
            fontSize: '0.95rem',
            color: 'rgba(255, 255, 255, 0.7)',
            lineHeight: '1.5',
            marginBottom: '2rem',
            padding: '0 10px',
          }}
        >
          Are you sure you want to clear your materials inventory? This action cannot be undone.
        </div>

        <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
          <button
            onClick={onClose}
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
            Cancel
          </button>
          <button
            onClick={onConfirm}
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
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};
