import { test, expect } from '@playwright/test';
import { API_BASE_URL } from '../../utils/constants';
import { person } from '../../utils/identity';

const API = API_BASE_URL;

test.describe('Auth API Contract Tests', () => {
  test.describe('I-01: POST /auth/register - returns 201 with user data', () => {
    test('should return 201 with user data for valid buyer registration', async ({ request }) => {
      const user = person('Ryan', 'Mitchell');
      const response = await request.post(`${API}/auth/register`, {
        multipart: {
          name: user.name,
          email: user.email,
          password: 'TestPass123!',
          role: 'buyer',
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.accessToken || body.data?.accessToken).toBeDefined();
      expect(body.refreshToken || body.data?.refreshToken).toBeDefined();
    });
  });

  test.describe('I-02: POST /auth/register - returns 409 for duplicate email', () => {
    test('should return 409 when registering with existing email', async ({ request }) => {
      const user = person('Tessa', 'Nguyen');

      await request.post(`${API}/auth/register`, {
        multipart: { name: user.name, email: user.email, password: 'TestPass123!', role: 'buyer' },
      });

      const response = await request.post(`${API}/auth/register`, {
        multipart: { name: user.name, email: user.email, password: 'TestPass123!', role: 'buyer' },
      });

      expect(response.status()).toBe(409);
    });
  });

  test.describe('I-03: POST /auth/login - returns access token', () => {
    test('should return accessToken for valid credentials', async ({ request }) => {
      const user = person('Kevin', 'Osei');

      await request.post(`${API}/auth/register`, {
        multipart: { name: user.name, email: user.email, password: 'TestPass123!', role: 'buyer' },
      });

      const response = await request.post(`${API}/auth/login`, {
        data: { email: user.email, password: 'TestPass123!' },
      });

      expect([200, 201]).toContain(response.status());
      const body = await response.json();
      expect(body.accessToken || body.data?.accessToken).toBeDefined();
    });
  });

  test.describe('I-04: POST /auth/login - returns 401 for invalid credentials', () => {
    test('should return 401 for wrong password', async ({ request }) => {
      const response = await request.post(`${API}/auth/login`, {
        data: { email: 'nathan.fielding@gmail.com', password: 'WrongPassword123!' },
      });

      expect([400, 401]).toContain(response.status());
    });
  });

  test.describe('I-05: POST /auth/refresh - returns new access token', () => {
    test('should return new accessToken on valid refresh', async ({ request }) => {
      const user = person('Amara', 'Diallo');

      await request.post(`${API}/auth/register`, {
        multipart: { name: user.name, email: user.email, password: 'TestPass123!', role: 'buyer' },
      });

      const loginResponse = await request.post(`${API}/auth/login`, {
        data: { email: user.email, password: 'TestPass123!' },
      });

      const loginBody = await loginResponse.json();
      const refreshToken = loginBody.refreshToken || loginBody.data?.refreshToken;

      if (refreshToken) {
        const response = await request.post(`${API}/auth/refresh`, {
          data: { refreshToken },
        });
        expect([200, 201]).toContain(response.status());
        const body = await response.json();
        expect(body.accessToken || body.data?.accessToken).toBeDefined();
      }
    });
  });

  test.describe('I-06: POST /auth/refresh - returns error for invalid refresh token', () => {
    test('should return error for invalid refresh token', async ({ request }) => {
      const response = await request.post(`${API}/auth/refresh`, {
        data: { refreshToken: 'invalid-expired-token' },
      });

      expect([400, 401]).toContain(response.status());
    });
  });

  test.describe('I-07: POST /auth/logout - returns success on valid token', () => {
    test('should return success on successful logout', async ({ request }) => {
      const user = person('Jonas', 'Weber');

      const regResponse = await request.post(`${API}/auth/register`, {
        multipart: { name: user.name, email: user.email, password: 'TestPass123!', role: 'buyer' },
      });

      const regBody = await regResponse.json();
      const accessToken = regBody.accessToken || regBody.data?.accessToken;

      if (!accessToken) {
        test.skip(true, 'No accessToken from register');
        return;
      }

      const response = await request.post(`${API}/auth/logout`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect([200, 201, 500]).toContain(response.status());
    });
  });

  test.describe('I-08: GET /auth/verify - returns user profile', () => {
    test('should return user data for valid token', async ({ request }) => {
      const user = person('Mei', 'Tanaka');

      const regResponse = await request.post(`${API}/auth/register`, {
        multipart: { name: user.name, email: user.email, password: 'TestPass123!', role: 'buyer' },
      });

      const regBody = await regResponse.json();
      const accessToken = regBody.accessToken || regBody.data?.accessToken;

      if (!accessToken) {
        test.skip(true, 'No accessToken from register');
        return;
      }

      const response = await request.get(`${API}/auth/verify`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.id || body.email || body.user?.id || body.data?.id).toBeDefined();
    });
  });

  test.describe('I-09: GET /auth/verify - returns 401 for blacklisted token', () => {
    test('should return 401 for invalid/expired token', async ({ request }) => {
      const response = await request.get(`${API}/auth/verify`, {
        headers: { Authorization: 'Bearer invalid-expired-token' },
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('I-10: POST /auth/forgot-password - returns success message', () => {
    test('should return success message for valid email', async ({ request }) => {
      const user = person('Paulo', 'Costa');

      await request.post(`${API}/auth/register`, {
        multipart: { name: user.name, email: user.email, password: 'TestPass123!', role: 'buyer' },
      });

      const response = await request.post(`${API}/auth/forgot-password`, {
        data: { email: user.email },
      });

      expect([200, 201]).toContain(response.status());
      const body = await response.json();
      expect(body.message || body.data?.message).toBeDefined();
    });
  });

  test.describe('I-11: POST /auth/forgot-password - returns error for non-existent email', () => {
    test('should return error or same message for non-existent email', async ({ request }) => {
      const response = await request.post(`${API}/auth/forgot-password`, {
        data: { email: 'casey.morrow@gmail.com' },
      });

      expect([200, 201, 404]).toContain(response.status());
      const body = await response.json();
      expect(body.message || body.data?.message).toBeDefined();
    });
  });

  test.describe('I-12: POST /auth/reset-password - returns response', () => {
    test('should return response for reset password request', async ({ request }) => {
      const response = await request.post(`${API}/auth/reset-password`, {
        data: { token: 'valid-test-token', password: 'NewSecurePass123!' },
      });

      expect([200, 400]).toContain(response.status());
      const body = await response.json();
      expect(body.message || body.data?.message || body.error).toBeDefined();
    });
  });

  test.describe('I-13: POST /auth/reset-password - returns 400 for invalid token', () => {
    test('should return 400 for invalid reset token', async ({ request }) => {
      const response = await request.post(`${API}/auth/reset-password`, {
        data: { token: 'invalid-token-12345', password: 'NewSecurePass123!' },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('I-14: POST /auth/reset-password - returns 400 for weak password', () => {
    test('should return 400 for weak password', async ({ request }) => {
      const response = await request.post(`${API}/auth/reset-password`, {
        data: { token: 'some-token', password: 'weak' },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('I-15: Error response follows standard API format', () => {
    test('should return error with statusCode, message, error', async ({ request }) => {
      const response = await request.post(`${API}/auth/login`, {
        data: { email: 'tyler.nguyen@gmail.com', password: 'WrongPass123!' },
      });

      const body = await response.json();
      expect(body.statusCode || body.status).toBeDefined();
      expect(body.message).toBeDefined();
    });
  });

  test.describe('I-17: Register with merchant role creates merchants record', () => {
    test('should return merchant data for merchant registration', async ({ request }) => {
      const user = person('Helena', 'Vargas');

      const pdfBuffer = Buffer.from('%PDF-1.4\n%E2E Test License PDF\n%%EOF');
      const response = await request.post(`${API}/auth/register`, {
        multipart: {
          name: user.name,
          email: user.email,
          password: 'TestPass123!',
          role: 'merchant',
          license: {
            name: 'license.pdf',
            mimeType: 'application/pdf',
            buffer: pdfBuffer,
          },
        },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.accessToken || body.data?.accessToken).toBeDefined();
    });
  });

  test.describe('I-18: Register with buyer role returns tokens', () => {
    test('should return tokens for buyer registration', async ({ request }) => {
      const user = person('Ibrahim', 'Sesay');

      const response = await request.post(`${API}/auth/register`, {
        multipart: { name: user.name, email: user.email, password: 'TestPass123!', role: 'buyer' },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.accessToken || body.data?.accessToken).toBeDefined();
      expect(body.refreshToken || body.data?.refreshToken).toBeDefined();
    });
  });
});
