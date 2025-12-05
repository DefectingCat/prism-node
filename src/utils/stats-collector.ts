import { database, type AccessRecord } from './database';
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

  /**
   * 初始化统计收集器
   */
  async initialize(): Promise<void> {
    try {
      await database.initialize();
      logger.info('Stats collector initialized');
    } catch (error) {
      logger.error('Failed to initialize stats collector:', error);
      throw error;
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

    try {
      await database.insertAccessRecord(record);
      logger.debug(
        `[STATS] Recorded connection ${requestId}: ${record.type} ${record.targetHost}:${record.targetPort} - ${duration}ms, ↑${record.bytesUp} ↓${record.bytesDown} bytes`,
      );
    } catch (error) {
      logger.error(`[STATS] Failed to record connection ${requestId}:`, error);
    } finally {
      this.activeConnections.delete(requestId);
    }
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
      limit?: number;
    } = {},
  ) {
    try {
      return await database.getStats(options);
    } catch (error) {
      logger.error('[STATS] Failed to get stats:', error);
      throw error;
    }
  }

  /**
   * 获取当前活跃连接数
   * @returns 活跃连接数量
   */
  getActiveConnections(): number {
    return this.activeConnections.size;
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
    await database.close();
    logger.info('Stats collector closed');
  }
}

// 导出统计收集器单例实例
export const statsCollector = new StatsCollector();
