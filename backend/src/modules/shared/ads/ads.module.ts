import { Module } from '@nestjs/common';
import { AdsController } from './ads.controller';
import { AdsService } from './ads.service';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { RedisModule } from '../../../shared/redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [AdsController],
  providers: [AdsService],
  exports: [AdsService],
})
export class AdsModule {}
