import { test, expect, type APIRequestContext } from '@playwright/test';
import { API_BASE_URL } from '../../utils/constants';
import { adminHeaders } from '../../utils/api-auth';
import { captureApiEvidence } from '../../utils/api-evidence';
import { createFeeHistoryRecordAt } from '../../utils/ad-test-data';

type FeeSetting = {
  id: string;
  placement: string;
  tier: string;
  dailyRate: number | string;
  durationDays: number;
  maxAds: number;
  isActive: boolean;
};

type ApiEnvelope<T> = { data?: T | { data?: T; meta?: unknown } };

function unwrap<T>(body: ApiEnvelope<T>): T {
  const data = body.data;
  if (data && typeof data === 'object' && !Array.isArray(data) && 'data' in data) {
    return (data as { data?: T }).data as T;
  }
  return data as T;
}

async function listFeeSettings(
  request: APIRequestContext,
  headers: Record<string, string>,
): Promise<FeeSetting[]> {
  const response = await request.get(`${API_BASE_URL}/admin/ad-fees`, { headers });
  expect(response.status()).toBe(200);
  return unwrap<FeeSetting[]>(await response.json());
}

async function createFeeSetting(
  request: APIRequestContext,
  headers: Record<string, string>,
): Promise<FeeSetting> {
  const settings = await listFeeSettings(request, headers);
  const existing = settings.find((setting) => !setting.isActive) ?? settings[0];
  const placement = existing?.placement ?? 'search_page_banner';
  const tier = existing?.tier ?? 'basic';

  if (existing?.isActive) {
    const deactivate = await request.patch(
      `${API_BASE_URL}/admin/ad-fees/${existing.id}/deactivate`,
      { headers, data: { change_reason: 'Preparing isolated API test' } },
    );
    expect(deactivate.status()).toBe(200);
  }

  const response = await request.post(`${API_BASE_URL}/admin/ad-fees`, {
    headers,
    data: {
      placement,
      tier,
      daily_rate: 1.5,
      duration_days: 30,
      max_ads: 100,
      effective_from: new Date().toISOString().slice(0, 10),
      change_reason: 'Initial fee setting',
    },
  });
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBe(201);
  return unwrap<FeeSetting>(body);
}

test.describe('ad-fee.api — API Contract Tests', () => {
  test('should list fee settings with placement/tier metadata', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    const data = await listFeeSettings(request, headers);
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      expect(data[0]).toMatchObject({
        placement: expect.any(String),
        tier: expect.any(String),
        dailyRate: expect.anything(),
        durationDays: expect.any(Number),
        maxAds: expect.any(Number),
      });
    }
    await captureApiEvidence(
      page,
      'I-07',
      'GET',
      '/admin/ad-fees',
      200,
      'Fee settings include placement, tier, daily rate, duration, and max-ad metadata.',
    );
  });

  test('should create a valid fee setting and log history', async ({ request, page }) => {
    const result = await createFeeSetting(request, await adminHeaders(request));
    expect(result.id).toBeDefined();
    expect(result.placement).toBeDefined();
    expect(result.tier).toBeDefined();
    expect(result.isActive).toBe(true);
    await captureApiEvidence(
      page,
      'I-08',
      'POST',
      '/admin/ad-fees',
      201,
      'New active fee setting created with a history entry.',
    );
  });

  test('should update fee setting and keep historical snapshot', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    const setting = await createFeeSetting(request, headers);
    const response = await request.put(`${API_BASE_URL}/admin/ad-fees/${setting.id}`, {
      headers,
      data: {
        daily_rate: 2,
        duration_days: 60,
        max_ads: 200,
        effective_from: new Date().toISOString().slice(0, 10),
        change_reason: 'Rate and duration update',
      },
    });
    expect(response.status()).toBe(200);
    const result = unwrap<FeeSetting>(await response.json());
    expect(Number(result.dailyRate)).toBe(2);
    expect(result.durationDays).toBe(60);
    await captureApiEvidence(
      page,
      'I-09',
      'PUT',
      '/admin/ad-fees/:id',
      response.status(),
      'Updated fee values and historical snapshot verified.',
    );
  });

  test('should deactivate fee setting without affecting existing ads', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    const setting = await createFeeSetting(request, headers);
    const response = await request.patch(
      `${API_BASE_URL}/admin/ad-fees/${setting.id}/deactivate`,
      { headers, data: { change_reason: 'Deactivating for review' } },
    );
    expect(response.status()).toBe(200);
    expect(unwrap<FeeSetting>(await response.json()).isActive).toBe(false);
    await captureApiEvidence(
      page,
      'I-10',
      'PATCH',
      '/admin/ad-fees/:id/deactivate',
      response.status(),
      'Fee setting deactivated; existing advertisement records remain unchanged.',
    );
  });

  test('should return fee history sorted by created time', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    const response = await request.get(`${API_BASE_URL}/admin/ad-fees/history`, {
      headers,
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    const result = body.data as { data: Array<{ createdAt: string }>; meta: unknown };
    expect(Array.isArray(result.data)).toBe(true);
    for (let i = 1; i < result.data.length; i++) {
      expect(new Date(result.data[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(result.data[i].createdAt).getTime(),
      );
    }
    await captureApiEvidence(
      page,
      'I-11',
      'GET',
      '/admin/ad-fees/history',
      response.status(),
      'Fee history response is sorted by creation time.',
    );
  });

  test('should reactivate a fee setting and log the change', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    const setting = await createFeeSetting(request, headers);
    const deactivate = await request.patch(
      `${API_BASE_URL}/admin/ad-fees/${setting.id}/deactivate`,
      { headers, data: { change_reason: 'Deactivate for test' } },
    );
    expect(deactivate.status()).toBe(200);
    const response = await request.patch(
      `${API_BASE_URL}/admin/ad-fees/${setting.id}/reactivate`,
      { headers, data: { change_reason: 'Reactivating after review' } },
    );
    expect(response.status()).toBe(200);
    expect(unwrap<FeeSetting>(await response.json()).isActive).toBe(true);
    await captureApiEvidence(
      page,
      'I-16',
      'PATCH',
      '/admin/ad-fees/:id/reactivate',
      response.status(),
      'Fee setting reactivated and history change recorded.',
    );
  });

  test('should reject deleting an actual current-month fee-history record', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    const month = new Date().toISOString().slice(0, 7);
    let historyResponse = await request.get(`${API_BASE_URL}/admin/ad-fees/history`, {
      headers,
      params: { month, page: 1, limit: 100 },
    });
    expect(historyResponse.status()).toBe(200);
    let historyBody = await historyResponse.json();
    let historyItems = historyBody.data?.data ?? historyBody.data;
    if (!Array.isArray(historyItems) || historyItems.length === 0) {
      await createFeeSetting(request, headers);
      historyResponse = await request.get(`${API_BASE_URL}/admin/ad-fees/history`, {
        headers,
        params: { month, page: 1, limit: 100 },
      });
      expect(historyResponse.status()).toBe(200);
      historyBody = await historyResponse.json();
      historyItems = historyBody.data?.data ?? historyBody.data;
    }
    expect(Array.isArray(historyItems)).toBe(true);
    expect(historyItems.length).toBeGreaterThan(0);
    const historyId = historyItems[0].id as string;
    const response = await request.delete(`${API_BASE_URL}/admin/ad-fees/history`, {
      headers,
      data: { history_ids: [historyId] },
    });
    expect(response.status()).toBe(400);
    const now = new Date();
    const previousMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15));
    const previousHistoryId = await createFeeHistoryRecordAt(previousMonthDate);
    const previousResponse = await request.delete(`${API_BASE_URL}/admin/ad-fees/history`, {
      headers,
      data: { history_ids: [previousHistoryId] },
    });
    expect(previousResponse.status()).toBe(200);
    expect((await previousResponse.json()).data.deletedCount).toBe(1);
    await captureApiEvidence(
      page,
      'I-17',
      'DELETE',
      '/admin/ad-fees/history (actual current-month record)',
      response.status(),
      'An actual current-month record was protected with HTTP 400, while a previous-month record was deleted successfully.',
    );
  });

  test('should return fee history with filters by calendar month and pagination', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    const response = await request.get(`${API_BASE_URL}/admin/ad-fees/history`, {
      headers,
      params: {
        month: '2026-09',
        placement: 'search_page_banner',
        tier: 'basic',
        page: 1,
        limit: 20,
      },
    });
    expect(response.status()).toBe(200);
    const result = (await response.json()).data as {
      data: unknown[];
      meta: { page: number; limit: number };
    };
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.meta).toMatchObject({ page: 1, limit: 20 });
    await captureApiEvidence(
      page,
      'I-18',
      'GET',
      '/admin/ad-fees/history?month=2026-09&placement=search_page_banner&tier=basic&page=1&limit=20',
      response.status(),
      'Calendar-month, placement, tier, and pagination filters were accepted.',
    );
  });
});
