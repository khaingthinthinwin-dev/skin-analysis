import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { MerchantOrderDetailResponseDto } from './dto/merchant-order-detail-response.dto';
import { MerchantTrackingResponseDto } from './dto/merchant-tracking-response.dto';

const RATE_LIMIT_KEY = 'rate:order-fulfillment:status';
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_SECONDS = 60;

type CurrentStatus = {
  statusCode: string;
  statusName: string;
  displayOrder: number;
  isTerminalState: boolean;
};

type DetailOrder = Prisma.OrderGetPayload<{
  include: {
    status: true;
    items: {
      include: {
        product: { select: { id: true; name: true; images: true } };
      };
    };
    buyer: { select: { name: true; email: true; phone: true } };
  };
}>;

@Injectable()
export class OrderFulfillmentService {
  private readonly logger = new Logger(OrderFulfillmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getOrderDetail(
    user: AuthUser,
    orderId: string,
  ): Promise<MerchantOrderDetailResponseDto> {
    const merchantId = await this.resolveMerchantId(user.id);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        status: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
        buyer: { select: { name: true, email: true, phone: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.merchantId !== merchantId) {
      this.recordDeniedAccess(user.id, orderId);
      throw new NotFoundException('Order not found');
    }

    const detail = await this.projectOrderDetail(order);

    this.recordAudit(
      {
        userId: user.id,
        action: 'ORDER_DETAIL_VIEWED',
        entityType: 'order',
        entityId: orderId,
        newValue: { orderId },
      },
      'ORDER_DETAIL_VIEWED',
    );

    return detail;
  }

  async getOrderTracking(
    user: AuthUser,
    orderId: string,
  ): Promise<MerchantTrackingResponseDto> {
    const merchantId = await this.resolveMerchantId(user.id);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        statusHistory: {
          include: { status: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.merchantId !== merchantId) {
      this.recordDeniedAccess(user.id, orderId);
      throw new NotFoundException('Order not found');
    }

    this.recordAudit(
      {
        userId: user.id,
        action: 'ORDER_TRACKING_VIEWED',
        entityType: 'order',
        entityId: orderId,
        newValue: { orderId },
      },
      'ORDER_TRACKING_VIEWED',
    );

    return {
      timeline: order.statusHistory.map((history) => ({
        status: history.status.statusCode,
        statusName: history.status.statusName,
        note: history.note,
        changedBy: history.changedBy,
        createdAt: history.createdAt.toISOString(),
      })),
    };
  }

  async updateOrderStatus(
    user: AuthUser,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ): Promise<MerchantOrderDetailResponseDto> {
    const allowed = await this.redis.checkRateLimit(
      `${RATE_LIMIT_KEY}:${user.id}`,
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_SECONDS,
    );
    if (!allowed) {
      throw new HttpException(
        'Too many requests. Please wait 60 seconds',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const merchantId = await this.resolveMerchantId(user.id);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { status: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.merchantId !== merchantId) {
      this.recordDeniedAccess(user.id, orderId);
      throw new NotFoundException('Order not found');
    }

    const currentStatus = order.status;
    if (currentStatus.isTerminalState) {
      throw new UnprocessableEntityException(
        'This order has already been delivered',
      );
    }

    const targetStatus = await this.prisma.orderStatus.findUnique({
      where: { statusCode: dto.status },
    });

    if (!targetStatus) {
      throw new BadRequestException('Invalid status');
    }

    if (targetStatus.statusCode === 'placed') {
      throw new UnprocessableEntityException(
        'Orders can only move forward one step at a time',
      );
    }

    if (targetStatus.displayOrder !== currentStatus.displayOrder + 1) {
      throw new UnprocessableEntityException(
        'Orders can only move forward one step at a time',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { statusCode: targetStatus.statusCode },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          statusId: targetStatus.id,
          changedBy: user.id,
          note: 'Status updated by merchant',
        },
      });

      return tx.order.findUnique({
        where: { id: orderId },
        include: {
          status: true,
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                },
              },
            },
          },
          buyer: { select: { name: true, email: true, phone: true } },
        },
      });
    });

    if (!updated) {
      throw new NotFoundException('Order not found');
    }

    const detail = await this.projectOrderDetail(updated);

    this.recordAudit(
      {
        userId: user.id,
        action: 'ORDER_STATUS_UPDATED',
        entityType: 'order',
        entityId: orderId,
        newValue: {
          from: currentStatus.statusCode,
          to: targetStatus.statusCode,
        },
      },
      'ORDER_STATUS_UPDATED',
    );

    return detail;
  }

  private async projectOrderDetail(
    order: DetailOrder,
  ): Promise<MerchantOrderDetailResponseDto> {
    return {
      id: order.id,
      orderNumber: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
      createdAt: order.createdAt.toISOString(),
      status: order.status.statusCode,
      statusName: order.status.statusName,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.product.name,
        productImage:
          Array.isArray(item.product.images) && item.product.images.length > 0
            ? item.product.images[0]
            : null,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
      })),
      discountAmount: order.discountAmount.toString(),
      totalAmount: order.totalAmount.toString(),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      shippingAddress: order.shippingAddress as Record<string, string>,
      notes: order.notes,
      customer: {
        name: order.buyer.name,
        email: order.buyer.email,
        phone: order.buyer.phone,
      },
      availableTransitions: await this.resolveAvailableTransitions(
        order.status,
      ),
    };
  }

  private async resolveAvailableTransitions(
    currentStatus: CurrentStatus,
  ): Promise<string[]> {
    if (currentStatus.isTerminalState) {
      return [];
    }

    const next = await this.prisma.orderStatus.findFirst({
      where: { displayOrder: currentStatus.displayOrder + 1 },
    });

    return next ? [next.statusCode] : [];
  }

  private async resolveMerchantId(userId: string): Promise<string> {
    const merchant = await this.prisma.merchant.findUnique({
      where: { userId },
    });

    if (!merchant || merchant.licenseStatus !== 'approved') {
      throw new ForbiddenException('Your merchant account is not approved');
    }

    return merchant.id;
  }

  private recordDeniedAccess(userId: string, orderId: string): void {
    this.recordAudit(
      {
        userId,
        action: 'CROSS_SCOPE_ACCESS_DENIED',
        entityType: 'order',
        entityId: orderId,
        newValue: { orderId },
      },
      'CROSS_SCOPE_ACCESS_DENIED',
    );
  }

  private recordAudit(
    data: {
      userId: string;
      action: string;
      entityType: string;
      entityId?: string;
      newValue?: { orderId: string } | { from: string; to: string };
    },
    action: string,
  ): void {
    void this.prisma.auditLog.create({ data }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to write ${action} audit: ${message}`);
    });
  }
}
