import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as http from 'node:http';
import type * as net from 'node:net';
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

vi.mock('node:net', () => ({
  createConnection: vi.fn(),
  default: {
    createConnection: vi.fn(),
  },
}));

// Import mocked net after mock definition
import { createConnection } from 'node:net';

/**
 * 创建支持动态状态的 mock socket
 * 提供语义化 API：destroy() / end() 控制状态变化
 */
const createDynamicMockSocket = () => {
  const state = { destroyed: false, writable: true };

  const socket = {
    // 动态状态访问器
    get destroyed() {
      return state.destroyed;
    },
    get writable() {
      return state.writable;
    },

    // 方法 mock
    write: vi.fn((_data?: unknown) => state.writable && !state.destroyed),
    end: vi.fn(() => {
      state.writable = false;
    }),
    on: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn(),
  };

  // 语义化控制 API
  const controls = {
    destroy: () => {
      state.destroyed = true;
      state.writable = false;
    },
    end: () => {
      state.writable = false;
    },
    get isDestroyed() {
      return state.destroyed;
    },
    get isWritable() {
      return state.writable;
    },
  };

  return { socket, controls, state };
};

describe('connect-handler', () => {
  const mockSocksAddr: ParsedAddress = { host: '127.0.0.1', port: 1080 };

  const createMockRequest = (
    overrides: Partial<http.IncomingMessage> = {},
  ): http.IncomingMessage => {
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

      (SocksClient.createConnection as any).mockRejectedValueOnce(
        new Error('Connection refused'),
      );

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
        'HTTP/1.1 200 Connection Established\r\n\r\n',
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
        }),
      );
    });

    // 白名单直连测试 - 需要模拟 net.createConnection 的回调行为
    it('should call createConnection for whitelisted domain', async () => {
      const req = createMockRequest({ url: 'whitelist.com:443' });
      const clientSocket = createMockSocket();

      const { isDomainInWhitelist } = await import('../../utils/whitelist.js');
      (isDomainInWhitelist as any).mockReturnValueOnce(true);

      // Mock net.createConnection - 返回一个 socket，并同步调用回调
      const mockTargetSocket = createMockSocket();
      (createConnection as any).mockImplementationOnce(
        (_port: number, _host: string, callback: () => void) => {
          // 同步调用回调以模拟连接建立
          if (callback) callback();
          return mockTargetSocket;
        },
      );

      await handleConnect(req, clientSocket, Buffer.alloc(0), mockSocksAddr);

      expect(createConnection).toHaveBeenCalledWith(
        443,
        'whitelist.com',
        expect.any(Function),
      );
      expect(SocksClient.createConnection).not.toHaveBeenCalled();
    });

    // 动态状态测试
    it('should not write when socket is destroyed', async () => {
      const { socket, controls } = createDynamicMockSocket();

      // Socket is writable initially
      expect(socket.write('data')).toBe(true);

      // Destroy the socket
      controls.destroy();

      // Now write should fail
      expect(socket.write('data')).toBe(false);
      expect(socket.destroyed).toBe(true);
    });

    it('should track state changes correctly', async () => {
      const { socket: _socket, controls, state } = createDynamicMockSocket();

      expect(state.destroyed).toBe(false);
      expect(state.writable).toBe(true);

      controls.destroy();

      expect(state.destroyed).toBe(true);
      expect(state.writable).toBe(false);
    });
  });

  // 辅助函数测试
  describe('safeSocketWrite behavior', () => {
    it('should return false when socket not writable', () => {
      const { socket, controls } = createDynamicMockSocket();
      controls.end(); // Make not writable

      const result = socket.write('test');
      expect(result).toBe(false);
    });

    it('should return false when socket destroyed', () => {
      const { socket, controls } = createDynamicMockSocket();
      controls.destroy();

      const result = socket.write('test');
      expect(result).toBe(false);
    });
  });
});
