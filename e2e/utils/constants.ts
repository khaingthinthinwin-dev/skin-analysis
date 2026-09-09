export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api/v1';
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  VERIFY_CODE: '/verify-code',
  RESET_PASSWORD: '/reset-password',
  BUYER_DASHBOARD: '/buyer',
  MERCHANT_DASHBOARD: '/merchant',
  ADMIN_DASHBOARD: '/admin',
} as const;

export const TEST_USERS = {
  buyer: {
    name: 'E2E Test Buyer',
    email: `e2e.buyer.${Date.now()}@test.com`,
    password: 'TestPass123!',
    role: 'buyer' as const,
  },
  merchant: {
    name: 'E2E Test Merchant',
    email: `e2e.merchant.${Date.now()}@test.com`,
    password: 'TestPass123!',
    role: 'merchant' as const,
  },
} as const;
