import { spawnSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { test, expect } from '../../fixtures/auth.fixture';
import { API_BASE_URL } from '../../utils/constants';
import { adminHeaders } from '../../utils/api-auth';
import { createPendingAds, deleteAds } from '../../utils/ad-test-data';
import { captureApiEvidence } from '../../utils/api-evidence';
import { captureScreenshot } from '../../utils/screenshot';

test.describe('ad-management.api — API Contract Tests', () => {
  test('A-18: backend service continues after a refund failure', async ({ page }) => {
    const backendDir = path.resolve(process.cwd(), '../backend');
    const jestCli = path.join(backendDir, 'node_modules/jest/bin/jest.js');
    const resultPath = path.join(tmpdir(), `ad-management-a18-${process.pid}-${Date.now()}.json`);
    try {
      const result = spawnSync(
        process.execPath,
        [
          jestCli,
          '--runInBand',
          '--runTestsByPath',
          'src/modules/admin/advertisement-management/admin-ad-management.service.spec.ts',
          '--testNamePattern=bulk reject logs refund failures and continues',
          '--json',
          `--outputFile=${resultPath}`,
        ],
        { cwd: backendDir, encoding: 'utf8', timeout: 120_000, windowsHide: true },
      );
      if (result.error) throw result.error;
      expect(result.status).toBe(0);

      type JestJsonResult = {
        numPassedTests: number;
        testResults: Array<{
          assertionResults: Array<{ fullName: string; status: string }>;
        }>;
      };
      const jestResult = JSON.parse(readFileSync(resultPath, 'utf8')) as JestJsonResult;
      expect(jestResult.numPassedTests).toBe(1);
      expect(
        jestResult.testResults
          .flatMap((suite) => suite.assertionResults)
          .some(
            (assertion) =>
              assertion.status === 'passed' &&
              assertion.fullName.includes('bulk reject logs refund failures and continues'),
          ),
      ).toBe(true);
    } finally {
      if (existsSync(resultPath)) unlinkSync(resultPath);
    }

    await page.setContent(`<!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <style>
            body { margin: 0; padding: 36px; background: #f4f6fb; color: #182230; font: 16px/1.5 Arial, sans-serif; }
            main { max-width: 900px; margin: auto; padding: 32px; border: 1px solid #d8dee8; border-radius: 12px; background: white; }
            h1 { margin: 0 0 24px; font-size: 24px; }
            dl { display: grid; grid-template-columns: 190px 1fr; gap: 12px 20px; margin: 0; }
            dt { color: #536273; font-weight: 700; }
            dd { margin: 0; overflow-wrap: anywhere; font-family: Consolas, monospace; }
            .pass { color: #087443; font-weight: 700; }
            .note { margin-top: 24px; color: #536273; }
          </style>
        </head>
        <body>
          <main>
            <h1>A-18 - Backend service test evidence</h1>
            <dl>
              <dt>Test</dt><dd>bulk reject logs refund failures and continues</dd>
              <dt>Failure injection</dt><dd>Prisma adPayment.findFirst mock rejects</dd>
              <dt>Verified outcome</dt><dd>2 ads rejected; refundsFailed = 1; refundsProcessed = 1; one result failed and the next processed</dd>
              <dt>Jest result</dt><dd class="pass">PASS</dd>
            </dl>
            <p class="note">This is backend unit-test evidence. The failure is mocked; it is not a live API response.</p>
          </main>
        </body>
      </html>`);
    await captureScreenshot(
      page,
      'A-18_1_backend_unit_test',
      'The passing backend service unit test verifies two ads are rejected, one refund fails, and the next is processed.',
    );
  });

  test('should return paginated ads for admin with filters', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    const res = await request.get(`${API_BASE_URL}/admin/ads`, {
      headers,
      params: {
        status: 'pending',
        page: 1,
        limit: 20,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.data).toBeDefined();
    expect(body.data.meta).toBeDefined();
    expect(body.data.meta.total).toBeGreaterThanOrEqual(0);
    await captureApiEvidence(
      page,
      'I-01',
      'GET',
      '/admin/ads?status=pending&page=1&limit=20',
      res.status(),
      'Validated paginated data and metadata response.',
    );
  });

  test('should return full detail for a single advertisement', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    // First get a list to obtain an ad ID
    const listRes = await request.get(`${API_BASE_URL}/admin/ads`, {
      headers,
      params: { page: 1, limit: 1 },
    });
    const listBody = await listRes.json();
    const adId = listBody.data?.data?.[0]?.id || listBody.data?.data?.data?.[0]?.id;
    expect(adId).toBeDefined();
    const res = await request.get(`${API_BASE_URL}/admin/ads/${adId}`, {
      headers,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const detail = body.data?.data || body.data;
    expect(detail.shopName).toBeDefined();
    expect(detail.title).toBeDefined();
    expect(detail.approvalStatus).toBeDefined();
    await captureApiEvidence(
      page,
      'I-02',
      'GET',
      '/admin/ads/:id',
      res.status(),
      'Validated advertisement detail response.',
    );
  });

  test('should approve a pending ad and set approval metadata', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    const [adId] = await createPendingAds();
    try {
      const res = await request.post(`${API_BASE_URL}/admin/ads/${adId}/approve`, {
        headers,
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      const result = body.data?.data || body.data;
      expect(result.approvalStatus).toBe('approved');
      expect(result.approvedBy).toBeDefined();
      expect(result.approvedAt).toBeDefined();
      await captureApiEvidence(
        page,
        'I-03',
        'POST',
        '/admin/ads/:id/approve',
        res.status(),
        'Advertisement approved with admin and timestamp metadata.',
      );
    } finally {
      await deleteAds([adId]);
    }
  });

  test('should reject a pending ad and trigger refund', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    const [adId] = await createPendingAds();
    try {
      const res = await request.post(`${API_BASE_URL}/admin/ads/${adId}/reject`, {
        headers,
        data: { rejection_reason: 'Test rejection reason' },
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      const result = body.data?.data || body.data;
      expect(result.approvalStatus).toBe('rejected');
      expect(result.rejectionReason).toBe('Test rejection reason');
      const detailResponse = await request.get(`${API_BASE_URL}/admin/ads/${adId}`, { headers });
      expect(detailResponse.status()).toBe(200);
      expect((await detailResponse.json()).data.paymentInfo.paymentStatus).toBe('refunded');
      await captureApiEvidence(
        page,
        'I-04',
        'POST',
        '/admin/ads/:id/reject',
        res.status(),
        'Advertisement rejected; reason and refunded payment verified.',
      );
    } finally {
      await deleteAds([adId]);
    }
  });

  test('should bulk approve only pending ads within limit', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    const adIds = await createPendingAds(2);
    try {
      const res = await request.post(`${API_BASE_URL}/admin/ads/bulk/approve`, {
        headers,
        data: { ad_ids: adIds },
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      const result = body.data?.data || body.data;
      expect(result.approved).toBe(2);
      expect(result.failed).toBeDefined();
      expect(result.results).toHaveLength(2);
      await captureApiEvidence(
        page,
        'I-05',
        'POST',
        '/admin/ads/bulk/approve',
        res.status(),
        'Two pending advertisements approved; batch results verified.',
      );
    } finally {
      await deleteAds(adIds);
    }
  });

  test('should bulk reject ads and include refund summary', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    const adIds = await createPendingAds(2);
    try {
      const res = await request.post(`${API_BASE_URL}/admin/ads/bulk/reject`, {
        headers,
        data: {
          ad_ids: adIds,
          rejection_reason: 'Common rejection reason',
        },
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      const result = body.data?.data || body.data;
      expect(result.rejected).toBe(2);
      expect(result.refundsProcessed).toBe(2);
      expect(result.refundsFailed).toBe(0);
      expect(result.results).toHaveLength(2);
      await captureApiEvidence(
        page,
        'I-06',
        'POST',
        '/admin/ads/bulk/reject',
        res.status(),
        'Two advertisements rejected; refund summary verified.',
      );
    } finally {
      await deleteAds(adIds);
    }
  });
});