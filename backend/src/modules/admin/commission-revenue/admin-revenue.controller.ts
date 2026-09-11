import {
  Controller,
  Get,
  Delete,
  Put,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Ip,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../../common/decorators/current-user.decorator';
import { RevenueService } from './revenue.service';
import { ForecastService } from './forecast.service';
import { ExportService } from './export.service';
import {
  RevenueTrendQueryDto,
  TrendRange,
} from './dto/revenue-trend-query.dto';
import { RevenueForecastQueryDto } from './dto/revenue-forecast-query.dto';
import {
  SaveRevenueTargetDto,
  TargetPeriod,
} from './dto/save-revenue-target.dto';
import { RevenueTargetQueryDto } from './dto/revenue-target-query.dto';
import { PayoutQueryDto } from './dto/payout-query.dto';
import { DeletePayoutsDto } from './dto/delete-payouts.dto';
import { ExportRequestDto } from './dto/export-request.dto';

@ApiTags('Admin Revenue')
@Controller('admin/revenue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminRevenueController {
  constructor(
    private readonly revenueService: RevenueService,
    private readonly forecastService: ForecastService,
    private readonly exportService: ExportService,
  ) {}

  @Get('kpis')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch revenue KPIs for the selected range' })
  @ApiResponse({ status: 200, description: 'Revenue KPIs returned' })
  async getRevenueKpis(@Query() query: RevenueTrendQueryDto) {
    const range = query.range ?? TrendRange.THIRTY_DAYS;
    return this.revenueService.getRevenueKPIs(range);
  }

  @Get('trends')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch revenue trend series' })
  @ApiResponse({ status: 200, description: 'Revenue trend series returned' })
  async getRevenueTrends(@Query() query: RevenueTrendQueryDto) {
    const range = query.range ?? TrendRange.THIRTY_DAYS;
    return this.revenueService.getRevenueTrends(range);
  }

  @Get('forecast')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch revenue forecast for the next period' })
  @ApiResponse({ status: 200, description: 'Revenue forecast returned' })
  async getRevenueForecast(@Query() query: RevenueForecastQueryDto) {
    const range = query.range ?? TrendRange.THIRTY_DAYS;
    return this.forecastService.generateForecast(range);
  }

  @Get('target')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch the active revenue target with progress' })
  @ApiResponse({ status: 200, description: 'Revenue target returned' })
  async getRevenueTarget(@Query() query: RevenueTargetQueryDto) {
    const period = query.period ?? TargetPeriod.MONTHLY;
    return this.revenueService.getTargetProgress(period);
  }

  @Put('targets')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update the revenue target' })
  @ApiResponse({ status: 200, description: 'Revenue target saved' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async saveRevenueTarget(
    @Body() dto: SaveRevenueTargetDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.revenueService.saveTarget(dto, user.id, ip);
  }

  @Get('payments/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch order payment status counts' })
  @ApiResponse({ status: 200, description: 'Payment status counts returned' })
  async getPaymentStatus(@Query() query: RevenueTrendQueryDto) {
    const range = query.range ?? TrendRange.THIRTY_DAYS;
    return this.revenueService.getPaymentStatus(range);
  }

  @Get('ad-fee')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch ad fee KPIs, trend, and payment status' })
  @ApiResponse({ status: 200, description: 'Ad fee revenue returned' })
  async getAdFeeRevenue(@Query() query: RevenueTrendQueryDto) {
    const range = query.range ?? TrendRange.THIRTY_DAYS;
    return this.revenueService.getAdFeeRevenue(range);
  }

  @Get('payouts/merchants')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Fetch distinct merchants for payout filter dropdown',
  })
  @ApiResponse({ status: 200, description: 'Merchant list returned' })
  async getPayoutMerchants() {
    return this.revenueService.getPayoutMerchants();
  }

  @Get('payouts')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch paginated merchant payouts' })
  @ApiResponse({ status: 200, description: 'Payouts returned' })
  async getPayouts(@Query() query: PayoutQueryDto) {
    return this.revenueService.getPayouts(query);
  }

  @Post('payouts/:id/process')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process a pending merchant payout' })
  @ApiResponse({ status: 200, description: 'Payout processed' })
  @ApiResponse({ status: 400, description: 'Payout not in pending status' })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  @ApiResponse({ status: 409, description: 'Payout already processed' })
  async processPayout(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.revenueService.processPayout(id, user.id, ip);
  }

  @Delete('payouts')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete old completed merchant payouts' })
  @ApiResponse({ status: 200, description: 'Payouts deleted' })
  @ApiResponse({
    status: 409,
    description: 'Payout is not eligible for deletion',
  })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  async deletePayout(
    @Body() dto: DeletePayoutsDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.revenueService.deletePayouts(dto.payoutIds, user.id, ip);
  }

  @Post('export')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export revenue report (CSV/Excel)' })
  @ApiResponse({ status: 200, description: 'Report generated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async exportRevenue(
    @Body() dto: ExportRequestDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
    @Res() res: Response,
  ) {
    await this.exportService.streamRevenueReport(dto, user.id, ip, res);
  }

  @Post('payouts/export')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export payout history (CSV/Excel)' })
  @ApiResponse({ status: 200, description: 'Report generated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async exportPayouts(
    @Body() dto: ExportRequestDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
    @Res() res: Response,
  ) {
    await this.exportService.streamPayoutReport(dto, user.id, ip, res);
  }
}
