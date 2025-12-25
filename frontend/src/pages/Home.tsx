import {
  Alert,
  Autocomplete,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { BarChart, PieChart } from '@mui/x-charts';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateRangePicker } from '@mui/x-date-pickers-pro/DateRangePicker';
import dayjs, { Dayjs } from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import type { StatsQueryParams } from '../types/stats';
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
  const { getStats } = useStatsApi();
  const { t } = useTranslation();

  // 查询参数状态
  const [queryParams, setQueryParams] = useState<StatsQueryParams>({
    page: 1,
    pageSize: 10,
  });

  // 自动刷新控制状态
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshIntervalTime, setRefreshIntervalTime] = useState(1000); // 默认1秒

  // 使用 SWR 的 refreshInterval 实现自动请求
  const {
    data: statsData,
    error,
    mutate,
    isLoading,
    isValidating,
  } = useSWR(
    ['stats', queryParams], // 使用查询参数作为 key
    () => getStats(queryParams),
    {
      refreshInterval: autoRefresh ? refreshIntervalTime : 0, // 根据开关状态和设置的间隔时间刷新
      keepPreviousData: true, // 保留之前的数据，自动刷新时不会清空
    },
  );

  // 使用 SWR 自动获取活跃连接数
  // const { data: activeConnections, error: connectionsError } = useSWR(
  //   'activeConnections',
  //   getActiveConnections,
  //   { refreshInterval: autoRefresh ? refreshIntervalTime : 0 }, // 根据开关状态和设置的间隔时间刷新
  // );

  // 参数变化处理函数
  const handleParamChange = (
    field: keyof StatsQueryParams,
    value: string | Dayjs | null,
  ) => {
    let finalValue: string | number | undefined = undefined;

    // 转换时间类型
    if (field === 'startTime' || field === 'endTime') {
      // 如果是 Dayjs 对象，转换为 Unix 时间戳 (毫秒)
      if (value instanceof dayjs) {
        finalValue = value.valueOf();
      }
      // 如果是字符串，尝试转换为数值
      else if (typeof value === 'string') {
        const numericValue = isNaN(Number(value)) ? value : Number(value);
        finalValue = numericValue === '' ? undefined : numericValue;
      }
      // 如果是 null，转换为 undefined
      else {
        finalValue = undefined;
      }
    }
    // 转换其他数值类型参数
    else if (typeof value === 'string') {
      const numericValue = isNaN(Number(value)) ? value : Number(value);
      finalValue = numericValue === '' ? undefined : numericValue;
    }

    setQueryParams((prev) => ({
      ...prev,
      [field]: finalValue as string | number | undefined,
    }));
  };

  // 日期范围变化处理函数
  const handleDateRangeChange = (newValue: [Dayjs | null, Dayjs | null]) => {
    const [startDate, endDate] = newValue;
    handleParamChange('startTime', startDate);
    handleParamChange('endTime', endDate);
  };

  // 处理刷新间隔变化并立即应用
  const handleRefreshIntervalApply = () => {
    // 确保时间间隔至少为 100 毫秒
    const validatedInterval = Math.max(100, refreshIntervalTime);
    if (validatedInterval !== refreshIntervalTime) {
      setRefreshIntervalTime(validatedInterval);
    }
    // 立即触发数据刷新
    if (autoRefresh) {
      mutate();
    }
  };

  // 首次加载或手动修改参数时显示骨架屏（自动刷新时不显示）
  const isInitialLoading = (isLoading || isValidating) && !statsData;
  // 判断是否为自动刷新：有数据且正在验证中
  const isAutoRefreshing = autoRefresh && statsData && isValidating;
  // 最终是否显示骨架屏：首次加载或手动调节参数时显示，自动刷新时不显示
  const showSkeleton = isInitialLoading && !isAutoRefreshing;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
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

            {/* 查询参数配置区域 */}
            <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
                {t('stats.queryParams')}
              </Typography>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ mb: 2 }}
              >
                {/* Date Range */}
                <DateRangePicker
                  value={[
                    queryParams.startTime ? dayjs(queryParams.startTime) : null,
                    queryParams.endTime ? dayjs(queryParams.endTime) : null,
                  ]}
                  onChange={handleDateRangeChange}
                  sx={{ flex: 1 }}
                  slotProps={{
                    field: {
                      clearable: true,
                      onClear: () =>
                        setQueryParams((d) => ({
                          ...d,
                          startTime: undefined,
                          endTime: undefined,
                        })),
                    },
                  }}
                />
                {/* Page */}
                <TextField
                  label={t('stats.page')}
                  type="number"
                  value={queryParams.page || ''}
                  onChange={(e) => handleParamChange('page', e.target.value)}
                  sx={{ flex: 1 }}
                />
                {/* Page Size */}
                <Autocomplete
                  freeSolo
                  options={[10, 20, 50, 100]}
                  value={queryParams.pageSize || null}
                  onChange={(_, newValue) => {
                    const value =
                      typeof newValue === 'number'
                        ? String(newValue)
                        : newValue || '';
                    handleParamChange('pageSize', value);
                  }}
                  onInputChange={(_, newInputValue) => {
                    handleParamChange('pageSize', newInputValue);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('stats.pageSize')}
                      type="number"
                    />
                  )}
                  sx={{ flex: 1 }}
                />
                {/* Type */}
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel id="type-select-label">
                    {t('stats.requestType')}
                  </InputLabel>
                  <Select
                    labelId="type-select-label"
                    id="type-select"
                    size="medium"
                    value={queryParams.type || ''}
                    label={t('stats.requestType')}
                    onChange={(e) => handleParamChange('type', e.target.value)}
                  >
                    <MenuItem value="">
                      <em>{t('stats.all')}</em>
                    </MenuItem>
                    <MenuItem value="HTTP">HTTP</MenuItem>
                    <MenuItem value="HTTPS">HTTPS</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ mb: 2 }}
              >
                {/* Host */}
                <TextField
                  label={t('stats.host')}
                  value={queryParams.host || ''}
                  onChange={(e) => handleParamChange('host', e.target.value)}
                  sx={{ flex: 1 }}
                />
              </Stack>
              {/* Auto Refresh Controls */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ alignItems: 'center' }}
              >
                {/* Auto Refresh Switch */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        size="medium"
                      />
                    }
                    label={t('stats.autoRefresh')} // 这里添加label属性
                  />
                </Box>
                {/* Refresh Interval */}
                <TextField
                  label={t('stats.refreshInterval')}
                  type="number"
                  value={refreshIntervalTime} // Display in milliseconds
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    // 允许用户输入任何数值，但不能为负数或 NaN
                    if (!isNaN(value) && value >= 0) {
                      setRefreshIntervalTime(value);
                    }
                  }}
                  onBlur={handleRefreshIntervalApply}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRefreshIntervalApply();
                      e.currentTarget.blur(); // 失去焦点
                    }
                  }}
                  slotProps={{ htmlInput: { min: 100 } }}
                  sx={{ flex: 1 }}
                  helperText={t('stats.refreshIntervalHelper')}
                  size="small"
                />
              </Stack>
            </Paper>

            {/* 活跃连接数 */}
            {showSkeleton ? (
              <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                <Skeleton variant="text" width="40%" height={20} />
                <Skeleton variant="text" width="15%" height={48} sx={{ my: 1 }} />
              </Paper>
            ) : (
              statsData?.activeConnections !== null && (
                <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('stats.activeConnections')}
                  </Typography>
                  <Typography variant="h4" color="primary" sx={{ my: 1 }}>
                    {statsData?.activeConnections?.total}
                  </Typography>
                </Paper>
              )
            )}

            {/* 统计数据区域 */}
            {showSkeleton ? (
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
                    <Skeleton variant="text" width="35%" height={20} sx={{ mb: 1 }} />
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
                    <Skeleton variant="text" width="35%" height={20} sx={{ mb: 1 }} />
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
                      <Skeleton variant="text" width="40%" height={20} sx={{ mb: 1 }} />
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
            ) : (
              statsData && (
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
                      {statsData.activeConnections.total}
                    </Typography>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      {t('stats.topHosts', {
                        count: statsData.topHosts.length,
                      })}
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
                    <BarChart
                      xAxis={[
                        {
                          data: statsData.records.map(
                            (data) => data.targetHost,
                          ),
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
              )
            )}
          </CardContent>
        </Card>
      </Container>
    </LocalizationProvider>
  );
};

export default Home;
