import {
  Controller,
  Get,
  Patch,
  Post,
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
import { CommissionService } from './commission.service';
import { ExportService } from './export.service';
import { UpdateCommissionRateDto } from './dto/update-commission-rate.dto';
import { CommissionReportQueryDto } from './dto/commission-report-query.dto';
import { ExportRequestDto } from './dto/export-request.dto';

@ApiTags('Admin Commission')
@Controller('admin/commission')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminCommissionController {
  constructor(
    private readonly commissionService: CommissionService,
    private readonly exportService: ExportService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch commission settings' })
  @ApiResponse({ status: 200, description: 'Commission settings returned' })
  async getCommissionSettings() {
    return this.commissionService.getCommissionSettings();
  }

  @Patch()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update commission rate' })
  @ApiResponse({ status: 200, description: 'Commission rate updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async updateCommissionRate(
    @Body() dto: UpdateCommissionRateDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
  ) {
    return this.commissionService.updateCommissionRate(dto, user.id, ip);
  }

  @Get('reports')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch merchant commission reports' })
  @ApiResponse({ status: 200, description: 'Commission reports returned' })
  async getCommissionReports(@Query() query: CommissionReportQueryDto) {
    return this.commissionService.getCommissionReports(query);
  }

  @Post('export')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export commission report (CSV/Excel)' })
  @ApiResponse({ status: 200, description: 'Report generated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async exportCommission(
    @Body() dto: ExportRequestDto,
    @CurrentUser() user: AuthUser,
    @Ip() ip: string,
    @Res() res: Response,
  ) {
    await this.exportService.streamCommissionReport(dto, user.id, ip, res);
  }
}
