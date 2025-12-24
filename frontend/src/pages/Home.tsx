import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { StatsData } from '../types/stats';
import { useStatsApi } from '../utils/api';

const Home = () => {
  const { getStats, getActiveConnections } = useStatsApi();
  const { t } = useTranslation();

  // 统计数据状态
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [activeConnections, setActiveConnections] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取统计数据
  const handleGetStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStats({
        page: 1,
        pageSize: 10,
      });
      setStatsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('stats.errorFetching'));
    } finally {
      setLoading(false);
    }
  };

  // 获取活跃连接数
  const handleGetActiveConnections = async () => {
    setLoading(true);
    setError(null);
    try {
      const count = await getActiveConnections();
      setActiveConnections(count);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('stats.errorFetching'));
    } finally {
      setLoading(false);
    }
  };

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

          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleGetStats}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} />
              ) : (
                t('stats.getStatsButton')
              )}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleGetActiveConnections}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} />
              ) : (
                t('stats.getActiveConnectionsButton')
              )}
            </Button>
          </Stack>

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
                    {(statsData.totalBytesUp / 1024).toFixed(2)} KB
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('stats.totalBytesDown')}
                  </Typography>
                  <Typography variant="h5">
                    {(statsData.totalBytesDown / 1024).toFixed(2)} KB
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
                          {(host.bytes / 1024).toFixed(2)} KB)
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

      <Typography variant="body2" align="center" color="text.secondary">
        点击 Vite 和 React 的 logo 以了解更多
      </Typography>
    </Container>
  );
};

export default Home;
