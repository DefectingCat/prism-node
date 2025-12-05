import * as path from "node:path";
import { loadConfig } from "./config";
import { startProxy } from "./proxy-server";
import { startHttpServer } from "./http-server";
import { getTimestamp } from "./utils";

/**
 * Main entry point - loads configuration and starts both proxy and HTTP servers
 */
async function main(): Promise<void> {
  try {
    const configPath = path.join(process.cwd(), "config.json");
    console.log(
      `[${getTimestamp()}] Loading configuration from ${configPath}...`
    );
    const config = await loadConfig(configPath);
    console.log(`[${getTimestamp()}] Configuration loaded successfully`);
    
    await Promise.all([
      startProxy(config),
      startHttpServer(config)
    ]);
  } catch (error) {
    console.error(
      `[${getTimestamp()}] Failed to start servers:`,
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();

export {};
