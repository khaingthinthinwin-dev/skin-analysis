import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsService } from './audit-logs.service';
import { AuditRequestMetadataInterceptor } from './audit-request-metadata.interceptor';
import { AuditRequestMetadataInitializer } from './audit-request-metadata.installer';

@Module({
  controllers: [AuditLogsController],
  providers: [
    AuditLogsService,
    // Declared here but applied app-wide: this interceptor captures the request
    // IP and User-Agent for every route, so any module that writes to
    // `audit_logs` gets those fields stamped on its rows.
    { provide: APP_INTERCEPTOR, useClass: AuditRequestMetadataInterceptor },
    // Installs the Prisma insert hooks that perform the stamping itself.
    AuditRequestMetadataInitializer,
  ],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
