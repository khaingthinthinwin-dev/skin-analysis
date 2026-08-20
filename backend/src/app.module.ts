import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './shared/prisma/prisma.module';
import { RedisModule } from './shared/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MerchantsModule } from './modules/merchant/products/merchants.module';
import { AuditLogsModule } from './modules/admin/audit-logs/audit-logs.module';
import { AdminModule } from './modules/admin/review-management/admin.module';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

