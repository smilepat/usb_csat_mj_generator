import React from 'react';
import { useAppState, useAppActions } from '../../context';

function NotificationContainer() {
  const { notifications } = useAppState();
  const { removeNotification } = useAppActions();

  if (notifications.length === 0) return null;

  const containerStyle = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxWidth: '400px'
  };

  const getNotificationStyle = (type) => {
    const baseStyle = {
      padding: '12px 16px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      animation: 'slideIn 0.3s ease-out'
    };

    const typeStyles = {
      success: {
        backgroundColor: '#d4edda',
        color: '#155724',
        border: '1px solid #c3e6cb'
      },
      error: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        border: '1px solid #f5c6cb'
      },
      warning: {
        backgroundColor: '#fff3cd',
        color: '#856404',
        border: '1px solid #ffeeba'
      },
      info: {
        backgroundColor: '#d1ecf1',
        color: '#0c5460',
        border: '1px solid #bee5eb'
      }
    };

    return { ...baseStyle, ...typeStyles[type] || typeStyles.info };
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    marginLeft: '12px',
    opacity: 0.7,
    color: 'inherit'
  };

  return (
    <>
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(100%);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `}
      </style>
      <div style={containerStyle}>
        {notifications.map((notification) => (
          <div
            key={notification.id}
            style={getNotificationStyle(notification.type)}
          >
            <span>{notification.message}</span>
            <button
              style={closeButtonStyle}
              onClick={() => removeNotification(notification.id)}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

export default NotificationContainer;
