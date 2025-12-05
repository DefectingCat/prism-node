/**
 * Configuration structure loaded from config.json
 */
export interface Config {
  addr: string; // HTTP proxy listening address (e.g., "127.0.0.1:8080")
  socks_addr: string; // SOCKS5 proxy address to forward to (e.g., "127.0.0.1:1080")
  http_addr: string; // HTTP API server listening address (e.g., "127.0.0.1:3000")
}

/**
 * Parsed address components
 */
export interface ParsedAddress {
  host: string;
  port: number;
}
