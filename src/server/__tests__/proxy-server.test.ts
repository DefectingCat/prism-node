import { describe, it, expect, afterEach } from 'vitest';
import * as http from 'node:http';
import { startProxy } from '../proxy-server';
import type { Config } from '../../config/types';

describe('proxy-server', () => {
  const servers: http.Server[] = [];

  afterEach(async () => {
    // Close all servers
    for (const server of servers) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    }
    servers.length = 0;
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
  });
});
