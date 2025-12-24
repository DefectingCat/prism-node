import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { lazy, Suspense, useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import './App.css';
import Navbar from './components/Navbar';
import { ThemeProvider } from './contexts/ThemeContext';
import { useThemeMode } from './hooks/useThemeMode';
import { createMuiTheme } from './theme/muiTheme';

const Home = lazy(() => import('./pages/Home'));

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
          </Routes>
        </div>
      </main>
    </MuiThemeProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
