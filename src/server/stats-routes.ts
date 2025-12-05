import { Hono } from 'hono';
import { statsHandler } from '../handlers/stats-handler';

export function createStatsRoutes() {
  const app = new Hono();

  app.get('/stats', (c) => statsHandler.getStats(c));

  app.get('/stats/active', (c) => statsHandler.getActiveConnections(c));

  return app;
}
