import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  NotificationsService,
  CreateNotificationDto,
} from './notifications.service';

@Injectable()
export class SkinCheckReminderService {
  private readonly logger = new Logger(SkinCheckReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkAndSendReminders(): Promise<void> {
    this.logger.log('Running skin check reminder cron job...');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const usersWithOldAnalysis = await this.prisma.user.findMany({
      where: {
        roleCode: 'buyer',
        isActive: true,
        skinAnalyses: {
          some: {
            analysisStatus: 'completed',
            analysisDate: { lt: sevenDaysAgo },
          },
          none: {
            analysisStatus: 'completed',
            analysisDate: { gte: sevenDaysAgo },
          },
        },
      },
      select: { id: true },
    });

    this.logger.log(
      `Found ${usersWithOldAnalysis.length} users eligible for skin check reminder`,
    );

    for (const user of usersWithOldAnalysis) {
      await this.sendReminder(user.id);
    }

    this.logger.log('Skin check reminder cron job completed');
  }

  async sendReminder(userId: string): Promise<void> {
    const notificationData: CreateNotificationDto = {
      userId,
      type: 'SKIN_CHECK_REMINDER',
      title: 'Re-analysis reminder 📅',
      message:
        "It's been a while since your last skin analysis. Take a new analysis to check your skin condition.",
      entityType: 'skin_analysis',
      entityId: undefined,
    };

    await this.notifications.create(notificationData);
    this.logger.log(`Sent skin check reminder to user ${userId}`);
  }

  async triggerForUser(userId: string): Promise<void> {
    this.logger.log(
      `Manually triggering skin check reminder for user ${userId}`,
    );
    await this.sendReminder(userId);
  }
}
