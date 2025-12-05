import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import logger from './logger';
import type { Config } from './types';
import { parseAddress } from './utils';

/**
 * 创建 HTTP 服务器实例
 * @returns {Hono} Hono 应用实例
 */
export function createHttpServer(): Hono {
  const app = new Hono();

  // 健康检查接口
  app.get('/api/hello', (c) => {
    return c.text('Hello World');
  });

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

  logger.info('Starting HTTP server...');
  logger.info(`HTTP server address: ${config.http_addr}`);

  // 启动服务器
  serve({
    fetch: app.fetch,
    port: httpAddr.port,
    hostname: httpAddr.host,
  });

  logger.info(`HTTP server is running on: ${config.http_addr}`);
}
