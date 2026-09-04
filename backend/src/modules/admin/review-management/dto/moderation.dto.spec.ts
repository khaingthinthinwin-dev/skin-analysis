import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  ApproveReviewDto,
  DeleteReviewDto,
  ResolveReportDto,
  DeactivateProductDto,
} from './moderation.dto';

describe('ModerationDto', () => {
  describe('ApproveReviewDto', () => {
    it('should pass with valid data', async () => {
      const dto = plainToInstance(ApproveReviewDto, { reviewId: 'r1' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('DeleteReviewDto', () => {
    it('should pass with valid data', async () => {
      const dto = plainToInstance(DeleteReviewDto, { reviewId: 'r1' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });

  describe('ResolveReportDto', () => {
    it('should pass with resolved action', async () => {
      const dto = plainToInstance(ResolveReportDto, {
        reportId: 'rp1',
        action: 'resolved',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with rejected action', async () => {
      const dto = plainToInstance(ResolveReportDto, {
        reportId: 'rp1',
        action: 'rejected',
      });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with invalid action', async () => {
      const dto = plainToInstance(ResolveReportDto, {
        reportId: 'rp1',
        action: 'invalid',
      });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('DeactivateProductDto', () => {
    it('should pass with valid data', async () => {
      const dto = plainToInstance(DeactivateProductDto, { productId: 'p1' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
