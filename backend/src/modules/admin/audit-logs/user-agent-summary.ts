import { UAParser } from 'ua-parser-js';

/**
 * One-line summary of a stored User-Agent for the CSV `User Agent` column,
 * e.g. `Web Browser | Chrome 120 | Desktop` - three parts: client type,
 * browser, device.
 *
 * The raw agent string is unreadable in a spreadsheet, and reviewers use this
 * column to see which browser/device the event came from and whether the
 * caller was a web browser, a mobile app, or an API client - so the column
 * carries the parsed facts instead of the raw string. The classification
 * mirrors the frontend detail modal (`utils/userAgent.ts`).
 *
 * The OS is deliberately not reported: Windows 11 still identifies itself as
 * `Windows NT 10.0` in the User-Agent, so any OS label would be a guess.
 *
 * Returns '' for rows written before the UA hook existed (NULL user_agent),
 * keeping that column empty as documented in this module's README.
 */

/**
 * In-app client markers (social/native app UAs, Android WebView apps).
 * Checked before the API patterns so e.g. an app embedding okhttp still
 * counts as a mobile app rather than an API client.
 */
const MOBILE_APP_PATTERN =
  /\b(fbav|fban|fb_iab|instagram|twitter|line\/|micromessenger|musical_ly|tiktok|pinterest|snapchat|whatsapp|telegram|discord|slack|spotify|naver|kakaotalk|weibo|gsa\/|\bwv\))/i;

/** Non-browser clients: CLIs, HTTP libraries, test tools, service-to-service. */
const API_CLIENT_PATTERN =
  /\b(curl|wget|postman(runtime)?|insomnia|httpie|scrapy|guzzle|libwww|python-requests|python-urllib|aiohttp|axios|node-fetch|go-http-client|java\/|ktor|okhttp|restsharp|powershell|winhttp|gatling|jmeter|unirest|apache-httpclient|bot|crawler|spider)\b/i;

const UNKNOWN = 'Unknown';

type ClientTypeLabel =
  'Web Browser' | 'Mobile App' | 'API Client' | typeof UNKNOWN;
type DeviceLabel = 'Desktop' | 'Mobile' | 'Tablet' | 'Other' | typeof UNKNOWN;
function formatPart(
  name: string | null | undefined,
  version?: string | null,
): string {
  if (!name) return UNKNOWN;
  return version ? `${name} ${version}` : name;
}

function deviceLabel(
  type: string | undefined,
  hasContext: boolean,
): DeviceLabel {
  if (type === 'mobile') return 'Mobile';
  if (type === 'tablet') return 'Tablet';
  if (type) return 'Other';
  return hasContext ? 'Desktop' : UNKNOWN;
}

export function summarizeUserAgent(raw?: string | null): string {
  if (!raw || !raw.trim()) return '';

  const result = new UAParser(raw.trim()).getResult();
  const browserName = result.browser.name ?? null;
  const osName = result.os.name ?? null;

  let clientType: ClientTypeLabel;
  if (MOBILE_APP_PATTERN.test(raw)) {
    clientType = 'Mobile App';
  } else if (API_CLIENT_PATTERN.test(raw)) {
    clientType = 'API Client';
  } else if (browserName) {
    clientType = 'Web Browser';
  } else if (
    result.device.type === 'mobile' ||
    result.device.type === 'tablet'
  ) {
    clientType = 'Mobile App';
  } else if (osName) {
    clientType = 'API Client';
  } else {
    clientType = UNKNOWN;
  }

  return [
    clientType,
    formatPart(browserName, result.browser.major ?? result.browser.version),
    deviceLabel(result.device.type, osName !== null || browserName !== null),
  ].join(' | ');
}
