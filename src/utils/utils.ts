import type { ParsedAddress } from '../config/types';

/**
 * 检查 IP 地址是否属于内网地址范围
 * @param ip - IP 地址字符串
 * @returns 是否为内网地址
 */
export function isPrivateIP(ip: string): boolean {
  // IPv4 内网地址范围
  const ipv4PrivateRanges = [
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12
    /^192\.168\.\d{1,3}\.\d{1,3}$/, // 192.168.0.0/16
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 127.0.0.0/8 (localhost)
  ];

  // IPv6 内网地址范围（简化版）
  const ipv6PrivateRanges = [
    /^fd[0-9a-f]{2}:.*/i, // 唯一本地地址 (ULA) fd00::/8
    /^fe80:.*/i, // 链路本地地址 fe80::/10
    /^::1$/, // 环回地址
  ];

  // 检查 IPv4 内网地址
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
    return ipv4PrivateRanges.some((range) => range.test(ip));
  }

  // 检查 IPv6 内网地址
  if (ip.includes(':')) {
    return ipv6PrivateRanges.some((range) => range.test(ip));
  }

  return false;
}

/**
 * 检查目标域名是否匹配域名白名单
 * @param targetHost - 目标域名
 * @param whitelist - 域名白名单数组
 * @returns 是否匹配
 */
export function isDomainInWhitelist(
  targetHost: string,
  whitelist: string[],
): boolean {
  // 自动跳过内网地址（无需配置，直接视为白名单）
  if (isPrivateIP(targetHost)) {
    return true;
  }

  return whitelist.some((whitelistedDomain) => {
    // 去除首尾空格
    const normalizedWhitelisted = whitelistedDomain.trim().toLowerCase();
    const normalizedTarget = targetHost.trim().toLowerCase();

    // 精确匹配
    if (normalizedWhitelisted === normalizedTarget) {
      return true;
    }

    // 通配符匹配（如 *.example.com 匹配 sub.example.com）
    if (normalizedWhitelisted.startsWith('*.')) {
      const domainSuffix = normalizedWhitelisted.slice(2);
      return (
        normalizedTarget === domainSuffix ||
        normalizedTarget.endsWith(`.${domainSuffix}`)
      );
    }

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
