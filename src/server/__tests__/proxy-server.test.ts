import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import * as http from 'node:http';
import { startProxy } from '../proxy-server';
import type { Config } from '../../config/types';

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock handlers
vi.mock('../../handlers/connect-handler', () => ({
  handleConnect: vi.fn(),
}));

vi.mock('../../handlers/http-handler', () => ({
  handleHttpRequest: vi.fn().mockResolvedValue(undefined),
}));

// Mock whitelist
vi.mock('../../utils/whitelist', () => ({
  initializeWhitelist: vi.fn(),
}));

describe('proxy-server', () => {
  const servers: http.Server[] = [];
  const originalExit = process.exit;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock process.exit to prevent actual exit
    process.exit = vi.fn() as any;
  });

  afterEach(async () => {
    // Close all servers
    for (const server of servers) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    servers.length = 0;
    // Restore process.exit
    process.exit = originalExit;
  });

  describe('startProxy', () => {
    it('should start proxy server with valid config', async () => {
      const config: Config = {
        addr: '127.0.0.1:18080',
        socks_addr: '127.0.0.1:11080',
        whitelist: ['example.com'],
      };

      const result = await startProxy(config);

      expect(result).toBe(config.addr);
    });

    it('should start proxy server without whitelist', async () => {
      const config: Config = {
        addr: '127.0.0.1:18081',
        socks_addr: '127.0.0.1:11081',
      };

      const result = await startProxy(config);

      expect(result).toBe(config.addr);
    });

    it('should handle empty whitelist array', async () => {
      const config: Config = {
        addr: '127.0.0.1:18082',
        socks_addr: '127.0.0.1:11082',
        whitelist: [],
      };

      const result = await startProxy(config);

      expect(result).toBe(config.addr);
    });

    it('should start server with different ports', async () => {
      const config1: Config = {
        addr: '127.0.0.1:18083',
        socks_addr: '127.0.0.1:11083',
      };
      const config2: Config = {
        addr: '127.0.0.1:18084',
        socks_addr: '127.0.0.1:11084',
      };

      // Start two servers on different ports
      const result1 = await startProxy(config1);
      const result2 = await startProxy(config2);

      expect(result1).toBe(config1.addr);
      expect(result2).toBe(config2.addr);
    });

    it('should initialize whitelist with provided domains', async () => {
      const { initializeWhitelist } = await import('../../utils/whitelist.js');

      const config: Config = {
        addr: '127.0.0.1:18085',
        socks_addr: '127.0.0.1:11085',
        whitelist: ['example.com', 'test.com'],
      };

      await startProxy(config);

      expect(initializeWhitelist).toHaveBeenCalledWith([
        'example.com',
        'test.com',
      ]);
    });

    it('should initialize whitelist with undefined when not provided', async () => {
      const { initializeWhitelist } = await import('../../utils/whitelist.js');

      const config: Config = {
        addr: '127.0.0.1:18086',
        socks_addr: '127.0.0.1:11086',
      };

      await startProxy(config);

      expect(initializeWhitelist).toHaveBeenCalledWith(undefined);
    });

    // 测试服务器配置
    it('should return the configured address', async () => {
      const config: Config = {
        addr: '127.0.0.1:18087',
        socks_addr: '127.0.0.1:11087',
      };

      const result = await startProxy(config);

      expect(result).toBe('127.0.0.1:18087');
    });

    // 测试多个白名单域名
    it('should handle multiple whitelist domains', async () => {
      const config: Config = {
        addr: '127.0.0.1:18088',
        socks_addr: '127.0.0.1:11088',
        whitelist: ['a.com', 'b.com', 'c.com'],
      };

      const result = await startProxy(config);

      expect(result).toBe(config.addr);
    });

    // 测试 SOCKS 地址配置
    it('should accept SOCKS address configuration', async () => {
      const config: Config = {
        addr: '127.0.0.1:18089',
        socks_addr: '192.168.1.1:1080',
      };

      const result = await startProxy(config);

      expect(result).toBe(config.addr);
    });
  });
});
