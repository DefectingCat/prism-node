import type { IncomingMessage } from 'node:http';
import * as net from 'node:net';
import { SocksClient } from 'socks';
import type { ParsedAddress } from '../config/types';
import logger from '../utils/logger';
import {
  formatBytes,
  generateRequestId,
  isDomainInWhitelist,
} from '../utils/utils';

/**
 * Handle direct HTTPS CONNECT requests without going through SOCKS5 proxy
 * @param req - HTTP CONNECT request object
 * @param clientSocket - Client socket
 * @param head - First packet of the upgrade stream
 * @param targetHost - Target host
 * @param targetPort - Target port
 * @param requestId - Request ID for logging
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
    // Create direct TCP connection to target
    const targetSocket = net.createConnection(targetPort, targetHost, () => {
      logger.info(`[HTTPS] [${requestId}] Direct tunnel established`);

      // Send 200 Connection established response to client
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

      // If there's initial data from client, forward it to target
      if (head && head.length > 0) {
        logger.debug(
          `[HTTPS] [${requestId}] Forwarding ${head.length} bytes of initial data`,
        );
        safeSocketWrite(targetSocket, head, requestId);
      }

      // Set up bidirectional data forwarding between client and target
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

      // Handle connection closures
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

      // Handle connection errors
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

      // Log final transfer amounts when either side closes
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
 * Safely destroy a socket
 * @param socket - The socket to destroy
 * @param requestId - Request ID for logging
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
 * Handle HTTPS CONNECT requests by establishing tunnel through SOCKS5 proxy
 * @param req - HTTP CONNECT request object
 * @param clientSocket - Client socket for the connection
 * @param head - First packet of the upgrade stream (may be empty)
 * @param socksAddr - SOCKS5 proxy address
 */
export async function handleConnect(
  req: IncomingMessage,
  clientSocket: net.Socket,
  head: Buffer,
  socksAddr: ParsedAddress,
  configWhitelist: string[],
): Promise<void> {
  const requestId = generateRequestId();

  try {
    // Parse CONNECT request URL (format: hostname:port)
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

    // Check if domain is in whitelist for direct connection
    const useDirectConnection = isDomainInWhitelist(
      targetHost,
      configWhitelist,
    );

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

    // Create SOCKS5 connection options
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

    // Establish SOCKS5 connection
    const socksConnection = await SocksClient.createConnection(socksOptions);
    logger.info(`[HTTPS] [${requestId}] SOCKS5 tunnel established`);

    // Send 200 Connection established response to client
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

    // If there's initial data from client, forward it to target
    if (head && head.length > 0) {
      logger.debug(
        `[HTTPS] [${requestId}] Forwarding ${head.length} bytes of initial data`,
      );
      safeSocketWrite(targetSocket, head, requestId);
    }

    // Set up bidirectional data forwarding between client and target
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

    // Handle connection closures
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

    // Handle connection errors
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

    // Log final transfer amounts when either side closes
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
