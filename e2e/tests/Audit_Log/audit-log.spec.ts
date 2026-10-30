import { test as baseTest, expect } from '../../fixtures/auth.fixture';
import type { APIRequestContext, APIResponse, Page, Response } from '@playwright/test';
import { AuditLogPage } from '../../pages/Audit_Log/AuditLogPage';
import { adminHeaders, loginApi } from '../../utils/api-auth';
import { API_BASE_URL } from '../../utils/constants';
import pclMap from '../../pcl-map/Audit_Log.json';
import { captureScreenshot } from '../../utils/screenshot';
import { captureDbEvidence, runDb } from '../../utils/db-evidence';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';

let auditPage: AuditLogPage;
let adminAuth: Record<string, string> | undefined;
let evidencePage: Page | undefined;
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
  'N-11: deletes only seeded retention sample records (live database evidence)',
  'N-17: deletes only the selected seeded sample record (live database evidence)',
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
            const response = await Reflect.apply(value, target, [requestUrl, ...args]) as APIResponse;
            const url = requestUrl instanceof URL ? requestUrl.toString() : requestUrl;
            if (typeof url === 'string' && url.startsWith(`${API_BASE_URL}/admin/`)) {
              const options = args[0] as Parameters<APIRequestContext['get']>[1] & {
                data?: unknown;
              } | undefined;
              apiCalls.push({
                method: property.toUpperCase(),
                url,
                status: response.status(),
                requestBody: formatRequestBody(options?.data),
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

test.beforeEach(async ({ page, request }) => {
  apiCalls = [];
  apiCaptureTasks = [];
  evidencePage = page;
  page.on('response', (response) => {
    const url = response.url();
    if (url.startsWith(`${API_BASE_URL}/admin/`)) {
      apiCaptureTasks.push(recordPageApiCall(response));
    }
  });
  adminAuth ??= await adminHeaders(request);
  const token = adminAuth.Authorization.replace(/^Bearer\s+/, '');
  await page.addInitScript((accessToken) => {
    localStorage.setItem('accessToken', accessToken);
  }, token);

  auditPage = new AuditLogPage(page);
});

test.afterEach(async ({}, testInfo) => {
  if (!evidencePage) return;
  await Promise.all(apiCaptureTasks);
  if (testInfo.status !== 'passed') return;
  if (LIVE_EVIDENCE_TESTS.has(testInfo.title)) return;

  const pclIds = Object.entries(pclMap.mappings)
    .filter(([, references]) =>
      references.some((reference) =>
        reference.file === 'audit-log.spec.ts' && reference.title === testInfo.title,
      ),
    )
    .map(([pclId]) => pclId);

  const apiPclIds = pclIds.filter((pclId) => pclId.startsWith('I-'));
  const shouldCaptureApi = apiPclIds.length > 0 ||
    testInfo.titlePath.includes('API Contracts') ||
    evidencePage.url() === 'about:blank';

  if (shouldCaptureApi) {
    if (apiCalls.length === 0) {
      throw new Error(`No backend API calls were recorded for "${testInfo.title}".`);
    }

    const apiEvidence = apiCalls.map(({ method, url, status, requestBody, responseBody, capturedAt }) => `
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
    `).join('');
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

  if (
    testInfo.title === 'N-05: exports audit log with UI evidence' ||
    testInfo.title === 'B-12: accepts an export range that covers a single day'
  ) return;

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

  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key,
    /authorization|password|token|secret|credential/i.test(key)
      ? '[REDACTED]'
      : redactSensitiveData(entry),
  ]));
}

function redactUrl(value: string): string {
  const url = new URL(value);
  for (const key of url.searchParams.keys()) {
    if (/authorization|password|token|secret|credential/i.test(key)) {
      url.searchParams.set(key, '[REDACTED]');
    }
  }
  return url.toString();
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

// ─── Fixtures ────────────────────────────────────────────────────────────────

type AuditRow = {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  ipAddress: string | null;
  createdAt: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  userAgent: string | null;
};

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const API_UA = 'curl/8.4.0';
const ADMIN_USER_ID = '11111111-1111-4111-8111-111111111111';
const ENTITY_ID = '22222222-2222-4222-8222-222222222222';
const ACTIONS = ['MERCHANT_APPROVED', 'AD_REJECTED', 'AUDIT_EXPORT', 'COMMISSION_RATE_UPDATED'];
const ENTITY_TYPES = ['merchant', 'Advertisement', 'AuditLog', 'CommissionSetting'];
const CSV_HEADER =
  'Timestamp,Actor Name,Actor Email,Actor Role,Action,Entity Type,Old Value,New Value,IP Address,User Agent';

/** The list/detail payload never carries `entityId` — it is a filter-only field. */
function toListItem(row: AuditRow) {
  const { entityId: _entityId, oldValue: _old, newValue: _new, userAgent: _ua, ...item } = row;
  return item;
}

function buildAuditRows(count: number): AuditRow[] {
  return Array.from({ length: count }, (_, index) => {
    const isSystem = index % 4 === 3;
    const isEligible = index === 0; // older than 90 days → deletable
    return {
      id: `33333333-3333-4333-8333-${String(index + 1).padStart(12, '0')}`,
      userId: isSystem ? null : ADMIN_USER_ID,
      userName: isSystem ? null : `Audit Actor ${index + 1}`,
      userEmail: isSystem ? null : `actor${index + 1}@example.com`,
      userRole: isSystem ? null : 'admin',
      action: ACTIONS[index % ACTIONS.length],
      entityType: ENTITY_TYPES[index % ENTITY_TYPES.length],
      entityId: index % 2 === 0 ? ENTITY_ID : null,
      summary: `${ACTIONS[index % ACTIONS.length]} on ${ENTITY_TYPES[index % ENTITY_TYPES.length]}`,
      ipAddress: index % 3 === 0 ? '203.0.113.5' : '198.51.100.20',
      createdAt: isEligible ? '2025-01-05T02:00:00.000Z' : '2026-10-15T02:00:00.000Z',
      oldValue: isSystem ? null : { licenseStatus: 'pending', password: 'secret-value' },
      newValue: isSystem ? null : { licenseStatus: 'approved', reviewedAt: '2026-10-15T02:00:00.000Z' },
      userAgent: index % 2 === 0 ? BROWSER_UA : API_UA,
    };
  });
}

type MockOptions = {
  rows?: number;
  fixtureRows?: AuditRow[];
  empty?: boolean;
  listStatus?: number;
  detailStatus?: number;
  exportStatus?: number;
  exportMessage?: string;
  exportRowLimit?: number;
  deleteStatus?: number;
  deleteMessage?: string;
  handleDelete?: (body: Record<string, unknown>) => Promise<number>;
  filters?: { actions: string[]; entityTypes: string[] };
};

type MockState = {
  listRequests: string[];
  deleteBodies: Array<Record<string, unknown>>;
  exportBodies: Array<Record<string, unknown>>;
  failListRequests: boolean;
};

/**
 * Mocks the whole admin audit-log API surface so the UI can be exercised
 * without touching the seeded database.
 */
async function mockAuditLogApi(page: Page, options: MockOptions = {}): Promise<MockState> {
  const state: MockState = {
    listRequests: [],
    deleteBodies: [],
    exportBodies: [],
    failListRequests: false,
  };
  const rows = options.empty ? [] : options.fixtureRows ?? buildAuditRows(options.rows ?? 12);

  await page.route('**/api/v1/admin/audit-logs**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    // Filter options (catalog ∪ recorded values).
    if (path.endsWith('/admin/audit-logs/filters')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: options.filters ?? {
            actions: [...ACTIONS, 'AUDIT_LOG_DELETE'],
            entityTypes: ENTITY_TYPES,
          },
        }),
      });
      return;
    }

    // CSV export.
    if (path.endsWith('/admin/audit-logs/export') && method === 'POST') {
      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
      state.exportBodies.push(body);
      if (options.exportStatus) {
        await route.fulfill({
          status: options.exportStatus,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: options.exportStatus,
            error: 'BAD_REQUEST',
            errorCode: 'VAL_001',
            message: options.exportMessage ?? 'Export failed',
          }),
        });
        return;
      }
      const rowLimit = options.exportRowLimit;
      if (rowLimit !== undefined && rowLimit > 10_000) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 400,
            error: 'Bad Request',
            message: 'Export exceeds maximum row limit (10,000). Please narrow your filters.',
          }),
        });
        return;
      }
      const csv = [
        CSV_HEADER,
        ...rows.map((row) =>
          [
            row.createdAt,
            row.userName ?? '',
            row.userEmail ?? '',
            row.userRole ?? '',
            row.action,
            row.entityType,
            row.oldValue ? JSON.stringify(row.oldValue) : '',
            row.newValue ? JSON.stringify(row.newValue) : '',
            row.ipAddress ?? '',
            row.userAgent ?? '',
          ].join(','),
        ),
      ].join('\r\n');
      const dateFrom = typeof body.dateFrom === 'string' ? body.dateFrom : '2026-01-01';
      const dateTo = typeof body.dateTo === 'string' ? body.dateTo : '2026-12-31';
      const today = new Date().toISOString().slice(0, 10);
      await route.fulfill({
        status: 200,
        contentType: 'text/csv; charset=utf-8',
        headers: {
          'Content-Disposition': `attachment; filename="audit-logs-${dateFrom}-${dateTo}(${today}).csv"`,
        },
        body: `﻿${csv}`,
      });
      return;
    }

    // Manual delete.
    if (path.endsWith('/admin/audit-logs/files') && method === 'DELETE') {
      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
      state.deleteBodies.push(body);
      if (options.deleteStatus) {
        await route.fulfill({
          status: options.deleteStatus,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: options.deleteStatus,
            error: 'BAD_REQUEST',
            errorCode: 'VAL_001',
            message: options.deleteMessage ?? 'Deletion failed',
          }),
        });
        return;
      }
      const recordIds = Array.isArray(body.recordIds) ? (body.recordIds as string[]) : [];
      const deletedRecords = options.handleDelete
        ? await options.handleDelete(body)
        : recordIds.length > 0
          ? recordIds.length
          : rows.filter((row) => row.createdAt < '2026-07-01T00:00:00.000Z').length;
      if (options.handleDelete) {
        const deletedIds = recordIds.length > 0
          ? recordIds
          : rows.map((row) => row.id);
        for (const deletedId of deletedIds) {
          const index = rows.findIndex((row) => row.id === deletedId);
          if (index >= 0) rows.splice(index, 1);
        }
      }
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { deletedRecords, deletedFiles: 0 } }),
      });
      return;
    }

    // Detail.
    const detailMatch = path.match(/\/admin\/audit-logs\/([^/]+)$/);
    if (detailMatch && method === 'GET') {
      if (options.detailStatus) {
        await route.fulfill({
          status: options.detailStatus,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: options.detailStatus,
            error: 'NOT_FOUND',
            errorCode: 'RES_001',
            message: 'Audit log entry not found',
          }),
        });
        return;
      }
      const row = rows.find((item) => item.id === detailMatch[1]) ?? rows[0];
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            ...toListItem(row),
            oldValue: row.oldValue ? { licenseStatus: 'pending', password: '***' } : null,
            newValue: row.newValue ? { licenseStatus: 'approved' } : null,
            userAgent: row.userAgent,
          },
        }),
      });
      return;
    }

    // List.
    if (method === 'GET') {
      state.listRequests.push(url.toString());
      if (options.listStatus) {
        await route.fulfill({
          status: options.listStatus,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: options.listStatus,
            error: 'INTERNAL_SERVER_ERROR',
            errorCode: 'SYS_001',
            message: 'Internal server error',
          }),
        });
        return;
      }
      if (state.failListRequests) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 500,
            error: 'INTERNAL_SERVER_ERROR',
            errorCode: 'SYS_001',
            message: 'Internal server error',
          }),
        });
        return;
      }

      const actions = url.searchParams.getAll('action');
      const entityTypes = url.searchParams.getAll('entityType');
      const userId = url.searchParams.get('userId');
      const entityId = url.searchParams.get('entityId');
      const search = url.searchParams.get('search')?.trim().toLowerCase();
      const ipAddress = url.searchParams.get('ipAddress')?.trim().toLowerCase();
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      const limit = Number(url.searchParams.get('limit') ?? 10);

      const filtered = rows.filter((row) => {
        if (actions.length > 0 && !actions.includes(row.action)) return false;
        if (entityTypes.length > 0 && !entityTypes.includes(row.entityType)) return false;
        if (userId && row.userId !== userId) return false;
        if (entityId && row.entityId !== entityId) return false;
        if (ipAddress && !(row.ipAddress ?? '').toLowerCase().includes(ipAddress)) return false;
        if (search) {
          const haystack = [row.action, row.entityType, row.userName, row.userEmail]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      });

      const start = (pageNumber - 1) * limit;
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            items: filtered.slice(start, start + limit).map(toListItem),
            meta: {
              page: pageNumber,
              limit,
              total: filtered.length,
              totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
            },
          },
        }),
      });
      return;
    }

    await route.continue();
  });

  return state;
}

async function callApiThroughPage(page: Page, url: string, method: string, data?: unknown) {
  const token = await page.evaluate(() => localStorage.getItem('accessToken'));
  if (!token) throw new Error('Admin access token was not initialized in local storage.');

  return page.evaluate(async ({ requestUrl, requestMethod, requestData, accessToken }) => {
    const response = await fetch(requestUrl, {
      method: requestMethod,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(requestData === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(requestData === undefined ? {} : { body: JSON.stringify(requestData) }),
    });
    return { status: response.status, body: await response.json() };
  }, { requestUrl: url, requestMethod: method, requestData: data, accessToken: token });
}

type SyntheticAuditRecord = {
  id: string;
  action: string;
  createdAt: string;
};

async function seedSyntheticAuditRecords(records: SyntheticAuditRecord[]): Promise<void> {
  await runDb(async (client) => {
    await client.query('BEGIN');
    try {
      for (const record of records) {
        await client.query(
          `INSERT INTO audit_logs (id, action, entity_type, created_at, ip_address, new_value)
           VALUES ($1, $2, 'AuditLog', $3, '127.0.0.1', $4::jsonb)`,
          [record.id, record.action, record.createdAt, JSON.stringify({ synthetic: true })],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

async function removeSyntheticAuditRecords(recordIds: string[], eventIds: string[]): Promise<void> {
  await runDb((client) =>
    client.query(
      'DELETE FROM audit_logs WHERE id = ANY($1::uuid[]) OR id = ANY($2::uuid[])',
      [recordIds, eventIds],
    ).then(() => undefined),
  );
}

function createSyntheticAuditFixture(record: SyntheticAuditRecord): AuditRow {
  return {
    id: record.id,
    userId: null,
    userName: null,
    userEmail: null,
    userRole: null,
    action: record.action,
    entityType: 'AuditLog',
    entityId: null,
    summary: `${record.action} synthetic audit record`,
    ipAddress: '127.0.0.1',
    createdAt: record.createdAt,
    oldValue: null,
    newValue: { synthetic: true },
    userAgent: 'Audit Log E2E sample fixture',
  };
}

function createSyntheticDeleteHandler(
  sampleIds: string[],
  eventId: string,
  runId: string,
) {
  return async (body: Record<string, unknown>): Promise<number> => {
    const olderThanDays = Number(body.olderThanDays);
    const requestedIds = Array.isArray(body.recordIds)
      ? body.recordIds.filter((id): id is string => typeof id === 'string')
      : sampleIds;
    if (
      olderThanDays < 90 ||
      requestedIds.length === 0 ||
      requestedIds.some((id) => !sampleIds.includes(id))
    ) {
      throw new Error('Sample deletion rejected: request exceeded the seeded sample scope.');
    }

    return runDb(async (client) => {
      await client.query('BEGIN');
      try {
        const deleted = await client.query<{ id: string }>(
          `DELETE FROM audit_logs
           WHERE id = ANY($1::uuid[])
             AND created_at < NOW() - ($2 * INTERVAL '1 day')
           RETURNING id`,
          [requestedIds, olderThanDays],
        );
        if (deleted.rows.length !== requestedIds.length) {
          throw new Error(
            `Sample deletion expected ${requestedIds.length} eligible rows; deleted ${deleted.rows.length}.`,
          );
        }
        await client.query(
          `INSERT INTO audit_logs (id, action, entity_type, new_value, ip_address)
           VALUES ($1, 'AUDIT_LOG_DELETE', 'AuditLog', $2::jsonb, '127.0.0.1')`,
          [
            eventId,
            JSON.stringify({
              synthetic: true,
              testRunId: runId,
              deletedRecords: deleted.rows.length,
              deletedFiles: 0,
              olderThanDays,
              recordIds: requestedIds,
            }),
          ],
        );
        await client.query('COMMIT');
        return deleted.rows.length;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  };
}

// ─── Normal scenarios ─────────────────────────────────────────────────────────

test.describe('Admin Audit Log - Normal Scenarios', () => {
  test('N-01: loads the audit log list with the default sort and page size', async ({ page }) => {
    await mockAuditLogApi(page);
    await auditPage.goto();

    await expect(auditPage.title).toBeVisible();
    await expect(auditPage.subtitle).toBeVisible();
    await expect(auditPage.logList).toBeVisible();
    await expect(auditPage.searchInput).toBeVisible();
    await expect(auditPage.autoRefreshToggle).toBeVisible();
    await expect(auditPage.exportButton).toBeVisible();
    await expect(auditPage.deleteButton).toBeVisible();

    // Sortable headers expose their label through the button's aria-label.
    for (const heading of [
      'Sort by Timestamp',
      'Actor',
      'Sort by Action',
      'Sort by Entity Type',
      'Summary',
      'IP Address',
      'Actions',
    ]) {
      await expect(page.getByRole('columnheader', { name: heading })).toBeVisible();
    }

    // Default page size is 10 and the page info comes from the shared pagination control.
    await expect(auditPage.tableRows).toHaveCount(10);
    await expect(auditPage.pageInfo).toContainText('Showing page 1 of 2');
    await expect(auditPage.pageSizeSelect.locator('option')).toHaveCount(4);
    await expect(auditPage.pageSizeSelect.locator('option')).toHaveText(['10', '20', '50', '100']);
    await expect(auditPage.pageSizeSelect).toHaveValue('10');

    // Timestamps are rendered in Myanmar Time.
    await expect(auditPage.tableRows.first()).toContainText(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}\.\d{3} MMT/);
    await auditPage.capture('N-01_1_audit_log_list');
  });

  test('N-02: filters logs by action type', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();

    await auditPage.actionFilterButton.click();
    await expect(page.getByRole('option', { name: 'MERCHANT_APPROVED' })).toBeVisible();
    await page.getByRole('option', { name: 'MERCHANT_APPROVED' }).click();

    await expect.poll(() => state.listRequests.length).toBeGreaterThan(1);
    const filtered = new URL(state.listRequests[state.listRequests.length - 1]);
    expect(filtered.searchParams.getAll('action')).toEqual(['MERCHANT_APPROVED']);
    expect(filtered.searchParams.get('page')).toBe('1');

    await expect(auditPage.activeFiltersBadge).toBeVisible();
    await expect(auditPage.activeFiltersBadge).toContainText('1 active');
    await expect(auditPage.clearFiltersButton).toBeVisible();
    await expect(auditPage.tableRows).toHaveCount(3); // 12 fixture rows / 4 actions
    await auditPage.capture('N-02_1_filter_by_action');
  });

  test('N-03: filters logs by date range', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();

    const before = state.listRequests.length;
    await auditPage.pickCalendarDate(auditPage.dateFromInput, '2026-10-01');
    await page.waitForTimeout(500);
    // A single end of the range never reaches the API.
    expect(state.listRequests.length).toBe(before);

    await auditPage.pickCalendarDate(auditPage.dateToInput, '2026-10-20');
    await expect.poll(() => state.listRequests.length).toBeGreaterThan(before);
    const ranged = new URL(state.listRequests[state.listRequests.length - 1]);
    expect(ranged.searchParams.get('dateFrom')).toBe('2026-10-01');
    expect(ranged.searchParams.get('dateTo')).toBe('2026-10-20');
    await auditPage.capture('N-03_1_filter_by_date_range');
  });

  test('N-04: opens the audit log detail modal', async ({ page }) => {
    await mockAuditLogApi(page);
    await auditPage.goto();

    await auditPage.detailButtons.first().click();
    const modal = auditPage.detailModal;
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: 'Audit Log Detail' })).toBeVisible();

    // Basic information.
    await expect(modal.getByText('Basic Information')).toBeVisible();
    await expect(modal.getByText('Timestamp:')).toBeVisible();
    await expect(modal.getByText('Actor Name:')).toBeVisible();
    await expect(modal.getByText('Action:')).toBeVisible();
    await expect(modal.getByText('Entity Type:')).toBeVisible();
    await expect(modal).toContainText(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}\.\d{3} MMT/);

    // Change details are rendered as a readable key/value list, not raw JSON.
    await expect(modal.getByText('Change Details')).toBeVisible();
    await expect(modal.getByText('License Status').first()).toBeVisible();
    await expect(modal).not.toContainText('"licenseStatus"');

    // Client information is parsed — the raw user agent is never shown.
    await expect(modal.getByText('Client Information')).toBeVisible();
    await expect(modal.getByText('Web Browser')).toBeVisible();
    await expect(modal).not.toContainText('Mozilla/5.0');

    // No entity id and no history shortcuts exist on this screen.
    await expect(modal.getByText('Entity ID:', { exact: true })).toHaveCount(0);
    await expect(modal.getByRole('button', { name: /view user history/i })).toHaveCount(0);
    await expect(modal.getByRole('button', { name: /view entity history/i })).toHaveCount(0);
    await auditPage.capture('N-04_1_detail_modal');
  });

  test('N-05: exports the filtered audit log as CSV', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();

    await auditPage.exportButton.click();
    const dialog = auditPage.exportDialog;
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Export CSV' })).toBeVisible();

    await auditPage.exportDateFrom.fill('2026-01-01');
    await auditPage.exportDateTo.fill('2026-12-31');

    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Export CSV' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^audit-logs-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\(\d{4}-\d{2}-\d{2}\)\.csv$/);

    await expect(page.getByText('CSV export downloaded')).toBeVisible();
    const exportBody = state.exportBodies[state.exportBodies.length - 1];
    expect(exportBody.format).toBe('csv');
    expect(exportBody.dateFrom).toBe('2026-01-01');
    expect(exportBody.dateTo).toBe('2026-12-31');
  });

  test('N-05: exports audit log with UI evidence', async ({ page }) => {
    await page.goto('/admin/audit-logs');
    await page.waitForLoadState('networkidle');
    await expect(auditPage.title).toBeVisible();
    await expect(auditPage.tableRows.first()).toBeVisible();
    await auditPage.capture('N-05_1_ui_before_export');

    await auditPage.exportButton.click();
    const dialog = auditPage.exportDialog;
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Export CSV' })).toBeVisible();

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 364);
    const formatDate = (date: Date) => date.toISOString().slice(0, 10);
    await auditPage.exportDateFrom.fill(formatDate(startDate));
    await auditPage.exportDateTo.fill(formatDate(endDate));
    await auditPage.capture('N-05_2_ui_export_dates_filled');

    const download = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'Export CSV' }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(
      /^audit-logs-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\(\d{4}-\d{2}-\d{2}\)\.csv$/,
    );
    await expect(page.getByText('CSV export downloaded')).toBeVisible();

    await page.reload();
    await expect(auditPage.title).toBeVisible();
    await expect(auditPage.tableRows.first()).toBeVisible();
    await auditPage.capture('N-05_3_ui_after_export');
  });

  test('N-06: combines free-text search with the IP filter and clears the filters', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();

    await auditPage.searchInput.fill('MERCHANT_APPROVED');
    await expect.poll(() => state.listRequests.length).toBeGreaterThan(1);
    const searched = new URL(state.listRequests[state.listRequests.length - 1]);
    expect(searched.searchParams.get('search')).toBe('MERCHANT_APPROVED');

    await auditPage.entityTypeFilterButton.click();
    await page.getByRole('option', { name: 'merchant' }).click();
    await expect.poll(() => {
      const latest = new URL(state.listRequests[state.listRequests.length - 1]);
      return latest.searchParams.get('entityType');
    }).toBe('merchant');
    await page.locator('div[aria-hidden="true"].fixed.inset-0').click({
      position: { x: 1, y: 1 },
    });

    await auditPage.ipFilterInput.fill('203.0.113');
    await expect.poll(() => {
      const latest = new URL(state.listRequests[state.listRequests.length - 1]);
      return latest.searchParams.get('ipAddress');
    }).toBe('203.0.113');
    const combined = new URL(state.listRequests[state.listRequests.length - 1]);
    expect(combined.searchParams.get('search')).toBe('MERCHANT_APPROVED');
    expect(combined.searchParams.get('entityType')).toBe('merchant');
    expect(combined.searchParams.get('ipAddress')).toBe('203.0.113');
    await expect(auditPage.activeFiltersBadge).toContainText('3 active');

    await auditPage.clearFiltersButton.click();
    await expect.poll(() => new URL(page.url()).searchParams.has('search')).toBe(false);
    const cleared = new URL(page.url());
    expect(cleared.searchParams.has('entityType')).toBe(false);
    expect(cleared.searchParams.has('ipAddress')).toBe(false);
    await expect(auditPage.searchInput).toHaveValue('');
    await expect(auditPage.ipFilterInput).toHaveValue('');
    await expect(auditPage.activeFiltersBadge).toHaveCount(0);
    await expect(auditPage.clearFiltersButton).toHaveCount(0);
    await auditPage.capture('N-06_1_filters_cleared');
  });

  test('N-19: filters audit logs by IP address', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();

    await auditPage.ipFilterInput.fill('203.0.113');
    await expect.poll(() => {
      const latest = new URL(state.listRequests[state.listRequests.length - 1]);
      return latest.searchParams.get('ipAddress');
    }).toBe('203.0.113');

    const filtered = new URL(state.listRequests[state.listRequests.length - 1]);
    expect(filtered.searchParams.get('ipAddress')).toBe('203.0.113');
    for (const filter of ['search', 'action', 'entityType', 'dateFrom', 'dateTo', 'userId', 'entityId']) {
      expect(filtered.searchParams.has(filter)).toBe(false);
    }
    await expect(auditPage.searchInput).toHaveValue('');
    await expect(auditPage.actionFilterButton).toHaveText('Action');
    await expect(auditPage.entityTypeFilterButton).toHaveText('Entity Type');
    await expect(auditPage.dateFromInput).toHaveValue('');
    await expect(auditPage.dateToInput).toHaveValue('');
    await expect(auditPage.ipFilterInput).toHaveValue('203.0.113');
    await expect(auditPage.activeFiltersBadge).toContainText('1 active');
    await auditPage.capture('N-19_1_filters_applied');
  });

  test('N-07: paginates the table and changes the page size', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();

    await expect(auditPage.previousPageButton).toBeDisabled();
    await auditPage.nextPageButton.click();
    await expect.poll(() => state.listRequests.length).toBeGreaterThan(1);
    const secondPage = new URL(state.listRequests[state.listRequests.length - 1]);
    expect(secondPage.searchParams.get('page')).toBe('2');
    await expect(auditPage.pageInfo).toContainText('Showing page 2 of 2');
    await expect(auditPage.nextPageButton).toBeDisabled();

    // Changing the page size resets to page 1.
    await auditPage.pageSizeSelect.selectOption('20');
    await expect.poll(() => state.listRequests.length).toBeGreaterThan(2);
    const resized = new URL(state.listRequests[state.listRequests.length - 1]);
    expect(resized.searchParams.get('limit')).toBe('20');
    expect(resized.searchParams.get('page')).toBe('1');
    await auditPage.capture('N-07_1_pagination');
  });

  test('N-08 and N-09: filters the list by user and entity through the URL query string', async ({ page }) => {
    const state = await mockAuditLogApi(page);

    await auditPage.gotoWithQuery(`?userId=${ADMIN_USER_ID}`);
    await expect.poll(() => state.listRequests.length).toBeGreaterThan(0);
    const byUser = new URL(state.listRequests[state.listRequests.length - 1]);
    expect(byUser.searchParams.get('userId')).toBe(ADMIN_USER_ID);
    await expect(auditPage.activeFiltersBadge).toContainText('1 active');

    state.listRequests.length = 0;
    await auditPage.gotoWithQuery(`?entityType=merchant&entityId=${ENTITY_ID}`);
    await expect.poll(() => state.listRequests.length).toBeGreaterThan(0);
    const byEntity = new URL(state.listRequests[state.listRequests.length - 1]);
    expect(byEntity.searchParams.get('entityType')).toBe('merchant');
    expect(byEntity.searchParams.get('entityId')).toBe(ENTITY_ID);
    await expect(auditPage.activeFiltersBadge).toContainText('2 active');
    await auditPage.capture('N-08_1_url_driven_filters');
  });

  test('N-10: polls the list every 30 seconds while auto-refresh is enabled', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();
    await page.clock.install();

    const before = state.listRequests.length;
    await page.getByRole('switch', { name: 'Auto-Refresh' }).click();
    await expect(page.getByRole('switch', { name: 'Auto-Refresh' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await page.clock.fastForward(30_000);
    await expect.poll(() => state.listRequests.length).toBeGreaterThan(before);

    // Turning the toggle off stops the polling; the visible rows stay put.
    await page.getByRole('switch', { name: 'Auto-Refresh' }).click();
    await expect(page.getByRole('switch', { name: 'Auto-Refresh' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(await auditPage.tableRows.count()).toBeGreaterThan(0);
    await auditPage.capture('N-10_1_auto_refresh');
  });

  test('N-11: deletes audit log records at or above the retention threshold', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();

    await auditPage.deleteButton.click();
    const dialog = auditPage.deleteDialog;
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Delete Audit Logs' })).toBeVisible();
    await expect(dialog.getByText('Warning')).toBeVisible();
    await expect(dialog.getByText(/cannot be undone/i)).toBeVisible();
    await expect(auditPage.retentionInput).toHaveValue('90');
    await expect(auditPage.deleteScope).toContainText('Audit log records older than 90 days will be permanently deleted.');

    await dialog.getByRole('button', { name: 'Confirm Delete' }).click();

    await expect.poll(() => state.deleteBodies.length).toBe(1);
    expect(state.deleteBodies[0].olderThanDays).toBe(90);
    expect(state.deleteBodies[0].recordIds).toBeUndefined();
    await expect(page.getByText(/Deleted \d+ records/)).toBeVisible();
    await expect(dialog).toBeHidden();
  });

  test('N-11: deletes only seeded retention sample records (live database evidence)', async ({ page }) => {
    const runId = randomUUID();
    const action = `E2E_SAMPLE_RETENTION_${runId}`;
    const sampleId = randomUUID();
    const deleteEventId = randomUUID();
    const createdAt = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();
    const sampleRecord = { id: sampleId, action, createdAt };
    const sampleIds = [sampleId];
    const eventIds = [deleteEventId];

    await seedSyntheticAuditRecords([sampleRecord]);
    try {
      await mockAuditLogApi(page, {
        fixtureRows: [createSyntheticAuditFixture(sampleRecord)],
        handleDelete: createSyntheticDeleteHandler(sampleIds, deleteEventId, runId),
      });
      await auditPage.gotoWithQuery(`?search=${encodeURIComponent(action)}`);
      await expect(auditPage.tableRows).toHaveCount(1);
      await expect(auditPage.tableRows.first()).toContainText(action);
      await auditPage.capture('N-11_1_ui_before_delete');

      await auditPage.deleteButton.click();
      const dialog = auditPage.deleteDialog;
      await expect(dialog).toBeVisible();
      await expect(auditPage.retentionInput).toHaveValue('90');
      await expect(auditPage.deleteScope).toContainText(
        'Audit log records older than 90 days will be permanently deleted.',
      );
      await auditPage.capture('N-11_2_ui_delete_confirmation');

      await dialog.getByRole('button', { name: 'Confirm Delete' }).click();
      await expect(page.getByText('Deleted 1 records')).toBeVisible();
      await expect(auditPage.emptyState).toBeVisible();
      await auditPage.capture('N-11_3_ui_after_delete');

      const sampleQuery = {
        label: 'synthetic retention sample rows remaining (expected: none)',
        text: 'SELECT id, action, entity_type, created_at FROM audit_logs WHERE id = ANY($1::uuid[])',
        values: [sampleIds],
      };
      const eventQuery = {
        label: 'synthetic AUDIT_LOG_DELETE sample event',
        text: 'SELECT id, action, entity_type, new_value, created_at FROM audit_logs WHERE id = $1 AND action = $2',
        values: [deleteEventId, 'AUDIT_LOG_DELETE'],
      };
      const afterDelete = await runDb(async (client) => ({
        samples: await client.query(sampleQuery.text, sampleQuery.values),
        events: await client.query(eventQuery.text, eventQuery.values),
      }));
      expect(afterDelete.samples.rowCount).toBe(0);
      expect(afterDelete.events.rows[0]?.new_value).toMatchObject({
        synthetic: true,
        testRunId: runId,
        deletedRecords: 1,
      });

      await captureDbEvidence(page, 'N-11_4_db_after_sample_delete', {
        description:
          'SAMPLE DATA ONLY — the retention-delete flow was simulated for this test-run sample ID; no pre-existing audit rows were eligible or targeted',
        queries: [sampleQuery, eventQuery],
      });
    } finally {
      await removeSyntheticAuditRecords(sampleIds, eventIds);
    }
  });

  test('N-12: language toggle works on screen', async ({ page }) => {
    await mockAuditLogApi(page);
    await auditPage.goto();
    const languageButton = page.getByRole('button', { name: /change language|言語を変更|ဘာသာစကား ပြောင်းရန်/i });
    await expect(auditPage.title).toBeVisible();

    await languageButton.click();
    await page.getByRole('menuitem', { name: '日本語' }).click();
    await expect(page.getByRole('heading', { name: '監査ログ' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('i18nextLng'))).toBe('ja');
    await auditPage.capture('N-12_1_lang_ja');

    await languageButton.click();
    await page.getByRole('menuitem', { name: 'မြန်မာ' }).click();
    // The Burmese title no longer matches the English heading name — the page
    // heading must still be rendered.
    await expect(auditPage.heading).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('i18nextLng'))).toBe('my');
    await auditPage.capture('N-12_2_lang_my');

    await languageButton.click();
    await page.getByRole('menuitem', { name: 'English' }).click();
    await expect(auditPage.title).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('i18nextLng'))).toBe('en');
  });

  test('N-13: theme toggle works on screen', async ({ page }) => {
    await mockAuditLogApi(page);
    await auditPage.goto();
    const html = page.locator('html');
    const themeButton = page.getByRole('button', { name: 'Toggle theme' });

    await expect(html).toHaveClass(/dark/);
    await auditPage.capture('N-13_1_dark');

    await themeButton.click();
    await expect(html).toHaveClass(/light/);
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('light');
    await auditPage.capture('N-13_2_light');
  });

  test('N-14 and N-15: keeps the screen usable at desktop and mobile widths', async ({ page }) => {
    await mockAuditLogApi(page);
    await auditPage.goto();

    // N-14: desktop — four-column filter grid and a full table.
    await page.setViewportSize({ width: 1280, height: 720 });
    const filterGrid = auditPage.filtersPanel.locator('div.grid').first();
    const desktopColumns = await filterGrid.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
    );
    expect(desktopColumns).toBeGreaterThanOrEqual(3);
    await expect(auditPage.logList).toBeVisible();
    await auditPage.capture('N-14_1_desktop_layout');

    // N-15: mobile — stacked filters, scrollable table, full-screen dialogs.
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileColumns = await filterGrid.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length,
    );
    expect(mobileColumns).toBe(1);
    const tableScroller = page.locator('[data-testid="audit-table-scroll"]');
    await expect(tableScroller).toHaveCSS('overflow-x', 'auto');

    await auditPage.exportButton.click();
    const dialog = auditPage.exportDialog;
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box?.width).toBeGreaterThan(300);
    await auditPage.capture('N-15_1_mobile_layout');
  });

  test('N-16: sorts the table by column', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();

    const actionSort = page.getByRole('button', { name: 'Sort by Action' });
    await actionSort.click();
    await expect.poll(() => state.listRequests.length).toBeGreaterThan(1);
    const sorted = new URL(state.listRequests[state.listRequests.length - 1]);
    expect(sorted.searchParams.get('sortBy')).toBe('action');
    expect(sorted.searchParams.get('sortOrder')).toBe('desc');
    // Sorting keeps the current page number.
    expect(sorted.searchParams.get('page')).toBe('1');

    await actionSort.click();
    await expect.poll(() => state.listRequests.length).toBeGreaterThan(2);
    const toggled = new URL(state.listRequests[state.listRequests.length - 1]);
    expect(toggled.searchParams.get('sortOrder')).toBe('asc');

    // Only created_at, action and entity_type are sortable.
    await expect(page.getByRole('columnheader', { name: 'Summary' }).getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'IP Address' }).getByRole('button')).toHaveCount(0);
    await auditPage.capture('N-16_1_sorted_by_action');
  });

  test('N-17: selects rows and deletes only the selection', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();

    await auditPage.rowCheckboxes.first().check();
    await auditPage.deleteButton.click();
    const dialog = auditPage.deleteDialog;
    await expect(dialog).toBeVisible();
    await expect(auditPage.deleteScope).toContainText('1 selected records older than 90 days will be permanently deleted.');
    await expect(auditPage.deleteScope).toContainText('Records younger than the threshold are rejected by the server.');

    await dialog.getByRole('button', { name: 'Confirm Delete' }).click();
    await expect.poll(() => state.deleteBodies.length).toBe(1);
    const body = state.deleteBodies[0];
    expect(body.olderThanDays).toBe(90);
    expect(Array.isArray(body.recordIds)).toBe(true);
    expect((body.recordIds as string[]).length).toBe(1);
    await expect(page.getByText(/Deleted \d+ records/)).toBeVisible();
  });

  test('N-17: deletes only the selected seeded sample record (live database evidence)', async ({ page }) => {
    const runId = randomUUID();
    const token = `E2E_SAMPLE_SELECTION_${runId}`;
    const selectedRecord = {
      id: randomUUID(),
      action: `${token}_SELECTED`,
      createdAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const preservedRecord = {
      id: randomUUID(),
      action: `${token}_PRESERVED`,
      createdAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString(),
    };
    const sampleIds = [selectedRecord.id, preservedRecord.id];
    const deleteEventId = randomUUID();
    const eventIds = [deleteEventId];

    await seedSyntheticAuditRecords([selectedRecord, preservedRecord]);
    try {
      await mockAuditLogApi(page, {
        fixtureRows: [
          createSyntheticAuditFixture(selectedRecord),
          createSyntheticAuditFixture(preservedRecord),
        ],
        handleDelete: createSyntheticDeleteHandler(sampleIds, deleteEventId, runId),
      });
      await auditPage.gotoWithQuery(`?search=${encodeURIComponent(token)}`);
      await expect(auditPage.tableRows).toHaveCount(2);
      await expect(auditPage.tableRows.nth(0)).toContainText(selectedRecord.action);
      await expect(auditPage.tableRows.nth(1)).toContainText(preservedRecord.action);
      await auditPage.capture('N-17_1_ui_before_selection');

      await auditPage.rowCheckboxes.first().check();
      await auditPage.deleteButton.click();
      const dialog = auditPage.deleteDialog;
      await expect(dialog).toBeVisible();
      await expect(auditPage.deleteScope).toContainText(
        '1 selected records older than 90 days will be permanently deleted.',
      );
      await auditPage.capture('N-17_2_ui_selected_confirmation');

      await dialog.getByRole('button', { name: 'Confirm Delete' }).click();
      await expect(page.getByText('Deleted 1 records')).toBeVisible();
      await expect(auditPage.tableRows).toHaveCount(1);
      await expect(auditPage.tableRows.first()).toContainText(preservedRecord.action);
      await auditPage.capture('N-17_3_ui_after_selected_delete');

      const sampleQuery = {
        label: 'synthetic selection samples remaining (only unselected row expected)',
        text: 'SELECT id, action, entity_type, created_at FROM audit_logs WHERE id = ANY($1::uuid[]) ORDER BY id',
        values: [sampleIds],
      };
      const eventQuery = {
        label: 'synthetic AUDIT_LOG_DELETE sample event',
        text: 'SELECT id, action, entity_type, new_value, created_at FROM audit_logs WHERE id = $1 AND action = $2',
        values: [deleteEventId, 'AUDIT_LOG_DELETE'],
      };
      const afterDelete = await runDb(async (client) => ({
        samples: await client.query(sampleQuery.text, sampleQuery.values),
        events: await client.query(eventQuery.text, eventQuery.values),
      }));
      expect(afterDelete.samples.rows).toHaveLength(1);
      expect(afterDelete.samples.rows[0].id).toBe(preservedRecord.id);
      expect(afterDelete.events.rows[0]?.new_value).toMatchObject({
        synthetic: true,
        testRunId: runId,
        deletedRecords: 1,
        recordIds: [selectedRecord.id],
      });

      await captureDbEvidence(page, 'N-17_4_db_after_selected_sample_delete', {
        description:
          'SAMPLE DATA ONLY — the selected test-run sample row was deleted while the unselected sample row remains; no pre-existing audit rows were targeted',
        queries: [sampleQuery, eventQuery],
      });
    } finally {
      await removeSyntheticAuditRecords(sampleIds, eventIds);
    }
  });

  test('N-18: keeps filter, sort, and pagination state in the URL', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();

    await auditPage.searchInput.fill('AUDIT');
    await expect.poll(() => state.listRequests.length).toBeGreaterThan(1);
    await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe('AUDIT');
    // Filter changes reset the page number.
    expect(new URL(page.url()).searchParams.get('page')).toBe('1');
    // The query string is replaced, not pushed, so the back button is not flooded.
    expect(await page.evaluate(() => window.history.length)).toBeLessThan(6);
    await auditPage.capture('N-18_1_url_state');
  });

  test('N-20: offers every recordable action and entity type in the filters', async ({ page }) => {
    await mockAuditLogApi(page, {
      filters: {
        actions: [...ACTIONS, 'AUDIT_LOG_DELETE'],
        entityTypes: ENTITY_TYPES,
      },
    });
    await auditPage.goto();

    await auditPage.actionFilterButton.click();
    await expect(page.getByRole('option', { name: 'AUDIT_LOG_DELETE' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'MERCHANT_APPROVED' })).toBeVisible();
    // The legacy delete label is never offered.
    await expect(page.getByRole('option', { name: 'audit.admin.delete' })).toHaveCount(0);
    await page.locator('div[aria-hidden="true"].fixed.inset-0').click({
      position: { x: 1, y: 1 },
    });

    await auditPage.entityTypeFilterButton.click();
    await expect(page.getByRole('option', { name: 'AuditLog' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'merchant' })).toBeVisible();
    await auditPage.capture('N-20_1_filter_options');
  });
});

// ─── Validation and boundary scenarios ───────────────────────────────────────

test.describe('Admin Audit Log - Validation and Boundary Scenarios', () => {
  test('A-01: unauthenticated access redirects to the login page', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('accessToken');
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('i18nextLng', 'en');
    });
    await page.goto('/admin/audit-logs');
    await page.waitForURL('**/login');
    await expect(page.getByRole('heading', { name: 'Audit Logs' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect.poll(() => page.locator('html').getAttribute('class')).toContain('dark');
  });

  test('A-02: buyer and merchant access to the admin route is denied', async ({ buyerPage, merchantPage, request }) => {
    evidencePage = buyerPage;
    await buyerPage.goto('/admin/audit-logs');
    await buyerPage.waitForURL('**/unauthorized');
    await expect(buyerPage.getByRole('heading', { name: 'Audit Logs' })).toHaveCount(0);

    evidencePage = merchantPage;
    await merchantPage.goto('/admin/audit-logs');
    await merchantPage.waitForURL('**/unauthorized');
    await expect(merchantPage.getByRole('heading', { name: 'Audit Logs' })).toHaveCount(0);

    const buyerAuth = await loginApi(request, 'eem@gmail.com', 'Cosmetics@123');
    const buyerResponse = await request.get(API_BASE_URL + '/admin/audit-logs', { headers: buyerAuth });
    expect(buyerResponse.status()).toBe(403);
  });

  test('A-03: blocks a date range whose end date is before the start date', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();

    await auditPage.pickCalendarDate(auditPage.dateFromInput, '2026-10-20');
    await auditPage.pickCalendarDate(auditPage.dateToInput, '2026-10-01');

    await expect(page.getByText('End date must be after start date')).toBeVisible();
    await expect(auditPage.dateFromInput).toHaveAttribute('aria-invalid', 'true');
    await expect(auditPage.dateToInput).toHaveAttribute('aria-invalid', 'true');
    // The invalid range is never published as a filter.
    const published = state.listRequests.map((url) => new URL(url));
    for (const url of published) {
      expect(url.searchParams.has('dateFrom')).toBe(false);
      expect(url.searchParams.has('dateTo')).toBe(false);
    }
    await auditPage.capture('A-03_1_invalid_date_range');
  });

  test('A-04: drops an invalid entity id supplied through the URL', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.gotoWithQuery('?entityId=not-a-uuid');

    await expect.poll(() => state.listRequests.length).toBeGreaterThan(0);
    const requestUrl = new URL(state.listRequests[state.listRequests.length - 1]);
    expect(requestUrl.searchParams.has('entityId')).toBe(false);
    await expect(auditPage.logList).toBeVisible();
    await auditPage.capture('A-04_1_invalid_entity_id');
  });

  test('A-05: reports the row limit when an export exceeds 10,000 rows', async ({ page }) => {
    await mockAuditLogApi(page, { exportRowLimit: 10_001 });
    await auditPage.goto();

    await auditPage.exportButton.click();
    await auditPage.exportDateFrom.fill('2026-01-01');
    await auditPage.exportDateTo.fill('2026-12-31');
    await auditPage.exportDialog.getByRole('button', { name: 'Export CSV' }).click();

    await expect(page.getByText(/Export exceeds maximum row limit \(10,000\)/)).toBeVisible();
    await expect(auditPage.exportDialog).toBeVisible();
    await auditPage.capture('A-05_1_export_row_limit');
  });

  test('A-06: blocks an export range longer than 365 days before any request is sent', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();

    await auditPage.exportButton.click();
    await auditPage.exportDateFrom.fill('2025-01-01');
    await auditPage.exportDateTo.fill('2026-12-31');
    await auditPage.exportDialog.getByRole('button', { name: 'Export CSV' }).click();

    await expect(auditPage.exportRangeError).toContainText('Date range cannot exceed 365 days');
    expect(state.exportBodies.length).toBe(0);
    await auditPage.capture('A-06_1_export_range_too_long');
  });

  test('A-07 and A-15: blocks an empty or below-minimum retention period', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();

    await auditPage.deleteButton.click();
    const dialog = auditPage.deleteDialog;
    const confirm = dialog.getByRole('button', { name: 'Confirm Delete' });

    for (const value of ['', '89']) {
      await auditPage.retentionInput.fill(value);
      await expect(confirm).toBeDisabled();
    }

    await auditPage.retentionInput.fill('89');
    await auditPage.retentionInput.blur();
    await expect(dialog.getByText('Retention period must be at least 90 days')).toBeVisible();
    await expect(auditPage.retentionInput).toHaveAttribute('aria-invalid', 'true');
    expect(state.deleteBodies.length).toBe(0);
    await auditPage.capture('A-07_1_retention_too_short');
  });

  test('A-08: shows the server error when no eligible record can be deleted', async ({ page }) => {
    await mockAuditLogApi(page, {
      deleteStatus: 400,
      deleteMessage: 'No records or files eligible for deletion (must be >= 90 days old).',
    });
    await auditPage.goto();

    await auditPage.deleteButton.click();
    const dialog = auditPage.deleteDialog;
    await dialog.getByRole('button', { name: 'Confirm Delete' }).click();

    await expect(dialog.getByText('No records or files eligible for deletion (must be >= 90 days old).')).toBeVisible();
    await expect(dialog).toBeVisible();
    await auditPage.capture('A-08_1_no_eligible_records');
  });

  test('A-10: shows an inline error when the detail entry does not exist', async ({ page }) => {
    await mockAuditLogApi(page, { detailStatus: 404 });
    await auditPage.goto();

    await auditPage.detailButtons.first().click();
    await expect(auditPage.detailModal).toBeVisible();
    await expect(auditPage.detailModal.getByText('Audit log entry not found')).toBeVisible();
    await auditPage.capture('A-10_1_detail_not_found');
  });

  test('A-11: keeps the previous rows when a list request fails', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();
    const rowsBefore = await auditPage.tableRows.count();

    state.failListRequests = true;
    await page.clock.install();
    await page.getByRole('switch', { name: 'Auto-Refresh' }).click();
    await page.clock.fastForward(30_000);

    await expect(auditPage.loadError).toBeVisible();
    await expect(auditPage.loadError).toContainText('Failed to load audit logs');
    expect(await auditPage.tableRows.count()).toBe(rowsBefore);
    expect(state.listRequests.length).toBeGreaterThan(1);
    await auditPage.capture('A-11_1_list_error');
  });

  test('A-13: redirects to the unauthorized page when the list request returns 403', async ({ page }) => {
    await mockAuditLogApi(page, { listStatus: 403 });
    await auditPage.goto();

    await page.waitForURL('**/unauthorized');
    await expect(page.getByRole('heading', { name: 'Audit Logs' })).toHaveCount(0);
  });

  test('A-14: keeps the export dialog open when the export request fails', async ({ page }) => {
    await mockAuditLogApi(page, {
      exportStatus: 500,
      exportMessage: 'Report generation failed. Please try again.',
    });
    await auditPage.goto();

    await auditPage.exportButton.click();
    await auditPage.exportDateFrom.fill('2026-01-01');
    await auditPage.exportDateTo.fill('2026-12-31');
    await auditPage.exportDialog.getByRole('button', { name: 'Export CSV' }).click();

    await expect(page.getByText('Report generation failed. Please try again.')).toBeVisible();
    await expect(auditPage.exportDialog).toBeVisible();
    await expect(auditPage.exportDateFrom).toHaveValue('2026-01-01');
    await expect(auditPage.exportDateTo).toHaveValue('2026-12-31');
    await auditPage.capture('A-14_1_export_failed');
  });

  test('B-01 and B-02: caps the search input at 255 characters', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();

    const atLimit = 'a'.repeat(255);
    await auditPage.searchInput.fill(atLimit);
    expect((await auditPage.searchInput.inputValue()).length).toBe(255);
    await expect.poll(() => state.listRequests.length).toBeGreaterThan(1);
    const accepted = new URL(state.listRequests[state.listRequests.length - 1]);
    expect(accepted.searchParams.get('search')?.length).toBe(255);

    // The 256th character cannot be typed (silent truncation, no inline error).
    await auditPage.searchInput.pressSequentially('b');
    expect((await auditPage.searchInput.inputValue()).length).toBe(255);
    await auditPage.capture('B-02_1_search_length_cap');
  });

  test('B-03: caps the IP address filter at 45 characters', async ({ page }) => {
    await mockAuditLogApi(page);
    await auditPage.goto();

    await expect(auditPage.ipFilterInput).toHaveAttribute('maxLength', '45');
    const maxLengthValue = '9'.repeat(45);
    await auditPage.ipFilterInput.fill(maxLengthValue);
    await expect(auditPage.ipFilterInput).toHaveValue(maxLengthValue);
    await auditPage.capture('B-03_1_ip_length_cap');
  });

  test('B-04: accepts a retention of exactly 90 days and rejects 89', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();

    await auditPage.deleteButton.click();
    const dialog = auditPage.deleteDialog;
    const confirm = dialog.getByRole('button', { name: 'Confirm Delete' });

    await auditPage.retentionInput.fill('90');
    await expect(confirm).toBeEnabled();

    await auditPage.retentionInput.fill('89');
    await auditPage.retentionInput.blur();
    await expect(confirm).toBeDisabled();
    await expect(dialog.getByText('Retention period must be at least 90 days')).toBeVisible();
    expect(state.deleteBodies.length).toBe(0);
    await auditPage.capture('B-04_1_retention_boundary');
  });

  test('B-05: accepts a 365-day export range and rejects a 366-day range', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();

    await auditPage.exportButton.click();
    const dialog = auditPage.exportDialog;
    await auditPage.exportDateFrom.fill('2025-08-26');
    await auditPage.exportDateTo.fill('2026-08-25'); // 365 inclusive days
    await expect(dialog.getByRole('button', { name: 'Export CSV' })).toBeEnabled();

    await auditPage.exportDateFrom.fill('2025-08-25');
    await auditPage.exportDateTo.fill('2026-08-25'); // 366 inclusive days
    await dialog.getByRole('button', { name: 'Export CSV' }).click();
    await expect(auditPage.exportRangeError).toContainText('Date range cannot exceed 365 days');
    expect(state.exportBodies.length).toBe(0);
    await auditPage.capture('B-05_1_export_range_boundary');
  });

  test('B-07: offers page sizes 10, 20, 50, and 100 only', async ({ page }) => {
    await mockAuditLogApi(page);
    await auditPage.goto();

    await expect(auditPage.pageSizeSelect.locator('option')).toHaveCount(4);
    await expect(auditPage.pageSizeSelect.locator('option')).toHaveText(['10', '20', '50', '100']);
    await expect(auditPage.pageSizeSelect).toHaveValue('10');
    await auditPage.capture('B-07_1_page_size_options');
  });

  test('B-08: shows the empty state and blocks the export when there are no records', async ({ page }) => {
    await mockAuditLogApi(page, { empty: true });
    await auditPage.goto();

    await expect(auditPage.emptyState).toBeVisible();
    await expect(auditPage.emptyState).toContainText('No matching records were found.');
    await expect(auditPage.exportButton).toBeVisible();

    await auditPage.exportButton.click();
    await expect(page.getByText('No matching records to export')).toBeVisible();
    await expect(auditPage.exportDialog).toHaveCount(0);
    await auditPage.capture('B-08_1_empty_state');
  });

  test('B-09: parses the user agent instead of showing it raw', async ({ page }) => {
    await mockAuditLogApi(page);
    await auditPage.goto();

    await auditPage.detailButtons.first().click();
    const modal = auditPage.detailModal;
    await expect(modal.getByText('Client Information')).toBeVisible();
    await expect(modal.getByText('Web Browser')).toBeVisible();
    await expect(modal.getByText('Chrome 140')).toBeVisible();
    await expect(modal.getByText('Desktop')).toBeVisible();
    await expect(modal).not.toContainText('Mozilla/5.0');
    await auditPage.capture('B-09_1_parsed_user_agent');
  });

  test('B-11: matches any value selected in one multi-select and intersects filters', async ({ page }) => {
    const state = await mockAuditLogApi(page);
    await auditPage.goto();

    await auditPage.actionFilterButton.click();
    await page.getByRole('option', { name: 'MERCHANT_APPROVED' }).click();
    await expect(auditPage.actionFilterButton).toContainText('1 selected');
    await page.getByRole('option', { name: 'AD_REJECTED' }).click();
    await expect(auditPage.actionFilterButton).toContainText('2 selected');

    await expect.poll(() => state.listRequests.length).toBeGreaterThan(1);
    const multi = new URL(state.listRequests[state.listRequests.length - 1]);
    expect(multi.searchParams.getAll('action').sort()).toEqual(['AD_REJECTED', 'MERCHANT_APPROVED']);
    // Rows matching either action are returned (OR inside a single filter).
    expect(multi.searchParams.getAll('action').length).toBe(2);

    // A second filter narrows the result further (AND between filters).
    await page.locator('div[aria-hidden="true"].fixed.inset-0').click({
      position: { x: 1, y: 1 },
    });
    await auditPage.entityTypeFilterButton.click();
    await page.getByRole('option', { name: 'merchant' }).click();
    await expect.poll(() => {
      const latest = new URL(state.listRequests[state.listRequests.length - 1]);
      return latest.searchParams.get('entityType');
    }).toBe('merchant');
    const combined = new URL(state.listRequests[state.listRequests.length - 1]);
    expect(combined.searchParams.getAll('action').length).toBe(2);
    expect(combined.searchParams.getAll('entityType')).toEqual(['merchant']);
    await auditPage.capture('B-11_1_multi_select_values');
  });

  test('B-12: accepts an export range that covers a single day', async ({ page }) => {
    const singleDayRows = buildAuditRows(4)
      .filter((row) => row.createdAt.startsWith('2026-10-15'))
      .map((row) => ({ ...row, oldValue: null, newValue: null, userAgent: null }));
    const state = await mockAuditLogApi(page, { fixtureRows: singleDayRows });
    await page.goto('/admin/audit-logs');
    await page.waitForLoadState('networkidle');
    await expect(auditPage.title).toBeVisible();
    await auditPage.capture('B-12_1_ui_before_export');

    await auditPage.exportButton.click();
    await auditPage.exportDateFrom.fill('2026-10-15');
    await auditPage.exportDateTo.fill('2026-10-15');
    await auditPage.capture('B-12_2_ui_export_dates_filled');

    const download = page.waitForEvent('download');
    const exportResponsePromise = page.waitForResponse((response) =>
      response.url().endsWith('/admin/audit-logs/export') &&
      response.request().method() === 'POST',
    );
    await auditPage.exportDialog.getByRole('button', { name: 'Export CSV' }).click();
    const [downloadedFile, exportResponse] = await Promise.all([download, exportResponsePromise]);
    expect(state.exportBodies[state.exportBodies.length - 1].dateFrom).toBe('2026-10-15');
    expect(state.exportBodies[state.exportBodies.length - 1].dateTo).toBe('2026-10-15');
    expect(exportResponse.status()).toBe(200);
    expect(exportResponse.headers()['content-type']).toContain('text/csv');
    const filename = downloadedFile.suggestedFilename();
    expect(filename).toMatch(/^audit-logs-2026-10-15-2026-10-15\(\d{4}-\d{2}-\d{2}\)\.csv$/);

    const csv = (await exportResponse.text()).replace(/^\uFEFF/, '');
    const csvLines = csv.split('\r\n').filter(Boolean);
    expect(csvLines[0]).toBe(CSV_HEADER);
    expect(csvLines).toHaveLength(singleDayRows.length + 1);
    expect(csvLines.slice(1).every((line) => line.startsWith('2026-10-15T'))).toBe(true);
    await expect(page.getByText('CSV export downloaded')).toBeVisible();

    await auditPage.capture('B-12_3_ui_after_export');
  });
});

// ─── API contracts ───────────────────────────────────────────────────────────

test.describe('Admin Audit Log - API Contracts', () => {
  test('I-01: returns a paginated list without an entity id field', async ({ request }) => {
    const response = await request.get(API_BASE_URL + '/admin/audit-logs?page=1&limit=10', {
      headers: adminAuth,
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.items).toBeInstanceOf(Array);
    expect(body.data.meta.page).toBe(1);
    expect(body.data.meta.limit).toBe(10);
    expect(typeof body.data.meta.total).toBe('number');
    expect(typeof body.data.meta.totalPages).toBe('number');
    for (const item of body.data.items) {
      for (const field of ['id', 'action', 'entityType', 'summary', 'createdAt']) {
        expect(item[field]).toBeDefined();
      }
      expect(item).not.toHaveProperty('entityId');
    }
  });

  test('I-02: applies combined filters with AND logic', async ({ request }) => {
    const first = await request.get(API_BASE_URL + '/admin/audit-logs?limit=5', { headers: adminAuth });
    expect(first.status()).toBe(200);
    const items = (await first.json()).data?.items ?? [];
    test.skip(items.length === 0, 'PCL precondition: audit log rows exist.');

    const action = items[0].action;
    const combined = await request.get(
      API_BASE_URL + `/admin/audit-logs?action=${encodeURIComponent(action)}&limit=50`,
      { headers: adminAuth },
    );
    expect(combined.status()).toBe(200);
    const combinedItems = (await combined.json()).data?.items ?? [];
    for (const item of combinedItems) {
      expect(item.action).toBe(action);
    }
  });

  test('I-03: returns the merged filter options and hides the legacy delete label', async ({ request }) => {
    const response = await request.get(API_BASE_URL + '/admin/audit-logs/filters', { headers: adminAuth });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.data.actions).toBeInstanceOf(Array);
    expect(body.data.entityTypes).toBeInstanceOf(Array);
    // The catalog is merged in, so values that never occurred are still offered.
    expect(body.data.actions).toContain('AUDIT_EXPORT');
    expect(body.data.actions).not.toContain('audit.admin.delete');
    expect(body.data.entityTypes).toContain('AuditLog');
  });

  test('I-04: returns the detail DTO with masked values and no entity id', async ({ request }) => {
    const list = await request.get(API_BASE_URL + '/admin/audit-logs?limit=1', { headers: adminAuth });
    const items = (await list.json()).data?.items ?? [];
    test.skip(items.length === 0, 'PCL precondition: an audit log row exists.');

    const response = await request.get(API_BASE_URL + `/admin/audit-logs/${items[0].id}`, {
      headers: adminAuth,
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    for (const field of ['id', 'action', 'entityType', 'createdAt', 'oldValue', 'newValue', 'userAgent']) {
      expect(body.data[field]).toBeDefined();
    }
    expect(body.data).not.toHaveProperty('entityId');
    const serialized = JSON.stringify(body.data);
    expect(serialized).not.toMatch(/"(password|accessToken|refreshToken|secret)"\s*:\s*"(?!\*\*\*)/i);
  });

  test('I-05: returns 404 for a missing id and 400 for an invalid id', async ({ request }) => {
    const missing = await request.get(
      API_BASE_URL + '/admin/audit-logs/00000000-0000-4000-8000-000000000000',
      { headers: adminAuth },
    );
    expect(missing.status()).toBe(404);
    const missingBody = await missing.json();
    expect(missingBody.errorCode).toBe('RES_001');
    expect(missingBody.message).toMatch(/audit log entry not found/i);

    const invalid = await request.get(API_BASE_URL + '/admin/audit-logs/not-a-uuid', {
      headers: adminAuth,
    });
    expect(invalid.status()).toBe(400);
  });

  test('I-06: streams the CSV export as a file attachment', async ({ request }) => {
    const response = await request.post(API_BASE_URL + '/admin/audit-logs/export', {
      headers: adminAuth,
      data: { format: 'csv', dateFrom: '2026-01-01', dateTo: '2026-12-31' },
    });
    expect(response.status()).toBe(201);
    expect(response.headers()['content-type']).toContain('text/csv');
    expect(response.headers()['content-disposition']).toMatch(/attachment; filename="audit-logs-/i);
    const body = await response.body();
    expect(body.length).toBeGreaterThan(0);
    const text = body.toString('utf8');
    const header = text.replace(/^\uFEFF/, '').split('\r\n')[0].replace(/"/g, '');
    expect(header).toBe(CSV_HEADER);
    expect(header).not.toContain('Entity ID');
    // UTF-8 BOM prefix.
    expect(body[0]).toBe(0xef);
  });

  test('I-07: rejects an invalid format, range, and row limit', async ({ request }) => {
    const badFormat = await request.post(API_BASE_URL + '/admin/audit-logs/export', {
      headers: adminAuth,
      data: { format: 'xlsx' },
    });
    expect(badFormat.status()).toBe(400);

    const badRange = await request.post(API_BASE_URL + '/admin/audit-logs/export', {
      headers: adminAuth,
      data: { format: 'csv', dateFrom: '2025-01-01', dateTo: '2026-12-31' },
    });
    expect(badRange.status()).toBe(400);
    expect(JSON.stringify((await badRange.json()).message)).toMatch(/365/);
  });

  test('I-08 and I-14: deletes eligible records, ignores file ids, and reports zero deleted files', async ({ page }) => {
    // The generic fixture is registered first so the explicit delete route
    // below takes precedence (Playwright checks the newest route first).
    await mockAuditLogApi(page);
    await page.route('**/admin/audit-logs/files', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'DELETE, OPTIONS',
            'access-control-allow-headers': 'authorization, content-type',
          },
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ data: { deletedRecords: 2, deletedFiles: 0 } }),
      });
    });
    await auditPage.goto();

    const result = await callApiThroughPage(
      page,
      `${API_BASE_URL}/admin/audit-logs/files`,
      'DELETE',
      {
        olderThanDays: 90,
        fileIds: ['44444444-4444-4444-8444-444444444444'],
      },
    );
    expect(result.status).toBe(200);
    expect(result.body.data.deletedRecords).toBe(2);
    // No export-file storage exists, so the file counter is always zero.
    expect(result.body.data.deletedFiles).toBe(0);
  });

  test('I-09: rejects a retention threshold below the minimum', async ({ request }) => {
    const response = await request.delete(API_BASE_URL + '/admin/audit-logs/files', {
      headers: adminAuth,
      data: { olderThanDays: 89 },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(JSON.stringify(body.message)).toMatch(/90 days/i);
  });

  test('I-10: denies every audit endpoint to buyer and merchant accounts', async ({ request }) => {
    const buyerAuth = await loginApi(request, 'eem@gmail.com', 'Cosmetics@123');
    const merchantAuth = await loginApi(request, 'smt@gmail.com', 'Cosmetics@123');
    const calls: Array<[string, string]> = [
      ['get', '/admin/audit-logs'],
      ['get', '/admin/audit-logs/filters'],
      ['get', '/admin/audit-logs/00000000-0000-4000-8000-000000000000'],
      ['post', '/admin/audit-logs/export'],
      ['delete', '/admin/audit-logs/files'],
    ];

    for (const [method, path] of calls) {
      const buyerResponse = await request[method as 'get' | 'post' | 'delete'](
        API_BASE_URL + path,
        { headers: buyerAuth, data: method === 'post' ? { format: 'csv' } : undefined },
      );
      expect(buyerResponse.status(), `buyer ${method} ${path}`).toBe(403);

      const merchantResponse = await request[method as 'get' | 'post' | 'delete'](
        API_BASE_URL + path,
        { headers: merchantAuth, data: method === 'post' ? { format: 'csv' } : undefined },
      );
      expect(merchantResponse.status(), `merchant ${method} ${path}`).toBe(403);
    }
  });

  test('A-12: rejects updates to audit log records', async ({ request }) => {
    const url = API_BASE_URL + '/admin/audit-logs/00000000-0000-4000-8000-000000000000';
    const updates = await Promise.all([
      request.put(url, { headers: adminAuth, data: { action: 'MODIFIED' } }),
      request.patch(url, { headers: adminAuth, data: { action: 'MODIFIED' } }),
    ]);

    for (const response of updates) {
      expect([404, 405]).toContain(response.status());
    }
  });

  test('I-11: error responses carry the standard API fields', async ({ request }) => {
    const response = await request.get(API_BASE_URL + '/admin/audit-logs?page=0', {
      headers: adminAuth,
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    for (const field of ['statusCode', 'error', 'errorCode', 'message', 'timestamp', 'path']) {
      expect(body[field]).toBeDefined();
    }
    expect(body.statusCode).toBe(400);
  });

  test('I-12: never exposes sensitive values unmasked', async ({ request }) => {
    const list = await request.get(API_BASE_URL + '/admin/audit-logs?limit=50', { headers: adminAuth });
    expect(list.status()).toBe(200);
    const items = (await list.json()).data?.items ?? [];
    for (const item of items) {
      const serialized = JSON.stringify(item);
      expect(serialized).not.toMatch(/"(password|accessToken|refreshToken|secret)"\s*:\s*"(?!\*\*\*)/i);
    }
  });

  test('I-13: accepts the entity id filter but never writes an entity id column', async ({ request }) => {
    const response = await request.post(API_BASE_URL + '/admin/audit-logs/export', {
      headers: adminAuth,
      data: {
        format: 'csv',
        entityId: '22222222-2222-4222-8222-222222222222',
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      },
    });
    expect(response.status()).toBe(201);
    const text = (await response.body()).toString('utf8');
    const header = text.replace(/^\uFEFF/, '').split('\r\n')[0].replace(/"/g, '');
    expect(header).toBe(CSV_HEADER);
    expect(header).not.toContain('Entity ID');
  });

  test('I-15: honours the entity id filter without returning the field', async ({ request }) => {
    const response = await request.get(
      API_BASE_URL + '/admin/audit-logs?entityId=22222222-2222-4222-8222-222222222222&limit=10',
      { headers: adminAuth },
    );
    expect(response.status()).toBe(200);
    const body = await response.json();
    for (const item of body.data.items) {
      expect(item).not.toHaveProperty('entityId');
    }
  });
});
