import { Pool, type QueryResult } from 'pg';
import type { PostgresConfig } from '../config/types';
import logger from './logger';

/**
 * 代理访问记录接口
 * 记录每次代理连接的详细信息
 */
export interface AccessRecord {
  id?: number; // 数据库自增ID
  timestamp: number; // 连接开始时间戳
  requestId: string; // 唯一请求标识符
  type: 'HTTP' | 'HTTPS'; // 连接类型
  targetHost: string; // 目标主机名
  targetPort: number; // 目标端口
  clientIP: string; // 客户端IP地址
  userAgent?: string; // 客户端User-Agent
  duration: number; // 连接持续时间(毫秒)
  bytesUp: number; // 上传字节数
  bytesDown: number; // 下载字节数
  status: 'success' | 'error' | 'timeout'; // 连接状态
  errorMessage?: string; // 错误信息(如果有)
}

/**
 * PostgreSQL database management class
 * Responsible for storing and querying proxy access statistics
 */
class Database {
  private pool: Pool | null = null;

  constructor() {
    // Constructor is now empty, initialization happens in initialize()
  }

  /**
   * Initialize database connection pool and table structure
   * @param config PostgreSQL configuration
   */
  async initialize(config: PostgresConfig): Promise<void> {
    // Create connection pool
    this.pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.pool?.max ?? 10,
      idleTimeoutMillis: config.pool?.idleTimeoutMillis ?? 30000,
      connectionTimeoutMillis: config.pool?.connectionTimeoutMillis ?? 2000,
    });

    // Test connection
    try {
      const client = await this.pool.connect();
      logger.info(
        `PostgreSQL database connected: ${config.host}:${config.port}/${config.database}`,
      );
      client.release();

      // Create tables and indexes
      await this.createTables();
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Create database tables and indexes
   */
  private async createTables(): Promise<void> {
    if (!this.pool) throw new Error('Database not initialized');

    // Create access logs table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS access_logs (
        id SERIAL PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        request_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('HTTP', 'HTTPS')),
        target_host TEXT NOT NULL,
        target_port INTEGER NOT NULL,
        client_ip TEXT NOT NULL,
        user_agent TEXT,
        duration INTEGER NOT NULL,
        bytes_up BIGINT NOT NULL DEFAULT 0,
        bytes_down BIGINT NOT NULL DEFAULT 0,
        status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create query optimization indexes
    const createIndexesSQL = [
      'CREATE INDEX IF NOT EXISTS idx_timestamp ON access_logs(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_target_host ON access_logs(target_host)',
      'CREATE INDEX IF NOT EXISTS idx_type ON access_logs(type)',
      'CREATE INDEX IF NOT EXISTS idx_status ON access_logs(status)',
    ];

    try {
      await this.pool.query(createTableSQL);

      for (const indexSQL of createIndexesSQL) {
        await this.pool.query(indexSQL);
      }

      logger.info('Database tables created successfully');
    } catch (error) {
      logger.error('Failed to create tables:', error);
      throw error;
    }
  }

  /**
   * Insert access record into database
   * @param record Access record object
   * @returns ID of inserted record
   */
  async insertAccessRecord(record: AccessRecord): Promise<number> {
    if (!this.pool) throw new Error('Database not initialized');

    const sql = `
      INSERT INTO access_logs (
        timestamp, request_id, type, target_host, target_port,
        client_ip, user_agent, duration, bytes_up, bytes_down,
        status, error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `;

    const params = [
      record.timestamp,
      record.requestId,
      record.type,
      record.targetHost,
      record.targetPort,
      record.clientIP,
      record.userAgent || null,
      record.duration,
      record.bytesUp,
      record.bytesDown,
      record.status,
      record.errorMessage || null,
    ];

    try {
      const result: QueryResult = await this.pool.query(sql, params);
      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to insert access record:', error);
      throw error;
    }
  }

  /**
   * Get statistics data
   * @param options Query options
   * @returns Statistics results including overall data, top hosts, and detailed records
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
  ): Promise<{
    totalRequests: number;
    totalBytesUp: number;
    totalBytesDown: number;
    avgDuration: number;
    topHosts: Array<{ host: string; count: number; bytes: number }>;
    records: AccessRecord[];
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    if (!this.pool) throw new Error('Database not initialized');

    // Build query conditions
    let whereClause = 'WHERE 1=1';
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (options.startTime) {
      whereClause += ` AND timestamp >= $${paramIndex++}`;
      params.push(options.startTime);
    }

    if (options.endTime) {
      whereClause += ` AND timestamp <= $${paramIndex++}`;
      params.push(options.endTime);
    }

    if (options.host) {
      whereClause += ` AND target_host LIKE $${paramIndex++}`;
      params.push(`%${options.host}%`);
    }

    if (options.type) {
      whereClause += ` AND type = $${paramIndex++}`;
      params.push(options.type);
    }

    try {
      // Get overall statistics
      const statsSQL = `
        SELECT
          COUNT(*) as total_requests,
          COALESCE(SUM(bytes_up), 0) as total_bytes_up,
          COALESCE(SUM(bytes_down), 0) as total_bytes_down,
          COALESCE(AVG(duration), 0) as avg_duration
        FROM access_logs ${whereClause}
      `;

      const statsResult: QueryResult = await this.pool.query(statsSQL, params);
      const stats = statsResult.rows[0];

      // Get top hosts
      const topHostsSQL = `
        SELECT
          target_host as host,
          COUNT(*) as count,
          SUM(bytes_up + bytes_down) as bytes
        FROM access_logs ${whereClause}
        GROUP BY target_host
        ORDER BY count DESC
        LIMIT 10
      `;

      const topHostsResult: QueryResult = await this.pool.query(
        topHostsSQL,
        params,
      );

      // Handle pagination parameters
      const page = options.page || 1;
      const pageSize = options.pageSize || 10;
      const offset = (page - 1) * pageSize;

      // Get total record count (for pagination calculation)
      const countSQL = `SELECT COUNT(*) as total FROM access_logs ${whereClause}`;
      const countResult: QueryResult = await this.pool.query(countSQL, params);
      const total = Number(countResult.rows[0].total) || 0;

      // Get detailed records (with pagination)
      const recordsSQL = `
        SELECT * FROM access_logs ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      const recordParams = [...params, pageSize, offset];
      const recordsResult: QueryResult = await this.pool.query(
        recordsSQL,
        recordParams,
      );

      const result: {
        totalRequests: number;
        totalBytesUp: number;
        totalBytesDown: number;
        avgDuration: number;
        topHosts: Array<{ host: string; count: number; bytes: number }>;
        records: AccessRecord[];
        pagination: {
          page: number;
          pageSize: number;
          total: number;
          totalPages: number;
        };
      } = {
        totalRequests: Number(stats.total_requests) || 0,
        totalBytesUp: Number(stats.total_bytes_up) || 0,
        totalBytesDown: Number(stats.total_bytes_down) || 0,
        avgDuration: Number(stats.avg_duration) || 0,
        topHosts: topHostsResult.rows.map(
          (host: { host: string; count: number; bytes: number }) => ({
            host: String(host.host),
            count: Number(host.count),
            bytes: Number(host.bytes),
          }),
        ),
        records: recordsResult.rows.map(
          (record: {
            id?: number;
            timestamp: number;
            request_id: string;
            type: string;
            target_host: string;
            target_port: number;
            client_ip: string;
            user_agent?: string;
            duration: number;
            bytes_up: number;
            bytes_down: number;
            status: string;
            error_message?: string;
          }): AccessRecord => ({
            id: record.id ? Number(record.id) : undefined,
            timestamp: Number(record.timestamp),
            requestId: String(record.request_id),
            type: record.type as 'HTTP' | 'HTTPS',
            targetHost: String(record.target_host),
            targetPort: Number(record.target_port),
            clientIP: String(record.client_ip),
            userAgent: record.user_agent
              ? String(record.user_agent)
              : undefined,
            duration: Number(record.duration),
            bytesUp: Number(record.bytes_up),
            bytesDown: Number(record.bytes_down),
            status: record.status as 'success' | 'error' | 'timeout',
            errorMessage: record.error_message
              ? String(record.error_message)
              : undefined,
          }),
        ),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };

      return result;
    } catch (error) {
      logger.error('Failed to get stats:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (!this.pool) return;

    try {
      const poolToClose = this.pool;
      this.pool = null;
      await poolToClose.end();
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Failed to close database:', error);
      throw error;
    }
  }
}

// 导出数据库单例实例
export const database = new Database();
