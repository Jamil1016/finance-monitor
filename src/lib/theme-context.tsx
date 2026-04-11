'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Theme, themes, getTheme } from './themes';

interface ThemeContextType {
  theme: Theme;
  setThemeId: (id: string) => void;
  showPicker: boolean;
  togglePicker: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: themes[0],
  setThemeId: () => {},
  showPicker: false,
  togglePicker: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(themes[0]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('fintrack_theme');
    if (saved) setTheme(getTheme(saved));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-primary-dark', theme.primaryDark);
    root.style.setProperty('--color-primary-light', theme.primaryLight);
    root.style.setProperty('--color-primary-bg', theme.primaryBg);
    root.style.setProperty('--color-primary-text', theme.primaryText);
    root.style.setProperty('--surface-bg', theme.surfaceBg);
    root.style.setProperty('--surface-card', theme.surfaceCard);
    root.style.setProperty('--surface-input', theme.surfaceInput);

    document.body.style.backgroundColor = theme.surfaceBg;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme.primaryDark);
  }, [theme]);

  const setThemeId = (id: string) => {
    const t = getTheme(id);
    setTheme(t);
    localStorage.setItem('fintrack_theme', id);
  };

  const togglePicker = () => setShowPicker((p) => !p);

  return (
    <ThemeContext.Provider value={{ theme, setThemeId, showPicker, togglePicker }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
