import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // User Roles
  const userRoles = [
    { roleCode: 'buyer', roleName: 'Buyer', description: 'Regular customer who purchases products' },
    { roleCode: 'merchant', roleName: 'Merchant', description: 'Seller who lists and sells products' },
    { roleCode: 'admin', roleName: 'Administrator', description: 'System administrator with full access' },
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
    { placement: 'homepage_banner', tier: 'gold', dailyRate: 50.00 },
    { placement: 'homepage_banner', tier: 'silver', dailyRate: 30.00 },
    { placement: 'homepage_banner', tier: 'bronze', dailyRate: 15.00 },
    { placement: 'search_results', tier: 'gold', dailyRate: 40.00 },
    { placement: 'search_results', tier: 'silver', dailyRate: 25.00 },
    { placement: 'search_results', tier: 'bronze', dailyRate: 10.00 },
    { placement: 'category_page', tier: 'gold', dailyRate: 20.00 },
    { placement: 'category_page', tier: 'silver', dailyRate: 12.00 },
    { placement: 'category_page', tier: 'bronze', dailyRate: 6.00 },
  ];

  for (const setting of adFeeSettings) {
    await prisma.adFeeSetting.upsert({
      where: { placement_tier: { placement: setting.placement, tier: setting.tier } },
      update: {},
      create: { ...setting, dailyRate: setting.dailyRate },
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
