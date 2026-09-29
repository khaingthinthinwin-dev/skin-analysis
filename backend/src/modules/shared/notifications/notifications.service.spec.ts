import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../../shared/prisma/prisma.service';

const mockPrisma = {
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('should return newest-first items with pagination meta', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([{ id: 'n-1' }]);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await service.list('user-1', { page: 1, limit: 20 });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 20,
        }),
      );
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter unread when unreadOnly is true', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.list('user-1', { unreadOnly: true });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', isRead: false },
        }),
      );
    });

    it('should scope admins to their own relevant notification types', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([
        { id: 'n-1', type: 'MERCHANT_REGISTERED' },
        { id: 'n-2', type: 'AD_SUBMITTED' },
      ]);
      mockPrisma.notification.count.mockResolvedValue(2);

      const adminUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        roleCode: 'admin',
      };

      const result = await service.list(adminUser, {});

      const query = (
        mockPrisma.notification.findMany.mock.calls as unknown as Array<
          [
            {
              where: {
                userId: string;
                type: { in: string[] };
              };
              orderBy: { createdAt: string };
            },
          ]
        >
      )[0][0];

      expect(query.where.userId).toBe('admin-1');
      expect(query.where.type.in).toContain('MERCHANT_REGISTERED');
      expect(query.where.type.in).toContain('MERCHANT_LICENSE_RESUBMITTED');
      expect(query.where.type.in).toContain('AD_SUBMITTED');
      expect(query.where.type.in).not.toContain('order');
      expect(query.where.type.in).not.toContain('MERCHANT_STATUS_CHANGED');
      expect(query.orderBy).toEqual({ createdAt: 'desc' });
      expect(result.items).toHaveLength(2);
    });

    it('should collapse duplicate registration notifications for the same merchant', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([
        { id: 'n-1', type: 'MERCHANT_REGISTERED', entityId: 'merchant-1' },
        { id: 'n-2', type: 'MERCHANT_REGISTERED', entityId: 'merchant-1' },
      ]);
      mockPrisma.notification.count.mockResolvedValue(2);

      const result = await service.list(
        {
          id: 'admin-1',
          email: 'admin@example.com',
          roleCode: 'admin',
        },
        {},
      );

      expect(result.items).toEqual([
        { id: 'n-1', type: 'MERCHANT_REGISTERED', entityId: 'merchant-1' },
      ]);
    });

    it('should allow target merchant to fetch their own MERCHANT_STATUS_CHANGED notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([
        {
          id: 'n-5',
          type: 'MERCHANT_STATUS_CHANGED',
          title: 'Merchant Approved',
        },
      ]);
      mockPrisma.notification.count.mockResolvedValue(1);

      const merchantUser = {
        id: 'merchant-user-1',
        email: 'merchant@example.com',
        roleCode: 'merchant',
      };

      const result = await service.list(merchantUser, {});

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'merchant-user-1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result.items).toHaveLength(1);
    });
  });

  describe('unreadCount', () => {
    it('should count unread notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(3);

      await expect(service.unreadCount('user-1')).resolves.toEqual({
        count: 3,
      });
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });

    it('should scope admin unread counts to relevant admin notifications', async () => {
      mockPrisma.notification.count.mockResolvedValue(1);

      await service.unreadCount({
        id: 'admin-1',
        email: 'admin@example.com',
        roleCode: 'admin',
      });

      const query = (
        mockPrisma.notification.count.mock.calls as unknown as Array<
          [
            {
              where: {
                userId: string;
                type: { in: string[] };
                isRead: boolean;
              };
            },
          ]
        >
      )[0][0];

      expect(query.where.userId).toBe('admin-1');
      expect(query.where.type.in).toContain('MERCHANT_REGISTERED');
      expect(query.where.type.in).not.toContain('order');
      expect(query.where.isRead).toBe(false);
    });
  });

  describe('markAsRead', () => {
    it('should mark an unread notification as read', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({
        id: 'n-1',
        isRead: false,
      });
      mockPrisma.notification.update.mockResolvedValue({
        id: 'n-1',
        isRead: true,
      });

      await service.markAsRead('user-1', 'n-1');

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n-1' },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({ isRead: true }),
      });
    });

    it('should throw NotFoundException for another user notification', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      await expect(service.markAsRead('user-1', 'n-9')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread as read', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      await expect(service.markAllAsRead('user-1')).resolves.toEqual({
        updated: 5,
      });
    });
  });
});
