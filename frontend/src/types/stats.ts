/**
 * 统计 API 相关的类型定义
 */

/**
 * 访问记录数据类型
 */
export interface AccessRecord {
  id?: number;
  timestamp: number;
  requestId: string;
  type: 'HTTP' | 'HTTPS';
  targetHost: string;
  targetPort: number;
  clientIP: string;
  userAgent?: string;
  duration: number;
  bytesUp: number;
  bytesDown: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
}

/**
 * 热门主机统计
 */
export interface TopHost {
  host: string;
  count: number;
  bytes: number;
}

/**
 * 分页信息
 */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * 统计数据响应
 */
export interface StatsData {
  totalRequests: number;
  totalBytesUp: number;
  totalBytesDown: number;
  avgDuration: number;
  topHosts: TopHost[];
  records: AccessRecord[];
  pagination: Pagination;
  activeConnections: ActiveConnections;
}

export interface ActiveConnections {
  connections: ActiveConnection[];
  total: number;
}

export interface ActiveConnection {
  requestId: string;
  record: ActiveConnectionRecord;
  startTime: number;
  bytesUp: number;
  bytesDown: number;
}

export interface ActiveConnectionRecord {
  timestamp: number;
  requestId: string;
  type: string;
  targetHost: string;
  targetPort: number;
  clientIP: string;
  status: string;
}

/**
 * 活跃连接响应数据
 */
export interface ActiveConnectionsData {
  activeConnections: ActiveConnections;
}

/**
 * API 统一响应格式
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 统计查询参数
 */
export interface StatsQueryParams {
  startTime?: number;
  endTime?: number;
  host?: string;
  type?: 'HTTP' | 'HTTPS';
  limit?: number;
  page?: number;
  pageSize?: number;
}
