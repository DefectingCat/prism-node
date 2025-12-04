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
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const targetHost = url.hostname;
  const targetPort = url.port ? Number.parseInt(url.port, 10) : 80;

  if (!targetHost) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Bad Request: Missing host");
    return;
  }

  try {
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

    // Set socket timeout to prevent hanging connections
    socksSocket.setTimeout(30000);

    // Build HTTP request to send through SOCKS5
    const path = url.pathname + url.search;
    const requestLine = `${req.method} ${path} HTTP/${req.httpVersion}\r\n`;

    // Forward headers, but remove proxy-specific headers
    const headers = { ...req.headers };
    delete headers["proxy-connection"];
    delete headers["proxy-authorization"];

    const headerLines = Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\r\n");

    const httpRequest = `${requestLine}${headerLines}\r\n\r\n`;
    socksSocket.write(httpRequest);

    // Forward request body if present (for POST, PUT, etc.)
    if (req.method !== "GET" && req.method !== "HEAD") {
      req.pipe(socksSocket, { end: true });
    }

    // Forward response from target server back to client
    // The socket will receive the HTTP response and pipe it directly to the client
    socksSocket.pipe(res);

    // Handle errors
    socksSocket.on("error", (err) => {
      console.error("SOCKS socket error (HTTP):", err.message);
      if (!res.headersSent) {
        res.writeHead(502, { "Content-Type": "text/plain" });
        res.end("Bad Gateway");
      } else {
        res.end();
      }
    });

    socksSocket.on("timeout", () => {
      console.error("SOCKS socket timeout (HTTP)");
      socksSocket.destroy();
      if (!res.headersSent) {
        res.writeHead(504, { "Content-Type": "text/plain" });
        res.end("Gateway Timeout");
      } else {
        res.end();
      }
    });

    req.on("error", (err) => {
      console.error("Client request error:", err.message);
      socksSocket.destroy();
    });

    req.on("aborted", () => {
      console.error("Client request aborted");
      socksSocket.destroy();
    });
  } catch (error) {
    console.error(
      "SOCKS connection failed (HTTP):",
      error instanceof Error ? error.message : String(error)
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
  // Parse target destination from CONNECT request URL
  const { port, hostname } = new URL(`http://${req.url}`);
  const targetPort = Number.parseInt(port, 10);

  if (!hostname || Number.isNaN(targetPort)) {
    clientSocket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    clientSocket.end();
    return;
  }

  try {
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

    // Set socket timeout to prevent hanging connections
    socksSocket.setTimeout(60000);
    clientSocket.setTimeout(60000);

    // Notify client that tunnel is established
    clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");

    // Forward any initial data from CONNECT request
    if (head.length > 0) {
      socksSocket.write(head);
    }

    // Set up bidirectional data piping between client and SOCKS5 proxy
    socksSocket.pipe(clientSocket);
    clientSocket.pipe(socksSocket);

    // Handle socket errors gracefully
    socksSocket.on("error", (err) => {
      console.error("SOCKS socket error (HTTPS):", err.message);
      clientSocket.destroy();
    });

    clientSocket.on("error", (err) => {
      console.error("Client socket error (HTTPS):", err.message);
      socksSocket.destroy();
    });

    socksSocket.on("timeout", () => {
      console.error("SOCKS socket timeout (HTTPS)");
      socksSocket.destroy();
      clientSocket.destroy();
    });

    clientSocket.on("timeout", () => {
      console.error("Client socket timeout (HTTPS)");
      socksSocket.destroy();
      clientSocket.destroy();
    });

    // Clean up when either side closes
    socksSocket.on("close", () => {
      clientSocket.destroy();
    });

    clientSocket.on("close", () => {
      socksSocket.destroy();
    });
  } catch (error) {
    console.error(
      "SOCKS connection failed (HTTPS):",
      error instanceof Error ? error.message : String(error)
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

  // Create HTTP server that handles standard HTTP requests
  const server = http.createServer((req, res) => {
    handleHttpRequest(req, res, socksAddr).catch((error) => {
      console.error(
        "Error handling HTTP request:",
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
        "Error handling CONNECT:",
        error instanceof Error ? error.message : String(error)
      );
    });
  });

  server.listen(listenAddr.port, listenAddr.host, () => {
    console.log(`HTTP/HTTPS proxy server listening on ${config.addr}`);
    console.log(`Forwarding to SOCKS5 proxy at ${config.socks_addr}`);
    console.log("Supports both HTTP and HTTPS traffic");
  });

  server.on("error", (error) => {
    console.error("Server error:", error.message);
    process.exit(1);
  });
}

/**
 * Main entry point - loads configuration and starts the proxy server
 */
async function main(): Promise<void> {
  try {
    const configPath = path.join(process.cwd(), "config.json");
    const config = await loadConfig(configPath);
    await startProxy(config);
  } catch (error) {
    console.error(
      "Failed to start proxy:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();

export {};
