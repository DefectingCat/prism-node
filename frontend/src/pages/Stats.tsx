import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { useStatsApi } from '../utils/api';

// 通用文件大小格式化函数
const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

const Stats = () => {
  const { getStats, getActiveConnections } = useStatsApi();
  const { t } = useTranslation();

  // 使用 SWR 自动获取统计数据
  const { data: statsData, error: statsError } = useSWR('stats', () =>
    getStats({
      page: 1,
      pageSize: 10,
    }),
  );

  // 使用 SWR 自动获取活跃连接数
  const { data: activeConnections, error: connectionsError } = useSWR(
    'activeConnections',
    getActiveConnections,
  );

  // 统一错误信息
  const error = statsError || connectionsError;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* 统计接口测试区域 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {t('stats.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t('stats.description')}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {activeConnections !== null && (
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {t('stats.activeConnections')}
              </Typography>
              <Typography variant="h4" color="primary" sx={{ my: 1 }}>
                {activeConnections}
              </Typography>
            </Paper>
          )}

          {statsData && (
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                {t('stats.statsData')}
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('stats.totalRequests')}
                  </Typography>
                  <Typography variant="h5">
                    {statsData.totalRequests}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('stats.totalBytesUp')}
                  </Typography>
                  <Typography variant="h5">
                    {formatFileSize(statsData.totalBytesUp)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('stats.totalBytesDown')}
                  </Typography>
                  <Typography variant="h5">
                    {formatFileSize(statsData.totalBytesDown)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('stats.avgDuration')}
                  </Typography>
                  <Typography variant="h5">
                    {statsData.avgDuration.toFixed(2)} ms
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('stats.activeConnections')}
                  </Typography>
                  <Typography variant="h5">
                    {statsData.activeConnections}
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t('stats.topHosts')} (Top {statsData.topHosts.length})
                  </Typography>
                  <Stack spacing={1}>
                    {statsData.topHosts.map((host, index) => (
                      <Paper key={index} sx={{ p: 1.5 }}>
                        <Typography variant="body2">
                          {host.host} - {host.count} {t('stats.visits')} (
                          {formatFileSize(host.bytes)})
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Box>

                <Divider />

                <Box>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t('stats.recentRecords')} ({statsData.records.length})
                  </Typography>
                  <Stack spacing={1}>
                    {statsData.records.slice(0, 5).map((record) => (
                      <Paper key={record.requestId} sx={{ p: 1.5 }}>
                        <Typography variant="body2">
                          <Chip
                            label={record.type}
                            size="small"
                            color={
                              record.type === 'HTTPS' ? 'success' : 'default'
                            }
                            sx={{ mr: 1 }}
                          />
                          {record.targetHost}:{record.targetPort} -{' '}
                          {record.duration}ms
                          <Chip
                            label={t(`stats.status.${record.status}`)}
                            size="small"
                            color={
                              record.status === 'success'
                                ? 'success'
                                : record.status === 'error'
                                  ? 'error'
                                  : 'warning'
                            }
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default Stats;
