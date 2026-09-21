import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { RequireApprovedMerchantGuard } from '../../auth/guards/require-approved-merchant.guard';

@Module({
  imports: [PrismaModule],
  controllers: [PromotionsController],
  providers: [PromotionsService, RequireApprovedMerchantGuard],
  exports: [PromotionsService],
})
export class PromotionsModule {}
