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

// Import after mocks
import { SocksClient } from 'socks';
import { handleHttpRequest } from '../http-handler';

describe('http-handler', () => {
  const mockSocksAddr: ParsedAddress = { host: '127.0.0.1', port: 1080 };

  const createMockRequest = (overrides: Partial<http.IncomingMessage> = {}): http.IncomingMessage => {
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
      headersSent: false,
      destroyed: false,
    } as any;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleHttpRequest', () => {
    it('should return 400 when URL is not provided', async () => {
      const req = createMockRequest({ url: undefined });
      const res = createMockResponse();

      await handleHttpRequest(req, res, mockSocksAddr);

      expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'text/plain' });
      expect(res.end).toHaveBeenCalledWith('Bad Request: No URL provided');
    });

    it('should return 400 for invalid URL without Host header', async () => {
      const req = createMockRequest({
        url: 'not-a-valid-url',
        headers: {},
      });
      const res = createMockResponse();

      await handleHttpRequest(req, res, mockSocksAddr);

      expect(res.writeHead).toHaveBeenCalledWith(400, { 'Content-Type': 'text/plain' });
      expect(res.end).toHaveBeenCalledWith('Bad Request: Invalid URL');
    });

    it('should construct URL using Host header for relative URLs', async () => {
      const req = createMockRequest({
        url: '/path?query=1',
        headers: { host: 'example.com' },
      });
      const res = createMockResponse();

      // Mock SocksClient to succeed
      (SocksClient.createConnection as any).mockResolvedValueOnce({
        socket: {
          write: vi.fn(),
          on: vi.fn(),
          once: vi.fn(),
        },
      });

      await handleHttpRequest(req, res, mockSocksAddr);

      // Should attempt SOCKS connection with correct host
      expect(SocksClient.createConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: expect.objectContaining({
            host: 'example.com',
            port: 80,
          }),
        })
      );
    });

    it('should use HTTPS port for https URLs', async () => {
      const req = createMockRequest({
        url: 'https://example.com/path',
        headers: { host: 'example.com' },
      });
      const res = createMockResponse();

      (SocksClient.createConnection as any).mockResolvedValueOnce({
        socket: {
          write: vi.fn(),
          on: vi.fn(),
          once: vi.fn(),
        },
      });

      await handleHttpRequest(req, res, mockSocksAddr);

      expect(SocksClient.createConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: expect.objectContaining({
            host: 'example.com',
            port: 443,
          }),
        })
      );
    });

    it('should return 502 when SOCKS connection fails', async () => {
      const req = createMockRequest({
        url: 'http://example.com/path',
      });
      const res = createMockResponse();

      (SocksClient.createConnection as any).mockRejectedValueOnce(new Error('Connection refused'));

      await handleHttpRequest(req, res, mockSocksAddr);

      expect(res.writeHead).toHaveBeenCalledWith(502, { 'Content-Type': 'text/plain' });
      expect(res.end).toHaveBeenCalledWith('Bad Gateway: SOCKS5 connection failed');
    });
  });
});
