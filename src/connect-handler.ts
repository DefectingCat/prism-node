import * as http from "node:http";
import * as net from "node:net";
import { SocksClient } from "socks";
import type { ParsedAddress } from "./types";
import { generateRequestId, getTimestamp, formatBytes } from "./utils";

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
