import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import SvgIcon from '@mui/material/SvgIcon';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setDrawerOpen((prev) => !prev);
  };

  const handleMenuItemClick = () => {
    setDrawerOpen(false);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={toggleDrawer}
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
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer}>
        <Box sx={{ width: 250 }} role="presentation">
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" component="div">
              菜单
            </Typography>
          </Box>
          <List>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/dashboard"
                onClick={handleMenuItemClick}
              >
                <ListItemText primary="Dashboard" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/stats"
                onClick={handleMenuItemClick}
              >
                <ListItemText primary="Statistics" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/settings"
                onClick={handleMenuItemClick}
              >
                <ListItemText primary="Settings" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/about"
                onClick={handleMenuItemClick}
              >
                <ListItemText primary="About" />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </Box>
  );
};

export default Navbar;
