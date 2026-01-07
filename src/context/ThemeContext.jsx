import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'projectflow-theme-v2';
const LEGACY_KEYS = ['scrumboard-theme', 'projectflow-theme'];

const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    LEGACY_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (_) {
        /* noop */
      }
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    toggleTheme: () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark')),
  }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
