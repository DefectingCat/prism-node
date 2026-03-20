import type { ParsedAddress } from '../config/types';

export { isDomainInWhitelist, isPrivateIP } from './whitelist';

/**
 * 请求计数器，用于生成唯一请求 ID
 */
let requestCounter = 0;

/**
 * 生成唯一的请求 ID，用于日志追踪
 * @returns 格式为 "时间戳-递增计数器" 的请求 ID
 */
export function generateRequestId(): string {
  return `${Date.now()}-${++requestCounter}`;
}

/**
 * 获取当前时间戳的 ISO 格式字符串
 * @returns ISO 格式的时间戳
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 格式化字节数为人类可读字符串
 * @param bytes - 字节数
 * @returns 格式化后的字符串（例如："1.50 MB"）
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
}

/**
 * 解析地址字符串为主机和端口
 * @param addr - 地址字符串，格式为 "host:port"
 * @returns 包含 host 和 port 的解析结果
 * @throws 如果地址格式无效则抛出错误
 */
export function parseAddress(addr: string): ParsedAddress {
  const colonIndex = addr.lastIndexOf(':');
  if (colonIndex === -1) {
    throw new Error(`无效的地址格式: ${addr}`);
  }
  const host = addr.slice(0, colonIndex);
  const port = Number.parseInt(addr.slice(colonIndex + 1), 10);
  if (!host || Number.isNaN(port)) {
    throw new Error(`无效的地址格式: ${addr}`);
  }
  return { host, port };
}
