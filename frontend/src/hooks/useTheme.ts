import { useThemeStore } from '../stores/useThemeStore';

/**
 * 自定义 Hook 用于访问主题状态
 * 使用 zustand store 管理主题
 */
export const useTheme = () => {
  const theme = useThemeStore((state) => state.theme);
  const mode = useThemeStore((state) => state.mode);
  const setTheme = useThemeStore((state) => state.setTheme);

  return { theme, mode, setTheme };
};
