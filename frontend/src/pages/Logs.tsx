import { Alert, Box, Paper, Typography } from '@mui/material';
import { FitAddon } from '@xterm/addon-fit';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal } from 'xterm';
import { useApiConfig } from '../hooks/useApiConfig';
import 'xterm/css/xterm.css';
import { isUrl } from '../utils';

const Logs = () => {
  const { t } = useTranslation();
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { baseUrl } = useApiConfig();
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('connecting');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!terminalRef.current) return;

    // 创建 xterm.js 终端实例
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#ffffff',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
      rows: 30,
      convertEol: true,
      disableStdin: true,
      scrollback: 10000,
    });

    // 创建 FitAddon 用于自适应终端大小
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    // 将终端挂载到 DOM
    terminal.open(terminalRef.current);
    fitAddon.fit();

    // 保存引用
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // 显示欢迎消息
    terminal.writeln('\x1b[1;32m=== Prism Node Log Stream ===\x1b[0m');
    terminal.writeln('Connecting to log stream...');
    terminal.writeln('');

    // 建立 WebSocket 连接
    const isValidUrl = isUrl(baseUrl);
    const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = isValidUrl
      ? baseUrl.replace(/^https?:\/\//, '')
      : `${window.location.host}${baseUrl}`;
    const wsUrl = `${wsProtocol}://${wsHost}/logs/stream`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      setErrorMessage('');
      terminal.writeln('\x1b[1;32m✓ Connected to log stream\x1b[0m');
      terminal.writeln('');
    };

    ws.onmessage = (event) => {
      try {
        // 尝试解析 JSON 消息
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          terminal.writeln(
            `\x1b[1;36m[${new Date(data.timestamp).toLocaleString()}]\x1b[0m ${data.message}`,
          );
        } else {
          // 其他结构化消息
          terminal.writeln(event.data);
        }
      } catch {
        // 如果不是 JSON，直接显示原始文本（日志消息）
        terminal.write(event.data);
      }
    };

    ws.onerror = () => {
      setConnectionStatus('error');
      setErrorMessage('WebSocket connection error');
      terminal.writeln('\x1b[1;31m✗ WebSocket error occurred\x1b[0m');
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      terminal.writeln('');
      terminal.writeln('\x1b[1;33m! Disconnected from log stream\x1b[0m');
    };

    // 窗口大小调整时重新适配终端
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      if (wsRef.current) {
        wsRef.current.close();
      }
      terminal.dispose();
    };
  }, [baseUrl]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t('logs.title')}
      </Typography>

      {/* 连接状态指示器 */}
      {connectionStatus === 'connecting' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('logs.connecting')}
        </Alert>
      )}
      {connectionStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage || t('logs.connectionError')}
        </Alert>
      )}

      {/* 终端容器 */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          backgroundColor: '#1e1e1e',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <div ref={terminalRef} />
      </Paper>
    </Box>
  );
};

export default Logs;
