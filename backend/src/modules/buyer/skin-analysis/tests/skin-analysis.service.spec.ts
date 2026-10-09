/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { Response } from 'express';
import { SkinAnalysisService } from '../skin-analysis.service';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import { RedisService } from '../../../../shared/redis/redis.service';
import { AiGatewayService } from '../services/ai-gateway.service';
import { SkinScanStorageService } from '../services/skin-scan-storage.service';
import { PdfReportService } from '../services/pdf-report.service';
import { NotificationsService } from '../../../shared/notifications/notifications.service';
import {
  AnalysisStatus,
  ConditionName,
  ConditionSeverity,
  FindingType,
  SkinType,
  ERROR_CODE,
} from '../types/skin-analysis.enums';

function buildPng(width: number, height: number): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(21);
  ihdr.writeUInt32BE(13, 0); // IHDR length
  ihdr.write('IHDR', 4, 'ascii');
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr.writeUInt8(8, 16); // bit depth
  ihdr.writeUInt8(6, 17); // color type RGBA
  return Buffer.concat([sig, ihdr, Buffer.from([0x78])]);
}

function buildJpeg(width: number, height: number): Buffer {
  // FFD8 + direct SOF0 segment (no APP markers), padded to >= 24 bytes
  const body = Buffer.alloc(14 + 16);
  body.writeUInt8(0xff, 0);
  body.writeUInt8(0xd8, 1); // SOI
  body.writeUInt8(0xff, 2);
  body.writeUInt8(0xc0, 3); // SOF0
  body.writeUInt16BE(0x0011, 4); // segment length
  body.writeUInt8(8, 6); // precision
  body.writeUInt16BE(height, 7);
  body.writeUInt16BE(width, 9);
  body.writeUInt8(1, 11); // components
  body.writeUInt8(0x01, 12);
  body.writeUInt8(0xd9, 13); // EOI
  return body;
}

const mockPrisma = {
  skinAnalysis: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
  },
  skinAnalysisCondition: {
    create: jest.fn(),
  },
  skinAnalysisFinding: {
    create: jest.fn(),
  },
  skinAnalysisRecommendation: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  skinAnalysisFeedback: {
    upsert: jest.fn(),
  },
  product: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
  incr: jest.fn(),
  keys: jest.fn(),
  getClient: jest.fn(),
};

const mockAiGateway = {
  analyze: jest.fn(),
};

const mockStorage = {
  saveScan: jest.fn(),
  resolveLocalPath: jest.fn(),
  getContentType: jest.fn(),
};

const mockPdfReport = {
  buildReport: jest.fn(),
  buildHistoryReport: jest.fn(),
};

function makePayload(overrides: Partial<any> = {}) {
  return {
    skinType: SkinType.OILY,
    estimatedAge: 27,
    healthScore: 85,
    hydration: 72,
    confidence: 94,
    conditions: [
      {
        conditionName: ConditionName.ACNE,
        severity: ConditionSeverity.MILD,
        severityScore: 32,
        affectedArea: 'Cheeks',
        description: 'Mild acne present',
        confidence: 0.91,
      },
    ],
    findings: [
      {
        findingType: FindingType.PRIMARY,
        title: 'Mild Acne',
        description: 'Scattered lesions',
        affectedArea: 'Cheeks',
        severity: ConditionSeverity.MILD,
      },
    ],
    overallAssessment: 'Good overall health with mild acne.',
    ...overrides,
  };
}

function makeCompletedRecord(overrides: Partial<any> = {}) {
  return {
    id: 'analysis-1',
    userId: 'user-1',
    imageUrl: '/uploads/skin-scans/user-1/abc.jpg',
    analysisStatus: 'completed',
    analysisDate: new Date('2026-01-10T00:00:00Z'),
    completedAt: new Date('2026-01-10T00:01:00Z'),
    createdAt: new Date('2026-01-10T00:00:00Z'),
    updatedAt: new Date('2026-01-10T00:01:00Z'),
    healthScore: 85,
    hydration: 72,
    confidence: 94,
    skinType: 'oily',
    estimatedAge: 27,
    overallAssessment: 'Good overall health.',
    conditions: [
      {
        id: 'cond-1',
        conditionName: 'acne',
        severity: 'MILD',
        severityScore: 32,
        affectedArea: 'Cheeks',
        description: 'Mild acne present',
      },
    ],
    findings: [
      {
        id: 'find-1',
        findingType: 'PRIMARY',
        title: 'Mild Acne',
        description: 'Scattered lesions',
        affectedArea: 'Cheeks',
        severity: 'MILD',
      },
    ],
    recommendations: [
      {
        id: 'rec-1',
        analysisId: 'analysis-1',
        productId: 'prod-1',
        productName: 'Cleanser',
        productType: 'Skincare',
        priority: 'MEDIUM',
        reason: 'Gentle cleansing',
        matchScore: 78,
        displayOrder: 1,
        product: { name: 'Cleanser', category: { name: 'Skincare' } },
        feedback: [],
      },
    ],
    ...overrides,
  };
}

function makeCachedDto(overrides: Partial<any> = {}) {
  const rec = makeCompletedRecord();
  return {
    analysisId: rec.id,
    userId: rec.userId,
    analysisDate: rec.analysisDate.toISOString(),
    status: AnalysisStatus.COMPLETED,
    skinType: SkinType.OILY,
    skinAge: rec.estimatedAge,
    healthScore: rec.healthScore,
    hydration: rec.hydration,
    confidence: rec.confidence,
    facialScanUrl: rec.imageUrl,
    conditions: rec.conditions.map((c: any) => ({
      conditionId: c.id,
      conditionName: c.conditionName,
      severity: c.severity,
      severityScore: c.severityScore,
      affectedArea: c.affectedArea,
      description: c.description,
    })),
    findings: {
      primaryConcerns: [],
      secondaryConcerns: [],
      overallAssessment: rec.overallAssessment,
    },
    recommendations: [],
    createdAt: rec.createdAt.toISOString(),
    updatedAt: rec.updatedAt.toISOString(),
    ...overrides,
  };
}

describe('SkinAnalysisService', () => {
  let service: SkinAnalysisService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedis.getClient.mockReturnValue({
      decr: jest.fn().mockResolvedValue(0),
    });
    mockPrisma.skinAnalysis.update.mockResolvedValue({});
    mockPrisma.skinAnalysisCondition.create.mockResolvedValue({});
    mockPrisma.skinAnalysisFinding.create.mockResolvedValue({});
    mockPrisma.skinAnalysisRecommendation.create.mockResolvedValue({});
    mockStorage.resolveLocalPath.mockReturnValue(null);

    const mockNotifications = {
      create: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkinAnalysisService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: AiGatewayService, useValue: mockAiGateway },
        { provide: SkinScanStorageService, useValue: mockStorage },
        { provide: PdfReportService, useValue: mockPdfReport },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<SkinAnalysisService>(SkinAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadImage', () => {
    const user = 'user-1';

    it('should accept a valid JPG with consent and return metadata', async () => {
      mockStorage.saveScan.mockReturnValue({
        blobUrl: '/uploads/skin-scans/user-1/a.jpg',
        metadata: {
          format: 'jpeg',
          contentType: 'image/jpeg',
          width: 800,
          height: 600,
        },
        fileSize: 2048,
      });

      const result = await service.uploadImage(
        {
          buffer: buildJpeg(800, 600),
          originalname: 'face.jpg',
          mimetype: 'image/jpeg',
          size: 2048,
        },
        true,
        user,
      );

      expect(result.blobUrl).toContain('/uploads/skin-scans/user-1/');
      expect(result.contentType).toBe('image/jpeg');
      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('should reject when consent is missing (40003)', async () => {
      await expect(
        service.uploadImage(
          {
            buffer: buildJpeg(800, 600),
            originalname: 'face.jpg',
            mimetype: 'image/jpeg',
            size: 2048,
          },
          false,
          user,
        ),
      ).rejects.toMatchObject({
        response: { errorCode: ERROR_CODE.CONSENT_MISSING },
      });
    });

    it('should reject files over 10MB (40002)', async () => {
      const big = Buffer.alloc(10 * 1024 * 1024 + 1);
      await expect(
        service.uploadImage(
          {
            buffer: big,
            originalname: 'big.jpg',
            mimetype: 'image/jpeg',
            size: big.length,
          },
          true,
          user,
        ),
      ).rejects.toMatchObject({
        response: { errorCode: ERROR_CODE.FILE_SIZE_EXCEEDED },
      });
    });

    it('should reject invalid formats such as gif or text (40001)', async () => {
      await expect(
        service.uploadImage(
          {
            buffer: Buffer.from('plain text'),
            originalname: 'x.txt',
            mimetype: 'text/plain',
            size: 10,
          },
          true,
          user,
        ),
      ).rejects.toMatchObject({
        response: { errorCode: ERROR_CODE.INVALID_IMAGE_FORMAT },
      });
    });

    it('should accept low-resolution scan (<640x480) but log a warning (BR-SKIN-004)', async () => {
      mockStorage.saveScan.mockReturnValue({
        blobUrl: '/uploads/skin-scans/user-1/low.png',
        metadata: {
          format: 'png',
          contentType: 'image/png',
          width: 320,
          height: 240,
        },
        fileSize: 512,
      });
      const warn = jest
        .spyOn(service['logger'], 'warn')
        .mockImplementation(() => {});

      const result = await service.uploadImage(
        {
          buffer: buildPng(320, 240),
          originalname: 'low.png',
          mimetype: 'image/png',
          size: 512,
        },
        true,
        user,
      );

      expect(result.width).toBe(320);
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('startAnalysis', () => {
    const user = 'user-1';
    const blobUrl = '/uploads/skin-scans/user-1/abc.jpg';

    it('should run analysis when within daily quota and return analysisId', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockPrisma.skinAnalysis.create.mockResolvedValue({
        id: 'analysis-1',
        analysisStatus: 'processing',
      });
      mockStorage.resolveLocalPath.mockReturnValue(null);
      mockAiGateway.analyze.mockResolvedValue(makePayload());
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        async (cb: (tx: typeof mockPrisma) => Promise<any>) => cb(mockPrisma),
      );
      mockPrisma.skinAnalysis.findUnique.mockResolvedValue(
        makeCompletedRecord(),
      );
      mockRedis.keys.mockResolvedValue([]);

      const result = await service.startAnalysis(user, blobUrl);

      expect(result.analysisId).toBe('analysis-1');
      expect(result.status).toBe(AnalysisStatus.PROCESSING);
      expect(result.remainingDailyQuota).toBe(4);
      expect(result.estimatedWaitSeconds).toBeGreaterThan(0);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'skin:analysis:analysis-1',
        expect.any(String),
        300,
      );
    });

    it('should reject invalid blobUrl', async () => {
      await expect(
        service.startAnalysis(user, 'not-a-url'),
      ).rejects.toMatchObject({
        response: { message: expect.stringContaining('blobUrl') },
      });
    });

    it('should throw 429 (42901) when quota exceeded (6th scan)', async () => {
      mockRedis.incr.mockResolvedValue(6);

      await expect(service.startAnalysis(user, blobUrl)).rejects.toMatchObject({
        response: { errorCode: ERROR_CODE.DAILY_QUOTA_EXCEEDED },
      });
    });

    it('should fail the record and rollback quota when AI gateway times out', async () => {
      mockRedis.incr.mockResolvedValue(1);
      mockPrisma.skinAnalysis.create.mockResolvedValue({
        id: 'analysis-1',
        analysisStatus: 'processing',
      });
      mockStorage.resolveLocalPath.mockReturnValue(null);
      mockAiGateway.analyze.mockRejectedValue(
        new Error('AI gateway timed out.'),
      );
      mockRedis.keys.mockResolvedValue([]);

      const update = mockPrisma.skinAnalysis.update.mockResolvedValue({});
      const decr = jest.fn().mockResolvedValue(undefined);
      mockRedis.getClient.mockReturnValue({ decr });

      await expect(service.startAnalysis(user, blobUrl)).rejects.toThrow(
        InternalServerErrorException,
      );
      // record marked FAILED
      const updateCall = update.mock.calls[0][0];
      expect(updateCall.data.analysisStatus).toBe('failed');
      // quota decremented
      expect(decr).toHaveBeenCalled();
    });
  });

  describe('getAnalysisById', () => {
    const user = 'user-1';

    it('should return cached analysis on cache hit', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(makeCachedDto()));

      const result = await service.getAnalysisById(user, 'analysis-1');

      expect(result.analysisId).toBe('analysis-1');
      expect(mockPrisma.skinAnalysis.findUnique).not.toHaveBeenCalled();
    });

    it('should populate cache on DB hit', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.skinAnalysis.findUnique.mockResolvedValue(
        makeCompletedRecord(),
      );

      const result = await service.getAnalysisById(user, 'analysis-1');

      expect(result.analysisId).toBe('analysis-1');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'skin:analysis:analysis-1',
        expect.any(String),
        300,
      );
    });

    it('should throw 403 (40301) when accessing another buyers scan', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.skinAnalysis.findUnique.mockResolvedValue(
        makeCompletedRecord({ userId: 'other-user' }),
      );

      await expect(
        service.getAnalysisById(user, 'analysis-1'),
      ).rejects.toMatchObject({
        response: { errorCode: ERROR_CODE.FORBIDDEN },
      });
    });

    it('should throw 404 (40401) when analysis does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.skinAnalysis.findUnique.mockResolvedValue(null);

      await expect(
        service.getAnalysisById(user, 'missing'),
      ).rejects.toMatchObject({
        response: { errorCode: ERROR_CODE.NOT_FOUND },
      });
    });
  });

  describe('getAnalysisHistory', () => {
    const user = 'user-1';
    const base = {
      id: 'a',
      analysisDate: new Date('2026-01-01T00:00:00Z'),
      healthScore: 70,
      hydration: 60,
      skinType: 'oily',
      estimatedAge: 28,
      analysisStatus: 'completed',
    };

    // getAnalysisHistory call order:
    // 1. findMany (page rows) 2. count 3. findMany (summary rows)
    // 4. aggregate (max) 5. aggregate (avg)
    it('should order items by analysisDate DESC (BR-SKIN-011)', async () => {
      mockPrisma.skinAnalysis.findMany
        .mockResolvedValueOnce([
          { ...base, id: 'a2', analysisDate: new Date('2026-01-05T00:00:00Z') },
          { ...base, id: 'a1', analysisDate: new Date('2026-01-01T00:00:00Z') },
        ])
        .mockResolvedValueOnce([
          { ...base, id: 'a1', analysisDate: new Date('2026-01-01T00:00:00Z') },
          { ...base, id: 'a2', analysisDate: new Date('2026-01-05T00:00:00Z') },
        ]);
      mockPrisma.skinAnalysis.count.mockResolvedValue(2);
      mockPrisma.skinAnalysis.aggregate
        .mockResolvedValueOnce({ _max: { healthScore: 82 } })
        .mockResolvedValueOnce({ _avg: { hydration: 66 } });

      const result = await service.getAnalysisHistory(user, {});

      expect(result.items[0].analysisId).toBe('a2');
      expect(result.items[1].analysisId).toBe('a1');
      expect(result.meta.totalItems).toBe(2);
    });

    it('should calculate summary KPIs', async () => {
      const row = (id: string, score: number, hyd: number, d: string) => ({
        id,
        analysisDate: new Date(d),
        healthScore: score,
        hydration: hyd,
        skinType: 'oily',
        estimatedAge: 28,
        analysisStatus: 'completed',
      });
      mockPrisma.skinAnalysis.findMany
        .mockResolvedValueOnce([
          row('a1', 70, 60, '2026-01-01T00:00:00Z'),
          row('a2', 90, 80, '2026-01-10T00:00:00Z'),
        ])
        .mockResolvedValueOnce([
          row('a1', 70, 60, '2026-01-01T00:00:00Z'),
          row('a2', 90, 80, '2026-01-10T00:00:00Z'),
        ]);
      mockPrisma.skinAnalysis.count.mockResolvedValue(2);
      mockPrisma.skinAnalysis.aggregate
        .mockResolvedValueOnce({ _max: { healthScore: 90 } })
        .mockResolvedValueOnce({ _avg: { hydration: 70 } });

      const result = await service.getAnalysisHistory(user, {});

      expect(result.summary.totalAnalyses).toBe(2);
      expect(result.summary.bestScore).toBe(90);
      expect(result.summary.averageHydration).toBe(70);
      expect(result.summary.improvementPercentage).toBe(29);
    });
  });

  describe('getTrends', () => {
    const user = 'user-1';
    const row = (id: string, score: number, hyd: number, d: string) => ({
      id,
      analysisDate: new Date(d),
      healthScore: score,
      hydration: hyd,
    });

    it('should return minPointsMet false with fewer than 2 analyses (BR-SKIN-013)', async () => {
      mockPrisma.skinAnalysis.findMany.mockResolvedValue([
        row('a1', 70, 60, '2026-01-01T00:00:00Z'),
      ]);

      const result = await service.getTrends(user, 'all');

      expect(result.minPointsMet).toBe(false);
      expect(result.healthScoreTrend).toEqual([]);
      expect(result.hydrationTrend).toEqual([]);
    });

    it('should return ordered time series when >= 2 analyses', async () => {
      mockPrisma.skinAnalysis.findMany.mockResolvedValue([
        row('a1', 70, 60, '2026-01-01T00:00:00Z'),
        row('a2', 82, 71, '2026-01-10T00:00:00Z'),
      ]);

      const result = await service.getTrends(user, 'all');

      expect(result.minPointsMet).toBe(true);
      expect(result.healthScoreTrend.map((p) => p.value)).toEqual([70, 82]);
      expect(result.hydrationTrend.map((p) => p.value)).toEqual([60, 71]);
      expect(result.healthScoreTrend[0].date).toBe('2026-01-01');
    });
  });

  describe('compareAnalyses', () => {
    const user = 'user-1';
    const completed = (
      id: string,
      score: number,
      hyd: number,
      age: number,
      d: string,
    ) => ({
      id,
      userId: user,
      analysisStatus: 'completed',
      analysisDate: new Date(d),
      healthScore: score,
      hydration: hyd,
      estimatedAge: age,
      conditions: [
        { conditionName: 'acne', severity: 'MILD' },
        { conditionName: 'dryness', severity: 'NONE' },
      ],
    });

    it('should reject identical analysis ids (40005)', async () => {
      await expect(
        service.compareAnalyses(user, 'same', 'same'),
      ).rejects.toMatchObject({
        response: { errorCode: ERROR_CODE.IDENTICAL_IDS },
      });
    });

    it('should compute deltas and condition shifts', async () => {
      mockPrisma.skinAnalysis.findUnique.mockResolvedValueOnce(
        completed('a1', 70, 60, 30, '2026-01-01T00:00:00Z'),
      );
      mockPrisma.skinAnalysis.findUnique.mockResolvedValueOnce(
        completed('a2', 88, 75, 27, '2026-01-15T00:00:00Z'),
      );

      const result = await service.compareAnalyses(user, 'a1', 'a2');

      expect(result.analysis1.id).toBe('a1');
      expect(result.analysis2.id).toBe('a2');
      expect(result.scoreDelta).toBe(18);
      expect(result.hydrationDelta).toBe(15);
      expect(result.ageDelta).toBe(-3);
      expect(result.daysBetween).toBe(14);
      const acne = result.conditionChanges.find(
        (c) => c.conditionName === ConditionName.ACNE,
      );
      expect(acne).toBeDefined();
    });
  });

  describe('updateRecommendationFeedback', () => {
    const user = 'user-1';

    it('should upsert feedback for a recommendation owned by the buyer', async () => {
      mockPrisma.skinAnalysisRecommendation.findUnique.mockResolvedValue({
        id: 'rec-1',
        analysis: { userId: user, id: 'analysis-1' },
      });
      mockPrisma.skinAnalysisFeedback.upsert.mockResolvedValue({});
      mockRedis.get.mockResolvedValue(null);
      mockRedis.keys.mockResolvedValue([]);

      const result = await service.updateRecommendationFeedback(
        user,
        'rec-1',
        true,
      );

      expect(result.message).toBe('Feedback recorded successfully.');
      expect(mockPrisma.skinAnalysisFeedback.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { recommendationId: 'rec-1', userId: user, isHelpful: true },
        }),
      );
    });

    it('should throw 403 (40301) if the recommendation belongs to another user', async () => {
      mockPrisma.skinAnalysisRecommendation.findUnique.mockResolvedValue({
        id: 'rec-1',
        analysis: { userId: 'other-user' },
      });

      await expect(
        service.updateRecommendationFeedback(user, 'rec-1', true),
      ).rejects.toMatchObject({
        response: { errorCode: ERROR_CODE.FORBIDDEN },
      });
    });
  });

  describe('exportReport / exportHistoryReport', () => {
    it('should stream the single-analysis report as a PDF (BR-SKIN-014)', async () => {
      const user = 'user-1';
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.skinAnalysis.findUnique.mockResolvedValue(
        makeCompletedRecord(),
      );
      // resolveLocalPath is synchronous; leave as null (null => no scan image embedded)
      mockPdfReport.buildReport.mockResolvedValue(Buffer.from('%PDF-1.4'));

      const res = {
        set: jest.fn(),
        status: jest.fn().mockReturnThis(),
        end: jest.fn(),
      } as unknown as Response;

      await service.exportReport(user, 'analysis-1', res);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({ 'Content-Type': 'application/pdf' }),
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.status).toHaveBeenCalledWith(200);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.end).toHaveBeenCalled();
    });

    it('should stream full history report as a PDF', async () => {
      const user = 'user-1';
      const row = {
        id: 'a1',
        analysisDate: new Date('2026-01-01T00:00:00Z'),
        healthScore: 70,
        hydration: 60,
        skinType: 'oily',
        estimatedAge: 28,
        analysisStatus: 'completed',
      };
      mockPrisma.skinAnalysis.findMany
        .mockResolvedValueOnce([row])
        .mockResolvedValueOnce([row]);
      mockPrisma.skinAnalysis.aggregate
        .mockResolvedValueOnce({ _max: { healthScore: 70 } })
        .mockResolvedValueOnce({ _avg: { hydration: 60 } });
      mockPdfReport.buildHistoryReport.mockResolvedValue(
        Buffer.from('%PDF-1.4'),
      );

      const res = {
        set: jest.fn(),
        status: jest.fn().mockReturnThis(),
        end: jest.fn(),
      } as unknown as Response;

      await service.exportHistoryReport(user, res);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.set).toHaveBeenCalledWith(
        expect.objectContaining({ 'Content-Type': 'application/pdf' }),
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(res.end).toHaveBeenCalled();
    });
  });
});
