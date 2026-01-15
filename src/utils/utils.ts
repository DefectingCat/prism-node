import type { ParsedAddress } from '../config/types';

/**
 * 检查目标域名是否匹配域名黑名单
 * @param targetHost - 目标域名
 * @param blacklist - 域名黑名单数组
 * @returns 是否匹配
 */
export function isDomainInBlacklist(
  targetHost: string,
  blacklist: string[],
): boolean {
  return blacklist.some((blacklistedDomain) => {
    // 去除首尾空格
    const normalizedBlacklisted = blacklistedDomain.trim().toLowerCase();
    const normalizedTarget = targetHost.trim().toLowerCase();

    // 精确匹配
    if (normalizedBlacklisted === normalizedTarget) {
      return true;
    }

    // 通配符匹配（如 *.example.com 匹配 sub.example.com）
    if (normalizedBlacklisted.startsWith('*.')) {
      const domainSuffix = normalizedBlacklisted.slice(2);
      return (
        normalizedTarget === domainSuffix ||
        normalizedTarget.endsWith(`.${domainSuffix}`)
      );
    }

    // 字符串包含匹配（如 rua 匹配 rua.plus）
    // if (normalizedTarget.includes(normalizedBlacklisted)) {
    //   return true;
    // }

    return false;
  });
}

// Global request counter for generating unique request IDs
let requestCounter = 0;

/**
 * Generates a unique request ID for tracking
 */
export function generateRequestId(): string {
  return `${Date.now()}-${++requestCounter}`;
}

/**
 * Formats current timestamp for logging
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Formats bytes to human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
}

/**
 * Parses an address string into host and port components
 * @param addr - Address string in format "host:port"
 * @returns Parsed host and port
 * @throws Error if address format is invalid
 */
export function parseAddress(addr: string): ParsedAddress {
  const [host, portStr] = addr.split(':');
  const port = Number.parseInt(portStr, 10);
  if (!host || Number.isNaN(port)) {
    throw new Error(`Invalid address format: ${addr}`);
  }
  return { host, port };
}
