import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { WebSocket } from 'ws';
import { WebSocketServer } from 'ws';
import type { Config } from '../config/types';
import { logStreamHandler } from '../handlers/log-stream-handler';
import logger from '../utils/logger';
import { parseAddress } from '../utils/utils';
import { errorHandler, requestLogger } from './middlewares';
import { createStatsRoutes } from './stats-routes';

/**
 * 创建 HTTP 服务器实例
 * @param staticDir - 静态资源目录路径
 * @returns {Hono} Hono 应用实例
 */
export function createHttpServer(staticDir = './html'): Hono {
  const app = new Hono();

  // CORS 中间件 - 允许所有域名
  app.use(
    '*',
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // 请求日志中间件
  app.use('*', requestLogger);

  // 错误处理中间件
  app.onError(errorHandler);

  // 健康检查接口
  app.get('/api/hello', (c) => {
    logger.debug('Health check endpoint accessed');
    return c.text('Hello World');
  });

  // 统计信息接口
  app.route('/api', createStatsRoutes());

  // 静态资源托管 - 需要放在最后，避免覆盖 API 路由
  app.use(
    '/*',
    serveStatic({
      root: staticDir,
    }),
  );

  // SPA 回退路由 - 当请求的文件不存在时，返回 index.html 以支持前端路由
  app.get('*', serveStatic({ path: './index.html', root: staticDir }));

  logger.info('Static file serving enabled with SPA support', {
    directory: staticDir,
  });

  return app;
}

/**
 * 处理 WebSocket 连接升级
 * @param wss - WebSocket 服务器实例
 * @param request - HTTP 请求对象
 * @param socket - 网络套接字
 * @param head - 升级请求的第一个数据包
 * @param pathname - 请求路径
 */
function handleWebSocketUpgrade(
  wss: WebSocketServer,
  request: IncomingMessage,
  socket: Duplex,
  head: Buffer,
  pathname: string,
): void {
  // 验证路径是否为日志流端点
  if (pathname !== '/api/logs/stream') {
    socket.destroy();
    return;
  }

  // 执行 WebSocket 升级
  wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
    wss.emit('connection', ws, request);

    // 转换原生 WebSocket 为与处理器兼容的简化接口
    const wsContext = {
      send: (data: string) => ws.send(data),
      readyState: ws.readyState,
    } as any;

    // 添加客户端到日志流处理器
    logStreamHandler.addClient(wsContext);

    // 记录连接信息（放在这里而非 handler 内部，避免循环）
    // 使用 setImmediate 异步记录，确保 logger 已完全初始化
    setImmediate(() => {
      logger.info('WebSocket log stream client connected', {
        clientCount: logStreamHandler.getClientCount(),
        remoteAddress: request.socket.remoteAddress,
      });
    });

    // 发送连接成功消息
    ws.send(
      JSON.stringify({
        type: 'connected',
        message: 'Log stream connected',
        timestamp: new Date().toISOString(),
      }),
    );

    // 监听连接关闭事件
    ws.on('close', () => {
      logStreamHandler.removeClient(wsContext);
      // 异步记录断开信息，避免循环
      setImmediate(() => {
        logger.info('WebSocket log stream client disconnected', {
          clientCount: logStreamHandler.getClientCount(),
        });
      });
    });

    // 监听连接错误事件
    ws.on('error', (error: Error) => {
      // 先移除客户端，避免在日志记录时继续广播
      logStreamHandler.removeClient(wsContext);
      // 异步记录错误，避免循环依赖
      setImmediate(() => {
        logger.error('WebSocket connection error', {
          error: error.message,
          pathname,
          clientCount: logStreamHandler.getClientCount(),
        });
      });
    });
  });
}

/**
 * 启动 HTTP 服务器
 * @param {Config} config - 服务器配置
 * @returns {Promise<void>}
 */
export async function startHttpServer(config: Config): Promise<string> {
  // 解析 HTTP 服务器地址
  const httpAddr = parseAddress(config.http_addr);
  const staticDir = config.static_dir || './dist/html';
  const app = createHttpServer(staticDir);

  logger.info('Starting HTTP server...', {
    address: config.http_addr,
    host: httpAddr.host,
    port: httpAddr.port,
  });

  try {
    // 启动服务器
    const server = serve(
      {
        fetch: app.fetch,
        port: httpAddr.port,
        hostname: httpAddr.host,
      },
      () => {
        logger.info('HTTP server started successfully', {
          address: config.http_addr,
          host: httpAddr.host,
          port: httpAddr.port,
          pid: process.pid,
        });
      },
    );

    // 创建 WebSocket 服务器用于日志流传输
    const wss = new WebSocketServer({ noServer: true });

    // 处理 WebSocket 升级请求
    server.on(
      'upgrade',
      (request: IncomingMessage, socket: Duplex, head: Buffer) => {
        // 解析请求路径
        const pathname = new URL(
          request.url || '',
          `http://${request.headers.host}`,
        ).pathname;

        // 委托给专门的 WebSocket 升级处理函数
        handleWebSocketUpgrade(wss, request, socket, head, pathname);
      },
    );

    logger.info('WebSocket server initialized for log streaming', {
      endpoint: '/api/logs/stream',
    });

    // 监听进程退出事件
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down HTTP server gracefully');
      wss.close();
      server.close?.();
    });

    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down HTTP server gracefully');
      wss.close();
      server.close?.();
    });
  } catch (error) {
    logger.error('Failed to start HTTP server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      address: config.http_addr,
    });
    throw error;
  }
  return config.http_addr;
}
