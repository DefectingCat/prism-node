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
 * 域名黑名单配置接口
 */
export interface DomainBlacklist {
  id?: number; // 数据库自增ID
  domain: string; // 域名
  comment?: string; // 备注
  createdAt?: Date; // 创建时间
}

/**
 * 域名白名单配置接口
 */
export interface DomainWhitelist {
  id?: number; // 数据库自增ID
  domain: string; // 域名
  comment?: string; // 备注
  createdAt?: Date; // 创建时间
}

/**
 * 用户信息接口
 */
export interface User {
  id?: number; // 数据库自增ID
  username: string; // 用户名
  email: string; // 邮箱
  password: string; // 密码
  createdAt?: Date; // 创建时间
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
      );

      CREATE TABLE IF NOT EXISTS domain_blacklist (
        id SERIAL PRIMARY KEY,
        domain TEXT NOT NULL UNIQUE,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS domain_whitelist (
        id SERIAL PRIMARY KEY,
        domain TEXT NOT NULL UNIQUE,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
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
    if (!this.pool) {
      logger.debug('Database not initialized, skipping insertAccessRecord');
      return -1; // 返回无效ID表示未插入
    }

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
    if (!this.pool) {
      logger.debug('Database not initialized, returning empty stats');
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
   * Insert a domain into the blacklist
   * @param domainBlacklist Domain blacklist object
   * @returns ID of inserted record
   */
  async insertDomainBlacklist(
    domainBlacklist: DomainBlacklist,
  ): Promise<number | null> {
    if (!this.pool) {
      logger.debug('Database not initialized, skipping insertDomainBlacklist');
      return null;
    }

    const sql = `
      INSERT INTO domain_blacklist (domain, comment)
      VALUES ($1, $2)
      ON CONFLICT (domain) DO NOTHING
      RETURNING id
    `;

    const params = [domainBlacklist.domain, domainBlacklist.comment || null];

    try {
      const result: QueryResult = await this.pool.query(sql, params);
      return result.rows[0]?.id || null; // Return null if no row was inserted (due to conflict)
    } catch (error) {
      logger.error('Failed to insert domain into blacklist:', error);
      throw error;
    }
  }

  /**
   * Get all domain blacklist entries with pagination
   * @param options Query options with pagination parameters
   * @returns Array of domain blacklist entries with pagination information
   */
  async getDomainBlacklistPaginated(
    options: { page?: number; pageSize?: number } = {},
  ): Promise<{
    total: number;
    blacklist: string[];
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    if (!this.pool) {
      logger.debug('Database not initialized, returning empty blacklist');
      return {
        total: 0,
        blacklist: [],
        pagination: {
          page: options.page || 1,
          pageSize: options.pageSize || 10,
          total: 0,
          totalPages: 0,
        },
      };
    }

    // Get total record count
    const countSQL = 'SELECT COUNT(*) as total FROM domain_blacklist';
    const countResult: QueryResult = await this.pool.query(countSQL);
    const total = Number(countResult.rows[0].total) || 0;

    // Handle pagination parameters
    const page = options.page || 1;
    const pageSize = options.pageSize || 10;
    const offset = (page - 1) * pageSize;

    // Get blacklist entries with pagination
    const sql =
      'SELECT * FROM domain_blacklist ORDER BY created_at DESC LIMIT $1 OFFSET $2';
    const params = [pageSize, offset];

    try {
      const result: QueryResult = await this.pool.query(sql, params);
      const blacklist = result.rows.map(
        (entry: {
          id: number;
          domain: string;
          comment?: string;
          created_at: Date;
        }) => String(entry.domain),
      );

      const pagination = {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      };

      return {
        total,
        blacklist,
        pagination,
      };
    } catch (error) {
      logger.error('Failed to get domain blacklist:', error);
      throw error;
    }
  }

  /**
   * Retrieves all domain blacklist entries from the database.
   *
   * @returns A promise that resolves to an array of all DomainBlacklist objects.
   */
  async getDomainBlacklist(): Promise<DomainBlacklist[]> {
    if (!this.pool) {
      logger.debug('Database not initialized, returning empty blacklist');
      return [];
    }

    try {
      const sql =
        'SELECT id, domain, comment, created_at FROM domain_blacklist ORDER BY created_at DESC';
      const result: QueryResult = await this.pool.query(sql);
      return result.rows.map(
        (entry: {
          id: number;
          domain: string;
          comment?: string;
          created_at: Date;
        }) => ({
          id: Number(entry.id),
          domain: String(entry.domain),
          comment: entry.comment ? String(entry.comment) : undefined,
          createdAt: entry.created_at,
        }),
      );
    } catch (error) {
      logger.error('Failed to get all domain blacklist entries:', error);
      throw error;
    }
  }

  /**
   * Edits the domain blacklist by replacing all existing entries with a new set of domains.
   * This operation is performed within a transaction.
   *
   * @param domains - An array of domain strings to set as the new blacklist.
   * @returns A promise that resolves when the blacklist is updated.
   */
  async editDomainBlacklist(domains: string[]): Promise<void> {
    if (!this.pool) {
      logger.debug('Database not initialized, skipping editDomainBlacklist');
      return;
    }

    try {
      // Start a transaction
      await this.pool.query('BEGIN');

      // Clear existing blacklist
      await this.pool.query('TRUNCATE TABLE domain_blacklist RESTART IDENTITY');

      // Insert new domains
      for (const domain of domains) {
        await this.insertDomainBlacklist({ domain });
      }

      // Commit the transaction
      await this.pool.query('COMMIT');
      logger.info('Domain blacklist updated successfully in database.');
    } catch (error) {
      // Rollback on error
      await this.pool.query('ROLLBACK');
      logger.error('Failed to edit domain blacklist in database:', error);
      throw error;
    }
  }

  /**
   * Delete a domain from the blacklist by ID
   * @param id ID of the domain blacklist entry
   * @returns Number of rows deleted
   */
  async deleteDomainBlacklist(id: number): Promise<number> {
    if (!this.pool) {
      logger.debug('Database not initialized, skipping deleteDomainBlacklist');
      return 0;
    }

    const sql = 'DELETE FROM domain_blacklist WHERE id = $1';
    const params = [id];

    try {
      const result: QueryResult = await this.pool.query(sql, params);
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to delete domain from blacklist:', error);
      throw error;
    }
  }

  /**
   * Check if a domain is in the blacklist
   * @param domain Domain to check
   * @returns True if domain is in blacklist, false otherwise
   */
  async isDomainBlacklisted(domain: string): Promise<boolean> {
    if (!this.pool) {
      logger.debug('Database not initialized, domain blacklist check skipped');
      return false; // 默认不阻止任何域名
    }

    const sql =
      'SELECT COUNT(*) as count FROM domain_blacklist WHERE domain = $1';
    const params = [domain];

    try {
      const result: QueryResult = await this.pool.query(sql, params);
      return Number(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Failed to check if domain is blacklisted:', error);
      throw error;
    }
  }

  /**
   * Insert a domain into the whitelist
   * @param domainWhitelist Domain whitelist object
   * @returns ID of inserted record
   */
  async insertDomainWhitelist(
    domainWhitelist: DomainWhitelist,
  ): Promise<number | null> {
    if (!this.pool) {
      logger.debug('Database not initialized, skipping insertDomainWhitelist');
      return null;
    }

    const sql = `
      INSERT INTO domain_whitelist (domain, comment)
      VALUES ($1, $2)
      ON CONFLICT (domain) DO NOTHING
      RETURNING id
    `;

    const params = [domainWhitelist.domain, domainWhitelist.comment || null];

    try {
      const result: QueryResult = await this.pool.query(sql, params);
      return result.rows[0]?.id || null; // Return null if no row was inserted (due to conflict)
    } catch (error) {
      logger.error('Failed to insert domain into whitelist:', error);
      throw error;
    }
  }

  /**
   * Retrieves all domain whitelist entries from the database.
   *
   * @returns A promise that resolves to an array of all DomainWhitelist objects.
   */
  async getDomainWhitelist(): Promise<DomainWhitelist[]> {
    if (!this.pool) {
      logger.debug('Database not initialized, returning empty whitelist');
      return [];
    }

    try {
      const sql =
        'SELECT id, domain, comment, created_at FROM domain_whitelist ORDER BY created_at DESC';
      const result: QueryResult = await this.pool.query(sql);
      return result.rows.map(
        (entry: {
          id: number;
          domain: string;
          comment?: string;
          created_at: Date;
        }) => ({
          id: Number(entry.id),
          domain: String(entry.domain),
          comment: entry.comment ? String(entry.comment) : undefined,
          createdAt: entry.created_at,
        }),
      );
    } catch (error) {
      logger.error('Failed to get all domain whitelist entries:', error);
      throw error;
    }
  }

  /**
   * Edits the domain whitelist by replacing all existing entries with a new set of domains.
   * This operation is performed within a transaction.
   *
   * @param domains - An array of domain strings to set as the new whitelist.
   * @returns A promise that resolves when the whitelist is updated.
   */
  async editDomainWhitelist(domains: string[]): Promise<void> {
    if (!this.pool) {
      logger.debug('Database not initialized, skipping editDomainWhitelist');
      return;
    }

    try {
      // Start a transaction
      await this.pool.query('BEGIN');

      // Clear existing whitelist
      await this.pool.query('TRUNCATE TABLE domain_whitelist RESTART IDENTITY');

      // Insert new domains
      for (const domain of domains) {
        await this.insertDomainWhitelist({ domain });
      }

      // Commit the transaction
      await this.pool.query('COMMIT');
      logger.info('Domain whitelist updated successfully in database.');
    } catch (error) {
      // Rollback on error
      await this.pool.query('ROLLBACK');
      logger.error('Failed to edit domain whitelist in database:', error);
      throw error;
    }
  }

  /**
   * Delete a domain from the whitelist by ID
   * @param id ID of the domain whitelist entry
   * @returns Number of rows deleted
   */
  async deleteDomainWhitelist(id: number): Promise<number> {
    if (!this.pool) {
      logger.debug('Database not initialized, skipping deleteDomainWhitelist');
      return 0;
    }

    const sql = 'DELETE FROM domain_whitelist WHERE id = $1';
    const params = [id];

    try {
      const result: QueryResult = await this.pool.query(sql, params);
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to delete domain from whitelist:', error);
      throw error;
    }
  }

  /**
   * Check if a domain is in the whitelist
   * @param domain Domain to check
   * @returns True if domain is in whitelist, false otherwise
   */
  async isDomainWhitelisted(domain: string): Promise<boolean> {
    if (!this.pool) {
      logger.debug('Database not initialized, domain whitelist check skipped');
      return false; // 默认不允许任何域名直接访问
    }

    const sql =
      'SELECT COUNT(*) as count FROM domain_whitelist WHERE domain = $1';
    const params = [domain];

    try {
      const result: QueryResult = await this.pool.query(sql, params);
      return Number(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Failed to check if domain is whitelisted:', error);
      throw error;
    }
  }

  /**
   * Insert a new user into the database
   * @param user User object containing username, email, and password
   * @returns ID of inserted user record
   */
  async insertUser(user: User): Promise<number | null> {
    if (!this.pool) {
      logger.debug('Database not initialized, skipping insertUser');
      return null;
    }

    const sql = `
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `;

    const params = [user.username, user.email, user.password];

    try {
      const result: QueryResult = await this.pool.query(sql, params);
      return result.rows[0]?.id || null; // Return null if user with same username or email already exists
    } catch (error) {
      logger.error('Failed to insert user:', error);
      throw error;
    }
  }

  /**
   * Get a user by ID
   * @param id User ID
   * @returns User object if found, null otherwise
   */
  async getUserById(id: number): Promise<User | null> {
    if (!this.pool) {
      logger.debug('Database not initialized, skipping getUserById');
      return null;
    }

    const sql =
      'SELECT id, username, email, created_at FROM users WHERE id = $1';
    const params = [id];

    try {
      const result: QueryResult = await this.pool.query(sql, params);
      if (result.rowCount === 0) {
        return null;
      }
      const userRow = result.rows[0];
      return {
        id: Number(userRow.id),
        username: String(userRow.username),
        email: String(userRow.email),
        password: String(userRow.password),
        createdAt: userRow.created_at,
      };
    } catch (error) {
      logger.error('Failed to get user by ID:', error);
      throw error;
    }
  }

  /**
   * Get a user by username
   * @param username Username to search for
   * @returns User object if found, null otherwise
   */
  async getUserByUsername(username: string): Promise<User | null> {
    if (!this.pool) {
      logger.debug('Database not initialized, skipping getUserByUsername');
      return null;
    }

    const sql =
      'SELECT id, username, email, password, created_at FROM users WHERE username = $1';
    const params = [username];

    try {
      const result: QueryResult = await this.pool.query(sql, params);
      if (result.rowCount === 0) {
        return null;
      }
      const userRow = result.rows[0];
      return {
        id: Number(userRow.id),
        username: String(userRow.username),
        email: String(userRow.email),
        password: String(userRow.password),
        createdAt: userRow.created_at,
      };
    } catch (error) {
      logger.error('Failed to get user by username:', error);
      throw error;
    }
  }

  /**
   * Get a user by email
   * @param email Email to search for
   * @returns User object if found, null otherwise
   */
  async getUserByEmail(email: string): Promise<User | null> {
    if (!this.pool) {
      logger.debug('Database not initialized, skipping getUserByEmail');
      return null;
    }

    const sql =
      'SELECT id, username, email, password, created_at FROM users WHERE email = $1';
    const params = [email];

    try {
      const result: QueryResult = await this.pool.query(sql, params);
      if (result.rowCount === 0) {
        return null;
      }
      const userRow = result.rows[0];
      return {
        id: Number(userRow.id),
        username: String(userRow.username),
        email: String(userRow.email),
        password: String(userRow.password),
        createdAt: userRow.created_at,
      };
    } catch (error) {
      logger.error('Failed to get user by email:', error);
      throw error;
    }
  }

  /**
   * Update a user's information
   * @param id User ID
   * @param user Partial user object with fields to update
   * @returns Number of rows updated
   */
  async updateUser(id: number, user: Partial<User>): Promise<number> {
    if (!this.pool) {
      logger.debug('Database not initialized, skipping updateUser');
      return 0;
    }

    // Build update query dynamically based on provided fields
    let updateClause = '';
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (user.username) {
      updateClause += `username = $${paramIndex++}, `;
      params.push(user.username);
    }

    if (user.email) {
      updateClause += `email = $${paramIndex++}, `;
      params.push(user.email);
    }

    if (user.password) {
      updateClause += `password = $${paramIndex++}, `;
      params.push(user.password);
    }

    // Remove trailing comma and space if any
    updateClause = updateClause.slice(0, -2);

    if (!updateClause) {
      return 0; // No fields to update
    }

    const sql = `UPDATE users SET ${updateClause} WHERE id = $${paramIndex}`;
    params.push(id);

    try {
      const result: QueryResult = await this.pool.query(sql, params);
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * Delete a user by ID
   * @param id User ID
   * @returns Number of rows deleted
   */
  async deleteUser(id: number): Promise<number> {
    if (!this.pool) {
      logger.debug('Database not initialized, skipping deleteUser');
      return 0;
    }

    const sql = 'DELETE FROM users WHERE id = $1';
    const params = [id];

    try {
      const result: QueryResult = await this.pool.query(sql, params);
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Failed to delete user:', error);
      throw error;
    }
  }

  /**
   * Truncate access logs table (clear all records)
   * @returns Number of rows deleted (always 0 for TRUNCATE)
   */
  async truncateAccessLogs(): Promise<void> {
    if (!this.pool) {
      logger.debug('Database not initialized, skipping truncateAccessLogs');
      return;
    }

    const sql = 'TRUNCATE TABLE access_logs RESTART IDENTITY';

    try {
      await this.pool.query(sql);
      logger.info('Access logs table truncated successfully');
    } catch (error) {
      logger.error('Failed to truncate access logs table:', error);
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
