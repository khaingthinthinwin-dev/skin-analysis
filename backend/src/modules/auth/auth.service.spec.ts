import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RedisService } from '../../shared/redis/redis.service';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  verify: jest.fn().mockResolvedValue(true),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({ toString: () => 'mock-token-hex' }),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-hash'),
  }),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

const mockUsersService = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  updatePassword: jest.fn(),
  update: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockPrisma = {
  merchant: { create: jest.fn(), findFirst: jest.fn() },
  refreshToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  passwordResetToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockRedis = {
  blacklistToken: jest.fn(),
  isTokenBlacklisted: jest.fn(),
  checkRateLimit: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a buyer successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test',
        roleCode: 'buyer',
        avatarUrl: null,
      });
      mockJwtService.signAsync.mockResolvedValue('token');
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register({
        email: 'test@test.com',
        name: 'Test',
        password: 'Password1!',
      });

      expect(result.user.email).toBe('test@test.com');
      expect(result.accessToken).toBe('token');
      expect(result.refreshToken).toBe('token');
      expect(mockUsersService.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'test@test.com',
          name: 'Test',
          password: 'Password1!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create merchant record for merchant role', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        id: 'user-1',
        email: 'merchant@test.com',
        name: 'Merchant',
        roleCode: 'merchant',
        avatarUrl: null,
      });
      mockPrisma.merchant.create.mockResolvedValue({});
      mockJwtService.signAsync.mockResolvedValue('token');
      mockPrisma.refreshToken.create.mockResolvedValue({});

      await service.register({
        email: 'merchant@test.com',
        name: 'Merchant',
        password: 'Password1!',
        role: 'merchant',
      });

      expect(mockPrisma.merchant.create).toHaveBeenCalledWith({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          userId: 'user-1',
          shopName: 'Merchant',
          licenseStatus: 'pending',
        }),
      });
    });

    it('should call saveLicenseFile when merchant with license', async () => {
      mockConfigService.get.mockReturnValue('./uploads/licenses');

      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        id: 'user-1',
        email: 'merchant@test.com',
        name: 'Merchant',
        roleCode: 'merchant',
        avatarUrl: null,
      });
      mockPrisma.merchant.create.mockResolvedValue({});
      mockJwtService.signAsync.mockResolvedValue('token');
      mockPrisma.refreshToken.create.mockResolvedValue({});

      await service.register(
        {
          email: 'merchant@test.com',
          name: 'Merchant',
          password: 'Password1!',
          role: 'merchant',
        },
        {
          buffer: Buffer.from('pdf'),
          originalname: 'license.pdf',
          mimetype: 'application/pdf',
        } as Express.Multer.File,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(jest.requireMock('fs').writeFileSync).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test',
        roleCode: 'buyer',
        avatarUrl: null,
        passwordHash: 'hashed',
      });
      mockJwtService.signAsync.mockResolvedValue('token');
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({
        email: 'test@test.com',
        password: 'Password1!',
      });

      expect(result.user.email).toBe('test@test.com');
      expect(result.accessToken).toBe('token');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'test@test.com', password: 'Password1!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password invalid', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const argon2 = jest.requireMock('argon2');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      argon2.verify.mockResolvedValueOnce(false);

      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'hashed',
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-1',
        email: 'test@test.com',
        role: 'buyer',
      });
      mockRedis.isTokenBlacklisted.mockResolvedValue(false);
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
      });
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockUsersService.findById.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        roleCode: 'buyer',
      });
      mockJwtService.signAsync.mockResolvedValue('new-token');
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refreshToken('old-refresh-token');

      expect(result.accessToken).toBe('new-token');
      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { isRevoked: true },
      });
    });

    it('should throw UnauthorizedException if token blacklisted', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });
      mockRedis.isTokenBlacklisted.mockResolvedValue(true);

      await expect(service.refreshToken('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if no stored token', async () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });
      mockRedis.isTokenBlacklisted.mockResolvedValue(false);
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(service.refreshToken('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException on invalid JWT', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(service.refreshToken('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockJwtService.verify.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      mockRedis.blacklistToken.mockResolvedValue(undefined);
      mockPrisma.refreshToken.updateMany.mockResolvedValue({});

      const result = await service.logout('user-1', 'access-token');

      expect(result.message).toBe('Logged out successfully');
      expect(mockRedis.blacklistToken).toHaveBeenCalled();
      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isRevoked: true },
      });
    });

    it('should handle expired token during logout', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('expired');
      });
      mockPrisma.refreshToken.updateMany.mockResolvedValue({});

      const result = await service.logout('user-1', 'expired-token');
      expect(result.message).toBe('Logged out successfully');
    });
  });

  describe('verifyToken', () => {
    it('should return user info for buyer', async () => {
      mockUsersService.findById.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test',
        roleCode: 'buyer',
        avatarUrl: null,
      });

      const result = await service.verifyToken('user-1');

      expect(result.id).toBe('user-1');
      expect(result.merchantId).toBeNull();
    });

    it('should return merchant info for merchant role', async () => {
      mockUsersService.findById.mockResolvedValue({
        id: 'user-1',
        email: 'merchant@test.com',
        name: 'Merchant',
        roleCode: 'merchant',
        avatarUrl: null,
      });
      mockPrisma.merchant.findFirst.mockResolvedValue({
        id: 'merchant-1',
        businessLicenseUrl: '/license.pdf',
        licenseStatus: 'approved',
      });

      const result = await service.verifyToken('user-1');

      expect(result.merchantId).toBe('merchant-1');
      expect(result.licenseStatus).toBe('approved');
    });

    it('should return null merchant info if no merchant profile', async () => {
      mockUsersService.findById.mockResolvedValue({
        id: 'user-1',
        email: 'merchant@test.com',
        name: 'Merchant',
        roleCode: 'merchant',
        avatarUrl: null,
      });
      mockPrisma.merchant.findFirst.mockResolvedValue(null);

      const result = await service.verifyToken('user-1');

      expect(result.merchantId).toBeNull();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.verifyToken('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    it('should return success message for existing user', async () => {
      mockRedis.checkRateLimit.mockResolvedValue(true);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
      });
      mockPrisma.passwordResetToken.updateMany.mockResolvedValue({});
      mockPrisma.passwordResetToken.create.mockResolvedValue({});

      const result = await service.forgotPassword({ email: 'test@test.com' });

      expect(result.message).toContain('password reset link');
    });

    it('should return same message for non-existing user', async () => {
      mockRedis.checkRateLimit.mockResolvedValue(true);
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'nonexistent@test.com',
      });

      expect(result.message).toContain('password reset link');
    });

    it('should throw if rate limit exceeded', async () => {
      mockRedis.checkRateLimit.mockResolvedValue(false);

      await expect(
        service.forgotPassword({ email: 'test@test.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      mockPrisma.passwordResetToken.findFirst.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
      });
      mockUsersService.findById.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
      });
      mockUsersService.updatePassword.mockResolvedValue({});
      mockPrisma.passwordResetToken.update.mockResolvedValue({});
      mockPrisma.passwordResetToken.updateMany.mockResolvedValue({});

      const token = 'a'.repeat(64);
      const result = await service.resetPassword({
        token,
        password: 'NewPassword1!',
      });

      expect(result.message).toContain('reset successfully');
    });

    it('should throw BadRequestException for short token', async () => {
      await expect(
        service.resetPassword({ token: 'short', password: 'NewPassword1!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockPrisma.passwordResetToken.findFirst.mockResolvedValue(null);

      const token = 'a'.repeat(64);
      await expect(
        service.resetPassword({ token, password: 'NewPassword1!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user not found for valid token', async () => {
      mockPrisma.passwordResetToken.findFirst.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
      });
      mockUsersService.findById.mockResolvedValue(null);

      const token = 'a'.repeat(64);
      await expect(
        service.resetPassword({ token, password: 'NewPassword1!' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createAdmin', () => {
    it('should create admin successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        id: 'admin-1',
        email: 'admin@test.com',
        name: 'Admin',
        roleCode: 'admin',
        createdAt: new Date(),
      });

      const result = await service.createAdmin({
        email: 'admin@test.com',
        name: 'Admin',
        password: 'Password1!',
        role: 'admin' as never,
      });

      expect(result.email).toBe('admin@test.com');
    });

    it('should throw ConflictException if email exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createAdmin({
          email: 'existing@test.com',
          name: 'Admin',
          password: 'Password1!',
          role: 'admin' as never,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockUsersService.findById.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'old-hash',
      });
      mockUsersService.updatePassword.mockResolvedValue({});

      const result = await service.changePassword('user-1', {
        currentPassword: 'OldPassword1!',
        newPassword: 'NewPassword1!',
      });

      expect(result.message).toContain('changed successfully');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(
        service.changePassword('nonexistent', {
          currentPassword: 'OldPassword1!',
          newPassword: 'NewPassword1!',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if current password is wrong', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const argon2 = jest.requireMock('argon2');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      argon2.verify.mockResolvedValueOnce(false);

      mockUsersService.findById.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'hash',
      });

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrong',
          newPassword: 'NewPassword1!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if new password same as current', async () => {
      mockUsersService.findById.mockResolvedValue({
        id: 'user-1',
        passwordHash: 'hash',
      });

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'SamePassword1!',
          newPassword: 'SamePassword1!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
