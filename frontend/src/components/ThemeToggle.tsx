import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import SvgIcon from '@mui/material/SvgIcon';
import { useState } from 'react';
import { useTheme } from '../hooks/useTheme';

interface ThemeToggleProps {
  /**
   * 是否显示标签文本
   * @default true
   */
  showLabels?: boolean;

  /**
   * 自定义类名
   */
  className?: string;
}

// SVG 图标组件
const LightModeIcon = () => (
  <SvgIcon>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
      fill="none"
      stroke="currentColor"
    />
  </SvgIcon>
);

const DarkModeIcon = () => (
  <SvgIcon>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
      fill="none"
      stroke="currentColor"
    />
  </SvgIcon>
);

const SystemModeIcon = () => (
  <SvgIcon>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
      fill="none"
      stroke="currentColor"
    />
  </SvgIcon>
);

const CheckIcon = () => (
  <SvgIcon sx={{ fontSize: '1rem' }}>
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
      fill="currentColor"
    />
  </SvgIcon>
);

const ThemeToggle = ({
  showLabels = true,
  className = '',
}: ThemeToggleProps) => {
  const { theme, setTheme } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  // 处理菜单打开
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // 处理菜单关闭
  const handleClose = () => {
    setAnchorEl(null);
  };

  // 处理主题切换
  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    handleClose();
  };

  // 获取当前主题图标
  const getCurrentIcon = () => {
    if (theme === 'light') return <LightModeIcon />;
    if (theme === 'dark') return <DarkModeIcon />;
    return <SystemModeIcon />;
  };

  return (
    <Box className={className}>
      <IconButton
        onClick={handleClick}
        aria-label="theme toggle"
        aria-controls={open ? 'theme-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        color="inherit"
      >
        {getCurrentIcon()}
      </IconButton>
      <Menu
        id="theme-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'theme-button',
          dense: true,
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem
          onClick={() => handleThemeChange('system')}
          selected={theme === 'system'}
        >
          <ListItemIcon>
            <SystemModeIcon />
          </ListItemIcon>
          {showLabels && <ListItemText>System</ListItemText>}
          {theme === 'system' && (
            <Box sx={{ ml: 2 }}>
              <CheckIcon />
            </Box>
          )}
        </MenuItem>
        <MenuItem
          onClick={() => handleThemeChange('light')}
          selected={theme === 'light'}
        >
          <ListItemIcon>
            <LightModeIcon />
          </ListItemIcon>
          {showLabels && <ListItemText>Light</ListItemText>}
          {theme === 'light' && (
            <Box sx={{ ml: 2 }}>
              <CheckIcon />
            </Box>
          )}
        </MenuItem>
        <MenuItem
          onClick={() => handleThemeChange('dark')}
          selected={theme === 'dark'}
        >
          <ListItemIcon>
            <DarkModeIcon />
          </ListItemIcon>
          {showLabels && <ListItemText>Dark</ListItemText>}
          {theme === 'dark' && (
            <Box sx={{ ml: 2 }}>
              <CheckIcon />
            </Box>
          )}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ThemeToggle;
