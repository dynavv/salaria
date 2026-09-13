import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeId = 'ocean_depths' | 'github_light';

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
    name: 'Chế độ Tối',
    subtitle: 'Deep Navy, Slate & Emerald Glow',
    icon: '🌙',
    previewColors: ['#0d1520', '#162131', '#10b981'],
  },
  {
    id: 'github_light',
    name: 'Chế độ Sáng',
    subtitle: 'Clean Canvas, Subtle Borders & Primer Blue',
    icon: '☀️',
    previewColors: ['#ffffff', '#f6f8fa', '#0969da'],
  },
];

interface ThemeContextType {
  currentTheme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  toggleTheme: () => void;
  themes: ThemeOption[];
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: 'ocean_depths',
  setTheme: () => {},
  toggleTheme: () => {},
  themes: THEMES,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('finance_theme_2026') as ThemeId;
    return saved === 'github_light' ? 'github_light' : 'ocean_depths';
  });

  useEffect(() => {
    localStorage.setItem('finance_theme_2026', currentTheme);
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  const toggleTheme = () => {
    setCurrentTheme((prev) => (prev === 'ocean_depths' ? 'github_light' : 'ocean_depths'));
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme: setCurrentTheme, toggleTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

