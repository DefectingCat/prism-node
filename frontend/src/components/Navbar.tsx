import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggleLoading from './ThemeToggleLoading';

const LazyThemeToggle = lazy(() => import('./ThemeToggle'));

const Navbar = () => {
  const { t } = useTranslation();
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
            <span className="icon-[material-symbols-light--menu]"></span>
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('navbar.title')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LanguageSwitcher />
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
              {t('navbar.menu')}
            </Typography>
          </Box>
          <List>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/dashboard"
                onClick={handleMenuItemClick}
              >
                <span className="icon-[material-symbols-light--space-dashboard]"></span>
                <ListItemText primary={t('navbar.dashboard')} sx={{ ml: 1 }} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/stats"
                onClick={handleMenuItemClick}
              >
                <span className="icon-[material-symbols-light--query-stats-rounded]"></span>
                <ListItemText primary={t('navbar.statistics')} sx={{ ml: 1 }} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/logs"
                onClick={handleMenuItemClick}
              >
                <span className="icon-[material-symbols-light--lab-profile]"></span>
                <ListItemText primary={t('navbar.logs')} sx={{ ml: 1 }} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/settings"
                onClick={handleMenuItemClick}
              >
                <span className="icon-[material-symbols-light--settings]"></span>
                <ListItemText primary={t('navbar.settings')} sx={{ ml: 1 }} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton
                component={Link}
                to="/about"
                onClick={handleMenuItemClick}
              >
                <span className="icon-[ix--about-filled]"></span>
                <ListItemText primary={t('navbar.about')} sx={{ ml: 1 }} />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      </Drawer>
    </Box>
  );
};

export default Navbar;
