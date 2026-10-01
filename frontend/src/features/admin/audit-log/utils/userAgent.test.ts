import { describe, expect, it } from 'vitest';
import { parseUserAgent } from './userAgent';

describe('parseUserAgent', () => {
  it('classifies a desktop Chrome session as a web browser', () => {
    const parsed = parseUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    expect(parsed?.clientType).toBe('browser');
    expect(parsed?.device).toBe('desktop');
    expect(parsed?.browser).toMatch(/^Chrome/);
  });

  it('treats mobile Safari as a web browser on a mobile device', () => {
    const parsed = parseUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
    );
    expect(parsed?.clientType).toBe('browser');
    expect(parsed?.device).toBe('mobile');
    expect(parsed?.browser).toMatch(/Safari/);
  });

  it('flags a WebView session as a mobile app', () => {
    const parsed = parseUserAgent(
      'Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36',
    );
    expect(parsed?.clientType).toBe('mobileApp');
    expect(parsed?.device).toBe('mobile');
  });

  it('flags a native app user agent as a mobile app', () => {
    const parsed = parseUserAgent(
      'Instagram 312.0.0.12.100 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 481234567)',
    );
    expect(parsed?.clientType).toBe('mobileApp');
    expect(parsed?.device).toBe('mobile');
  });

  it('classifies CLI and HTTP library agents as API clients', () => {
    expect(parseUserAgent('curl/8.4.0')?.clientType).toBe('apiClient');
    expect(parseUserAgent('PostmanRuntime/7.36.0')?.clientType).toBe(
      'apiClient',
    );
    expect(parseUserAgent('python-requests/2.31.0')?.clientType).toBe(
      'apiClient',
    );
  });

  it('reports an unknown device for API clients without device signals', () => {
    const parsed = parseUserAgent('curl/8.4.0');
    expect(parsed?.device).toBe('unknown');
    expect(parsed?.browser).toBeNull();
  });

  it('never reports an OS (a User-Agent cannot tell Windows 11 from 10)', () => {
    const parsed = parseUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    expect(parsed).not.toHaveProperty('os');
  });

  it('returns null when there is no user agent to parse', () => {
    expect(parseUserAgent(null)).toBeNull();
    expect(parseUserAgent(undefined)).toBeNull();
    expect(parseUserAgent('')).toBeNull();
    expect(parseUserAgent('   ')).toBeNull();
  });

  it('falls back to unknown for an unrecognisable user agent', () => {
    const parsed = parseUserAgent('not-a-real-agent');
    expect(parsed?.clientType).toBe('unknown');
    expect(parsed?.device).toBe('unknown');
  });
});
