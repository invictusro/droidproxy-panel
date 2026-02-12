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
  });

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const response = await api.getMe();
      setState({
        user: response.data.user as User,
        token,
        centrifugoToken: response.data.centrifugo_token || null,
        centrifugoUrl: response.data.centrifugo_url || null,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      localStorage.removeItem('token');
      setState({
        user: null,
        token: null,
        centrifugoToken: null,
        centrifugoUrl: null,
        isLoading: false,
        isAuthenticated: false,
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
    setState({
      user: null,
      token: null,
      centrifugoToken: null,
      centrifugoUrl: null,
      isLoading: false,
      isAuthenticated: false,
    });
  }, []);

  return {
    ...state,
    login,
    logout,
    refetch: fetchUser,
  };
}
