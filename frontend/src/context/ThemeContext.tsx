import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId = 'midnight' | 'ocean_depths' | 'cyberpunk' | 'nordic' | 'espresso';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  subtitle: string;
  icon: string;
  previewColors: string[];
}

export const THEMES: ThemeOption[] = [
  {
    id: 'ocean_depths',
    name: 'Ocean Depths',
    subtitle: 'Deep Navy, Teal & Seafoam',
    icon: '🌊',
    previewColors: ['#0f172a', '#1a2332', '#2d8b8b'],
  },
  {
    id: 'midnight',
    name: 'Midnight Cyber',
    subtitle: 'Slate & Emerald Glow',
    icon: '🌌',
    previewColors: ['#020617', '#0f172a', '#10b981'],
  },
  {
    id: 'cyberpunk',
    name: 'Neon Tokyo',
    subtitle: 'Deep Violet & Cyber Pink',
    icon: '🔮',
    previewColors: ['#090514', '#170b2c', '#a855f7'],
  },
  {
    id: 'nordic',
    name: 'Nordic Forest',
    subtitle: 'Deep Pine & Sage Glass',
    icon: '🌲',
    previewColors: ['#03120c', '#082319', '#10b981'],
  },
  {
    id: 'espresso',
    name: 'Espresso Gold',
    subtitle: 'Mocha Dark & Champagne Gold',
    icon: '☕',
    previewColors: ['#120c08', '#221710', '#fbbf24'],
  },
];

interface ThemeContextType {
  currentTheme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  themes: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: 'ocean_depths',
  setTheme: () => {},
  themes: THEMES,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    return (localStorage.getItem('finance_theme_2026') as ThemeId) || 'ocean_depths';
  });

  useEffect(() => {
    localStorage.setItem('finance_theme_2026', currentTheme);
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme: setCurrentTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
