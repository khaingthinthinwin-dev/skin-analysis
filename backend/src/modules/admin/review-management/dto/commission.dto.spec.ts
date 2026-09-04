import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  UpdateCommissionSettingsDto,
  GetPayoutsDto,
  ProcessPayoutDto,
} from './commission.dto';

describe('CommissionDto', () => {
  describe('UpdateCommissionSettingsDto', () => {
    it('should pass with valid rate', async () => {
      const dto = plainToInstance(UpdateCommissionSettingsDto, {
        commission_rate: 15,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with negative rate', async () => {
      const dto = plainToInstance(UpdateCommissionSettingsDto, {
        commission_rate: -1,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail with rate > 100', async () => {
      const dto = plainToInstance(UpdateCommissionSettingsDto, {
        commission_rate: 101,
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('GetPayoutsDto', () => {
    it('should pass with no data', async () => {
      const dto = plainToInstance(GetPayoutsDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with valid status', async () => {
      const dto = plainToInstance(GetPayoutsDto, { status: 'pending' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with invalid status', async () => {
      const dto = plainToInstance(GetPayoutsDto, { status: 'invalid' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ProcessPayoutDto', () => {
    it('should pass with valid data', async () => {
      const dto = plainToInstance(ProcessPayoutDto, { payoutId: 'p1' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
