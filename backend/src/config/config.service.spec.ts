import config, {
  databaseConfig,
  redisConfig,
  jwtConfig,
} from './config.service';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NODE_ENV;
    jest.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('app config', () => {
    it('should return default values', () => {
      const result = config() as Record<string, unknown>;
      expect(result.nodeEnv).toBe('development');
      expect(result.port).toBe(8080);
      expect(result.apiPrefix).toBe('api/v1');
    });

    it('should use env values when set', () => {
      process.env.NODE_ENV = 'production';
      process.env.PORT = '3000';
      process.env.API_PREFIX = 'api/v2';
      process.env.CORS_ORIGIN = 'https://example.com';

      const result = config() as Record<string, unknown>;
      expect(result.nodeEnv).toBe('production');
      expect(result.port).toBe(3000);
      expect(result.apiPrefix).toBe('api/v2');
      expect(result.corsOrigin).toBe('https://example.com');
    });
  });

  describe('databaseConfig', () => {
    it('should return database url', () => {
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      const result = databaseConfig() as Record<string, unknown>;
      expect(result.url).toBe('postgresql://localhost:5432/test');
    });
  });

  describe('redisConfig', () => {
    it('should return default redis url', () => {
      const result = redisConfig() as Record<string, unknown>;
      expect(result.url).toBe('redis://localhost:6379');
    });

    it('should use env redis url', () => {
      process.env.REDIS_URL = 'redis://custom:6380';
      const result = redisConfig() as Record<string, unknown>;
      expect(result.url).toBe('redis://custom:6380');
    });
  });

  describe('jwtConfig', () => {
    it('should return default jwt values', () => {
      const result = jwtConfig() as Record<string, unknown>;
      expect(result.accessSecret).toBeDefined();
      expect(result.refreshSecret).toBeDefined();
      expect(result.accessExpiration).toBe('15m');
      expect(result.refreshExpiration).toBe('7d');
    });

    it('should use env jwt values', () => {
      process.env.JWT_ACCESS_SECRET = 'custom-access';
      process.env.JWT_REFRESH_SECRET = 'custom-refresh';
      process.env.JWT_ACCESS_EXPIRATION = '30m';
      process.env.JWT_REFRESH_EXPIRATION = '14d';

      const result = jwtConfig() as Record<string, unknown>;
      expect(result.accessSecret).toBe('custom-access');
      expect(result.refreshSecret).toBe('custom-refresh');
      expect(result.accessExpiration).toBe('30m');
      expect(result.refreshExpiration).toBe('14d');
    });
  });
});
