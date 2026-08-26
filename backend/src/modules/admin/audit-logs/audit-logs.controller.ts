import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  async findAll(
    @Query()
    query: {
      page?: number;
      limit?: number;
      action?: string;
      userId?: string;
    },
  ) {
    return this.auditLogsService.findAll(query);
  }
}
