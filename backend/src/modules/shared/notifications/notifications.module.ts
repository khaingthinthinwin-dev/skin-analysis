import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SkinCheckReminderService } from './skin-check-reminder.service';
import { PrismaModule } from '../../../shared/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [NotificationsController],
  providers: [NotificationsService, SkinCheckReminderService],
  exports: [NotificationsService, SkinCheckReminderService],
})
export class NotificationsModule {}
