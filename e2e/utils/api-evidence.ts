import type { Page } from '@playwright/test';
import { captureScreenshot } from './screenshot';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function captureApiEvidence(
  page: Page,
  caseId: string,
  method: string,
  endpoint: string,
  status: number,
  result: string,
): Promise<void> {
  const fields = [
    ['Method', method],
    ['Endpoint', endpoint],
    ['HTTP status', String(status)],
    ['Verified result', result],
  ];

  await page.setContent(`<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { margin: 0; padding: 36px; background: #f4f6fb; color: #182230; font: 16px/1.5 Arial, sans-serif; }
          main { max-width: 900px; margin: auto; padding: 32px; border: 1px solid #d8dee8; border-radius: 12px; background: white; }
          h1 { margin: 0 0 24px; font-size: 24px; }
          dl { display: grid; grid-template-columns: 150px 1fr; gap: 12px 20px; margin: 0; }
          dt { color: #536273; font-weight: 700; }
          dd { margin: 0; overflow-wrap: anywhere; font-family: Consolas, monospace; }
          .status { color: #087443; font-weight: 700; }
        </style>
      </head>
      <body>
        <main>
          <h1>${escapeHtml(caseId)} - Backend API evidence</h1>
          <dl>${fields
            .map(
              ([label, value]) =>
                `<dt>${escapeHtml(label)}</dt><dd${label === 'HTTP status' ? ' class="status"' : ''}>${escapeHtml(value)}</dd>`,
            )
            .join('')}</dl>
        </main>
      </body>
    </html>`);

  await captureScreenshot(
    page,
    `${caseId}_1_api_call`,
    `${method} ${endpoint} returned HTTP ${status}: ${result}`,
  );
}
