import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GetUsersDto, ToggleUserStatusDto } from './user-management.dto';

describe('UserManagementDto', () => {
  describe('GetUsersDto', () => {
    it('should pass with no data (all optional)', async () => {
      const dto = plainToInstance(GetUsersDto, {});
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with valid role', async () => {
      const dto = plainToInstance(GetUsersDto, { role: 'buyer' });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should fail with invalid role', async () => {
      const dto = plainToInstance(GetUsersDto, { role: 'superadmin' });
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('ToggleUserStatusDto', () => {
    it('should pass with true', async () => {
      const dto = plainToInstance(ToggleUserStatusDto, { is_active: true });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });

    it('should pass with false', async () => {
      const dto = plainToInstance(ToggleUserStatusDto, { is_active: false });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    });
  });
});
