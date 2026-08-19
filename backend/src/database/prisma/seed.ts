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
    { statusCode: 'pending', statusName: 'Pending', displayOrder: 1, isTerminalState: false, description: 'Order placed, awaiting processing' },
    { statusCode: 'confirmed', statusName: 'Confirmed', displayOrder: 2, isTerminalState: false, description: 'Order confirmed by merchant' },
    { statusCode: 'processing', statusName: 'Processing', displayOrder: 3, isTerminalState: false, description: 'Order is being prepared' },
    { statusCode: 'shipped', statusName: 'Shipped', displayOrder: 4, isTerminalState: false, description: 'Order has been shipped' },
    { statusCode: 'delivered', statusName: 'Delivered', displayOrder: 5, isTerminalState: true, description: 'Order delivered to customer' },
    { statusCode: 'cancelled', statusName: 'Cancelled', displayOrder: 6, isTerminalState: true, description: 'Order cancelled' },
    { statusCode: 'refunded', statusName: 'Refunded', displayOrder: 7, isTerminalState: true, description: 'Order refunded' },
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
