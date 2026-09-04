import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { RedisModule } from './shared/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MerchantsModule } from './modules/merchant/products/merchants.module';
import { AuditLogsModule } from './modules/admin/audit-logs/audit-logs.module';
import { AdminModule } from './modules/admin/review-management/admin.module';
import { WishlistModule } from './modules/buyer/wishlist/wishlist.module';
import { CartModule } from './modules/buyer/cart/cart.module';
import { OrdersModule } from './modules/buyer/orders/orders.module';
import { ProductsModule } from './modules/catalog/products/products.module';
import { CategoriesModule } from './modules/catalog/categories/categories.module';
import { SearchModule } from './modules/catalog/search/search.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    MerchantsModule,
    AuditLogsModule,
    AdminModule,
    WishlistModule,
    CartModule,
    OrdersModule,
    ProductsModule,
    CategoriesModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
