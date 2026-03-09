'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { setTokenGetter } from '@/lib/apiClient';

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  email_verified: boolean;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({}),
  signup: async () => ({}),
  logout: async () => {},
  getAccessToken: () => null,
  updateUser: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const accessTokenRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Wire the API client token getter
  useEffect(() => {
    setTokenGetter(() => accessTokenRef.current);
  }, []);

  // Schedule token refresh 1 minute before expiry (token lasts 15min)
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          accessTokenRef.current = data.accessToken;
          setUser(data.user);
          scheduleRefresh();
        } else {
          accessTokenRef.current = null;
          setUser(null);
          if (pathname !== '/login' && pathname !== '/signup') {
            router.push('/login');
          }
        }
      } catch {
        // Silently fail, next API call will trigger redirect
      }
    }, 13 * 60 * 1000); // refresh at 13 minutes (2 min before 15min expiry)
  }, [router, pathname]);

  // Check session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        // Try to refresh token (uses httpOnly cookie)
        const res = await fetch('/api/auth/refresh', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          accessTokenRef.current = data.accessToken;
          setUser(data.user);
          scheduleRefresh();
        }
      } catch {
        // No valid session
      } finally {
        setLoading(false);
      }
    }
    checkSession();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleRefresh]);

  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          return { error: data.error || 'Login failed' };
        }

        accessTokenRef.current = data.accessToken;
        setUser(data.user);
        scheduleRefresh();
        router.push('/');
        return {};
      } catch {
        return { error: 'Network error. Please try again.' };
      }
    },
    [router, scheduleRefresh]
  );

  const signup = useCallback(
    async (name: string, email: string, password: string): Promise<{ error?: string }> => {
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
          return { error: data.error || 'Signup failed' };
        }

        accessTokenRef.current = data.accessToken;
        setUser(data.user);
        scheduleRefresh();
        router.push('/');
        return {};
      } catch {
        return { error: 'Network error. Please try again.' };
      }
    },
    [router, scheduleRefresh]
  );

  const getAccessToken = useCallback(() => {
    return accessTokenRef.current;
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => prev ? { ...prev, ...updates } : prev);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Continue with local logout regardless
    }
    accessTokenRef.current = null;
    setUser(null);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, getAccessToken, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
