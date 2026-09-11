import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../../common/decorators/current-user.decorator';
import { AdminAdManagementService } from './admin-ad-management.service';
import { AdminAdExportService } from './admin-ad-export.service';
import {
  AdminAdListQueryDto,
  AdminRejectAdDto,
  AdminBulkApproveDto,
  AdminBulkRejectDto,
  CreateAdFeeSettingDto,
  UpdateAdFeeSettingDto,
  DeactivateAdFeeSettingDto,
  AdminAdFeeHistoryQueryDto,
  RevenueAnalyticsQueryDto,
  ExportAdPerformanceDto,
  ExportSubmissionHistoryDto,
  ExportFeeHistoryDto,
} from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminAdManagementController {
  constructor(
    private readonly adminAdManagementService: AdminAdManagementService,
    private readonly adminAdExportService: AdminAdExportService,
  ) {}

  // ─── Ad Review ─────────────────────────────────────────────────────────

  @Get('ads')
  async listAds(@Query() query: AdminAdListQueryDto) {
    return this.adminAdManagementService.listAds(query);
  }

  @Get('ads/:id')
  async viewAdDetail(@Param('id') id: string) {
    return this.adminAdManagementService.viewAdDetail(id);
  }

  @Post('ads/bulk/approve')
  async bulkApproveAds(
    @Body() dto: AdminBulkApproveDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminAdManagementService.bulkApproveAds(dto, user.id);
  }

  @Post('ads/bulk/reject')
  async bulkRejectAds(
    @Body() dto: AdminBulkRejectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminAdManagementService.bulkRejectAds(dto, user.id);
  }

  @Post('ads/:id/approve')
  async approveAd(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.adminAdManagementService.approveAd(id, user.id);
  }

  @Post('ads/:id/reject')
  async rejectAd(
    @Param('id') id: string,
    @Body() dto: AdminRejectAdDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminAdManagementService.rejectAd(id, dto, user.id);
  }

  // ─── Fee Settings ───────────────────────────────────────────────────────

  @Get('ad-fees')
  async listFeeSettings() {
    return this.adminAdManagementService.listFeeSettings();
  }

  @Post('ad-fees')
  async createFeeSetting(
    @Body() dto: CreateAdFeeSettingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminAdManagementService.createFeeSetting(dto, user.id);
  }

  @Put('ad-fees/:id')
  async updateFeeSetting(
    @Param('id') id: string,
    @Body() dto: UpdateAdFeeSettingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminAdManagementService.updateFeeSetting(id, dto, user.id);
  }

  @Patch('ad-fees/:id/deactivate')
  async deactivateFeeSetting(
    @Param('id') id: string,
    @Body() dto: DeactivateAdFeeSettingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminAdManagementService.deactivateFeeSetting(id, dto, user.id);
  }

  @Get('ad-fees/history')
  async listFeeHistory(@Query() query: AdminAdFeeHistoryQueryDto) {
    return this.adminAdManagementService.listFeeHistory(query);
  }

  // ─── Analytics ──────────────────────────────────────────────────────────

  @Get('ads/analytics/revenue')
  async getRevenueAnalytics(@Query() query: RevenueAnalyticsQueryDto) {
    return this.adminAdManagementService.getRevenueAnalytics(query);
  }

  // ─── Export Reports ─────────────────────────────────────────────────────

  @Post('ads/export/ad-performance')
  async exportAdPerformance(
    @Body() dto: ExportAdPerformanceDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const csv = await this.adminAdExportService.exportAdPerformance(
      dto,
      user.id,
    );
    this.sendCsv(res, 'ad_performance_report.csv', csv);
  }

  @Post('ads/export/submission-history')
  async exportSubmissionHistory(
    @Body() dto: ExportSubmissionHistoryDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const csv = await this.adminAdExportService.exportSubmissionHistory(
      dto,
      user.id,
    );
    this.sendCsv(res, 'submission_history_report.csv', csv);
  }

  @Post('ads/export/fee-history')
  async exportFeeHistory(
    @Body() dto: ExportFeeHistoryDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    const csv = await this.adminAdExportService.exportFeeHistory(dto, user.id);
    this.sendCsv(res, 'fee_history_report.csv', csv);
  }

  // ─── Private Helpers ───────────────────────────────────────────────────

  private sendCsv(res: Response, filename: string, csv: string) {
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.status(HttpStatus.OK).send(csv);
  }
}
