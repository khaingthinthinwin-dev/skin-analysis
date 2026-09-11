import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: '1', roleCode: 'buyer' } }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    it('should return true if no roles required', () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(null);
      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should return true if user has required role', () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['buyer']);
      expect(guard.canActivate(mockContext)).toBe(true);
    });

    it('should throw ForbiddenException if user lacks role', () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if no user on request', () => {
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['admin']);
      const ctxNoUser = {
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(ctxNoUser)).toThrow(ForbiddenException);
    });
  });
});
