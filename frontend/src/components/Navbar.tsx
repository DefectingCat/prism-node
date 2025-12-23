import { lazy, Suspense } from 'react';
import ThemeToggleLoading from './ThemeToggleLoading';

const LazyThemeToggle = lazy(() => import('./ThemeToggle'));

const Navbar = () => {
  return (
    <div className="navbar bg-base-100 shadow-sm">
      <div className="flex-none">
        <button className="btn btn-square btn-ghost" type="button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="inline-block h-5 w-5 stroke-current"
          >
            <title>Menu</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4 6h16M4 12h16M4 18h16"
            ></path>
          </svg>
        </button>
      </div>
      <div className="flex-1">
        <span className="btn btn-ghost text-xl">Prism Node</span>
      </div>
      <div className="flex-none">
        <Suspense fallback={<ThemeToggleLoading />}>
          <LazyThemeToggle />
        </Suspense>
      </div>
    </div>
  );
};

export default Navbar;
