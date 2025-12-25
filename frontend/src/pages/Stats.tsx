import {
  Alert,
  Card,
  CardContent,
  Chip,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateRangePicker } from '@mui/x-date-pickers-pro/DateRangePicker';
import dayjs, { Dayjs } from 'dayjs';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import type { AccessRecord, StatsQueryParams } from '../types/stats';
import { useStatsApi } from '../utils/api';

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

const formatTimestamp = (timestamp: number): string => {
  return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss');
};

const Stats = () => {
  const { getStats } = useStatsApi();
  const { t } = useTranslation();

  const [queryParams, setQueryParams] = useState<StatsQueryParams>({
    page: 1,
    pageSize: 10,
  });

  const {
    data: statsData,
    error,
    isLoading,
  } = useSWR(['stats', queryParams], () => getStats(queryParams), {
    keepPreviousData: true,
  });

  const handleParamChange = (
    field: keyof StatsQueryParams,
    value: string | Dayjs | null,
  ) => {
    let finalValue: string | number | undefined = undefined;

    if (field === 'startTime' || field === 'endTime') {
      if (value instanceof dayjs) {
        finalValue = value.valueOf();
      } else if (typeof value === 'string') {
        const numericValue = isNaN(Number(value)) ? value : Number(value);
        finalValue = numericValue === '' ? undefined : numericValue;
      } else {
        finalValue = undefined;
      }
    } else if (typeof value === 'string') {
      const numericValue = isNaN(Number(value)) ? value : Number(value);
      finalValue = numericValue === '' ? undefined : numericValue;
    }

    setQueryParams((prev) => ({
      ...prev,
      [field]: finalValue as string | number | undefined,
    }));
  };

  const handleDateRangeChange = (newValue: [Dayjs | null, Dayjs | null]) => {
    const [startDate, endDate] = newValue;
    handleParamChange('startTime', startDate);
    handleParamChange('endTime', endDate);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setQueryParams((prev) => ({ ...prev, page: newPage + 1 }));
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setQueryParams((prev) => ({
      ...prev,
      pageSize: parseInt(event.target.value, 10),
      page: 1,
    }));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              {t('stats.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('stats.description')}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
                {t('stats.queryParams')}
              </Typography>
              <Stack spacing={2}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <DateRangePicker
                    value={[
                      queryParams.startTime
                        ? dayjs(queryParams.startTime)
                        : null,
                      queryParams.endTime ? dayjs(queryParams.endTime) : null,
                    ]}
                    onChange={handleDateRangeChange}
                    sx={{ flex: 1 }}
                    slotProps={{
                      field: {
                        clearable: true,
                        onClear: () => {
                          setQueryParams((d) => ({
                            ...d,
                            startTime: undefined,
                            endTime: undefined,
                          }));
                        },
                      },
                    }}
                  />
                  <TextField
                    label={t('stats.host')}
                    value={queryParams.host || ''}
                    onChange={(e) => handleParamChange('host', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>{t('stats.requestType')}</InputLabel>
                    <Select
                      value={queryParams.type || ''}
                      label={t('stats.requestType')}
                      onChange={(e) =>
                        handleParamChange('type', e.target.value)
                      }
                    >
                      <MenuItem value="">
                        <em>{t('stats.all')}</em>
                      </MenuItem>
                      <MenuItem value="HTTP">HTTP</MenuItem>
                      <MenuItem value="HTTPS">HTTPS</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>
            </Paper>

            {isLoading ? (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <Skeleton variant="text" width="80%" />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width="80%" />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width="80%" />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width="80%" />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width="80%" />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width="80%" />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width="80%" />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width="80%" />
                      </TableCell>
                      <TableCell>
                        <Skeleton variant="text" width="80%" />
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
                      <TableRow key={row}>
                        <TableCell>
                          <Skeleton variant="text" />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" />
                        </TableCell>
                        <TableCell>
                          <Skeleton variant="text" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              statsData && (
                <>
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>{t('stats.timestamp')}</TableCell>
                          <TableCell>{t('stats.requestType')}</TableCell>
                          <TableCell>{t('stats.targetHost')}</TableCell>
                          <TableCell>{t('stats.targetPort')}</TableCell>
                          <TableCell>{t('stats.clientIP')}</TableCell>
                          <TableCell>{t('stats.duration')}</TableCell>
                          <TableCell>{t('stats.bytesUp')}</TableCell>
                          <TableCell>{t('stats.bytesDown')}</TableCell>
                          <TableCell>{t('stats.status.name')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {statsData.records.map((record: AccessRecord) => (
                          <TableRow key={record.requestId}>
                            <TableCell>
                              {formatTimestamp(record.timestamp)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={record.type}
                                size="small"
                                color={
                                  record.type === 'HTTPS'
                                    ? 'success'
                                    : 'default'
                                }
                              />
                            </TableCell>
                            <TableCell>{record.targetHost}</TableCell>
                            <TableCell>{record.targetPort}</TableCell>
                            <TableCell>{record.clientIP}</TableCell>
                            <TableCell>{record.duration} ms</TableCell>
                            <TableCell>
                              {formatFileSize(record.bytesUp)}
                            </TableCell>
                            <TableCell>
                              {formatFileSize(record.bytesDown)}
                            </TableCell>
                            <TableCell>
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
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    component="div"
                    count={statsData.pagination.total}
                    page={(statsData.pagination.page || 1) - 1}
                    onPageChange={handleChangePage}
                    rowsPerPage={statsData.pagination.pageSize}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 20, 50, 100]}
                  />
                </>
              )
            )}
          </CardContent>
        </Card>
      </Container>
    </LocalizationProvider>
  );
};

export default Stats;
