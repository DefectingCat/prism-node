import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useApiConfig } from '../hooks/useApiConfig';

const Settings = () => {
  const { baseUrl, setBaseUrl } = useApiConfig();
  const [inputValue, setInputValue] = useState(baseUrl);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

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
      setError('请输入有效的 URL 格式（如：/api 或 http://localhost:3000/api）');
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
            配置应用程序使用的后端 API 基础地址。修改后，所有 API 请求都将使用新的基础地址。
          </Typography>

          <Stack spacing={3}>
            <TextField
              label="后端接口地址 (Base URL)"
              value={inputValue}
              onChange={handleInputChange}
              error={!!error}
              helperText={
                error || '支持相对路径（如：/api）或完整 URL（如：http://localhost:3000/api）'
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
