import { Module } from '@nestjs/common';
import { AdminAdManagementController } from './admin-ad-management.controller';
import { AdminAdManagementService } from './admin-ad-management.service';
import { AdminAdExportService } from './admin-ad-export.service';

@Module({
  controllers: [AdminAdManagementController],
  providers: [AdminAdManagementService, AdminAdExportService],
  exports: [AdminAdManagementService, AdminAdExportService],
})
export class AdminAdManagementModule {}
