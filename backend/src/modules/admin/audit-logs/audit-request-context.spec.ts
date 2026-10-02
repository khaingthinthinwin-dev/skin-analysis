import { describe, expect, it } from '@jest/globals';
import {
  AUDIT_IP_MAX_LENGTH,
  AUDIT_USER_AGENT_MAX_LENGTH,
  formatIpAddress,
  getAuditRequestContext,
  normalizeIpAddress,
  normalizeUserAgent,
  runWithAuditRequestContext,
} from './audit-request-context';

describe('audit-request-context', () => {
  describe('normalizeIpAddress', () => {
    it('should strip the IPv4-mapped prefix', () => {
      expect(normalizeIpAddress('::ffff:127.0.0.1')).toBe('127.0.0.1');
    });

    it('should take the first entry of X-Forwarded-For', () => {
      expect(normalizeIpAddress('203.0.113.1, 70.41.3.18')).toBe('203.0.113.1');
    });

    it('should keep a plain IP and ignore empty values', () => {
      expect(normalizeIpAddress('203.0.113.7')).toBe('203.0.113.7');
      expect(normalizeIpAddress('   ')).toBeUndefined();
      expect(normalizeIpAddress(undefined)).toBeUndefined();
      expect(normalizeIpAddress(null)).toBeUndefined();
    });

    it('should store the IPv6 loopback as its IPv4 spelling', () => {
      expect(normalizeIpAddress('::1')).toBe('127.0.0.1');
    });

    it('should cap the stored value to the audit_logs column contract', () => {
      expect(normalizeIpAddress('1'.repeat(60))).toHaveLength(
        AUDIT_IP_MAX_LENGTH,
      );
    });
  });

  describe('formatIpAddress', () => {
    it('should render loopback in its IPv4 spelling', () => {
      expect(formatIpAddress('::1')).toBe('127.0.0.1');
      expect(formatIpAddress('::ffff:127.0.0.1')).toBe('127.0.0.1');
    });

    it('should leave a real client address untouched', () => {
      expect(formatIpAddress('203.0.113.7')).toBe('203.0.113.7');
      expect(formatIpAddress('2001:db8::8a2e:370:7334')).toBe(
        '2001:db8::8a2e:370:7334',
      );
    });

    it('should return null when there is nothing to show', () => {
      expect(formatIpAddress(null)).toBeNull();
      expect(formatIpAddress(undefined)).toBeNull();
      expect(formatIpAddress('   ')).toBeNull();
      expect(formatIpAddress('::ffff:')).toBeNull();
    });
  });

  describe('normalizeUserAgent', () => {
    const browserUserAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    it('should keep a browser user agent string unchanged', () => {
      expect(normalizeUserAgent(browserUserAgent)).toBe(browserUserAgent);
    });

    it('should replace control characters so CSV output stays intact', () => {
      expect(normalizeUserAgent('Mozilla/5.0\r\nInjected: x')).toBe(
        'Mozilla/5.0 Injected: x',
      );
    });

    it('should cap the stored length', () => {
      expect(normalizeUserAgent('a'.repeat(1000))).toHaveLength(
        AUDIT_USER_AGENT_MAX_LENGTH,
      );
    });

    it('should ignore empty values', () => {
      expect(normalizeUserAgent('   ')).toBeUndefined();
      expect(normalizeUserAgent(undefined)).toBeUndefined();
      expect(normalizeUserAgent(null)).toBeUndefined();
    });
  });

  describe('runWithAuditRequestContext', () => {
    it('should expose the context to nested async work and clear it afterwards', async () => {
      const observed = await runWithAuditRequestContext(
        { userAgent: 'Mozilla/5.0' },
        async () => {
          await Promise.resolve();
          return getAuditRequestContext();
        },
      );

      expect(observed).toEqual({ userAgent: 'Mozilla/5.0' });
      expect(getAuditRequestContext()).toBeUndefined();
    });
  });
});
