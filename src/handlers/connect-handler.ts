import type { IncomingMessage } from 'node:http';
import * as net from 'node:net';
import { SocksClient } from 'socks';
import type { ParsedAddress } from '../config/types';
import logger from '../utils/logger';
import { formatBytes, generateRequestId } from '../utils/utils';
import { isDomainInWhitelist } from '../utils/whitelist';

/**
 * 处理不经过 SOCKS5 代理的直接 HTTPS CONNECT 请求
 * @param req - HTTP CONNECT 请求对象
 * @param clientSocket - 客户端套接字
 * @param head - 升级流的第一个数据包
 * @param targetHost - 目标主机
 * @param targetPort - 目标端口
 * @param requestId - 用于日志记录的请求 ID
 */
async function handleDirectHttpsConnect(
  _req: IncomingMessage,
  clientSocket: net.Socket,
  head: Buffer,
  targetHost: string,
  targetPort: number,
  requestId: string,
): Promise<void> {
  logger.info(
    `[HTTPS] [${requestId}] Using direct connection for ${targetHost}:${targetPort}`,
  );

  return new Promise((resolve, reject) => {
    // 创建到目标的直接 TCP 连接
    const targetSocket = net.createConnection(targetPort, targetHost, () => {
      logger.info(`[HTTPS] [${requestId}] Direct tunnel established`);

      // 向客户端发送 200 Connection established 响应
      if (
        !safeSocketWrite(
          clientSocket,
          'HTTP/1.1 200 Connection Established\r\n\r\n',
          requestId,
        )
      ) {
        clientSocket.destroy();
        reject(new Error('Failed to write connection established response'));
        return;
      }

      // 如果有来自客户端的初始数据，将其转发到目标
      if (head && head.length > 0) {
        logger.debug(
          `[HTTPS] [${requestId}] Forwarding ${head.length} bytes of initial data`,
        );
        safeSocketWrite(targetSocket, head, requestId);
      }

      // 设置客户端和目标之间的双向数据转发
      let bytesToClient = 0;
      let bytesToTarget = 0;

      clientSocket.on('data', (chunk) => {
        if (!targetSocket.destroyed) {
          bytesToTarget += chunk.length;
          safeSocketWrite(targetSocket, chunk, requestId);
        }
      });

      targetSocket.on('data', (chunk) => {
        if (!clientSocket.destroyed) {
          bytesToClient += chunk.length;
          safeSocketWrite(clientSocket, chunk, requestId);
        }
      });

      // 处理连接关闭
      clientSocket.on('end', () => {
        logger.info(`[HTTPS] [${requestId}] Client connection closed`);
        if (!targetSocket.destroyed) {
          targetSocket.end();
        }
      });

      targetSocket.on('end', () => {
        logger.info(`[HTTPS] [${requestId}] Target connection closed`);
        if (!clientSocket.destroyed) {
          clientSocket.end();
        }
      });

      // 处理连接错误
      clientSocket.on('error', (error) => {
        logger.warn(
          `[HTTPS] [${requestId}] Client connection error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        if (!targetSocket.destroyed) {
          targetSocket.destroy();
        }
      });

      targetSocket.on('error', (error) => {
        logger.warn(
          `[HTTPS] [${requestId}] Target connection error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        if (!clientSocket.destroyed) {
          clientSocket.destroy();
        }
      });

      // 当任一端关闭时记录最终传输量
      const logFinalTransfer = () => {
        logger.info(
          `[HTTPS] [${requestId}] Transfer complete - ↑${formatBytes(bytesToTarget)} ↓${formatBytes(bytesToClient)}`,
        );
      };

      clientSocket.once('close', logFinalTransfer);
      targetSocket.once('close', logFinalTransfer);

      resolve();
    });

    targetSocket.on('error', (error) => {
      logger.error(
        `[HTTPS] [${requestId}] Direct tunnel failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      safeSocketDestroy(clientSocket, requestId);
      reject(error);
    });
  });
}

/**
 * 安全地写入套接字，优雅地处理潜在错误
 * @param socket - 要写入的套接字
 * @param data - 要写入的数据
 * @param requestId - 用于日志记录的请求 ID
 * @returns 如果写入成功则返回 true，否则返回 false
 */
function safeSocketWrite(
  socket: net.Socket,
  data: string | Buffer,
  requestId: string,
): boolean {
  try {
    if (socket.writable && !socket.destroyed) {
      return socket.write(data);
    } else {
      logger.warn(
        `[HTTPS] [${requestId}] Socket is not writable, skipping write`,
      );
      return false;
    }
  } catch (error) {
    logger.warn(
      `[HTTPS] [${requestId}] Error writing to socket: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
  }
}

/**
 * 安全地销毁套接字
 * @param socket - 要销毁的套接字
 * @param requestId - 用于日志记录的请求 ID
 */
function safeSocketDestroy(socket: net.Socket, requestId: string): void {
  try {
    socket.destroy();
  } catch (error) {
    logger.warn(
      `[HTTPS] [${requestId}] Error destroying socket: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * 通过 SOCKS5 代理建立隧道来处理 HTTPS CONNECT 请求
 * @param req - HTTP CONNECT 请求对象
 * @param clientSocket - 连接的客户端套接字
 * @param head - 升级流的第一个数据包（可能为空）
 * @param socksAddr - SOCKS5 代理地址
 */
export async function handleConnect(
  req: IncomingMessage,
  clientSocket: net.Socket,
  head: Buffer,
  socksAddr: ParsedAddress,
): Promise<void> {
  const requestId = generateRequestId();

  try {
    // 解析 CONNECT 请求 URL（格式：hostname:port）
    if (!req.url) {
      logger.warn(`[HTTPS] [${requestId}] No URL provided in CONNECT request`);
      clientSocket.destroy();
      return;
    }

    const [targetHost, targetPortStr] = req.url.split(':');
    const targetPort = parseInt(targetPortStr, 10);

    if (
      !targetHost ||
      isNaN(targetPort) ||
      targetPort < 1 ||
      targetPort > 65535
    ) {
      logger.warn(`[HTTPS] [${requestId}] Invalid CONNECT target: ${req.url}`);
      clientSocket.destroy();
      return;
    }

    // 检查域名是否在白名单中以便直连
    const useDirectConnection = isDomainInWhitelist(targetHost);

    if (useDirectConnection) {
      await handleDirectHttpsConnect(
        req,
        clientSocket,
        head,
        targetHost,
        targetPort,
        requestId,
      );
      return;
    }

    logger.info(
      `[HTTPS] [${requestId}] CONNECT ${targetHost}:${targetPort} via SOCKS5`,
    );

    // 创建 SOCKS5 连接选项
    const socksOptions = {
      proxy: {
        host: socksAddr.host,
        port: socksAddr.port,
        type: 5 as any,
      },
      command: 'connect' as const,
      destination: {
        host: targetHost,
        port: targetPort,
      },
    };

    // 建立 SOCKS5 连接
    const socksConnection = await SocksClient.createConnection(socksOptions);
    logger.info(`[HTTPS] [${requestId}] SOCKS5 tunnel established`);

    // 向客户端发送 200 Connection established 响应
    if (
      !safeSocketWrite(
        clientSocket,
        'HTTP/1.1 200 Connection Established\r\n\r\n',
        requestId,
      )
    ) {
      clientSocket.destroy();
      return;
    }

    const targetSocket = socksConnection.socket;

    // 如果有来自客户端的初始数据，将其转发到目标
    if (head && head.length > 0) {
      logger.debug(
        `[HTTPS] [${requestId}] Forwarding ${head.length} bytes of initial data`,
      );
      safeSocketWrite(targetSocket, head, requestId);
    }

    // 设置客户端和目标之间的双向数据转发
    let bytesToClient = 0;
    let bytesToTarget = 0;

    clientSocket.on('data', (chunk) => {
      if (!targetSocket.destroyed) {
        bytesToTarget += chunk.length;
        safeSocketWrite(targetSocket, chunk, requestId);
      }
    });

    targetSocket.on('data', (chunk) => {
      if (!clientSocket.destroyed) {
        bytesToClient += chunk.length;
        safeSocketWrite(clientSocket, chunk, requestId);
      }
    });

    // 处理连接关闭
    clientSocket.on('end', () => {
      logger.info(`[HTTPS] [${requestId}] Client connection closed`);
      if (!targetSocket.destroyed) {
        targetSocket.end();
      }
    });

    targetSocket.on('end', () => {
      logger.info(`[HTTPS] [${requestId}] Target connection closed`);
      if (!clientSocket.destroyed) {
        clientSocket.end();
      }
    });

    // 处理连接错误
    clientSocket.on('error', (error) => {
      logger.warn(
        `[HTTPS] [${requestId}] Client connection error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (!targetSocket.destroyed) {
        targetSocket.destroy();
      }
    });

    targetSocket.on('error', (error) => {
      logger.warn(
        `[HTTPS] [${requestId}] Target connection error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (!clientSocket.destroyed) {
        clientSocket.destroy();
      }
    });

    // 当任一端关闭时记录最终传输量
    const logFinalTransfer = () => {
      logger.info(
        `[HTTPS] [${requestId}] Transfer complete - ↑${formatBytes(bytesToTarget)} ↓${formatBytes(bytesToClient)}`,
      );
    };

    clientSocket.once('close', logFinalTransfer);
    targetSocket.once('close', logFinalTransfer);
  } catch (error) {
    logger.error(
      `[HTTPS] [${requestId}] CONNECT failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    safeSocketDestroy(clientSocket, requestId);
  }
}
