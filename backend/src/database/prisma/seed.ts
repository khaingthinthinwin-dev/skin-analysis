import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // User Roles
  const userRoles = [
    {
      roleCode: 'buyer',
      roleName: 'Buyer',
      description: 'Regular customer who purchases products',
    },
    {
      roleCode: 'merchant',
      roleName: 'Merchant',
      description: 'Seller who lists and sells products',
    },
    {
      roleCode: 'admin',
      roleName: 'Administrator',
      description: 'System administrator with full access',
    },
  ];

  for (const role of userRoles) {
    await prisma.userRole.upsert({
      where: { roleCode: role.roleCode },
      update: {},
      create: role,
    });
  }
  console.log('Seeded user_roles');

  // Order Statuses
  const orderStatuses = [
    {
      statusCode: 'placed',
      statusName: 'Placed',
      displayOrder: 1,
      isTerminalState: false,
      description: 'Order created, awaiting confirmation',
    },
    {
      statusCode: 'confirmed',
      statusName: 'Confirmed',
      displayOrder: 2,
      isTerminalState: false,
      description: 'Merchant accepted order',
    },
    {
      statusCode: 'packed',
      statusName: 'Packed',
      displayOrder: 3,
      isTerminalState: false,
      description: 'Order packed and ready to ship',
    },
    {
      statusCode: 'shipped',
      statusName: 'Shipped',
      displayOrder: 4,
      isTerminalState: false,
      description: 'Order sent to courier',
    },
    {
      statusCode: 'out_for_delivery',
      statusName: 'Out for Delivery',
      displayOrder: 5,
      isTerminalState: false,
      description: 'Order on the way to buyer',
    },
    {
      statusCode: 'delivered',
      statusName: 'Delivered',
      displayOrder: 6,
      isTerminalState: true,
      description: 'Buyer received order',
    },
  ];

  for (const status of orderStatuses) {
    await prisma.orderStatus.upsert({
      where: { statusCode: status.statusCode },
      update: {},
      create: status,
    });
  }
  console.log('Seeded order_statuses');

  // Discount Types
  const discountTypes = [
    { typeCode: 'percentage', typeName: 'Percentage' },
    { typeCode: 'fixed', typeName: 'Fixed Amount' },
    { typeCode: 'free_shipping', typeName: 'Free Shipping' },
  ];

  for (const type of discountTypes) {
    await prisma.discountType.upsert({
      where: { typeCode: type.typeCode },
      update: {},
      create: type,
    });
  }
  console.log('Seeded discount_types');

  // Ad Fee Settings
  const adFeeSettings = [
    {
      placement: 'homepage_banner',
      tier: 'basic',
      dailyRate: 3.0,
      durationDays: 7,
      maxAds: 1,
    },
    {
      placement: 'homepage_banner',
      tier: 'standard',
      dailyRate: 5.0,
      durationDays: 7,
      maxAds: 1,
    },
    {
      placement: 'homepage_banner',
      tier: 'premium',
      dailyRate: 8.0,
      durationDays: 7,
      maxAds: 1,
    },
    {
      placement: 'product_sidebar',
      tier: 'basic',
      dailyRate: 2.0,
      durationDays: 15,
      maxAds: 3,
    },
    {
      placement: 'product_sidebar',
      tier: 'standard',
      dailyRate: 3.5,
      durationDays: 15,
      maxAds: 3,
    },
    {
      placement: 'product_sidebar',
      tier: 'premium',
      dailyRate: 6.0,
      durationDays: 15,
      maxAds: 3,
    },
    {
      placement: 'category_banner',
      tier: 'basic',
      dailyRate: 2.5,
      durationDays: 30,
      maxAds: 5,
    },
    {
      placement: 'category_banner',
      tier: 'standard',
      dailyRate: 4.0,
      durationDays: 30,
      maxAds: 5,
    },
    {
      placement: 'category_banner',
      tier: 'premium',
      dailyRate: 7.0,
      durationDays: 30,
      maxAds: 5,
    },
    {
      placement: 'search_top',
      tier: 'basic',
      dailyRate: 1.5,
      durationDays: 7,
      maxAds: 6,
    },
    {
      placement: 'search_top',
      tier: 'standard',
      dailyRate: 2.5,
      durationDays: 7,
      maxAds: 6,
    },
    {
      placement: 'search_top',
      tier: 'premium',
      dailyRate: 5.0,
      durationDays: 7,
      maxAds: 6,
    },
  ];

  for (const setting of adFeeSettings) {
    await prisma.adFeeSetting.upsert({
      where: {
        placement_tier: { placement: setting.placement, tier: setting.tier },
      },
      update: {},
      create: setting,
    });
  }
  console.log('Seeded ad_fee_settings');

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
