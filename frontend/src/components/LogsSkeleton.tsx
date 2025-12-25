import { Box, Paper, Skeleton, Stack } from '@mui/material';

// 预生成固定宽度数组
const TERMINAL_LINE_WIDTHS = Array.from(
  { length: 30 },
  () => Math.random() * 30 + 60,
);

const LogsSkeleton = () => {
  return (
    <Box sx={{ p: 3 }}>
      {/* 页面标题 */}
      <Skeleton variant="text" width="15%" height={48} sx={{ mb: 2 }} />

      {/* 连接状态提示 */}
      <Skeleton variant="rounded" width="100%" height={48} sx={{ mb: 2 }} />

      {/* 终端容器 */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          backgroundColor: '#1e1e1e',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Stack spacing={0.5}>
          {/* 终端行占位符 */}
          {TERMINAL_LINE_WIDTHS.map((width, index) => (
            <Skeleton
              key={index}
              variant="text"
              width={`${width}%`}
              height={20}
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.08)' }}
            />
          ))}
        </Stack>
      </Paper>
    </Box>
  );
};

export default LogsSkeleton;
