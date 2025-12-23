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
      // 可以在这里自定义颜色以匹配 DaisyUI 主题
      ...(mode === 'light'
        ? {
            // 浅色模式颜色配置
            primary: {
              main: '#570df8', // DaisyUI default primary
            },
            secondary: {
              main: '#f000b8', // DaisyUI default secondary
            },
            background: {
              default: '#ffffff',
              paper: '#ffffff',
            },
          }
        : {
            // 深色模式颜色配置
            primary: {
              main: '#7b92ff', // 调整为深色模式下的 primary
            },
            secondary: {
              main: '#ff71d5', // 调整为深色模式下的 secondary
            },
            background: {
              default: '#1d232a',
              paper: '#191e24',
            },
          }),
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
    components: {
      // 自定义组件样式以更好地集成
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none', // 禁用大写转换
            borderRadius: '0.5rem', // 匹配 DaisyUI 的圆角
          },
        },
      },
    },
  });
};
