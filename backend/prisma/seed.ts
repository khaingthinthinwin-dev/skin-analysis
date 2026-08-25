import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data (in reverse order of dependencies)
  console.log('Clearing existing data...');
  await prisma.commissionSetting.deleteMany();
  await prisma.adFeeSetting.deleteMany();
  await prisma.orderStatus.deleteMany();
  await prisma.discountType.deleteMany();
  await prisma.userRole.deleteMany();
  console.log('Existing data cleared.');

  // User Roles
  const userRoles = [
    { roleCode: 'buyer', roleName: 'Buyer', description: 'End user who browses and purchases products' },
    { roleCode: 'merchant', roleName: 'Merchant', description: 'Seller who lists products on the marketplace' },
    { roleCode: 'admin', roleName: 'Admin', description: 'Platform administrator with full access' },
  ];

  for (const role of userRoles) {
    await prisma.userRole.upsert({
      where: { roleCode: role.roleCode },
      update: {},
      create: role,
    });
  }
  console.log('Seeded user_roles');

  // Order Statuses (aligned with DATABASE_SPEC v2.3)
  const orderStatuses = [
    { statusCode: 'placed', statusName: 'Placed', displayOrder: 1, isTerminalState: false, description: 'Order created, awaiting confirmation' },
    { statusCode: 'confirmed', statusName: 'Confirmed', displayOrder: 2, isTerminalState: false, description: 'Merchant accepted order' },
    { statusCode: 'packed', statusName: 'Packed', displayOrder: 3, isTerminalState: false, description: 'Order packed and ready to ship' },
    { statusCode: 'shipped', statusName: 'Shipped', displayOrder: 4, isTerminalState: false, description: 'Order sent to courier' },
    { statusCode: 'out_for_delivery', statusName: 'Out for Delivery', displayOrder: 5, isTerminalState: false, description: 'Order on the way to buyer' },
    { statusCode: 'delivered', statusName: 'Delivered', displayOrder: 6, isTerminalState: true, description: 'Buyer received order' },
  ];

  for (const status of orderStatuses) {
    await prisma.orderStatus.upsert({
      where: { statusCode: status.statusCode },
      update: {},
      create: status,
    });
  }
  console.log('Seeded order_statuses');

  // Discount Types (aligned with DATABASE_SPEC v2.3)
  const discountTypes = [
    { typeCode: 'percentage', typeName: 'Percentage Discount' },
    { typeCode: 'fixed', typeName: 'Fixed Amount Discount' },
  ];

  for (const type of discountTypes) {
    await prisma.discountType.upsert({
      where: { typeCode: type.typeCode },
      update: {},
      create: type,
    });
  }
  console.log('Seeded discount_types');

  // Ad Fee Settings (aligned with DATABASE_SPEC v2.3)
  const adFeeSettings = [
    { placement: 'homepage_banner', tier: 'basic', dailyRate: 3.00, durationDays: 7, maxAds: 1 },
    { placement: 'homepage_banner', tier: 'standard', dailyRate: 5.00, durationDays: 7, maxAds: 1 },
    { placement: 'homepage_banner', tier: 'premium', dailyRate: 8.00, durationDays: 7, maxAds: 1 },
    { placement: 'product_sidebar', tier: 'basic', dailyRate: 2.00, durationDays: 15, maxAds: 3 },
    { placement: 'product_sidebar', tier: 'standard', dailyRate: 3.50, durationDays: 15, maxAds: 3 },
    { placement: 'product_sidebar', tier: 'premium', dailyRate: 6.00, durationDays: 15, maxAds: 3 },
    { placement: 'category_banner', tier: 'basic', dailyRate: 2.50, durationDays: 30, maxAds: 5 },
    { placement: 'category_banner', tier: 'standard', dailyRate: 4.00, durationDays: 30, maxAds: 5 },
    { placement: 'category_banner', tier: 'premium', dailyRate: 7.00, durationDays: 30, maxAds: 5 },
    { placement: 'search_top', tier: 'basic', dailyRate: 1.50, durationDays: 7, maxAds: 6 },
    { placement: 'search_top', tier: 'standard', dailyRate: 2.50, durationDays: 7, maxAds: 6 },
    { placement: 'search_top', tier: 'premium', dailyRate: 5.00, durationDays: 7, maxAds: 6 },
  ];

  for (const setting of adFeeSettings) {
    await prisma.adFeeSetting.upsert({
      where: { placement_tier: { placement: setting.placement, tier: setting.tier } },
      update: {},
      create: setting,
    });
  }
  console.log('Seeded ad_fee_settings');

  // Commission Settings (fixed at 12%)
  await prisma.commissionSetting.create({
    data: {
      commissionRate: 12.00,
    },
  });
  console.log('Seeded commission_settings');

  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
