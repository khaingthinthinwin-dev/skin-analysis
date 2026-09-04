import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { RequireApprovedMerchantGuard } from '../../auth/guards/require-approved-merchant.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [ProductsService, RequireApprovedMerchantGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
