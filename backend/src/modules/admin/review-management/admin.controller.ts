import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // =========================================================================
  // Dashboard
  // =========================================================================
  @Get('dashboard-stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // =========================================================================
  // User Management
  // =========================================================================
  @Get('users')
  async getUsers(
    @Query()
    query: {
      role?: string;
      is_active?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    return this.adminService.getUsers(query);
  }

  @Patch('users/:userId/status')
  async toggleUserStatus(
    @Param('userId') userId: string,
    @Body('is_active') isActive: boolean,
  ) {
    return this.adminService.toggleUserStatus(userId, isActive);
  }

  // =========================================================================
  // Review Moderation
  // =========================================================================
  @Get('reviews')
  async getReviews(
    @Query() query: { page?: number; limit?: number; is_approved?: boolean },
  ) {
    return this.adminService.getReviews(query);
  }

  @Patch('reviews/:id/approve')
  async approveReview(@Param('id') id: string) {
    return this.adminService.approveReview(id);
  }

  @Delete('reviews/:id')
  async deleteReview(@Param('id') id: string) {
    return this.adminService.deleteReview(id);
  }

  // =========================================================================
  // Review Reports
  // =========================================================================
  @Get('review-reports')
  async getReviewReports(
    @Query() query: { status?: string; page?: number; limit?: number },
  ) {
    return this.adminService.getReviewReports(query);
  }

  @Patch('review-reports/:id/resolve')
  async resolveReport(
    @Param('id') id: string,
    @Body() body: { action: 'resolved' | 'rejected'; note?: string },
  ) {
    return this.adminService.resolveReport(id, body.action, body.note);
  }

  // =========================================================================
  // Content Moderation
  // =========================================================================
  @Patch('products/:id/deactivate')
  async deactivateProduct(@Param('id') id: string) {
    return this.adminService.deactivateProduct(id);
  }

  @Get('products/flagged')
  async getFlaggedContent(@Query() query: { page?: number; limit?: number }) {
    return this.adminService.getflaggedContent(query);
  }

  // =========================================================================
  // Merchant Management
  // =========================================================================
  @Get('merchants')
  async getMerchants(
    @Query() query: { status?: string; page?: number; limit?: number },
  ) {
    return this.adminService.getMerchants(query);
  }

  @Patch('merchants/:id/approve')
  async approveMerchant(
    @Param('id') id: string,
    @Body('adminId') adminId?: string,
  ) {
    return this.adminService.approveMerchant(id, adminId);
  }

  @Patch('merchants/:id/reject')
  async rejectMerchant(
    @Param('id') id: string,
    @Body() body: { reason: string; adminId?: string },
  ) {
    return this.adminService.rejectMerchant(id, body.reason, body.adminId);
  }

  // =========================================================================
  // Advertisement Management
  // =========================================================================
  @Get('ads')
  async getAdvertisements(
    @Query() query: { status?: string; page?: number; limit?: number },
  ) {
    return this.adminService.getAdvertisements(query);
  }

  @Patch('ads/:id/approve')
  async approveAdvertisement(@Param('id') id: string) {
    return this.adminService.approveAdvertisement(id);
  }

  @Patch('ads/:id/reject')
  async rejectAdvertisement(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.adminService.rejectAdvertisement(id, reason);
  }

  @Get('ad-fee-settings')
  async getAdFeeSettings() {
    return this.adminService.getAdFeeSettings();
  }

  @Patch('ad-fee-settings/:id')
  async updateAdFeeSetting(
    @Param('id') id: string,
    @Body('daily_rate') dailyRate: number,
  ) {
    return this.adminService.updateAdFeeSetting(id, dailyRate);
  }

  // =========================================================================
  // Commission Management
  // =========================================================================
  @Get('commission/settings')
  async getCommissionSettings() {
    return this.adminService.getCommissionSettings();
  }

  @Patch('commission/settings')
  async updateCommissionSettings(
    @Body('commission_rate') rate: number,
    @Body('adminId') adminId?: string,
  ) {
    return this.adminService.updateCommissionSettings(rate, adminId);
  }

  @Get('commission/payouts')
  async getPayouts(
    @Query() query: { status?: string; page?: number; limit?: number },
  ) {
    return this.adminService.getPayouts(query);
  }

  @Post('commission/payouts/:id/process')
  async processPayout(
    @Param('id') id: string,
    @Body('adminId') adminId?: string,
  ) {
    return this.adminService.processPayout(id, adminId);
  }

  // =========================================================================
  // Audit Logs
  // =========================================================================
  @Get('audit-logs')
  async getAuditLogs(
    @Query()
    query: {
      page?: number;
      limit?: number;
      action?: string;
      userId?: string;
    },
  ) {
    return this.adminService.getAuditLogs(query);
  }
}
