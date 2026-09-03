import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // Dashboard
  // =========================================================================
  async getDashboardStats() {
    const [
      totalUsers,
      totalMerchants,
      pendingMerchants,
      pendingAds,
      pendingReviewReports,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.merchant.count({ where: { licenseStatus: 'approved' } }),
      this.prisma.merchant.count({ where: { licenseStatus: 'pending' } }),
      this.prisma.advertisement.count({ where: { approvalStatus: 'pending' } }),
      this.prisma.reviewReport.count({ where: { status: 'pending' } }),
    ]);

    return {
      totalUsers,
      totalMerchants,
      pendingMerchants,
      pendingAds,
      pendingReviewReports,
    };
  }

  // =========================================================================
  // User Management
  // =========================================================================
  async getUsers(params: {
    role?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
  }) {
    const { role, is_active, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (role) where.role = { roleCode: role };
    if (is_active !== undefined) where.isActive = is_active;

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          merchantProfile: {
            select: {
              id: true,
              shopName: true,
              licenseStatus: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async toggleUserStatus(userId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
  }

  // =========================================================================
  // Review Moderation
  // =========================================================================
  async getReviews(params: {
    page?: number;
    limit?: number;
    is_approved?: boolean;
  }) {
    const { page = 1, limit = 20, is_approved } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {};
    if (is_approved !== undefined) where.isApproved = is_approved;

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async approveReview(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.review.update({
      where: { id: reviewId },
      data: { isApproved: true },
    });
  }

  async deleteReview(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.review.delete({ where: { id: reviewId } });
  }

  // =========================================================================
  // Review Reports
  // =========================================================================
  async getReviewReports(params: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewReportWhereInput = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.reviewReport.findMany({
        where,
        include: {
          review: {
            include: {
              user: { select: { id: true, name: true } },
              product: { select: { id: true, name: true } },
            },
          },
          reporter: { select: { id: true, name: true, email: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.reviewReport.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async resolveReport(
    reportId: string,
    action: 'resolved' | 'rejected',
    note?: string,
  ) {
    const report = await this.prisma.reviewReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('Report not found');

    return this.prisma.reviewReport.update({
      where: { id: reportId },
      data: {
        status: action,
        adminNote: note,
        resolvedAt: new Date(),
      },
    });
  }

  // =========================================================================
  // Content Moderation
  // =========================================================================
  async deactivateProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    });
  }

  async getflaggedContent(params: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where = { isActive: false };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          merchant: { select: { id: true, shopName: true } },
          category: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // =========================================================================
  // Merchant Management
  // =========================================================================
  async getMerchants(params: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.MerchantWhereInput = {};
    if (status) where.licenseStatus = status;

    const [items, total] = await Promise.all([
      this.prisma.merchant.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.merchant.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async approveMerchant(merchantId: string, adminId?: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    if (merchant.licenseStatus === 'approved') {
      throw new ConflictException('Merchant already approved');
    }

    const [updatedMerchant] = await this.prisma.$transaction([
      this.prisma.merchant.update({
        where: { id: merchantId },
        data: {
          licenseStatus: 'approved',
          reviewedAt: new Date(),
          reviewedBy: adminId || null,
        },
      }),
      this.prisma.reviewReport.create({
        data: {
          reviewId: merchant.userId,
          reportedBy: merchant.userId,
          reason: 'other',
          status: 'resolved',
          adminNote: 'Merchant approved',
          resolvedBy: adminId || null,
          resolvedAt: new Date(),
        },
      }),
    ]);

    return updatedMerchant;
  }

  async rejectMerchant(merchantId: string, reason: string, adminId?: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    return this.prisma.merchant.update({
      where: { id: merchantId },
      data: {
        licenseStatus: 'rejected',
        rejectionReason: reason,
        reviewedAt: new Date(),
        reviewedBy: adminId || null,
      },
    });
  }

  // =========================================================================
  // Advertisement Management
  // =========================================================================
  async getAdvertisements(params: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.AdvertisementWhereInput = {};
    if (status) where.approvalStatus = status;

    const [items, total] = await Promise.all([
      this.prisma.advertisement.findMany({
        where,
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.advertisement.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async approveAdvertisement(adId: string) {
    const ad = await this.prisma.advertisement.findUnique({
      where: { id: adId },
    });
    if (!ad) throw new NotFoundException('Advertisement not found');

    return this.prisma.advertisement.update({
      where: { id: adId },
      data: {
        approvalStatus: 'approved',
        approvedAt: new Date(),
      },
    });
  }

  async rejectAdvertisement(adId: string, reason: string) {
    const ad = await this.prisma.advertisement.findUnique({
      where: { id: adId },
    });
    if (!ad) throw new NotFoundException('Advertisement not found');

    return this.prisma.advertisement.update({
      where: { id: adId },
      data: {
        approvalStatus: 'rejected',
        rejectionReason: reason,
        approvedAt: new Date(),
      },
    });
  }

  async getAdFeeSettings() {
    return this.prisma.adFeeSetting.findMany({
      orderBy: [{ placement: 'asc' }, { tier: 'asc' }],
    });
  }

  async updateAdFeeSetting(settingId: string, dailyRate: number) {
    const setting = await this.prisma.adFeeSetting.findUnique({
      where: { id: settingId },
    });
    if (!setting) throw new NotFoundException('Fee setting not found');

    return this.prisma.adFeeSetting.update({
      where: { id: settingId },
      data: { dailyRate },
    });
  }

  // =========================================================================
  // Commission Management
  // =========================================================================
  async getCommissionSettings() {
    const settings = await this.prisma.commissionSetting.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    return settings || { commissionRate: 0 };
  }

  async updateCommissionSettings(rate: number, adminId?: string) {
    const existing = await this.prisma.commissionSetting.findFirst();

    if (existing) {
      return this.prisma.commissionSetting.update({
        where: { id: existing.id },
        data: {
          commissionRate: rate,
          updatedBy: adminId || null,
          updatedAt: new Date(),
        },
      });
    }

    return this.prisma.commissionSetting.create({
      data: {
        commissionRate: rate,
        updatedBy: adminId || null,
      },
    });
  }

  async getPayouts(params: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.PayoutWhereInput = {};
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.payout.findMany({
        where,
        include: {
          merchant: {
            select: {
              id: true,
              shopName: true,
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payout.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async processPayout(payoutId: string, adminId?: string) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== 'pending') {
      throw new ConflictException('Payout already processed');
    }

    return this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'completed',
        processedBy: adminId || null,
        processedAt: new Date(),
      },
    });
  }

  // =========================================================================
  // Audit Logs
  // =========================================================================
  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    userId?: string;
  }) {
    const { page = 1, limit = 20, action, userId } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};
    if (action) where.action = { contains: action };
    if (userId) where.userId = userId;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
