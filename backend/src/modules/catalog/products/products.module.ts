import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { BuyerProductsController } from './buyer-products.controller';
import { ProductsService } from './products.service';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { RequireApprovedMerchantGuard } from '../../auth/guards/require-approved-merchant.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController, BuyerProductsController],
  providers: [ProductsService, RequireApprovedMerchantGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
