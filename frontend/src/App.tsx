import { Route, Routes } from 'react-router';
import './App.css';
import Navbar from './components/Navbar';
import { lazy, Suspense } from 'react';

const Home = lazy(() => import('./pages/Home'));

function App() {
  return (
    <>
      <Navbar />
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
    </>
  );
}

export default App;
