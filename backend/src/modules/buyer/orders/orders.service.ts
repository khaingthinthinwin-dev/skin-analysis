import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async placeOrder(
    userId: string,
    payload: {
      shippingAddress: Record<string, string>;
      paymentMethod: string;
      couponCode?: string;
      notes?: string;
    },
  ) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const unavailableItem = cart.items.find(
      (item) =>
        !item.product.isActive || item.product.stockQuantity < item.quantity,
    );
    if (unavailableItem) {
      throw new BadRequestException(
        `Product "${unavailableItem.product.name}" is no longer available in the requested quantity`,
      );
    }

    let discountAmount = 0;
    if (payload.couponCode) {
      const subtotal = cart.items.reduce(
        (sum, item) =>
          sum + parseFloat(item.product.price.toString()) * item.quantity,
        0,
      );

      const promotion = await this.prisma.promotion.findUnique({
        where: { code: payload.couponCode },
        include: { discountType: true },
      });

      if (promotion && promotion.isActive) {
        const now = new Date();
        if (now >= promotion.startsAt && now <= promotion.expiresAt) {
          const discountValue = parseFloat(promotion.discountValue.toString());
          if (promotion.discountType.typeCode === 'percentage') {
            discountAmount = (subtotal * discountValue) / 100;
          } else {
            discountAmount = Math.min(discountValue, subtotal);
          }
        }
      }
    }

    const subtotal = cart.items.reduce(
      (sum, item) =>
        sum + parseFloat(item.product.price.toString()) * item.quantity,
      0,
    );
    const totalAmount = Math.max(subtotal - discountAmount, 0);

    const merchantMap = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const merchantId = item.product.merchantId;
      if (!merchantMap.has(merchantId)) {
        merchantMap.set(merchantId, []);
      }
      merchantMap.get(merchantId)!.push(item);
    }

    const firstMerchantId = cart.items[0].product.merchantId;

    const placedStatus = await this.prisma.orderStatus.findUnique({
      where: { statusCode: 'placed' },
    });
    if (!placedStatus) {
      throw new BadRequestException(
        'Order system is not configured. Please contact support.',
      );
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          buyerId: userId,
          merchantId: firstMerchantId,
          totalAmount: totalAmount.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          shippingAddress: payload.shippingAddress,
          paymentMethod: payload.paymentMethod,
          couponCode: payload.couponCode || null,
          notes: payload.notes || null,
          statusCode: 'placed',
          paymentStatus: 'pending',
        },
      });

      for (const item of cart.items) {
        const unitPriceNum = parseFloat(item.product.price.toString());
        const lineTotal = (unitPriceNum * item.quantity).toFixed(2);

        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            merchantId: item.product.merchantId,
            quantity: item.quantity,
            unitPrice: unitPriceNum.toFixed(2),
            totalPrice: lineTotal,
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          statusId: placedStatus.id,
          note: 'Order placed',
        },
      });

      return newOrder;
    });

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

    return {
      orderId: order.id,
      orderNumber: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
      status: order.statusCode,
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      total: totalAmount.toFixed(2),
      paymentMethod: order.paymentMethod,
      shippingAddress: payload.shippingAddress,
      createdAt: order.createdAt.toISOString(),
      estimatedDelivery: estimatedDelivery.toISOString(),
    };
  }

  async getOrderHistory(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { buyerId: userId },
        include: {
          status: true,
          items: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where: { buyerId: userId } }),
    ]);

    return {
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
        status: order.statusCode,
        statusName: order.status.statusName,
        totalAmount: order.totalAmount.toString(),
        discountAmount: order.discountAmount.toString(),
        itemCount: order.items.length,
        createdAt: order.createdAt.toISOString(),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderDetail(userId: string, orderId: string) {
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
                slug: true,
                images: true,
              },
            },
          },
        },
        statusHistory: {
          include: { status: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order || order.buyerId !== userId) {
      throw new NotFoundException('Order not found');
    }

    return {
      id: order.id,
      orderNumber: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
      status: order.statusCode,
      statusName: order.status.statusName,
      totalAmount: order.totalAmount.toString(),
      discountAmount: order.discountAmount.toString(),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      couponCode: order.couponCode,
      notes: order.notes,
      shippingAddress: order.shippingAddress as Record<string, string>,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productSlug: item.product.slug,
        productImage:
          Array.isArray(item.product.images) && item.product.images.length > 0
            ? item.product.images[0]
            : null,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
      })),
      timeline: order.statusHistory.map((h) => ({
        status: h.status.statusCode,
        statusName: h.status.statusName,
        note: h.note,
        changedBy: h.changedBy || '',
        createdAt: h.createdAt.toISOString(),
      })),
    };
  }

  async getOrderTracking(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        status: true,
        merchant: {
          include: {
            user: { select: { name: true } },
          },
        },
        statusHistory: {
          include: { status: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order || order.buyerId !== userId) {
      throw new NotFoundException('Order not found');
    }

    const estimatedDelivery = new Date(order.createdAt);
    estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

    const trackingStatuses = [
      'placed',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
    ];
    const currentIdx = trackingStatuses.indexOf(order.statusCode);

    return {
      orderId: order.id,
      orderNumber: `ORD-${order.id.slice(0, 8).toUpperCase()}`,
      currentStatus: order.statusCode,
      currentStatusName: order.status.statusName,
      merchantName: order.merchant.user.name,
      createdAt: order.createdAt.toISOString(),
      estimatedDelivery: estimatedDelivery.toISOString(),
      timeline: trackingStatuses.map((status, idx) => ({
        status,
        statusName: status.charAt(0).toUpperCase() + status.slice(1),
        completed: idx <= currentIdx,
        timestamp:
          idx <= currentIdx
            ? order.statusHistory
                .find((h) => h.status.statusCode === status)
                ?.createdAt.toISOString() || null
            : null,
      })),
    };
  }
}
