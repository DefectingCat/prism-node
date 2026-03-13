const IPV4_PRIVATE_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
];

const IPV6_PRIVATE_PATTERNS = [/^fd[0-9a-f]{2}:.*/i, /^fe80:.*/i, /^::1$/];

const IPV4_PATTERN = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const IPV6_PATTERN = /:/;

export function isPrivateIP(ip: string): boolean {
  if (IPV4_PATTERN.test(ip)) {
    return IPV4_PRIVATE_PATTERNS.some((pattern) => pattern.test(ip));
  }
  if (IPV6_PATTERN.test(ip)) {
    return IPV6_PRIVATE_PATTERNS.some((pattern) => pattern.test(ip));
  }
  return false;
}

let whitelistSet: Set<string> = new Set();
let wildcardSuffixes: string[] = [];
let originalWhitelist: Set<string> = new Set();
let originalWildcards: string[] = [];

export function initializeWhitelist(whitelist: string[] | undefined): void {
  whitelistSet = new Set();
  wildcardSuffixes = [];
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
      wildcardSuffixes.push(normalized.slice(2));
      originalWildcards.push(normalized.slice(2));
    } else {
      whitelistSet.add(normalized);
      originalWhitelist.add(normalized);
    }
  }
}

export function excludeFromWhitelist(host: string): void {
  const normalized = host.trim().toLowerCase();
  whitelistSet.delete(normalized);
  wildcardSuffixes = wildcardSuffixes.filter(
    (s) => s !== normalized && !normalized.endsWith(`.${s}`),
  );
}

export function resetWhitelist(): void {
  whitelistSet = new Set(originalWhitelist);
  wildcardSuffixes = [...originalWildcards];
}

export function isDomainInWhitelist(targetHost: string): boolean {
  const normalized = targetHost.trim().toLowerCase();

  if (isPrivateIP(normalized)) {
    return true;
  }

  if (whitelistSet.has(normalized)) {
    return true;
  }

  return wildcardSuffixes.some(
    (suffix) => normalized === suffix || normalized.endsWith(`.${suffix}`),
  );
}

export function isIPAddress(host: string): boolean {
  return IPV4_PATTERN.test(host) || IPV6_PATTERN.test(host);
}
