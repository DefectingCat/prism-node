import type { Context, Next } from 'hono';
import logger from '../utils/logger';

/**
 * 请求日志中间件
 */
export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  const method = c.req.method;
  const url = c.req.url;
  const userAgent = c.req.header('user-agent') || 'unknown';
  const ip =
    c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

  logger.info('HTTP Request', {
    method,
    url,
    userAgent,
    ip,
    headers: Object.fromEntries(c.req.raw.headers.entries()),
  });

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  logger.info('HTTP Response', {
    method,
    url,
    status,
    duration: `${duration}ms`,
    ip,
  });
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
