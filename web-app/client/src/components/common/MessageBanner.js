import React from 'react';

function MessageBanner({ message, onClose }) {
  if (!message) return null;

  const bannerStyle = {
    padding: '12px 16px',
    marginBottom: '16px',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: message.type === 'error' ? '#ffe6e6' : '#e6ffe6',
    border: `1px solid ${message.type === 'error' ? '#ffcccc' : '#ccffcc'}`,
    color: message.type === 'error' ? '#cc0000' : '#006600'
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    color: 'inherit',
    padding: '0 4px'
  };

  return (
    <div style={bannerStyle}>
      <span>{message.text}</span>
      {onClose && (
        <button style={closeButtonStyle} onClick={onClose}>
          &times;
        </button>
      )}
    </div>
  );
}

export default MessageBanner;
