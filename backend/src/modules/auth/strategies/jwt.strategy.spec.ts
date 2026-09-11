import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-secret') },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user from valid payload', () => {
      const result = strategy.validate({
        sub: 'user-1',
        email: 'test@test.com',
        role: 'buyer',
      });

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@test.com',
        roleCode: 'buyer',
      });
    });

    it('should throw UnauthorizedException if sub missing', () => {
      expect(() =>
        strategy.validate({ sub: '', email: 'test@test.com', role: 'buyer' }),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if email missing', () => {
      expect(() =>
        strategy.validate({ sub: 'user-1', email: '', role: 'buyer' }),
      ).toThrow(UnauthorizedException);
    });
  });
});
