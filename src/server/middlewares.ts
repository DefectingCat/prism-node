import type { Context, Next } from 'hono';
import logger from '../utils/logger';

/**
 * 请求日志中间件
 * 过滤掉 WebSocket 升级请求和静态资源请求，减少日志噪音
 */
export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  const method = c.req.method;
  const url = c.req.url;
  const pathname = new URL(url).pathname;
  const userAgent = c.req.header('user-agent') || 'unknown';
  const ip =
    c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

  // 过滤掉静态资源请求和 WebSocket 请求，减少日志噪音
  const shouldLog =
    pathname.startsWith('/api/') && // 只记录 API 请求
    !pathname.startsWith('/api/logs/stream'); // 过滤 WebSocket 日志流

  if (shouldLog) {
    logger.info('HTTP Request', {
      method,
      url,
      pathname,
      userAgent,
      ip,
    });
  }

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  if (shouldLog) {
    logger.info('HTTP Response', {
      method,
      url,
      pathname,
      status,
      duration: `${duration}ms`,
      ip,
    });
  }
}

/**
 * 错误处理中间件
 */
export function errorHandler(err: Error, c: Context) {
  logger.error('HTTP Error', {
    error: err.message,
    stack: err.stack,
    method: c.req.method,
    url: c.req.url,
    status: c.res.status,
  });
  return c.json({ error: 'Internal Server Error' }, 500);
}
