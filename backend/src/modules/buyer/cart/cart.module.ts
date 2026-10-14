import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { ActiveUserGuard } from '../../../common/guards/active-user.guard';

@Module({
  imports: [PrismaModule],
  controllers: [CartController],
  providers: [CartService, ActiveUserGuard],
  exports: [CartService],
})
export class CartModule {}
