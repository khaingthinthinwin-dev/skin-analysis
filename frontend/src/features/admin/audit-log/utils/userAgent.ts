import { UAParser } from 'ua-parser-js';

export type UaClientType = 'browser' | 'mobileApp' | 'apiClient' | 'unknown';
export type UaDeviceType =
  | 'desktop'
  | 'mobile'
  | 'tablet'
  | 'other'
  | 'unknown';

export interface ParsedUserAgent {
  browser: string | null;
  device: UaDeviceType;
  clientType: UaClientType;
}

/**
 * In-app client markers (social/native app UAs, Android WebView apps).
 * Checked before API patterns so e.g. an app embedding okhttp still counts
 * as a mobile app rather than an API client.
 */
const MOBILE_APP_PATTERN =
  /\b(fbav|fban|fb_iab|instagram|twitter|line\/|micromessenger|musical_ly|tiktok|pinterest|snapchat|whatsapp|telegram|discord|slack|spotify|naver|kakaotalk|weibo|gsa\/|\bwv\))/i;

/** Non-browser clients: CLIs, HTTP libraries, test tools, service-to-service. */
const API_CLIENT_PATTERN =
  /\b(curl|wget|postman(runtime)?|insomnia|httpie|scrapy|guzzle|libwww|python-requests|python-urllib|aiohttp|axios|node-fetch|go-http-client|java\/|ktor|okhttp|restsharp|powershell|winhttp|gatling|jmeter|unirest|apache-httpclient|bot|crawler|spider)\b/i;

function formatPart(
  name: string | null | undefined,
  version?: string | null,
) {
  if (!name) return null;
  return version ? `${name} ${version}` : name;
}

function normalizeDeviceType(
  type: string | undefined,
  hasContext: boolean,
): UaDeviceType {
  if (type === 'mobile') return 'mobile';
  if (type === 'tablet') return 'tablet';
  if (type) return 'other';
  return hasContext ? 'desktop' : 'unknown';
}

/**
 * Turns a raw User Agent string into human-readable client facts:
 * which browser, which device, and whether the caller was a web browser,
 * a mobile app, or an API client.
 *
 * The OS is intentionally not reported: Windows 11 still identifies itself
 * as `Windows NT 10.0` in the User-Agent, so an OS label would be a guess.
 * Returns null when there is nothing to parse.
 */
export function parseUserAgent(
  userAgent: string | null | undefined,
): ParsedUserAgent | null {
  if (!userAgent || !userAgent.trim()) return null;

  const result = new UAParser(userAgent.trim()).getResult();
  const browserName = result.browser.name ?? null;
  const hasOs = result.os.name != null;

  const device = normalizeDeviceType(
    result.device.type,
    hasOs || browserName !== null,
  );

  let clientType: UaClientType;
  if (MOBILE_APP_PATTERN.test(userAgent)) {
    clientType = 'mobileApp';
  } else if (API_CLIENT_PATTERN.test(userAgent)) {
    clientType = 'apiClient';
  } else if (browserName) {
    clientType = 'browser';
  } else if (
    result.device.type === 'mobile' ||
    result.device.type === 'tablet'
  ) {
    clientType = 'mobileApp';
  } else if (hasOs) {
    clientType = 'apiClient';
  } else {
    clientType = 'unknown';
  }

  return {
    browser: formatPart(
      browserName,
      result.browser.major ?? result.browser.version,
    ),
    device,
    clientType,
  };
}
