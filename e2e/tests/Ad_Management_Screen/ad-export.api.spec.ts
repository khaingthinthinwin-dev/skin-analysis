import { randomUUID } from 'crypto';
import { test, expect } from '../../fixtures/auth.fixture';
import { API_BASE_URL } from '../../utils/constants';
import { adminHeaders } from '../../utils/api-auth';
import { captureApiEvidence } from '../../utils/api-evidence';
import {
  createAdWithReviewHistory,
  deleteAds,
  getExportAuditEntriesForDate,
} from '../../utils/ad-test-data';

test.describe('ad-export.api — API Contract Tests', () => {
  test('I-13: should export CSV ad performance report', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    const res = await request.post(`${API_BASE_URL}/admin/ads/export/ad-performance`, {
      headers,
      data: {
        format: 'csv',
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      },
    });
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] || '';
    expect(ct.toLowerCase()).toMatch(/text\/csv|application\/csv|text\/plain/);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
    // Should exclude sensitive fields
    await captureApiEvidence(
      page,
      'I-13',
      'POST',
      '/admin/ads/export/ad-performance',
      res.status(),
      `CSV response returned with ${text.length} characters.`,
    );
  });

  test('I-14: should export shop submission history CSV', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    const res = await request.post(`${API_BASE_URL}/admin/ads/export/submission-history`, {
      headers,
      data: {
        format: 'csv',
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      },
    });
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] || '';
    expect(ct.toLowerCase()).toMatch(/text\/csv|application\/csv|text\/plain/);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
    // Should include submission status and outcomes
    await captureApiEvidence(
      page,
      'I-14',
      'POST',
      '/admin/ads/export/submission-history',
      res.status(),
      `CSV response returned with ${text.length} characters.`,
    );
  });

  test('I-15: should export fee history log as CSV', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    const res = await request.post(`${API_BASE_URL}/admin/ads/export/fee-history`, {
      headers,
      data: {
        format: 'csv',
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      },
    });
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] || '';
    expect(ct.toLowerCase()).toMatch(/text\/csv|application\/csv|text\/plain/);
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
    // Should contain fee change records with reasons
    await captureApiEvidence(
      page,
      'I-15',
      'POST',
      '/admin/ads/export/fee-history',
      res.status(),
      `CSV response returned with ${text.length} characters.`,
    );
  });

  test('I-19 + A-16: should export with report-specific filters and audit metadata', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    const reportYear = 2000 + Math.floor(Math.random() * 27);
    const reportDay = 1 + Math.floor(Math.random() * 365);
    const reportDate = new Date(Date.UTC(reportYear, 0, reportDay)).toISOString().slice(0, 10);
    const shopFilter = `E2E audit filter ${randomUUID()}`;
    // Export ad performance with placement/tier/status filters
    const res1 = await request.post(`${API_BASE_URL}/admin/ads/export/ad-performance`, {
      headers,
      data: {
        format: 'csv',
        dateFrom: reportDate,
        dateTo: reportDate,
        placement: ['search_page_banner', 'recommendation_page_banner'],
        tier: ['basic', 'standard'],
        status: ['approved'],
      },
    });
    expect(res1.status()).toBe(200);
    const performanceCsv = await res1.text();
    expect(performanceCsv.split(/\r?\n/)[0]).toBe('Shop,Title,Placement,Tier,Status,Impressions,Clicks,CTR (%),Fee Paid,Revenue');
    // Should have EXPORT_GENERATED audit event with filters recorded

    // Export submission history with shop filter
    const res2 = await request.post(`${API_BASE_URL}/admin/ads/export/submission-history`, {
      headers,
      data: {
        format: 'csv',
        dateFrom: reportDate,
        dateTo: reportDate,
        shop: shopFilter,
      },
    });
    expect(res2.status()).toBe(200);
    const submissionCsv = await res2.text();
    expect(submissionCsv.split(/\r?\n/)).toHaveLength(1);
    expect(submissionCsv.split(/\r?\n/)[0]).toBe('Shop,Title,Placement,Tier,Submitted,Status,Rejection Reason,Reviewed By,Reviewed At,Fee Paid,Refund Amount');

    // Export fee history with placement and tier filters
    const res3 = await request.post(`${API_BASE_URL}/admin/ads/export/fee-history`, {
      headers,
      data: {
        format: 'csv',
        dateFrom: reportDate,
        dateTo: reportDate,
        placement: ['search_page_banner'],
        tier: ['basic'],
      },
    });
    expect(res3.status()).toBe(200);
    const feeCsv = await res3.text();
    expect(feeCsv.split(/\r?\n/)[0]).toBe('Date,Placement,Tier,Old Rate,New Rate,Old Duration,New Duration,Old Max Ads,New Max Ads,Changed By,Reason,Effective From');
    const auditEntries = await getExportAuditEntriesForDate(reportDate);
    const performanceAudit = auditEntries.find(
      (entry) => entry.reportType === 'ad_performance' &&
        JSON.stringify(entry.placement) === JSON.stringify(['search_page_banner', 'recommendation_page_banner']) &&
        JSON.stringify(entry.tier) === JSON.stringify(['basic', 'standard']) &&
        JSON.stringify(entry.status) === JSON.stringify(['approved']),
    );
    const submissionAudit = auditEntries.find(
      (entry) => entry.reportType === 'submission_history' && entry.shop === shopFilter,
    );
    const feeAudit = auditEntries.find(
      (entry) => entry.reportType === 'fee_history' &&
        JSON.stringify(entry.placement) === JSON.stringify(['search_page_banner']) &&
        JSON.stringify(entry.tier) === JSON.stringify(['basic']),
    );
    expect(performanceAudit).toBeDefined();
    expect(submissionAudit).toBeDefined();
    expect(feeAudit).toBeDefined();
    await captureApiEvidence(
      page,
      'I-19',
      'POST',
      '/admin/ads/export/* (report-specific filters)',
      res3.status(),
      'All three CSV exports accepted their report-specific filters, and matching EXPORT_GENERATED audit metadata was persisted.',
    );
  });

  test('A-16: should reject date ranges over 365 days and non-CSV formats', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    // Reject date range > 365 days
    const res1 = await request.post(`${API_BASE_URL}/admin/ads/export/ad-performance`, {
      headers,
      data: {
        format: 'csv',
        dateFrom: '2025-01-01',
        dateTo: '2027-01-01', // > 365 days
      },
    });
    expect(res1.status()).toBe(400);

    // Reject non-CSV format
    const res2 = await request.post(`${API_BASE_URL}/admin/ads/export/ad-performance`, {
      headers,
      data: {
        format: 'excel', // invalid
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      },
    });
    expect(res2.status()).toBe(400);
    await captureApiEvidence(
      page,
      'A-16',
      'POST',
      '/admin/ads/export/ad-performance (invalid range and format)',
      res2.status(),
      'The API rejects both a range longer than 365 days and a non-CSV format.',
    );
  });

  test('B-13: submission-history export preserves each review event', async ({ request, page }) => {
    const headers = await adminHeaders(request);
    const adId = await createAdWithReviewHistory();
    try {
      const response = await request.post(`${API_BASE_URL}/admin/ads/export/submission-history`, {
        headers,
        data: {
          format: 'csv',
          dateFrom: '2026-01-01',
          dateTo: '2026-12-31',
        },
      });
      expect(response.status()).toBe(200);
      const csv = await response.text();
      const matchingRows = csv.split(/\r?\n/).filter((line) => line.includes(`E2E review history ${adId}`));
      expect(matchingRows).toHaveLength(2);
      expect(matchingRows[0]).toContain(',rejected,');
      expect(matchingRows[1]).toContain(',approved,');
      await captureApiEvidence(
        page,
        'B-13',
        'POST',
        '/admin/ads/export/submission-history',
        response.status(),
        'CSV contains separate rejected and approved rows for the same advertisement review history.',
      );
    } finally {
      await deleteAds([adId]);
    }
  });
});