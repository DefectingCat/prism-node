import type { Context } from 'hono';
import logger from '../utils/logger';
import { statsCollector } from '../utils/stats-collector';

/**
 * Statistics API handler class
 * Provides HTTP endpoints for retrieving proxy server statistics and active connection information
 */
export class StatsHandler {
  /**
   * Retrieves comprehensive proxy statistics with optional filtering
   *
   * Query parameters:
   * - startTime: Filter by start timestamp
   * - endTime: Filter by end timestamp
   * - host: Filter by target hostname
   * - type: Filter by connection type (HTTP/HTTPS)
   * - page: Page number for pagination
   * - pageSize: Records per page
   *
   * @param c - Hono context object
   * @returns JSON response with statistics data and active connections
   */
  async getStats(c: Context) {
    try {
      const query = c.req.query();

      const options: {
        startTime?: number;
        endTime?: number;
        host?: string;
        type?: 'HTTP' | 'HTTPS';
        page?: number;
        pageSize?: number;
      } = {};

      if (query.startTime) {
        options.startTime = Number(query.startTime);
      }

      if (query.endTime) {
        options.endTime = Number(query.endTime);
      }

      if (query.host) {
        options.host = query.host;
      }

      if (query.type && (query.type === 'HTTP' || query.type === 'HTTPS')) {
        options.type = query.type;
      }

      if (query.page) {
        options.page = Math.max(1, Number(query.page));
      }

      if (query.pageSize) {
        options.pageSize = Math.min(1000, Math.max(1, Number(query.pageSize)));
      }

      const stats = await statsCollector.getStats(options);
      const activeConnections = statsCollector.getActiveConnections();

      return c.json({
        success: true,
        data: {
          ...stats,
          activeConnections,
        },
      });
    } catch (error) {
      logger.error('获取统计信息失败:', error);
      return c.json(
        {
          success: false,
          error: '获取统计信息失败',
        },
        500,
      );
    }
  }

  /**
   * Retrieves the current number of active proxy connections with pagination
   *
   * Query parameters:
   * - page: Page number for pagination
   * - pageSize: Records per page
   *
   * @param c - Hono context object
   * @returns JSON response with active connection count
   */
  async getActiveConnections(c: Context) {
    try {
      const query = c.req.query();

      const options: {
        page?: number;
        pageSize?: number;
      } = {};

      if (query.page) {
        options.page = Math.max(1, Number(query.page));
      }

      if (query.pageSize) {
        options.pageSize = Math.min(1000, Math.max(1, Number(query.pageSize)));
      }

      const activeConnections = statsCollector.getActiveConnections(options);

      return c.json({
        success: true,
        data: {
          activeConnections,
        },
      });
    } catch (error) {
      logger.error('获取活跃连接数失败:', error);
      return c.json(
        {
          success: false,
          error: '获取活跃连接数失败',
        },
        500,
      );
    }
  }

  /**
   * Retrieves the domain blacklist configuration
   *
   * Query parameters:
   * - page: Page number for pagination
   * - pageSize: Records per page
   *
   * @param c - Hono context object
   * @returns JSON response with domain blacklist and pagination information
   */
  async getDomainBlacklist(c: Context) {
    try {
      const query = c.req.query();

      const options: {
        page?: number;
        pageSize?: number;
      } = {};

      if (query.page) {
        options.page = Math.max(1, Number(query.page));
      }

      if (query.pageSize) {
        options.pageSize = Math.min(1000, Math.max(1, Number(query.pageSize)));
      }

      const blacklist = await statsCollector.getDomainBlacklist(options);

      return c.json({
        success: true,
        data: blacklist,
      });
    } catch (error) {
      logger.error('获取域名黑名单失败:', error);
      return c.json(
        {
          success: false,
          error: '获取域名黑名单失败',
        },
        500,
      );
    }
  }
}

export const statsHandler = new StatsHandler();
