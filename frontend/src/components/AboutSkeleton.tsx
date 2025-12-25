import { Box, Container, Divider, Paper, Skeleton, Stack } from '@mui/material';

const AboutSkeleton = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Stack spacing={3}>
          {/* H1 标题 */}
          <Skeleton variant="text" width="60%" height={56} sx={{ mt: 2 }} />

          {/* 段落 */}
          <Box>
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="95%" />
            <Skeleton variant="text" width="85%" />
          </Box>

          {/* H2 标题 */}
          <Box sx={{ mt: 4 }}>
            <Skeleton variant="text" width="40%" height={44} />
            <Divider sx={{ mt: 1 }} />
          </Box>

          {/* 段落 */}
          <Box>
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="92%" />
          </Box>

          {/* H3 标题 */}
          <Skeleton variant="text" width="35%" height={36} sx={{ mt: 3 }} />

          {/* 列表项 */}
          <Stack spacing={1} sx={{ pl: 4 }}>
            <Skeleton variant="text" width="90%" />
            <Skeleton variant="text" width="85%" />
            <Skeleton variant="text" width="88%" />
            <Skeleton variant="text" width="82%" />
          </Stack>

          {/* 代码块 */}
          <Skeleton variant="rounded" height={120} />

          {/* H2 标题 */}
          <Box sx={{ mt: 4 }}>
            <Skeleton variant="text" width="45%" height={44} />
            <Divider sx={{ mt: 1 }} />
          </Box>

          {/* 段落 */}
          <Box>
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="98%" />
            <Skeleton variant="text" width="90%" />
          </Box>

          {/* 表格 */}
          <Skeleton variant="rounded" height={200} />

          {/* H3 标题 */}
          <Skeleton variant="text" width="30%" height={36} sx={{ mt: 3 }} />

          {/* 段落 */}
          <Box>
            <Skeleton variant="text" width="100%" />
            <Skeleton variant="text" width="94%" />
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
};

export default AboutSkeleton;
