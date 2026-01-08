import * as fs from 'node:fs/promises';
import JSON5 from 'json5';
import type { Config } from './types';

/**
 * Loads and validates configuration from a JSON file (supports comments and trailing commas)
 * @param configPath - Path to the configuration file
 * @returns Validated configuration object
 * @throws Error if file cannot be read or config is invalid
 */
export async function loadConfig(configPath: string): Promise<Config> {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON5.parse(content) as Config;

    // Validate required fields
    if (!config.addr || !config.socks_addr) {
      throw new Error("Config must contain 'addr' and 'socks_addr' properties");
    }

    // Validate PostgreSQL configuration
    if (!config.postgres) {
      throw new Error("Config must contain 'postgres' property");
    }
    if (
      !config.postgres.host ||
      !config.postgres.database ||
      !config.postgres.user ||
      config.postgres.password == null
    ) {
      throw new Error(
        "PostgreSQL config must contain 'host', 'database', 'user', and 'password' properties",
      );
    }
    if (
      config.postgres.port &&
      (config.postgres.port < 1 || config.postgres.port > 65535)
    ) {
      throw new Error('PostgreSQL port must be between 1 and 65535');
    }

    // 验证 cron 表达式（可选）
    if (config.cron) {
      // 简单验证 cron 表达式格式（5或6个字段，支持常用格式）
      const cronPattern = /^(\*|(\d+|[\d,-/*]+))(\s+(\*|(\d+|[\d,-/*]+))){4,5}$/;
      if (!cronPattern.test(config.cron.trim())) {
        throw new Error(
          "Cron configuration must be a valid cron expression (e.g., '0 * * * *')",
        );
      }
    }

    return config;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
    throw error;
  }
}
