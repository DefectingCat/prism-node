import type * as http from 'node:http';
import * as net from 'node:net';
import { SocksClient } from 'socks';
import type { ParsedAddress } from '../config/types';
import logger from '../utils/logger';
import { generateRequestId, isDomainInWhitelist } from '../utils/utils';

/**
 * Handle direct HTTP requests without going through SOCKS5 proxy
 * @param req - HTTP request object
 * @param res - HTTP response object
 * @param targetHost - Target host
 * @param targetPort - Target port
 * @param requestId - Request ID for logging
 */
async function handleDirectHttpRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  targetHost: string,
  targetPort: number,
  requestId: string,
): Promise<void> {
  logger.info(
    `[HTTP] [${requestId}] Using direct connection for ${targetHost}:${targetPort}`,
  );

  return new Promise((resolve, reject) => {
    // Create direct TCP connection to target
    const targetSocket = net.createConnection(targetPort, targetHost, () => {
      logger.info(`[HTTP] [${requestId}] Direct connection established`);

      // Forward request headers and body to target
      let requestHeaders = `${req.method} ${req.url} HTTP/1.1\r\n`;

      // Copy all headers from original request
      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) {
          requestHeaders += `${key}: ${Array.isArray(value) ? value.join(', ') : value}\r\n`;
        }
      }

      // Add Connection: close header to prevent keep-alive
      requestHeaders += 'Connection: close\r\n\r\n';

      // Send request to target
      targetSocket.write(requestHeaders);

      // Handle request body if present
      req.on('data', (chunk) => {
        if (!targetSocket.destroyed) {
          targetSocket.write(chunk);
        }
      });

      req.on('end', () => {
        logger.debug(`[HTTP] [${requestId}] Request body forwarded completely`);
      });
    });

    // Forward response from target back to client
    let responseHeaders = '';
    let headersReceived = false;
    let responseStarted = false;

    targetSocket.on('data', (chunk) => {
      if (!headersReceived) {
        responseHeaders += chunk.toString();
        const headerEndIndex = responseHeaders.indexOf('\r\n\r\n');
        if (headerEndIndex !== -1) {
          headersReceived = true;
          const headerSection = responseHeaders.substring(0, headerEndIndex);
          const bodyStart = headerEndIndex + 4;

          // Parse HTTP response status line
          const statusLine = headerSection.split('\r\n')[0];
          const statusMatch = statusLine.match(/HTTP\/\d\.\d (\d{3})/);
          const statusCode = statusMatch ? parseInt(statusMatch[1]) : 200;

          // Parse response headers
          const headerLines = headerSection.split('\r\n').slice(1);
          const responseHeadersObj: http.OutgoingHttpHeaders = {};

          for (const line of headerLines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
              const name = line.substring(0, colonIndex).trim();
              const value = line.substring(colonIndex + 1).trim();
              responseHeadersObj[name] = value;
            }
          }

          // Send response headers to client
          res.writeHead(statusCode, responseHeadersObj);
          responseStarted = true;

          // Send remaining body data if any
          if (chunk.length > bodyStart) {
            const bodyChunk = chunk.slice(bodyStart);
            res.write(bodyChunk);
          }
        }
      } else if (responseStarted && !res.destroyed) {
        res.write(chunk);
      }
    });

    targetSocket.on('end', () => {
      logger.info(`[HTTP] [${requestId}] Direct connection completed`);
      if (responseStarted && !res.destroyed) {
        res.end();
      }
      resolve();
    });

    targetSocket.on('error', (error) => {
      logger.error(
        `[HTTP] [${requestId}] Direct connection error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway: Direct connection failed');
      } else if (!res.destroyed) {
        res.end();
      }
      reject(error);
    });

    // Handle client disconnection
    const clientSocket = req.socket as net.Socket;
    clientSocket.on('close', () => {
      logger.info(`[HTTP] [${requestId}] Client connection closed`);
      if (!targetSocket.destroyed) {
        targetSocket.destroy();
      }
    });

    clientSocket.on('error', (error) => {
      logger.warn(
        `[HTTP] [${requestId}] Client connection error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (!targetSocket.destroyed) {
        targetSocket.destroy();
      }
    });
  });
}

/**
 * Handle standard HTTP requests by forwarding them through SOCKS5 proxy
 * @param req - HTTP request object
 * @param res - HTTP response object
 * @param socksAddr - SOCKS5 proxy address
 * @param configWhitelist - Whitelist domains from config
 */
export async function handleHttpRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  socksAddr: ParsedAddress,
  configWhitelist: string[],
): Promise<void> {
  const requestId = generateRequestId();

  try {
    // Parse the request URL
    if (!req.url) {
      logger.warn(`[HTTP] [${requestId}] No URL provided`);
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request: No URL provided');
      return;
    }

    let url: URL;
    try {
      url = new URL(req.url);
    } catch {
      // Handle relative URLs by attempting to construct absolute URL using Host header
      // This commonly happens when a client connects directly to the proxy (e.g. GET /)
      // or sends a request without the full scheme
      const host = req.headers.host;
      if (host) {
        try {
          const protocol = (req.socket as any).encrypted ? 'https:' : 'http:';
          url = new URL(req.url, `${protocol}//${host}`);
        } catch {
          logger.warn(
            `[HTTP] [${requestId}] Invalid URL construction with host: ${req.url}, Host: ${host}`,
          );
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad Request: Invalid URL');
          return;
        }
      } else {
        logger.warn(
          `[HTTP] [${requestId}] Invalid URL and no Host header: ${req.url}`,
        );
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request: Invalid URL');
        return;
      }
    }

    const targetHost = url.hostname;
    const targetPort = url.port || (url.protocol === 'https:' ? 443 : 80);

    // Check if domain is in whitelist for direct connection
    const useDirectConnection = isDomainInWhitelist(
      targetHost,
      configWhitelist,
    );

    if (useDirectConnection) {
      await handleDirectHttpRequest(
        req,
        res,
        targetHost,
        parseInt(targetPort.toString()),
        requestId,
      );
      return;
    }

    logger.info(
      `[HTTP] [${requestId}] Forwarding to ${targetHost}:${targetPort} via SOCKS5`,
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
        port: parseInt(targetPort.toString()),
      },
    };

    // Establish SOCKS5 connection
    const socksConnection = await SocksClient.createConnection(socksOptions);
    logger.info(`[HTTP] [${requestId}] SOCKS5 connection established`);

    // Set up bidirectional data forwarding
    const clientSocket = req.socket as net.Socket;
    const targetSocket = socksConnection.socket;

    // Forward request headers and body to target
    let requestHeaders = `${req.method} ${req.url} HTTP/1.1\r\n`;

    // Copy all headers from original request
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        requestHeaders += `${key}: ${Array.isArray(value) ? value.join(', ') : value}\r\n`;
      }
    }

    // Add Connection: close header to prevent keep-alive
    requestHeaders += 'Connection: close\r\n\r\n';

    // Send request to target
    targetSocket.write(requestHeaders);

    // Handle request body if present
    req.on('data', (chunk) => {
      if (!targetSocket.destroyed) {
        targetSocket.write(chunk);
      }
    });

    req.on('end', () => {
      logger.debug(`[HTTP] [${requestId}] Request body forwarded completely`);
    });

    // Forward response from target back to client
    let responseHeaders = '';
    let headersReceived = false;
    let responseStarted = false;

    targetSocket.on('data', (chunk) => {
      if (!headersReceived) {
        responseHeaders += chunk.toString();
        const headerEndIndex = responseHeaders.indexOf('\r\n\r\n');
        if (headerEndIndex !== -1) {
          headersReceived = true;
          const headerSection = responseHeaders.substring(0, headerEndIndex);
          const bodyStart = headerEndIndex + 4;

          // Parse HTTP response status line
          const statusLine = headerSection.split('\r\n')[0];
          const statusMatch = statusLine.match(/HTTP\/\d\.\d (\d{3})/);
          const statusCode = statusMatch ? parseInt(statusMatch[1]) : 200;

          // Parse response headers
          const headerLines = headerSection.split('\r\n').slice(1);
          const responseHeadersObj: http.OutgoingHttpHeaders = {};

          for (const line of headerLines) {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
              const name = line.substring(0, colonIndex).trim();
              const value = line.substring(colonIndex + 1).trim();
              responseHeadersObj[name] = value;
            }
          }

          // Send response headers to client
          res.writeHead(statusCode, responseHeadersObj);
          responseStarted = true;

          // Send remaining body data if any
          if (chunk.length > bodyStart) {
            const bodyChunk = chunk.slice(bodyStart);
            res.write(bodyChunk);
          }
        }
      } else if (responseStarted && !res.destroyed) {
        res.write(chunk);
      }
    });

    targetSocket.on('end', () => {
      logger.info(`[HTTP] [${requestId}] Target connection closed`);
      if (responseStarted && !res.destroyed) {
        res.end();
      }
    });

    targetSocket.on('error', (error) => {
      logger.error(
        `[HTTP] [${requestId}] Target connection error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway: Target connection failed');
      } else if (!res.destroyed) {
        res.end();
      }
    });

    // Handle client disconnection
    clientSocket.on('close', () => {
      logger.info(`[HTTP] [${requestId}] Client connection closed`);
      if (!targetSocket.destroyed) {
        targetSocket.destroy();
      }
    });

    clientSocket.on('error', (error) => {
      logger.warn(
        `[HTTP] [${requestId}] Client connection error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (!targetSocket.destroyed) {
        targetSocket.destroy();
      }
    });
  } catch (error) {
    logger.error(
      `[HTTP] [${requestId}] Request failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway: SOCKS5 connection failed');
    }
  }
}
