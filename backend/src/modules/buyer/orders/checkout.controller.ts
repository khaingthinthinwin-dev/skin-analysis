import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../../common/decorators/current-user.decorator';
import { CheckoutService } from './checkout.service';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@ApiTags('checkout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Get()
  @ApiOperation({ summary: 'Get checkout data (cart items with pricing)' })
  async getCheckoutData(@CurrentUser() user: AuthUser) {
    const data = await this.checkoutService.getCheckoutData(user.id);
    return { data };
  }

  @Post('validate-coupon')
  @ApiOperation({ summary: 'Validate a coupon code' })
  async validateCoupon(
    @CurrentUser() user: AuthUser,
    @Body() dto: ValidateCouponDto,
  ) {
    const data = await this.checkoutService.validateCoupon(
      user.id,
      dto.couponCode,
      dto.subtotal,
    );
    return { data };
  }
}
