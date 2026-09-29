import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { AuthUser } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private extractUserInfo(user: AuthUser | string) {
    const isAdmin =
      typeof user === 'object' &&
      (user.roleCode === 'admin' || user.roleCode === 'super_admin');
    const userId = typeof user === 'object' ? user.id : user;
    return { isAdmin, userId };
  }

  private getAdminIncludedTypes() {
    return [
      'MERCHANT_REGISTERED',
      'NEW_MERCHANT_REGISTRATION',
      'MERCHANT_REGISTRATION',
      'MERCHANT_LICENSE_RESUBMITTED',
      'REVIEW_CREATED',
      'REVIEW_REPORTED',
      'NEW_REPORT',
      'AD_SUBMITTED',
    ];
  }

  private getAdminRegistrationTypes() {
    return [
      'MERCHANT_REGISTERED',
      'NEW_MERCHANT_REGISTRATION',
      'MERCHANT_REGISTRATION',
    ];
  }

  private deduplicateAdminRegistrations(
    notifications: Array<{ id: string; type: string; entityId: string | null }>,
  ) {
    const registrationTypes = this.getAdminRegistrationTypes();
    const seenEntityIds = new Set<string>();

    return notifications.filter((notification) => {
      if (
        !registrationTypes.includes(notification.type) ||
        !notification.entityId
      ) {
        return true;
      }
      if (seenEntityIds.has(notification.entityId)) {
        return false;
      }
      seenEntityIds.add(notification.entityId);
      return true;
    });
  }

  private buildWhereClause(
    isAdmin: boolean,
    userId: string,
    unreadOnly?: boolean,
  ): Prisma.NotificationWhereInput {
    if (isAdmin) {
      return {
        userId,
        type: {
          in: this.getAdminIncludedTypes(),
        },
        ...(unreadOnly ? { isRead: false } : {}),
      };
    }
    return {
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };
  }

  async list(user: AuthUser | string, query: ListNotificationsDto) {
    const { isAdmin, userId } = this.extractUserInfo(user);
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const where = this.buildWhereClause(isAdmin, userId, query.unreadOnly);

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    const visibleItems = isAdmin
      ? this.deduplicateAdminRegistrations(items)
      : items;

    return {
      items: visibleItems,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async unreadCount(user: AuthUser | string) {
    const { isAdmin, userId } = this.extractUserInfo(user);
    const where: Prisma.NotificationWhereInput = {
      ...this.buildWhereClause(isAdmin, userId),
      isRead: false,
    };
    const count = await this.prisma.notification.count({ where });
    return { count };
  }

  async markAsRead(user: AuthUser | string, id: string) {
    const { isAdmin, userId } = this.extractUserInfo(user);
    const where: Prisma.NotificationWhereInput = {
      id,
      ...this.buildWhereClause(isAdmin, userId),
    };
    const existing = await this.prisma.notification.findFirst({ where });
    if (!existing) {
      throw new NotFoundException('Notification not found');
    }
    if (existing.isRead) {
      return existing;
    }
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(user: AuthUser | string) {
    const { isAdmin, userId } = this.extractUserInfo(user);
    const where: Prisma.NotificationWhereInput = {
      ...this.buildWhereClause(isAdmin, userId),
      isRead: false,
    };
    const { count } = await this.prisma.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: count };
  }
}
