import type * as http from 'node:http';
import type * as net from 'node:net';
import { SocksClient } from 'socks';
import type { ParsedAddress } from '../config/types';
import logger from '../utils/logger';
import { statsCollector } from '../utils/stats-collector';
import { formatBytes, generateRequestId } from '../utils/utils';

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
        `[HTTP] [${requestId}] Socket is not writable, skipping write`,
      );
      return false;
    }
  } catch (error) {
    logger.warn(
      `[HTTP] [${requestId}] Error writing to socket: ${
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
    if (!socket.destroyed) {
      socket.destroy();
    }
  } catch (error) {
    logger.warn(
      `[HTTP] [${requestId}] Error destroying socket: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Handles standard HTTP requests (GET, POST, etc.) by forwarding through SOCKS5 proxy
 * @param req - HTTP request object
 * @param res - HTTP response object
 * @param socksAddr - SOCKS5 proxy server address
 */
export async function handleHttpRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  socksAddr: ParsedAddress,
): Promise<void> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const targetHost = url.hostname;
  const targetPort = url.port ? Number.parseInt(url.port, 10) : 80;

  let bytesReceived = 0;
  let bytesSent = 0;

  logger.info(`[HTTP] [${requestId}] ===== New HTTP Request =====`);
  logger.info(`[HTTP] [${requestId}] Method: ${req.method}`);
  logger.info(`[HTTP] [${requestId}] Target: ${targetHost}:${targetPort}`);
  logger.info(`[HTTP] [${requestId}] URL: ${url.href}`);
  logger.info(
    `[HTTP] [${requestId}] Client: ${
      req.socket.remoteAddress
    }:${req.socket.remotePort}`,
  );
  logger.info(
    `[HTTP] [${requestId}] User-Agent: ${req.headers['user-agent'] || 'N/A'}`,
  );

  // 开始统计收集
  statsCollector.startConnection(requestId, {
    type: 'HTTP',
    targetHost,
    targetPort,
    clientIP: req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] as string,
  });

  if (!targetHost) {
    logger.error(`[HTTP] [${requestId}] ERROR: Missing host in request`);
    await statsCollector.endConnection(requestId, {
      status: 'error',
      errorMessage: 'Missing host in request',
    });
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request: Missing host');
    return;
  }

  try {
    logger.info(
      `[HTTP] [${requestId}] Connecting to SOCKS5 proxy ${
        socksAddr.host
      }:${socksAddr.port}...`,
    );

    // Establish connection to target server through SOCKS5 proxy
    const socksConnection = await SocksClient.createConnection({
      proxy: {
        host: socksAddr.host,
        port: socksAddr.port,
        type: 5, // SOCKS5 protocol
      },
      command: 'connect',
      destination: {
        host: targetHost,
        port: targetPort,
      },
    });

    const { socket: socksSocket } = socksConnection;
    logger.info(
      `[HTTP] [${requestId}] SOCKS5 connection established successfully`,
    );

    // Set socket timeout to prevent hanging connections
    socksSocket.setTimeout(30000);

    // Build HTTP request to send through SOCKS5
    const path = url.pathname + url.search;
    const requestLine = `${req.method} ${path} HTTP/${req.httpVersion}\r\n`;

    // Forward headers, but remove proxy-specific headers and add Connection: close
    const headers = { ...req.headers };
    delete headers['proxy-connection'];
    delete headers['proxy-authorization'];
    // Force connection close to ensure response completes properly
    headers.connection = 'close';

    const headerLines = Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\r\n');

    const httpRequest = `${requestLine}${headerLines}\r\n\r\n`;
    safeSocketWrite(socksSocket, httpRequest, requestId);

    logger.info(`[HTTP] [${requestId}] Request sent to target server`);

    // Track data transfer
    req.on('data', (chunk) => {
      bytesSent += chunk.length;
      statsCollector.addBytesUp(requestId, chunk.length);
    });

    socksSocket.on('data', (chunk) => {
      bytesReceived += chunk.length;
      statsCollector.addBytesDown(requestId, chunk.length);
    });

    // Forward request body if present (for POST, PUT, etc.)
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      req.pipe(socksSocket, { end: true });
    }

    // Forward response from target server back to client
    // Pipe the raw HTTP response (headers + body) directly to the client response
    socksSocket.pipe(res);

    // Properly close the response when the socket ends
    socksSocket.on('end', () => {
      const duration = Date.now() - startTime;
      logger.info(`[HTTP] [${requestId}] Response completed`);
      logger.info(`[HTTP] [${requestId}] Duration: ${duration}ms`);
      logger.info(
        `[HTTP] [${requestId}] Bytes sent: ${formatBytes(bytesSent)}`,
      );
      logger.info(
        `[HTTP] [${requestId}] Bytes received: ${formatBytes(bytesReceived)}`,
      );
      logger.info(`[HTTP] [${requestId}] ===== Request Complete =====\n`);

      statsCollector.endConnection(requestId, { status: 'success' });
      res.end();
    });

    socksSocket.on('close', () => {
      if (!res.writableEnded) {
        const duration = Date.now() - startTime;
        logger.info(
          `[HTTP] [${requestId}] Connection closed (duration: ${duration}ms)`,
        );
        statsCollector.endConnection(requestId, { status: 'success' });
        res.end();
      }
    });

    // Handle errors
    socksSocket.on('error', (err) => {
      const duration = Date.now() - startTime;
      logger.error(`[HTTP] [${requestId}] SOCKS socket error: ${err.message}`);
      logger.error(
        `[HTTP] [${requestId}] Duration before error: ${duration}ms`,
      );
      statsCollector.endConnection(requestId, {
        status: 'error',
        errorMessage: err.message,
      });
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway');
      } else if (!res.writableEnded) {
        res.end();
      }
    });

    socksSocket.on('timeout', () => {
      const duration = Date.now() - startTime;
      logger.error(
        `[HTTP] [${requestId}] SOCKS socket timeout after ${duration}ms`,
      );
      statsCollector.endConnection(requestId, {
        status: 'timeout',
        errorMessage: `Socket timeout after ${duration}ms`,
      });
      safeSocketDestroy(socksSocket, requestId);
      if (!res.headersSent) {
        res.writeHead(504, { 'Content-Type': 'text/plain' });
        res.end('Gateway Timeout');
      } else if (!res.writableEnded) {
        res.end();
      }
    });

    req.on('error', (err) => {
      logger.error(
        `[HTTP] [${requestId}] Client request error: ${err.message}`,
      );
      safeSocketDestroy(socksSocket, requestId);
    });

    req.on('aborted', () => {
      logger.error(`[HTTP] [${requestId}] Client request aborted`);
      safeSocketDestroy(socksSocket, requestId);
    });

    // Clean up when client response finishes
    res.on('finish', () => {
      safeSocketDestroy(socksSocket, requestId);
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(
      `[HTTP] [${requestId}] SOCKS connection failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    logger.error(
      `[HTTP] [${requestId}] Duration before failure: ${duration}ms`,
    );
    await statsCollector.endConnection(requestId, {
      status: 'error',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway');
    }
  }
}
