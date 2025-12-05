import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import sqlite3 from 'sqlite3';
import logger from './logger';

interface SQLiteRunResult {
  lastID: number;
  changes: number;
}

type SQLiteParam = string | number | null | undefined;

type PromisifiedRun = (
  sql: string,
  params?: SQLiteParam[],
) => Promise<SQLiteRunResult>;
type PromisifiedAll = (
  sql: string,
  params?: SQLiteParam[],
) => Promise<Record<string, SQLiteParam>[]>;
type PromisifiedGet = (
  sql: string,
  params?: SQLiteParam[],
) => Promise<Record<string, SQLiteParam>>;

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
 * SQLite 数据库管理类
 * 负责代理访问统计数据的存储和查询
 */
class Database {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor() {
    // 确保 logs 目录存在
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    this.dbPath = path.join(logsDir, 'proxy-stats.db');
  }

  /**
   * 初始化数据库连接和表结构
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          logger.error('Failed to open database:', err.message);
          reject(err);
          return;
        }

        logger.info(`SQLite database opened: ${this.dbPath}`);
        this.createTables()
          .then(() => resolve())
          .catch(reject);
      });
    });
  }

  /**
   * 创建数据库表和索引
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const runAsync = promisify(this.db.run.bind(this.db)) as PromisifiedRun;

    // 创建访问日志表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS access_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        request_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('HTTP', 'HTTPS')),
        target_host TEXT NOT NULL,
        target_port INTEGER NOT NULL,
        client_ip TEXT NOT NULL,
        user_agent TEXT,
        duration INTEGER NOT NULL,
        bytes_up INTEGER NOT NULL DEFAULT 0,
        bytes_down INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
        error_message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 创建查询优化索引
    const createIndexSQL = `
      CREATE INDEX IF NOT EXISTS idx_timestamp ON access_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_target_host ON access_logs(target_host);
      CREATE INDEX IF NOT EXISTS idx_type ON access_logs(type);
      CREATE INDEX IF NOT EXISTS idx_status ON access_logs(status);
    `;

    try {
      await runAsync(createTableSQL);
      await runAsync(createIndexSQL);
      logger.info('Database tables created successfully');
    } catch (error) {
      logger.error('Failed to create tables:', error);
      throw error;
    }
  }

  /**
   * 插入访问记录到数据库
   * @param record 访问记录对象
   * @returns 插入记录的ID
   */
  async insertAccessRecord(record: AccessRecord): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const sql = `
        INSERT INTO access_logs (
          timestamp, request_id, type, target_host, target_port,
          client_ip, user_agent, duration, bytes_up, bytes_down,
          status, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

      this.db.run(sql, params, function (err) {
        if (err) {
          logger.error('Failed to insert access record:', err);
          reject(err);
          return;
        }
        resolve(this.lastID);
      });
    });
  }

  /**
   * 获取统计数据
   * @param options 查询选项
   * @returns 统计结果包含总体数据、热门主机和详细记录
   */
  async getStats(
    options: {
      startTime?: number;
      endTime?: number;
      host?: string;
      type?: 'HTTP' | 'HTTPS';
      limit?: number;
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
    if (!this.db) throw new Error('Database not initialized');

    const allAsync = promisify(this.db.all.bind(this.db)) as PromisifiedAll;
    const getAsync = promisify(this.db.get.bind(this.db)) as PromisifiedGet;

    // 构建查询条件
    let whereClause = 'WHERE 1=1';
    const params: SQLiteParam[] = [];

    if (options.startTime) {
      whereClause += ' AND timestamp >= ?';
      params.push(options.startTime);
    }

    if (options.endTime) {
      whereClause += ' AND timestamp <= ?';
      params.push(options.endTime);
    }

    if (options.host) {
      whereClause += ' AND target_host LIKE ?';
      params.push(`%${options.host}%`);
    }

    if (options.type) {
      whereClause += ' AND type = ?';
      params.push(options.type);
    }

    try {
      // 获取总体统计
      const statsSQL = `
        SELECT 
          COUNT(*) as totalRequests,
          SUM(bytes_up) as totalBytesUp,
          SUM(bytes_down) as totalBytesDown,
          AVG(duration) as avgDuration
        FROM access_logs ${whereClause}
      `;

      const stats = await getAsync(statsSQL, params);

      // 获取热门主机
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

      const topHosts = await allAsync(topHostsSQL, params);

      // 处理分页参数
      const page = options.page || 1;
      const pageSize = options.pageSize || options.limit || 10;
      const offset = (page - 1) * pageSize;

      // 获取总记录数（用于分页计算）
      const countSQL = `SELECT COUNT(*) as total FROM access_logs ${whereClause}`;
      const countResult = await getAsync(countSQL, params);
      const total = Number(countResult.total) || 0;

      // 获取详细记录（带分页）
      const recordsSQL = `
        SELECT * FROM access_logs ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ? OFFSET ?
      `;

      const recordParams = [...params, pageSize, offset];
      const records = await allAsync(recordsSQL, recordParams);

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
        totalRequests: Number(stats.totalRequests) || 0,
        totalBytesUp: Number(stats.totalBytesUp) || 0,
        totalBytesDown: Number(stats.totalBytesDown) || 0,
        avgDuration: Number(stats.avgDuration) || 0,
        topHosts: (topHosts || []).map((host) => ({
          host: String(host.host),
          count: Number(host.count),
          bytes: Number(host.bytes),
        })),
        records: records.map(
          (record): AccessRecord => ({
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
   * 关闭数据库连接
   */
  async close(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const dbToClose = this.db;
      if (!dbToClose) {
        resolve();
        return;
      }

      this.db = null; // Set to null immediately to prevent double closing

      dbToClose.close((err) => {
        if (err) {
          logger.error('Failed to close database:', err);
          reject(err);
          return;
        }
        logger.info('Database connection closed');
        resolve();
      });
    });
  }
}

// 导出数据库单例实例
export const database = new Database();
