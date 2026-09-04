import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  GetAdvertisementsDto,
  ApproveAdDto,
  RejectAdDto,
  UpdateAdFeeSettingDto,
} from './advertisement.dto';

describe('AdvertisementDto', () => {
  describe('GetAdvertisementsDto', () => {
    it('should pass with no data', async () => {
      const dto = plainToInstance(GetAdvertisementsDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with valid status', async () => {
      const dto = plainToInstance(GetAdvertisementsDto, { status: 'pending' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('ApproveAdDto', () => {
    it('should pass with valid data', async () => {
      const dto = plainToInstance(ApproveAdDto, { adId: 'a1' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('RejectAdDto', () => {
    it('should pass with valid data', async () => {
      const dto = plainToInstance(RejectAdDto, {
        adId: 'a1',
        reason: 'Policy violation',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('UpdateAdFeeSettingDto', () => {
    it('should pass with valid data', async () => {
      const dto = plainToInstance(UpdateAdFeeSettingDto, {
        settingId: 's1',
        daily_rate: 50,
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
