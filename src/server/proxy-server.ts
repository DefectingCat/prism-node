import * as http from 'node:http';
import type * as net from 'node:net';
import { handleConnect } from '../handlers/connect-handler';
import { handleHttpRequest } from '../handlers/http-handler';
import logger from '../utils/logger';
import type { Config } from '../config/types';
import { parseAddress } from '../utils/utils';

/**
 * Starts the HTTP proxy server supporting both HTTP and HTTPS traffic
 * @param config - Server configuration with listening and SOCKS5 addresses
 */
export async function startProxy(config: Config): Promise<void> {
  const listenAddr = parseAddress(config.addr);
  const socksAddr = parseAddress(config.socks_addr);

  logger.info(`Starting proxy server...`);
  logger.info(`Listen address: ${config.addr}`);
  logger.info(`SOCKS5 address: ${config.socks_addr}`);

  // Create HTTP server that handles standard HTTP requests
  const server = http.createServer((req, res) => {
    handleHttpRequest(req, res, socksAddr).catch((error) => {
      logger.error(
        `Error handling HTTP request:`,
        error instanceof Error ? error.message : String(error),
      );
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    });
  });

  // Handle HTTPS CONNECT requests for establishing secure tunnels
  server.on('connect', (req, clientSocket: net.Socket, head) => {
    handleConnect(req, clientSocket, head, socksAddr).catch((error) => {
      logger.error(
        `Error handling CONNECT:`,
        error instanceof Error ? error.message : String(error),
      );
    });
  });

  server.listen(listenAddr.port, listenAddr.host, () => {
    logger.info(`========================================`);
    logger.info(`HTTP/HTTPS proxy server is running`);
    logger.info(`Listening on: ${config.addr}`);
    logger.info(`Forwarding to SOCKS5: ${config.socks_addr}`);
    logger.info(`Supports both HTTP and HTTPS traffic`);
    logger.info(`========================================\n`);
  });

  server.on('error', (error) => {
    logger.error(`Server error:`, error.message);
    process.exit(1);
  });
}
