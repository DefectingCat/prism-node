import { Box, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import Button from '@mui/material/Button';
import { useEffect, useState } from 'react';
import viteLogo from '/vite.svg';
import reactLogo from '../assets/react.svg';

const Home = () => {
  const [count, setCount] = useState(0);
  const [currentTheme, setCurrentTheme] = useState<string>('light');

  // 监听主题变化
  useEffect(() => {
    const updateTheme = () => {
      const theme =
        document.documentElement.getAttribute('data-theme') || 'light';
      setCurrentTheme(theme);
    };

    // 初始化主题
    updateTheme();

    // 监听 DOM 变化
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-base-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Logo section */}
        <div className="flex justify-center gap-8 mb-8">
          <a href="https://vite.dev" target="_blank" rel="noopener">
            <img src={viteLogo} className="h-24 w-24" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank" rel="noopener">
            <img src={reactLogo} className="h-24 w-24" alt="React logo" />
          </a>
        </div>

        {/* MUI 组件测试区域 */}
        <Box sx={{ mb: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>
                MUI 组件暗色模式测试
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                这些是 Material-UI 组件，会自动响应暗色模式切换
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Button variant="contained" color="primary">
                  Primary Button
                </Button>
                <Button variant="contained" color="secondary">
                  Secondary Button
                </Button>
                <Button variant="outlined" color="primary">
                  Outlined Button
                </Button>
                <Button variant="text" color="primary">
                  Text Button
                </Button>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Chip label="Default Chip" />
                <Chip label="Primary Chip" color="primary" />
                <Chip label="Secondary Chip" color="secondary" />
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Button variant="contained">Hello world</Button>

        {/* Title */}
        <h1 className="text-4xl font-bold text-center mb-8 text-base-content">
          Vite + React
        </h1>

        {/* Dark mode test card */}
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title text-base-content">深色模式测试</h2>
            <p className="text-base-content/70">
              这是一个测试深色模式的卡片组件。切换主题以查看效果。
            </p>
            <div className="stats stats-vertical lg:stats-horizontal shadow mb-4">
              <div className="stat">
                <div className="stat-title">当前主题</div>
                <div className="stat-value text-primary">{currentTheme}</div>
                <div className="stat-desc">DaisyUI data-theme 属性</div>
              </div>
              <div className="stat">
                <div className="stat-title">计数器</div>
                <div className="stat-value text-secondary">{count}</div>
                <div className="stat-desc">点击按钮增加</div>
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCount((count) => count + 1)}
              >
                计数: {count}
              </button>
              <button type="button" className="btn btn-secondary">
                次要按钮
              </button>
              <button type="button" className="btn btn-accent">
                强调按钮
              </button>
            </div>
          </div>
        </div>

        {/* Color showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card bg-primary text-primary-content">
            <div className="card-body">
              <h3 className="card-title">主色调</h3>
              <p>Primary Color</p>
            </div>
          </div>
          <div className="card bg-secondary text-secondary-content">
            <div className="card-body">
              <h3 className="card-title">次要色</h3>
              <p>Secondary Color</p>
            </div>
          </div>
          <div className="card bg-accent text-accent-content">
            <div className="card-body">
              <h3 className="card-title">强调色</h3>
              <p>Accent Color</p>
            </div>
          </div>
        </div>

        {/* Tailwind dark: prefix test */}
        <div className="card bg-white dark:bg-gray-800 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title text-gray-900 dark:text-gray-100">
              Tailwind dark: 前缀测试
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              这个卡片使用了 Tailwind 的 dark: 前缀类。
            </p>
            <div className="flex gap-2 mt-4">
              <div className="badge badge-primary">Primary Badge</div>
              <div className="badge badge-secondary">Secondary Badge</div>
              <div className="badge badge-accent">Accent Badge</div>
            </div>
          </div>
        </div>

        {/* Info section */}
        <div className="alert alert-info mb-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            编辑{' '}
            <code className="bg-base-300 px-2 py-1 rounded">src/App.tsx</code>{' '}
            并保存以测试 HMR
          </span>
        </div>

        <p className="text-center text-base-content/50">
          点击 Vite 和 React 的 logo 以了解更多
        </p>
      </div>
    </div>
  );
};

export default Home;
