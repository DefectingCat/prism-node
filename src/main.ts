import * as path from 'node:path';
import { loadConfig } from './config/config';
import { startHttpServer } from './server/http-server';
import logger from './utils/logger';
import { startProxy } from './server/proxy-server';

/**
 * Main entry point - loads configuration and starts both proxy and HTTP servers
 */
async function main(): Promise<void> {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    logger.info(`Loading configuration from ${configPath}...`);
    const config = await loadConfig(configPath);
    logger.info(`Configuration loaded successfully`);

    await Promise.all([startProxy(config), startHttpServer(config)]);
  } catch (error) {
    logger.error(
      `Failed to start servers:`,
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

main();
