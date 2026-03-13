import type { ParsedAddress } from '../config/types';

export { isDomainInWhitelist, isPrivateIP } from './whitelist';

let requestCounter = 0;

export function generateRequestId(): string {
  return `${Date.now()}-${++requestCounter}`;
}

export function getTimestamp(): string {
  return new Date().toISOString();
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
}

export function parseAddress(addr: string): ParsedAddress {
  const colonIndex = addr.lastIndexOf(':');
  if (colonIndex === -1) {
    throw new Error(`Invalid address format: ${addr}`);
  }
  const host = addr.slice(0, colonIndex);
  const port = Number.parseInt(addr.slice(colonIndex + 1), 10);
  if (!host || Number.isNaN(port)) {
    throw new Error(`Invalid address format: ${addr}`);
  }
  return { host, port };
}
