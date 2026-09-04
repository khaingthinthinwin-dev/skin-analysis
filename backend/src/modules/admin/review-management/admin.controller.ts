import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../../common/decorators/current-user.decorator';
import {
  ModerateReviewDto,
  ModerateMerchantDto,
  ModerateProductDto,
  ModerateUserDto,
  UpdateReportStatusDto,
  ReportReviewDto,
  BulkModerateReviewsDto,
  BulkDeleteReviewsDto,
  BulkModerateProductsDto,
  ReviewsQueryDto,
  MerchantsQueryDto,
  ProductsQueryDto,
  UsersQueryDto,
  ReportsQueryDto,
} from './dto/moderation.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ──────────────────────────────────────────────────────────

  @Get('dashboard-stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ─── Review Moderation ──────────────────────────────────────────────────

  @Get('reviews')
  async getReviews(@Query() query: ReviewsQueryDto) {
    return this.adminService.getReviews(query);
  }

  @Get('reviews/:id')
  async getReviewById(@Param('id') id: string) {
    return this.adminService.getReviewById(id);
  }

  @Post('reviews/:id/moderate')
  async moderateReview(
    @Param('id') id: string,
    @Body() dto: ModerateReviewDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.moderateReview(id, dto, user.id);
  }

  @Post('reviews/:id/report')
  async reportReview(
    @Param('id') id: string,
    @Body() dto: ReportReviewDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.reportReview(id, user.id, dto);
  }

  @Delete('reviews/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReview(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.adminService.deleteReview(id, user.id);
  }

  @Post('reviews/bulk/moderate')
  async bulkModerateReviews(
    @Body() dto: BulkModerateReviewsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.bulkModerateReviews(dto, user.id);
  }

  @Delete('reviews/bulk')
  bulkDeleteReviews(
    @Body() dto: BulkDeleteReviewsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.bulkDeleteReviews(dto, user.id);
  }

  // ─── Merchant Management ────────────────────────────────────────────────

  @Get('merchants')
  getMerchants(@Query() query: MerchantsQueryDto) {
    return this.adminService.getMerchants(query);
  }

  @Get('merchants/:id')
  getMerchantById(@Param('id') id: string) {
    return this.adminService.getMerchantById(id);
  }

  @Patch('merchants/:id/status')
  moderateMerchant(
    @Param('id') id: string,
    @Body() dto: ModerateMerchantDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.moderateMerchant(id, dto, user.id);
  }

  // ─── Product Content Moderation ─────────────────────────────────────────

  @Get('content')
  getProducts(@Query() query: ProductsQueryDto) {
    return this.adminService.getProducts(query);
  }

  @Get('content/:id')
  getProductById(@Param('id') id: string) {
    return this.adminService.getProductById(id);
  }

  @Patch('content/:id/status')
  moderateProduct(
    @Param('id') id: string,
    @Body() dto: ModerateProductDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.moderateProduct(id, dto, user.id);
  }

  @Patch('content/bulk/status')
  bulkModerateProducts(
    @Body() dto: BulkModerateProductsDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.bulkModerateProducts(dto, user.id);
  }

  // ─── User Management ───────────────────────────────────────────────────

  @Get('users')
  getUsers(@Query() query: UsersQueryDto) {
    return this.adminService.getUsers(query);
  }

  @Get('users/:id')
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/status')
  moderateUser(
    @Param('id') id: string,
    @Body() dto: ModerateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.moderateUser(id, dto, user.id);
  }

  // ─── Report Management ─────────────────────────────────────────────────

  @Get('reports')
  getReports(@Query() query: ReportsQueryDto) {
    return this.adminService.getReports(query);
  }

  @Get('reports/:id')
  getReportById(@Param('id') id: string) {
    return this.adminService.getReportById(id);
  }

  @Patch('reports/:id/status')
  updateReportStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReportStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateReportStatus(id, dto, user.id);
  }

  @Delete('reports/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReport(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.adminService.deleteReport(id, user.id);
  }

  // ─── Audit Logs ────────────────────────────────────────────────────────

  @Get('audit-logs')
  getAuditLogs(
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
