import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator';
import { OrderFulfillmentService } from './order-fulfillment.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('merchant-order-fulfillment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant')
@Controller('merchant/orders')
export class OrderFulfillmentController {
  constructor(
    private readonly orderFulfillmentService: OrderFulfillmentService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get merchant order detail' })
  getOrderDetail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orderFulfillmentService.getOrderDetail(user, id);
  }

  @Get(':id/tracking')
  @ApiOperation({ summary: 'Get merchant order tracking timeline' })
  getOrderTracking(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orderFulfillmentService.getOrderTracking(user, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Advance an order status one step' })
  updateOrderStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderFulfillmentService.updateOrderStatus(user, id, dto);
  }
}
