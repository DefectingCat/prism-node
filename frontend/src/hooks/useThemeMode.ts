import { useThemeStore } from '../stores/useThemeStore';

/**
 * 自定义 Hook 用于获取当前主题模式
 * 从 zustand store 中获取 mode 值（'light' 或 'dark'）
 * @returns 当前主题模式（'light' 或 'dark'）
 */
export const useThemeMode = () => {
  const mode = useThemeStore((state) => state.mode);
  return mode;
};
