/**
 * IPv4 私有地址匹配模式
 * - 10.0.0.0/8 (10.x.x.x)
 * - 172.16.0.0/12 (172.16-31.x.x)
 * - 192.168.0.0/16 (192.168.x.x)
 * - 127.0.0.0/8 (本地回环)
 */
const IPV4_PRIVATE_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
];

/**
 * IPv6 私有地址匹配模式
 * - fd00::/8 (唯一本地地址)
 * - fe80::/10 (链路本地地址)
 * - ::1 (回环地址)
 */
const IPV6_PRIVATE_PATTERNS = [/^fd[0-9a-f]{2}:.*/i, /^fe80:.*/i, /^::1$/];

/**
 * IPv4 地址正则表达式
 */
const IPV4_PATTERN = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

/**
 * IPv6 地址正则表达式（简单检测）
 */
const IPV6_PATTERN = /:/;

/**
 * 检查 IP 地址是否为私有地址
 * @param ip - 要检查的 IP 地址
 * @returns 如果是私有地址则返回 true，否则返回 false
 */
export function isPrivateIP(ip: string): boolean {
  if (IPV4_PATTERN.test(ip)) {
    return IPV4_PRIVATE_PATTERNS.some((pattern) => pattern.test(ip));
  }
  if (IPV6_PATTERN.test(ip)) {
    return IPV6_PRIVATE_PATTERNS.some((pattern) => pattern.test(ip));
  }
  return false;
}

/**
 * 精确域名白名单集合
 */
let whitelistSet: Set<string> = new Set();

/**
 * 通配符域名后缀列表（例如："google.com" 匹配 "*.google.com"）
 */
let wildcardSuffixes: string[] = [];

/**
 * 顶级域名通配符映射（例如："com" 匹配所有 "*.com" 域名）
 */
let tldWildcards: Map<string, boolean> = new Map();

/**
 * 原始白名单副本（用于重置）
 */
let originalWhitelist: Set<string> = new Set();

/**
 * 原始通配符列表（用于重置）
 */
let originalWildcards: string[] = [];

/**
 * 初始化域名白名单
 * @param whitelist - 域名列表，支持精确域名和通配符（例如："example.com", "*.google.com"）
 */
export function initializeWhitelist(whitelist: string[] | undefined): void {
  whitelistSet = new Set();
  wildcardSuffixes = [];
  tldWildcards = new Map();
  originalWhitelist = new Set();
  originalWildcards = [];

  if (!whitelist || !Array.isArray(whitelist)) {
    return;
  }

  for (const domain of whitelist) {
    if (typeof domain !== 'string' || !domain.trim()) {
      continue;
    }
    const normalized = domain.trim().toLowerCase();
    if (normalized.startsWith('*.')) {
      const suffix = normalized.slice(2);
      wildcardSuffixes.push(suffix);
      originalWildcards.push(suffix);
      if (!suffix.includes('.')) {
        tldWildcards.set(suffix, true);
      }
    } else {
      whitelistSet.add(normalized);
      originalWhitelist.add(normalized);
    }
  }
}

/**
 * 从白名单中排除指定域名（用于故障转移场景）
 * @param host - 要排除的域名
 */
export function excludeFromWhitelist(host: string): void {
  const normalized = host.trim().toLowerCase();
  whitelistSet.delete(normalized);
  wildcardSuffixes = wildcardSuffixes.filter(
    (s) => s !== normalized && !normalized.endsWith(`.${s}`),
  );
  tldWildcards.delete(normalized);
}

/**
 * 重置白名单为初始状态（清除所有临时排除的域名）
 */
export function resetWhitelist(): void {
  whitelistSet = new Set(originalWhitelist);
  wildcardSuffixes = [...originalWildcards];
  tldWildcards = new Map();
  for (const suffix of originalWildcards) {
    if (!suffix.includes('.')) {
      tldWildcards.set(suffix, true);
    }
  }
}

/**
 * 检查域名是否在白名单中
 * @param targetHost - 要检查的目标域名
 * @returns 如果域名在白名单中（包括私有 IP）则返回 true
 *
 * 白名单匹配规则：
 * 1. 私有 IP 地址始终直连
 * 2. 精确域名匹配
 * 3. TLD 通配符匹配（例如："com" 匹配所有 "*.com" 域名）
 * 4. 子域名通配符匹配（例如："google.com" 匹配 "*.google.com"）
 */
export function isDomainInWhitelist(targetHost: string): boolean {
  const normalized = targetHost.trim().toLowerCase();

  if (isPrivateIP(normalized)) {
    return true;
  }

  if (whitelistSet.has(normalized)) {
    return true;
  }

  const parts = normalized.split('.');
  if (parts.length >= 2 && tldWildcards.has(parts[parts.length - 1])) {
    return true;
  }

  return wildcardSuffixes.some(
    (suffix) => normalized === suffix || normalized.endsWith(`.${suffix}`),
  );
}

/**
 * 检查主机名是否为 IP 地址
 * @param host - 要检查的主机名
 * @returns 如果是 IP 地址则返回 true，否则返回 false
 */
export function isIPAddress(host: string): boolean {
  return IPV4_PATTERN.test(host) || IPV6_PATTERN.test(host);
}
