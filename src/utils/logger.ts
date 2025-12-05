import winston from 'winston';

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
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
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
