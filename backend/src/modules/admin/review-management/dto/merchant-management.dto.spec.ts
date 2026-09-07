import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  GetMerchantsDto,
  ApproveMerchantDto,
  RejectMerchantDto,
} from './merchant-management.dto';

describe('MerchantManagementDto', () => {
  describe('GetMerchantsDto', () => {
    it('should pass with no data', async () => {
      const dto = plainToInstance(GetMerchantsDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with valid status', async () => {
      const dto = plainToInstance(GetMerchantsDto, { status: 'approved' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with invalid status', async () => {
      const dto = plainToInstance(GetMerchantsDto, { status: 'invalid' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ApproveMerchantDto', () => {
    it('should pass with no data', async () => {
      const dto = plainToInstance(ApproveMerchantDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('RejectMerchantDto', () => {
    it('should pass with valid reason', async () => {
      const dto = plainToInstance(RejectMerchantDto, {
        reason: 'Incomplete docs',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
