import React from 'react';

function Modal({ isOpen, onClose, title, children, width = '600px' }) {
  if (!isOpen) return null;

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  };

  const modalStyle = {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: width,
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
  };

  const headerStyle = {
    padding: '16px 20px',
    borderBottom: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa'
  };

  const titleStyle = {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#333'
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '0 4px',
    lineHeight: 1
  };

  const contentStyle = {
    padding: '20px',
    overflowY: 'auto',
    flex: 1
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div style={overlayStyle} onClick={handleOverlayClick}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h3 style={titleStyle}>{title}</h3>
          <button style={closeButtonStyle} onClick={onClose}>
            &times;
          </button>
        </div>
        <div style={contentStyle}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
