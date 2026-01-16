import { Hono } from 'hono';
import { aboutHandler } from '../handlers/about-handler';
import { statsHandler } from '../handlers/stats-handler';
import { userHandler } from '../handlers/user-handler';

// Statistics Routes - /api/stats
export const statsRoutes = new Hono()
  .get('/', statsHandler.getStats)
  .get('/active', statsHandler.getActiveConnections);

// About Routes - /api/about
export const aboutRoute = new Hono().get('/', aboutHandler.getAbout);

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

// User Routes - /api/users
export const usersRoutes = new Hono().post('/create', userHandler.createUser);

// Domain Blacklist Routes - /api/blocklists
export const blocklistsRoutes = new Hono()
  .get('/', statsHandler.getDomainBlacklist)
  .post('/', statsHandler.editDomainBlacklist);

// Domain Whitelist Routes - /api/allowlists
export const allowlistsRoutes = new Hono()
  .get('/', statsHandler.getDomainWhitelist)
  .post('/', statsHandler.editDomainWhitelist);

/**
 * Creates and configures statistics API routes for the proxy server
 *
 * Available endpoints:
 * - GET /stats - Retrieves comprehensive proxy statistics with optional filtering
 * - GET /stats/active - Gets current active connection count
 * - GET /about - Gets README.md content for About page
 * - WS /logs/stream - WebSocket endpoint for real-time log streaming
 * - POST /users/create - Creates a new user
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
  app.route('/allowlists', allowlistsRoutes);
  app.route('/users', usersRoutes);

  return app;
}
