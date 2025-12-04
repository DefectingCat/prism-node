import * as http from "node:http";
import * as net from "node:net";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { SocksClient } from "socks";

/**
 * Configuration structure loaded from config.json
 */
interface Config {
  addr: string; // HTTP proxy listening address (e.g., "127.0.0.1:8080")
  socks_addr: string; // SOCKS5 proxy address to forward to (e.g., "127.0.0.1:1080")
}

/**
 * Parsed address components
 */
interface ParsedAddress {
  host: string;
  port: number;
}

// Global request counter for generating unique request IDs
let requestCounter = 0;

/**
 * Generates a unique request ID for tracking
 */
function generateRequestId(): string {
  return `${Date.now()}-${++requestCounter}`;
}

/**
 * Formats current timestamp for logging
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Formats bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Parses an address string into host and port components
 * @param addr - Address string in format "host:port"
 * @returns Parsed host and port
 * @throws Error if address format is invalid
 */
function parseAddress(addr: string): ParsedAddress {
  const [host, portStr] = addr.split(":");
  const port = Number.parseInt(portStr, 10);
  if (!host || Number.isNaN(port)) {
    throw new Error(`Invalid address format: ${addr}`);
  }
  return { host, port };
}

/**
 * Loads and validates configuration from a JSON file
 * @param configPath - Path to the configuration file
 * @returns Validated configuration object
 * @throws Error if file cannot be read or config is invalid
 */
async function loadConfig(configPath: string): Promise<Config> {
  try {
    const content = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(content) as Config;

    // Validate required fields
    if (!config.addr || !config.socks_addr) {
      throw new Error("Config must contain 'addr' and 'socks_addr' properties");
    }

    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Handles standard HTTP requests (GET, POST, etc.) by forwarding through SOCKS5 proxy
 * @param req - HTTP request object
 * @param res - HTTP response object
 * @param socksAddr - SOCKS5 proxy server address
 */
async function handleHttpRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  socksAddr: ParsedAddress
): Promise<void> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const targetHost = url.hostname;
  const targetPort = url.port ? Number.parseInt(url.port, 10) : 80;

  let bytesReceived = 0;
  let bytesSent = 0;

  console.log(
    `[${getTimestamp()}] [HTTP] [${requestId}] ===== New HTTP Request =====`
  );
  console.log(
    `[${getTimestamp()}] [HTTP] [${requestId}] Method: ${req.method}`
  );
  console.log(
    `[${getTimestamp()}] [HTTP] [${requestId}] Target: ${targetHost}:${targetPort}`
  );
  console.log(`[${getTimestamp()}] [HTTP] [${requestId}] URL: ${url.href}`);
  console.log(
    `[${getTimestamp()}] [HTTP] [${requestId}] Client: ${
      req.socket.remoteAddress
    }:${req.socket.remotePort}`
  );
  console.log(
    `[${getTimestamp()}] [HTTP] [${requestId}] User-Agent: ${
      req.headers["user-agent"] || "N/A"
    }`
  );

  if (!targetHost) {
    console.log(
      `[${getTimestamp()}] [HTTP] [${requestId}] ERROR: Missing host in request`
    );
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Bad Request: Missing host");
    return;
  }

  try {
    console.log(
      `[${getTimestamp()}] [HTTP] [${requestId}] Connecting to SOCKS5 proxy ${
        socksAddr.host
      }:${socksAddr.port}...`
    );

    // Establish connection to target server through SOCKS5 proxy
    const socksConnection = await SocksClient.createConnection({
      proxy: {
        host: socksAddr.host,
        port: socksAddr.port,
        type: 5, // SOCKS5 protocol
      },
      command: "connect",
      destination: {
        host: targetHost,
        port: targetPort,
      },
    });

    const { socket: socksSocket } = socksConnection;
    console.log(
      `[${getTimestamp()}] [HTTP] [${requestId}] SOCKS5 connection established successfully`
    );

    // Set socket timeout to prevent hanging connections
    socksSocket.setTimeout(30000);

    // Build HTTP request to send through SOCKS5
    const path = url.pathname + url.search;
    const requestLine = `${req.method} ${path} HTTP/${req.httpVersion}\r\n`;

    // Forward headers, but remove proxy-specific headers and add Connection: close
    const headers = { ...req.headers };
    delete headers["proxy-connection"];
    delete headers["proxy-authorization"];
    // Force connection close to ensure response completes properly
    headers["connection"] = "close";

    const headerLines = Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\r\n");

    const httpRequest = `${requestLine}${headerLines}\r\n\r\n`;
    socksSocket.write(httpRequest);

    console.log(
      `[${getTimestamp()}] [HTTP] [${requestId}] Request sent to target server`
    );

    // Track data transfer
    req.on("data", (chunk) => {
      bytesSent += chunk.length;
    });

    socksSocket.on("data", (chunk) => {
      bytesReceived += chunk.length;
    });

    // Forward request body if present (for POST, PUT, etc.)
    if (req.method !== "GET" && req.method !== "HEAD") {
      req.pipe(socksSocket, { end: true });
    }

    // Forward response from target server back to client
    // Pipe the raw HTTP response (headers + body) directly to the client response
    socksSocket.pipe(res);

    // Properly close the response when the socket ends
    socksSocket.on("end", () => {
      const duration = Date.now() - startTime;
      console.log(
        `[${getTimestamp()}] [HTTP] [${requestId}] Response completed`
      );
      console.log(
        `[${getTimestamp()}] [HTTP] [${requestId}] Duration: ${duration}ms`
      );
      console.log(
        `[${getTimestamp()}] [HTTP] [${requestId}] Bytes sent: ${formatBytes(
          bytesSent
        )}`
      );
      console.log(
        `[${getTimestamp()}] [HTTP] [${requestId}] Bytes received: ${formatBytes(
          bytesReceived
        )}`
      );
      console.log(
        `[${getTimestamp()}] [HTTP] [${requestId}] ===== Request Complete =====\n`
      );
      res.end();
    });

    socksSocket.on("close", () => {
      if (!res.writableEnded) {
        const duration = Date.now() - startTime;
        console.log(
          `[${getTimestamp()}] [HTTP] [${requestId}] Connection closed (duration: ${duration}ms)`
        );
        res.end();
      }
    });

    // Handle errors
    socksSocket.on("error", (err) => {
      const duration = Date.now() - startTime;
      console.error(
        `[${getTimestamp()}] [HTTP] [${requestId}] SOCKS socket error: ${
          err.message
        }`
      );
      console.error(
        `[${getTimestamp()}] [HTTP] [${requestId}] Duration before error: ${duration}ms`
      );
      if (!res.headersSent) {
        res.writeHead(502, { "Content-Type": "text/plain" });
        res.end("Bad Gateway");
      } else if (!res.writableEnded) {
        res.end();
      }
    });

    socksSocket.on("timeout", () => {
      const duration = Date.now() - startTime;
      console.error(
        `[${getTimestamp()}] [HTTP] [${requestId}] SOCKS socket timeout after ${duration}ms`
      );
      socksSocket.destroy();
      if (!res.headersSent) {
        res.writeHead(504, { "Content-Type": "text/plain" });
        res.end("Gateway Timeout");
      } else if (!res.writableEnded) {
        res.end();
      }
    });

    req.on("error", (err) => {
      console.error(
        `[${getTimestamp()}] [HTTP] [${requestId}] Client request error: ${
          err.message
        }`
      );
      socksSocket.destroy();
    });

    req.on("aborted", () => {
      console.error(
        `[${getTimestamp()}] [HTTP] [${requestId}] Client request aborted`
      );
      socksSocket.destroy();
    });

    // Clean up when client response finishes
    res.on("finish", () => {
      socksSocket.destroy();
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[${getTimestamp()}] [HTTP] [${requestId}] SOCKS connection failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    console.error(
      `[${getTimestamp()}] [HTTP] [${requestId}] Duration before failure: ${duration}ms`
    );
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end("Bad Gateway");
    }
  }
}

/**
 * Handles HTTPS CONNECT requests by establishing a secure tunnel through SOCKS5 proxy
 * @param req - HTTP request containing target hostname:port
 * @param clientSocket - Client connection socket
 * @param head - Initial data packet from client
 * @param socksAddr - SOCKS5 proxy server address
 */
async function handleConnect(
  req: http.IncomingMessage,
  clientSocket: net.Socket,
  head: Buffer,
  socksAddr: ParsedAddress
): Promise<void> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Parse target destination from CONNECT request URL
  const { port, hostname } = new URL(`http://${req.url}`);
  const targetPort = Number.parseInt(port, 10);

  let bytesFromClient = 0;
  let bytesToClient = 0;

  console.log(
    `[${getTimestamp()}] [HTTPS] [${requestId}] ===== New HTTPS CONNECT =====`
  );
  console.log(
    `[${getTimestamp()}] [HTTPS] [${requestId}] Target: ${hostname}:${targetPort}`
  );
  console.log(
    `[${getTimestamp()}] [HTTPS] [${requestId}] Client: ${
      clientSocket.remoteAddress
    }:${clientSocket.remotePort}`
  );
  console.log(
    `[${getTimestamp()}] [HTTPS] [${requestId}] Initial data length: ${
      head.length
    } bytes`
  );

  if (!hostname || Number.isNaN(targetPort)) {
    console.error(
      `[${getTimestamp()}] [HTTPS] [${requestId}] ERROR: Invalid target address`
    );
    clientSocket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    clientSocket.end();
    return;
  }

  try {
    console.log(
      `[${getTimestamp()}] [HTTPS] [${requestId}] Connecting to SOCKS5 proxy ${
        socksAddr.host
      }:${socksAddr.port}...`
    );

    // Establish connection to target through SOCKS5 proxy
    const socksConnection = await SocksClient.createConnection({
      proxy: {
        host: socksAddr.host,
        port: socksAddr.port,
        type: 5, // SOCKS5 protocol
      },
      command: "connect",
      destination: {
        host: hostname,
        port: targetPort,
      },
    });

    const { socket: socksSocket } = socksConnection;
    console.log(
      `[${getTimestamp()}] [HTTPS] [${requestId}] SOCKS5 connection established successfully`
    );

    // Set socket timeout to prevent hanging connections
    socksSocket.setTimeout(60000);
    clientSocket.setTimeout(60000);

    // Notify client that tunnel is established
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    console.log(
      `[${getTimestamp()}] [HTTPS] [${requestId}] Tunnel established, starting data relay`
    );

    // Forward any initial data from CONNECT request
    if (head.length > 0) {
      socksSocket.write(head);
      bytesFromClient += head.length;
    }

    // Track data transfer
    clientSocket.on("data", (chunk) => {
      bytesFromClient += chunk.length;
    });

    socksSocket.on("data", (chunk) => {
      bytesToClient += chunk.length;
    });

    // Set up bidirectional data piping between client and SOCKS5 proxy
    socksSocket.pipe(clientSocket);
    clientSocket.pipe(socksSocket);

    // Handle socket errors gracefully
    socksSocket.on("error", (err) => {
      const duration = Date.now() - startTime;
      console.error(
        `[${getTimestamp()}] [HTTPS] [${requestId}] SOCKS socket error: ${
          err.message
        }`
      );
      console.error(
        `[${getTimestamp()}] [HTTPS] [${requestId}] Duration: ${duration}ms, Sent: ${formatBytes(
          bytesFromClient
        )}, Received: ${formatBytes(bytesToClient)}`
      );
      clientSocket.destroy();
    });

    clientSocket.on("error", (err) => {
      const duration = Date.now() - startTime;
      console.error(
        `[${getTimestamp()}] [HTTPS] [${requestId}] Client socket error: ${
          err.message
        }`
      );
      console.error(
        `[${getTimestamp()}] [HTTPS] [${requestId}] Duration: ${duration}ms, Sent: ${formatBytes(
          bytesFromClient
        )}, Received: ${formatBytes(bytesToClient)}`
      );
      socksSocket.destroy();
    });

    socksSocket.on("timeout", () => {
      const duration = Date.now() - startTime;
      console.error(
        `[${getTimestamp()}] [HTTPS] [${requestId}] SOCKS socket timeout after ${duration}ms`
      );
      console.error(
        `[${getTimestamp()}] [HTTPS] [${requestId}] Sent: ${formatBytes(
          bytesFromClient
        )}, Received: ${formatBytes(bytesToClient)}`
      );
      socksSocket.destroy();
      clientSocket.destroy();
    });

    clientSocket.on("timeout", () => {
      const duration = Date.now() - startTime;
      console.error(
        `[${getTimestamp()}] [HTTPS] [${requestId}] Client socket timeout after ${duration}ms`
      );
      console.error(
        `[${getTimestamp()}] [HTTPS] [${requestId}] Sent: ${formatBytes(
          bytesFromClient
        )}, Received: ${formatBytes(bytesToClient)}`
      );
      socksSocket.destroy();
      clientSocket.destroy();
    });

    // Clean up when either side closes
    socksSocket.on("close", () => {
      const duration = Date.now() - startTime;
      console.log(
        `[${getTimestamp()}] [HTTPS] [${requestId}] SOCKS socket closed`
      );
      console.log(
        `[${getTimestamp()}] [HTTPS] [${requestId}] Duration: ${duration}ms`
      );
      console.log(
        `[${getTimestamp()}] [HTTPS] [${requestId}] Bytes from client: ${formatBytes(
          bytesFromClient
        )}`
      );
      console.log(
        `[${getTimestamp()}] [HTTPS] [${requestId}] Bytes to client: ${formatBytes(
          bytesToClient
        )}`
      );
      console.log(
        `[${getTimestamp()}] [HTTPS] [${requestId}] ===== Tunnel Closed =====\n`
      );
      clientSocket.destroy();
    });

    clientSocket.on("close", () => {
      const duration = Date.now() - startTime;
      console.log(
        `[${getTimestamp()}] [HTTPS] [${requestId}] Client socket closed (duration: ${duration}ms)`
      );
      socksSocket.destroy();
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[${getTimestamp()}] [HTTPS] [${requestId}] SOCKS connection failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    console.error(
      `[${getTimestamp()}] [HTTPS] [${requestId}] Duration before failure: ${duration}ms`
    );
    clientSocket.write("HTTP/1.1 502 Bad Gateway\r\n\r\n");
    clientSocket.end();
  }
}

/**
 * Starts the HTTP proxy server supporting both HTTP and HTTPS traffic
 * @param config - Server configuration with listening and SOCKS5 addresses
 */
async function startProxy(config: Config): Promise<void> {
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

/**
 * Main entry point - loads configuration and starts the proxy server
 */
async function main(): Promise<void> {
  try {
    const configPath = path.join(process.cwd(), "config.json");
    console.log(
      `[${getTimestamp()}] Loading configuration from ${configPath}...`
    );
    const config = await loadConfig(configPath);
    console.log(`[${getTimestamp()}] Configuration loaded successfully`);
    await startProxy(config);
  } catch (error) {
    console.error(
      `[${getTimestamp()}] Failed to start proxy:`,
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();

export {};
