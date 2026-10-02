import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../../common/decorators/current-user.decorator';
import { AuditLogsService } from './audit-logs.service';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import { ExportAuditLogsDto } from './dto/export-audit-logs.dto';
import { DeleteAuditLogsDto } from './dto/delete-audit-logs.dto';

@ApiTags('Admin Audit Logs')
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List audit logs with filters and pagination' })
  @ApiResponse({
    status: 200,
    description: 'Paginated audit log list returned',
  })
  @ApiResponse({ status: 400, description: 'Invalid filter parameters' })
  @ApiResponse({ status: 403, description: 'Non-admin access' })
  findAll(@Query() query: ListAuditLogsDto) {
    return this.auditLogsService.findAll(query);
  }

  // Static routes must precede `/:id` so "filters" is not captured as an ID.
  @Get('filters')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get distinct action and entity type filter options',
  })
  @ApiResponse({ status: 200, description: 'Filter options returned' })
  @ApiResponse({ status: 403, description: 'Non-admin access' })
  getFilterOptions() {
    return this.auditLogsService.getFilterOptions();
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a single audit log entry with old/new values' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Audit log detail returned' })
  @ApiResponse({ status: 404, description: 'Audit log entry not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditLogsService.findOne(id);
  }

  @Post('export')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export filtered audit logs as CSV (read-only)' })
  @ApiResponse({ status: 200, description: 'CSV file streamed' })
  @ApiResponse({
    status: 400,
    description: 'Invalid range or row limit exceeded',
  })
  @ApiResponse({ status: 403, description: 'Non-admin access' })
  async exportCsv(
    @Body() dto: ExportAuditLogsDto,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.auditLogsService.exportCsv(dto, user.id);
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Content-Length': file.content.length,
    });
    res.end(file.content);
  }

  @Delete('files')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Manually delete audit log records and CSV files aged >= 90 days (admin only)',
  })
  @ApiResponse({ status: 200, description: 'Deletion counts returned' })
  @ApiResponse({
    status: 400,
    description: 'Invalid retention threshold or no eligible targets',
  })
  @ApiResponse({ status: 403, description: 'Non-admin access' })
  remove(@Body() dto: DeleteAuditLogsDto, @CurrentUser() user: AuthUser) {
    return this.auditLogsService.remove(dto, user.id);
  }
}
