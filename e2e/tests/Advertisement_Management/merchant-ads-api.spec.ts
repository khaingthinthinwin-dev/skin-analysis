import { test, expect } from '../../fixtures/auth.fixture';
import { API_BASE_URL } from '../../utils/constants';
import { loginApi } from '../../utils/api-auth';
import { captureApiEvidence } from '../../utils/api-evidence';
import {
  getMerchantTestContext,
  seedAd,
  cleanupAds,
  getFutureDateString,
  type MerchantTestContext,
} from '../../utils/merchant-ad-helpers';
import { randomUUID } from 'crypto';

let ctx: MerchantTestContext;
let merchantHeaders: Record<string, string>;
let buyerHeaders: Record<string, string>;
const seededAdIds: string[] = [];

test.describe('Merchant Advertisement Management — Interface Scenarios (I-01 to I-15)', () => {
  test.beforeAll(async ({ request }) => {
    ctx = await getMerchantTestContext();
    merchantHeaders = await loginApi(request, 'smt@gmail.com', 'Cosmetics@123');
    buyerHeaders = await loginApi(request, 'eem@gmail.com', 'Cosmetics@123');
  });

  test.afterAll(async () => {
    await cleanupAds(seededAdIds);
  });
  // I-01: GET /api/v1/ads/packages — returns 200 with active packages catalog
  test('I-01: GET /api/v1/ads/packages — returns 200 with active packages catalog', async ({ request, page }) => {
    const res = await request.get(`${API_BASE_URL}/ads/packages`, {
      headers: merchantHeaders,
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    const pkgs = body.data?.data ?? body.data;
    expect(Array.isArray(pkgs)).toBe(true);
    expect(pkgs.length).toBeGreaterThan(0);

    const firstPkg = pkgs[0];
    expect(firstPkg).toHaveProperty('id');
    expect(firstPkg).toHaveProperty('placement');
    expect(firstPkg).toHaveProperty('tier');
    expect(firstPkg).toHaveProperty('dailyRate');
    expect(firstPkg).toHaveProperty('durationDays');
    expect(firstPkg).toHaveProperty('maxAds');
    expect(firstPkg).toHaveProperty('totalFee');
    expect(firstPkg).toHaveProperty('updatedAt');

    await captureApiEvidence(
      page,
      'I-01_1_packages_list',
      'GET',
      '/api/v1/ads/packages',
      200,
      'Returns 200 with active packages catalog array',
    );
  });

  // I-02: POST /api/v1/ads/packages/:feeSettingId/select — returns 201 with created draft ad
  test('I-02: POST /api/v1/ads/packages/:feeSettingId/select — returns 201 with created draft ad', async ({ request, page }) => {
    const res = await request.post(`${API_BASE_URL}/ads/packages/${ctx.feeSettingId}/select`, {
      headers: merchantHeaders,
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    const ad = body.data?.data ?? body.data;
    expect(ad).toHaveProperty('id');
    expect(ad.approvalStatus).toBe('pending');
    expect(ad.paymentStatus).toBe('pending');
    expect(ad.isActive).toBe(true);
    expect(ad).toHaveProperty('package');

    seededAdIds.push(ad.id);

    await captureApiEvidence(
      page,
      'I-02_1_select_package',
      'POST',
      `/api/v1/ads/packages/${ctx.feeSettingId}/select`,
      201,
      'Returns 201 with newly created draft advertisement payload',
    );
  });

  // I-03: GET /api/v1/ads/my-ads — returns 200 with paginated merchant ads
  test('I-03: GET /api/v1/ads/my-ads — returns 200 with paginated merchant ads', async ({ request, page }) => {
    const res = await request.get(`${API_BASE_URL}/ads/my-ads?page=1&limit=3&status=active`, {
      headers: merchantHeaders,
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    const payload = body.data?.data !== undefined ? body.data : body;
    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.meta).toHaveProperty('page', 1);
    expect(payload.meta).toHaveProperty('limit', 3);
    expect(payload.meta).toHaveProperty('total');
    expect(payload.meta).toHaveProperty('totalPages');

    await captureApiEvidence(
      page,
      'I-03_1_list_my_ads',
      'GET',
      '/api/v1/ads/my-ads?page=1&limit=3&status=active',
      200,
      'Returns 200 with paginated merchant ads and meta envelope',
    );
  });

  // I-04: PATCH /api/v1/ads/:id/content — returns 200 with saved content & schedule
  test('I-04: PATCH /api/v1/ads/:id/content — returns 200 with saved content & schedule', async ({ request, page }) => {
    const draftId = await seedAd({
      title: '',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(draftId);

    const startsAt = new Date(`${getFutureDateString(4)}T00:00:00.000Z`).toISOString();
    const res = await request.patch(`${API_BASE_URL}/ads/${draftId}/content`, {
      headers: merchantHeaders,
      data: {
        title: 'I-04 Summer Collection',
        content: 'Special summer offer content',
        imageUrl: ctx.productImageUrl,
        announcementMessage: '20% off all items',
        startsAt,
      },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    const ad = body.data?.data ?? body.data;
    expect(ad.id).toBe(draftId);
    expect(ad.title).toBe('I-04 Summer Collection');
    expect(ad.content).toBe('Special summer offer content');
    expect(ad.imageUrl).toBe(ctx.productImageUrl);
    expect(ad.announcementMessage).toBe('20% off all items');
    expect(ad).toHaveProperty('expiresAt');

    await captureApiEvidence(
      page,
      'I-04_1_upload_content',
      'PATCH',
      `/api/v1/ads/${draftId}/content`,
      200,
      'Returns 200 with saved ad content and derived expiresAt',
    );
  });

  // I-05: POST /api/v1/ads/:id/pay — returns 201 with paid ad entering admin queue
  test('I-05: POST /api/v1/ads/:id/pay — returns 201 with paid ad entering admin queue', async ({ request, page }) => {
    const readyAdId = await seedAd({
      title: 'I-05 Ready To Pay',
      announcementMessage: 'Announcement Message',
      imageUrl: ctx.productImageUrl,
      sku: ctx.productSku,
      approvalStatus: 'pending',
      paymentStatus: 'pending',
      startsAt: new Date(Date.now() + 4 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 11 * 24 * 3600 * 1000),
    });
    seededAdIds.push(readyAdId);

    const res = await request.post(`${API_BASE_URL}/ads/${readyAdId}/pay`, {
      headers: merchantHeaders,
      data: { paymentReference: '8877665544' },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    const ad = body.data?.data ?? body.data;
    expect(ad.id).toBe(readyAdId);
    expect(ad.paymentStatus).toBe('completed');
    expect(ad.approvalStatus).toBe('pending');
    expect(ad.paymentReference).toBe('8877665544');
    expect(ad).toHaveProperty('paymentAmount');
    expect(ad).toHaveProperty('weekNumber');

    await captureApiEvidence(
      page,
      'I-05_1_pay_fee',
      'POST',
      `/api/v1/ads/${readyAdId}/pay`,
      201,
      'Returns 201 with paid advertisement entering admin review queue',
    );
  });

  // I-06: PATCH /api/v1/ads/:id — returns 200 with updated content
  test('I-06: PATCH /api/v1/ads/:id — returns 200 with updated content', async ({ request, page }) => {
    const draftId = await seedAd({
      title: 'I-06 Initial Title',
      announcementMessage: 'Initial Announcement',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
      startsAt: new Date(Date.now() + 4 * 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 11 * 24 * 3600 * 1000),
    });
    seededAdIds.push(draftId);

    const res = await request.patch(`${API_BASE_URL}/ads/${draftId}`, {
      headers: merchantHeaders,
      data: {
        title: 'I-06 Updated Title',
        announcementMessage: 'Updated Announcement',
      },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    const ad = body.data?.data ?? body.data;
    expect(ad.id).toBe(draftId);
    expect(ad.title).toBe('I-06 Updated Title');
    expect(ad.announcementMessage).toBe('Updated Announcement');

    await captureApiEvidence(
      page,
      'I-06_1_update_content',
      'PATCH',
      `/api/v1/ads/${draftId}`,
      200,
      'Returns 200 with updated advertisement payload',
    );
  });

  // I-07: DELETE /api/v1/ads/:id — returns 200 with deletion message
  test('I-07: DELETE /api/v1/ads/:id — returns 200 with deletion message', async ({ request, page }) => {
    const draftId = await seedAd({
      title: 'I-07 Ad To Delete',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });

    const res = await request.delete(`${API_BASE_URL}/ads/${draftId}`, {
      headers: merchantHeaders,
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    const message = body.data?.message ?? body.message;
    expect(message).toBe('Advertisement deleted');

    await captureApiEvidence(
      page,
      'I-07_1_delete_ad',
      'DELETE',
      `/api/v1/ads/${draftId}`,
      200,
      'Returns 200 with unwrapped {"message": "Advertisement deleted"}',
    );
  });

  // I-08: PATCH /api/v1/ads/:id/toggle — returns 200 with updated isActive state
  test('I-08: PATCH /api/v1/ads/:id/toggle — returns 200 with updated isActive state', async ({ request, page }) => {
    const toggleAdId = await seedAd({
      title: 'I-08 Toggle Ad',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      isActive: true,
      startsAt: new Date(Date.now() - 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
    });
    seededAdIds.push(toggleAdId);

    const res = await request.patch(`${API_BASE_URL}/ads/${toggleAdId}/toggle`, {
      headers: merchantHeaders,
      data: { isActive: false },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    const ad = body.data?.data ?? body.data;
    expect(ad.id).toBe(toggleAdId);
    expect(ad.isActive).toBe(false);

    await captureApiEvidence(
      page,
      'I-08_1_toggle_ad',
      'PATCH',
      `/api/v1/ads/${toggleAdId}/toggle`,
      200,
      'Returns 200 with updated isActive boolean state',
    );
  });

  // I-09: GET /api/v1/ads/active (Public) — returns 200 with array of active ads
  test('I-09: GET /api/v1/ads/active (Public) — returns 200 with array of active ads', async ({ request, page }) => {
    const res = await request.get(`${API_BASE_URL}/ads/active`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    const ads = body.data?.data ?? body.data;
    expect(Array.isArray(ads)).toBe(true);

    await captureApiEvidence(
      page,
      'I-09_1_active_ads_public',
      'GET',
      '/api/v1/ads/active',
      200,
      'Public endpoint returns 200 with array of active approved ads without auth header',
    );
  });

  // I-10: POST /api/v1/ads/packages/:feeSettingId/select — returns 403 for unapproved shop
  test('I-10: POST /api/v1/ads/packages/:feeSettingId/select — returns 403 for unapproved shop', async ({ request, page }) => {
    const res = await request.post(`${API_BASE_URL}/ads/packages/${ctx.feeSettingId}/select`, {
      headers: buyerHeaders,
    });
    expect(res.status()).toBe(403);

    const body = await res.json();
    expect(body.statusCode).toBe(403);

    await captureApiEvidence(
      page,
      'I-10_1_unapproved_shop_forbidden',
      'POST',
      `/api/v1/ads/packages/${ctx.feeSettingId}/select`,
      403,
      'Returns 403 Forbidden with SHOP_NOT_APPROVED when shop is unapproved',
    );
  });

  // I-11: PATCH /api/v1/ads/:id/content — returns 400 for image not belonging to merchant
  test('I-11: PATCH /api/v1/ads/:id/content — returns 400 for image not belonging to merchant', async ({ request, page }) => {
    const draftId = await seedAd({
      title: '',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(draftId);

    const res = await request.patch(`${API_BASE_URL}/ads/${draftId}/content`, {
      headers: merchantHeaders,
      data: {
        title: 'I-11 Test Title',
        announcementMessage: 'Announcement',
        imageUrl: '/uploads/products/external-fake-unowned.png',
        startsAt: getFutureDateString(4),
      },
    });
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body.message).toContain('Advertisement image must be selected from your products');

    await captureApiEvidence(
      page,
      'I-11_1_unowned_image_bad_request',
      'PATCH',
      `/api/v1/ads/${draftId}/content`,
      400,
      'Returns 400 Bad Request when image does not belong to merchant products',
    );
  });

  // I-12: PATCH /api/v1/ads/:id/content — returns 400 for start date violating 3-day lead time
  test('I-12: PATCH /api/v1/ads/:id/content — returns 400 for start date violating 3-day lead time', async ({ request, page }) => {
    const draftId = await seedAd({
      title: '',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(draftId);

    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const res = await request.patch(`${API_BASE_URL}/ads/${draftId}/content`, {
      headers: merchantHeaders,
      data: {
        title: 'I-12 Lead Time Test',
        announcementMessage: 'Announcement',
        imageUrl: ctx.productImageUrl,
        startsAt: tomorrow,
      },
    });
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body.message).toContain('Start date must be at least 3 days from today');

    await captureApiEvidence(
      page,
      'I-12_1_invalid_schedule_lead_time',
      'PATCH',
      `/api/v1/ads/${draftId}/content`,
      400,
      'Returns 400 Bad Request when start date is less than 3 days from today',
    );
  });

  // I-13: DELETE /api/v1/ads/:id — returns 400 for active approved advertisement
  test('I-13: DELETE /api/v1/ads/:id — returns 400 for active approved advertisement', async ({ request, page }) => {
    const activeAdId = await seedAd({
      title: 'I-13 Active Ad',
      approvalStatus: 'approved',
      paymentStatus: 'completed',
      isActive: true,
      startsAt: new Date(Date.now() - 24 * 3600 * 1000),
      expiresAt: new Date(Date.now() + 5 * 24 * 3600 * 1000),
    });
    seededAdIds.push(activeAdId);

    const res = await request.delete(`${API_BASE_URL}/ads/${activeAdId}`, {
      headers: merchantHeaders,
    });
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body.message).toContain('Active approved advertisements cannot be deleted');

    await captureApiEvidence(
      page,
      'I-13_1_delete_active_ad_bad_request',
      'DELETE',
      `/api/v1/ads/${activeAdId}`,
      400,
      'Returns 400 Bad Request when attempting to delete active approved advertisement',
    );
  });

  // I-14: Cross-shop access mutation returns 403 Forbidden
  test('I-14: Cross-shop access mutation returns 403 Forbidden', async ({ request, page }) => {
    const adId = await seedAd({
      title: 'I-14 Merchant A Ad',
      approvalStatus: 'pending',
      paymentStatus: 'pending',
    });
    seededAdIds.push(adId);

    const res = await request.patch(`${API_BASE_URL}/ads/${adId}/content`, {
      headers: buyerHeaders,
      data: {
        title: 'Hacked Title',
        announcementMessage: 'Hacked announcement',
        imageUrl: ctx.productImageUrl,
        startsAt: getFutureDateString(4),
      },
    });
    expect(res.status()).toBe(403);

    await captureApiEvidence(
      page,
      'I-14_1_cross_shop_forbidden',
      'PATCH',
      `/api/v1/ads/${adId}/content`,
      403,
      'Returns 403 Forbidden for cross-shop mutation attempt',
    );
  });

  // I-15: Error response conforms to standard API contract
  test('I-15: Error response conforms to standard API contract', async ({ request, page }) => {
    const res = await request.get(`${API_BASE_URL}/ads/my-ads?status=invalid_enum_status`, {
      headers: merchantHeaders,
    });
    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(typeof body.statusCode).toBe('number');
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('path');

    await captureApiEvidence(
      page,
      'I-15_1_standard_error_format',
      'GET',
      '/api/v1/ads/my-ads?status=invalid_enum_status',
      400,
      'Conforms to standard HTTP exception payload with statusCode, message, error, timestamp, path',
    );
  });
});

