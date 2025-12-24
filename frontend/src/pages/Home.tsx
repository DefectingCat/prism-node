import {
  Alert,
  Box,
  Card,
  CardContent,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { BarChart, LineChart, PieChart } from '@mui/x-charts';
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

const Home = () => {
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

                {/* Top Hosts Bar Chart */}
                <Box sx={{ height: 300, mt: 2 }}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t('stats.topHostsVisitCount')}
                  </Typography>
                  <BarChart
                    xAxis={[
                      { data: statsData.topHosts.map((host) => host.host) },
                    ]}
                    series={[
                      {
                        data: statsData.topHosts.map((host) => host.count),
                        label: t('stats.visitCount'),
                        color: '#1976d2',
                      },
                    ]}
                    width={800}
                    height={300}
                    margin={{ top: 10, bottom: 50, left: 50, right: 10 }}
                  />
                </Box>

                {/* Traffic Comparison Pie Chart */}
                <Box sx={{ height: 300, mt: 2 }}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t('stats.trafficComparison')}
                  </Typography>
                  <PieChart
                    series={[
                      {
                        data: [
                          {
                            id: 0,
                            value: statsData.totalBytesUp as number,
                            label: t('stats.upload'),
                          },
                          {
                            id: 1,
                            value: statsData.totalBytesDown as number,
                            label: t('stats.download'),
                          },
                        ],
                        valueFormatter: (value) =>
                          formatFileSize(Number(value.value)),
                      },
                    ]}
                    width={800}
                    height={300}
                    margin={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  />
                </Box>

                {/* Response Time Line Chart */}
                <Box sx={{ height: 300, mt: 2 }}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t('stats.responseTimeTrend')}
                  </Typography>
                  <LineChart
                    xAxis={[
                      {
                        data: statsData.records.map((data) => data.targetHost),
                      },
                    ]}
                    series={[
                      {
                        data: statsData.records.map(
                          (record) => record.duration,
                        ),
                        label: t('stats.responseTime'),
                        color: '#4caf50',
                      },
                    ]}
                    width={800}
                    height={300}
                    margin={{ top: 10, bottom: 50, left: 50, right: 10 }}
                  />
                </Box>
              </Stack>
            </Paper>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default Home;
