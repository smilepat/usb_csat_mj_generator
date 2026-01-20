import React from 'react';

function LoadingSpinner({ message = '로딩 중...', size = 'medium' }) {
  const sizeStyles = {
    small: { width: '20px', height: '20px', borderWidth: '2px' },
    medium: { width: '40px', height: '40px', borderWidth: '3px' },
    large: { width: '60px', height: '60px', borderWidth: '4px' }
  };

  const spinnerStyle = {
    ...sizeStyles[size],
    border: `${sizeStyles[size].borderWidth} solid #f3f3f3`,
    borderTop: `${sizeStyles[size].borderWidth} solid #3498db`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto'
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={spinnerStyle}></div>
      {message && <p style={{ marginTop: '10px', color: '#666' }}>{message}</p>}
    </div>
  );
}

export default LoadingSpinner;
