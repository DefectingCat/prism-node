import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import {
  logStreamHandler,
  WebSocketTransport,
} from '../handlers/log-stream-handler';

/**
 * Winston logger configuration for the Prism Node proxy application
 * Provides structured logging with file and console outputs
 *
 * Features:
 * - JSON format for structured logging
 * - Separate error.log for error-level messages
 * - Combined.log for all messages
 * - Console output in development mode with colors
 * - Configurable log level via LOG_LEVEL environment variable
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'prism-node' },
  transports: [
    // 错误日志 - 按大小和日期轮转
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m', // 单个文件最大 20MB
      maxFiles: '14d', // 保留 14 天
      zippedArchive: true, // 压缩归档文件
    }),

    // 综合日志 - 按大小和日期轮转
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m', // 单个文件最大 20MB
      maxFiles: '14d', // 保留 30 天
      zippedArchive: true, // 压缩归档文件
    }),

    // WebSocket transport for real-time log streaming
    new WebSocketTransport(logStreamHandler),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  );
}

export default logger;
