// src/theme/ThemeContext.tsx
// Provides the current theme to every component via useTheme() hook
// Persists the user's theme choice to AsyncStorage

import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, getTheme, defaultTheme, type Theme, type ThemeName } from './index';

// ─── CONTEXT TYPE ─────────────────────────────────────────────────────────────

type ThemeContextType = {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
  isDark: boolean;
};

// ─── CONTEXT ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextType>({
  theme: getTheme(defaultTheme),
  themeName: defaultTheme,
  setTheme: () => {},
  isDark: true,
});

// ─── STORAGE KEY ──────────────────────────────────────────────────────────────

const THEME_STORAGE_KEY = '@dayforge_theme';

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(defaultTheme);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved && saved in themes) {
          setThemeName(saved as ThemeName);
        }
      } catch (error) {
        // If storage fails, fall back to default — no crash
        console.warn('Failed to load theme from storage:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadTheme();
  }, []);

  // Save theme whenever it changes
  const setTheme = async (name: ThemeName) => {
    try {
      setThemeName(name);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, name);
    } catch (error) {
      console.warn('Failed to save theme to storage:', error);
    }
  };

  const theme = getTheme(themeName);

  // Don't render children until theme is loaded
  // Prevents a flash of the wrong theme on startup
  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeName,
        setTheme,
        isDark: theme.dark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
