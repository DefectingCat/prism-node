import type * as http from 'node:http';
import * as net from 'node:net';
import { SocksClient } from 'socks';
import type { ParsedAddress } from '../config/types';
import logger from '../utils/logger';
import { statsCollector } from '../utils/stats-collector';
import { formatBytes, generateRequestId, isDomainInBlacklist } from '../utils/utils';

/**
 * Safely write to a socket, handling potential errors gracefully
 * @param socket - The socket to write to
 * @param data - The data to write
 * @param requestId - Request ID for logging
 * @returns true if write was successful, false otherwise
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
 * Safely end a socket connection
 * @param socket - The socket to end
 * @param requestId - Request ID for logging
 */
function safeSocketEnd(socket: net.Socket, requestId: string): void {
  try {
    if (!socket.destroyed) {
      socket.end();
    }
  } catch (error) {
    logger.warn(
      `[HTTPS] [${requestId}] Error ending socket: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Safely destroy a socket
 * @param socket - The socket to destroy
 * @param requestId - Request ID for logging
 */
function safeSocketDestroy(socket: net.Socket, requestId: string): void {
  try {
    if (!socket.destroyed) {
      socket.destroy();
    }
  } catch (error) {
    logger.warn(
      `[HTTPS] [${requestId}] Error destroying socket: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Handles HTTPS CONNECT requests by establishing a secure tunnel through SOCKS5 proxy
 * @param req - HTTP request containing target hostname:port
 * @param clientSocket - Client connection socket
 * @param head - Initial data packet from client
 * @param socksAddr - SOCKS5 proxy server address
 */
export async function handleConnect(
  req: http.IncomingMessage,
  clientSocket: net.Socket,
  head: Buffer,
  socksAddr: ParsedAddress,
): Promise<void> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Parse target destination from CONNECT request URL
  const { port, hostname } = new URL(`http://${req.url}`);
  const targetPort = Number.parseInt(port, 10);

  let bytesFromClient = 0;
  let bytesToClient = 0;

  logger.info(`[HTTPS] [${requestId}] ===== New HTTPS CONNECT =====`);
  logger.info(`[HTTPS] [${requestId}] Target: ${hostname}:${targetPort}`);
  logger.info(
    `[HTTPS] [${requestId}] Client: ${
      clientSocket.remoteAddress
    }:${clientSocket.remotePort}`,
  );
  logger.info(
    `[HTTPS] [${requestId}] Initial data length: ${head.length} bytes`,
  );

  // 开始统计收集
  statsCollector.startConnection(requestId, {
    type: 'HTTPS',
    targetHost: hostname,
    targetPort,
    clientIP: clientSocket.remoteAddress || 'unknown',
  });

  if (!hostname || Number.isNaN(targetPort)) {
    logger.error(`[HTTPS] [${requestId}] ERROR: Invalid target address`);
    await statsCollector.endConnection(requestId, {
      status: 'error',
      errorMessage: 'Invalid target address',
    });
    safeSocketWrite(
      clientSocket,
      'HTTP/1.1 400 Bad Request\r\n\r\n',
      requestId,
    );
    clientSocket.end();
    return;
  }

  try {
    // 检查目标域名是否在黑名单中
    const domainBlacklist = await statsCollector.getDomainBlacklist();
    let targetSocket: net.Socket;

    if (isDomainInBlacklist(hostname, domainBlacklist.blacklist)) {
      logger.warn(`[HTTPS] [${requestId}] Target domain ${hostname} is in blacklist, connecting directly`);
      // 直接连接目标服务器，不通过 SOCKS 代理
      targetSocket = await new Promise((resolve, reject) => {
        const socket = net.createConnection(targetPort, hostname);
        socket.on('connect', () => resolve(socket));
        socket.on('error', (err) => reject(err));
      });
    } else {
      logger.info(
        `[HTTPS] [${requestId}] Connecting to SOCKS5 proxy ${
          socksAddr.host
        }:${socksAddr.port}...`,
      );
      // 通过 SOCKS 代理连接目标服务器
      const socksConnection = await SocksClient.createConnection({
        proxy: {
          host: socksAddr.host,
          port: socksAddr.port,
          type: 5, // SOCKS5 protocol
        },
        command: 'connect',
        destination: {
          host: hostname,
          port: targetPort,
        },
      });
      targetSocket = socksConnection.socket;
      logger.info(
        `[HTTPS] [${requestId}] SOCKS5 connection established successfully`,
      );
    }

    // Set socket timeout to prevent hanging connections
    targetSocket.setTimeout(60000);
    clientSocket.setTimeout(60000);

    // Notify client that tunnel is established
    safeSocketWrite(
      clientSocket,
      'HTTP/1.1 200 Connection Established\r\n\r\n',
      requestId,
    );
    logger.info(
      `[HTTPS] [${requestId}] Tunnel established, starting data relay`,
    );

    // Forward any initial data from CONNECT request
    if (head.length > 0) {
      targetSocket.write(head);
      bytesFromClient += head.length;
      statsCollector.addBytesUp(requestId, head.length);
    }

    // Track data transfer
    clientSocket.on('data', (chunk) => {
      bytesFromClient += chunk.length;
      statsCollector.addBytesUp(requestId, chunk.length);
    });

    targetSocket.on('data', (chunk) => {
      bytesToClient += chunk.length;
      statsCollector.addBytesDown(requestId, chunk.length);
    });

    // Set up bidirectional data piping between client and SOCKS5 proxy
    targetSocket.pipe(clientSocket);
    clientSocket.pipe(targetSocket);

    // Handle socket errors gracefully
    targetSocket.on('error', (err) => {
      const duration = Date.now() - startTime;
      logger.error(`[HTTPS] [${requestId}] SOCKS socket error: ${err.message}`);
      logger.error(
        `[HTTPS] [${requestId}] Duration: ${duration}ms, Sent: ${formatBytes(
          bytesFromClient,
        )}, Received: ${formatBytes(bytesToClient)}`,
      );
      statsCollector.endConnection(requestId, {
        status: 'error',
        errorMessage: err.message,
      });
      safeSocketDestroy(clientSocket, requestId);
    });

    clientSocket.on('error', (err) => {
      const duration = Date.now() - startTime;
      logger.error(
        `[HTTPS] [${requestId}] Client socket error: ${err.message}`,
      );
      logger.error(
        `[HTTPS] [${requestId}] Duration: ${duration}ms, Sent: ${formatBytes(
          bytesFromClient,
        )}, Received: ${formatBytes(bytesToClient)}`,
      );
      statsCollector.endConnection(requestId, {
        status: 'error',
        errorMessage: err.message,
      });
      safeSocketDestroy(targetSocket, requestId);
    });

    targetSocket.on('timeout', () => {
      const duration = Date.now() - startTime;
      logger.error(
        `[HTTPS] [${requestId}] SOCKS socket timeout after ${duration}ms`,
      );
      logger.error(
        `[HTTPS] [${requestId}] Sent: ${formatBytes(
          bytesFromClient,
        )}, Received: ${formatBytes(bytesToClient)}`,
      );
      statsCollector.endConnection(requestId, {
        status: 'timeout',
        errorMessage: `Socket timeout after ${duration}ms`,
      });
      safeSocketDestroy(targetSocket, requestId);
      safeSocketDestroy(clientSocket, requestId);
    });

    clientSocket.on('timeout', () => {
      const duration = Date.now() - startTime;
      logger.error(
        `[HTTPS] [${requestId}] Client socket timeout after ${duration}ms`,
      );
      logger.error(
        `[HTTPS] [${requestId}] Sent: ${formatBytes(
          bytesFromClient,
        )}, Received: ${formatBytes(bytesToClient)}`,
      );
      statsCollector.endConnection(requestId, {
        status: 'timeout',
        errorMessage: `Client timeout after ${duration}ms`,
      });
      safeSocketDestroy(targetSocket, requestId);
      safeSocketDestroy(clientSocket, requestId);
    });

    // Clean up when either side closes
    targetSocket.on('close', () => {
      const duration = Date.now() - startTime;
      logger.info(`[HTTPS] [${requestId}] SOCKS socket closed`);
      logger.info(`[HTTPS] [${requestId}] Duration: ${duration}ms`);
      logger.info(
        `[HTTPS] [${requestId}] Bytes from client: ${formatBytes(
          bytesFromClient,
        )}`,
      );
      logger.info(
        `[HTTPS] [${requestId}] Bytes to client: ${formatBytes(bytesToClient)}`,
      );
      logger.info(`[HTTPS] [${requestId}] ===== Tunnel Closed =====\n`);

      statsCollector.endConnection(requestId, { status: 'success' });
      safeSocketDestroy(clientSocket, requestId);
    });

    clientSocket.on('close', () => {
      const duration = Date.now() - startTime;
      logger.info(
        `[HTTPS] [${requestId}] Client socket closed (duration: ${duration}ms)`,
      );
      statsCollector.endConnection(requestId, { status: 'success' });
      safeSocketDestroy(targetSocket, requestId);
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      `[HTTPS] [${requestId}] SOCKS connection failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    logger.error(
      `[HTTPS] [${requestId}] Duration before failure: ${duration}ms`,
    );
    await statsCollector.endConnection(requestId, {
      status: 'error',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    safeSocketWrite(
      clientSocket,
      'HTTP/1.1 502 Bad Gateway\r\n\r\n',
      requestId,
    );
    safeSocketEnd(clientSocket, requestId);
  }
}
