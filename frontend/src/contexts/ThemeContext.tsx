import { createContext, useCallback, useEffect, useState } from 'react';

/**
 * 主题上下文类型
 */
export interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
  mode: 'light' | 'dark';
}

/**
 * 创建主题上下文
 */
export const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined,
);

/**
 * 主题上下文 Provider
 * 管理全局主题状态（light/dark/system）
 */
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // 初始化主题值
  const getInitialTheme = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'system';
    }
    return 'system';
  };

  // 计算初始 mode
  const getInitialMode = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') || 'system';
      if (savedTheme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }
      return savedTheme as 'light' | 'dark';
    }
    return 'light';
  };

  const [theme, setThemeState] = useState<string>(getInitialTheme);
  const [mode, setMode] = useState<'light' | 'dark'>(getInitialMode);

  /**
   * 应用主题到 DOM
   */
  const applyTheme = useCallback((themeValue: string) => {
    const htmlElement = document.documentElement;
    htmlElement.classList.remove('light', 'dark');

    let appliedTheme: 'light' | 'dark' = 'light';
    if (themeValue === 'system') {
      appliedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } else {
      appliedTheme = themeValue as 'light' | 'dark';
    }

    htmlElement.classList.add(appliedTheme);
    return appliedTheme;
  }, []);

  /**
   * 设置新主题
   */
  const setTheme = useCallback(
    (newTheme: string) => {
      setThemeState(newTheme);
      const appliedMode = applyTheme(newTheme);
      setMode(appliedMode);
      localStorage.setItem('theme', newTheme);
    },
    [applyTheme],
  );

  // 监听系统主题变化
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const newMode = mediaQuery.matches ? 'dark' : 'light';
        const htmlElement = document.documentElement;
        htmlElement.classList.remove('light', 'dark');
        htmlElement.classList.add(newMode);
        setMode(newMode);
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mode }}>
      {children}
    </ThemeContext.Provider>
  );
};
