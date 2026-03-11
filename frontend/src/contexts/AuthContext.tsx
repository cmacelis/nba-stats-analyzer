import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthUser {
  email: string;
  vipActive: boolean;
  vipPlan: string | null;
  vipCurrentPeriodEnd: string | null;
  discordConnected: boolean;
  discordUsername: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
  refetch: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/auth', { credentials: 'same-origin' });
      if (!res.ok) { setUser(null); return; }
      const data = await res.json();
      if (data.authenticated) {
        setUser({
          email: data.email,
          vipActive: data.vipActive,
          vipPlan: data.vipPlan,
          vipCurrentPeriodEnd: data.vipCurrentPeriodEnd,
          discordConnected: data.discordConnected ?? false,
          discordUsername: data.discordUsername ?? null,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMe(); }, [fetchMe]);

  const signOut = useCallback(async () => {
    await fetch('/api/auth', { method: 'DELETE', credentials: 'same-origin' });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refetch: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
};
