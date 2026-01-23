// src/contexts/ThemeContext.tsx
// 主题上下文
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'blue' | 'yellow' | 'green';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * 主题上下文Provider
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('blue');
  const [mounted, setMounted] = useState(false);

  // 从localStorage读取主题
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme && ['blue', 'yellow', 'green'].includes(savedTheme)) {
        setThemeState(savedTheme);
      }
    }
  }, []);

  // 保存主题到localStorage并更新body类名
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
      // 更新body类名
      document.body.classList.remove('theme-blue', 'theme-yellow', 'theme-green');
      document.body.classList.add(`theme-${newTheme}`);
    }
  };

  // 初始化主题类名
  useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      document.body.classList.add(`theme-${theme}`);
    }
  }, [mounted, theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * 使用主题的hook
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
