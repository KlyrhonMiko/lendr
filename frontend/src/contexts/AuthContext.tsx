'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, User } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: (redirectTo?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (!auth.isAuthenticated()) {
      setUser(null);
      setLoading(false);
      return;
    }

    const userData = await auth.getUser();
    setUser(userData);
    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    const initializeUser = async () => {
      if (!auth.isAuthenticated()) {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      const token = auth.getToken();
      if (token) {
        auth.setupTokenTimer(token);
      }
      
      const userData = await auth.getUser();
      if (mounted) {
        setUser(userData);
        setLoading(false);
      }
    };

    void initializeUser();

    return () => {
      mounted = false;
    };
  }, []);

  const logout = async (redirectTo = '/auth/login') => {
    setUser(null);
    await auth.logout(redirectTo);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
