import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { lazy, Suspense, useMemo } from 'react';
import { Route, Routes } from 'react-router';
import './App.css';
import Navbar from './components/Navbar';
import { useThemeMode } from './hooks/useThemeMode';
import { createMuiTheme } from './theme/muiTheme';

const Home = lazy(() => import('./pages/Home'));

function App() {
  // 监听 DaisyUI 主题变化
  const mode = useThemeMode();

  // 创建 MUI 主题（仅在 mode 变化时重新创建）
  const theme = useMemo(() => createMuiTheme(mode), [mode]);

  return (
    <ThemeProvider theme={theme}>
      <main className="max-h-screen flex flex-col overflow-hidden">
        {/* CssBaseline 为 MUI 提供一致的基础样式 */}
        <CssBaseline />
        <Navbar />
        <div className="grow overflow-auto">
          <Routes>
            <Route
              path="/"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <Home />
                </Suspense>
              }
            />
          </Routes>
        </div>
      </main>
    </ThemeProvider>
  );
}

export default App;
