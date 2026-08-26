import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const PASSWORD = 'Cosmetics@123';

async function main() {
  console.log('Seeding database...');

  // ============================================
  // CLEAR EXISTING DATA
  // ============================================
  console.log('Clearing existing data...');
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.reviewReport.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.skinAnalysisRecommendation.deleteMany();
  await prisma.skinAnalysisCondition.deleteMany();
  await prisma.skinAnalysis.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.review.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.adPayment.deleteMany();
  await prisma.adFeeHistory.deleteMany();
  await prisma.advertisement.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.user.deleteMany();
  await prisma.commissionSetting.deleteMany();
  await prisma.revenueTarget.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.adFeeSetting.deleteMany();
  await prisma.orderStatus.deleteMany();
  await prisma.discountType.deleteMany();
  await prisma.userRole.deleteMany();
  console.log('Existing data cleared.');

  // ============================================
  // LOOKUP TABLES
  // ============================================

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

  // Ad Fee Settings
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

  // Commission Settings
  await prisma.commissionSetting.create({
    data: { commissionRate: 12.00 },
  });
  console.log('Seeded commission_settings');

  // ============================================
  // HASH PASSWORD
  // ============================================
  const passwordHash = await argon2.hash(PASSWORD);
  console.log('Password hashed.');

  // ============================================
  // USERS
  // ============================================

  // Buyers
  const buyerData = [
    { email: 'eem@gmail.com', name: 'Ei Ei Mon' },
    { email: 'trph@gmail.com', name: 'Thara Phee Htet' },
    { email: 'haml@gmail.com', name: 'Htail Ay Mi Lin' },
    { email: 'atm@gmail.com', name: 'Aye Thandar Moe' },
  ];

  const buyers = [];
  for (const b of buyerData) {
    const user = await prisma.user.create({
      data: {
        email: b.email,
        name: b.name,
        passwordHash,
        roleCode: 'buyer',
        isActive: true,
        emailVerified: true,
      },
    });
    buyers.push(user);
  }
  console.log(`Seeded ${buyers.length} buyers`);

  // Merchants
  const merchantData = [
    { email: 'zsls@gmail.com', name: 'Zun Seine Lae Shune' },
    { email: 'tmo@gmail.com', name: 'Thain Mywe Oo' },
    { email: 'wyt@gmail.com', name: 'Wai Yan Tun' },
    { email: 'smt@gmail.com', name: 'Shin Min Thant' },
  ];

  const merchantUsers = [];
  for (const m of merchantData) {
    const user = await prisma.user.create({
      data: {
        email: m.email,
        name: m.name,
        passwordHash,
        roleCode: 'merchant',
        isActive: true,
        emailVerified: true,
      },
    });
    merchantUsers.push(user);
  }
  console.log(`Seeded ${merchantUsers.length} merchant users`);

  // Admins
  const adminData = [
    { email: 'pet@gmail.com', name: 'Phyo Ei Thu' },
    { email: 'pph@gmail.com', name: 'Pyae Phyo Hein' },
    { email: 'kttw@gmail.com', name: 'Khaing Thin Thin Win' },
  ];

  const admins = [];
  for (const a of adminData) {
    const user = await prisma.user.create({
      data: {
        email: a.email,
        name: a.name,
        passwordHash,
        roleCode: 'admin',
        isActive: true,
        emailVerified: true,
      },
    });
    admins.push(user);
  }
  console.log(`Seeded ${admins.length} admins`);

  // ============================================
  // MERCHANT PROFILES
  // ============================================
  const merchants = [];
  const merchantShops = [
    { shopName: 'Glow Beauty Shop', slug: 'glow-beauty-shop', description: 'Premium skincare products for radiant skin' },
    { shopName: 'Natural Skin Care', slug: 'natural-skin-care', description: 'Organic and natural skincare solutions' },
    { shopName: 'Beauty Hub Myanmar', slug: 'beauty-hub-myanmar', description: 'Your one-stop beauty destination' },
    { shopName: 'Skin Pure Store', slug: 'skin-pure-store', description: 'Pure and gentle skincare for sensitive skin' },
  ];

  for (let i = 0; i < merchantUsers.length; i++) {
    const merchant = await prisma.merchant.create({
      data: {
        userId: merchantUsers[i].id,
        shopName: merchantShops[i].shopName,
        businessLicenseUrl: `https://storage.example.com/licenses/${merchantUsers[i].id}.pdf`,
        licenseStatus: 'approved',
        reviewedAt: new Date(),
        reviewedBy: admins[0].id,
        licenseExpiresAt: new Date('2027-12-31'),
      },
    });
    merchants.push(merchant);

    // Update user with merchantId
    await prisma.user.update({
      where: { id: merchantUsers[i].id },
      data: { merchantId: merchant.id },
    });
  }
  console.log(`Seeded ${merchants.length} merchants`);

  // ============================================
  // SHOPS
  // ============================================
  const shops = [];
  const shopData = [
    { name: 'Glow Beauty Shop', slug: 'glow-beauty-shop', description: 'Premium skincare products for radiant skin', address: '123 Yangon Street, Yangon', phone: '+95912345678', email: 'glow@example.com', latitude: 16.8661, longitude: 96.1951 },
    { name: 'Natural Skin Care', slug: 'natural-skin-care', description: 'Organic and natural skincare solutions', address: '456 Mandalay Road, Mandalay', phone: '+95923456789', email: 'natural@example.com', latitude: 21.9588, longitude: 96.0891 },
    { name: 'Beauty Hub Myanmar', slug: 'beauty-hub-myanmar', description: 'Your one-stop beauty destination', address: '789 Nay Pyi Taw Avenue, Nay Pyi Taw', phone: '+95934567890', email: 'beautyhub@example.com', latitude: 19.7633, longitude: 96.0785 },
    { name: 'Skin Pure Store', slug: 'skin-pure-store', description: 'Pure and gentle skincare for sensitive skin', address: '321 Bago Lane, Bago', phone: '+95945678901', email: 'skinpure@example.com', latitude: 17.3370, longitude: 96.4780 },
  ];

  for (let i = 0; i < merchants.length; i++) {
    const shop = await prisma.shop.create({
      data: {
        userId: merchantUsers[i].id,
        name: shopData[i].name,
        slug: shopData[i].slug,
        description: shopData[i].description,
        address: shopData[i].address,
        phone: shopData[i].phone,
        email: shopData[i].email,
        latitude: shopData[i].latitude,
        longitude: shopData[i].longitude,
        isApproved: true,
      },
    });
    shops.push(shop);
  }
  console.log(`Seeded ${shops.length} shops`);

  // ============================================
  // CATEGORIES
  // ============================================
  const categories = [];
  const categoryData = [
    { name: 'Cleansers', slug: 'cleansers', sortOrder: 1 },
    { name: 'Toners', slug: 'toners', sortOrder: 2 },
    { name: 'Serums', slug: 'serums', sortOrder: 3 },
    { name: 'Moisturizers', slug: 'moisturizers', sortOrder: 4 },
    { name: 'Sunscreens', slug: 'sunscreens', sortOrder: 5 },
    { name: 'Masks', slug: 'masks', sortOrder: 6 },
    { name: 'Eye Care', slug: 'eye-care', sortOrder: 7 },
    { name: 'Lip Care', slug: 'lip-care', sortOrder: 8 },
  ];

  for (const cat of categoryData) {
    const category = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        sortOrder: cat.sortOrder,
      },
    });
    categories.push(category);
  }
  console.log(`Seeded ${categories.length} categories`);

  // ============================================
  // PRODUCTS
  // ============================================
  const products = [];
  const productData = [
    {
      merchantIndex: 0, categoryIndex: 0,
      name: 'Gentle Foam Cleanser', slug: 'gentle-foam-cleanser',
      description: 'A mild foam cleanser that removes impurities without stripping moisture.',
      shortDescription: 'Mild foam cleanser for daily use',
      price: 15000, compareAtPrice: 18000, sku: 'GFC-001', stockQuantity: 100,
      images: ['https://example.com/gentle-foam-cleanser.jpg'],
      tags: ['cleanser', 'foam', 'gentle'], skinTypes: ['normal', 'combination'],
      ingredients: ['Glycerin', 'Ceramide', 'Hyaluronic Acid'], isFeatured: true,
    },
    {
      merchantIndex: 0, categoryIndex: 1,
      name: 'Hydrating Toner', slug: 'hydrating-toner',
      description: 'An alcohol-free toner that hydrates and prepares skin for the next step.',
      shortDescription: 'Alcohol-free hydrating toner',
      price: 12000, compareAtPrice: 15000, sku: 'HT-002', stockQuantity: 80,
      images: ['https://example.com/hydrating-toner.jpg'],
      tags: ['toner', 'hydrating', 'alcohol-free'], skinTypes: ['dry', 'normal'],
      ingredients: ['Hyaluronic Acid', 'Aloe Vera', 'Niacinamide'], isFeatured: false,
    },
    {
      merchantIndex: 0, categoryIndex: 2,
      name: 'Vitamin C Brightening Serum', slug: 'vitamin-c-serum',
      description: 'A potent vitamin C serum that brightens skin and reduces dark spots.',
      shortDescription: 'Brightening serum with Vitamin C',
      price: 25000, compareAtPrice: 30000, sku: 'VCS-003', stockQuantity: 50,
      images: ['https://example.com/vitamin-c-serum.jpg'],
      tags: ['serum', 'vitamin-c', 'brightening'], skinTypes: ['all'],
      ingredients: ['Vitamin C', 'Vitamin E', 'Ferulic Acid'], isFeatured: true,
    },
    {
      merchantIndex: 1, categoryIndex: 3,
      name: 'Daily Moisture Cream', slug: 'daily-moisture-cream',
      description: 'A lightweight moisturizer that keeps skin soft and hydrated all day.',
      shortDescription: 'Lightweight daily moisturizer',
      price: 18000, compareAtPrice: 22000, sku: 'DMC-004', stockQuantity: 120,
      images: ['https://example.com/daily-moisture-cream.jpg'],
      tags: ['moisturizer', 'cream', 'daily'], skinTypes: ['normal', 'dry'],
      ingredients: ['Shea Butter', 'Ceramide', 'Jojoba Oil'], isFeatured: true,
    },
    {
      merchantIndex: 1, categoryIndex: 4,
      name: 'UV Protection Sunscreen SPF50', slug: 'uv-protection-sunscreen',
      description: 'A broad-spectrum sunscreen with SPF50 for maximum UV protection.',
      shortDescription: 'SPF50 broad-spectrum sunscreen',
      price: 20000, compareAtPrice: 25000, sku: 'UVS-005', stockQuantity: 90,
      images: ['https://example.com/uv-protection-sunscreen.jpg'],
      tags: ['sunscreen', 'spf50', 'uv-protection'], skinTypes: ['all'],
      ingredients: ['Zinc Oxide', 'Niacinamide', 'Centella Asiatica'], isFeatured: false,
    },
    {
      merchantIndex: 1, categoryIndex: 5,
      name: 'Hydrating Sheet Mask', slug: 'hydrating-sheet-mask',
      description: 'A moisturizing sheet mask infused with hyaluronic acid for deep hydration.',
      shortDescription: 'Moisturizing sheet mask',
      price: 5000, compareAtPrice: 7000, sku: 'HSM-006', stockQuantity: 200,
      images: ['https://example.com/hydrating-sheet-mask.jpg'],
      tags: ['mask', 'sheet-mask', 'hydrating'], skinTypes: ['dry', 'normal'],
      ingredients: ['Hyaluronic Acid', 'Aloe Vera', 'Collagen'], isFeatured: false,
    },
    {
      merchantIndex: 2, categoryIndex: 2,
      name: 'Niacinamide Pore Minimizing Serum', slug: 'niacinamide-serum',
      description: 'A serum with 10% niacinamide that minimizes pores and controls oil.',
      shortDescription: 'Pore minimizing serum with niacinamide',
      price: 22000, compareAtPrice: 28000, sku: 'NPS-007', stockQuantity: 60,
      images: ['https://example.com/niacinamide-serum.jpg'],
      tags: ['serum', 'niacinamide', 'pore-minimizing'], skinTypes: ['oily', 'combination'],
      ingredients: ['Niacinamide', 'Zinc PCA', 'Salicylic Acid'], isFeatured: true,
    },
    {
      merchantIndex: 2, categoryIndex: 6,
      name: 'Eye Revital Cream', slug: 'eye-revital-cream',
      description: 'An anti-aging eye cream that reduces dark circles and fine lines.',
      shortDescription: 'Anti-aging eye cream',
      price: 28000, compareAtPrice: 35000, sku: 'ERC-008', stockQuantity: 40,
      images: ['https://example.com/eye-revital-cream.jpg'],
      tags: ['eye-care', 'anti-aging', 'cream'], skinTypes: ['all'],
      ingredients: ['Retinol', 'Peptide', 'Caffeine'], isFeatured: false,
    },
    {
      merchantIndex: 2, categoryIndex: 0,
      name: 'Oil Control Cleansing Gel', slug: 'oil-control-cleansing-gel',
      description: 'A refreshing gel cleanser that controls excess oil and prevents breakouts.',
      shortDescription: 'Oil control cleansing gel',
      price: 13000, compareAtPrice: 16000, sku: 'OCC-009', stockQuantity: 70,
      images: ['https://example.com/oil-control-cleansing-gel.jpg'],
      tags: ['cleanser', 'gel', 'oil-control'], skinTypes: ['oily', 'combination'],
      ingredients: ['Tea Tree', 'Salicylic Acid', 'Green Tea'], isFeatured: false,
    },
    {
      merchantIndex: 3, categoryIndex: 3,
      name: 'Soothing Aloe Vera Gel', slug: 'soothing-aloe-vera-gel',
      description: 'A multipurpose aloe vera gel that soothes and moisturizes irritated skin.',
      shortDescription: 'Soothing aloe vera gel',
      price: 8000, compareAtPrice: 10000, sku: 'SAV-010', stockQuantity: 150,
      images: ['https://example.com/soothing-aloe-vera-gel.jpg'],
      tags: ['moisturizer', 'aloe-vera', 'soothing'], skinTypes: ['sensitive', 'all'],
      ingredients: ['Aloe Vera', 'Centella Asiatica', 'Panthenol'], isFeatured: true,
    },
    {
      merchantIndex: 3, categoryIndex: 4,
      name: 'Mineral Sunscreen Stick', slug: 'mineral-sunscreen-stick',
      description: 'A convenient mineral sunscreen stick for easy on-the-go UV protection.',
      shortDescription: 'Mineral sunscreen stick',
      price: 16000, compareAtPrice: 20000, sku: 'MSS-011', stockQuantity: 85,
      images: ['https://example.com/mineral-sunscreen-stick.jpg'],
      tags: ['sunscreen', 'mineral', 'stick'], skinTypes: ['sensitive', 'all'],
      ingredients: ['Zinc Oxide', 'Titanium Dioxide', 'Vitamin E'], isFeatured: false,
    },
    {
      merchantIndex: 3, categoryIndex: 7,
      name: 'Honey Lip Balm', slug: 'honey-lip-balm',
      description: 'A nourishing lip balm with honey extract for soft and smooth lips.',
      shortDescription: 'Nourishing honey lip balm',
      price: 4000, compareAtPrice: 5000, sku: 'HLB-012', stockQuantity: 180,
      images: ['https://example.com/honey-lip-balm.jpg'],
      tags: ['lip-care', 'balm', 'honey'], skinTypes: ['all'],
      ingredients: ['Honey', 'Shea Butter', 'Vitamin E'], isFeatured: false,
    },
  ];

  for (const p of productData) {
    const product = await prisma.product.create({
      data: {
        merchantId: merchants[p.merchantIndex].id,
        categoryId: categories[p.categoryIndex].id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        shortDescription: p.shortDescription,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        sku: p.sku,
        stockQuantity: p.stockQuantity,
        images: p.images,
        tags: p.tags,
        skinTypes: p.skinTypes,
        ingredients: p.ingredients,
        isFeatured: p.isFeatured,
        avgRating: 0,
        reviewCount: 0,
      },
    });
    products.push(product);
  }
  console.log(`Seeded ${products.length} products`);

  // ============================================
  // PROMOTIONS
  // ============================================
  const promotions = [];
  const promoData = [
    {
      merchantIndex: 0, code: 'WELCOME10', description: '10% off for new customers',
      discountTypeCode: 'percentage', discountValue: 10, minOrderAmount: 30000, maxUses: 100,
      startsAt: new Date('2026-08-01'), expiresAt: new Date('2026-12-31'),
    },
    {
      merchantIndex: 1, code: 'GLOW5000', description: '5000 MMK off on orders above 50000',
      discountTypeCode: 'fixed', discountValue: 5000, minOrderAmount: 50000, maxUses: 50,
      startsAt: new Date('2026-08-01'), expiresAt: new Date('2026-10-31'),
    },
    {
      merchantIndex: 2, code: 'BEAUTY20', description: '20% off on selected serums',
      discountTypeCode: 'percentage', discountValue: 20, minOrderAmount: 20000, maxUses: 30,
      startsAt: new Date('2026-08-15'), expiresAt: new Date('2026-09-30'),
    },
  ];

  for (const p of promoData) {
    const promo = await prisma.promotion.create({
      data: {
        merchantId: merchants[p.merchantIndex].id,
        code: p.code,
        description: p.description,
        discountTypeCode: p.discountTypeCode,
        discountValue: p.discountValue,
        minOrderAmount: p.minOrderAmount,
        maxUses: p.maxUses,
        startsAt: p.startsAt,
        expiresAt: p.expiresAt,
      },
    });
    promotions.push(promo);
  }
  console.log(`Seeded ${promotions.length} promotions`);

  // ============================================
  // REVIEWS
  // ============================================
  const reviewData = [
    { buyerIndex: 0, productIndex: 0, rating: 5, title: 'Amazing cleanser!', body: 'My skin feels so clean and soft after using this. Highly recommend!', isVerifiedPurchase: true },
    { buyerIndex: 1, productIndex: 2, rating: 4, title: 'Brightening effect', body: 'I noticed my skin getting brighter after a week of use. Good product.', isVerifiedPurchase: true },
    { buyerIndex: 2, productIndex: 3, rating: 5, title: 'Best moisturizer', body: 'Perfect for my dry skin. Keeps me hydrated all day.', isVerifiedPurchase: true },
    { buyerIndex: 0, productIndex: 4, rating: 4, title: 'Great sunscreen', body: 'Lightweight and does not leave white cast. Love it!', isVerifiedPurchase: true },
    { buyerIndex: 3, productIndex: 6, rating: 5, title: 'Pores look smaller', body: 'This serum really works for my oily skin. Pores are less visible now.', isVerifiedPurchase: true },
    { buyerIndex: 1, productIndex: 9, rating: 5, title: 'So soothing', body: 'This aloe gel is amazing for after sun exposure. Very calming.', isVerifiedPurchase: true },
    { buyerIndex: 2, productIndex: 7, rating: 4, title: 'Good eye cream', body: 'My dark circles have reduced slightly. Will continue using.', isVerifiedPurchase: false },
    { buyerIndex: 3, productIndex: 11, rating: 5, title: 'Love this lip balm', body: 'My lips are so soft and smooth now. Great product!', isVerifiedPurchase: true },
  ];

  for (const r of reviewData) {
    await prisma.review.create({
      data: {
        userId: buyers[r.buyerIndex].id,
        productId: products[r.productIndex].id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        isVerifiedPurchase: r.isVerifiedPurchase,
        isApproved: true,
      },
    });
  }
  console.log(`Seeded ${reviewData.length} reviews`);

  // Update product avg ratings
  for (let i = 0; i < products.length; i++) {
    const stats = await prisma.review.aggregate({
      where: { productId: products[i].id },
      _avg: { rating: true },
      _count: { rating: true },
    });
    if (stats._count.rating > 0) {
      await prisma.product.update({
        where: { id: products[i].id },
        data: {
          avgRating: stats._avg.rating ?? 0,
          reviewCount: stats._count.rating,
        },
      });
    }
  }
  console.log('Updated product avg ratings');

  // ============================================
  // ORDERS
  // ============================================
  const orders = [];

  // Order 1 - Buyer 0 buys from Merchant 0
  const order1 = await prisma.order.create({
    data: {
      buyerId: buyers[0].id,
      merchantId: merchants[0].id,
      statusCode: 'delivered',
      totalAmount: 40000,
      shippingAddress: { street: '123 Yangon Street', city: 'Yangon', country: 'Myanmar', zip: '11111' },
      paymentMethod: 'bank_transfer',
      paymentStatus: 'completed',
    },
  });
  await prisma.orderItem.create({
    data: { orderId: order1.id, productId: products[0].id, merchantId: merchants[0].id, quantity: 1, unitPrice: 15000, totalPrice: 15000 },
  });
  await prisma.orderItem.create({
    data: { orderId: order1.id, productId: products[1].id, merchantId: merchants[0].id, quantity: 1, unitPrice: 12000, totalPrice: 12000 },
  });
  orders.push(order1);

  // Order 2 - Buyer 1 buys from Merchant 1
  const order2 = await prisma.order.create({
    data: {
      buyerId: buyers[1].id,
      merchantId: merchants[1].id,
      statusCode: 'shipped',
      totalAmount: 43000,
      shippingAddress: { street: '456 Mandalay Road', city: 'Mandalay', country: 'Myanmar', zip: '02222' },
      paymentMethod: 'credit_card',
      paymentStatus: 'completed',
    },
  });
  await prisma.orderItem.create({
    data: { orderId: order2.id, productId: products[3].id, merchantId: merchants[1].id, quantity: 1, unitPrice: 18000, totalPrice: 18000 },
  });
  await prisma.orderItem.create({
    data: { orderId: order2.id, productId: products[4].id, merchantId: merchants[1].id, quantity: 1, unitPrice: 20000, totalPrice: 20000 },
  });
  orders.push(order2);

  // Order 3 - Buyer 2 buys from Merchant 2
  const order3 = await prisma.order.create({
    data: {
      buyerId: buyers[2].id,
      merchantId: merchants[2].id,
      statusCode: 'confirmed',
      totalAmount: 50000,
      shippingAddress: { street: '789 Nay Pyi Taw', city: 'Nay Pyi Taw', country: 'Myanmar', zip: '05555' },
      paymentMethod: 'e_wallet',
      paymentStatus: 'completed',
      couponCode: 'BEAUTY20',
      discountAmount: 10000,
    },
  });
  await prisma.orderItem.create({
    data: { orderId: order3.id, productId: products[6].id, merchantId: merchants[2].id, quantity: 2, unitPrice: 22000, totalPrice: 44000 },
  });
  orders.push(order3);

  // Order 4 - Buyer 3 buys from Merchant 3
  const order4 = await prisma.order.create({
    data: {
      buyerId: buyers[3].id,
      merchantId: merchants[3].id,
      statusCode: 'placed',
      totalAmount: 28000,
      shippingAddress: { street: '321 Bago Lane', city: 'Bago', country: 'Myanmar', zip: '06666' },
      paymentMethod: 'bank_transfer',
      paymentStatus: 'pending',
    },
  });
  await prisma.orderItem.create({
    data: { orderId: order4.id, productId: products[9].id, merchantId: merchants[3].id, quantity: 2, unitPrice: 8000, totalPrice: 16000 },
  });
  await prisma.orderItem.create({
    data: { orderId: order4.id, productId: products[10].id, merchantId: merchants[3].id, quantity: 1, unitPrice: 16000, totalPrice: 16000 },
  });
  orders.push(order4);

  console.log(`Seeded ${orders.length} orders`);

  // ============================================
  // WISHLISTS
  // ============================================
  const wishlistData = [
    { buyerIndex: 0, productIndex: 2 },
    { buyerIndex: 0, productIndex: 6 },
    { buyerIndex: 1, productIndex: 0 },
    { buyerIndex: 1, productIndex: 3 },
    { buyerIndex: 2, productIndex: 4 },
    { buyerIndex: 2, productIndex: 9 },
    { buyerIndex: 3, productIndex: 2 },
    { buyerIndex: 3, productIndex: 7 },
  ];

  for (const w of wishlistData) {
    await prisma.wishlist.create({
      data: {
        userId: buyers[w.buyerIndex].id,
        productId: products[w.productIndex].id,
      },
    });
  }
  console.log(`Seeded ${wishlistData.length} wishlists`);

  // ============================================
  // CARTS & CART ITEMS
  // ============================================
  const cart1 = await prisma.cart.create({
    data: { userId: buyers[0].id },
  });
  await prisma.cartItem.create({
    data: { cartId: cart1.id, productId: products[5].id, quantity: 3 },
  });
  await prisma.cartItem.create({
    data: { cartId: cart1.id, productId: products[8].id, quantity: 1 },
  });

  const cart2 = await prisma.cart.create({
    data: { userId: buyers[1].id },
  });
  await prisma.cartItem.create({
    data: { cartId: cart2.id, productId: products[2].id, quantity: 2 },
  });

  console.log('Seeded 2 carts with items');

  // ============================================
  // SKIN ANALYSES
  // ============================================
  const analysis1 = await prisma.skinAnalysis.create({
    data: {
      userId: buyers[0].id,
      imageUrl: 'https://storage.example.com/analyses/buyer0-face.jpg',
      skinType: 'combination',
      estimatedAge: 28,
      analysisStatus: 'completed',
      aiModel: 'skin-analysis-v1',
      aiModelVersion: '1.0.0',
      completedAt: new Date(),
    },
  });
  await prisma.skinAnalysisCondition.create({
    data: { analysisId: analysis1.id, conditionName: 'Acne', severity: 'mild', confidence: 0.75 },
  });
  await prisma.skinAnalysisCondition.create({
    data: { analysisId: analysis1.id, conditionName: 'Oiliness', severity: 'moderate', confidence: 0.82 },
  });
  await prisma.skinAnalysisRecommendation.create({
    data: { analysisId: analysis1.id, productId: products[6].id, reason: 'Niacinamide helps control oil and minimize pores', matchScore: 92, displayOrder: 1 },
  });
  await prisma.skinAnalysisRecommendation.create({
    data: { analysisId: analysis1.id, productId: products[0].id, reason: 'Gentle cleanser suitable for combination skin', matchScore: 85, displayOrder: 2 },
  });

  const analysis2 = await prisma.skinAnalysis.create({
    data: {
      userId: buyers[2].id,
      imageUrl: 'https://storage.example.com/analyses/buyer2-face.jpg',
      skinType: 'dry',
      estimatedAge: 35,
      analysisStatus: 'completed',
      aiModel: 'skin-analysis-v1',
      aiModelVersion: '1.0.0',
      completedAt: new Date(),
    },
  });
  await prisma.skinAnalysisCondition.create({
    data: { analysisId: analysis2.id, conditionName: 'Dryness', severity: 'severe', confidence: 0.91 },
  });
  await prisma.skinAnalysisCondition.create({
    data: { analysisId: analysis2.id, conditionName: 'Fine Lines', severity: 'mild', confidence: 0.68 },
  });
  await prisma.skinAnalysisRecommendation.create({
    data: { analysisId: analysis2.id, productId: products[3].id, reason: 'Rich moisturizer for dry skin', matchScore: 95, displayOrder: 1 },
  });
  await prisma.skinAnalysisRecommendation.create({
    data: { analysisId: analysis2.id, productId: products[1].id, reason: 'Hydrating toner to prep dry skin', matchScore: 88, displayOrder: 2 },
  });

  console.log('Seeded 2 skin analyses');

  // ============================================
  // NOTIFICATIONS
  // ============================================
  const notificationData = [
    { userId: buyers[0].id, type: 'order', title: 'Order Delivered', message: 'Your order has been delivered successfully.' },
    { userId: buyers[1].id, type: 'order', title: 'Order Shipped', message: 'Your order has been shipped. Track your package.' },
    { userId: buyers[2].id, type: 'order', title: 'Order Confirmed', message: 'Your order has been confirmed by the merchant.' },
    { userId: buyers[3].id, type: 'order', title: 'Order Placed', message: 'Your order has been placed. Awaiting confirmation.' },
    { userId: merchantUsers[0].id, type: 'promo', title: 'Promotion Active', message: 'Your coupon WELCOME10 is now active.' },
    { userId: buyers[0].id, type: 'analysis', title: 'Analysis Complete', message: 'Your skin analysis is ready. Check your results!' },
  ];

  for (const n of notificationData) {
    await prisma.notification.create({
      data: {
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
      },
    });
  }
  console.log(`Seeded ${notificationData.length} notifications`);

  // ============================================
  // AUDIT LOGS
  // ============================================
  const auditData = [
    { userId: admins[0].id, action: 'APPROVE_MERCHANT', entityType: 'merchant', entityId: merchants[0].id },
    { userId: admins[0].id, action: 'APPROVE_MERCHANT', entityType: 'merchant', entityId: merchants[1].id },
    { userId: buyers[0].id, action: 'PLACE_ORDER', entityType: 'order', entityId: order1.id },
    { userId: buyers[1].id, action: 'PLACE_ORDER', entityType: 'order', entityId: order2.id },
  ];

  for (const a of auditData) {
    await prisma.auditLog.create({
      data: {
        userId: a.userId,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
      },
    });
  }
  console.log(`Seeded ${auditData.length} audit logs`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n========== SEED SUMMARY ==========');
  console.log(`Buyers:     ${buyers.length}`);
  console.log(`Merchants:  ${merchants.length}`);
  console.log(`Admins:     ${admins.length}`);
  console.log(`Categories: ${categories.length}`);
  console.log(`Products:   ${products.length}`);
  console.log(`Shops:      ${shops.length}`);
  console.log(`Reviews:    ${reviewData.length}`);
  console.log(`Orders:     ${orders.length}`);
  console.log(`Promotions: ${promotions.length}`);
  console.log(`Wishlists:  ${wishlistData.length}`);
  console.log(`Carts:      2`);
  console.log(`Analyses:   2`);
  console.log(`Notifications: ${notificationData.length}`);
  console.log(`Audit Logs: ${auditData.length}`);
  console.log('==================================');
  console.log('All users password: Cosmetics@123');
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
