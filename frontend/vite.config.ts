import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import viteCompression from 'vite-plugin-compression';
import viteImagemin from 'vite-plugin-imagemin';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react({
        // 启用 React 开发工具的性能优化
        jsxRuntime: 'automatic',
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

      // Gzip 压缩
      viteCompression({
        verbose: true,
        disable: false,
        threshold: 10240, // 10KB 以上才压缩
        algorithm: 'gzip',
        ext: '.gz',
      }),

      // 图片压缩
      viteImagemin({
        gifsicle: { optimizationLevel: 7 },
        optipng: { optimizationLevel: 7 },
        mozjpeg: { quality: 80 },
        pngquant: { quality: [0.8, 0.9], speed: 4 },
        svgo: {
          plugins: [
            { name: 'removeViewBox', active: false },
            { name: 'removeEmptyAttrs', active: false },
          ],
        },
      }),

      // SVG 雪碧图
      // createSvgIconsPlugin({
      //   iconDirs: [path.resolve(process.cwd(), 'src/assets/icons')],
      //   symbolId: 'icon-[dir]-[name]',
      // }),
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
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // 匹配 @scope/package 格式
              const match = id.match(/node_modules\/(@[\w-]+\/[\w-]+|[\w-]+)/);
              if (match) {
                const packageName = match[1].replace('@', '').replace('/', '-');
                return `rua.${packageName}`;
              }
            }
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
