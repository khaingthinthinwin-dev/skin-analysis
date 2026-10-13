import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  NotificationsService,
  CreateNotificationDto,
} from './notifications.service';

@Injectable()
export class SkinCheckReminderService implements OnModuleInit {
  private readonly logger = new Logger(SkinCheckReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Running skin check reminder on application startup...');
    await this.cleanupDuplicateFirstAnalysisReminders();
    await this.checkAndSendReminders();
    await this.checkAndSendFirstAnalysisReminders();
    this.logger.log('Skin check reminder startup job completed');
  }

  private async cleanupDuplicateFirstAnalysisReminders(): Promise<void> {
    this.logger.log(
      'Cleaning up duplicate FIRST_SKIN_ANALYSIS_REMINDER notifications...',
    );
    const result = await this.prisma.$executeRaw`
      DELETE FROM "notifications"
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY "created_at" DESC) as rn
          FROM "notifications"
          WHERE "type" = 'FIRST_SKIN_ANALYSIS_REMINDER'
        ) sub
        WHERE rn > 1
      )
    `;
    this.logger.log(
      `Deleted ${result} duplicate FIRST_SKIN_ANALYSIS_REMINDER notifications`,
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkAndSendReminders(): Promise<void> {
    this.logger.log('Running skin check reminder cron job...');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Query users whose LAST completed analysis was 7+ days ago
    // Using raw query to get the most recent completed_at per user
    // Table names are lowercase in PostgreSQL: "users", "skin_analyses"
    // Column names are snake_case due to @map in Prisma schema
    const usersWithOldAnalysis = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >`
      SELECT u.id
      FROM "users" u
      WHERE u."role" = 'buyer'
        AND u."is_active" = true
        AND EXISTS (
          SELECT 1
          FROM "skin_analyses" sa
          WHERE sa."user_id" = u.id
            AND sa."analysis_status" = 'completed'
            AND sa."completed_at" IS NOT NULL
        )
        AND (
          SELECT MAX(sa2."completed_at")
          FROM "skin_analyses" sa2
          WHERE sa2."user_id" = u.id
            AND sa2."analysis_status" = 'completed'
            AND sa2."completed_at" IS NOT NULL
        ) <= ${sevenDaysAgo}
    `;

    this.logger.log(
      `Found ${usersWithOldAnalysis.length} users eligible for skin check reminder`,
    );

    for (const user of usersWithOldAnalysis) {
      await this.sendReminder(user.id);
    }

    this.logger.log('Skin check reminder cron job completed');
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkAndSendFirstAnalysisReminders(): Promise<void> {
    this.logger.log('Running first skin analysis reminder cron job...');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find users who:
    // 1. Are active buyers
    // 2. Have NEVER completed a skin analysis
    // 3. Either never received a welcome notification, OR the last one was 7+ days ago
    const usersNeedingWelcome = await this.prisma.$queryRaw<
      Array<{ id: string }>
    >`
      SELECT u.id
      FROM "users" u
      WHERE u."role" = 'buyer'
        AND u."is_active" = true
        AND NOT EXISTS (
          SELECT 1
          FROM "skin_analyses" sa
          WHERE sa."user_id" = u.id
            AND sa."analysis_status" = 'completed'
        )
        AND (
          -- No previous welcome notification
          NOT EXISTS (
            SELECT 1
            FROM "notifications" n
            WHERE n."user_id" = u.id
              AND n."type" = 'FIRST_SKIN_ANALYSIS_REMINDER'
          )
          OR
          -- Last welcome notification was 7+ days ago
          (
            SELECT MAX(n2."created_at")
            FROM "notifications" n2
            WHERE n2."user_id" = u.id
              AND n2."type" = 'FIRST_SKIN_ANALYSIS_REMINDER'
          ) <= ${sevenDaysAgo}
        )
    `;

    this.logger.log(
      `Found ${usersNeedingWelcome.length} users eligible for first analysis reminder`,
    );

    for (const user of usersNeedingWelcome) {
      await this.sendFirstAnalysisReminder(user.id);
    }

    this.logger.log('First skin analysis reminder cron job completed');
  }

  async sendReminder(userId: string): Promise<void> {
    // Delete any existing periodic reminders for this user to avoid duplicates
    await this.prisma.notification.deleteMany({
      where: {
        userId,
        type: 'SKIN_CHECK_REMINDER',
      },
    });

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

  async sendFirstAnalysisReminder(userId: string): Promise<void> {
    // Delete any existing welcome notifications for this user to avoid duplicates
    await this.prisma.notification.deleteMany({
      where: {
        userId,
        type: 'FIRST_SKIN_ANALYSIS_REMINDER',
      },
    });

    const notificationData: CreateNotificationDto = {
      userId,
      type: 'FIRST_SKIN_ANALYSIS_REMINDER',
      title: 'Welcome! Start your skin analysis 🔬',
      message:
        'Discover your skin type and get personalized recommendations. Tap to begin your first analysis.',
      entityType: 'skin_analysis',
      entityId: undefined,
    };

    await this.notifications.create(notificationData);
    this.logger.log(`Sent first analysis reminder to user ${userId}`);
  }

  async triggerForUser(userId: string): Promise<void> {
    this.logger.log(
      `Manually triggering skin check reminder for user ${userId}`,
    );
    await this.sendReminder(userId);
  }

  async triggerFirstAnalysisForUser(userId: string): Promise<void> {
    this.logger.log(
      `Manually triggering first analysis reminder for user ${userId}`,
    );
    await this.sendFirstAnalysisReminder(userId);
  }
}
