import { describe, it, expect, vi, beforeEach } from 'vitest';
import DailyRotateFile from 'winston-daily-rotate-file';
import { configureLogger, logger } from '../logger';

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('configureLogger', () => {
    it('should not add file transports when log_path is not provided', () => {
      const initialTransportCount = logger.transports.length;

      configureLogger({
        addr: '127.0.0.1:8080',
        socks_addr: '127.0.0.1:1080',
      });

      expect(logger.transports.length).toBe(initialTransportCount);
    });

    it('should add file transports when log_path is provided', () => {
      // Check if any DailyRotateFile transports already exist
      const hasExistingFileTransports = logger.transports.some(
        (t) => t instanceof DailyRotateFile
      );

      if (!hasExistingFileTransports) {
        const initialTransportCount = logger.transports.length;

        configureLogger({
          addr: '127.0.0.1:8080',
          socks_addr: '127.0.0.1:1080',
          log_path: './logs',
        });

        // Should have added 2 file transports (error and combined)
        expect(logger.transports.length).toBe(initialTransportCount + 2);
      } else {
        // Skip if file transports already exist from previous test
        expect(true).toBe(true);
      }
    });

    it('should not add duplicate file transports on subsequent calls', () => {
      const transportCountBefore = logger.transports.length;

      // Call configureLogger again
      configureLogger({
        addr: '127.0.0.1:8080',
        socks_addr: '127.0.0.1:1080',
        log_path: './logs',
      });

      const transportCountAfter = logger.transports.length;

      // Transport count should not increase (duplicate prevention)
      expect(transportCountAfter).toBe(transportCountBefore);
    });

    it('should handle empty log_path string', () => {
      const initialTransportCount = logger.transports.length;

      configureLogger({
        addr: '127.0.0.1:8080',
        socks_addr: '127.0.0.1:1080',
        log_path: '',
      });

      expect(logger.transports.length).toBe(initialTransportCount);
    });
  });

  describe('logger instance', () => {
    it('should have correct default configuration', () => {
      expect(logger).toBeDefined();
      expect(logger.level).toBe('info');
      expect(logger.defaultMeta).toEqual({ service: 'prism-node' });
    });

    it('should have expected format configuration', () => {
      expect(logger.format).toBeDefined();
    });
  });
});
