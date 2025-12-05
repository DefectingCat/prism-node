import { Hono } from "hono";
import { serve } from "@hono/node-server";
import type { Config } from "./types";
import { parseAddress, getTimestamp } from "./utils";

export function createHttpServer(): Hono {
  const app = new Hono();

  app.get("/api/hello", (c) => {
    return c.text("Hello World");
  });

  return app;
}

export async function startHttpServer(config: Config): Promise<void> {
  const httpAddr = parseAddress(config.http_addr);
  const app = createHttpServer();

  console.log(`[${getTimestamp()}] Starting HTTP server...`);
  console.log(`[${getTimestamp()}] HTTP server address: ${config.http_addr}`);

  serve({
    fetch: app.fetch,
    port: httpAddr.port,
    hostname: httpAddr.host,
  });

  console.log(`[${getTimestamp()}] HTTP server is running on: ${config.http_addr}`);
}