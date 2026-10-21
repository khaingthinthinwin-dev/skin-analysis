import type { Browser } from '@playwright/test';
import { captureScreenshot } from './screenshot';

/**
 * Evidence card for the Interface Scenarios (I) — API Contracts & Payloads
 * section of the SignUp_LogIn PCL.
 *
 * API contract tests have no UI, so each I-xx test renders its request /
 * response exchange as a readable evidence card and screenshots that card.
 * The capture name must follow the repo convention <ID>_<n>_<description>
 * (validated by scripts/check-capture-names.cjs).
 */
export type ApiExchange = {
  label?: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  payload?: unknown;
  status?: number | number[];
  body?: unknown;
};

function esc(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Redact secrets (tokens, passwords, bearer headers) before rendering. */
export function redact(value: unknown): string {
  const text =
    typeof value === 'string' ? value : JSON.stringify(value, null, 2) ?? String(value);
  return text
    .replace(
      /("(?:accessToken|refreshToken|token|password|code)"\s*:\s*)"[^"]*"/gi,
      '$1"•••redacted•••"'
    )
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/g, '$1•••redacted•••');
}

function exchangeHtml(exchange: ApiExchange): string {
  const headers = exchange.headers
    ? Object.entries(exchange.headers)
        .map(([k, v]) => `<div class="kv"><span class="k">${esc(k)}:</span> ${esc(redact(v))}</div>`)
        .join('')
    : '';
  const payload = exchange.payload !== undefined ? redact(exchange.payload) : null;
  const body = exchange.body !== undefined ? redact(exchange.body) : null;
  const status = exchange.status;
  const statusHtml =
    status === undefined
      ? ''
      : Array.isArray(status)
        ? `<span class="chip">expected ${status.join(' / ')}</span>`
        : `<span class="chip ${status < 400 ? 'ok' : 'err'}">HTTP ${status}</span>`;

  return `
    <div class="exchange">
      <div class="ex-head">
        <span class="method">${esc(exchange.method)}</span>
        <span class="url">${esc(exchange.url)}</span>
        ${statusHtml}
      </div>
      ${headers ? `<div class="block"><div class="label">Headers</div>${headers}</div>` : ''}
      ${payload ? `<div class="block"><div class="label">Request payload</div><pre>${esc(payload)}</pre></div>` : ''}
      ${body ? `<div class="block"><div class="label">Response body</div><pre>${esc(body)}</pre></div>` : ''}
    </div>`;
}

export async function captureApiEvidence(
  browser: Browser,
  stepName: string,
  description: string,
  scenario: string,
  exchanges: ApiExchange[],
  assertions: string[]
): Promise<string> {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    * { box-sizing:border-box; }
    body { margin:0; padding:24px 28px; width:1080px; background:#ffffff; color:#1f2328;
           font-family:-apple-system,"Segoe UI",Helvetica,Arial,sans-serif; font-size:13px; line-height:1.55; }
    .doc { color:#59636e; font-size:11.5px; text-transform:uppercase; letter-spacing:.05em; }
    h1 { font-size:18px; margin:6px 0 2px; }
    .sub { color:#59636e; margin-bottom:14px; }
    .exchange { border:1px solid #d1d9e0; border-radius:8px; overflow:hidden; margin-bottom:14px; }
    .ex-head { display:flex; align-items:center; gap:10px; padding:8px 12px; background:#f6f8fa;
               border-bottom:1px solid #d1d9e0; }
    .method { font-weight:700; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; color:#0a3069; }
    .url { font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:12.5px; }
    .chip { margin-left:auto; padding:2px 10px; border-radius:999px; font-size:12px; font-weight:600; }
    .chip.ok { background:#dafbe1; color:#116329; }
    .chip.err { background:#ffe9e8; color:#d1242f; }
    .block { padding:8px 12px; border-top:1px dashed #d8dee4; }
    .block:first-of-type { border-top:none; }
    .label { color:#59636e; font-size:11.5px; text-transform:uppercase; letter-spacing:.04em; margin-bottom:4px; }
    .kv { font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:12.5px; }
    .k { color:#59636e; }
    pre { margin:0; white-space:pre-wrap; word-break:break-word;
          font-family:ui-monospace,SFMono-Regular,Consolas,monospace; font-size:12.5px; }
    .assert { border:1px solid #d1d9e0; border-radius:8px; padding:10px 12px; background:#f6f8fa; }
    .assert .label { margin-bottom:6px; }
    .assert li { list-style:none; margin:3px 0; }
    .assert ul { margin:0; padding:0; }
    .ok-mark { color:#1a7f37; font-weight:700; }
  </style></head><body>
    <div class="doc">docs/screen/SignUp_LogIn/SignUp_Login_PCL.md → Section 4 · Interface Scenarios (I)</div>
    <h1>${esc(scenario)}</h1>
    <div class="sub">Captured by <code>e2e/tests/SignUp_LogIn/api-auth.spec.ts</code> during the Playwright run</div>
    ${exchanges.map(exchangeHtml).join('')}
    <div class="assert">
      <div class="label">Assertions verified</div>
      <ul>${assertions.map((a) => `<li><span class="ok-mark">✓</span> ${esc(a)}</li>`).join('')}</ul>
    </div>
  </body></html>`;

  const page = await browser.newPage({ viewport: { width: 1080, height: 900 } });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    return await captureScreenshot(page, stepName, description);
  } finally {
    await page.close();
  }
}
