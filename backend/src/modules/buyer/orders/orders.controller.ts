import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderListQueryDto } from './dto/order-list-query.dto';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer', 'merchant', 'admin', 'super_admin')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place a new order' })
  async placeOrder(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    const data = await this.ordersService.placeOrder(user.id, {
      shippingAddress: dto.shippingAddress as unknown as Record<string, string>,
      paymentMethod: dto.paymentMethod,
      couponCode: dto.couponCode,
      notes: dto.notes,
    });
    return { data };
  }

  @Get()
  @ApiOperation({ summary: 'Get order history' })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, default: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, default: 20 })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['createdAt', 'totalAmount', 'status'],
  })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'merchantId', required: false, type: String })
  @ApiQuery({ name: 'shopId', required: false, type: String })
  async getOrderHistory(
    @CurrentUser() user: AuthUser,
    @Query() query: OrderListQueryDto,
  ) {
    if (
      (user.roleCode === 'buyer' || user.roleCode === 'merchant') &&
      (query.merchantId || query.shopId)
    ) {
      throw new ForbiddenException(
        "You don't have permission to filter by merchant",
      );
    }

    return this.ordersService.getOrderHistory(user.id, user.roleCode, query);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get order detail' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  async getOrderDetail(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ) {
    const data = await this.ordersService.getOrderDetail(user.id, orderId);
    return { data };
  }

  @Get(':orderId/tracking')
  @ApiOperation({ summary: 'Get order tracking' })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  async getOrderTracking(
    @CurrentUser() user: AuthUser,
    @Param('orderId') orderId: string,
  ) {
    const data = await this.ordersService.getOrderTracking(user.id, orderId);
    return { data };
  }
}
