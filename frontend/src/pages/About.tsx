import { Alert, Box, CircularProgress, Container, Paper } from '@mui/material';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApiFetch } from '../utils/api';

/**
 * About 页面组件
 * 从后端 API 获取 README.md 内容并渲染为 HTML
 */
const About = () => {
  // 状态管理
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 获取 API fetch 函数
  const apiFetch = useApiFetch();

  /**
   * 从后端 API 获取 README.md 内容
   */
  useEffect(() => {
    const fetchAboutContent = async () => {
      try {
        setLoading(true);
        setError(null);

        // 调用 /api/about 接口
        const response = await apiFetch('/about');

        if (response.success && response.data?.content) {
          setContent(response.data.content);
        } else {
          throw new Error(response.error || '获取内容失败');
        }
      } catch (err) {
        console.error('Failed to fetch about content:', err);
        setError(
          err instanceof Error
            ? err.message
            : '加载 README 内容失败，请稍后重试',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAboutContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 加载状态
  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  // 渲染 Markdown 内容
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        {/* Markdown 内容渲染 */}
        <Box
          sx={{
            // 为 Markdown 内容添加样式
            '& h1': {
              fontSize: '2.5rem',
              fontWeight: 600,
              mb: 3,
              mt: 2,
              color: 'primary.main',
            },
            '& h2': {
              fontSize: '2rem',
              fontWeight: 600,
              mb: 2,
              mt: 4,
              color: 'text.primary',
              borderBottom: '2px solid',
              borderColor: 'divider',
              pb: 1,
            },
            '& h3': {
              fontSize: '1.5rem',
              fontWeight: 600,
              mb: 2,
              mt: 3,
              color: 'text.primary',
            },
            '& p': {
              fontSize: '1rem',
              lineHeight: 1.7,
              mb: 2,
              color: 'text.secondary',
            },
            '& ul, & ol': {
              mb: 2,
              pl: 4,
            },
            '& li': {
              fontSize: '1rem',
              lineHeight: 1.7,
              mb: 1,
              color: 'text.secondary',
            },
            '& code': {
              backgroundColor: 'action.hover',
              color: 'error.main',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              fontSize: '0.875rem',
              fontFamily: 'monospace',
            },
            '& pre': {
              backgroundColor: 'action.hover',
              p: 2,
              borderRadius: 1,
              overflow: 'auto',
              mb: 2,
              '& code': {
                backgroundColor: 'transparent',
                color: 'text.primary',
                p: 0,
              },
            },
            '& a': {
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline',
              },
            },
            '& blockquote': {
              borderLeft: '4px solid',
              borderColor: 'primary.main',
              pl: 2,
              ml: 0,
              fontStyle: 'italic',
              color: 'text.secondary',
            },
            '& table': {
              width: '100%',
              borderCollapse: 'collapse',
              mb: 2,
            },
            '& th, & td': {
              border: '1px solid',
              borderColor: 'divider',
              px: 2,
              py: 1,
              textAlign: 'left',
            },
            '& th': {
              backgroundColor: 'action.hover',
              fontWeight: 600,
            },
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </Box>
      </Paper>
    </Container>
  );
};

export default About;
