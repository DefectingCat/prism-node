import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

/**
 * 自定义 Hook 用于访问主题上下文
 * 必须在 ThemeProvider 内部使用
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
