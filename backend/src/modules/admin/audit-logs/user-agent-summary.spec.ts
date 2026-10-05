import { summarizeUserAgent } from './user-agent-summary';

const CHROME_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

describe('summarizeUserAgent', () => {
  it('summarises a desktop browser session into one line', () => {
    expect(summarizeUserAgent(CHROME_DESKTOP)).toBe(
      'Web Browser | Chrome 120 | Desktop',
    );
  });

  it('treats mobile Safari as a web browser on a mobile device', () => {
    expect(
      summarizeUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('Web Browser | Mobile Safari 17 | Mobile');
  });

  it('labels in-app traffic as a mobile app', () => {
    expect(
      summarizeUserAgent(
        'Instagram 312.0.0.12.100 Android (33/13; 420dpi; 1080x2400; samsung; SM-G991B; o1s; exynos2100; en_US; 481234567)',
      ),
    ).toBe('Mobile App | Instagram 312 | Mobile');
    expect(
      summarizeUserAgent(
        'Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe('Mobile App | Chrome WebView 120 | Mobile');
  });

  it('labels CLI and HTTP library agents as API clients', () => {
    expect(summarizeUserAgent('curl/8.4.0')).toBe(
      'API Client | Unknown | Unknown',
    );
    expect(summarizeUserAgent('PostmanRuntime/7.36.0')).toBe(
      'API Client | Unknown | Unknown',
    );
    expect(summarizeUserAgent('python-requests/2.31.0')).toBe(
      'API Client | Unknown | Unknown',
    );
  });

  it('marks an unrecognisable agent as unknown', () => {
    expect(summarizeUserAgent('Mozilla/5.0')).toBe(
      'Unknown | Unknown | Unknown',
    );
  });

  it('keeps the column empty when the row has no user agent', () => {
    expect(summarizeUserAgent(null)).toBe('');
    expect(summarizeUserAgent(undefined)).toBe('');
    expect(summarizeUserAgent('')).toBe('');
    expect(summarizeUserAgent('   ')).toBe('');
  });
});
