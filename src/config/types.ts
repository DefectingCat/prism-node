/**
 * Configuration structure loaded from config.json
 */
export interface Config {
  addr: string; // HTTP proxy listening address (e.g., "127.0.0.1:8080")
  socks_addr: string; // SOCKS5 proxy address to forward to (e.g., "127.0.0.1:1080")
  log_path?: string; // Log file path (empty string means no log file)
  whitelist?: string[]; // Domain whitelist for direct connection (e.g., ["example.com", "*.google.com"])
}

/**
 * Parsed address components
 */
export interface ParsedAddress {
  host: string;
  port: number;
}
