import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { OrderFulfillmentController } from './order-fulfillment.controller';
import { OrderFulfillmentService } from './order-fulfillment.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrderFulfillmentController],
  providers: [OrderFulfillmentService],
  exports: [OrderFulfillmentService],
})
export class OrderFulfillmentModule {}
