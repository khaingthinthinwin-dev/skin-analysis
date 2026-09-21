import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../../common/decorators/current-user.decorator';
import { RequireApprovedMerchantGuard } from '../../auth/guards/require-approved-merchant.guard';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionQueryDto } from './dto/promotion-query.dto';
import { ValidatePromotionDto } from './dto/validate-promotion.dto';

@ApiTags('Promotions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @ApiOperation({ summary: 'List merchant promotions' })
  @ApiResponse({
    status: 200,
    description: 'Promotions retrieved successfully',
  })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PromotionQueryDto) {
    return this.promotionsService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get promotion detail' })
  @ApiResponse({ status: 200, description: 'Promotion retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promotionsService.findOne(user.id, id);
  }

  @Post()
  @UseGuards(RequireApprovedMerchantGuard)
  @ApiOperation({ summary: 'Create a promotion' })
  @ApiResponse({ status: 201, description: 'Promotion created successfully' })
  @ApiResponse({ status: 409, description: 'Code already exists' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(RequireApprovedMerchantGuard)
  @ApiOperation({ summary: 'Update a promotion' })
  @ApiResponse({ status: 200, description: 'Promotion updated successfully' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  @ApiResponse({ status: 409, description: 'Used restriction' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(RequireApprovedMerchantGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a promotion' })
  @ApiResponse({ status: 200, description: 'Promotion deleted successfully' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  @ApiResponse({ status: 409, description: 'Used restriction' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promotionsService.remove(user.id, id);
  }

  @Patch(':id/toggle-active')
  @UseGuards(RequireApprovedMerchantGuard)
  @ApiOperation({ summary: 'Toggle promotion active status' })
  @ApiResponse({ status: 200, description: 'Status toggled successfully' })
  toggleActive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.promotionsService.toggleActive(user.id, id);
  }

  @Post('validate')
  @UseGuards(RequireApprovedMerchantGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a coupon code' })
  @ApiResponse({ status: 200, description: 'Coupon validated successfully' })
  @ApiResponse({ status: 400, description: 'Coupon validation failed' })
  validateCoupon(
    @CurrentUser() user: AuthUser,
    @Body() dto: ValidatePromotionDto,
  ) {
    return this.promotionsService.validateCoupon(
      user.id,
      dto.couponCode,
      dto.subtotal,
    );
  }
}
