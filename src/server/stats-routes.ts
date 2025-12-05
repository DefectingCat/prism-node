import { Hono } from 'hono';
import { statsHandler } from '../handlers/stats-handler';

/**
 * Creates and configures statistics API routes for the proxy server
 *
 * Available endpoints:
 * - GET /stats - Retrieves comprehensive proxy statistics with optional filtering
 * - GET /stats/active - Gets current active connection count
 *
 * @returns {Hono} Configured Hono router with statistics endpoints
 */
export function createStatsRoutes() {
  const app = new Hono();

  app.get('/stats', (c) => statsHandler.getStats(c));

  app.get('/stats/active', (c) => statsHandler.getActiveConnections(c));

  return app;
}
