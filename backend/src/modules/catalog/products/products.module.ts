import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { RedisModule } from '../../../shared/redis/redis.module';
import { RequireApprovedMerchantGuard } from '../../auth/guards/require-approved-merchant.guard';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [ProductsController],
  providers: [ProductsService, RequireApprovedMerchantGuard],
  exports: [ProductsService],
})
export class ProductsModule {}
