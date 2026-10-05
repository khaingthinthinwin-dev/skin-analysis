import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { MerchantOrderInsightsController } from './merchant-order-insights.controller';
import { MerchantSummaryService } from './merchant-summary.service';

@Module({
  imports: [PrismaModule],
  controllers: [MerchantOrderInsightsController],
  providers: [MerchantSummaryService],
  exports: [MerchantSummaryService],
})
export class OrderInsightsModule {}
