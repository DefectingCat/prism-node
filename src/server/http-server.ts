import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Config } from '../config/types';
import logger from '../utils/logger';
import { parseAddress } from '../utils/utils';
import { errorHandler, requestLogger } from './middlewares';
import { createStatsRoutes } from './stats-routes';

/**
 * 创建 HTTP 服务器实例
 * @returns {Hono} Hono 应用实例
 */
export function createHttpServer(): Hono {
  const app = new Hono();

  // CORS 中间件 - 允许所有域名
  app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }));

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
  const app = createHttpServer();

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
