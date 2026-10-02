import { Prisma } from '@prisma/client';
import { CheckoutService } from './checkout.service';

const ad = {
  id: 'ad-1',
  title: 'Glow Serum',
  content: 'Brighten your routine',
  imageUrl: 'https://cdn.example.com/ad.png',
  linkUrl: 'https://shop.example.com',
};

const dateMatcher: unknown = expect.any(Date);

describe('CheckoutService getCheckoutPageAds', () => {
  const prisma = {
    advertisement: { findMany: jest.fn() },
  };
  const service = new CheckoutService(prisma as never);

  const findManyArgs = (): Prisma.AdvertisementFindManyArgs => {
    const call = prisma.advertisement.findMany.mock.calls[0] as [
      Prisma.AdvertisementFindManyArgs,
    ];
    return call[0];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.advertisement.findMany.mockResolvedValue([ad]);
  });

  it('matches only ads whose fee setting placement is checkout_page_banner', async () => {
    await service.getCheckoutPageAds();

    expect(findManyArgs().where?.feeSetting).toEqual({
      placement: 'checkout_page_banner',
    });
  });

  it('filters on the advertisement/fee-setting join rather than a column', async () => {
    await service.getCheckoutPageAds();

    const where = findManyArgs().where;

    expect(where?.feeSetting).toEqual({ placement: 'checkout_page_banner' });
    expect(where?.feeSettingId).toBeUndefined();
    expect(where?.OR).toBeUndefined();
    expect(where?.isActive).toBe(true);
  });

  it('does not apply the payment status filter', async () => {
    await service.getCheckoutPageAds();

    const where = findManyArgs().where;

    expect(where?.paymentStatus).toBeUndefined();
    expect(where?.approvalStatus).toBeUndefined();
  });

  it('returns every matching active ad across all tiers of the placement', async () => {
    const basicAd = { ...ad, id: 'ad-basic', title: 'Basic ad' };
    const premiumAd = { ...ad, id: 'ad-premium', title: 'Premium ad' };
    prisma.advertisement.findMany.mockResolvedValue([ad, basicAd, premiumAd]);

    const result = await service.getCheckoutPageAds();

    expect(result.data).toHaveLength(3);
    expect(result.data.map((a) => a.title)).toEqual([
      'Glow Serum',
      'Basic ad',
      'Premium ad',
    ]);
  });

  it('does not restrict to a single fee setting id', async () => {
    await service.getCheckoutPageAds();

    const where = findManyArgs().where;

    expect(where?.feeSetting).toEqual({ placement: 'checkout_page_banner' });
    expect(where?.feeSettingId).toBeUndefined();
    expect(where?.OR).toBeUndefined();
  });

  it('applies no row limit so every matching ad reaches the banner', async () => {
    await service.getCheckoutPageAds();

    expect(findManyArgs().take).toBeUndefined();
  });

  it('requires now to fall between startsAt and expiresAt', async () => {
    const before = new Date();
    await service.getCheckoutPageAds();

    const { startsAt, expiresAt } = findManyArgs().where ?? {};
    const now = new Date();

    expect(startsAt).toEqual({ lte: dateMatcher });
    expect(expiresAt).toEqual({ gte: dateMatcher });

    const start = (startsAt as { lte: Date }).lte.getTime();
    const end = (expiresAt as { gte: Date }).gte.getTime();

    expect(start).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(start).toBeLessThanOrEqual(now.getTime());
    // The service captures `now` before the mock resolves, so its timestamp
    // may be a tick or two earlier than the one read here.
    expect(end).toBeGreaterThanOrEqual(now.getTime() - 1000);
    expect(end).toBeLessThanOrEqual(now.getTime() + 1000);
  });

  it('excludes ads with no schedule', async () => {
    await service.getCheckoutPageAds();

    const where = findManyArgs().where;

    // A NULL starts_at/expires_at must not be treated as "always valid":
    // no OR-null escape hatch is used.
    expect(where?.AND).toBeUndefined();
    expect(where?.OR).toBeUndefined();
  });

  it('returns an empty list when every matching ad has expired', async () => {
    prisma.advertisement.findMany.mockResolvedValue([]);

    await expect(service.getCheckoutPageAds()).resolves.toEqual({ data: [] });
  });

  it('orders newest first', async () => {
    await service.getCheckoutPageAds();

    expect(findManyArgs().orderBy).toEqual([
      { createdAt: 'desc' },
      { paymentAmount: 'desc' },
    ]);
  });

  it('maps database rows to the sponsored ad payload', async () => {
    await expect(service.getCheckoutPageAds()).resolves.toEqual({
      data: [
        {
          id: 'ad-1',
          placement: 'checkout_page_banner',
          title: 'Glow Serum',
          description: 'Brighten your routine',
          imageUrl: 'https://cdn.example.com/ad.png',
          linkUrl: 'https://shop.example.com',
        },
      ],
    });
  });

  it('returns an empty list when no ad matches the placement', async () => {
    prisma.advertisement.findMany.mockResolvedValue([]);

    await expect(service.getCheckoutPageAds()).resolves.toEqual({ data: [] });
  });
});
