import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import {
  ReviewAction,
  MerchantStatus,
  ReportAction,
  ModerateReviewDto,
  ModerateMerchantDto,
  ModerateProductDto,
  ModerateUserDto,
  UpdateReportStatusDto,
  ReportReviewDto,
  BulkModerateReviewsDto,
  BulkDeleteReviewsDto,
  BulkModerateProductsDto,
  BulkOperationResponse,
} from './dto/moderation.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── Dashboard ──────────────────────────────────────────────────────────

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

  // ─── Review Moderation ──────────────────────────────────────────────────

  async getReviews(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sort?: string;
    order?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sort = 'createdAt',
      order = 'desc',
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {};
    if (status === 'approved') where.isApproved = true;
    else if (status === 'rejected') where.isApproved = false;
    else if (status === 'pending') where.isApproved = false;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { product: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.ReviewOrderByWithRelationInput = { [sort]: order };

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              slug: true,
              price: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.review.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getReviewById(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            _count: { select: { reviews: true } },
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            images: true,
            slug: true,
            price: true,
          },
        },
      },
    });
    if (!review) throw new NotFoundException('Review not found');
    return review;
  }

  async moderateReview(
    reviewId: string,
    dto: ModerateReviewDto,
    adminId: string,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');

    if (dto.action === ReviewAction.APPROVE) {
      if (review.isApproved)
        throw new ConflictException('Review already approved');
    } else {
      if (!review.isApproved)
        throw new ConflictException('Review already rejected');
      if (!dto.reason || dto.reason.trim().length === 0) {
        throw new BadRequestException('Rejection reason is required');
      }
    }

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const r = await tx.review.update({
          where: { id: reviewId },
          data: { isApproved: dto.action === ReviewAction.APPROVE },
        });

        await this.recalculateProductStats(tx, review.productId);
        await this.logAudit(tx, {
          userId: adminId,
          action:
            dto.action === ReviewAction.APPROVE
              ? 'REVIEW_APPROVED'
              : 'REVIEW_REJECTED',
          entityType: 'review',
          entityId: reviewId,
          newValue: { isApproved: r.isApproved, reason: dto.reason },
        });

        return r;
      },
    );

    await this.invalidateProductCache(review.productId);

    return {
      id: updated.id,
      isApproved: updated.isApproved,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteReview(reviewId: string, adminId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.review.delete({ where: { id: reviewId } });
      await this.recalculateProductStats(tx, review.productId);
      await this.logAudit(tx, {
        userId: adminId,
        action: 'REVIEW_DELETED',
        entityType: 'review',
        entityId: reviewId,
        oldValue: { productId: review.productId },
      });
    });

    await this.invalidateProductCache(review.productId);
  }

  async reportReview(reviewId: string, adminId: string, dto: ReportReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found');

    const existing = await this.prisma.reviewReport.findFirst({
      where: { reviewId, reportedBy: adminId },
    });
    if (existing)
      throw new ConflictException('Report already exists for this review');

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const report = await tx.reviewReport.create({
        data: {
          reviewId,
          reportedBy: adminId,
          reason: dto.reason,
          description: dto.detail,
          status: 'pending',
        },
      });

      await this.logAudit(tx, {
        userId: adminId,
        action: 'REPORT_CREATED',
        entityType: 'report',
        entityId: report.id,
        newValue: { reviewId, reason: dto.reason },
      });

      return report;
    });
  }

  async bulkModerateReviews(dto: BulkModerateReviewsDto, adminId: string) {
    const results: {
      id: string;
      status: 'success' | 'failed';
      error?: string;
    }[] = [];
    let processed = 0;
    let failed = 0;

    for (const id of dto.ids) {
      try {
        await this.moderateReview(
          id,
          { action: dto.action, reason: dto.reason },
          adminId,
        );
        results.push({ id, status: 'success' });
        processed++;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        results.push({ id, status: 'failed', error: error.message });
        failed++;
      }
    }

    return { processed, failed, results } satisfies BulkOperationResponse;
  }

  async bulkDeleteReviews(dto: BulkDeleteReviewsDto, adminId: string) {
    const results: {
      id: string;
      status: 'success' | 'failed';
      error?: string;
    }[] = [];
    let processed = 0;
    let failed = 0;

    for (const id of dto.ids) {
      try {
        await this.deleteReview(id, adminId);
        results.push({ id, status: 'success' });
        processed++;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        results.push({ id, status: 'failed', error: error.message });
        failed++;
      }
    }

    return { processed, failed, results } satisfies BulkOperationResponse;
  }

  // ─── Merchant Management ────────────────────────────────────────────────

  async getMerchants(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sort?: string;
    order?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sort = 'createdAt',
      order = 'desc',
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.MerchantWhereInput = {};
    if (status) where.licenseStatus = status;
    if (search) {
      where.OR = [
        { shopName: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.MerchantOrderByWithRelationInput = { [sort]: order };

    const [items, total] = await Promise.all([
      this.prisma.merchant.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.merchant.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getMerchantById(merchantId: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return merchant;
  }

  async moderateMerchant(
    merchantId: string,
    dto: ModerateMerchantDto,
    adminId: string,
  ) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    if (dto.status === MerchantStatus.APPROVED) {
      if (merchant.licenseStatus === 'approved') {
        throw new ConflictException('Merchant already approved');
      }
    } else {
      if (merchant.licenseStatus === 'rejected') {
        throw new ConflictException('Merchant already rejected');
      }
      if (!dto.reason || dto.reason.trim().length === 0) {
        throw new BadRequestException('Rejection reason is required');
      }
    }

    const shop = await this.prisma.shop.findFirst({
      where: { userId: merchant.userId },
    });

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.merchant.update({
        where: { id: merchantId },
        data: {
          licenseStatus: dto.status,
          rejectionReason:
            dto.status === MerchantStatus.REJECTED ? dto.reason : null,
          reviewedAt: new Date(),
          reviewedBy: adminId,
        },
      });

      if (shop) {
        await tx.shop.update({
          where: { id: shop.id },
          data: { isApproved: dto.status === MerchantStatus.APPROVED },
        });
      }

      if (dto.status === MerchantStatus.REJECTED && shop) {
        const products = await tx.product.findMany({
          where: { merchantId, isActive: true },
        });
        for (const product of products) {
          await tx.product.update({
            where: { id: product.id },
            data: { isActive: false },
          });
          await this.redis.del(`cache:product:${product.id}`);
        }
        const keys = await this.redis.getClient().keys('cache:products:list:*');
        if (keys.length > 0) {
          await this.redis.getClient().del(...keys);
        }
      }

      await tx.notification.create({
        data: {
          userId: merchant.userId,
          type: 'MERCHANT_STATUS_CHANGED',
          title: `Merchant ${dto.status === MerchantStatus.APPROVED ? 'Approved' : 'Rejected'}`,
          message:
            dto.status === MerchantStatus.APPROVED
              ? `Your shop "${merchant.shopName}" has been approved. You can now list products.`
              : `Your shop "${merchant.shopName}" has been rejected. ${dto.reason || ''}`,
          entityType: 'merchant',
          entityId: merchantId,
        },
      });

      await this.logAudit(tx, {
        userId: adminId,
        action:
          dto.status === MerchantStatus.APPROVED
            ? 'MERCHANT_APPROVED'
            : 'MERCHANT_REJECTED',
        entityType: 'merchant',
        entityId: merchantId,
        newValue: { status: dto.status, reason: dto.reason, shopId: shop?.id },
      });

      return {
        id: updated.id,
        licenseStatus: updated.licenseStatus,
        updatedAt: updated.updatedAt,
      };
    });
  }

  // ─── Product Content Moderation ─────────────────────────────────────────

  async getProducts(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sort?: string;
    order?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sort = 'createdAt',
      order = 'desc',
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};
    if (status === 'active') where.isActive = true;
    else if (status === 'inactive') where.isActive = false;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { merchant: { shopName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = { [sort]: order };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          merchant: {
            select: {
              id: true,
              shopName: true,
              user: { select: { id: true, name: true } },
            },
          },
          category: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getProductById(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        merchant: {
          select: {
            id: true,
            shopName: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        category: { select: { id: true, name: true } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async moderateProduct(
    productId: string,
    dto: ModerateProductDto,
    adminId: string,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    if (!dto.isActive) {
      if (!product.isActive)
        throw new ConflictException('Product already inactive');
      if (!dto.reason || dto.reason.trim().length === 0) {
        throw new BadRequestException('Deactivation reason is required');
      }
    } else {
      if (product.isActive)
        throw new ConflictException('Product already active');
    }

    const updated = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const p = await tx.product.update({
          where: { id: productId },
          data: { isActive: dto.isActive },
        });

        await this.logAudit(tx, {
          userId: adminId,
          action: dto.isActive ? 'PRODUCT_REACTIVATED' : 'PRODUCT_DEACTIVATED',
          entityType: 'product',
          entityId: productId,
          newValue: { isActive: dto.isActive, reason: dto.reason },
        });

        return p;
      },
    );

    await this.invalidateProductCache(productId);

    return {
      id: updated.id,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
    };
  }

  async bulkModerateProducts(dto: BulkModerateProductsDto, adminId: string) {
    const results: {
      id: string;
      status: 'success' | 'failed';
      error?: string;
    }[] = [];
    let processed = 0;
    let failed = 0;

    for (const id of dto.ids) {
      try {
        await this.moderateProduct(
          id,
          { isActive: dto.isActive, reason: dto.reason },
          adminId,
        );
        results.push({ id, status: 'success' });
        processed++;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        results.push({ id, status: 'failed', error: error.message });
        failed++;
      }
    }

    return { processed, failed, results } satisfies BulkOperationResponse;
  }

  // ─── User Management ───────────────────────────────────────────────────

  async getUsers(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sort?: string;
    order?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sort = 'createdAt',
      order = 'desc',
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (status === 'active') where.isActive = true;
    else if (status === 'inactive') where.isActive = false;
    else if (status === 'admin') where.roleCode = 'admin';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = { [sort]: order };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          roleCode: true,
          avatarUrl: true,
          isActive: true,
          createdAt: true,
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        roleCode: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { reviews: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async moderateUser(userId: string, dto: ModerateUserDto, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!dto.isActive && userId === adminId) {
      throw new BadRequestException('Cannot deactivate your own account');
    }

    if (!dto.isActive) {
      if (!user.isActive) throw new ConflictException('User already inactive');
    } else {
      if (user.isActive) throw new ConflictException('User already active');
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: { isActive: dto.isActive },
      });

      if (!dto.isActive) {
        await tx.refreshToken.updateMany({
          where: { userId, isRevoked: false },
          data: { isRevoked: true },
        });
      }

      await this.logAudit(tx, {
        userId: adminId,
        action: dto.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entityType: 'user',
        entityId: userId,
        newValue: { isActive: dto.isActive },
      });

      return {
        id: updated.id,
        isActive: updated.isActive,
        updatedAt: updated.updatedAt,
      };
    });
  }

  // ─── Report Management ─────────────────────────────────────────────────

  async getReports(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    sort?: string;
    order?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sort = 'createdAt',
      order = 'desc',
    } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewReportWhereInput = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { reporter: { name: { contains: search, mode: 'insensitive' } } },
        { reporter: { email: { contains: search, mode: 'insensitive' } } },
        { review: { body: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orderBy: Prisma.ReviewReportOrderByWithRelationInput = {
      [sort]: order,
    };

    const [items, total] = await Promise.all([
      this.prisma.reviewReport.findMany({
        where,
        include: {
          review: {
            include: {
              user: { select: { id: true, name: true } },
              product: { select: { id: true, name: true, slug: true } },
            },
          },
          reporter: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          resolver: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.reviewReport.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getReportById(reportId: string) {
    const report = await this.prisma.reviewReport.findUnique({
      where: { id: reportId },
      include: {
        review: {
          include: {
            user: { select: { id: true, name: true } },
            product: { select: { id: true, name: true, slug: true } },
          },
        },
        reporter: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        resolver: { select: { id: true, name: true } },
      },
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async updateReportStatus(
    reportId: string,
    dto: UpdateReportStatusDto,
    adminId: string,
  ) {
    const report = await this.prisma.reviewReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status === 'resolved') {
      throw new ConflictException('Report already resolved');
    }

    if (dto.status === ReportAction.REVIEWED) {
      if (report.status !== 'pending') {
        throw new ConflictException(
          'Only pending reports can be marked as reviewed',
        );
      }
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updated = await tx.reviewReport.update({
        where: { id: reportId },
        data: {
          status: dto.status,
          adminNote: dto.adminNote,
          resolvedBy: adminId,
          resolvedAt: new Date(),
        },
      });

      if (dto.status === ReportAction.RESOLVED) {
        const review = await tx.review.findUnique({
          where: { id: report.reviewId },
        });
        if (review) {
          await tx.review.update({
            where: { id: report.reviewId },
            data: { isApproved: false },
          });
          await this.recalculateProductStats(tx, review.productId);
          await this.invalidateProductCache(review.productId);
        }
      }

      await this.logAudit(tx, {
        userId: adminId,
        action:
          dto.status === ReportAction.RESOLVED
            ? 'REPORT_RESOLVED'
            : 'REPORT_REJECTED',
        entityType: 'report',
        entityId: reportId,
        newValue: { status: dto.status, reviewId: report.reviewId },
      });

      return updated;
    });
  }

  async deleteReport(reportId: string, adminId: string) {
    const report = await this.prisma.reviewReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('Report not found');
    if (report.status === 'resolved') {
      throw new ConflictException('Resolved reports cannot be deleted');
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.reviewReport.delete({ where: { id: reportId } });

      await this.logAudit(tx, {
        userId: adminId,
        action: 'REPORT_DELETED',
        entityType: 'report',
        entityId: reportId,
        oldValue: { reviewId: report.reviewId, status: report.status },
      });

      return { success: true };
    });
  }

  // ─── Audit Logs ────────────────────────────────────────────────────────

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

  // ─── Private Helpers ───────────────────────────────────────────────────

  private async recalculateProductStats(
    tx: Prisma.TransactionClient,
    productId: string,
  ) {
    const result = await tx.$queryRaw<
      Array<{ avg_rating: number; review_count: number }>
    >`
      SELECT
        COALESCE(AVG(rating), 0)::numeric(3,2) as avg_rating,
        COUNT(*)::int as review_count
      FROM reviews
      WHERE product_id = ${productId}::uuid
      AND is_approved = true
    `;
    const stats = result[0];
    await tx.product.update({
      where: { id: productId },
      data: {
        avgRating: stats.avg_rating,
        reviewCount: stats.review_count,
      },
    });
  }

  private async invalidateProductCache(productId: string) {
    await this.redis.del(`cache:product:${productId}`);
    const keys = await this.redis.getClient().keys('cache:products:list:*');
    if (keys.length > 0) {
      await this.redis.getClient().del(...keys);
    }
  }

  private async logAudit(
    tx: Prisma.TransactionClient,
    data: {
      userId: string;
      action: string;
      entityType: string;
      entityId: string;
      oldValue?: Record<string, unknown>;
      newValue?: Record<string, unknown>;
    },
  ) {
    await tx.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValue: data.oldValue
          ? (JSON.parse(JSON.stringify(data.oldValue)) as Prisma.InputJsonValue)
          : undefined,
        newValue: data.newValue
          ? (JSON.parse(JSON.stringify(data.newValue)) as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }
}
