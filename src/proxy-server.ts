import * as http from "node:http";
import * as net from "node:net";
import type { Config } from "./types";
import { parseAddress, getTimestamp } from "./utils";
import { handleHttpRequest } from "./http-handler";
import { handleConnect } from "./connect-handler";

/**
 * Starts the HTTP proxy server supporting both HTTP and HTTPS traffic
 * @param config - Server configuration with listening and SOCKS5 addresses
 */
export async function startProxy(config: Config): Promise<void> {
  const listenAddr = parseAddress(config.addr);
  const socksAddr = parseAddress(config.socks_addr);

  console.log(`[${getTimestamp()}] Starting proxy server...`);
  console.log(`[${getTimestamp()}] Listen address: ${config.addr}`);
  console.log(`[${getTimestamp()}] SOCKS5 address: ${config.socks_addr}`);

  // Create HTTP server that handles standard HTTP requests
  const server = http.createServer((req, res) => {
    handleHttpRequest(req, res, socksAddr).catch((error) => {
      console.error(
        `[${getTimestamp()}] Error handling HTTP request:`,
        error instanceof Error ? error.message : String(error)
      );
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      }
    });
  });

  // Handle HTTPS CONNECT requests for establishing secure tunnels
  server.on("connect", (req, clientSocket: net.Socket, head) => {
    handleConnect(req, clientSocket, head, socksAddr).catch((error) => {
      console.error(
        `[${getTimestamp()}] Error handling CONNECT:`,
        error instanceof Error ? error.message : String(error)
      );
    });
  });

  server.listen(listenAddr.port, listenAddr.host, () => {
    console.log(`[${getTimestamp()}] ========================================`);
    console.log(`[${getTimestamp()}] HTTP/HTTPS proxy server is running`);
    console.log(`[${getTimestamp()}] Listening on: ${config.addr}`);
    console.log(
      `[${getTimestamp()}] Forwarding to SOCKS5: ${config.socks_addr}`
    );
    console.log(`[${getTimestamp()}] Supports both HTTP and HTTPS traffic`);
    console.log(
      `[${getTimestamp()}] ========================================\n`
    );
  });

  server.on("error", (error) => {
    console.error(`[${getTimestamp()}] Server error:`, error.message);
    process.exit(1);
  });
}
