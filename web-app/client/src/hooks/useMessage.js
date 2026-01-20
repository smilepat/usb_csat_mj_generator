import { useState, useCallback } from 'react';

/**
 * 메시지 표시 관련 훅
 */
function useMessage(autoHideDelay = 5000) {
  const [message, setMessage] = useState(null);

  const showMessage = useCallback((text, type = 'success') => {
    setMessage({ text, type });

    if (autoHideDelay > 0) {
      setTimeout(() => {
        setMessage(null);
      }, autoHideDelay);
    }
  }, [autoHideDelay]);

  const showSuccess = useCallback((text) => {
    showMessage(text, 'success');
  }, [showMessage]);

  const showError = useCallback((text) => {
    showMessage(text, 'error');
  }, [showMessage]);

  const clearMessage = useCallback(() => {
    setMessage(null);
  }, []);

  return {
    message,
    showMessage,
    showSuccess,
    showError,
    clearMessage
  };
}

export default useMessage;
