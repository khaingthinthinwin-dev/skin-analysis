import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { BuyerProductsController } from './buyer-products.controller';
import { PublicReviewsController } from './public-reviews.controller';
import { ProductsService } from './products.service';
import { ReviewsService } from './reviews.service';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { RequireApprovedMerchantGuard } from '../../auth/guards/require-approved-merchant.guard';

@Module({
  imports: [PrismaModule],
  controllers: [
    BuyerProductsController,
    ProductsController,
    PublicReviewsController,
  ],
  providers: [ProductsService, ReviewsService, RequireApprovedMerchantGuard],
  exports: [ProductsService, ReviewsService],
})
export class ProductsModule {}
