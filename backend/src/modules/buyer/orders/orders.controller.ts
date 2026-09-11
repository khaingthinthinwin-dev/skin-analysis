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

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer')
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
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getOrderHistory(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const data = await this.ordersService.getOrderHistory(
      user.id,
      page || 1,
      limit || 10,
    );
    return { data };
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
