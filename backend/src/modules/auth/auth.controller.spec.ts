import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  refreshToken: jest.fn(),
  logout: jest.fn(),
  verifyToken: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  createAdmin: jest.fn(),
  changePassword: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register buyer without license', async () => {
      mockAuthService.register.mockResolvedValue({
        user: { id: '1', email: 'test@test.com' },
      });

      const result = await controller.register({
        email: 'test@test.com',
        name: 'Test',
        password: 'Password1!',
        role: 'buyer',
      });

      expect(result.user.id).toBe('1');
      expect(mockAuthService.register).toHaveBeenCalled();
    });

    it('should throw if merchant without license', async () => {
      await expect(
        controller.register({
          email: 'test@test.com',
          name: 'Test',
          password: 'Password1!',
          role: 'merchant',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if buyer with license', async () => {
      await expect(
        controller.register(
          {
            email: 'test@test.com',
            name: 'Test',
            password: 'Password1!',
            role: 'buyer',
          },
          {
            buffer: Buffer.from('test'),
            originalname: 'license.pdf',
            mimetype: 'application/pdf',
          } as Express.Multer.File,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should register merchant with license', async () => {
      mockAuthService.register.mockResolvedValue({
        user: { id: '1', email: 'merchant@test.com' },
      });

      const result = await controller.register(
        {
          email: 'merchant@test.com',
          name: 'Merchant',
          password: 'Password1!',
          role: 'merchant',
        },
        {
          buffer: Buffer.from('test'),
          originalname: 'license.pdf',
          mimetype: 'application/pdf',
        } as Express.Multer.File,
      );

      expect(result.user.id).toBe('1');
    });
  });

  describe('login', () => {
    it('should login user', async () => {
      mockAuthService.login.mockResolvedValue({
        user: { id: '1' },
        accessToken: 'token',
      });

      const result = await controller.login({
        email: 'test@test.com',
        password: 'Password1!',
      });

      expect(result.accessToken).toBe('token');
    });
  });

  describe('refresh', () => {
    it('should refresh token', async () => {
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new',
      });

      const result = await controller.refresh({ refreshToken: 'old' });
      expect(result.accessToken).toBe('new');
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      mockAuthService.logout.mockResolvedValue({ message: 'Logged out' });

      const result = await controller.logout(
        { id: 'user-1', email: 'test@test.com', roleCode: 'buyer' },
        { headers: { authorization: 'Bearer token' } } as never,
      );

      expect(result.message).toBe('Logged out');
    });
  });

  describe('verify', () => {
    it('should verify token', async () => {
      mockAuthService.verifyToken.mockResolvedValue({ id: 'user-1' });

      const result = await controller.verify({
        id: 'user-1',
        email: 'test@test.com',
        roleCode: 'buyer',
      });

      expect(result.id).toBe('user-1');
    });
  });

  describe('forgotPassword', () => {
    it('should send reset email', async () => {
      mockAuthService.forgotPassword.mockResolvedValue({ message: 'sent' });

      const result = await controller.forgotPassword({
        email: 'test@test.com',
      });
      expect(result.message).toBe('sent');
    });
  });

  describe('resetPassword', () => {
    it('should reset password', async () => {
      mockAuthService.resetPassword.mockResolvedValue({
        message: 'reset',
      });

      const result = await controller.resetPassword({
        token: 'a'.repeat(64),
        password: 'NewPassword1!',
      });
      expect(result.message).toBe('reset');
    });
  });

  describe('createAdmin', () => {
    it('should create admin', async () => {
      mockAuthService.createAdmin.mockResolvedValue({
        id: '1',
        email: 'admin@test.com',
      });

      const result = await controller.createAdmin({
        email: 'admin@test.com',
        name: 'Admin',
        password: 'Password1!',
        role: 'admin' as never,
      });
      expect(result.id).toBe('1');
    });
  });

  describe('changePassword', () => {
    it('should change password', async () => {
      mockAuthService.changePassword.mockResolvedValue({
        message: 'changed',
      });

      const result = await controller.changePassword(
        { id: 'user-1', email: 'test@test.com', roleCode: 'buyer' },
        { currentPassword: 'Old1!', newPassword: 'NewPassword1!' },
      );
      expect(result.message).toBe('changed');
    });
  });
});
