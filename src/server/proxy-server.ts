import * as http from 'node:http';
import type * as net from 'node:net';
import type { Config } from '../config/types';
import { handleConnect } from '../handlers/connect-handler';
import { handleHttpRequest } from '../handlers/http-handler';
import logger from '../utils/logger';
import { parseAddress } from '../utils/utils';
import { initializeWhitelist } from '../utils/whitelist';

/**
 * 启动支持 HTTP 和 HTTPS 流量的 HTTP 代理服务器
 * @param config - 包含监听地址和 SOCKS5 地址的服务器配置
 */
export async function startProxy(config: Config): Promise<string> {
  const listenAddr = parseAddress(config.addr);
  const socksAddr = parseAddress(config.socks_addr);

  initializeWhitelist(config.whitelist);

  logger.info(`Starting proxy server...`);
  logger.info(`Listen address: ${config.addr}`);
  logger.info(`SOCKS5 address: ${config.socks_addr}`);
  if (config.whitelist && config.whitelist.length > 0) {
    logger.info(`Whitelist domains: ${config.whitelist.join(', ')}`);
  } else {
    logger.info(`Whitelist: Empty (only internal IPs are direct)`);
  }

  // 创建处理标准 HTTP 请求的 HTTP 服务器
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

  // Socket 超时配置，防止资源泄漏
  server.timeout = 60000;
  server.keepAliveTimeout = 30000;
  server.headersTimeout = 15000;

  // 处理每个新连接的超时
  server.on('connection', (socket: net.Socket) => {
    socket.setTimeout(60000);
    socket.on('timeout', () => {
      logger.warn(`Socket timeout, destroying connection`);
      socket.destroy();
    });
  });

  // 处理用于建立安全隧道的 HTTPS CONNECT 请求
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

  server.on('error', (error: any) => {
    // 直接输出详细错误信息到控制台，以绕过日志格式化问题
    console.error('SERVER ERROR DETAILS:', error);

    logger.error(`Server error: ${error.message || String(error)}`);
    if (error.stack) {
      logger.debug(error.stack);
    }

    // 仅在阻止服务器运行的关键错误时退出
    if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
      logger.error(`Critical error: ${error.code} - exiting worker`);
      process.exit(1);
    }
  });

  // 处理进程退出信号
  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return config.addr;
}
