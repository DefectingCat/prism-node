import type * as http from 'node:http';
import type * as net from 'node:net';
import { SocksClient } from 'socks';
import logger from '../utils/logger';
import type { ParsedAddress } from '../config/types';
import { formatBytes, generateRequestId } from '../utils/utils';
import { statsCollector } from '../utils/stats-collector';

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
    clientSocket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
    clientSocket.end();
    return;
  }

  try {
    logger.info(
      `[HTTPS] [${requestId}] Connecting to SOCKS5 proxy ${
        socksAddr.host
      }:${socksAddr.port}...`,
    );

    // Establish connection to target through SOCKS5 proxy
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

    const { socket: socksSocket } = socksConnection;
    logger.info(
      `[HTTPS] [${requestId}] SOCKS5 connection established successfully`,
    );

    // Set socket timeout to prevent hanging connections
    socksSocket.setTimeout(60000);
    clientSocket.setTimeout(60000);

    // Notify client that tunnel is established
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    logger.info(
      `[HTTPS] [${requestId}] Tunnel established, starting data relay`,
    );

    // Forward any initial data from CONNECT request
    if (head.length > 0) {
      socksSocket.write(head);
      bytesFromClient += head.length;
      statsCollector.addBytesUp(requestId, head.length);
    }

    // Track data transfer
    clientSocket.on('data', (chunk) => {
      bytesFromClient += chunk.length;
      statsCollector.addBytesUp(requestId, chunk.length);
    });

    socksSocket.on('data', (chunk) => {
      bytesToClient += chunk.length;
      statsCollector.addBytesDown(requestId, chunk.length);
    });

    // Set up bidirectional data piping between client and SOCKS5 proxy
    socksSocket.pipe(clientSocket);
    clientSocket.pipe(socksSocket);

    // Handle socket errors gracefully
    socksSocket.on('error', (err) => {
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
      clientSocket.destroy();
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
      socksSocket.destroy();
    });

    socksSocket.on('timeout', () => {
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
      socksSocket.destroy();
      clientSocket.destroy();
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
      socksSocket.destroy();
      clientSocket.destroy();
    });

    // Clean up when either side closes
    socksSocket.on('close', () => {
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
      clientSocket.destroy();
    });

    clientSocket.on('close', () => {
      const duration = Date.now() - startTime;
      logger.info(
        `[HTTPS] [${requestId}] Client socket closed (duration: ${duration}ms)`,
      );
      statsCollector.endConnection(requestId, { status: 'success' });
      socksSocket.destroy();
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
    clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
    clientSocket.end();
  }
}
