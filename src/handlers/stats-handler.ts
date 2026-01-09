import type { Context } from 'hono';
import { z } from 'zod';
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
      // Define Zod schema for query parameters
      const statsQuerySchema = z.object({
        startTime: z.coerce.number().optional(),
        endTime: z.coerce.number().optional(),
        host: z.string().optional(),
        type: z.enum(['HTTP', 'HTTPS']).optional(),
        page: z.coerce.number().min(1).optional(),
        pageSize: z.coerce.number().min(1).max(1000).optional(),
      });

      // Validate query parameters
      const validatedQuery = statsQuerySchema.parse(c.req.query());

      const options: {
        startTime?: number;
        endTime?: number;
        host?: string;
        type?: 'HTTP' | 'HTTPS';
        page?: number;
        pageSize?: number;
      } = {
        startTime: validatedQuery.startTime,
        endTime: validatedQuery.endTime,
        host: validatedQuery.host,
        type: validatedQuery.type,
        page: validatedQuery.page,
        pageSize: validatedQuery.pageSize,
      };

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
      if (error instanceof z.ZodError) {
        return c.json(
          {
            success: false,
            error: '无效的查询参数',
            details: error.issues.map((issue) => issue.message),
          },
          400,
        );
      }
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
      // Define Zod schema for query parameters
      const activeConnectionsQuerySchema = z.object({
        page: z.coerce.number().min(1).optional(),
        pageSize: z.coerce.number().min(1).max(1000).optional(),
      });

      // Validate query parameters
      const validatedQuery = activeConnectionsQuerySchema.parse(c.req.query());

      const options: {
        page?: number;
        pageSize?: number;
      } = {
        page: validatedQuery.page,
        pageSize: validatedQuery.pageSize,
      };

      const activeConnections = statsCollector.getActiveConnections(options);

      return c.json({
        success: true,
        data: {
          activeConnections,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          {
            success: false,
            error: '无效的查询参数',
            details: error.issues.map((issue) => issue.message),
          },
          400,
        );
      }
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
      const blacklist = await statsCollector.getDomainBlacklist();

      return c.json({
        success: true,
        data: blacklist,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          {
            success: false,
            error: '无效的查询参数',
            details: error.issues.map((issue) => issue.message),
          },
          400,
        );
      }
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

  /**
   * Edits the domain blacklist configuration
   *
   * @param c - Hono context object
   * @returns JSON response indicating success or failure
   */
  async editDomainBlacklist(c: Context) {
    try {
      // Define Zod schema for request body
      const editDomainBlacklistSchema = z.object({
        domains: z.array(z.string()),
      });

      // Validate request body
      const { domains } = editDomainBlacklistSchema.parse(await c.req.json());

      await statsCollector.editDomainBlacklist(domains);

      return c.json({
        success: true,
        message: 'Domain blacklist updated successfully.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          {
            success: false,
            error: '无效的请求体',
            details: error.issues.map((issue) => issue.message),
          },
          400,
        );
      }
      logger.error('编辑域名黑名单失败:', error);
      return c.json(
        {
          success: false,
          error: '编辑域名黑名单失败',
        },
        500,
      );
    }
  }
}

export const statsHandler = new StatsHandler();
