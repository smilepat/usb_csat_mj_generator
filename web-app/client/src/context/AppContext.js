import React, { createContext, useContext, useReducer, useCallback } from 'react';

// 초기 상태
const initialState = {
  // 사용자 인증
  auth: {
    isAuthenticated: false,
    loading: true
  },

  // 전역 알림
  notifications: [],

  // 전역 로딩 상태
  globalLoading: false,

  // 설정
  config: {
    provider: 'gemini',
    model: '',
    loaded: false
  },

  // 최근 작업
  recentActivity: []
};

// 액션 타입
const ActionTypes = {
  SET_AUTH: 'SET_AUTH',
  SET_LOADING: 'SET_LOADING',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  CLEAR_NOTIFICATIONS: 'CLEAR_NOTIFICATIONS',
  SET_CONFIG: 'SET_CONFIG',
  ADD_ACTIVITY: 'ADD_ACTIVITY',
  SET_GLOBAL_LOADING: 'SET_GLOBAL_LOADING'
};

// 리듀서
function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_AUTH:
      return {
        ...state,
        auth: {
          ...state.auth,
          ...action.payload,
          loading: false
        }
      };

    case ActionTypes.SET_LOADING:
      return {
        ...state,
        auth: {
          ...state.auth,
          loading: action.payload
        }
      };

    case ActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [
          ...state.notifications,
          {
            id: Date.now(),
            ...action.payload
          }
        ]
      };

    case ActionTypes.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };

    case ActionTypes.CLEAR_NOTIFICATIONS:
      return {
        ...state,
        notifications: []
      };

    case ActionTypes.SET_CONFIG:
      return {
        ...state,
        config: {
          ...state.config,
          ...action.payload,
          loaded: true
        }
      };

    case ActionTypes.ADD_ACTIVITY:
      return {
        ...state,
        recentActivity: [
          action.payload,
          ...state.recentActivity.slice(0, 9) // 최근 10개만 유지
        ]
      };

    case ActionTypes.SET_GLOBAL_LOADING:
      return {
        ...state,
        globalLoading: action.payload
      };

    default:
      return state;
  }
}

// Context 생성
const AppContext = createContext(null);
const AppDispatchContext = createContext(null);

// Provider 컴포넌트
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppContext.Provider>
  );
}

// 상태 사용 훅
export function useAppState() {
  const context = useContext(AppContext);
  if (context === null) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}

// 디스패치 사용 훅
export function useAppDispatch() {
  const context = useContext(AppDispatchContext);
  if (context === null) {
    throw new Error('useAppDispatch must be used within an AppProvider');
  }
  return context;
}

// 액션 생성 훅
export function useAppActions() {
  const dispatch = useAppDispatch();

  const setAuth = useCallback((authData) => {
    dispatch({ type: ActionTypes.SET_AUTH, payload: authData });
  }, [dispatch]);

  const setLoading = useCallback((loading) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: loading });
  }, [dispatch]);

  const notify = useCallback((message, type = 'info', duration = 5000) => {
    const notification = { message, type, duration };
    dispatch({ type: ActionTypes.ADD_NOTIFICATION, payload: notification });

    if (duration > 0) {
      setTimeout(() => {
        dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: notification.id });
      }, duration);
    }
  }, [dispatch]);

  const notifySuccess = useCallback((message) => {
    notify(message, 'success');
  }, [notify]);

  const notifyError = useCallback((message) => {
    notify(message, 'error', 8000);
  }, [notify]);

  const notifyWarning = useCallback((message) => {
    notify(message, 'warning');
  }, [notify]);

  const removeNotification = useCallback((id) => {
    dispatch({ type: ActionTypes.REMOVE_NOTIFICATION, payload: id });
  }, [dispatch]);

  const clearNotifications = useCallback(() => {
    dispatch({ type: ActionTypes.CLEAR_NOTIFICATIONS });
  }, [dispatch]);

  const setConfig = useCallback((config) => {
    dispatch({ type: ActionTypes.SET_CONFIG, payload: config });
  }, [dispatch]);

  const addActivity = useCallback((activity) => {
    dispatch({
      type: ActionTypes.ADD_ACTIVITY,
      payload: {
        ...activity,
        timestamp: new Date().toISOString()
      }
    });
  }, [dispatch]);

  const setGlobalLoading = useCallback((loading) => {
    dispatch({ type: ActionTypes.SET_GLOBAL_LOADING, payload: loading });
  }, [dispatch]);

  return {
    setAuth,
    setLoading,
    notify,
    notifySuccess,
    notifyError,
    notifyWarning,
    removeNotification,
    clearNotifications,
    setConfig,
    addActivity,
    setGlobalLoading
  };
}

// 편의를 위한 통합 훅
export function useApp() {
  const state = useAppState();
  const actions = useAppActions();

  return { ...state, ...actions };
}

export default AppContext;
