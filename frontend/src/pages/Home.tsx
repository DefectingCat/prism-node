import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import InfoIcon from '@mui/material/SvgIcon';
import { useState } from 'react';
import reactLogo from '../assets/react.svg';
import { useTheme } from '../hooks/useTheme';
import viteLogo from '/vite.svg';

const InfoSvgIcon = () => (
  <InfoIcon>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      fill="none"
      stroke="currentColor"
    />
  </InfoIcon>
);

const Home = () => {
  const [count, setCount] = useState(0);
  const { theme, mode } = useTheme();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Logo section */}
      <Stack direction="row" spacing={4} justifyContent="center" sx={{ mb: 4 }}>
        <a href="https://vite.dev" target="_blank" rel="noopener">
          <Box
            component="img"
            src={viteLogo}
            alt="Vite logo"
            sx={{ height: 96, width: 96 }}
          />
        </a>
        <a href="https://react.dev" target="_blank" rel="noopener">
          <Box
            component="img"
            src={reactLogo}
            alt="React logo"
            sx={{ height: 96, width: 96 }}
          />
        </a>
      </Stack>

      {/* MUI 组件测试区域 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            MUI 组件暗色模式测试
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            这些是 Material-UI 组件，会自动响应暗色模式切换
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
            <Button variant="contained" color="primary">
              Primary Button
            </Button>
            <Button variant="contained" color="secondary">
              Secondary Button
            </Button>
            <Button variant="outlined" color="primary">
              Outlined Button
            </Button>
            <Button variant="text" color="primary">
              Text Button
            </Button>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip label="Default Chip" />
            <Chip label="Primary Chip" color="primary" />
            <Chip label="Secondary Chip" color="secondary" />
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ mb: 3 }}>
        <Button variant="contained">Hello world</Button>
      </Box>

      {/* Title */}
      <Typography variant="h3" component="h1" align="center" gutterBottom sx={{ mb: 4 }}>
        Vite + React
      </Typography>

      {/* 主题信息卡片 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            主题模式测试
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            这是一个测试主题模式的卡片组件。切换主题以查看效果。
          </Typography>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Paper elevation={2} sx={{ p: 2, flex: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  当前设置
                </Typography>
                <Typography variant="h4" color="primary" sx={{ my: 1 }}>
                  {theme}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  主题设置（system/light/dark）
                </Typography>
              </Paper>
              <Paper elevation={2} sx={{ p: 2, flex: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  当前模式
                </Typography>
                <Typography variant="h4" color="secondary" sx={{ my: 1 }}>
                  {mode}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  实际应用的主题模式
                </Typography>
              </Paper>
            </Stack>
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                计数器
              </Typography>
              <Typography variant="h4" sx={{ my: 1 }}>
                {count}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                点击按钮增加
              </Typography>
            </Paper>
          </Stack>
          <Stack direction="row" spacing={2} sx={{ mt: 3, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setCount((count) => count + 1)}
            >
              计数: {count}
            </Button>
            <Button variant="contained" color="secondary">
              次要按钮
            </Button>
            <Button variant="contained" color="success">
              强调按钮
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* 颜色展示 */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              主色调
            </Typography>
            <Typography variant="body2">Primary Color</Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: 'secondary.main', color: 'secondary.contrastText', flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              次要色
            </Typography>
            <Typography variant="body2">Secondary Color</Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: 'success.main', color: 'success.contrastText', flex: 1 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              强调色
            </Typography>
            <Typography variant="body2">Success Color</Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* MUI 响应式色彩测试 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            MUI 响应式色彩测试
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            这个卡片使用了 MUI 的响应式主题系统。
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
            <Chip label="Primary Badge" color="primary" />
            <Chip label="Secondary Badge" color="secondary" />
            <Chip label="Success Badge" color="success" />
          </Stack>
        </CardContent>
      </Card>

      {/* Info section */}
      <Alert severity="info" icon={<InfoSvgIcon />} sx={{ mb: 3 }}>
        <Typography variant="body2">
          编辑 <code>src/App.tsx</code> 并保存以测试 HMR
        </Typography>
      </Alert>

      <Typography variant="body2" align="center" color="text.secondary">
        点击 Vite 和 React 的 logo 以了解更多
      </Typography>
    </Container>
  );
};

export default Home;
