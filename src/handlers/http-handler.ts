import type * as http from 'node:http';
import * as net from 'node:net';
import { SocksClient } from 'socks';
import type { ParsedAddress } from '../config/types';
import logger from '../utils/logger';
import { generateRequestId, isDomainInWhitelist } from '../utils/utils';

/**
 * 处理不经过 SOCKS5 代理的直接 HTTP 请求
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param targetHost - 目标主机
 * @param targetPort - 目标端口
 * @param requestId - 用于日志记录的请求 ID
 */
async function handleDirectHttpRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  targetHost: string,
  targetPort: number,
  requestId: string,
  socksAddr: ParsedAddress, // 添加 SOCKS 代理地址参数
  configWhitelist: string[], // 添加白名单参数
): Promise<void> {
  logger.info(
    `[HTTP] [${requestId}] Using direct connection for ${targetHost}:${targetPort}`,
  );

  return new Promise((resolve, reject) => {
    // 创建到目标的直接 TCP 连接
    const targetSocket = net.createConnection(targetPort, targetHost, () => {
      logger.info(`[HTTP] [${requestId}] Direct connection established`);

      // 修复请求路径转发问题
      let path = req.url;
      if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
        try {
          const urlObj = new URL(path);
          path = urlObj.pathname + urlObj.search + urlObj.hash;
        } catch {
          path = '/';
        }
      }

      // 构建请求头
      let requestHeaders = `${req.method} ${path} HTTP/1.1\r\n`;

      // 修复 Host 头，确保包含正确的端口
      const hostHeader =
        targetPort === 80 ? targetHost : `${targetHost}:${targetPort}`;
      requestHeaders += `Host: ${hostHeader}\r\n`;

      // 复制其他请求头（跳过已处理的 Host 头）
      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined && key.toLowerCase() !== 'host') {
          requestHeaders += `${key}: ${Array.isArray(value) ? value.join(', ') : value}\r\n`;
        }
      }

      // 添加 Connection: close 头以防止 keep-alive
      requestHeaders += 'Connection: close\r\n\r\n';

      // 发送请求到目标
      targetSocket.write(requestHeaders);

      // 如果有请求体则处理
      req.on('data', (chunk) => {
        if (!targetSocket.destroyed) {
          targetSocket.write(chunk);
        }
      });

      req.on('end', () => {
        logger.debug(`[HTTP] [${requestId}] Request body forwarded completely`);
      });
    });

    // 将目标的响应转发回客户端
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

          // 解析 HTTP 响应状态行
          const statusLine = headerSection.split('\r\n')[0];
          const statusMatch = statusLine.match(/HTTP\/\d\.\d (\d{3})/);
          const statusCode = statusMatch ? parseInt(statusMatch[1]) : 200;

          // 解析响应头
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

          // 向客户端发送响应头
          res.writeHead(statusCode, responseHeadersObj);
          responseStarted = true;

          // 如果有剩余的 body 数据则发送
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
      // 如果是 EBADF 错误，尝试使用 SOCKS 代理连接
      if (error instanceof Error && error.message.includes('EBADF')) {
        logger.warn(
          `[HTTP] [${requestId}] Direct connection failed with EBADF, falling back to SOCKS5`,
        );
        // 调用 SOCKS 代理处理函数
        // 注意：这里需要确保我们没有无限循环
        // 我们可以通过临时从白名单中移除该域名并再次调用 handleHttpRequest 来实现
        const tempWhitelist = configWhitelist.filter(
          (domain) => domain !== targetHost,
        );
        handleHttpRequest(req, res, socksAddr, tempWhitelist).catch(reject);
      } else {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'text/plain' });
          res.end('Bad Gateway: Direct connection failed');
        } else if (!res.destroyed) {
          res.end();
        }
        reject(error);
      }
    });

    // 处理客户端断开连接
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
 * 通过 SOCKS5 代理转发来处理标准 HTTP 请求
 * @param req - HTTP 请求对象
 * @param res - HTTP 响应对象
 * @param socksAddr - SOCKS5 代理地址
 * @param configWhitelist - 配置中的白名单域名
 */
export async function handleHttpRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  socksAddr: ParsedAddress,
  configWhitelist: string[],
): Promise<void> {
  const requestId = generateRequestId();

  try {
    // 解析请求 URL
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
      // 通过使用 Host 头尝试构造绝对 URL 来处理相对 URL
      // 这通常发生在客户端直接连接到代理（例如 GET /）
      // 或发送没有完整协议的请求时
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

    // 检查域名是否在白名单中以便直连
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
        socksAddr, // 传入 SOCKS 代理地址参数
        configWhitelist, // 传入白名单参数
      );
      return;
    }

    logger.info(
      `[HTTP] [${requestId}] Forwarding to ${targetHost}:${targetPort} via SOCKS5`,
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
        port: parseInt(targetPort.toString()),
      },
    };

    // 建立 SOCKS5 连接
    const socksConnection = await SocksClient.createConnection(socksOptions);
    logger.info(`[HTTP] [${requestId}] SOCKS5 connection established`);

    // 设置双向数据转发
    const clientSocket = req.socket as net.Socket;
    const targetSocket = socksConnection.socket;

    // 将请求头和请求体转发到目标
    let requestHeaders = `${req.method} ${req.url} HTTP/1.1\r\n`;

    // 复制原始请求的所有请求头
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        requestHeaders += `${key}: ${Array.isArray(value) ? value.join(', ') : value}\r\n`;
      }
    }

    // 添加 Connection: close 头以防止 keep-alive
    requestHeaders += 'Connection: close\r\n\r\n';

    // 发送请求到目标
    targetSocket.write(requestHeaders);

    // 如果有请求体则处理
    req.on('data', (chunk) => {
      if (!targetSocket.destroyed) {
        targetSocket.write(chunk);
      }
    });

    req.on('end', () => {
      logger.debug(`[HTTP] [${requestId}] Request body forwarded completely`);
    });

    // 将目标的响应转发回客户端
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

          // 解析 HTTP 响应状态行
          const statusLine = headerSection.split('\r\n')[0];
          const statusMatch = statusLine.match(/HTTP\/\d\.\d (\d{3})/);
          const statusCode = statusMatch ? parseInt(statusMatch[1]) : 200;

          // 解析响应头
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

          // 向客户端发送响应头
          res.writeHead(statusCode, responseHeadersObj);
          responseStarted = true;

          // 如果有剩余的 body 数据则发送
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

    // 处理客户端断开连接
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
