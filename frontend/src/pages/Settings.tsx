import MonacoEditor from '@monaco-editor/react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import useSWR from 'swr';
import { useApiConfig } from '../hooks/useApiConfig';
import { useThemeMode } from '../hooks/useThemeMode';

// 配置 SWR 的 fetcher 函数
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error('Network response was not ok');
    }
    return res.json();
  });

// Define TypeScript interfaces for the blocklists API response
interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface BlacklistData {
  total: number;
  blacklist: string[]; // Blacklist is an array of strings from API response
  pagination: Pagination;
}

interface BlocklistsResponse {
  success: boolean;
  data: BlacklistData;
}

const Settings = () => {
  const { baseUrl, setBaseUrl } = useApiConfig();
  const themeMode = useThemeMode();
  const [inputValue, setInputValue] = useState(baseUrl);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // 使用 useSWR 获取黑名单数据并类型断言
  const {
    data: blacklistData,
    error: blacklistError,
    isLoading: loadingBlacklist,
    mutate: refreshBlacklist,
  } = useSWR<BlocklistsResponse>(`${baseUrl}/blocklists`, fetcher, {
    refreshInterval: 0, // 不自动刷新
  });
  console.log('blacklistData', blacklistData);

  /**
   * 验证 URL 格式
   */
  const validateUrl = (url: string): boolean => {
    if (!url) {
      setError('URL 不能为空');
      return false;
    }

    // 允许相对路径（以 / 开头）或完整的 URL
    const relativePathRegex = /^\/[\w\-./]*$/;
    const urlRegex = /^https?:\/\/[\w\-.]+(:\d+)?(\/[\w\-./]*)?$/;

    if (!relativePathRegex.test(url) && !urlRegex.test(url)) {
      setError(
        '请输入有效的 URL 格式（如：/api 或 http://localhost:3000/api）',
      );
      return false;
    }

    setError('');
    return true;
  };

  /**
   * 处理输入变化
   */
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setInputValue(value);
    // 清除之前的错误
    if (error) {
      setError('');
    }
  };

  /**
   * 处理保存操作
   */
  const handleSave = () => {
    if (validateUrl(inputValue)) {
      setBaseUrl(inputValue);
      setShowSuccess(true);
    }
  };

  /**
   * 处理重置操作
   */
  const handleReset = () => {
    const defaultUrl = '/api';
    setInputValue(defaultUrl);
    setBaseUrl(defaultUrl);
    setError('');
    setShowSuccess(true);
  };

  /**
   * 关闭成功提示
   */
  const handleCloseSuccess = () => {
    setShowSuccess(false);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        设置
      </Typography>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            后端接口配置
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            配置应用程序使用的后端 API 基础地址。修改后，所有 API
            请求都将使用新的基础地址。
          </Typography>

          <Stack spacing={3}>
            <TextField
              label="后端接口地址 (Base URL)"
              value={inputValue}
              onChange={handleInputChange}
              error={!!error}
              helperText={
                error ||
                '支持相对路径（如：/api）或完整 URL（如：http://localhost:3000/api）'
              }
              placeholder="/api"
              fullWidth
              variant="outlined"
            />

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                当前配置: <strong>{baseUrl}</strong>
              </Typography>
            </Box>

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={inputValue === baseUrl || !!error}
              >
                保存设置
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleReset}
              >
                恢复默认
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* 黑名单配置 */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            域名黑名单配置
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            以下是当前数据库中的域名黑名单配置信息：
          </Typography>

          <Stack spacing={2}>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => refreshBlacklist()}
              disabled={loadingBlacklist}
            >
              {loadingBlacklist ? '加载中...' : '刷新黑名单'}
            </Button>

            {blacklistError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {blacklistError}
              </Alert>
            )}

            {loadingBlacklist ? (
              <Box sx={{ mt: 1, borderRadius: 1, height: '500px' }}>
                {/* 编辑器骨架屏 */}
                <Skeleton variant="rectangular" height="100%" />
              </Box>
            ) : (
              <Box
                sx={{
                  mt: 1,
                  borderRadius: 1,
                  overflowX: 'auto',
                  height: '500px', // 设置编辑器高度
                }}
              >
                <MonacoEditor
                  width="100%"
                  height="100%"
                  language="json"
                  value={JSON.stringify(
                    blacklistData?.data?.blacklist,
                    null,
                    2,
                  )}
                  theme={themeMode === 'dark' ? 'vs-dark' : 'vs'}
                  options={{
                    readOnly: true, // 设置为只读模式，仅用于展示
                    minimap: { enabled: true }, // 显示迷你地图
                    lineNumbers: 'on', // 显示行号
                    scrollBeyondLastLine: false, // 禁止滚动到最后一行之后
                  }}
                />
              </Box>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* 成功提示 */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={handleCloseSuccess}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSuccess}
          severity="success"
          sx={{ width: '100%' }}
        >
          设置已保存成功！
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;
