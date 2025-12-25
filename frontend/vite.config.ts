import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
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

      // 使用更快的 CSS 压缩器
      cssMinify: 'lightningcss',

      // 设置 chunk 大小警告限制（单位：KB）- 降低阈值及时发现过大的 chunk
      chunkSizeWarningLimit: 800,

      // Rollup 打包配置
      rollupOptions: {
        output: {
          // 手动配置代码分割策略
          manualChunks: {
            // React 核心库
            'react-vendor': [
              'react',
              'react-dom',
              'react-router-dom',
              'react-router',
            ],

            // Material-UI 核心
            'mui-core': ['@mui/material', '@emotion/react', '@emotion/styled'],

            // Material-UI Charts（大型库，单独分割）
            'mui-charts': ['@mui/x-charts'],

            // Material-UI Date Pickers
            'mui-pickers': [
              '@mui/x-date-pickers',
              '@mui/x-date-pickers-pro',
              'dayjs',
            ],

            // 国际化相关
            i18n: ['i18next', 'react-i18next'],

            // 数据请求与状态管理
            'data-fetching': ['axios', 'swr'],

            // 工具库
            utils: ['es-toolkit'],
          },

          // 优化输出文件命名
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',

          // 合并小于 20KB 的 chunk
          experimentalMinChunkSize: 20000,

          // 优化导出模式
          exports: 'named',

          // 严格模式
          strict: true,
        },
      },

      // 预加载策略
      modulePreload: {
        polyfill: true,
        resolveDependencies: (_, deps) => {
          // 预加载关键 chunk
          return deps.filter(
            (dep) => dep.includes('react-vendor') || dep.includes('mui-core'),
          );
        },
      },

      // sourcemap 配置：生产环境使用 hidden（方便线上调试）
      sourcemap: isProduction ? 'hidden' : true,

      // 资源内联阈值（小于 4KB 的资源将被内联为 base64）
      assetsInlineLimit: 4096,

      // 生产环境禁用压缩大小报告，提升构建速度 30-40%
      reportCompressedSize: !isProduction,

      // 代码压缩
      minify: isProduction ? 'esbuild' : false,

      // 目标浏览器（使用现代浏览器目标，减少 polyfill）
      target: 'es2020',
    },

    // 开发服务器配置
    server: {
      // 服务器主机名
      host: true,

      // 端口号
      port: 5173,

      // 端口被占用时是否自动尝试下一个可用端口
      strictPort: false,

      // HMR 配置优化
      hmr: {
        overlay: true, // 显示错误覆盖层
      },

      // 预热常用文件，提升首次访问速度
      warmup: {
        clientFiles: [
          './src/App.tsx',
          './src/main.tsx',
          './src/pages/*.tsx',
          './src/components/*.tsx',
        ],
      },

      // 代理配置
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          timeout: 30000, // 30秒超时

          // 配置代理请求头
          configure: (proxy) => {
            // 仅在开发模式下输出详细日志
            if (process.env.VITE_DEBUG) {
              proxy.on('error', (err) => {
                console.log('代理错误', err);
              });
              proxy.on('proxyReq', (_proxyReq, req) => {
                console.log('发送请求:', req.method, req.url);
              });
              proxy.on('proxyRes', (proxyRes, req) => {
                console.log('收到响应:', proxyRes.statusCode, req.url);
              });
            } else {
              // 静默模式，仅输出错误
              proxy.on('error', (err) => {
                console.error('代理错误:', err.message);
              });
            }
          },
        },
      },

      // CORS 配置
      cors: true,

      // 文件监听优化
      watch: {
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      },
    },

    // 预构建优化
    optimizeDeps: {
      // 预构建包含的依赖
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'react-router',
        '@mui/material',
        '@mui/material/styles',
        '@mui/material/Box',
        '@mui/material/IconButton',
        '@mui/material/Typography',
        '@emotion/react',
        '@emotion/styled',
        'axios',
        'i18next',
        'react-i18next',
        'swr',
        'dayjs',
        'es-toolkit',
      ],

      // 排除不需要预构建的依赖（按需加载）
      exclude: ['@mui/x-date-pickers-pro'],

      // 优化 esbuild 配置
      esbuildOptions: {
        target: 'es2020',
        supported: {
          'top-level-await': true,
        },
      },
    },

    // esbuild 性能优化
    esbuild: {
      // 生产环境移除 debugger
      drop: isProduction ? ['debugger'] : [],

      // 压缩标识符
      minifyIdentifiers: isProduction,

      // 压缩语法
      minifySyntax: isProduction,

      // 压缩空白
      minifyWhitespace: isProduction,
    },

    // 缓存优化
    cacheDir: 'node_modules/.vite',
  };
});
