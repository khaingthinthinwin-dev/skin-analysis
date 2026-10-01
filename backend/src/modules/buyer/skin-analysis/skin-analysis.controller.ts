import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Res,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiHeader,
} from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../../common/decorators/current-user.decorator';
import { SkinAnalysisService } from './skin-analysis.service';
import { UploadImageDto } from './dto/upload-image.dto';
import { StartAnalysisDto } from './dto/start-analysis.dto';
import { HistoryQueryDto, TrendsQueryDto } from './dto/history-query.dto';
import { CompareAnalysesDto } from './dto/compare-analyses.dto';
import { RecommendationFeedbackDto } from './dto/recommendation-feedback.dto';
import { ERROR_CODE } from './types/skin-analysis.enums';
import { DeleteAnalysesDto } from './dto/delete-analyses.dto';

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // mp-check headroom above the 10MB service limit

@ApiTags('skin-analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer')
@Controller('skin-analysis')
export class SkinAnalysisController {
  constructor(private readonly skinAnalysisService: SkinAnalysisService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload and validate a facial scan image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('facialImage', {
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() uploadImageDto: UploadImageDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException({
        errorCode: ERROR_CODE.INVALID_IMAGE_FORMAT,
        message: 'The facialImage file is required.',
      });
    }
    const result = await this.skinAnalysisService.uploadImage(
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
      uploadImageDto.consent,
      user.id,
    );
    return result;
  }

  @Post('analyze')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Start an AI skin analysis' })
  async analyze(
    @Body() startAnalysisDto: StartAnalysisDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.skinAnalysisService.startAnalysis(
      user.id,
      startAnalysisDto.blobUrl,
    );
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest completed analysis summary' })
  async getLatest(@CurrentUser() user: AuthUser) {
    return this.skinAnalysisService.getLatest(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get analysis history with pagination' })
  async getHistory(
    @CurrentUser() user: AuthUser,
    @Query() query: HistoryQueryDto,
  ) {
    return this.skinAnalysisService.getAnalysisHistory(user.id, query);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get health/hydration trend time series' })
  async getTrends(
    @CurrentUser() user: AuthUser,
    @Query() query: TrendsQueryDto,
  ) {
    return this.skinAnalysisService.getTrends(user.id, query.range);
  }

  @Post('compare')
  @ApiOperation({ summary: 'Compare two completed analyses' })
  async compare(
    @Body() dto: CompareAnalysesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.skinAnalysisService.compareAnalyses(
      user.id,
      dto.analysisId1,
      dto.analysisId2,
    );
  }

  @Get('export-history')
  @ApiOperation({ summary: 'Export full longitudinal history as PDF' })
  @ApiHeader({ name: 'Accept', description: 'application/pdf' })
  async exportHistory(@CurrentUser() user: AuthUser, @Res() res: Response) {
    await this.skinAnalysisService.exportHistoryReport(user.id, res);
  }

  @Post('recommendations/:id/feedback')
  @ApiOperation({ summary: 'Record recommendation helpfulness feedback' })
  async recommendationFeedback(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException({
            errorCode: ERROR_CODE.INVALID_ID,
            message: 'Invalid recommendation id.',
          }),
      }),
    )
    id: string,
    @Body() dto: RecommendationFeedbackDto,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.skinAnalysisService.updateRecommendationFeedback(
      user.id,
      id,
      dto.isHelpful,
    );
    return result;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comprehensive analysis result' })
  async getAnalysis(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException({
            errorCode: ERROR_CODE.INVALID_ID,
            message: 'Invalid analysis id.',
          }),
      }),
    )
    id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.skinAnalysisService.getAnalysisById(user.id, id);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export single analysis report as PDF' })
  @ApiHeader({ name: 'Accept', description: 'application/pdf' })
  async exportReport(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException({
            errorCode: ERROR_CODE.INVALID_ID,
            message: 'Invalid analysis id.',
          }),
      }),
    )
    id: string,
    @CurrentUser() user: AuthUser,
    @Res() res: Response,
  ) {
    await this.skinAnalysisService.exportReport(user.id, id, res);
  }

  @Delete('bulk')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete multiple analyses' })
  async deleteAnalyses(
    @CurrentUser() user: AuthUser,
    @Body() dto: DeleteAnalysesDto,
  ) {
    return this.skinAnalysisService.deleteAnalyses(user.id, dto.ids);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a single analysis' })
  async deleteAnalysis(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.skinAnalysisService.deleteAnalysis(user.id, id);
  }
}
