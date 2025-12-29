import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import type { Config } from '../config/types';
import {
  logStreamHandler,
  WebSocketTransport,
} from '../handlers/log-stream-handler';

/**
 * Winston logger instance for the Prism Node proxy application
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'prism-node' },
  transports: [
    // WebSocket transport for real-time log streaming (always enabled)
    new WebSocketTransport(logStreamHandler),
  ],
});

// Console output in development mode with colors
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

/**
 * Configures the logger to write logs to files based on the provided configuration
 */
export function configureLogger(config: Config): void {
  if (config.log_path) {
    // Add error log transport
    logger.add(
      new DailyRotateFile({
        filename: `${config.log_path}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
      }),
    );

    // Add combined log transport
    logger.add(
      new DailyRotateFile({
        filename: `${config.log_path}/combined-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
      }),
    );
  }
}

// Maintain backward compatibility with default export
export default logger;
