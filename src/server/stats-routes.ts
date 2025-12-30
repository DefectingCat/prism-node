import { Hono } from 'hono';
import { aboutHandler } from '../handlers/about-handler';
import { statsHandler } from '../handlers/stats-handler';

// Statistics Routes - /api/stats
export const statsRoutes = new Hono()
  .get('/', (c) => statsHandler.getStats(c))
  .get('/active', (c) => statsHandler.getActiveConnections(c));

// About Routes - /api/about
export const aboutRoute = new Hono().get('/', (c) => aboutHandler.getAbout(c));

// WebSocket Info Route - /api/logs/stream
export const logsStreamRoute = new Hono().get('/', (c) => {
  return c.json({
    message:
      'WebSocket endpoint. Connect using ws:// protocol to stream logs in real-time.',
    endpoint: '/api/logs/stream',
    usage:
      'Use a WebSocket client to connect to ws://host:port/api/logs/stream',
  });
});

// Domain Blacklist Routes - /api/blocklists
export const blocklistsRoutes = new Hono()
  .get('/', (c) => statsHandler.getDomainBlacklist(c))
  .post('/', (c) => statsHandler.editDomainBlacklist(c));

/**
 * Creates and configures statistics API routes for the proxy server
 *
 * Available endpoints:
 * - GET /stats - Retrieves comprehensive proxy statistics with optional filtering
 * - GET /stats/active - Gets current active connection count
 * - GET /about - Gets README.md content for About page
 * - WS /logs/stream - WebSocket endpoint for real-time log streaming
 *
 * @returns Configured Hono router with statistics endpoints
 */
export function createStatsRoutes() {
  const app = new Hono();

  // Mount all routes
  app.route('/stats', statsRoutes);
  app.route('/about', aboutRoute);
  app.route('/logs/stream', logsStreamRoute);
  app.route('/blocklists', blocklistsRoutes);

  return app;
}
