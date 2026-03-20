import { describe, it, expect } from 'vitest';
import { generateRequestId, getTimestamp, formatBytes, parseAddress } from '../utils';

describe('utils', () => {
  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
    });

    it('should generate request IDs with timestamp and counter format', () => {
      const id = generateRequestId();
      const parts = id.split('-');
      expect(parts.length).toBe(2);
      expect(Number.parseInt(parts[0], 10)).toBeGreaterThan(0);
      expect(Number.parseInt(parts[1], 10)).toBeGreaterThan(0);
    });
  });

  describe('getTimestamp', () => {
    it('should return ISO format timestamp', () => {
      const timestamp = getTimestamp();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    it('should format bytes to B', () => {
      expect(formatBytes(512)).toBe('512.00 B');
      expect(formatBytes(1023)).toBe('1023.00 B');
    });

    it('should format bytes to KB', () => {
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(1536)).toBe('1.50 KB');
      expect(formatBytes(10240)).toBe('10.00 KB');
    });

    it('should format bytes to MB', () => {
      expect(formatBytes(1048576)).toBe('1.00 MB');
      expect(formatBytes(1572864)).toBe('1.50 MB');
      expect(formatBytes(10485760)).toBe('10.00 MB');
    });

    it('should format bytes to GB', () => {
      expect(formatBytes(1073741824)).toBe('1.00 GB');
      expect(formatBytes(1610612736)).toBe('1.50 GB');
    });
  });

  describe('parseAddress', () => {
    it('should parse host:port correctly', () => {
      const result = parseAddress('127.0.0.1:8080');
      expect(result.host).toBe('127.0.0.1');
      expect(result.port).toBe(8080);
    });

    it('should parse domain:port correctly', () => {
      const result = parseAddress('example.com:443');
      expect(result.host).toBe('example.com');
      expect(result.port).toBe(443);
    });

    it('should parse IPv6 address with port', () => {
      const result = parseAddress('[::1]:8080');
      expect(result.host).toBe('[::1]');
      expect(result.port).toBe(8080);
    });

    it('should throw on invalid address without port', () => {
      expect(() => parseAddress('example.com')).toThrow('无效的地址格式: example.com');
    });

    it('should throw on invalid address with empty host', () => {
      expect(() => parseAddress(':8080')).toThrow('无效的地址格式: :8080');
    });

    it('should throw on invalid address with non-numeric port', () => {
      expect(() => parseAddress('example.com:abc')).toThrow('无效的地址格式: example.com:abc');
    });

    it('should throw on empty string', () => {
      expect(() => parseAddress('')).toThrow('无效的地址格式: ');
    });
  });
});