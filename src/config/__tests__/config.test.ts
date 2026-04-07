import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadConfig } from '../config';

const mockReadFile = vi.fn();
vi.mock('node:fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

describe('config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadConfig', () => {
    it('should load valid config', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          addr: '127.0.0.1:8080',
          socks_addr: '127.0.0.1:1080',
          log_path: './logs',
          whitelist: ['example.com'],
        }),
      );

      const config = await loadConfig('config.json');

      expect(config.addr).toBe('127.0.0.1:8080');
      expect(config.socks_addr).toBe('127.0.0.1:1080');
      expect(config.log_path).toBe('./logs');
      expect(config.whitelist).toEqual(['example.com']);
    });

    it('should load config with comments', async () => {
      mockReadFile.mockResolvedValueOnce(
        `{
        // This is a comment
        addr: "127.0.0.1:8080",
        socks_addr: "127.0.0.1:1080",
        /* Block comment */
      }`,
      );

      const config = await loadConfig('config.json');

      expect(config.addr).toBe('127.0.0.1:8080');
      expect(config.socks_addr).toBe('127.0.0.1:1080');
    });

    it('should throw when addr is missing', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          socks_addr: '127.0.0.1:1080',
        }),
      );

      await expect(loadConfig('config.json')).rejects.toThrow(
        "Config must contain 'addr' and 'socks_addr' properties",
      );
    });

    it('should throw when socks_addr is missing', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          addr: '127.0.0.1:8080',
        }),
      );

      await expect(loadConfig('config.json')).rejects.toThrow(
        "Config must contain 'addr' and 'socks_addr' properties",
      );
    });

    it('should throw when whitelist is not an array', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          addr: '127.0.0.1:8080',
          socks_addr: '127.0.0.1:1080',
          whitelist: 'not-an-array',
        }),
      );

      await expect(loadConfig('config.json')).rejects.toThrow(
        'Whitelist must be an array of domain strings',
      );
    });

    it('should throw when whitelist contains non-string', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          addr: '127.0.0.1:8080',
          socks_addr: '127.0.0.1:1080',
          whitelist: ['valid', 123, 'another'],
        }),
      );

      await expect(loadConfig('config.json')).rejects.toThrow(
        'Whitelist entry at index 1 must be a string',
      );
    });

    it('should throw when whitelist contains empty string', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          addr: '127.0.0.1:8080',
          socks_addr: '127.0.0.1:1080',
          whitelist: ['valid', '', 'another'],
        }),
      );

      await expect(loadConfig('config.json')).rejects.toThrow(
        'Whitelist entry at index 1 cannot be empty',
      );
    });

    it('should allow empty whitelist', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          addr: '127.0.0.1:8080',
          socks_addr: '127.0.0.1:1080',
          whitelist: [],
        }),
      );

      const config = await loadConfig('config.json');

      expect(config.whitelist).toEqual([]);
    });

    it('should allow optional log_path', async () => {
      mockReadFile.mockResolvedValueOnce(
        JSON.stringify({
          addr: '127.0.0.1:8080',
          socks_addr: '127.0.0.1:1080',
        }),
      );

      const config = await loadConfig('config.json');

      expect(config.log_path).toBeUndefined();
    });

    it('should throw when file does not exist', async () => {
      mockReadFile.mockRejectedValueOnce(new Error('ENOENT'));

      await expect(loadConfig('nonexistent.json')).rejects.toThrow(
        '加载配置失败: ENOENT',
      );
    });

    it('should throw on invalid JSON', async () => {
      mockReadFile.mockResolvedValueOnce('not valid json');

      await expect(loadConfig('config.json')).rejects.toThrow();
    });

    it('should rethrow non-Error exceptions', async () => {
      mockReadFile.mockRejectedValueOnce('string error');

      await expect(loadConfig('config.json')).rejects.toBe('string error');
    });
  });
});
