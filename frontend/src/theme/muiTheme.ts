import { createTheme } from '@mui/material/styles';

/**
 * 创建 MUI 主题实例
 * @param mode - 主题模式：'light' 或 'dark'
 * @returns MUI 主题对象
 */
export const createMuiTheme = (mode: 'light' | 'dark') => {
  return createTheme({
    palette: {
      mode,
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
    },
  });
};
