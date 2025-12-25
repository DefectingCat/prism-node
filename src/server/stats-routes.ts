import { Hono } from 'hono';
import { statsHandler } from '../handlers/stats-handler';

/**
 * Creates and configures statistics API routes for the proxy server
 *
 * Available endpoints:
 * - GET /stats - Retrieves comprehensive proxy statistics with optional filtering
 * - GET /stats/active - Gets current active connection count
 * - WS /logs/stream - WebSocket endpoint for real-time log streaming
 *
 * @returns Configured Hono router with statistics endpoints
 */
export function createStatsRoutes() {
  const app = new Hono();

  app.get('/stats', (c) => statsHandler.getStats(c));

  app.get('/stats/active', (c) => statsHandler.getActiveConnections(c));

  // WebSocket endpoint for real-time log streaming
  // Note: WebSocket upgrade happens at the HTTP server level
  // This route returns information about the WebSocket endpoint
  app.get('/logs/stream', (c) => {
    return c.json({
      message:
        'WebSocket endpoint. Connect using ws:// protocol to stream logs in real-time.',
      endpoint: '/api/logs/stream',
      usage:
        'Use a WebSocket client to connect to ws://host:port/api/logs/stream',
    });
  });

  return app;
}
