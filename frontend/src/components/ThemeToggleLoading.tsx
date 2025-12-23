import IconButton from '@mui/material/IconButton';
import { Box } from '@mui/material';

const ThemeToggleLoading = () => (
  <IconButton disabled aria-label="loading theme toggle">
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* 外圈脉冲动画 */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.5 },
          },
        }}
      >
        <Box
          sx={{
            height: 24,
            width: 24,
            borderRadius: '50%',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(253, 224, 71, 0.2)' : 'rgba(250, 204, 21, 0.2)',
          }}
        />
      </Box>
      {/* 太阳图标 */}
      <Box
        component="svg"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        sx={{
          position: 'relative',
          height: 24,
          width: 24,
          color: (theme) => theme.palette.mode === 'dark' ? 'rgba(107, 114, 128, 1)' : 'rgba(156, 163, 175, 1)',
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        }}
      >
        <title>Loading Theme Toggle</title>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
        />
      </Box>
    </Box>
  </IconButton>
);

export default ThemeToggleLoading;
