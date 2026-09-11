import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [PrismaModule],
  controllers: [CheckoutController, OrdersController],
  providers: [CheckoutService, OrdersService],
  exports: [CheckoutService, OrdersService],
})
export class OrdersModule {}
