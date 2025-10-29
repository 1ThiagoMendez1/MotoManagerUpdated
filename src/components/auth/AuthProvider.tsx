'use client';
import React, { useState, useEffect } from 'react';
import { getTenantId } from '@/lib/tenant';

interface User {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, tenantId: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string, tenantId: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signIn = async (email: string, password: string, tenantId: string) => {
    try {
      console.log('🔐 AuthProvider signIn called with:', { email, password, tenantId });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, tenantId }),
        credentials: 'include', // Include cookies
      });

      console.log('📡 AuthProvider response status:', response.status);
      console.log('✅ AuthProvider response ok:', response.ok);

      let data;
      const responseText = await response.text();
      console.log('📄 AuthProvider raw response text:', responseText);

      try {
        data = JSON.parse(responseText);
        console.log('📦 AuthProvider parsed data:', data);
      } catch (jsonError) {
        console.error('❌ AuthProvider JSON parse error:', jsonError);
        return { success: false, error: 'Invalid response format' };
      }

      console.log('👤 AuthProvider data.user exists:', !!data.user);
      console.log('🔑 AuthProvider data.token exists:', !!data.token);

      if (response.ok && data.user && data.token) {
        console.log('🎉 AuthProvider setting user:', data.user);
        setUser(data.user);
        return { success: true };
      } else {
        console.log('❌ AuthProvider returning error:', data.error);
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('💥 Sign in error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const signUp = async (email: string, password: string, name: string, tenantId: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name, tenantId }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return React.useContext(AuthContext);
};
