import type { APIRequestContext, Page } from '@playwright/test';
import { API_BASE_URL } from './constants';

const PASSWORD = 'TestPass123!';
const ADMIN = { email: 'pet@gmail.com', password: 'Cosmetics@123' };

export async function getBearerFromPage(page: Page): Promise<string> {
  return page.evaluate(() => localStorage.getItem('accessToken') ?? '');
}

export async function authHeaders(page: Page): Promise<Record<string, string>> {
  const token = await getBearerFromPage(page);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function loginApi(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<Record<string, string>> {
  const res = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email, password },
  });
  const body = await res.json();
  const token = body.accessToken || body.data?.accessToken;
  if (!token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(body)}`);
  }
  return { Authorization: `Bearer ${token}` };
}

export async function adminHeaders(request: APIRequestContext) {
  return loginApi(request, ADMIN.email, ADMIN.password);
}

export async function registerPendingMerchant(request: APIRequestContext): Promise<{
  email: string;
  password: string;
}> {
  const stamp = Date.now();
  const email = `e2e.pm.${stamp}@test.com`;
  const license = Buffer.from('%PDF-1.4\n% E2E license\n%%EOF');

  const res = await request.post(`${API_BASE_URL}/auth/register`, {
    multipart: {
      name: `E2E Merchant ${stamp}`,
      email,
      password: PASSWORD,
      role: 'merchant',
      license: {
        name: 'license.pdf',
        mimeType: 'application/pdf',
        buffer: license,
      },
    },
  });
  if (!res.ok()) {
    throw new Error(`Merchant register failed: ${res.status()} ${await res.text()}`);
  }
  return { email, password: PASSWORD };
}

export async function rejectMerchantByEmail(
  request: APIRequestContext,
  email: string,
  reason = 'E2E rejected license',
): Promise<void> {
  const headers = await adminHeaders(request);
  const listRes = await request.get(
    `${API_BASE_URL}/admin/merchants?status=pending&limit=100`,
    { headers },
  );
  const listBody = await listRes.json();
  const items = listBody.data?.items ?? listBody.items ?? listBody.data ?? [];
  const merchant = (items as Array<{ id: string; user?: { email?: string } }>).find(
    (m) => m.user?.email === email,
  );
  if (!merchant) {
    throw new Error(`Pending merchant not found for ${email}`);
  }
  const patchRes = await request.patch(
    `${API_BASE_URL}/admin/merchants/${merchant.id}/status`,
    {
      headers,
      data: { status: 'rejected', reason },
    },
  );
  if (!patchRes.ok()) {
    throw new Error(`Reject failed: ${patchRes.status()} ${await patchRes.text()}`);
  }
}

export async function firstCategoryId(
  request: APIRequestContext,
  headers?: Record<string, string>,
): Promise<string> {
  const res = await request.get(`${API_BASE_URL}/categories`, { headers });
  const body = await res.json();
  const list = body.data ?? body;
  const flat: Array<{ id?: string; children?: Array<{ id?: string }> }> = Array.isArray(list)
    ? list
    : [];
  const first = flat[0];
  if (!first?.id && !flat[0]?.children?.[0]?.id) {
    throw new Error(`No categories returned: ${JSON.stringify(body)}`);
  }
  return (first.id || flat[0].children![0].id)!;
}
