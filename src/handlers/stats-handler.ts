import type { Context } from 'hono';
import logger from '../utils/logger';
import { statsCollector } from '../utils/stats-collector';

export class StatsHandler {
  async getStats(c: Context) {
    try {
      const query = c.req.query();

      const options: {
        startTime?: number;
        endTime?: number;
        host?: string;
        type?: 'HTTP' | 'HTTPS';
        limit?: number;
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

      if (query.limit) {
        options.limit = Number(query.limit);
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

  async getActiveConnections(c: Context) {
    try {
      const activeConnections = statsCollector.getActiveConnections();

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
}

export const statsHandler = new StatsHandler();
