import {
  Box,
  Card,
  CardContent,
  Container,
  Divider,
  Paper,
  Skeleton,
  Stack,
} from '@mui/material';

const HomeSkeleton = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {/* 标题和描述 */}
          <Skeleton variant="text" width="30%" height={32} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="60%" height={20} sx={{ mb: 2 }} />

          {/* 查询参数配置区域 */}
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Skeleton variant="text" width="20%" height={24} sx={{ mb: 2 }} />

            {/* 第一行查询参数 */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ mb: 2 }}
            >
              <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
              <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
              <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
              <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
            </Stack>

            {/* 第二行查询参数 */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ mb: 2 }}
            >
              <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
            </Stack>

            {/* 自动刷新控制 */}
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: 'center' }}
            >
              <Skeleton variant="rounded" width={150} height={42} />
              <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
            </Stack>
          </Paper>

          {/* 活跃连接数 */}
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Skeleton variant="text" width="40%" height={20} />
            <Skeleton variant="text" width="15%" height={48} sx={{ my: 1 }} />
          </Paper>

          {/* 统计数据区域 */}
          <Paper elevation={2} sx={{ p: 2 }}>
            <Skeleton variant="text" width="25%" height={32} sx={{ mb: 1 }} />
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={2}>
              {/* 统计指标 */}
              {[1, 2, 3, 4, 5].map((item) => (
                <Box key={item}>
                  <Skeleton variant="text" width="30%" height={20} />
                  <Skeleton variant="text" width="20%" height={40} />
                </Box>
              ))}

              <Divider />

              {/* Top Hosts 列表 */}
              <Box>
                <Skeleton
                  variant="text"
                  width="35%"
                  height={20}
                  sx={{ mb: 1 }}
                />
                <Stack spacing={1}>
                  {[1, 2, 3].map((item) => (
                    <Paper key={item} sx={{ p: 1.5 }}>
                      <Skeleton variant="text" width="80%" />
                    </Paper>
                  ))}
                </Stack>
              </Box>

              <Divider />

              {/* 最近记录 */}
              <Box>
                <Skeleton
                  variant="text"
                  width="35%"
                  height={20}
                  sx={{ mb: 1 }}
                />
                <Stack spacing={1}>
                  {[1, 2, 3, 4, 5].map((item) => (
                    <Paper key={item} sx={{ p: 1.5 }}>
                      <Skeleton variant="text" width="90%" />
                    </Paper>
                  ))}
                </Stack>
              </Box>

              <Divider />

              {/* 图表骨架屏 */}
              {[1, 2, 3].map((item) => (
                <Box key={item} sx={{ height: 300, mt: 2 }}>
                  <Skeleton
                    variant="text"
                    width="40%"
                    height={20}
                    sx={{ mb: 1 }}
                  />
                  <Skeleton
                    variant="rounded"
                    width="100%"
                    height={280}
                    animation="wave"
                  />
                </Box>
              ))}
            </Stack>
          </Paper>
        </CardContent>
      </Card>
    </Container>
  );
};

export default HomeSkeleton;
