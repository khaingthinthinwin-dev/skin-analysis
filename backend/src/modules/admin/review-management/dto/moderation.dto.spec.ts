import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  ModerateReviewDto,
  ModerateProductDto,
  UpdateReportStatusDto,
} from './moderation.dto';

describe('ModerationDto', () => {
  describe('ModerateReviewDto', () => {
    it('should pass with valid approve action', async () => {
      const dto = plainToInstance(ModerateReviewDto, { action: 'approve' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with valid reject action and reason', async () => {
      const dto = plainToInstance(ModerateReviewDto, {
        action: 'reject',
        reason: 'Inappropriate content',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with invalid action', async () => {
      const dto = plainToInstance(ModerateReviewDto, { action: 'invalid' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ModerateProductDto', () => {
    it('should pass with valid data', async () => {
      const dto = plainToInstance(ModerateProductDto, { isActive: true });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with missing isActive', async () => {
      const dto = plainToInstance(ModerateProductDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('UpdateReportStatusDto', () => {
    it('should pass with resolved status', async () => {
      const dto = plainToInstance(UpdateReportStatusDto, {
        status: 'resolved',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with rejected status', async () => {
      const dto = plainToInstance(UpdateReportStatusDto, {
        status: 'rejected',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with invalid status', async () => {
      const dto = plainToInstance(UpdateReportStatusDto, {
        status: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
