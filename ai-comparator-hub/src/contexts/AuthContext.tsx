import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, AuthResult, UsageStats, SubscriptionTier } from '@/lib/api';

interface User {
  id: string;
  email: string;
  subscriptionTier: SubscriptionTier;
}

interface AuthContextType {
  user: User | null;
  usage: UsageStats | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUsage: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      if (api.isAuthenticated()) {
        try {
          const usageData = await api.getUsage();
          const subData = await api.getSubscription();
          setUser({
            id: '', // We don't have this from usage endpoint
            email: '', // We don't have this from usage endpoint
            subscriptionTier: subData.tier,
          });
          setUsage(usageData);
        } catch {
          // Token invalid, clear it
          api.logout();
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const handleAuthResult = (result: AuthResult) => {
    setUser(result.user);
    setUsage(result.usage);
  };

  const login = async (email: string, password: string) => {
    const result = await api.login(email, password);
    handleAuthResult(result);
  };

  const signup = async (email: string, password: string) => {
    const result = await api.signup(email, password);
    handleAuthResult(result);
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setUsage(null);
  };

  const refreshUsage = async () => {
    if (api.isAuthenticated()) {
      const usageData = await api.getUsage();
      setUsage(usageData);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        usage,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
        refreshUsage,
      }}
    >
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
