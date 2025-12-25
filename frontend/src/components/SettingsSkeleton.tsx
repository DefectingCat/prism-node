import {
  Box,
  Card,
  CardContent,
  Container,
  Skeleton,
  Stack,
} from '@mui/material';

const SettingsSkeleton = () => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* 页面标题 */}
      <Skeleton variant="text" width="20%" height={48} sx={{ mb: 2 }} />

      <Card sx={{ mt: 3 }}>
        <CardContent>
          {/* 卡片标题 */}
          <Skeleton variant="text" width="30%" height={32} sx={{ mb: 1 }} />
          {/* 卡片描述 */}
          <Skeleton variant="text" width="80%" height={20} />
          <Skeleton variant="text" width="60%" height={20} sx={{ mb: 3 }} />

          <Stack spacing={3}>
            {/* 输入框 */}
            <Skeleton variant="rounded" height={56} />

            {/* 当前配置 */}
            <Box>
              <Skeleton variant="text" width="40%" height={20} />
            </Box>

            {/* 按钮组 */}
            <Stack direction="row" spacing={2}>
              <Skeleton variant="rounded" width={120} height={42} />
              <Skeleton variant="rounded" width={120} height={42} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
};

export default SettingsSkeleton;
