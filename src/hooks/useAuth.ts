import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import type { User, AuthState } from '../types';

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    centrifugoToken: null,
    centrifugoUrl: null,
    isLoading: true,
    isAuthenticated: false,
    isImpersonating: localStorage.getItem('isImpersonating') === 'true',
    impersonatingUser: JSON.parse(localStorage.getItem('impersonatingUser') || 'null'),
  });

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const response = await api.getMe();
      const isImpersonating = localStorage.getItem('isImpersonating') === 'true';
      const impersonatingUser = JSON.parse(localStorage.getItem('impersonatingUser') || 'null');
      setState({
        user: response.data.user as User,
        token,
        centrifugoToken: response.data.centrifugo_token || null,
        centrifugoUrl: response.data.centrifugo_url || null,
        isLoading: false,
        isAuthenticated: true,
        isImpersonating,
        impersonatingUser,
      });
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('isImpersonating');
      localStorage.removeItem('impersonatingUser');
      localStorage.removeItem('originalToken');
      setState({
        user: null,
        token: null,
        centrifugoToken: null,
        centrifugoUrl: null,
        isLoading: false,
        isAuthenticated: false,
        isImpersonating: false,
        impersonatingUser: null,
      });
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback((token: string) => {
    localStorage.setItem('token', token);
    setState(prev => ({ ...prev, token }));
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore errors
    }
    localStorage.removeItem('token');
    localStorage.removeItem('isImpersonating');
    localStorage.removeItem('impersonatingUser');
    localStorage.removeItem('originalToken');
    setState({
      user: null,
      token: null,
      centrifugoToken: null,
      centrifugoUrl: null,
      isLoading: false,
      isAuthenticated: false,
      isImpersonating: false,
      impersonatingUser: null,
    });
  }, []);

  return {
    ...state,
    login,
    logout,
    refetch: fetchUser,
  };
}
