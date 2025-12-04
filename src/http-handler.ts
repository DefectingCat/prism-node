import * as http from "node:http";
import { SocksClient } from "socks";
import type { ParsedAddress } from "./types";
import { generateRequestId, getTimestamp, formatBytes } from "./utils";

/**
 * Handles standard HTTP requests (GET, POST, etc.) by forwarding through SOCKS5 proxy
 * @param req - HTTP request object
 * @param res - HTTP response object
 * @param socksAddr - SOCKS5 proxy server address
 */
export async function handleHttpRequest(
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
