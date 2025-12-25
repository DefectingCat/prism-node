import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const isProduction = process.env.NODE_ENV === 'production';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // 启用 React 开发工具的性能优化
      babel: isProduction
        ? {
            plugins: [
              // 生产环境移除 console
              ['transform-remove-console', { exclude: ['error', 'warn'] }],
            ],
          }
        : {},
    }),
    tailwindcss(),
  ],

  // 构建优化配置
  build: {
    // 启用 CSS 代码分割
    cssCodeSplit: true,

    // 设置 chunk 大小警告限制（单位：KB）
    chunkSizeWarningLimit: 1000,

    // Rollup 打包配置
    rollupOptions: {
      output: {
        // 手动配置代码分割策略
        manualChunks: {
          // React 核心库
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Material-UI 核心
          'mui-core': ['@mui/material', '@emotion/react', '@emotion/styled'],

          // Material-UI Charts
          'mui-charts': ['@mui/x-charts'],

          // 国际化相关
          i18n: ['i18next', 'react-i18next'],

          // 工具库
          utils: ['axios'],
        },

        // 优化输出文件命名
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },

    // sourcemap 配置：生产环境使用 hidden，开发环境自动使用 eval
    sourcemap: process.env.NODE_ENV === 'production' ? 'hidden' : true,

    // 资源内联阈值（小于 4KB 的资源将被内联为 base64）
    assetsInlineLimit: 4096,

    // 启用/禁用 brotli 压缩大小报告
    reportCompressedSize: true,

    // 启用/禁用 gzip 压缩大小报告
    minify: 'esbuild',

    // 目标浏览器
    target: 'es2015',
  },

  // 开发服务器配置
  server: {
    // 服务器主机名
    host: true,

    // 端口号
    port: 5173,

    // 端口被占用时是否自动尝试下一个可用端口
    strictPort: false,

    // 代理配置
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),

        // 配置代理请求头
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('代理错误', err);
          });
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log('发送请求:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('收到响应:', proxyRes.statusCode, req.url);
          });
        },
      },
    },

    // CORS 配置
    cors: true,
  },

  // 预构建优化
  optimizeDeps: {
    // 预构建包含的依赖
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
      'axios',
      'i18next',
      'react-i18next',
    ],

    // 排除预构建的依赖
    exclude: [],
  },
});
