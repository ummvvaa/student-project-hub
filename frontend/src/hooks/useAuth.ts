'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { getToken, setToken, removeToken, getUser, setUser, removeUser } from '../lib/auth';
import { User, AuthResponse } from '../types';

interface RegisterPayload {
  fullName: string;
  email:    string;
  password: string;
  role?:    'STUDENT' | 'TEACHER';
  skills?:  string[];
}

interface LoginPayload {
  email:    string;
  password: string;
}

interface UseAuthReturn {
  user:     User | null;
  loading:  boolean;
  login:    (payload: LoginPayload) => Promise<void>;
  logout:   () => void;
  register: (payload: RegisterPayload) => Promise<void>;
  refresh:  () => Promise<void>;
}

// Module-level pub/sub: any caller of triggerAuthRefresh() causes every
// mounted useAuth() instance to refetch /auth/me. Used after task completion
// (gamification awards) so the Navbar's points stay in sync.
const refreshListeners = new Set<() => void>();

export function triggerAuthRefresh(): void {
  refreshListeners.forEach((fn) => fn());
}

export function useAuth(): UseAuthReturn {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async (): Promise<void> => {
    if (!getToken()) return;
    try {
      const { data } = await api.get<{ user: User }>('/auth/me');
      setUserState(data.user);
      setUser(data.user);
    } catch {
      // 401 handled by axios interceptor; ignore other failures
    }
  }, []);

  // On mount: restore cached user, then verify with server
  useEffect(() => {
    const token  = getToken();
    const cached = getUser();

    if (!token) {
      setLoading(false);
      return;
    }

    if (cached) setUserState(cached);

    refresh().finally(() => setLoading(false));
  }, [refresh]);

  // Subscribe to global refresh trigger
  useEffect(() => {
    const cb = () => { void refresh(); };
    refreshListeners.add(cb);
    return () => { refreshListeners.delete(cb); };
  }, [refresh]);

  const login = useCallback(
    async (payload: LoginPayload): Promise<void> => {
      const { data } = await api.post<AuthResponse>('/auth/login', payload);
      setToken(data.token);
      setUser(data.user);
      setUserState(data.user);
      toast.success(`Добро пожаловать, ${data.user.fullName}!`);
      router.push('/dashboard');
    },
    [router],
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<void> => {
      const { data } = await api.post<AuthResponse>('/auth/register', payload);
      setToken(data.token);
      setUser(data.user);
      setUserState(data.user);
      toast.success('Аккаунт создан!');
      router.push('/dashboard');
    },
    [router],
  );

  const logout = useCallback((): void => {
    removeToken();
    removeUser();
    setUserState(null);
    router.push('/login');
  }, [router]);

  return { user, loading, login, logout, register, refresh };
}
