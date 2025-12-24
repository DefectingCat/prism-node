import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Config } from '../config/types';
import logger from '../utils/logger';
import { parseAddress } from '../utils/utils';
import { errorHandler, requestLogger } from './middlewares';
import { createStatsRoutes } from './stats-routes';

/**
 * 创建 HTTP 服务器实例
 * @param {string} staticDir - 静态资源目录路径
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

  logger.info('Static file serving enabled with SPA support', { directory: staticDir });

  return app;
}

/**
 * 启动 HTTP 服务器
 * @param {Config} config - 服务器配置
 * @returns {Promise<void>}
 */
export async function startHttpServer(config: Config): Promise<void> {
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
    const server = serve({
      fetch: app.fetch,
      port: httpAddr.port,
      hostname: httpAddr.host,
    });

    logger.info('HTTP server started successfully', {
      address: config.http_addr,
      host: httpAddr.host,
      port: httpAddr.port,
      pid: process.pid,
    });

    // 监听进程退出事件
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down HTTP server gracefully');
      server.close?.();
    });

    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down HTTP server gracefully');
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
}
