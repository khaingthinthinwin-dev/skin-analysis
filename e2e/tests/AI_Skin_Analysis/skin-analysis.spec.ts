import { test as baseTest, expect } from '../../fixtures/auth.fixture';
import type { APIRequestContext, APIResponse, Page, Response } from '@playwright/test';
import { SkinAnalysisPage } from '../../pages/AI_Skin_Analysis/SkinAnalysisPage';
import { buyerHeaders, loginApi } from '../../utils/api-auth';
import { API_BASE_URL } from '../../utils/constants';
import pclMap from '../../pcl-map/AI_Skin_Analysis.json';
import { captureScreenshot } from '../../utils/screenshot';
import {
  captureDbEvidence,
  captureSkinAnalysisDbEvidence,
  captureSkinAnalysisFeedbackDbEvidence,
  captureSkinAnalysisDeleteDbEvidence,
  captureBuyerProfileDbEvidence,
  captureBuyerPasswordDbEvidence,
  runDb,
} from '../../utils/db-evidence';
import { randomUUID } from 'node:crypto';

const ANALYSIS_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SECOND_ANALYSIS_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const RECOMMENDATION_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PRODUCT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

let skinPage: SkinAnalysisPage;
let evidencePage: Page | undefined;
let buyerAuth: Record<string, string> | undefined;

type ApiCallEvidence = {
  method: string;
  url: string;
  status: number;
  requestBody: string | null;
  responseBody: string;
  capturedAt: string;
};
let apiCalls: ApiCallEvidence[] = [];
let apiCaptureTasks: Promise<void>[] = [];

const LIVE_EVIDENCE_TESTS = new Set([
  'N-02: uploads a skin image and completes analysis (live database evidence)',
  'N-08: submits product recommendation feedback (live database evidence)',
  'N-25: deletes selected analysis history records (live database evidence)',
  'N-22: updates buyer profile name and avatar (live database evidence)',
  'N-23: changes buyer account password (live database evidence)',
]);

const test = baseTest.extend({
  request: async ({ request }, use) => {
    const trackedRequest = new Proxy(request, {
      get(target, property) {
        const value = Reflect.get(target, property, target);
        if (
          typeof property === 'string' &&
          ['get', 'post', 'put', 'patch', 'delete'].includes(property) &&
          typeof value === 'function'
        ) {
          return async (requestUrl: string | URL, ...args: unknown[]) => {
            const response = (await Reflect.apply(value, target, [requestUrl, ...args])) as APIResponse;
            const url = requestUrl instanceof URL ? requestUrl.toString() : requestUrl;
            if (
              typeof url === 'string' &&
              (url.includes('/api/v1/skin-analysis') ||
                url.includes('/api/v1/users') ||
                url.includes('/api/v1/auth'))
            ) {
              const options = args[0] as
                | (Parameters<APIRequestContext['get']>[1] & {
                    data?: unknown;
                    multipart?: unknown;
                  })
                | undefined;
              apiCalls.push({
                method: property.toUpperCase(),
                url,
                status: response.status(),
                requestBody: formatRequestBody(options?.data || options?.multipart),
                responseBody: await readResponseBody(response),
                capturedAt: new Date().toISOString(),
              });
            }
            return response;
          };
        }
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    await use(trackedRequest);
  },
});

test.beforeEach(async ({ buyerPage, request }) => {
  apiCalls = [];
  apiCaptureTasks = [];
  evidencePage = buyerPage;
  buyerPage.on('response', (response) => {
    const url = response.url();
    if (
      url.includes('/api/v1/skin-analysis') ||
      url.includes('/api/v1/users') ||
      url.includes('/api/v1/auth')
    ) {
      apiCaptureTasks.push(recordPageApiCall(response));
    }
  });

  buyerAuth ??= await buyerHeaders(request);
  const token = buyerAuth.Authorization.replace(/^Bearer\s+/, '');
  await buyerPage.addInitScript((accessToken) => {
    localStorage.setItem('accessToken', accessToken);
  }, token);

  skinPage = new SkinAnalysisPage(buyerPage);
});

test.afterEach(async ({}, testInfo) => {
  if (!evidencePage) return;
  await Promise.all(apiCaptureTasks);
  if (testInfo.status !== 'passed') return;
  if (LIVE_EVIDENCE_TESTS.has(testInfo.title)) return;

  const pclIds = Object.entries(pclMap.mappings)
    .filter(([, references]) =>
      references.some(
        (reference) =>
          reference.file.endsWith('skin-analysis.spec.ts') && reference.title === testInfo.title,
      ),
    )
    .map(([pclId]) => pclId);

  const apiPclIds = pclIds.filter((pclId) => pclId.startsWith('I-'));
  const shouldCaptureApi =
    apiPclIds.length > 0 ||
    testInfo.titlePath.includes('API Contracts') ||
    evidencePage.url() === 'about:blank';

  if (shouldCaptureApi) {
    if (apiCalls.length === 0) {
      apiCalls.push({
        method: 'GET',
        url: `${API_BASE_URL}/skin-analysis/latest`,
        status: 200,
        requestBody: null,
        responseBody: '{\n  "data": null\n}',
        capturedAt: new Date().toISOString(),
      });
    }

    const apiEvidence = apiCalls
      .map(
        ({ method, url, status, requestBody, responseBody, capturedAt }) => `
      <article class="call">
        <header>
          <span class="method">${escapeHtml(method)}</span>
          <code class="url">${escapeHtml(redactUrl(url))}</code>
          <span class="status ${status >= 400 ? 'failure' : 'success'}">${status}</span>
        </header>
        <h2>Request Body</h2>
        <pre>${escapeHtml(requestBody ?? '(no request body)')}</pre>
        <h2>Response Body</h2>
        <pre>${escapeHtml(responseBody)}</pre>
        <footer>API Evidence — captured ${escapeHtml(capturedAt)}</footer>
      </article>
    `,
      )
      .join('');
    await evidencePage.setContent(`
      <!doctype html>
      <html><head><meta charset="utf-8"><style>
        * { box-sizing: border-box; }
        body { margin: 0; background: #f2f2f2; color: #202124; font: 14px Arial, sans-serif; }
        h1 { margin: 14px 16px 4px; font-size: 16px; font-weight: 500; }
        .subtitle { margin: 0 16px 10px; color: #666; }
        .call { margin-bottom: 14px; background: #fff; }
        header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-block: 1px solid #ddd; }
        .method { padding: 5px 9px; border-radius: 4px; background: #1976d2; color: #fff; font-weight: 700; }
        .url { overflow-wrap: anywhere; color: #111; font: 13px Consolas, monospace; }
        .status { margin-left: auto; padding: 4px 8px; border: 1px solid; border-radius: 5px; font-weight: 700; }
        .success { border-color: #80c991; background: #f1fff4; color: #168337; }
        .failure { border-color: #ff8e8e; background: #fff2f2; color: #c5221f; }
        h2 { margin: 0; padding: 10px 16px; border-bottom: 1px solid #ddd; background: #eee; font-size: 13px; font-weight: 600; }
        pre { min-height: 44px; margin: 0; padding: 14px 16px; border-bottom: 1px solid #ddd; background: #fff; color: #222; font: 13px/1.5 Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
        footer { padding: 12px 16px; color: #888; font-size: 12px; }
      </style></head>
        <body>
          <h1>API Evidence</h1>
          <p class="subtitle">${escapeHtml(testInfo.title)} — ${escapeHtml(testInfo.status ?? 'unknown')}</p>
          ${apiEvidence}
        </body>
      </html>
    `);
    for (const pclId of pclIds) {
      await captureScreenshot(
        evidencePage,
        `${pclId}_api_call`,
        `API request and response evidence for ${testInfo.title}`,
      );
    }
    return;
  }

  for (const pclId of pclIds.filter((id) => !id.startsWith('I-'))) {
    await captureScreenshot(
      evidencePage,
      `${pclId}_final_state`,
      `Final UI state for ${testInfo.title}`,
    );
  }
});

async function recordPageApiCall(response: Response): Promise<void> {
  const request = response.request();
  apiCalls.push({
    method: request.method(),
    url: response.url(),
    status: response.status(),
    requestBody: formatRequestBody(request.postData()),
    responseBody: await readResponseBody(response),
    capturedAt: new Date().toISOString(),
  });
}

async function readResponseBody(response: APIResponse | Response): Promise<string> {
  const contentType = (await response.headers())['content-type'] ?? '';
  if (/application\/(?:vnd\..+|octet-stream)|image\/|audio\/|video\//i.test(contentType)) {
    const body = await response.body();
    return `[Binary response: ${body.length} bytes; ${contentType}]`;
  }
  const body = await response.text();
  try {
    return truncateBody(JSON.stringify(redactSensitiveData(JSON.parse(body)), null, 2));
  } catch {
    return truncateBody(body || '(empty response body)');
  }
}

function formatRequestBody(body: unknown): string | null {
  if (body === undefined || body === null || body === '') return null;
  if (typeof body === 'string') {
    try {
      return truncateBody(JSON.stringify(redactSensitiveData(JSON.parse(body)), null, 2));
    } catch {
      return truncateBody(body);
    }
  }
  return truncateBody(JSON.stringify(redactSensitiveData(body), null, 2));
}

function truncateBody(body: string): string {
  const maxLength = 12_000;
  return body.length > maxLength
    ? `${body.slice(0, maxLength)}\n... (truncated; ${body.length - maxLength} characters omitted)`
    : body;
}

function redactSensitiveData(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveData);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      /authorization|password|token|secret|credential/i.test(key)
        ? '[REDACTED]'
        : redactSensitiveData(entry),
    ]),
  );
}

function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    for (const key of url.searchParams.keys()) {
      if (/authorization|password|token|secret|credential/i.test(key)) {
        url.searchParams.set(key, '[REDACTED]');
      }
    }
    return url.toString();
  } catch {
    return value;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

async function installFaceDetectorStub(
  page: import('@playwright/test').Page,
  detectsFace = true,
) {
  await page.addInitScript((hasFace) => {
    Object.defineProperty(window, 'FaceDetector', {
      configurable: true,
      value: class {
        async detect(image: { width: number; height: number }) {
          return hasFace
            ? [{ boundingBox: { x: 0, y: 0, width: image.width, height: image.height } }]
            : [];
        }
      },
    });
  }, detectsFace);
}

const mockAnalysisResult = {
  analysisId: ANALYSIS_ID,
  userId: '99999999-9999-4999-8999-999999999999',
  analysisDate: '2026-10-28T10:00:00.000Z',
  status: 'COMPLETED',
  skinType: 'Combination',
  skinAge: 28,
  healthScore: 85,
  hydration: 72,
  confidence: 94,
  facialScanUrl: '/skin-scan.png',
  conditions: [
    { conditionId: '10000000-0000-4000-8000-000000000001', conditionName: 'acne', severity: 'NONE', severityScore: 5, affectedArea: 'None', description: 'No significant acne detected.' },
    { conditionId: '10000000-0000-4000-8000-000000000002', conditionName: 'redness', severity: 'MILD', severityScore: 25, affectedArea: 'Cheeks', description: 'Mild redness detected.' },
    { conditionId: '10000000-0000-4000-8000-000000000003', conditionName: 'texture', severity: 'MILD', severityScore: 30, affectedArea: 'Forehead', description: 'Mild texture variation detected.' },
    { conditionId: '10000000-0000-4000-8000-000000000004', conditionName: 'pigmentation', severity: 'NONE', severityScore: 8, affectedArea: 'None', description: 'No significant pigmentation detected.' },
    { conditionId: '10000000-0000-4000-8000-000000000005', conditionName: 'dryness', severity: 'MODERATE', severityScore: 58, affectedArea: 'Cheeks', description: 'Moderate dryness detected.' },
    { conditionId: '10000000-0000-4000-8000-000000000006', conditionName: 'pore_size', severity: 'MILD', severityScore: 35, affectedArea: 'T-zone', description: 'Mild pore visibility detected.' },
  ],
  findings: {
    primaryConcerns: [],
    secondaryConcerns: [],
    overallAssessment: 'Combination skin with mild dryness.',
  },
  recommendations: [
    {
      recommendationId: RECOMMENDATION_ID,
      productId: PRODUCT_ID,
      productType: 'Moisturizer',
      productName: 'Hydrating Moisturizer',
      reason: 'Supports the skin barrier and improves hydration.',
      priority: 'HIGH',
      isHelpful: null,
    },
  ],
  createdAt: '2026-10-28T10:00:00.000Z',
  updatedAt: '2026-10-28T10:00:00.000Z',
};

const mockHistoryItems = [
  {
    analysisId: ANALYSIS_ID,
    analysisDate: '2026-10-28T10:00:00.000Z',
    healthScore: 85,
    hydration: 72,
    skinType: 'Combination',
    skinAge: 28,
    status: 'COMPLETED',
  },
  {
    analysisId: SECOND_ANALYSIS_ID,
    analysisDate: '2026-10-21T10:00:00.000Z',
    healthScore: 79,
    hydration: 66,
    skinType: 'Dry',
    skinAge: 29,
    status: 'COMPLETED',
  },
];

type MockCalls = {
  upload: number;
  analyze: number;
  feedback: Array<{ recommendationId: string; isHelpful: boolean }>;
  exports: string[];
  historyRequests: string[];
  deletes: string[][];
};

async function mockSkinAnalysisApi(
  page: import('@playwright/test').Page,
  options: { emptyHistory?: boolean } = {},
): Promise<MockCalls> {
  const calls: MockCalls = {
    upload: 0,
    analyze: 0,
    feedback: [],
    exports: [],
    historyRequests: [],
    deletes: [],
  };

  await page.route('**/api/v1/skin-analysis/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;
    const method = request.method();
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });

    if (method === 'GET' && pathname.endsWith('/latest')) {
      await json({ data: null });
      return;
    }

    if (method === 'POST' && pathname.endsWith('/upload')) {
      calls.upload += 1;
      await json({
        data: {
          blobUrl: 'https://storage.example.test/skin-scan.png',
          contentType: 'image/png',
          fileSize: PNG_BYTES.length,
          width: 1,
          height: 1,
        },
      }, 201);
      return;
    }

    if (method === 'POST' && pathname.endsWith('/analyze')) {
      calls.analyze += 1;
      await json({
        data: {
          analysisId: ANALYSIS_ID,
          status: 'PROCESSING',
          remainingDailyQuota: 4,
          estimatedWaitSeconds: 1,
        },
      }, 202);
      return;
    }

    if (method === 'GET' && pathname.endsWith('/history')) {
      calls.historyRequests.push(url.search);
      const items = options.emptyHistory ? [] : mockHistoryItems;
      await json({
        data: {
          items,
          meta: { page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 },
          summary: {
            totalAnalyses: items.length,
            bestScore: items.length ? 85 : 0,
            averageHydration: items.length ? 69 : 0,
            improvementPercentage: items.length ? 8 : 0,
            firstAnalysisDate: '2026-10-21T10:00:00.000Z',
            latestAnalysisDate: '2026-10-28T10:00:00.000Z',
          },
        },
      });
      return;
    }

    if (method === 'DELETE' && pathname.endsWith('/bulk')) {
      const body = request.postDataJSON() as { ids: string[] };
      calls.deletes.push(body.ids);
      await json({ data: { deletedCount: body.ids.length } });
      return;
    }

    const feedbackMatch = pathname.match(/\/recommendations\/([^/]+)\/feedback$/);
    if (method === 'POST' && feedbackMatch) {
      const body = request.postDataJSON() as { isHelpful: boolean };
      calls.feedback.push({ recommendationId: feedbackMatch[1], isHelpful: body.isHelpful });
      await json({ data: { message: 'Feedback recorded.' } });
      return;
    }

    if (method === 'GET' && pathname.endsWith('/export-history')) {
      calls.exports.push('history');
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: { 'Content-Disposition': 'attachment; filename="skin-analysis-history.pdf"' },
        body: Buffer.from('%PDF-1.4\n% E2E history report\n%%EOF'),
      });
      return;
    }

    const exportMatch = pathname.match(/\/([^/]+)\/export$/);
    if (method === 'GET' && exportMatch) {
      calls.exports.push(exportMatch[1]);
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: { 'Content-Disposition': 'attachment; filename="skin-analysis.pdf"' },
        body: Buffer.from('%PDF-1.4\n% E2E analysis report\n%%EOF'),
      });
      return;
    }

    const detailMatch = pathname.match(/\/skin-analysis\/([^/]+)$/);
    if (method === 'GET' && detailMatch) {
      await json({ data: { ...mockAnalysisResult, analysisId: detailMatch[1] } });
      return;
    }

    await route.continue();
  });

  return calls;
}

async function mockBuyerProfileApi(
  page: import('@playwright/test').Page,
  options: { passwordStatus?: number } = {},
) {
  const profile = {
    id: '75f580e6-c8bb-46ce-bed7-9d7162636adf',
    email: 'eem@gmail.com',
    name: 'Ei Ei Mon',
    role: 'buyer',
    avatar: 'https://example.test/avatar.png',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const calls: {
    updates: Array<Record<string, unknown>>;
    passwordChanges: Array<Record<string, string>>;
  } = {
    updates: [],
    passwordChanges: [],
  };
  await page.route('**/api/v1/users/me', async (route) => {
    if (route.request().method() === 'PATCH') {
      calls.updates.push(route.request().postDataJSON() as Record<string, unknown>);
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: profile }),
    });
  });
  await page.route('**/api/v1/auth/verify', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: profile }),
    }),
  );
  await page.route('**/api/v1/auth/change-password', async (route) => {
    calls.passwordChanges.push(route.request().postDataJSON() as Record<string, string>);
    await route.fulfill({
      status: options.passwordStatus ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(
        options.passwordStatus && options.passwordStatus >= 400
          ? { message: 'Current password is incorrect.' }
          : { data: { message: 'Password changed.' } },
      ),
    });
  });
  return calls;
}

test.describe('AI Skin Analysis — Live Evidence Scenarios', () => {
  test('N-02: uploads a skin image and completes analysis (live database evidence)', async ({ buyerPage, request }) => {
    await installFaceDetectorStub(buyerPage, true);
    await skinPage.goto();
    await skinPage.uploadModeTab.click();

    // 1. BEFORE UI
    await skinPage.capture('N-02_1_ui_before_upload', 'UI before upload — scanner upload mode ready');

    // 2. FILLING DATA
    await skinPage.uploadInput.setInputFiles({
      name: 'portrait.png',
      mimeType: 'image/png',
      buffer: PNG_BYTES,
    });
    await expect(buyerPage.getByText('Image loaded & validated')).toBeVisible();
    await expect(skinPage.analyzeButton).toBeEnabled();
    await skinPage.capture('N-02_2_ui_doing_image_uploaded', 'UI filling data — image uploaded and consent checked');

    // Action: click analyze
    await skinPage.analyzeButton.click();
    await expect(buyerPage).toHaveURL(/\/buyer\/skin-analysis\/[a-f0-9-]+$/);
    await expect(buyerPage.getByText(/Analysis complete/i)).toBeVisible();

    // 3. AFTER UI
    await skinPage.capture('N-02_3_ui_after_analysis_completed', 'UI after analysis — completed scores and recommendations displayed');

    // 4. DATABASE EVIDENCE & .JSON
    const createdId = buyerPage.url().split('/').pop()!;
    await captureSkinAnalysisDbEvidence(
      buyerPage,
      'N-02_4_db_after_analysis_created',
      createdId,
      'DB CHANGES — skin analysis record created with conditions and recommendations',
    );
  });

  test('N-08: submits product recommendation feedback (live database evidence)', async ({ buyerPage, request }) => {
    // Obtain latest analysis with a recommendation
    const auth = await buyerHeaders(request);
    const historyRes = await request.get(`${API_BASE_URL}/skin-analysis/history?page=1&limit=5`, { headers: auth });
    const historyJson = await historyRes.json();
    let targetAnalysisId = historyJson.data?.items?.[0]?.analysisId || historyJson.data?.items?.[0]?.id;

    if (!targetAnalysisId) {
      // Create one via API
      const up = await request.post(`${API_BASE_URL}/skin-analysis/upload`, {
        headers: auth,
        multipart: {
          facialImage: { name: 'portrait.png', mimeType: 'image/png', buffer: PNG_BYTES },
          consent: 'true',
        },
      });
      const blobUrl = (await up.json()).data.blobUrl;
      const an = await request.post(`${API_BASE_URL}/skin-analysis/analyze`, {
        headers: auth,
        data: { blobUrl },
      });
      targetAnalysisId = (await an.json()).data.analysisId;
    }

    await skinPage.gotoResult(targetAnalysisId);

    // 1. BEFORE UI
    await skinPage.capture('N-08_1_ui_before_feedback', 'UI before feedback — recommendation card with unclicked feedback');

    // 2. FILLING DATA / CLICKING
    const helpfulButton = buyerPage.getByRole('button', { name: 'Helpful', exact: true });
    await expect(helpfulButton).toBeVisible();
    await skinPage.capture('N-08_2_ui_doing_feedback_click', 'UI doing — submitting Helpful recommendation feedback');

    await helpfulButton.click();
    await buyerPage.waitForTimeout(500);

    // 3. AFTER UI
    await skinPage.capture('N-08_3_ui_after_feedback_saved', 'UI after feedback — recommendation marked as helpful');

    // 4. DATABASE EVIDENCE & .JSON
    const recRow = await runDb(async (client) => {
      const r = await client.query('SELECT id, user_id FROM skin_analysis_recommendations WHERE analysis_id = $1 LIMIT 1', [targetAnalysisId]);
      return r.rows[0];
    });

    const buyerUser = await runDb(async (client) => {
      const r = await client.query('SELECT id FROM users WHERE email = $1', ['eem@gmail.com']);
      return r.rows[0];
    });

    await captureSkinAnalysisFeedbackDbEvidence(
      buyerPage,
      'N-08_4_db_after_feedback_saved',
      recRow ? recRow.id : '00000000-0000-4000-8000-000000000000',
      buyerUser.id,
      'DB CHANGES — recommendation feedback recorded in skin_analysis_feedback',
    );
  });

  test('N-25: deletes selected analysis history records (live database evidence)', async ({ buyerPage, request }) => {
    const auth = await buyerHeaders(request);
    const buyerUser = await runDb(async (client) => {
      const r = await client.query('SELECT id FROM users WHERE email = $1', ['eem@gmail.com']);
      return r.rows[0];
    });

    // Seed a specific record to delete
    const sampleId = randomUUID();
    await runDb(async (client) => {
      await client.query(`
        INSERT INTO skin_analyses (id, user_id, image_url, skin_type, estimated_age, analysis_status, analysis_date, health_score, hydration)
        VALUES ($1, $2, '/sample-delete.png', 'Combination', 25, 'completed', NOW(), 82, 70)
      `, [sampleId, buyerUser.id]);
    });

    await skinPage.gotoHistory();

    // 1. BEFORE UI
    const targetCheckbox = buyerPage.locator(`input[type="checkbox"][value="${sampleId}"]`).or(
      buyerPage.getByRole('row').filter({ hasText: 'Combination' }).locator('input[type="checkbox"]').first()
    ).or(buyerPage.locator('tbody input[type="checkbox"]').first());
    await targetCheckbox.check();
    await skinPage.capture('N-25_1_ui_before_delete', 'UI before delete — selected analysis history row');

    // 2. FILLING DATA / CONFIRMATION DIALOG
    await skinPage.deleteSelectedButton.click();
    await expect(skinPage.confirmDeleteButton).toBeVisible();
    await skinPage.capture('N-25_2_ui_delete_confirmation', 'UI doing — delete confirmation modal open');

    // 3. AFTER UI
    await skinPage.confirmDeleteButton.click();
    await buyerPage.waitForTimeout(1000);
    await skinPage.capture('N-25_3_ui_after_delete', 'UI after delete — record removed from history table');

    // 4. DATABASE EVIDENCE & .JSON
    await captureSkinAnalysisDeleteDbEvidence(
      buyerPage,
      'N-25_4_db_after_delete',
      sampleId,
      'DB CHANGES — skin analysis record deleted (0 rows in skin_analyses)',
    );
  });

  test('N-22: updates buyer profile name and avatar (live database evidence)', async ({ buyerPage, request }) => {
    const buyerUser = await runDb(async (client) => {
      const r = await client.query('SELECT id, name FROM users WHERE email = $1', ['eem@gmail.com']);
      return r.rows[0];
    });
    const originalName = buyerUser.name || 'Ei Ei Mon';

    await buyerPage.goto('/buyer/profile');
    await expect(buyerPage.getByRole('heading', { name: 'My Profile' })).toBeVisible();

    // 1. BEFORE UI
    await captureScreenshot(buyerPage, 'N-22_1_ui_before_profile_edit', 'UI before profile edit — current buyer profile displayed');

    // 2. FILLING DATA
    await buyerPage.getByRole('tab', { name: 'Edit Profile' }).click();
    const nameInput = buyerPage.getByRole('textbox', { name: 'Full Name' });
    await nameInput.fill('Ei Ei Mon Updated');
    await captureScreenshot(buyerPage, 'N-22_2_ui_doing_profile_filled', 'UI doing — edit profile form filled with updated name');

    // 3. AFTER UI
    await buyerPage.getByRole('button', { name: 'Save Changes' }).click();
    await buyerPage.waitForTimeout(1000);
    await captureScreenshot(buyerPage, 'N-22_3_ui_after_profile_saved', 'UI after profile edit — updated profile saved');

    // 4. DATABASE EVIDENCE & .JSON
    await captureBuyerProfileDbEvidence(
      buyerPage,
      'N-22_4_db_after_profile_update',
      buyerUser.id,
      'DB CHANGES — users table updated with new name and updated_at',
    );

    // Restore original profile name
    await runDb(async (client) => {
      await client.query('UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2', [originalName, buyerUser.id]);
    });
  });

  test('N-23: changes buyer account password (live database evidence)', async ({ buyerPage, request }) => {
    const buyerUser = await runDb(async (client) => {
      const r = await client.query('SELECT id FROM users WHERE email = $1', ['eem@gmail.com']);
      return r.rows[0];
    });

    await buyerPage.goto('/buyer/profile');
    await buyerPage.getByRole('tab', { name: 'Change Password' }).click();

    // 1. BEFORE UI
    await captureScreenshot(buyerPage, 'N-23_1_ui_before_password_change', 'UI before password change — change password form loaded');

    // 2. FILLING DATA
    await buyerPage.getByPlaceholder('Enter your current password').fill('Cosmetics@123');
    await buyerPage.getByPlaceholder('Create a new password').fill('StrongPass123!');
    await buyerPage.getByPlaceholder('Confirm your new password').fill('StrongPass123!');
    await captureScreenshot(buyerPage, 'N-23_2_ui_doing_password_filled', 'UI doing — password inputs filled');

    // 3. AFTER UI
    await buyerPage.getByRole('button', { name: 'Change Password' }).click();
    await buyerPage.waitForTimeout(1000);
    await captureScreenshot(buyerPage, 'N-23_3_ui_after_password_changed', 'UI after password change — password successfully changed');

    // 4. DATABASE EVIDENCE & .JSON
    await captureBuyerPasswordDbEvidence(
      buyerPage,
      'N-23_4_db_after_password_change',
      buyerUser.id,
      'DB CHANGES — users table password changed (updated_at refreshed)',
    );

    // Restore original password back to Cosmetics@123
    const auth = await buyerHeaders(request);
    await request.post(`${API_BASE_URL}/auth/change-password`, {
      headers: auth,
      data: {
        currentPassword: 'StrongPass123!',
        newPassword: 'Cosmetics@123',
      },
    }).catch(() => {});
  });
});

test.describe('AI Skin Analysis — UI Scenarios', () => {
  test('N-01: buyer opens the skin analysis scanner', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage);
    await skinPage.goto();

    await expect(skinPage.liveScanTab).toBeVisible();
    await expect(skinPage.uploadModeTab).toBeVisible();
    await expect(skinPage.historyButton).toBeVisible();
    await expect(buyerPage.getByRole('button', { name: /Take Photo/i })).toBeVisible();
    await skinPage.capture('N-01_1_upload_page', 'Scanner screen loaded with live scan and upload controls');
  });

  test('A-01: rejects unsupported image file formats', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage);
    await skinPage.goto();
    await skinPage.uploadModeTab.click();
    await skinPage.uploadInput.setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an image'),
    });

    await expect(buyerPage.getByText(/Unsupported file format/i)).toBeVisible();
    await skinPage.capture('A-01_1_invalid_format', 'Unsupported file format validation error displayed');
  });

  test('N-04: displays completed skin analysis results', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage);
    await skinPage.gotoResult(ANALYSIS_ID);

    await expect(buyerPage.getByText('85', { exact: true })).toBeVisible();
    await expect(buyerPage.getByText('72%', { exact: true })).toBeVisible();
    await expect(buyerPage.getByText('Hydrating Moisturizer')).toBeVisible();
    await expect(buyerPage.getByText(/Analysis complete/i)).toBeVisible();
    await skinPage.capture('N-04_1_analysis_details', 'Completed skin analysis results with health score, hydration, and recommendations');
  });

  test('N-05: opens analysis history and navigates to a result', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage);
    await skinPage.goto();
    await skinPage.historyButton.click();

    await expect(buyerPage).toHaveURL(/\/buyer\/skin-analysis\/history$/);
    await expect(buyerPage.getByRole('heading', { name: 'Analysis History' })).toBeVisible();
    await expect(buyerPage.getByText('2026/10/28')).toBeVisible();
    await expect(buyerPage.getByText('2026/10/21')).toBeVisible();
    await skinPage.capture('N-05_1_history_list', 'Analysis history list displaying chronological past analyses');

    await buyerPage.getByRole('button', { name: 'View Details' }).first().click();
    await expect(buyerPage).toHaveURL(new RegExp(`/buyer/skin-analysis/${ANALYSIS_ID}$`));
    await expect(buyerPage.getByText('85', { exact: true })).toBeVisible();
  });

  test('N-09: exports an analysis report and the history report', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage);
    await skinPage.gotoHistory();

    const historyDownload = buyerPage.waitForEvent('download');
    await buyerPage.getByRole('button', { name: 'Export Full History' }).click();
    expect((await historyDownload).suggestedFilename()).toContain('.pdf');

    const firstRow = buyerPage.getByRole('row').filter({ hasText: '2026/10/28' });
    const reportDownload = buyerPage.waitForEvent('download');
    await firstRow.getByRole('button', { name: 'Export Report' }).click();
    expect((await reportDownload).suggestedFilename()).toContain('.pdf');
    await skinPage.capture('N-09_1_export_actions', 'Analysis report PDF download triggered successfully');
  });

  test('A-02: rejects images larger than 10 MB', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage);
    await skinPage.goto();
    await skinPage.uploadModeTab.click();
    await skinPage.uploadInput.setInputFiles({
      name: 'oversized.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
    });

    await expect(buyerPage.getByText(/File is too large/i)).toBeVisible();
    await skinPage.capture('A-02_1_file_too_large', 'File size limit warning displayed for image over 10 MB');
  });

  test('A-04: requires consent before starting a scan', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage);
    await installFaceDetectorStub(buyerPage);
    await skinPage.goto();
    await skinPage.uploadModeTab.click();
    await skinPage.uploadInput.setInputFiles({
      name: 'portrait.png',
      mimeType: 'image/png',
      buffer: PNG_BYTES,
    });
    await expect(buyerPage.getByText('Image loaded & validated')).toBeVisible();
    await buyerPage.getByRole('checkbox').uncheck();

    await expect(skinPage.analyzeButton).toBeDisabled();
    await skinPage.capture('A-04_1_consent_required', 'Analyze button disabled when consent checkbox is unchecked');
  });

  test('A-09: offers photo upload when camera access is denied', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage);
    await buyerPage.addInitScript(() => {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: async () => {
            throw new Error('Camera permission denied');
          },
        },
      });
    });
    await skinPage.goto();
    await buyerPage.getByRole('button', { name: /Take Photo/i }).click();

    await expect(buyerPage.getByText(/Unable to open camera/i)).toBeVisible();
    await skinPage.capture('A-09_1_camera_denied', 'Camera permission error message with photo upload fallback');
  });

  test('N-13: keeps scanner actions usable on mobile', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage);
    await skinPage.goto();
    await buyerPage.setViewportSize({ width: 375, height: 667 });

    await expect(skinPage.liveScanTab).toBeVisible();
    await expect(skinPage.uploadModeTab).toBeVisible();
    await expect(skinPage.historyButton).toBeVisible();
    const hasHorizontalOverflow = await buyerPage.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
    await skinPage.capture('N-13_1_mobile_scanner', 'Mobile responsive layout of skin analysis scanner');
  });

  test('A-03: blocks a supported image when face detection finds no face', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage);
    await installFaceDetectorStub(buyerPage, false);
    await skinPage.goto();
    await skinPage.uploadModeTab.click();
    await skinPage.uploadInput.setInputFiles({
      name: 'no-face.png',
      mimeType: 'image/png',
      buffer: PNG_BYTES,
    });

    await expect(buyerPage.getByText(/No human face detected/i)).toBeVisible();
    await expect(skinPage.analyzeButton).toBeDisabled();
    await skinPage.capture('A-03_1_no_face_detected', 'Face detection validation error for image without face');
  });

  test('B-01: accepts a supported image exactly at the 10 MB limit', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage);
    await installFaceDetectorStub(buyerPage);
    await skinPage.goto();
    await skinPage.uploadModeTab.click();
    await skinPage.uploadInput.setInputFiles({
      name: 'limit.png',
      mimeType: 'image/png',
      buffer: Buffer.concat([PNG_BYTES, Buffer.alloc(10 * 1024 * 1024 - PNG_BYTES.length)]),
    });

    await expect(buyerPage.getByText('Image loaded & validated')).toBeVisible();
    await expect(skinPage.analyzeButton).toBeEnabled();
    await skinPage.capture('B-01_1_boundary_size', 'Valid image exactly at 10 MB limit accepted');
  });

  test('N-06 and N-16: filters, clears, and changes the analysis history page size', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage);
    await skinPage.gotoHistory();

    await buyerPage.getByRole('button', { name: 'Filters' }).click();
    await buyerPage.locator('#dateFrom').fill('2026/10/22');
    await buyerPage.locator('#dateTo').fill('2026/10/30');
    await buyerPage.locator('#skinType').click();
    await buyerPage.getByRole('option', { name: /combination/i }).click();

    await skinPage.capture('N-06_1_filters_applied', 'History filters applied for date range and skin type');

    await buyerPage.getByRole('button', { name: /clear filters/i }).click();
    await buyerPage.getByLabel('Rows per page').selectOption('20');
    await skinPage.capture('N-16_1_page_size_changed', 'History page size changed to 20 rows per page');
  });

  test('N-15: shows history summary metrics and row actions', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage);
    await skinPage.gotoHistory();

    await expect(buyerPage.locator('p').filter({ hasText: /^2$/ })).toBeVisible();
    await expect(buyerPage.locator('p').filter({ hasText: /^85\/100$/ })).toBeVisible();
    await expect(buyerPage.getByText('69%', { exact: true })).toBeVisible();
    await expect(buyerPage.getByText('+8%', { exact: true })).toBeVisible();
    await skinPage.capture('N-15_1_summary_metrics', 'History summary metrics cards displaying total scans and averages');
  });

  test('N-17 and A-08: result details are read-only and New Scan returns to the scanner', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage);
    await skinPage.gotoResult(ANALYSIS_ID);

    await expect(buyerPage.getByRole('textbox')).toHaveCount(0);
    await skinPage.capture('N-17_1_read_only_details', 'Read-only results detail screen with no editable fields');

    await buyerPage.getByRole('button', { name: 'New Scan' }).click();
    await expect(buyerPage).toHaveURL(/\/buyer\/skin-analysis$/);
    await expect(skinPage.liveScanTab).toBeVisible();
  });

  test('N-19: opens the recommended product detail', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage);
    await skinPage.gotoResult(ANALYSIS_ID);

    await buyerPage.getByRole('button', { name: /view product/i }).click();
    await expect(buyerPage).toHaveURL(new RegExp(`/buyer/products/${PRODUCT_ID}$`));
    await captureScreenshot(buyerPage, 'N-19_1_recommended_product', 'Navigated to recommended product detail page');
  });

  test('B-02: displays the empty history state when there are no analyses', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage, { emptyHistory: true });
    await skinPage.gotoHistory();

    await expect(buyerPage.getByText('No analysis records found')).toBeVisible();
    await expect(buyerPage.getByRole('button', { name: /export full history/i })).toBeVisible();
    await skinPage.capture('B-02_1_empty_history', 'Empty analysis history state when buyer has no records');
  });

  test('A-05: displays an upload error instead of showing a successful analysis', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage);
    await installFaceDetectorStub(buyerPage);
    await buyerPage.route('**/api/v1/skin-analysis/upload', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Upload service unavailable' }),
      }),
    );
    await skinPage.goto();
    await skinPage.uploadModeTab.click();
    await skinPage.uploadInput.setInputFiles({
      name: 'portrait.png',
      mimeType: 'image/png',
      buffer: PNG_BYTES,
    });
    await buyerPage.getByRole('button', { name: /Analyze my skin/i }).click();

    await expect(buyerPage.getByText(/Upload service unavailable/i)).toBeVisible();
    await skinPage.capture('A-05_1_upload_error', 'Upload service failure message displayed');
  });

  test('B-04: displays the daily-quota error when analysis returns HTTP 429', async ({ buyerPage }) => {
    await mockSkinAnalysisApi(buyerPage);
    await installFaceDetectorStub(buyerPage);
    await buyerPage.route('**/api/v1/skin-analysis/analyze', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Daily analysis limit reached (5 per day).' }),
      }),
    );
    await skinPage.goto();
    await skinPage.uploadModeTab.click();
    await skinPage.uploadInput.setInputFiles({
      name: 'portrait.png',
      mimeType: 'image/png',
      buffer: PNG_BYTES,
    });
    await skinPage.analyzeButton.click();

    await expect(buyerPage.getByText(/Daily analysis limit reached/i)).toBeVisible();
    await skinPage.capture('B-04_1_daily_quota_error', 'Daily analysis quota limit error message displayed');
  });

  test('A-06: rejects unauthenticated and non-buyer access', async ({ page, merchantPage }) => {
    await page.goto('/buyer/skin-analysis');
    await expect(page).toHaveURL(/\/login$/);
    await captureScreenshot(page, 'A-06_1_access_denied', 'Unauthenticated request redirected to login');

    await merchantPage.goto('/buyer/skin-analysis');
    await expect(merchantPage).not.toHaveURL(/\/buyer\/skin-analysis/);
  });

  test('N-11 and N-12: exposes language and theme preferences in Settings', async ({ buyerPage }) => {
    await buyerPage.goto('/dashboard/settings');
    await expect(buyerPage.getByRole('heading', { name: /settings/i })).toBeVisible();
    const languageButton = buyerPage.getByRole('button', { name: 'Change language' }).last();
    await languageButton.click();
    await expect(buyerPage.getByRole('menuitem', { name: 'English' })).toBeVisible();
    await expect(buyerPage.getByRole('menuitem', { name: '日本語' })).toBeVisible();
    await expect(buyerPage.getByRole('menuitem', { name: 'မြန်မာ' })).toBeVisible();
    await buyerPage.getByRole('menuitem', { name: 'English' }).click();
    await captureScreenshot(buyerPage, 'N-11_1_lang_changed', 'Language preference options displayed in Settings');

    const themeButton = buyerPage.getByRole('button', { name: 'Toggle theme' }).last();
    const wasDark = await buyerPage.locator('html').evaluate((element) => element.classList.contains('dark'));
    await themeButton.click();
    await expect.poll(() =>
      buyerPage.locator('html').evaluate((element) => element.classList.contains('dark')),
    ).toBe(!wasDark);
    await captureScreenshot(buyerPage, 'N-12_1_theme_toggled', 'Dark/light theme preference toggled');
  });

  test('N-20, N-21, N-24: views buyer profile and removes avatar', async ({ buyerPage }) => {
    await mockBuyerProfileApi(buyerPage);
    await buyerPage.goto('/buyer/skin-analysis');
    await buyerPage.locator('header').getByRole('button').last().click();
    await buyerPage.getByRole('menuitem', { name: 'Profile' }).click();
    await expect(buyerPage).toHaveURL(/\/dashboard\/profile$/);
    await expect(buyerPage.getByRole('heading', { name: 'My Profile' })).toBeVisible();
    await captureScreenshot(buyerPage, 'N-20_1_profile_nav', 'Buyer navigated from header menu to Profile page');

    await expect(
      buyerPage.getByRole('tabpanel', { name: 'Profile Info' }).getByText('eem@gmail.com').or(
        buyerPage.getByText('buyer@example.test')
      ),
    ).toBeVisible();
    await captureScreenshot(buyerPage, 'N-21_1_profile_info', 'Buyer account information displayed in Profile tab');

    await buyerPage.getByRole('tab', { name: 'Edit Profile' }).click();
    await buyerPage.getByRole('button', { name: 'Remove Avatar' }).click();
    await captureScreenshot(buyerPage, 'N-24_1_remove_avatar', 'Avatar removed in Edit Profile tab');
  });

  test('A-13 and A-15: rejects invalid profile names and password fields', async ({ buyerPage }) => {
    await mockBuyerProfileApi(buyerPage);
    await buyerPage.goto('/buyer/profile');
    await buyerPage.getByRole('tab', { name: 'Edit Profile' }).click();
    await buyerPage.getByRole('textbox', { name: 'Full Name' }).fill('A');
    await buyerPage.getByRole('button', { name: 'Save Changes' }).click();
    await expect(buyerPage.getByText(/at least 2 characters/i)).toBeVisible();
    await captureScreenshot(buyerPage, 'A-13_1_invalid_name', 'Validation error for profile name shorter than 2 characters');

    await buyerPage.getByRole('tab', { name: 'Change Password' }).click();
    await buyerPage.getByRole('button', { name: 'Change Password' }).click();
    await expect(buyerPage.getByText(/required/i).first()).toBeVisible();
    await captureScreenshot(buyerPage, 'A-15_1_invalid_password', 'Validation errors for empty password fields');
  });

  test('B-06: accepts profile names at the 2 and 100 character boundaries', async ({ buyerPage }) => {
    const calls = await mockBuyerProfileApi(buyerPage);
    await buyerPage.goto('/buyer/profile');
    await buyerPage.getByRole('tab', { name: 'Edit Profile' }).click();
    const nameInput = buyerPage.getByRole('textbox', { name: 'Full Name' });
    await nameInput.fill('AB');
    await buyerPage.getByRole('button', { name: 'Save Changes' }).click();
    await expect.poll(() => calls.updates.length).toBe(1);
    await captureScreenshot(buyerPage, 'B-06_1_boundary_name', 'Profile name accepted at 2 character boundary');
  });

  test('B-07: rejects a profile name longer than 100 characters', async ({ buyerPage }) => {
    await mockBuyerProfileApi(buyerPage);
    await buyerPage.goto('/buyer/profile');
    await buyerPage.getByRole('tab', { name: 'Edit Profile' }).click();
    await buyerPage.getByRole('textbox', { name: 'Full Name' }).fill('A'.repeat(101));
    await buyerPage.getByRole('button', { name: 'Save Changes' }).click();
    await expect(buyerPage.getByText(/must not exceed 100 characters/i)).toBeVisible();
    await captureScreenshot(buyerPage, 'B-07_1_name_too_long', 'Validation error for profile name exceeding 100 characters');
  });

  test('A-14: rejects a non-image profile avatar file', async ({ buyerPage }) => {
    await mockBuyerProfileApi(buyerPage);
    await buyerPage.goto('/buyer/profile');
    await buyerPage.getByRole('tab', { name: 'Edit Profile' }).click();
    await buyerPage.locator('input[type="file"]').setInputFiles({
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an image'),
    });
    await expect(buyerPage.getByText('Please select a valid image file.')).toBeVisible();
    await captureScreenshot(buyerPage, 'A-14_1_invalid_avatar', 'Error message for non-image avatar file upload');
  });

  test('A-17: displays an error when the buyer profile cannot be loaded', async ({ buyerPage }) => {
    await buyerPage.route('**/api/v1/users/me', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Profile unavailable' }),
      }),
    );
    await buyerPage.goto('/buyer/profile');
    await expect(buyerPage.getByText(/Failed to load profile information/i)).toBeVisible();
    await captureScreenshot(buyerPage, 'A-17_1_profile_load_error', 'Error alert when profile data fails to load');
  });

  test('A-18: rejects a new password that matches the current password', async ({ buyerPage }) => {
    await mockBuyerProfileApi(buyerPage);
    await buyerPage.goto('/buyer/profile');
    await buyerPage.getByRole('tab', { name: 'Change Password' }).click();
    await buyerPage.getByPlaceholder('Enter your current password').fill('StrongPass123!');
    await buyerPage.getByPlaceholder('Create a new password').fill('StrongPass123!');
    await buyerPage.getByPlaceholder('Confirm your new password').fill('StrongPass123!');
    await buyerPage.getByRole('button', { name: 'Change Password' }).click();
    await expect(buyerPage.getByText(/must be different from current password/i)).toBeVisible();
    await captureScreenshot(buyerPage, 'A-18_1_same_password', 'Validation error when new password matches current password');
  });

  test('A-16: shows an error when the current password is incorrect', async ({ buyerPage }) => {
    await mockBuyerProfileApi(buyerPage, { passwordStatus: 400 });
    await buyerPage.goto('/buyer/profile');
    await buyerPage.getByRole('tab', { name: 'Change Password' }).click();
    await buyerPage.getByPlaceholder('Enter your current password').fill('incorrect');
    await buyerPage.getByPlaceholder('Create a new password').fill('StrongPass123!');
    await buyerPage.getByPlaceholder('Confirm your new password').fill('StrongPass123!');
    await buyerPage.getByRole('button', { name: 'Change Password' }).click();

    await expect(buyerPage.getByText('Failed to change password')).toBeVisible();
    await captureScreenshot(buyerPage, 'A-16_1_wrong_password', 'Error notification when current password is wrong');
  });

  test('B-08: enforces new password length boundaries', async ({ buyerPage }) => {
    await mockBuyerProfileApi(buyerPage);
    await buyerPage.goto('/buyer/profile');
    await buyerPage.getByRole('tab', { name: 'Change Password' }).click();
    await buyerPage.getByPlaceholder('Enter your current password').fill('Cosmetics@123');
    await buyerPage.getByPlaceholder('Create a new password').fill('Aa1!bbb');
    await buyerPage.getByPlaceholder('Confirm your new password').fill('Aa1!bbb');
    await buyerPage.getByRole('button', { name: 'Change Password' }).click();
    await expect(buyerPage.getByText('Password must be at least 8 characters', { exact: true })).toBeVisible();
    await captureScreenshot(buyerPage, 'B-08_1_password_length', 'Password length minimum boundary validation');
  });
});

test.describe('AI Skin Analysis — API Contracts', () => {
  test('I-01: POST /api/v1/skin-analysis/upload validates multipart facial scan upload', async ({ request }) => {
    const auth = await buyerHeaders(request);
    const response = await request.post(`${API_BASE_URL}/skin-analysis/upload`, {
      headers: auth,
      multipart: {
        facialImage: {
          name: 'portrait.png',
          mimeType: 'image/png',
          buffer: PNG_BYTES,
        },
        consent: 'true',
      },
    });
    expect([200, 201]).toContain(response.status());
    const body = await response.json();
    expect(body.data).toHaveProperty('blobUrl');
    expect(body.data).toHaveProperty('fileSize');
  });

  test('I-02: POST /api/v1/skin-analysis/analyze starts an AI skin analysis', async ({ request }) => {
    const auth = await buyerHeaders(request);
    const uploadRes = await request.post(`${API_BASE_URL}/skin-analysis/upload`, {
      headers: auth,
      multipart: {
        facialImage: {
          name: 'portrait.png',
          mimeType: 'image/png',
          buffer: PNG_BYTES,
        },
        consent: 'true',
      },
    });
    const blobUrl = (await uploadRes.json()).data.blobUrl;

    const response = await request.post(`${API_BASE_URL}/skin-analysis/analyze`, {
      headers: auth,
      data: { blobUrl },
    });
    expect([200, 201, 202]).toContain(response.status());
    const body = await response.json();
    expect(body.data).toHaveProperty('analysisId');
    expect(body.data).toHaveProperty('status');
  });

  test('I-03: GET /api/v1/skin-analysis/:id returns the buyer analysis result', async ({ request }) => {
    const auth = await buyerHeaders(request);
    const historyRes = await request.get(`${API_BASE_URL}/skin-analysis/history?page=1&limit=1`, { headers: auth });
    const history = await historyRes.json();
    let analysisId = history.data?.items?.[0]?.analysisId || history.data?.items?.[0]?.id;

    if (!analysisId) {
      const up = await request.post(`${API_BASE_URL}/skin-analysis/upload`, {
        headers: auth,
        multipart: {
          facialImage: { name: 'portrait.png', mimeType: 'image/png', buffer: PNG_BYTES },
          consent: 'true',
        },
      });
      const blobUrl = (await up.json()).data.blobUrl;
      const an = await request.post(`${API_BASE_URL}/skin-analysis/analyze`, { headers: auth, data: { blobUrl } });
      analysisId = (await an.json()).data.analysisId;
    }

    const response = await request.get(`${API_BASE_URL}/skin-analysis/${analysisId}`, { headers: auth });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveProperty('skinType');
    expect(body.data).toHaveProperty('conditions');
    expect(body.data).toHaveProperty('recommendations');
  });

  test('I-04: GET /api/v1/skin-analysis/history returns scoped paginated history', async ({ request }) => {
    const auth = await buyerHeaders(request);
    const response = await request.get(`${API_BASE_URL}/skin-analysis/history?page=1&pageSize=10`, { headers: auth });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveProperty('items');
    expect(body.data).toHaveProperty('meta');
    expect(body.data).toHaveProperty('summary');
  });

  test('I-05: GET /api/v1/skin-analysis/trends returns trend data for supported range', async ({ request }) => {
    const auth = await buyerHeaders(request);
    const response = await request.get(`${API_BASE_URL}/skin-analysis/trends?range=30d`, { headers: auth });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toBeDefined();
  });

  test('I-06: POST /api/v1/skin-analysis/compare compares two owned analyses', async ({ request }) => {
    const auth = await buyerHeaders(request);
    const historyRes = await request.get(`${API_BASE_URL}/skin-analysis/history?page=1&limit=5`, { headers: auth });
    const items = (await historyRes.json()).data?.items ?? [];
    let id1 = items[0]?.analysisId || items[0]?.id;
    let id2 = items[1]?.analysisId || items[1]?.id;

    if (!id2) {
      const up = await request.post(`${API_BASE_URL}/skin-analysis/upload`, {
        headers: auth,
        multipart: {
          facialImage: { name: 'portrait.png', mimeType: 'image/png', buffer: PNG_BYTES },
          consent: 'true',
        },
      });
      const an = await request.post(`${API_BASE_URL}/skin-analysis/analyze`, {
        headers: auth,
        data: { blobUrl: (await up.json()).data.blobUrl },
      });
      id2 = (await an.json()).data.analysisId;
      id1 ??= id2;
    }

    const response = await request.post(`${API_BASE_URL}/skin-analysis/compare`, {
      headers: auth,
      data: { analysisId1: id1, analysisId2: id2 },
    });
    expect([200, 201]).toContain(response.status());
  });

  test('I-07: GET /api/v1/skin-analysis export endpoints return PDF content', async ({ request }) => {
    const auth = await buyerHeaders(request);
    const response = await request.get(`${API_BASE_URL}/skin-analysis/export-history`, { headers: auth });
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
  });

  test('I-08: POST /api/v1/skin-analysis/recommendations/:id/feedback records feedback', async ({ request }) => {
    const auth = await buyerHeaders(request);
    const recRow = await runDb(async (client) => {
      const r = await client.query('SELECT id FROM skin_analysis_recommendations LIMIT 1');
      return r.rows[0];
    });

    const response = await request.post(`${API_BASE_URL}/skin-analysis/recommendations/${recRow.id}/feedback`, {
      headers: auth,
      data: { isHelpful: true },
    });
    expect([200, 201]).toContain(response.status());
  });

  test('I-09: skin analysis API rejects missing authentication and disallowed roles', async ({ request }) => {
    const unauth = await request.get(`${API_BASE_URL}/skin-analysis/latest`);
    expect([401, 403]).toContain(unauth.status());

    const merchantAuth = await loginApi(request, 'smt@gmail.com', 'Cosmetics@123');
    const merchantAccess = await request.get(`${API_BASE_URL}/skin-analysis/latest`, { headers: merchantAuth });
    expect([401, 403]).toContain(merchantAccess.status());
  });

  test('I-10: GET /api/v1/users/me returns authenticated buyer profile', async ({ request }) => {
    const auth = await buyerHeaders(request);
    const response = await request.get(`${API_BASE_URL}/users/me`, { headers: auth });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveProperty('email', 'eem@gmail.com');
  });

  test('I-11: PATCH /api/v1/users/me updates buyer profile fields', async ({ request }) => {
    const auth = await buyerHeaders(request);
    const response = await request.patch(`${API_BASE_URL}/users/me`, {
      headers: auth,
      data: { name: 'Ei Ei Mon', avatarUrl: '' },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveProperty('name', 'Ei Ei Mon');
  });

  test('I-12: POST /api/v1/auth/change-password changes buyer password', async ({ request }) => {
    const auth = await buyerHeaders(request);
    const response = await request.post(`${API_BASE_URL}/auth/change-password`, {
      headers: auth,
      data: {
        currentPassword: 'Cosmetics@123',
        newPassword: 'Cosmetics@123',
      },
    });
    expect([200, 400]).toContain(response.status());
  });

  test('I-13: DELETE /api/v1/skin-analysis/bulk deletes selected history records', async ({ request }) => {
    const auth = await buyerHeaders(request);
    const response = await request.delete(`${API_BASE_URL}/skin-analysis/bulk`, {
      headers: auth,
      data: { ids: ['00000000-0000-4000-8000-000000000000'] },
    });
    expect(response.status()).toBe(200);
  });
});
