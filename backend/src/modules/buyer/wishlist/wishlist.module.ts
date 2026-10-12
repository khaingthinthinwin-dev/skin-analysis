import { Module } from '@nestjs/common';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { ActiveUserGuard } from '../../../common/guards/active-user.guard';

@Module({
  imports: [PrismaModule],
  controllers: [WishlistController],
  providers: [WishlistService, ActiveUserGuard],
  exports: [WishlistService],
})
export class WishlistModule {}
