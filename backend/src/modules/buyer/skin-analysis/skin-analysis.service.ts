import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { readFileSync } from 'fs';
import { Response } from 'express';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { RedisService } from '../../../shared/redis/redis.service';
import {
  AiGatewayService,
  AiAnalysisPayload,
} from './services/ai-gateway.service';
import { SkinScanStorageService } from './services/skin-scan-storage.service';
import { PdfReportService } from './services/pdf-report.service';
import { isStorageUrl } from './dto/start-analysis.dto';
import { HistoryQueryDto } from './dto/history-query.dto';
import {
  AnalysisResultDto,
  AnalysisHistoryResponseDto,
  AnalysisHistoryItemDto,
  ComparisonResultDto,
  ConditionDto,
  ConditionChangeDto,
  FindingDto,
  LatestAnalysisDto,
  RecommendationDto,
  StartAnalysisResponseDto,
  TrendPointDto,
  TrendsResponseDto,
  UploadImageResponseDto,
} from './types/skin-analysis.types';
import {
  AnalysisStatus,
  ConditionName,
  ConditionSeverity,
  FindingType,
  RecommendationPriority,
  SkinType,
  ERROR_CODE,
} from './types/skin-analysis.enums';
import { readImageMetadata } from './utils/image-metadata.util';
import { NotificationsService } from '../../shared/notifications/notifications.service';

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

// ─── Typed shapes for the result mapper ────────────────────────────────

interface AnalysisConditionRow {
  id: string;
  conditionName: string;
  severity: string;
  severityScore: number | null;
  affectedArea: string | null;
  description: string | null;
}

interface AnalysisFindingRow {
  id: string;
  findingType: string;
  title: string;
  description: string;
  affectedArea: string | null;
  severity: string;
}

interface AnalysisRecommendationRow {
  id: string;
  productId: string;
  productName: string | null;
  productType: string | null;
  priority: string;
  reason: string;
  product?: {
    name: string;
    category: { name: string } | null;
  } | null;
  feedback?: Array<{ isHelpful: boolean }>;
}

interface AnalysisDetailRow {
  id: string;
  userId: string;
  imageUrl: string;
  skinType: string | null;
  estimatedAge: number | null;
  analysisStatus: string;
  analysisDate: Date;
  healthScore: number | null;
  hydration: number | null;
  confidence: number | null;
  overallAssessment: string | null;
  createdAt: Date;
  updatedAt: Date;
  conditions?: AnalysisConditionRow[];
  findings?: AnalysisFindingRow[];
  recommendations?: AnalysisRecommendationRow[];
}

const DAILY_SCAN_LIMIT = 5;
const SCAN_FILE_SIZE_LIMIT = 10 * 1024 * 1024; // 10 MB
const RESULT_CACHE_TTL = 300; // 5 minutes
const AI_TIMEOUT_MS = 30_000;
const ESTIMATED_WAIT_SECONDS = 15;
const MIN_TREND_POINTS = 2;

const SKIN_TYPE_DB_TO_API: Record<string, SkinType> = {
  combination: SkinType.COMBINATION,
  oily: SkinType.OILY,
  dry: SkinType.DRY,
  normal: SkinType.NORMAL,
  sensitive: SkinType.SENSITIVE,
};

const STATUS_DB_TO_API: Record<string, AnalysisStatus> = {
  pending: AnalysisStatus.PROCESSING,
  processing: AnalysisStatus.PROCESSING,
  completed: AnalysisStatus.COMPLETED,
  failed: AnalysisStatus.FAILED,
  cancel: AnalysisStatus.CANCELLED,
};

const SEVERITY_RANK: Record<string, number> = {
  NONE: 0,
  MILD: 1,
  MODERATE: 2,
  SEVERE: 3,
};

const CONDITION_MATCH_TAGS: Record<string, string[]> = {
  acne: ['acne', 'salicylic', 'foam', 'cleanser'],
  redness: ['soothing', 'aloe-vera', 'sensitive', 'calming'],
  texture: ['exfoliating', 'retinol', 'serum'],
  pigmentation: ['vitamin-c', 'brightening', 'niacinamide'],
  dryness: ['moisturizer', 'hydrating', 'cream', 'hyaluronic'],
  pore_size: ['pore-minimizing', 'niacinamide', 'gel'],
};

@Injectable()
export class SkinAnalysisService {
  private readonly logger = new Logger(SkinAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly aiGateway: AiGatewayService,
    private readonly storage: SkinScanStorageService,
    private readonly pdfReport: PdfReportService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Upload ─────────────────────────────────────────────────────────────

  async uploadImage(
    file: UploadedFile,
    consent: boolean,
    userId: string,
  ): Promise<UploadImageResponseDto> {
    if (!consent) {
      throw new BadRequestException({
        errorCode: ERROR_CODE.CONSENT_MISSING,
        message: 'Consent is required before uploading facial images.',
      });
    }

    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException({
        errorCode: ERROR_CODE.INVALID_IMAGE_FORMAT,
        message: 'A facial image file is required.',
      });
    }

    if (file.buffer.length > SCAN_FILE_SIZE_LIMIT) {
      throw new BadRequestException({
        errorCode: ERROR_CODE.FILE_SIZE_EXCEEDED,
        message: 'File size exceeds 10MB limit.',
      });
    }

    const metadata = readImageMetadata(file.buffer);
    if (!metadata) {
      throw new BadRequestException({
        errorCode: ERROR_CODE.INVALID_IMAGE_FORMAT,
        message:
          'Unsupported file format. Only JPG, JPEG, PNG and WebP are allowed.',
      });
    }

    if (metadata.width < 640 || metadata.height < 480) {
      this.logger.warn(
        `Low resolution scan (${metadata.width}x${metadata.height}) accepted for user ${userId}.`,
      );
    }

    const stored = this.storage.saveScan(userId, {
      buffer: file.buffer,
      originalname: file.originalname,
    });

    return await Promise.resolve({
      blobUrl: stored.blobUrl,
      contentType: stored.metadata.contentType,
      fileSize: stored.fileSize,
      width: stored.metadata.width,
      height: stored.metadata.height,
    });
  }

  // ─── Analyze ────────────────────────────────────────────────────────────

  async startAnalysis(
    userId: string,
    blobUrl: string,
  ): Promise<StartAnalysisResponseDto> {
    if (!isStorageUrl(blobUrl)) {
      throw new BadRequestException({
        message: 'blobUrl must be a valid storage URL.',
      });
    }

    const used = await this.incrementDailyQuota(userId);
    this.assertQuota(used);

    const now = new Date();
    const analysis = await this.prisma.skinAnalysis.create({
      data: {
        userId,
        imageUrl: blobUrl,
        analysisStatus: 'processing',
        analysisDate: now,
      },
    });

    const remainingDailyQuota = Math.max(0, DAILY_SCAN_LIMIT - used);

    try {
      await this.runInference(analysis.id, userId, blobUrl);
    } catch (error) {
      await this.markFailedAndRollbackQuota(analysis.id, userId, error);
      throw new InternalServerErrorException({
        errorCode: this.classifyAiError(error),
        message: 'AI analysis service failed. Please try again shortly.',
      });
    }

    return {
      analysisId: analysis.id,
      status: this.mapStatus(analysis.analysisStatus),
      remainingDailyQuota,
      estimatedWaitSeconds: ESTIMATED_WAIT_SECONDS,
    };
  }

  // ─── Latest ─────────────────────────────────────────────────────────────

  async getLatest(userId: string): Promise<LatestAnalysisDto | null> {
    const latest = await this.prisma.skinAnalysis.findFirst({
      where: {
        userId,
        analysisStatus: 'completed',
        healthScore: { not: null },
      },
      orderBy: { analysisDate: 'desc' },
      select: {
        id: true,
        analysisDate: true,
        healthScore: true,
        hydration: true,
        skinType: true,
        estimatedAge: true,
      },
    });

    if (!latest) return null;

    const used = await this.getDailyQuotaUsed(userId);
    return {
      analysisId: latest.id,
      analysisDate: latest.analysisDate.toISOString(),
      healthScore: latest.healthScore ?? 0,
      hydration: latest.hydration ?? 0,
      skinType: this.mapSkinType(latest.skinType),
      skinAge: latest.estimatedAge ?? 0,
      remainingDailyQuota: Math.max(0, DAILY_SCAN_LIMIT - used),
    };
  }

  // ─── Details ────────────────────────────────────────────────────────────

  async getAnalysisById(
    userId: string,
    analysisId: string,
  ): Promise<AnalysisResultDto> {
    const cacheKey = `skin:analysis:${analysisId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as AnalysisResultDto;
        if (parsed.userId === userId) {
          return parsed;
        }
      } catch {
        // Fall through to DB on cache corruption
      }
    }

    const record = await this.prisma.skinAnalysis.findUnique({
      where: { id: analysisId },
      include: {
        conditions: true,
        findings: true,
        recommendations: {
          include: {
            product: {
              select: {
                name: true,
                category: { select: { name: true } },
              },
            },
            feedback: {
              where: { userId },
              select: { isHelpful: true },
            },
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException({
        errorCode: ERROR_CODE.NOT_FOUND,
        message: 'Analysis record not found.',
      });
    }

    if (record.userId !== userId) {
      throw new ForbiddenException({
        errorCode: ERROR_CODE.FORBIDDEN,
        message: 'You do not own this analysis record.',
      });
    }

    const dto = this.toAnalysisResultDto(record);
    await this.redis.set(cacheKey, JSON.stringify(dto), RESULT_CACHE_TTL);
    return dto;
  }

  // ─── History ────────────────────────────────────────────────────────────

  async getAnalysisHistory(
    userId: string,
    query: HistoryQueryDto,
  ): Promise<AnalysisHistoryResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const where: Prisma.SkinAnalysisWhereInput = {
      userId,
      analysisStatus: 'completed',
      healthScore: { not: null },
    };

    const dateFilter: Prisma.DateTimeFilter = {};
    if (query.dateFrom) {
      dateFilter.gte = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      dateFilter.lte = this.endOfUtcDay(new Date(query.dateTo));
    }
    if (dateFilter.gte || dateFilter.lte) {
      where.analysisDate = dateFilter;
    }

    const [records, totalItems, aggregate] = await Promise.all([
      this.prisma.skinAnalysis.findMany({
        where,
        orderBy: { analysisDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          analysisDate: true,
          healthScore: true,
          hydration: true,
          skinType: true,
          estimatedAge: true,
          analysisStatus: true,
        },
      }),
      this.prisma.skinAnalysis.count({ where }),
      this.summaryAggregates(userId),
    ]);

    const items: AnalysisHistoryItemDto[] = records.map((r) => ({
      analysisId: r.id,
      analysisDate: r.analysisDate.toISOString(),
      healthScore: r.healthScore ?? 0,
      hydration: r.hydration ?? 0,
      skinType: this.mapSkinType(r.skinType),
      skinAge: r.estimatedAge ?? 0,
      status: this.mapStatus(r.analysisStatus),
    }));

    return {
      items,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
      summary: aggregate,
    };
  }

  // ─── Trends ─────────────────────────────────────────────────────────────

  async getTrends(
    userId: string,
    range: string = 'all',
  ): Promise<TrendsResponseDto> {
    const where: Prisma.SkinAnalysisWhereInput = {
      userId,
      analysisStatus: 'completed',
      healthScore: { not: null },
    };

    if (range !== 'all') {
      const cutoff = this.rangeCutoff(range);
      where.analysisDate = { gte: cutoff };
    }

    const records = await this.prisma.skinAnalysis.findMany({
      where,
      orderBy: { analysisDate: 'asc' },
      select: {
        id: true,
        analysisDate: true,
        healthScore: true,
        hydration: true,
      },
    });

    if (records.length < MIN_TREND_POINTS) {
      return {
        healthScoreTrend: [],
        hydrationTrend: [],
        minPointsMet: false,
      };
    }

    const healthScoreTrend: TrendPointDto[] = records.map((r) => ({
      date: r.analysisDate.toISOString().slice(0, 10),
      value: r.healthScore ?? 0,
      analysisId: r.id,
    }));
    const hydrationTrend: TrendPointDto[] = records.map((r) => ({
      date: r.analysisDate.toISOString().slice(0, 10),
      value: r.hydration ?? 0,
      analysisId: r.id,
    }));

    return {
      healthScoreTrend,
      hydrationTrend,
      minPointsMet: true,
    };
  }

  // ─── Compare ────────────────────────────────────────────────────────────

  async compareAnalyses(
    userId: string,
    analysisId1: string,
    analysisId2: string,
  ): Promise<ComparisonResultDto> {
    if (analysisId1 === analysisId2) {
      throw new BadRequestException({
        errorCode: ERROR_CODE.IDENTICAL_IDS,
        message: 'analysisId1 and analysisId2 cannot be identical.',
      });
    }

    const [first, second] = await Promise.all([
      this.prisma.skinAnalysis.findUnique({
        where: { id: analysisId1 },
        include: { conditions: true },
      }),
      this.prisma.skinAnalysis.findUnique({
        where: { id: analysisId2 },
        include: { conditions: true },
      }),
    ]);

    for (const record of [first, second]) {
      if (!record) {
        throw new NotFoundException({
          errorCode: ERROR_CODE.NOT_FOUND,
          message: 'Analysis record not found.',
        });
      }
      if (record.userId !== userId) {
        throw new ForbiddenException({
          errorCode: ERROR_CODE.FORBIDDEN,
          message: 'One or both analyses do not belong to you.',
        });
      }
      if (record.analysisStatus !== 'completed') {
        throw new BadRequestException({
          message: 'Only completed analyses can be compared.',
        });
      }
    }

    const [scan1, scan2] =
      first!.analysisDate <= second!.analysisDate
        ? [first!, second!]
        : [second!, first!];

    const scoreDelta = (scan2.healthScore ?? 0) - (scan1.healthScore ?? 0);
    const hydrationDelta = (scan2.hydration ?? 0) - (scan1.hydration ?? 0);
    const ageDelta = (scan2.estimatedAge ?? 0) - (scan1.estimatedAge ?? 0);
    const daysBetween = Math.abs(
      this.calendarDaysBetween(scan2.analysisDate, scan1.analysisDate),
    );

    const conditionChanges = this.computeConditionChanges(scan1, scan2);

    return {
      analysis1: {
        id: scan1.id,
        date: scan1.analysisDate.toISOString().slice(0, 10),
        healthScore: scan1.healthScore ?? 0,
        hydration: scan1.hydration ?? 0,
        skinAge: scan1.estimatedAge ?? 0,
      },
      analysis2: {
        id: scan2.id,
        date: scan2.analysisDate.toISOString().slice(0, 10),
        healthScore: scan2.healthScore ?? 0,
        hydration: scan2.hydration ?? 0,
        skinAge: scan2.estimatedAge ?? 0,
      },
      scoreDelta,
      hydrationDelta,
      ageDelta,
      daysBetween,
      conditionChanges,
    };
  }

  // ─── Export ─────────────────────────────────────────────────────────────

  async exportReport(
    userId: string,
    analysisId: string,
    res: Response,
  ): Promise<void> {
    const dto = await this.getAnalysisById(userId, analysisId);
    const localPath = this.storage.resolveLocalPath(dto.facialScanUrl);
    const scanImage = localPath
      ? {
          buffer: readFileSync(localPath) as Buffer,
          type: this.storage.getContentType(localPath),
        }
      : null;

    const buffer = await this.pdfReport.buildReport({
      reportId: dto.analysisId,
      generatedAt: new Date(),
      buyerLabel: `Buyer ${dto.userId.slice(0, 8)}`,
      analysis: dto,
      scanImage,
    });

    const dateLabel = dto.analysisDate.slice(0, 10).replace(/-/g, '');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="skin-analysis-report-${dateLabel}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.status(200).end(buffer);
  }

  async exportHistoryReport(userId: string, res: Response): Promise<void> {
    const records = await this.prisma.skinAnalysis.findMany({
      where: {
        userId,
        analysisStatus: 'completed',
        healthScore: { not: null },
      },
      orderBy: { analysisDate: 'asc' },
      select: {
        id: true,
        analysisDate: true,
        healthScore: true,
        hydration: true,
        skinType: true,
        estimatedAge: true,
        analysisStatus: true,
      },
    });

    const summary = await this.summaryAggregates(userId);
    const healthScoreTrend: TrendPointDto[] = records.map((r) => ({
      date: r.analysisDate.toISOString().slice(0, 10),
      value: r.healthScore ?? 0,
      analysisId: r.id,
    }));
    const hydrationTrend: TrendPointDto[] = records.map((r) => ({
      date: r.analysisDate.toISOString().slice(0, 10),
      value: r.hydration ?? 0,
      analysisId: r.id,
    }));

    const buffer = await this.pdfReport.buildHistoryReport({
      reportId: `history-${userId.slice(0, 8)}-${Date.now()}`,
      generatedAt: new Date(),
      buyerLabel: `Buyer ${userId.slice(0, 8)}`,
      items: records.map((r) => ({
        analysisId: r.id,
        analysisDate: r.analysisDate.toISOString(),
        healthScore: r.healthScore ?? 0,
        hydration: r.hydration ?? 0,
        skinType: this.mapSkinType(r.skinType),
        skinAge: r.estimatedAge ?? 0,
        status: this.mapStatus(r.analysisStatus),
      })),
      summary,
      healthScoreTrend,
      hydrationTrend,
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        'attachment; filename="skin-analysis-full-history.pdf"',
      'Content-Length': buffer.length,
    });
    res.status(200).end(buffer);
  }

  // ─── Feedback ───────────────────────────────────────────────────────────

  async updateRecommendationFeedback(
    userId: string,
    recommendationId: string,
    isHelpful: boolean,
  ): Promise<{ message: string }> {
    const recommendation =
      await this.prisma.skinAnalysisRecommendation.findUnique({
        where: { id: recommendationId },
        include: { analysis: { select: { userId: true } } },
      });

    if (!recommendation) {
      throw new NotFoundException({
        errorCode: ERROR_CODE.NOT_FOUND,
        message: 'Recommendation record not found.',
      });
    }

    if (recommendation.analysis.userId !== userId) {
      throw new ForbiddenException({
        errorCode: ERROR_CODE.FORBIDDEN,
        message: 'You do not own this recommendation.',
      });
    }

    await this.prisma.skinAnalysisFeedback.upsert({
      where: {
        recommendationId_userId: {
          recommendationId,
          userId,
        },
      },
      create: { recommendationId, userId, isHelpful },
      update: { isHelpful },
    });

    await this.redis.del(`skin:analysis:${recommendation.analysisId}`);
    await this.invalidateHistorySummaryCache(userId);

    return { message: 'Feedback recorded successfully.' };
  }

  // ─── Mappers ────────────────────────────────────────────────────────────

  mapSkinType(value: string | null | undefined): SkinType {
    if (!value) return SkinType.NORMAL;
    const normalized = value.toLowerCase();
    return SKIN_TYPE_DB_TO_API[normalized] ?? SkinType.NORMAL;
  }

  mapStatus(value: string): AnalysisStatus {
    return STATUS_DB_TO_API[value] ?? AnalysisStatus.PROCESSING;
  }

  mapSeverity(value: string): ConditionSeverity {
    const normalized = (value || 'NONE').toUpperCase();
    return normalized in SEVERITY_RANK
      ? (normalized as ConditionSeverity)
      : ConditionSeverity.NONE;
  }

  mapConditionName(value: string): ConditionName {
    const normalized = value.toLowerCase();
    return Object.values(ConditionName).includes(normalized as ConditionName)
      ? (normalized as ConditionName)
      : (normalized as ConditionName);
  }

  // ─── Inference ──────────────────────────────────────────────────────────

  private async runInference(
    analysisId: string,
    userId: string,
    blobUrl: string,
  ): Promise<void> {
    const localPath = this.storage.resolveLocalPath(blobUrl);
    let imageBuffer: Buffer;
    if (localPath) {
      imageBuffer = readFileSync(localPath);
    } else {
      this.logger.warn(
        `Scan file for ${analysisId} not found on disk; running simulator on a synthetic buffer.`,
      );
      imageBuffer = Buffer.from(blobUrl, 'utf8');
    }

    const payload: AiAnalysisPayload = await this.runWithTimeout(
      this.aiGateway.analyze(imageBuffer, userId),
    );

    const recommendations = await this.buildRecommendations(userId, payload);

    await this.prisma.$transaction(async (tx) => {
      await tx.skinAnalysis.update({
        where: { id: analysisId },
        data: {
          healthScore: payload.healthScore,
          hydration: payload.hydration,
          confidence: payload.confidence,
          skinType: payload.skinType.toLowerCase(),
          estimatedAge: payload.estimatedAge,
          overallAssessment: payload.overallAssessment,
          analysisStatus: 'completed',
          completedAt: new Date(),
        },
      });

      for (const condition of payload.conditions) {
        await tx.skinAnalysisCondition.create({
          data: {
            analysisId,
            conditionName: condition.conditionName,
            severity: condition.severity,
            severityScore: condition.severityScore,
            affectedArea: condition.affectedArea,
            description: condition.description,
            confidence: condition.confidence,
          },
        });
      }

      for (const finding of payload.findings) {
        await tx.skinAnalysisFinding.create({
          data: {
            analysisId,
            findingType: finding.findingType,
            title: finding.title,
            description: finding.description,
            affectedArea: finding.affectedArea,
            severity: finding.severity,
          },
        });
      }

      for (const rec of recommendations) {
        await tx.skinAnalysisRecommendation.create({
          data: {
            analysisId,
            productId: rec.productId,
            productName: rec.productName,
            productType: rec.productType,
            priority: rec.priority,
            reason: rec.reason,
            matchScore: rec.matchScore,
            displayOrder: rec.displayOrder,
          },
        });
      }
    });

    const completed = await this.prisma.skinAnalysis.findUnique({
      where: { id: analysisId },
      include: {
        conditions: true,
        findings: true,
        recommendations: true,
      },
    });

    if (completed) {
      const dto = this.toAnalysisResultDto(completed);
      await this.redis.set(
        `skin:analysis:${analysisId}`,
        JSON.stringify(dto),
        RESULT_CACHE_TTL,
      );

      await this.notifications.create({
        userId,
        type: 'analysis',
        title: 'Analysis completed 🔔',
        message:
          'Your skin analysis is ready. Check your results and personalized recommendations.',
        entityType: 'skin_analysis',
        entityId: analysisId,
      });
    }

    await this.invalidateHistorySummaryCache(userId);
  }

  private async runWithTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error('AI gateway timed out.'));
      }, AI_TIMEOUT_MS);
    });

    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }

  private async buildRecommendations(
    userId: string,
    payload: AiAnalysisPayload,
  ): Promise<
    Array<{
      productId: string;
      productName: string;
      productType: string;
      priority: RecommendationPriority;
      reason: string;
      matchScore: number;
      displayOrder: number;
    }>
  > {
    const skinTypeLower = payload.skinType.toLowerCase();

    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        merchant: { user: { shop: { isApproved: true } } },
      },
      include: {
        category: { select: { name: true } },
      },
      take: 30,
    });

    const activeConditions = payload.conditions.filter(
      (c) => c.severity !== ConditionSeverity.NONE,
    );

    const scored = products
      .map((product) => {
        const productTags = product.tags.map((t) => t.toLowerCase());
        let score = 0;

        const typeMatch = product.skinTypes.includes(skinTypeLower);
        const typeWildcard = product.skinTypes.includes('all');
        if (typeMatch || typeWildcard) score += 40;

        for (const condition of activeConditions) {
          const matchedTags =
            CONDITION_MATCH_TAGS[condition.conditionName] ?? [];
          const tagOverlap = matchedTags.filter((tag) =>
            productTags.includes(tag),
          ).length;
          const weight =
            condition.severity === ConditionSeverity.SEVERE
              ? 30
              : condition.severity === ConditionSeverity.MODERATE
                ? 20
                : condition.severity === ConditionSeverity.MILD
                  ? 10
                  : 0;
          score += tagOverlap * weight;
        }

        score += Math.round((product.avgRating?.toNumber?.() ?? 0) * 5);
        if (product.isFeatured) score += 5;
        if (product.stockQuantity > 0) score += 2;

        return { product, score: Math.min(100, score) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const highestSeverity = activeConditions[0];
    const defaultPriority = highestSeverity
      ? highestSeverity.severity === ConditionSeverity.SEVERE
        ? RecommendationPriority.HIGH
        : highestSeverity.severity === ConditionSeverity.MODERATE
          ? RecommendationPriority.MEDIUM
          : RecommendationPriority.LOW
      : RecommendationPriority.LOW;

    return scored.map(({ product, score }, index) => {
      const reason = this.buildRecommendationReason(product, highestSeverity);
      return {
        productId: product.id,
        productName: product.name,
        productType: product.category?.name ?? '',
        priority:
          score >= 75
            ? RecommendationPriority.HIGH
            : score >= 55
              ? RecommendationPriority.MEDIUM
              : defaultPriority,
        reason,
        matchScore: score,
        displayOrder: index + 1,
      };
    });
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  private buildRecommendationReason(
    product: { tags: string[]; name: string },
    topCondition?: {
      conditionName: ConditionName;
      severity: ConditionSeverity;
    },
  ): string {
    if (topCondition) {
      const label = this.conditionDisplayLabel(topCondition.conditionName);
      const severityNote =
        topCondition.severity === ConditionSeverity.SEVERE
          ? 'severe '
          : topCondition.severity === ConditionSeverity.MODERATE
            ? 'moderate '
            : '';
      if (product.tags.includes('cleanser') || product.tags.includes('foam')) {
        return `Gentle cleansing supports ${severityNote}${label} management from the first step.`;
      }
      if (
        product.tags.includes('moisturizer') ||
        product.tags.includes('cream')
      ) {
        return `Replenishes the lipid barrier to treat ${severityNote}${label} and reduce moisture loss.`;
      }
      return `Formulated to support ${label} care for your skin profile.`;
    }
    return 'Aligned with your current skin profile and care goals.';
  }

  private conditionDisplayLabel(name: ConditionName): string {
    switch (name) {
      case ConditionName.ACNE:
        return 'acne';
      case ConditionName.REDNESS:
        return 'redness';
      case ConditionName.TEXTURE:
        return 'texture';
      case ConditionName.PIGMENTATION:
        return 'pigmentation';
      case ConditionName.DRYNESS:
        return 'dryness';
      case ConditionName.PORE_SIZE:
        return 'pore concerns';
    }
  }

  private async incrementDailyQuota(userId: string): Promise<number> {
    const key = `quota:skin:${userId}:${this.currentUtcDate()}`;
    let used = await this.redis.incr(key);
    if (used === 1) {
      await this.redis.expire(key, this.secondsUntilUtcMidnight());
    }
    if (used === 0) {
      // Redis unavailable → fall back to DB count of today's analyses
      used = await this.prisma.skinAnalysis.count({
        where: {
          userId,
          analysisDate: { gte: this.utcStartOfToday() },
        },
      });
    }
    return used;
  }

  private async getDailyQuotaUsed(userId: string): Promise<number> {
    const key = `quota:skin:${userId}:${this.currentUtcDate()}`;
    const value = await this.redis.get(key);
    if (value !== null) {
      return parseInt(value, 10);
    }
    return this.prisma.skinAnalysis.count({
      where: {
        userId,
        analysisDate: { gte: this.utcStartOfToday() },
      },
    });
  }

  private assertQuota(used: number): void {
    if (used > DAILY_SCAN_LIMIT) {
      throw new HttpException(
        {
          errorCode: ERROR_CODE.DAILY_QUOTA_EXCEEDED,
          message: `Daily analysis limit reached (${DAILY_SCAN_LIMIT} per day). Please try again tomorrow.`,
          remaining: 0,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async markFailedAndRollbackQuota(
    analysisId: string,
    userId: string,
    error: unknown,
  ): Promise<void> {
    this.logger.error(
      `Analysis ${analysisId} failed: ${(error as Error)?.message ?? 'unknown error'}`,
    );
    await this.prisma.skinAnalysis
      .update({
        where: { id: analysisId },
        data: { analysisStatus: 'failed', completedAt: new Date() },
      })
      .catch((e: Error) =>
        this.logger.error(`Failed to mark analysis failed: ${e.message}`),
      );

    // Decrement the daily counter to avoid penalizing the buyer for a system error
    const key = `quota:skin:${userId}:${this.currentUtcDate()}`;
    const redis = this.redis.getClient();
    if (redis) {
      await redis.decr(key).catch(() => undefined);
    }
    await this.invalidateHistorySummaryCache(userId);
  }

  private classifyAiError(error: unknown): string {
    const msg = (error as Error)?.message ?? '';
    if (msg.includes('unreadable face') || msg.includes('coordinates')) {
      // NOTE: AI simulator cannot produce unreadable faces; retained for
      // contract completeness with the future real gateway.
      return ERROR_CODE.AI_SERVICE_UNAVAILABLE;
    }
    return ERROR_CODE.AI_SERVICE_UNAVAILABLE;
  }

  private async summaryAggregates(userId: string): Promise<{
    totalAnalyses: number;
    bestScore: number;
    averageHydration: number;
    improvementPercentage: number;
    firstAnalysisDate: string | null;
    latestAnalysisDate: string | null;
  }> {
    const where: Prisma.SkinAnalysisWhereInput = {
      userId,
      analysisStatus: 'completed',
      healthScore: { not: null },
    };

    const [completed, best, avg] = await Promise.all([
      this.prisma.skinAnalysis.findMany({
        where,
        orderBy: { analysisDate: 'asc' },
        select: { healthScore: true, hydration: true, analysisDate: true },
      }),
      this.prisma.skinAnalysis.aggregate({
        where,
        _max: { healthScore: true },
      }),
      this.prisma.skinAnalysis.aggregate({
        where,
        _avg: { hydration: true },
      }),
    ]);

    const scores = completed.map((r) => r.healthScore ?? 0);
    const firstScore = scores.length > 0 ? scores[0] : 0;
    const latestScore = scores.length > 0 ? scores[scores.length - 1] : 0;
    const improvementPercentage =
      firstScore > 0 && scores.length > 1
        ? Math.round(((latestScore - firstScore) / firstScore) * 100)
        : 0;

    return {
      totalAnalyses: completed.length,
      bestScore: best._max.healthScore ?? 0,
      averageHydration: Math.round(avg._avg.hydration ?? 0),
      improvementPercentage,
      firstAnalysisDate:
        completed.length > 0 ? completed[0].analysisDate.toISOString() : null,
      latestAnalysisDate:
        completed.length > 0
          ? completed[completed.length - 1].analysisDate.toISOString()
          : null,
    };
  }

  private computeConditionChanges(
    scan1: { conditions: Array<{ conditionName: string; severity: string }> },
    scan2: { conditions: Array<{ conditionName: string; severity: string }> },
  ): ConditionChangeDto[] {
    const changes: ConditionChangeDto[] = [];
    const conditionNames: string[] = Object.values(ConditionName);
    for (const name of conditionNames) {
      const c1 = scan1.conditions.find((c) => c.conditionName === name);
      const c2 = scan2.conditions.find((c) => c.conditionName === name);
      if (!c1 && !c2) continue;
      const from = this.mapSeverity(c1?.severity ?? 'NONE');
      const to = this.mapSeverity(c2?.severity ?? 'NONE');
      const fromRank = SEVERITY_RANK[from];
      const toRank = SEVERITY_RANK[to];
      changes.push({
        conditionName: name as ConditionName,
        from,
        to,
        direction:
          toRank < fromRank
            ? 'IMPROVED'
            : toRank > fromRank
              ? 'REGRESSED'
              : 'STABLE',
      });
    }
    return changes;
  }

  private toAnalysisResultDto(record: AnalysisDetailRow): AnalysisResultDto {
    const conditions: ConditionDto[] = (record.conditions ?? []).map((c) => ({
      conditionId: c.id,
      conditionName: this.mapConditionName(c.conditionName),
      severity: this.mapSeverity(c.severity),
      severityScore: c.severityScore ?? 0,
      affectedArea: c.affectedArea ?? 'None',
      description: c.description ?? '',
    }));

    const findings: FindingDto[] = (record.findings ?? []).map((f) => ({
      findingId: f.id,
      findingType: f.findingType as FindingType,
      title: f.title,
      description: f.description,
      affectedArea: f.affectedArea ?? '',
      severity: this.mapSeverity(f.severity),
    }));

    const primaryConcerns = findings.filter(
      (f) => f.findingType === FindingType.PRIMARY,
    );
    const secondaryConcerns = findings.filter(
      (f) => f.findingType === FindingType.SECONDARY,
    );

    const recommendations: RecommendationDto[] = (
      record.recommendations ?? []
    ).map((r) => ({
      recommendationId: r.id,
      productId: r.productId,
      productType: r.productType ?? r.product?.category?.name ?? '',
      productName: r.productName ?? r.product?.name ?? '',
      reason: r.reason,
      priority: this.mapPriority(r.priority),
      isHelpful: r.feedback?.[0]?.isHelpful ?? null,
    }));

    return {
      analysisId: record.id,
      userId: record.userId,
      analysisDate:
        record.analysisDate?.toISOString?.() ?? new Date().toISOString(),
      status: this.mapStatus(record.analysisStatus),
      skinType: this.mapSkinType(record.skinType),
      skinAge: record.estimatedAge ?? 0,
      healthScore: record.healthScore ?? 0,
      hydration: record.hydration ?? 0,
      confidence: record.confidence ?? 0,
      facialScanUrl: record.imageUrl,
      conditions,
      findings: {
        primaryConcerns,
        secondaryConcerns,
        overallAssessment: record.overallAssessment ?? '',
      },
      recommendations,
      createdAt: record.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: record.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  private mapPriority(
    value: string | null | undefined,
  ): RecommendationPriority {
    const normalized = (value ?? 'MEDIUM').toUpperCase();
    return normalized in RecommendationPriority
      ? (normalized as RecommendationPriority)
      : RecommendationPriority.MEDIUM;
  }

  private currentUtcDate(): string {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }

  private utcStartOfToday(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }

  private endOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) +
        86_400_000 -
        1,
    );
  }

  private calendarDaysBetween(later: Date, earlier: Date): number {
    // Normalize both to UTC midnight and diff in whole days.
    const laterUtc = Date.UTC(
      later.getUTCFullYear(),
      later.getUTCMonth(),
      later.getUTCDate(),
    );
    const earlierUtc = Date.UTC(
      earlier.getUTCFullYear(),
      earlier.getUTCMonth(),
      earlier.getUTCDate(),
    );
    return Math.round((laterUtc - earlierUtc) / 86_400_000);
  }

  private secondsUntilUtcMidnight(): number {
    const now = new Date();
    const endUtc = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    );
    return Math.max(1, Math.floor((endUtc.getTime() - now.getTime()) / 1000));
  }

  private rangeCutoff(range: string): Date {
    const now = new Date();
    if (range === '30d') return new Date(now.getTime() - 30 * 86_400_000);
    if (range === '90d') return new Date(now.getTime() - 90 * 86_400_000);
    if (range === '1y') return new Date(now.getTime() - 365 * 86_400_000);
    return new Date(0);
  }

  private async invalidateHistorySummaryCache(userId: string): Promise<void> {
    const pattern = `skin:history:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // ─── Delete ─────────────────────────────────────────────────────────────

  async deleteAnalysis(
    userId: string,
    analysisId: string,
  ): Promise<{ deletedCount: number }> {
    const record = await this.prisma.skinAnalysis.findUnique({
      where: { id: analysisId },
      select: { id: true, userId: true },
    });

    if (!record) {
      throw new NotFoundException({
        errorCode: ERROR_CODE.NOT_FOUND,
        message: 'Analysis record not found.',
      });
    }

    if (record.userId !== userId) {
      throw new ForbiddenException({
        errorCode: ERROR_CODE.FORBIDDEN,
        message: 'You do not own this analysis record.',
      });
    }

    await this.prisma.skinAnalysis.delete({ where: { id: analysisId } });

    // Evict detail cache and history cache
    await this.redis.del(`skin:analysis:${analysisId}`);
    await this.invalidateHistorySummaryCache(userId);

    this.logger.log(`Analysis ${analysisId} deleted by user ${userId}`);
    return { deletedCount: 1 };
  }

  async deleteAnalyses(
    userId: string,
    ids: string[],
  ): Promise<{ deletedCount: number }> {
    if (!ids || ids.length === 0) {
      return { deletedCount: 0 };
    }

    // Only delete records that belong to this user
    const result = await this.prisma.skinAnalysis.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });

    // Evict detail caches for each deleted id
    await Promise.all(ids.map((id) => this.redis.del(`skin:analysis:${id}`)));
    await this.invalidateHistorySummaryCache(userId);

    this.logger.log(
      `Bulk delete: ${result.count} analyses deleted by user ${userId}`,
    );
    return { deletedCount: result.count };
  }
}
