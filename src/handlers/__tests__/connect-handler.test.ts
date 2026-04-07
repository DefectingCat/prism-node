import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as http from 'node:http';
import * as net from 'node:net';
import { SocksClient } from 'socks';
import { handleConnect } from '../connect-handler';
import type { ParsedAddress } from '../../config/types';

// Mock dependencies
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
  formatBytes: vi.fn((bytes: number) => `${bytes}B`),
}));

vi.mock('../../utils/whitelist', () => ({
  isDomainInWhitelist: vi.fn().mockReturnValue(false),
}));

vi.mock('socks', () => ({
  SocksClient: {
    createConnection: vi.fn(),
  },
}));

describe('connect-handler', () => {
  const mockSocksAddr: ParsedAddress = { host: '127.0.0.1', port: 1080 };

  const createMockRequest = (overrides: Partial<http.IncomingMessage> = {}): http.IncomingMessage => {
    return {
      url: 'example.com:443',
      method: 'CONNECT',
      headers: {},
      ...overrides,
    } as http.IncomingMessage;
  };

  const createMockSocket = (): net.Socket => {
    return {
      write: vi.fn().mockReturnValue(true),
      destroy: vi.fn(),
      end: vi.fn(),
      destroyed: false,
      writable: true,
      on: vi.fn(),
      once: vi.fn(),
    } as any;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleConnect', () => {
    it('should destroy socket when URL is not provided', async () => {
      const req = createMockRequest({ url: undefined });
      const clientSocket = createMockSocket();

      await handleConnect(req, clientSocket, Buffer.alloc(0), mockSocksAddr);

      expect(clientSocket.destroy).toHaveBeenCalled();
    });

    it('should destroy socket for invalid target format', async () => {
      const req = createMockRequest({ url: 'invalid-url' });
      const clientSocket = createMockSocket();

      await handleConnect(req, clientSocket, Buffer.alloc(0), mockSocksAddr);

      expect(clientSocket.destroy).toHaveBeenCalled();
    });

    it('should destroy socket for invalid port', async () => {
      const req = createMockRequest({ url: 'example.com:abc' });
      const clientSocket = createMockSocket();

      await handleConnect(req, clientSocket, Buffer.alloc(0), mockSocksAddr);

      expect(clientSocket.destroy).toHaveBeenCalled();
    });

    it('should destroy socket for port out of range', async () => {
      const req = createMockRequest({ url: 'example.com:70000' });
      const clientSocket = createMockSocket();

      await handleConnect(req, clientSocket, Buffer.alloc(0), mockSocksAddr);

      expect(clientSocket.destroy).toHaveBeenCalled();
    });

    it('should destroy socket for port 0', async () => {
      const req = createMockRequest({ url: 'example.com:0' });
      const clientSocket = createMockSocket();

      await handleConnect(req, clientSocket, Buffer.alloc(0), mockSocksAddr);

      expect(clientSocket.destroy).toHaveBeenCalled();
    });

    it('should destroy socket when SOCKS connection fails', async () => {
      const req = createMockRequest({ url: 'example.com:443' });
      const clientSocket = createMockSocket();

      (SocksClient.createConnection as any).mockRejectedValueOnce(new Error('Connection refused'));

      await handleConnect(req, clientSocket, Buffer.alloc(0), mockSocksAddr);

      expect(clientSocket.destroy).toHaveBeenCalled();
    });

    it('should establish tunnel when SOCKS connection succeeds', async () => {
      const req = createMockRequest({ url: 'example.com:443' });
      const clientSocket = createMockSocket();
      const targetSocket = createMockSocket();

      (SocksClient.createConnection as any).mockResolvedValueOnce({
        socket: targetSocket,
      });

      await handleConnect(req, clientSocket, Buffer.alloc(0), mockSocksAddr);

      // Should send 200 Connection Established response
      expect(clientSocket.write).toHaveBeenCalledWith(
        'HTTP/1.1 200 Connection Established\r\n\r\n'
      );
    });

    it('should forward initial data when provided', async () => {
      const req = createMockRequest({ url: 'example.com:443' });
      const clientSocket = createMockSocket();
      const targetSocket = createMockSocket();
      const head = Buffer.from('initial data');

      (SocksClient.createConnection as any).mockResolvedValueOnce({
        socket: targetSocket,
      });

      await handleConnect(req, clientSocket, head, mockSocksAddr);

      // Should forward head data to target socket
      expect(targetSocket.write).toHaveBeenCalledWith(head);
    });

    it('should use correct SOCKS5 proxy options', async () => {
      const req = createMockRequest({ url: 'example.com:443' });
      const clientSocket = createMockSocket();

      (SocksClient.createConnection as any).mockResolvedValueOnce({
        socket: createMockSocket(),
      });

      await handleConnect(req, clientSocket, Buffer.alloc(0), mockSocksAddr);

      expect(SocksClient.createConnection).toHaveBeenCalledWith({
        proxy: {
          host: mockSocksAddr.host,
          port: mockSocksAddr.port,
          type: 5,
        },
        command: 'connect',
        destination: {
          host: 'example.com',
          port: 443,
        },
      });
    });

    it('should handle custom port correctly', async () => {
      const req = createMockRequest({ url: 'example.com:8080' });
      const clientSocket = createMockSocket();

      (SocksClient.createConnection as any).mockResolvedValueOnce({
        socket: createMockSocket(),
      });

      await handleConnect(req, clientSocket, Buffer.alloc(0), mockSocksAddr);

      expect(SocksClient.createConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: expect.objectContaining({
            host: 'example.com',
            port: 8080,
          }),
        })
      );
    });
  });
});
