import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config';

const mockRedisInstance = {
  on: jest.fn(),
  quit: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue('val'),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  incr: jest.fn().mockResolvedValue(5),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisInstance);
});

describe('RedisService', () => {
  let service: RedisService;
  let configGet: jest.Mock;

  beforeEach(async () => {
    configGet = jest.fn().mockReturnValue('redis://localhost:6379');
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize Redis client', () => {
      service.onModuleInit();
      expect(service).toBeDefined();
    });

    it('should register event handlers', () => {
      service.onModuleInit();
      const eventNames = ['connect', 'ready', 'error', 'close'];
      for (const name of eventNames) {
        expect(mockRedisInstance.on).toHaveBeenCalledWith(
          name,
          expect.any(Function),
        );
      }
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit redis client when client exists', async () => {
      service.onModuleInit();
      await service.onModuleDestroy();
      expect(mockRedisInstance.quit).toHaveBeenCalled();
    });

    it('should handle quit error gracefully', async () => {
      service.onModuleInit();
      mockRedisInstance.quit.mockRejectedValueOnce(new Error('quit failed'));
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });

    it('should do nothing when client is null', async () => {
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });

  describe('isAvailable', () => {
    it('should return false before init', () => {
      expect(service.isAvailable()).toBe(false);
    });

    it('should return true when connected', () => {
      service.onModuleInit();
      (service as unknown as { connected: boolean }).connected = true;
      expect(service.isAvailable()).toBe(true);
    });
  });

  describe('get', () => {
    it('should return null when not available', async () => {
      const result = await service.get('key');
      expect(result).toBeNull();
    });

    it('should return value when available', async () => {
      service.onModuleInit();
      (service as unknown as { connected: boolean }).connected = true;
      const result = await service.get('key');
      expect(result).toBe('val');
    });

    it('should return null on error', async () => {
      service.onModuleInit();
      (service as unknown as { connected: boolean }).connected = true;
      mockRedisInstance.get.mockRejectedValueOnce(new Error('fail'));
      const result = await service.get('key');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should not throw when not available', async () => {
      await expect(service.set('key', 'value')).resolves.toBeUndefined();
    });

    it('should set value when available', async () => {
      service.onModuleInit();
      (service as unknown as { connected: boolean }).connected = true;
      await service.set('key', 'value');
      expect(mockRedisInstance.set).toHaveBeenCalledWith('key', 'value');
    });

    it('should set value with TTL when available', async () => {
      service.onModuleInit();
      (service as unknown as { connected: boolean }).connected = true;
      await service.set('key', 'value', 60);
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'key',
        'value',
        'EX',
        60,
      );
    });

    it('should handle set error gracefully', async () => {
      service.onModuleInit();
      (service as unknown as { connected: boolean }).connected = true;
      mockRedisInstance.set.mockRejectedValueOnce(new Error('fail'));
      await expect(service.set('key', 'value')).resolves.toBeUndefined();
    });
  });

  describe('del', () => {
    it('should not throw when not available', async () => {
      await expect(service.del('key')).resolves.toBeUndefined();
    });

    it('should delete when available', async () => {
      service.onModuleInit();
      (service as unknown as { connected: boolean }).connected = true;
      await service.del('key');
      expect(mockRedisInstance.del).toHaveBeenCalledWith('key');
    });

    it('should handle del error gracefully', async () => {
      service.onModuleInit();
      (service as unknown as { connected: boolean }).connected = true;
      mockRedisInstance.del.mockRejectedValueOnce(new Error('fail'));
      await expect(service.del('key')).resolves.toBeUndefined();
    });
  });

  describe('exists', () => {
    it('should return false when not available', async () => {
      const result = await service.exists('key');
      expect(result).toBe(false);
    });

    it('should return true when key exists', async () => {
      service.onModuleInit();
      (service as unknown as { connected: boolean }).connected = true;
      const result = await service.exists('key');
      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      service.onModuleInit();
      (service as unknown as { connected: boolean }).connected = true;
      mockRedisInstance.exists.mockResolvedValueOnce(0);
      const result = await service.exists('key');
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      service.onModuleInit();
      (service as unknown as { connected: boolean }).connected = true;
      mockRedisInstance.exists.mockRejectedValueOnce(new Error('fail'));
      const result = await service.exists('key');
      expect(result).toBe(false);
    });
  });

  describe('expire', () => {
    it('should not throw when not available', async () => {
      await expect(service.expire('key', 60)).resolves.toBeUndefined();
    });

    it('should expire when available', async () => {
      service.onModuleInit();
      (service as unknown as { connected: boolean }).connected = true;
      await service.expire('key', 60);
      expect(mockRedisInstance.expire).toHaveBeenCalledWith('key', 60);
    });

    it('should handle expire error gracefully', async () => {
      service.onModuleInit();
      (service as unknown as { connected: boolean }).connected = true;
      mockRedisInstance.expire.mockRejectedValueOnce(new Error('fail'));
      await expect(service.expire('key', 60)).resolves.toBeUndefined();
    });
  });

  describe('incr', () => {
    it('should return 0 when not available', async () => {
      const result = await service.incr('key');
      expect(result).toBe(0);
    });

    it('should return incremented value when available', async () => {
      service.onModuleInit();
      (service as unknown as { connected: boolean }).connected = true;
      const result = await service.incr('key');
      expect(result).toBe(5);
    });

    it('should return 0 on error', async () => {
      service.onModuleInit();
      (service as unknown as { connected: boolean }).connected = true;
      mockRedisInstance.incr.mockRejectedValueOnce(new Error('fail'));
      const result = await service.incr('key');
      expect(result).toBe(0);
    });
  });

  describe('blacklistToken', () => {
    it('should call set with blacklist prefix', async () => {
      const setSpy = jest.spyOn(service, 'set');
      await service.blacklistToken('token', 3600);
      expect(setSpy).toHaveBeenCalledWith('blacklist:token', '1', 3600);
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should check blacklist key existence', async () => {
      const existsSpy = jest.spyOn(service, 'exists');
      await service.isTokenBlacklisted('token');
      expect(existsSpy).toHaveBeenCalledWith('blacklist:token');
    });
  });

  describe('checkRateLimit', () => {
    it('should return true when under limit', async () => {
      jest.spyOn(service, 'incr').mockResolvedValue(1);
      jest.spyOn(service, 'expire').mockResolvedValue(undefined);

      const result = await service.checkRateLimit('key', 10, 3600);
      expect(result).toBe(true);
    });

    it('should return false when over limit', async () => {
      jest.spyOn(service, 'incr').mockResolvedValue(11);
      jest.spyOn(service, 'expire').mockResolvedValue(undefined);

      const result = await service.checkRateLimit('key', 10, 3600);
      expect(result).toBe(false);
    });

    it('should set expiry when first request', async () => {
      jest.spyOn(service, 'incr').mockResolvedValue(1);
      const expireSpy = jest
        .spyOn(service, 'expire')
        .mockResolvedValue(undefined);

      await service.checkRateLimit('key', 10, 3600);
      expect(expireSpy).toHaveBeenCalledWith('key', 3600);
    });

    it('should not set expiry when not first request', async () => {
      jest.spyOn(service, 'incr').mockResolvedValue(5);
      const expireSpy = jest
        .spyOn(service, 'expire')
        .mockResolvedValue(undefined);

      await service.checkRateLimit('key', 10, 3600);
      expect(expireSpy).not.toHaveBeenCalled();
    });
  });

  describe('getClient', () => {
    it('should return null when not initialized', () => {
      expect(service.getClient()).toBeNull();
    });

    it('should return client when initialized', () => {
      service.onModuleInit();
      expect(service.getClient()).toBeDefined();
    });
  });
});
