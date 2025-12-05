import * as fs from "node:fs/promises";
import JSON5 from "json5";
import type { Config } from "./types";

/**
 * Loads and validates configuration from a JSON file (supports comments and trailing commas)
 * @param configPath - Path to the configuration file
 * @returns Validated configuration object
 * @throws Error if file cannot be read or config is invalid
 */
export async function loadConfig(configPath: string): Promise<Config> {
  try {
    const content = await fs.readFile(configPath, "utf-8");
    const config = JSON5.parse(content) as Config;

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
