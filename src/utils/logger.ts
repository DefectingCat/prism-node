import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import type { Config } from '../config/types';

/**
 * Prism Node 代理应用程序的 Winston 日志记录器实例
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'prism-node' },
});

// 开发模式下带颜色的控制台输出
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
 * 根据提供的配置将日志写入文件的日志记录器
 */
export function configureLogger(config: Config): void {
  if (config.log_path) {
    // 添加错误日志传输
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

    // 添加组合日志传输
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

// 保持向后兼容的默认导出
export default logger;
