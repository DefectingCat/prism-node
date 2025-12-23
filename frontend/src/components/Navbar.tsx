import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import SvgIcon from '@mui/material/SvgIcon';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { lazy, Suspense } from 'react';
import ThemeToggleLoading from './ThemeToggleLoading';

const LazyThemeToggle = lazy(() => import('./ThemeToggle'));

const MenuIcon = () => (
  <SvgIcon>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4 6h16M4 12h16M4 18h16"
      fill="none"
      stroke="currentColor"
    />
  </SvgIcon>
);

const Navbar = () => {
  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Prism Node
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Suspense fallback={<ThemeToggleLoading />}>
            <LazyThemeToggle />
          </Suspense>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
