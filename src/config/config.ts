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

    // Set default value for enableDatabase if not provided
    if (config.enableDatabase === undefined) {
      config.enableDatabase = false;
    }

    // Validate required fields
    if (!config.addr || !config.socks_addr) {
      throw new Error("Config must contain 'addr' and 'socks_addr' properties");
    }

    // Validate PostgreSQL configuration only if enableDatabase is true
    if (config.enableDatabase) {
      if (!config.postgres) {
        throw new Error(
          "Config must contain 'postgres' property when enableDatabase is true",
        );
      }
      if (
        !config.postgres.host ||
        !config.postgres.database ||
        !config.postgres.user ||
        config.postgres.password == null
      ) {
        throw new Error(
          "PostgreSQL config must contain 'host', 'database', 'user', and 'password' properties when enableDatabase is true",
        );
      }
      if (
        config.postgres.port &&
        (config.postgres.port < 1 || config.postgres.port > 65535)
      ) {
        throw new Error('PostgreSQL port must be between 1 and 65535');
      }
    }

    // 验证 whitelist（可选）
    if (config.whitelist !== undefined) {
      if (!Array.isArray(config.whitelist)) {
        throw new Error("Whitelist must be an array of domain strings");
      }
      // 验证数组中的每个元素都是字符串
      for (let i = 0; i < config.whitelist.length; i++) {
        const domain = config.whitelist[i];
        if (typeof domain !== "string") {
          throw new Error(`Whitelist entry at index ${i} must be a string`);
        }
        if (!domain.trim()) {
          throw new Error(`Whitelist entry at index ${i} cannot be empty`);
        }
      }
    }

    // 验证 cron 表达式（可选）
    if (config.cron) {
      // 简单验证 cron 表达式格式（5或6个字段，支持常用格式）
      const cronPattern =
        /^(\*|(\d+|[\d,-/*]+))(\s+(\*|(\d+|[\d,-/*]+))){4,5}$/;
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
