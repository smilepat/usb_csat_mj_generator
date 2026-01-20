import React from 'react';

function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  type = 'button',
  style = {}
}) {
  const baseStyle = {
    border: 'none',
    borderRadius: '6px',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    opacity: disabled || loading ? 0.6 : 1
  };

  const sizeStyles = {
    small: { padding: '6px 12px', fontSize: '13px' },
    medium: { padding: '10px 16px', fontSize: '14px' },
    large: { padding: '12px 24px', fontSize: '16px' }
  };

  const variantStyles = {
    primary: {
      backgroundColor: '#4a90d9',
      color: '#fff'
    },
    secondary: {
      backgroundColor: '#6c757d',
      color: '#fff'
    },
    success: {
      backgroundColor: '#28a745',
      color: '#fff'
    },
    danger: {
      backgroundColor: '#dc3545',
      color: '#fff'
    },
    warning: {
      backgroundColor: '#ffc107',
      color: '#333'
    },
    outline: {
      backgroundColor: 'transparent',
      color: '#4a90d9',
      border: '1px solid #4a90d9'
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#666'
    }
  };

  const combinedStyle = {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style
  };

  return (
    <button
      type={type}
      style={combinedStyle}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && (
        <span style={{
          width: '14px',
          height: '14px',
          border: '2px solid currentColor',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      )}
      {children}
    </button>
  );
}

export default Button;
