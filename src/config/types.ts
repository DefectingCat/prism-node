/**
 * PostgreSQL database connection configuration
 */
export interface PostgresConfig {
  host: string; // Database host address (e.g., "localhost")
  port: number; // Database port (default: 5432)
  database: string; // Database name
  user: string; // Database user
  password: string; // Database password
  pool?: {
    max?: number; // Maximum number of connections in pool (default: 10)
    idleTimeoutMillis?: number; // How long a client is allowed to remain idle before being closed (default: 30000)
    connectionTimeoutMillis?: number; // Maximum wait time for connection (default: 2000)
  };
}

/**
 * Configuration structure loaded from config.json
 */
export interface Config {
  addr: string; // HTTP proxy listening address (e.g., "127.0.0.1:8080")
  socks_addr: string; // SOCKS5 proxy address to forward to (e.g., "127.0.0.1:1080")
  http_addr: string; // HTTP API server listening address (e.g., "127.0.0.1:3000")
  static_dir?: string; // Static files directory path (default: "./html")
  log_path?: string; // Log file path (empty string means no log file)
  postgres: PostgresConfig; // PostgreSQL database configuration
}

/**
 * Parsed address components
 */
export interface ParsedAddress {
  host: string;
  port: number;
}
