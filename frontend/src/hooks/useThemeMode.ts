import { useEffect, useState } from 'react';

/**
 * 自定义 Hook 用于监听和管理主题模式
 * 监听 DaisyUI 的 data-theme 属性变化，并返回 MUI 可用的模式
 * @returns 当前主题模式（'light' 或 'dark'）
 */
export const useThemeMode = () => {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    // 初始化：从 HTML 元素读取当前主题
    const currentTheme =
      document.documentElement.getAttribute('data-theme') || 'light';
    return currentTheme === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    // 更新主题状态的函数
    const updateTheme = () => {
      const theme =
        document.documentElement.getAttribute('data-theme') || 'light';
      const newMode = theme === 'dark' ? 'dark' : 'light';
      setMode(newMode);
    };

    // 使用 MutationObserver 监听 data-theme 属性变化
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // 清理函数
    return () => observer.disconnect();
  }, []);

  return mode;
};
