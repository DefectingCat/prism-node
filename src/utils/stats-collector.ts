import type { Config } from '../config/types';
import { type AccessRecord, database } from './database';
import logger from './logger';

/**
 * 统计数据收集器
 * 负责收集代理服务器的访问统计信息
 */
export class StatsCollector {
  // 存储活跃连接的信息
  private activeConnections = new Map<
    string,
    {
      record: Partial<AccessRecord>; // 访问记录
      startTime: number; // 连接开始时间
      bytesUp: number; // 上传字节数
      bytesDown: number; // 下载字节数
    }
  >();

  private enableDatabase: boolean = false;
  private configWhitelist: string[] = [];

  /**
   * Initialize stats collector
   * @param config Application configuration containing PostgreSQL settings
   */
  async initialize(config: Config): Promise<void> {
    this.enableDatabase = config.enableDatabase ?? false;
    this.configWhitelist = config.whitelist ?? [];

    if (this.enableDatabase) {
      try {
        await database.initialize(config.postgres);
        logger.info('Stats collector initialized with database support');
      } catch (error) {
        logger.error('Failed to initialize stats collector:', error);
        throw error;
      }
    } else {
      logger.info('Stats collector initialized without database support');
    }
  }

  /**
   * 开始记录新连接
   * @param requestId 请求唯一标识符
   * @param data 连接基本信息
   */
  startConnection(
    requestId: string,
    data: {
      type: 'HTTP' | 'HTTPS';
      targetHost: string;
      targetPort: number;
      clientIP: string;
      userAgent?: string;
    },
  ): void {
    this.activeConnections.set(requestId, {
      record: {
        timestamp: Date.now(),
        requestId,
        type: data.type,
        targetHost: data.targetHost,
        targetPort: data.targetPort,
        clientIP: data.clientIP,
        userAgent: data.userAgent,
        status: 'success',
      },
      startTime: Date.now(),
      bytesUp: 0,
      bytesDown: 0,
    });

    logger.debug(
      `[STATS] Started tracking connection ${requestId} to ${data.targetHost}:${data.targetPort}`,
    );
  }

  /**
   * 添加上传字节数
   * @param requestId 请求ID
   * @param bytes 字节数
   */
  addBytesUp(requestId: string, bytes: number): void {
    const connection = this.activeConnections.get(requestId);
    if (connection) {
      connection.bytesUp += bytes;
    }
  }

  /**
   * 添加下载字节数
   * @param requestId 请求ID
   * @param bytes 字节数
   */
  addBytesDown(requestId: string, bytes: number): void {
    const connection = this.activeConnections.get(requestId);
    if (connection) {
      connection.bytesDown += bytes;
    }
  }

  /**
   * 结束连接记录并保存到数据库
   * @param requestId 请求ID
   * @param options 结束选项（状态和错误信息）
   */
  async endConnection(
    requestId: string,
    options: {
      status?: 'success' | 'error' | 'timeout';
      errorMessage?: string;
    } = {},
  ): Promise<void> {
    const connection = this.activeConnections.get(requestId);
    if (!connection) {
      logger.warn(
        `[STATS] No active connection found for request ${requestId}`,
      );
      return;
    }

    const duration = Date.now() - connection.startTime;

    const record: AccessRecord = {
      ...connection.record,
      duration,
      bytesUp: connection.bytesUp,
      bytesDown: connection.bytesDown,
      status: options.status || 'success',
      errorMessage: options.errorMessage,
    } as AccessRecord;

    if (this.enableDatabase) {
      try {
        await database.insertAccessRecord(record);
        logger.debug(
          `[STATS] Recorded connection ${requestId}: ${record.type} ${record.targetHost}:${record.targetPort} - ${duration}ms, ↑${record.bytesUp} ↓${record.bytesDown} bytes`,
        );
      } catch (error) {
        logger.error(
          `[STATS] Failed to record connection ${requestId}:`,
          error,
        );
      }
    } else {
      logger.debug(
        `[STATS] Connection ${requestId}: ${record.type} ${record.targetHost}:${record.targetPort} - ${duration}ms, ↑${record.bytesUp} ↓${record.bytesDown} bytes (not stored in database)`,
      );
    }

    this.activeConnections.delete(requestId);
  }

  /**
   * 获取统计数据
   * @param options 查询选项
   * @returns 统计结果
   */
  async getStats(
    options: {
      startTime?: number;
      endTime?: number;
      host?: string;
      type?: 'HTTP' | 'HTTPS';
      page?: number;
      pageSize?: number;
    } = {},
  ) {
    if (this.enableDatabase) {
      try {
        return await database.getStats(options);
      } catch (error) {
        logger.error('[STATS] Failed to get stats:', error);
        throw error;
      }
    } else {
      // 返回空的统计数据
      return {
        totalRequests: 0,
        totalBytesUp: 0,
        totalBytesDown: 0,
        avgDuration: 0,
        topHosts: [],
        records: [],
        pagination: {
          page: options.page || 1,
          pageSize: options.pageSize || 10,
          total: 0,
          totalPages: 0,
        },
      };
    }
  }

  /**
   * 获取当前活跃连接信息（支持分页）
   * @param options 查询选项
   * @returns 分页后的活跃连接列表和总数
   */
  getActiveConnections(options: { page?: number; pageSize?: number } = {}): {
    total: number;
    connections: Array<{
      requestId: string;
      startTime: number;
      record: Partial<AccessRecord>;
      bytesUp: number;
      bytesDown: number;
    }>;
  } {
    const total = this.activeConnections.size;
    const connections = Array.from(this.activeConnections.entries()).map(
      ([requestId, connection]) => ({
        requestId,
        ...connection,
      }),
    );

    // Apply pagination
    const page = options.page ? Math.max(1, Number(options.page)) : 1;
    const pageSize = options.pageSize
      ? Math.min(1000, Math.max(1, Number(options.pageSize)))
      : 1000;

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      total,
      connections: connections.slice(startIndex, endIndex),
    };
  }

  /**
   * 获取域名白名单配置
   * @returns 域名白名单列表
   */
  async getDomainWhitelist(): Promise<{
    total: number;
    whitelist: Array<string>;
  }> {
    if (this.enableDatabase) {
      try {
        const domainWhitelistEntries = await database.getDomainWhitelist();
        const whitelist = domainWhitelistEntries.map((entry) => entry.domain);
        return {
          total: whitelist.length,
          whitelist,
        };
      } catch (error) {
        logger.error('[STATS] Failed to get domain whitelist:', error);
        throw error;
      }
    } else {
      // 返回配置文件中的白名单
      return {
        total: this.configWhitelist.length,
        whitelist: this.configWhitelist,
      };
    }
  }

  /**
   * Edits the domain whitelist configuration
   *
   * @param domains - An array of domain strings to set as the new whitelist
   * @returns A promise that resolves when the whitelist is updated
   */
  async editDomainWhitelist(domains: string[]): Promise<void> {
    if (this.enableDatabase) {
      try {
        await database.editDomainWhitelist(domains);
        logger.info('Domain whitelist updated successfully.');
      } catch (error) {
        logger.error('[STATS] Failed to edit domain whitelist:', error);
        throw error;
      }
    } else {
      logger.warn(
        'Domain whitelist editing disabled (database functionality is off)',
      );
    }
  }

  /**
   * 关闭统计收集器
   * 结束所有活跃连接并关闭数据库
   */
  async close(): Promise<void> {
    // 结束所有活跃连接
    const promises = Array.from(this.activeConnections.keys()).map(
      (requestId) =>
        this.endConnection(requestId, {
          status: 'error',
          errorMessage: 'Server shutdown',
        }),
    );

    await Promise.allSettled(promises);

    if (this.enableDatabase) {
      await database.close();
    }

    logger.info('Stats collector closed');
  }
}

// 导出统计收集器单例实例
export const statsCollector = new StatsCollector();
