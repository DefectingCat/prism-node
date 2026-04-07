import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as http from 'node:http';
import type { ParsedAddress } from '../../config/types';

// Mock dependencies - must be before importing the module under test
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../../utils/utils', () => ({
  generateRequestId: vi.fn().mockReturnValue('test-req-id'),
}));

vi.mock('../../utils/whitelist', () => ({
  isDomainInWhitelist: vi.fn().mockReturnValue(false),
  excludeFromWhitelist: vi.fn(),
  resetWhitelist: vi.fn(),
}));

vi.mock('socks', () => ({
  SocksClient: {
    createConnection: vi.fn(),
  },
}));

vi.mock('node:net', () => ({
  createConnection: vi.fn(),
  default: {
    createConnection: vi.fn(),
  },
}));

// Import after mocks
import { SocksClient } from 'socks';
import { createConnection } from 'node:net';
import { handleHttpRequest } from '../http-handler';

const mockSocksAddr: ParsedAddress = { host: '127.0.0.1', port: 1080 };

const createMockRequest = (
  overrides: Partial<http.IncomingMessage> = {},
): http.IncomingMessage => {
  return {
    url: 'http://example.com/path',
    method: 'GET',
    headers: { host: 'example.com' },
    socket: {
      encrypted: false,
      on: vi.fn(),
      removeAllListeners: vi.fn(),
    } as any,
    on: vi.fn(),
    ...overrides,
  } as http.IncomingMessage;
};

const createMockResponse = (): http.ServerResponse => {
  return {
    writeHead: vi.fn(),
    end: vi.fn(),
    write: vi.fn(),
    headersSent: false,
    destroyed: false,
  } as any;
};

const createMockSocket = () => {
  return {
    write: vi.fn().mockReturnValue(true),
    destroy: vi.fn(),
    end: vi.fn(),
    destroyed: false,
    writable: true,
    on: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
  };
};

describe('http-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleHttpRequest', () => {
    it('should return 400 when URL is not provided', async () => {
      const req = createMockRequest({ url: undefined });
      const res = createMockResponse();

      await handleHttpRequest(req, res, mockSocksAddr);

      expect(res.writeHead).toHaveBeenCalledWith(400, {
        'Content-Type': 'text/plain',
      });
      expect(res.end).toHaveBeenCalledWith('Bad Request: No URL provided');
    });

    it('should return 400 for invalid URL without Host header', async () => {
      const req = createMockRequest({
        url: 'not-a-valid-url',
        headers: {},
      });
      const res = createMockResponse();

      await handleHttpRequest(req, res, mockSocksAddr);

      expect(res.writeHead).toHaveBeenCalledWith(400, {
        'Content-Type': 'text/plain',
      });
      expect(res.end).toHaveBeenCalledWith('Bad Request: Invalid URL');
    });

    it('should construct URL using Host header for relative URLs', async () => {
      const req = createMockRequest({
        url: '/path?query=1',
        headers: { host: 'example.com' },
      });
      const res = createMockResponse();

      const mockSocket = createMockSocket();
      (SocksClient.createConnection as any).mockResolvedValueOnce({
        socket: mockSocket,
      });

      await handleHttpRequest(req, res, mockSocksAddr);

      expect(SocksClient.createConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: expect.objectContaining({
            host: 'example.com',
            port: 80,
          }),
        }),
      );
    });

    it('should use HTTPS port for https URLs', async () => {
      const req = createMockRequest({
        url: 'https://example.com/path',
        headers: { host: 'example.com' },
      });
      const res = createMockResponse();

      const mockSocket = createMockSocket();
      (SocksClient.createConnection as any).mockResolvedValueOnce({
        socket: mockSocket,
      });

      await handleHttpRequest(req, res, mockSocksAddr);

      expect(SocksClient.createConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: expect.objectContaining({
            host: 'example.com',
            port: 443,
          }),
        }),
      );
    });

    it('should return 502 when SOCKS connection fails', async () => {
      const req = createMockRequest({
        url: 'http://example.com/path',
      });
      const res = createMockResponse();

      (SocksClient.createConnection as any).mockRejectedValueOnce(
        new Error('Connection refused'),
      );

      await handleHttpRequest(req, res, mockSocksAddr);

      expect(res.writeHead).toHaveBeenCalledWith(502, {
        'Content-Type': 'text/plain',
      });
      expect(res.end).toHaveBeenCalledWith(
        'Bad Gateway: SOCKS5 connection failed',
      );
    });

    // 白名单直连测试
    it('should call createConnection for whitelisted domain', async () => {
      const req = createMockRequest({
        url: 'http://whitelist.com/path',
        headers: { host: 'whitelist.com' },
      });
      const res = createMockResponse();

      const { isDomainInWhitelist } = await import('../../utils/whitelist.js');
      (isDomainInWhitelist as any).mockReturnValueOnce(true);

      const mockTargetSocket = createMockSocket();
      (createConnection as any).mockImplementationOnce(
        (_port: number, _host: string, callback: () => void) => {
          if (callback) callback();
          return mockTargetSocket;
        },
      );

      await handleHttpRequest(req, res, mockSocksAddr);

      expect(createConnection).toHaveBeenCalled();
      expect(SocksClient.createConnection).not.toHaveBeenCalled();
    });

    // 测试非标准端口
    it('should handle non-standard port correctly', async () => {
      const req = createMockRequest({
        url: 'http://example.com:8080/path',
        headers: { host: 'example.com:8080' },
      });
      const res = createMockResponse();

      const mockSocket = createMockSocket();
      (SocksClient.createConnection as any).mockResolvedValueOnce({
        socket: mockSocket,
      });

      await handleHttpRequest(req, res, mockSocksAddr);

      expect(SocksClient.createConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: expect.objectContaining({
            port: 8080,
          }),
        }),
      );
    });

    // 测试 SOCKS 连接建立成功
    it('should establish SOCKS connection with correct options', async () => {
      const req = createMockRequest({
        url: 'http://example.com:8080/path',
        headers: { host: 'example.com:8080' },
      });
      const res = createMockResponse();

      const mockSocket = createMockSocket();
      (SocksClient.createConnection as any).mockResolvedValueOnce({
        socket: mockSocket,
      });

      await handleHttpRequest(req, res, mockSocksAddr);

      expect(SocksClient.createConnection).toHaveBeenCalledWith({
        proxy: {
          host: mockSocksAddr.host,
          port: mockSocksAddr.port,
          type: 5,
        },
        command: 'connect',
        destination: {
          host: 'example.com',
          port: 8080,
        },
      });
    });

    // 测试 URL 解析
    it('should parse URL hostname correctly', async () => {
      const req = createMockRequest({
        url: 'http://sub.example.com/path',
        headers: { host: 'sub.example.com' },
      });
      const res = createMockResponse();

      const mockSocket = createMockSocket();
      (SocksClient.createConnection as any).mockResolvedValueOnce({
        socket: mockSocket,
      });

      await handleHttpRequest(req, res, mockSocksAddr);

      expect(SocksClient.createConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: expect.objectContaining({
            host: 'sub.example.com',
          }),
        }),
      );
    });

    // 测试默认端口
    it('should use port 80 for http URLs without explicit port', async () => {
      const req = createMockRequest({
        url: 'http://example.com/',
        headers: { host: 'example.com' },
      });
      const res = createMockResponse();

      const mockSocket = createMockSocket();
      (SocksClient.createConnection as any).mockResolvedValueOnce({
        socket: mockSocket,
      });

      await handleHttpRequest(req, res, mockSocksAddr);

      expect(SocksClient.createConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: expect.objectContaining({
            port: 80,
          }),
        }),
      );
    });

    // 测试 HTTPS 默认端口
    it('should use port 443 for https URLs without explicit port', async () => {
      const req = createMockRequest({
        url: 'https://example.com/',
        headers: { host: 'example.com' },
      });
      const res = createMockResponse();

      const mockSocket = createMockSocket();
      (SocksClient.createConnection as any).mockResolvedValueOnce({
        socket: mockSocket,
      });

      await handleHttpRequest(req, res, mockSocksAddr);

      expect(SocksClient.createConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: expect.objectContaining({
            port: 443,
          }),
        }),
      );
    });
  });
});
