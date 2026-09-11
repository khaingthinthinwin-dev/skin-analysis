import { Module } from '@nestjs/common';
import { AdminCommissionController } from './admin-commission.controller';
import { AdminRevenueController } from './admin-revenue.controller';
import { CommissionService } from './commission.service';
import { RevenueService } from './revenue.service';
import { ForecastService } from './forecast.service';
import { ExportService } from './export.service';

@Module({
  controllers: [AdminCommissionController, AdminRevenueController],
  providers: [
    CommissionService,
    RevenueService,
    ForecastService,
    ExportService,
  ],
  exports: [CommissionService, RevenueService],
})
export class CommissionModule {}
