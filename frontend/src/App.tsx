import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { lazy, Suspense, useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import './App.css';
import Navbar from './components/Navbar';
import { useThemeMode } from './hooks/useThemeMode';
import { createMuiTheme } from './theme/muiTheme';

const Home = lazy(() => import('./pages/Home'));
const Stats = lazy(() => import('./pages/Stats'));
const Logs = lazy(() => import('./pages/Logs'));
const Settings = lazy(() => import('./pages/Settings'));
const About = lazy(() => import('./pages/About'));

const AppContent = () => {
  const mode = useThemeMode();
  const theme = useMemo(() => createMuiTheme(mode), [mode]);

  return (
    <MuiThemeProvider theme={theme}>
      <main className="max-h-screen flex flex-col overflow-hidden">
        <CssBaseline />
        <Navbar />
        <div className="grow overflow-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <Home />
                </Suspense>
              }
            />
            <Route
              path="/stats"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <Stats />
                </Suspense>
              }
            />
            <Route
              path="/logs"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <Logs />
                </Suspense>
              }
            />
            <Route
              path="/settings"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <Settings />
                </Suspense>
              }
            />
            <Route
              path="/about"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <About />
                </Suspense>
              }
            />
          </Routes>
        </div>
      </main>
    </MuiThemeProvider>
  );
};

function App() {
  return <AppContent />;
}

export default App;
