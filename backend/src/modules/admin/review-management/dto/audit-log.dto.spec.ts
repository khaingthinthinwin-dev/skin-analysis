import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GetAuditLogsDto } from './audit-log.dto';

describe('AuditLogDto', () => {
  it('should pass with no data (all optional)', async () => {
    const dto = plainToInstance(GetAuditLogsDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass with valid data', async () => {
    const dto = plainToInstance(GetAuditLogsDto, {
      page: 1,
      limit: 10,
      action: 'create',
      userId: 'u1',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
