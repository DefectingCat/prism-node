import { create } from 'zustand';

/**
 * 主题 Store 类型
 */
interface ThemeStore {
  theme: string;
  mode: 'light' | 'dark';
  setTheme: (theme: string) => void;
}

/**
 * 获取初始主题值
 */
const getInitialTheme = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('theme') || 'system';
  }
  return 'system';
};

/**
 * 计算初始 mode
 */
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

/**
 * 应用主题到 DOM
 */
const applyTheme = (themeValue: string): 'light' | 'dark' => {
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
};

/**
 * 主题 Store
 * 管理全局主题状态（light/dark/system）
 */
export const useThemeStore = create<ThemeStore>((set) => {
  // 初始化主题
  const initialTheme = getInitialTheme();
  const initialMode = getInitialMode();

  // 应用初始主题
  if (typeof window !== 'undefined') {
    applyTheme(initialTheme);
  }

  // 监听系统主题变化
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const currentTheme = useThemeStore.getState().theme;
      if (currentTheme === 'system') {
        const newMode = mediaQuery.matches ? 'dark' : 'light';
        const htmlElement = document.documentElement;
        htmlElement.classList.remove('light', 'dark');
        htmlElement.classList.add(newMode);
        set({ mode: newMode });
      }
    };
    mediaQuery.addEventListener('change', handleChange);
  }

  return {
    theme: initialTheme,
    mode: initialMode,
    setTheme: (newTheme: string) => {
      const appliedMode = applyTheme(newTheme);
      localStorage.setItem('theme', newTheme);
      set({ theme: newTheme, mode: appliedMode });
    },
  };
});
