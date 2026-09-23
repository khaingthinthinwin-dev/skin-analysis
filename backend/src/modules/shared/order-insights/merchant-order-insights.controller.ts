import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator';
import { MerchantScopeQueryDto } from './dto/merchant-scope-query.dto';
import { SummaryQueryDto } from './dto/summary-query.dto';
import { MerchantSummaryService } from './merchant-summary.service';

@ApiTags('order-insights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant', 'admin', 'super_admin')
@Controller('order-insights/merchant')
export class MerchantOrderInsightsController {
  constructor(
    private readonly merchantSummaryService: MerchantSummaryService,
  ) {}

  @Get('sales-summary')
  @ApiOperation({ summary: 'Merchant sales summary counters' })
  getSalesSummary(
    @CurrentUser() user: AuthUser,
    @Query() query: MerchantScopeQueryDto,
  ) {
    return this.merchantSummaryService.getSalesSummary(user, query);
  }

  @Get('revenue-summary')
  @ApiOperation({ summary: 'Merchant revenue summary figures' })
  getRevenueSummary(
    @CurrentUser() user: AuthUser,
    @Query() query: SummaryQueryDto,
  ) {
    return this.merchantSummaryService.getRevenueSummary(user, query);
  }
}
