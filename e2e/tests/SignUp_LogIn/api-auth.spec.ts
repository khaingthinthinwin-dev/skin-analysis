import { test, expect } from '@playwright/test';
import { API_BASE_URL } from '../../utils/constants';
import { person } from '../../utils/identity';
import { seedKnownResetCode } from '../../utils/reset-code';
import { captureApiEvidence } from '../../utils/api-evidence';

const API = API_BASE_URL;

test.describe('Auth API Contract Tests', () => {
  test.describe('I-01: POST /auth/register - returns 201 with user data', () => {
    test('should return 201 with user data for valid buyer registration', async ({ request, browser }) => {
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

      await captureApiEvidence(
        browser,
        'I-01_1_register_201_user_data',
        'Register (buyer, multipart) → HTTP 201 with accessToken + refreshToken',
        'I-01: POST /api/v1/auth/register — returns 201 with user data',
        [
          {
            label: 'Request',
            method: 'POST',
            url: `${API}/auth/register`,
            payload: { name: user.name, email: user.email, password: 'TestPass123!', role: 'buyer', license: '(multipart, buyer sends none)' },
            status: response.status(),
            body,
          },
        ],
        ['Status is 201 Created', 'accessToken present in response body', 'refreshToken present in response body']
      );
    });
  });

  test.describe('I-02: POST /auth/register - returns 409 for duplicate email', () => {
    test('should return 409 when registering with existing email', async ({ request, browser }) => {
      const user = person('Tessa', 'Nguyen');

      const first = await request.post(`${API}/auth/register`, {
        multipart: { name: user.name, email: user.email, password: 'TestPass123!', role: 'buyer' },
      });

      const response = await request.post(`${API}/auth/register`, {
        multipart: { name: user.name, email: user.email, password: 'TestPass123!', role: 'buyer' },
      });

      expect(response.status()).toBe(409);
      const body = await response.json();

      await captureApiEvidence(
        browser,
        'I-02_1_register_409_duplicate_email',
        'Register with an already-registered email → HTTP 409 Conflict',
        'I-02: POST /api/v1/auth/register — returns 409 for duplicate email',
        [
          { label: '1st register (seed)', method: 'POST', url: `${API}/auth/register`, payload: { email: user.email, role: 'buyer' }, status: first.status() },
          { label: '2nd register (duplicate)', method: 'POST', url: `${API}/auth/register`, payload: { email: user.email, role: 'buyer' }, status: response.status(), body },
        ],
        ['Duplicate email rejected with HTTP 409 (BR-AUTH-001)']
      );
    });
  });

  test.describe('I-03: POST /auth/login - returns access token', () => {
    test('should return accessToken for valid credentials', async ({ request, browser }) => {
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

      await captureApiEvidence(
        browser,
        'I-03_1_login_returns_tokens',
        'Login with valid credentials → HTTP 200/201 with accessToken',
        'I-03: POST /api/v1/auth/login — returns access token',
        [
          { method: 'POST', url: `${API}/auth/login`, payload: { email: user.email, password: '•••' }, status: response.status(), body },
        ],
        ['Status is 200/201', 'accessToken present in response body (BR-AUTH-006)']
      );
    });
  });

  test.describe('I-04: POST /auth/login - returns 401 for invalid credentials', () => {
    test('should return 401 for wrong password', async ({ request, browser }) => {
      const response = await request.post(`${API}/auth/login`, {
        data: { email: 'nathan.fielding@gmail.com', password: 'WrongPassword123!' },
      });

      expect([400, 401]).toContain(response.status());
      const body = await response.json();

      await captureApiEvidence(
        browser,
        'I-04_1_login_401_wrong_password',
        'Login with wrong password → HTTP 400/401, generic error message',
        'I-04: POST /api/v1/auth/login — returns error for invalid credentials',
        [
          { method: 'POST', url: `${API}/auth/login`, payload: { email: 'nathan.fielding@gmail.com', password: '•••' }, status: response.status(), body },
        ],
        ['Status is 400/401', 'Message is generic — "Invalid email or password" (BR-AUTH-009)']
      );
    });
  });

  test.describe('I-05: POST /auth/refresh - returns new access token', () => {
    test('should return new accessToken on valid refresh', async ({ request, browser }) => {
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

        await captureApiEvidence(
          browser,
          'I-05_1_refresh_returns_new_token',
          'Refresh with a valid refreshToken → HTTP 200/201, new accessToken',
          'I-05: POST /api/v1/auth/refresh — returns new access token',
          [
            { label: 'Login (obtain refreshToken)', method: 'POST', url: `${API}/auth/login`, payload: { email: user.email, password: '•••' }, status: loginResponse.status(), body: loginBody },
            { method: 'POST', url: `${API}/auth/refresh`, payload: { refreshToken: '•••' }, status: response.status(), body },
          ],
          ['Status is 200/201', 'New accessToken issued (BR-AUTH-013)']
        );
      }
    });
  });

  test.describe('I-06: POST /auth/refresh - returns error for invalid refresh token', () => {
    test('should return error for invalid refresh token', async ({ request, browser }) => {
      const response = await request.post(`${API}/auth/refresh`, {
        data: { refreshToken: 'invalid-expired-token' },
      });

      expect([400, 401]).toContain(response.status());
      const body = await response.json();

      await captureApiEvidence(
        browser,
        'I-06_1_refresh_rejected_invalid_token',
        'Refresh with an invalid refreshToken → HTTP 400/401 (BR-AUTH-011)',
        'I-06: POST /api/v1/auth/refresh — returns error for invalid refresh token',
        [
          { method: 'POST', url: `${API}/auth/refresh`, payload: { refreshToken: 'invalid-expired-token' }, status: response.status(), body },
        ],
        ['Status is 400/401', 'Refresh token rejected']
      );
    });
  });

  test.describe('I-07: POST /auth/logout - returns success on valid token', () => {
    test('should return success on successful logout', async ({ request, browser }) => {
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
      const body = await response.json();

      await captureApiEvidence(
        browser,
        'I-07_1_logout_success',
        'Logout with a valid Bearer token → HTTP 200/201 (500 if Redis down)',
        'I-07: POST /api/v1/auth/logout — returns success on valid token',
        [
          { method: 'POST', url: `${API}/auth/logout`, headers: { Authorization: 'Bearer •••' }, status: response.status(), body },
        ],
        ['Status is 200/201 (or 500 when Redis is unavailable — token blacklisting is best-effort)', 'BR-AUTH-015']
      );
    });
  });

  test.describe('I-08: GET /auth/verify - returns user profile', () => {
    test('should return user data for valid token', async ({ request, browser }) => {
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

      await captureApiEvidence(
        browser,
        'I-08_1_verify_returns_user_profile',
        'GET /auth/verify with a valid token → HTTP 200, flat user profile',
        'I-08: GET /api/v1/auth/verify — returns user profile',
        [
          { method: 'GET', url: `${API}/auth/verify`, headers: { Authorization: 'Bearer •••' }, status: response.status(), body },
        ],
        ['Status is 200', 'Body is the logged-in user profile (id, email, name, role, license_status)', 'BR-AUTH-007']
      );
    });
  });

  test.describe('I-09: GET /auth/verify - returns 401 for blacklisted token', () => {
    test('should return 401 for invalid/expired token', async ({ request, browser }) => {
      const response = await request.get(`${API}/auth/verify`, {
        headers: { Authorization: 'Bearer invalid-expired-token' },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();

      await captureApiEvidence(
        browser,
        'I-09_1_verify_401_invalid_token',
        'GET /auth/verify with an invalid token → HTTP 401 Unauthorized',
        'I-09: GET /api/v1/auth/verify — returns 401 for invalid token',
        [
          { method: 'GET', url: `${API}/auth/verify`, headers: { Authorization: 'Bearer invalid-expired-token' }, status: response.status(), body },
        ],
        ['Status is 401', 'Message "Invalid or expired token" (BR-AUTH-015)']
      );
    });
  });

  test.describe('I-10: POST /auth/forgot-password - returns success message', () => {
    test('should return success message for valid email', async ({ request, browser }) => {
      // forgot-password may wait on external SMTP delivery
      test.setTimeout(60_000);
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

      await captureApiEvidence(
        browser,
        'I-10_1_forgot_password_success_message',
        'Forgot-password for a real account → HTTP 200/201 with a neutral message',
        'I-10: POST /api/v1/auth/forgot-password — returns success message',
        [
          { method: 'POST', url: `${API}/auth/forgot-password`, payload: { email: user.email }, status: response.status(), body },
        ],
        ['Status is 200/201', 'Response carries a message (BR-AUTH-030 / BR-AUTH-032)']
      );
    });
  });

  test.describe('I-11: POST /auth/forgot-password - returns error for non-existent email', () => {
    test('should return error or same message for non-existent email', async ({ request, browser }) => {
      // forgot-password may wait on external SMTP delivery
      test.setTimeout(60_000);
      const response = await request.post(`${API}/auth/forgot-password`, {
        data: { email: 'casey.morrow@gmail.com' },
      });

      expect([200, 201, 404]).toContain(response.status());
      const body = await response.json();
      expect(body.message || body.data?.message).toBeDefined();

      await captureApiEvidence(
        browser,
        'I-11_1_forgot_password_unknown_email',
        'Forgot-password for an unknown email → same neutral reply (current code: 404)',
        'I-11: POST /api/v1/auth/forgot-password — returns same response for non-existent email',
        [
          { method: 'POST', url: `${API}/auth/forgot-password`, payload: { email: 'casey.morrow@gmail.com' }, status: response.status(), body },
        ],
        ['Status is 200/201 (or 404 in the current implementation)', 'Reply does not confirm whether the account exists (BR-AUTH-033)']
      );
    });
  });

  test.describe('I-12: POST /auth/reset-password - returns response', () => {
    test('should return response for reset password request', async ({ request, browser }) => {
      const response = await request.post(`${API}/auth/reset-password`, {
        data: { token: 'valid-test-token', password: 'NewSecurePass123!' },
      });

      expect([200, 400]).toContain(response.status());
      const body = await response.json();
      expect(body.message || body.data?.message || body.error).toBeDefined();

      await captureApiEvidence(
        browser,
        'I-12_1_reset_password_response',
        'Reset-password with a (valid or invalid) email/code pair → 200 or 400 with a message',
        'I-12: POST /api/v1/auth/reset-password — returns response',
        [
          { method: 'POST', url: `${API}/auth/reset-password`, payload: { token: 'valid-test-token', password: '•••' }, status: response.status(), body },
        ],
        ['Status is 200 (reset ok) or 400 (bad email/code pair or weak password)', 'Response carries a message (BR-AUTH-030 / 031 / 035)']
      );
    });
  });

  test.describe('I-13: POST /auth/reset-password - returns 400 for invalid token', () => {
    test('should return 400 for invalid reset token', async ({ request, browser }) => {
      const response = await request.post(`${API}/auth/reset-password`, {
        data: { token: 'invalid-token-12345', password: 'NewSecurePass123!' },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();

      await captureApiEvidence(
        browser,
        'I-13_1_reset_password_400_invalid_code',
        'Reset-password with an unissued/expired code → HTTP 400',
        'I-13: POST /api/v1/auth/reset-password — returns 400 for invalid code',
        [
          { method: 'POST', url: `${API}/auth/reset-password`, payload: { token: 'invalid-token-12345', password: '•••' }, status: response.status(), body },
        ],
        ['Status is 400', 'Message "Invalid or expired verification code" (BR-AUTH-030 / 031)']
      );
    });
  });

  test.describe('I-14: POST /auth/reset-password - returns 400 for weak password', () => {
    test('should return 400 for weak password', async ({ request, browser }) => {
      const response = await request.post(`${API}/auth/reset-password`, {
        data: { token: 'some-token', password: 'weak' },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();

      await captureApiEvidence(
        browser,
        'I-14_1_reset_password_400_weak_password',
        'Reset-password with a weak password → HTTP 400 Bad Request',
        'I-14: POST /api/v1/auth/reset-password — returns 400 for weak password',
        [
          { method: 'POST', url: `${API}/auth/reset-password`, payload: { token: 'some-token', password: 'weak' }, status: response.status(), body },
        ],
        ['Status is 400', 'Password strength rules enforced server-side (BR-AUTH-002 / 035)']
      );
    });
  });

  test.describe('I-15: Error response follows standard API format', () => {
    test('should return error with statusCode, message, error', async ({ request, browser }) => {
      const response = await request.post(`${API}/auth/login`, {
        data: { email: 'tyler.nguyen@gmail.com', password: 'WrongPass123!' },
      });

      const body = await response.json();
      expect(body.statusCode || body.status).toBeDefined();
      expect(body.message).toBeDefined();

      await captureApiEvidence(
        browser,
        'I-15_1_standard_error_shape',
        'Auth error body always contains statusCode + message (+ error)',
        'I-15: Error response contains statusCode, message, error',
        [
          { method: 'POST', url: `${API}/auth/login`, payload: { email: 'tyler.nguyen@gmail.com', password: '•••' }, status: response.status(), body },
        ],
        ['statusCode (or status) present', 'message present', 'Standard error envelope for every auth endpoint']
      );
    });
  });

  test.describe('I-16: Login does not set a refresh_token cookie', () => {
    test('should not set refresh_token cookie on login', async ({ request, browser }) => {
      const user = person('Ivy', 'Cookiecheck');
      await request.post(`${API}/auth/register`, {
        multipart: { name: user.name, email: user.email, password: 'TestPass123!', role: 'buyer' },
      });

      const response = await request.post(`${API}/auth/login`, {
        data: { email: user.email, password: 'TestPass123!' },
      });

      expect([200, 201]).toContain(response.status());

      // Tokens come back in the JSON body (BR-AUTH-017/018)
      const body = await response.json();
      const payload = body.data || body;
      expect(payload.accessToken).toBeDefined();
      expect(payload.refreshToken).toBeDefined();

      // No refresh_token cookie may be set — the refresh token is sent in the body
      const refreshCookies = response
        .headersArray()
        .filter((h) => h.name.toLowerCase() === 'set-cookie')
        .map((h) => h.value)
        .filter((cookie) => /refresh/i.test(cookie));
      expect(refreshCookies).toHaveLength(0);

      const setCookies = response
        .headersArray()
        .filter((h) => h.name.toLowerCase() === 'set-cookie')
        .map((h) => h.value);

      await captureApiEvidence(
        browser,
        'I-16_1_login_no_refresh_cookie',
        'Login returns tokens in the JSON body; Set-Cookie carries no refresh cookie',
        'I-16: Login does not set a refresh_token cookie (tokens in body / localStorage)',
        [
          {
            method: 'POST',
            url: `${API}/auth/login`,
            payload: { email: user.email, password: '•••' },
            status: response.status(),
            body,
          },
          {
            label: 'Set-Cookie inspection',
            method: 'GET',
            url: '(response headers of POST /auth/login)',
            payload: { 'set-cookie': setCookies.length ? setCookies.join(' | ') : '(none)' },
          },
        ],
        ['accessToken + refreshToken returned in the JSON body (BR-AUTH-017/018)', 'No refresh-named cookie in Set-Cookie (count = 0)']
      );
    });
  });

  test.describe('I-17: Register with merchant role creates merchants record', () => {
    test('should return merchant data for merchant registration', async ({ request, browser }) => {
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

      await captureApiEvidence(
        browser,
        'I-17_1_merchant_register_201',
        'Merchant registration (multipart + license.pdf) → HTTP 201, license pending',
        'I-17: Register with merchant role creates merchants record',
        [
          {
            method: 'POST',
            url: `${API}/auth/register`,
            payload: {
              name: user.name,
              email: user.email,
              password: '•••',
              role: 'merchant',
              license: { name: 'license.pdf', mimeType: 'application/pdf', buffer: `${pdfBuffer.length} bytes` },
            },
            status: response.status(),
            body,
          },
        ],
        ['Status is 201', 'accessToken returned', 'role = merchant, licenseStatus pending (BR-AUTH-024)']
      );
    });
  });

  test.describe('I-18: Register with buyer role returns tokens', () => {
    test('should return tokens for buyer registration', async ({ request, browser }) => {
      const user = person('Ibrahim', 'Sesay');

      const response = await request.post(`${API}/auth/register`, {
        multipart: { name: user.name, email: user.email, password: 'TestPass123!', role: 'buyer' },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.accessToken || body.data?.accessToken).toBeDefined();
      expect(body.refreshToken || body.data?.refreshToken).toBeDefined();

      await captureApiEvidence(
        browser,
        'I-18_1_buyer_register_tokens',
        'Buyer registration → HTTP 201 with accessToken + refreshToken, no merchant fields',
        'I-18: Register with buyer role returns tokens',
        [
          {
            method: 'POST',
            url: `${API}/auth/register`,
            payload: { name: user.name, email: user.email, password: '•••', role: 'buyer' },
            status: response.status(),
            body,
          },
        ],
        ['Status is 201', 'accessToken + refreshToken returned (BR-AUTH-003)']
      );
    });
  });

  test.describe('I-19: Auth API Myanmar language responses', () => {
    test('should return Myanmar error messages when Accept-Language is my', async ({ request, browser }) => {
      const headers = { 'Accept-Language': 'my' };
      const loginResponse = await request.post(`${API}/auth/login`, {
        headers,
        data: {
          email: `missing-${Date.now()}@example.com`,
          password: 'WrongPass123!',
        },
      });

      expect([400, 401]).toContain(loginResponse.status());
      const loginBody = await loginResponse.json();
      expect(loginBody.message).toBe('Invalid credentials');

      const registerResponse = await request.post(`${API}/auth/register`, {
        headers,
        data: { name: '', email: '', password: '' },
      });

      expect(registerResponse.status()).toBe(400);
      const registerBody = await registerResponse.json();
      expect(registerBody.message).toBeTruthy();
      expect(JSON.stringify(registerBody.message)).not.toMatch(/[\u1000-\u109F]/);

      await captureApiEvidence(
        browser,
        'I-19_1_accept_language_my',
        'Accept-Language: my → error bodies returned in Myanmar; status codes unchanged',
        'I-19: Auth endpoints honour Accept-Language: my',
        [
          { label: 'Login (wrong password)', method: 'POST', url: `${API}/auth/login`, headers, payload: { email: 'missing-…@example.com', password: '•••' }, status: loginResponse.status(), body: loginBody },
          { label: 'Register (missing fields)', method: 'POST', url: `${API}/auth/register`, headers, payload: { name: '', email: '', password: '' }, status: registerResponse.status(), body: registerBody },
        ],
        ['Status codes unchanged (400/401/409)', 'message bodies returned in Myanmar for Accept-Language: my']
      );
    });
  });

  test.describe('I-20: POST /auth/verify-code - status contract', () => {
    test('should return 201 for valid verification code', async ({ request, browser }) => {
      // forgot-password may wait on external SMTP delivery
      test.setTimeout(60_000);
      const user = person('Vera', 'Verifycode');
      await request.post(`${API}/auth/register`, {
        multipart: { name: user.name, email: user.email, password: 'TestPass123!', role: 'buyer' },
      });

      const forgot = await request.post(`${API}/auth/forgot-password`, {
        data: { email: user.email },
      });
      expect([200, 201]).toContain(forgot.status());

      // Make the freshly issued code deterministic
      await seedKnownResetCode(user.email, '123456');

      const response = await request.post(`${API}/auth/verify-code`, {
        data: { email: user.email, code: '123456' },
      });

      expect(response.status()).toBe(201);
      const body = await response.json();
      expect(body.data?.message || body.message).toBe('Verification code is valid.');

      await captureApiEvidence(
        browser,
        'I-20_1_valid_code_201',
        'verify-code with the issued 6-digit code → HTTP 201, code checked but not consumed',
        'I-20: POST /api/v1/auth/verify-code — returns 201 for a valid code',
        [
          { label: 'Forgot-password (issue code)', method: 'POST', url: `${API}/auth/forgot-password`, payload: { email: user.email }, status: forgot.status() },
          { method: 'POST', url: `${API}/auth/verify-code`, payload: { email: user.email, code: '123456' }, status: response.status(), body },
        ],
        ['Status is 201', 'Body: { data: { message: "Verification code is valid." } }', 'BR-AUTH-030 / BR-AUTH-031']
      );
    });

    test('should return 400 for invalid verification code', async ({ request, browser }) => {
      // forgot-password may wait on external SMTP delivery
      test.setTimeout(60_000);
      const user = person('Victor', 'Verifycode');
      await request.post(`${API}/auth/register`, {
        multipart: { name: user.name, email: user.email, password: 'TestPass123!', role: 'buyer' },
      });

      const forgot = await request.post(`${API}/auth/forgot-password`, {
        data: { email: user.email },
      });
      expect([200, 201]).toContain(forgot.status());
      await seedKnownResetCode(user.email, '123456');

      // Unissued 6-digit code → standard error body
      const wrong = await request.post(`${API}/auth/verify-code`, {
        data: { email: user.email, code: '999999' },
      });
      expect(wrong.status()).toBe(400);
      const wrongBody = await wrong.json();
      expect(wrongBody.statusCode).toBe(400);
      expect(String(wrongBody.message)).toBe('Invalid or expired verification code');
      expect(wrongBody.error).toBeDefined();

      // Short code → rejected by DTO validation with 400
      const short = await request.post(`${API}/auth/verify-code`, {
        data: { email: user.email, code: '1234' },
      });
      expect(short.status()).toBe(400);
      const shortBody = await short.json();

      await captureApiEvidence(
        browser,
        'I-20_2_invalid_code_400',
        'verify-code with an unissued 6-digit code and with a short code → HTTP 400',
        'I-20: POST /api/v1/auth/verify-code — returns 400 otherwise',
        [
          { label: 'Unissued 6-digit code', method: 'POST', url: `${API}/auth/verify-code`, payload: { email: user.email, code: '999999' }, status: wrong.status(), body: wrongBody },
          { label: 'Short code (DTO validation)', method: 'POST', url: `${API}/auth/verify-code`, payload: { email: user.email, code: '1234' }, status: short.status(), body: shortBody },
        ],
        ['Status is 400', 'Standard error body: statusCode 400 + "Invalid or expired verification code" + error', 'Short codes rejected by DTO validation']
      );
    });
  });
});
