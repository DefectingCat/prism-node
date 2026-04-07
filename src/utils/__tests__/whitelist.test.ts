import { describe, it, expect, beforeEach } from 'vitest';
import {
  isPrivateIP,
  isDomainInWhitelist,
  isIPAddress,
  initializeWhitelist,
  excludeFromWhitelist,
  resetWhitelist,
} from '../whitelist';

// Note: These tests must run sequentially because they modify module-level state
describe('whitelist', () => {
  describe('isPrivateIP', () => {
    it('should identify 10.x.x.x as private IP', () => {
      expect(isPrivateIP('10.0.0.1')).toBe(true);
      expect(isPrivateIP('10.255.255.255')).toBe(true);
      expect(isPrivateIP('10.1.2.3')).toBe(true);
    });

    it('should identify 172.16-31.x.x as private IP', () => {
      expect(isPrivateIP('172.16.0.1')).toBe(true);
      expect(isPrivateIP('172.31.255.255')).toBe(true);
      expect(isPrivateIP('172.17.8.9')).toBe(true);
    });

    it('should identify 192.168.x.x as private IP', () => {
      expect(isPrivateIP('192.168.0.1')).toBe(true);
      expect(isPrivateIP('192.168.255.255')).toBe(true);
      expect(isPrivateIP('192.168.1.100')).toBe(true);
    });

    it('should identify 127.x.x.x as loopback', () => {
      expect(isPrivateIP('127.0.0.1')).toBe(true);
      expect(isPrivateIP('127.255.255.255')).toBe(true);
      expect(isPrivateIP('127.0.0.0')).toBe(true);
    });

    it('should identify IPv6 private addresses', () => {
      expect(isPrivateIP('::1')).toBe(true);
      expect(isPrivateIP('fd00::1')).toBe(true);
      expect(isPrivateIP('fe80::1')).toBe(true);
    });

    it('should identify public IPs as non-private', () => {
      expect(isPrivateIP('8.8.8.8')).toBe(false);
      expect(isPrivateIP('1.1.1.1')).toBe(false);
      expect(isPrivateIP('114.114.114.114')).toBe(false);
      expect(isPrivateIP('208.67.222.222')).toBe(false);
    });
  });

  describe('isIPAddress', () => {
    it('should identify IPv4 addresses', () => {
      expect(isIPAddress('192.168.1.1')).toBe(true);
      expect(isIPAddress('10.0.0.1')).toBe(true);
      expect(isIPAddress('127.0.0.1')).toBe(true);
    });

    it('should identify IPv6 addresses', () => {
      expect(isIPAddress('::1')).toBe(true);
      expect(isIPAddress('2001:db8::1')).toBe(true);
      expect(isIPAddress('fe80::1')).toBe(true);
    });

    it('should identify domain names as non-IP', () => {
      expect(isIPAddress('example.com')).toBe(false);
      expect(isIPAddress('www.google.com')).toBe(false);
      expect(isIPAddress('localhost')).toBe(false);
    });
  });

  describe('initializeWhitelist', () => {
    beforeEach(() => {
      initializeWhitelist(undefined);
    });

    it('should initialize exact domains', () => {
      initializeWhitelist(['example.com', 'test.org']);
      expect(isDomainInWhitelist('example.com')).toBe(true);
      expect(isDomainInWhitelist('test.org')).toBe(true);
      expect(isDomainInWhitelist('other.com')).toBe(false);
    });

    it('should initialize wildcard domains', () => {
      initializeWhitelist(['*.google.com', '*.github.io']);
      expect(isDomainInWhitelist('www.google.com')).toBe(true);
      expect(isDomainInWhitelist('mail.google.com')).toBe(true);
      expect(isDomainInWhitelist('google.com')).toBe(true);
      expect(isDomainInWhitelist('user.github.io')).toBe(true);
      expect(isDomainInWhitelist('notgoogle.com')).toBe(false);
    });

    it('should handle empty array', () => {
      initializeWhitelist([]);
      expect(isDomainInWhitelist('example.com')).toBe(false);
    });

    it('should handle undefined', () => {
      initializeWhitelist(undefined);
      expect(isDomainInWhitelist('example.com')).toBe(false);
    });

    it('should normalize domains to lowercase', () => {
      initializeWhitelist(['Example.COM', 'TEST.ORG']);
      expect(isDomainInWhitelist('example.com')).toBe(true);
      expect(isDomainInWhitelist('test.org')).toBe(true);
    });

    it('should initialize TLD wildcards', () => {
      initializeWhitelist(['*.com', '*.org']);
      expect(isDomainInWhitelist('example.com')).toBe(true);
      expect(isDomainInWhitelist('test.org')).toBe(true);
      expect(isDomainInWhitelist('example.net')).toBe(false);
    });

    it('should filter out non-string entries', () => {
      initializeWhitelist(['example.com', 123 as any, null as any, undefined as any, true as any]);
      expect(isDomainInWhitelist('example.com')).toBe(true);
      expect(isDomainInWhitelist('123')).toBe(false);
    });

    it('should filter out empty string entries', () => {
      initializeWhitelist(['example.com', '', '   ', 'test.org']);
      expect(isDomainInWhitelist('example.com')).toBe(true);
      expect(isDomainInWhitelist('test.org')).toBe(true);
    });

    it('should handle whitespace-only domains', () => {
      initializeWhitelist(['example.com', '   ']);
      expect(isDomainInWhitelist('example.com')).toBe(true);
    });
  });

  describe('isDomainInWhitelist', () => {
    beforeEach(() => {
      initializeWhitelist(['example.com', '*.google.com', 'localhost', '192.168.1.1']);
    });

    it('should match exact domains', () => {
      expect(isDomainInWhitelist('example.com')).toBe(true);
      expect(isDomainInWhitelist('EXAMPLE.COM')).toBe(true);
    });

    it('should match wildcard subdomains', () => {
      expect(isDomainInWhitelist('www.google.com')).toBe(true);
      expect(isDomainInWhitelist('mail.google.com')).toBe(true);
      expect(isDomainInWhitelist('api.mail.google.com')).toBe(true);
    });

    it('should match private IPs', () => {
      expect(isDomainInWhitelist('192.168.1.1')).toBe(true);
      expect(isDomainInWhitelist('10.0.0.1')).toBe(true);
      expect(isDomainInWhitelist('127.0.0.1')).toBe(true);
    });

    it('should not match non-whitelisted domains', () => {
      initializeWhitelist(['example.com', '*.google.com', 'localhost', '192.168.1.1']);
      expect(isDomainInWhitelist('notexample.com')).toBe(false);
      expect(isDomainInWhitelist('facebook.com')).toBe(false);
    });

    it('should handle whitespace in domain', () => {
      expect(isDomainInWhitelist('  example.com  ')).toBe(true);
    });
  });

  describe('excludeFromWhitelist', () => {
    beforeEach(() => {
      initializeWhitelist(['example.com', '*.google.com', 'test.org']);
    });

    it('should exclude exact domain from whitelist', () => {
      excludeFromWhitelist('example.com');
      expect(isDomainInWhitelist('example.com')).toBe(false);
      expect(isDomainInWhitelist('test.org')).toBe(true);
    });

    it('should exclude wildcard matched domain from whitelist', () => {
      excludeFromWhitelist('google.com');
      expect(isDomainInWhitelist('www.google.com')).toBe(false);
      expect(isDomainInWhitelist('google.com')).toBe(false);
    });
  });

  describe('resetWhitelist', () => {
    it('should reset whitelist to initial state', () => {
      initializeWhitelist(['example.com', '*.google.com']);
      excludeFromWhitelist('example.com');
      resetWhitelist();
      expect(isDomainInWhitelist('example.com')).toBe(true);
      expect(isDomainInWhitelist('www.google.com')).toBe(true);
    });

    it('should reset TLD wildcards correctly', () => {
      initializeWhitelist(['*.com', '*.org']);
      excludeFromWhitelist('com');
      expect(isDomainInWhitelist('example.com')).toBe(false);
      resetWhitelist();
      expect(isDomainInWhitelist('example.com')).toBe(true);
      expect(isDomainInWhitelist('test.org')).toBe(true);
    });

    it('should preserve TLD wildcards after reset', () => {
      initializeWhitelist(['*.com', '*.google.com']);
      excludeFromWhitelist('example.com');
      resetWhitelist();
      // TLD wildcard *.com should still work
      expect(isDomainInWhitelist('any.com')).toBe(true);
      // Regular wildcard *.google.com should still work
      expect(isDomainInWhitelist('mail.google.com')).toBe(true);
    });
  });
});