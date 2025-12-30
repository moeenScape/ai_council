import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, Theme } from '@/lib/api';
import { useLocation } from 'react-router-dom';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
}

function applyTheme(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
}

// Public pages that should always be dark
const PUBLIC_PATHS = ['/', '/login', '/signup'];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme;
    return stored || 'dark';
  });
  
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  // Check if user is on a public page
  const isPublicPage = () => {
    const path = window.location.pathname;
    return PUBLIC_PATHS.includes(path);
  };

  // Apply theme based on authentication and page
  useEffect(() => {
    const isAuthenticated = api.isAuthenticated();
    const onPublicPage = isPublicPage();

    // Always use dark theme on public pages (landing, login, signup)
    if (onPublicPage || !isAuthenticated) {
      setResolvedTheme('dark');
      applyTheme('dark');
    } else {
      // Apply user's theme preference when logged in
      const resolved = theme === 'system' ? getSystemTheme() : theme;
      setResolvedTheme(resolved);
      applyTheme(resolved);
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Listen for route changes to update theme
  useEffect(() => {
    const handleRouteChange = () => {
      const isAuthenticated = api.isAuthenticated();
      const onPublicPage = isPublicPage();

      if (onPublicPage || !isAuthenticated) {
        applyTheme('dark');
      } else {
        const resolved = theme === 'system' ? getSystemTheme() : theme;
        applyTheme(resolved);
      }
    };

    // Listen for popstate (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system' && api.isAuthenticated() && !isPublicPage()) {
        const resolved = getSystemTheme();
        setResolvedTheme(resolved);
        applyTheme(resolved);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    
    // Apply immediately if authenticated and not on public page
    if (api.isAuthenticated() && !isPublicPage()) {
      const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
      setResolvedTheme(resolved);
      applyTheme(resolved);
    }
    
    // Save to backend if authenticated
    if (api.isAuthenticated()) {
      try {
        await api.updateTheme(newTheme);
      } catch {
        // Ignore errors, theme is saved locally
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
