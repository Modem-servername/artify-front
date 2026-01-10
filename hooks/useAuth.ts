/**
 * Authentication Hook
 * 사용자 인증 상태 관리
 */

import { useState, useEffect, useCallback } from 'react';
import { authApi, User, getAccessToken, setAccessToken, removeAccessToken } from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface UseAuthReturn extends AuthState {
  login: () => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  });

  // 인증 상태 확인
  const checkAuth = useCallback(async () => {
    const token = getAccessToken();

    if (!token) {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      });
      return;
    }

    try {
      const user = await authApi.getCurrentUser();
      setState({
        user,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
    } catch (error) {
      // 토큰이 유효하지 않으면 삭제
      removeAccessToken();
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  }, []);

  // Google OAuth 로그인
  const login = useCallback(() => {
    authApi.loginWithGoogle();
  }, []);

  // 로그아웃
  const logout = useCallback(() => {
    authApi.logout();
    setState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
    });
  }, []);

  // OAuth 콜백 처리 및 초기 인증 상태 확인 (중복 호출 방지를 위해 하나의 useEffect로 통합)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    // access_token 또는 token 파라미터 모두 지원
    const token = urlParams.get('access_token') || urlParams.get('token');

    if (token) {
      setAccessToken(token);
      // URL에서 토큰 파라미터 제거
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 토큰 저장 후 인증 상태 확인 (OAuth 콜백이든 기존 토큰이든 한 번만 호출)
    checkAuth();
  }, [checkAuth]);

  return {
    ...state,
    login,
    logout,
    checkAuth,
  };
}

export default useAuth;
