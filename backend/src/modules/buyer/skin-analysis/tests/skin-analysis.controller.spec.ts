/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types';
import { Response } from 'express';
import { SkinAnalysisController } from '../skin-analysis.controller';
import { SkinAnalysisService } from '../skin-analysis.service';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { TransformInterceptor } from '../../../../common/interceptors/transform.interceptor';
import { AnalysisStatus, SkinType } from '../types/skin-analysis.enums';

/**
 * Standalone guard faking only the token verification of the real
 * JwtAuthGuard (which requires a registered passport 'jwt' strategy that
 * only exists inside the full AppModule).
 */
@Injectable()
class MockJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<{ headers: any; user?: AuthUser }>();
    const auth = req.headers?.authorization as string | undefined;
    if (!auth) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const token = auth.replace('Bearer ', '');
    const payload = JSON.parse(
      Buffer.from(token, 'base64url').toString('utf8'),
    ) as AuthUser;
    req.user = {
      id: payload.id,
      email: payload.email,
      roleCode: payload.roleCode,
    };
    return true;
  }
}

const serviceMock = {
  uploadImage: jest.fn(),
  startAnalysis: jest.fn(),
  getLatest: jest.fn(),
  getAnalysisById: jest.fn(),
  getAnalysisHistory: jest.fn(),
  getTrends: jest.fn(),
  compareAnalyses: jest.fn(),
  exportReport: jest.fn(),
  exportHistoryReport: jest.fn(),
  updateRecommendationFeedback: jest.fn(),
};

function buyerToken(role = 'buyer') {
  return Buffer.from(
    JSON.stringify({
      id: '289c9a23-0d3b-4f9e-8d77-47ae410f2cc1',
      email: 'buyer@test.io',
      roleCode: role,
    }),
  ).toString('base64url');
}

describe('SkinAnalysisController', () => {
  let app: INestApplication;
  let server: App;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SkinAnalysisController],
      providers: [
        { provide: SkinAnalysisService, useValue: serviceMock },
        JwtAuthGuard,
        RolesGuard,
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(new MockJwtAuthGuard())
      .compile();

    app = module.createNestApplication({ logger: false });
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
    server = app.getHttpServer() as App;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('guards', () => {
    it('should return 401 Unauthorized without a JWT token (BR-SKIN-001)', async () => {
      const res = await request(server)
        .get('/skin-analysis/latest')
        .expect(401);
      expect(res.body.message).toContain('Invalid or expired token');
    });

    it('should return 403 Forbidden for admin/merchant roles (BR-SKIN-001)', async () => {
      const res = await request(server)
        .get('/skin-analysis/latest')
        .set('Authorization', `Bearer ${buyerToken('admin')}`)
        .expect(403);
      expect(res.body.message).toBe('Insufficient permissions');
    });
  });

  describe('validation', () => {
    it('should return 400 Bad Request (40004) for a malformed UUID', async () => {
      await request(server)
        .get('/skin-analysis/not-a-uuid')
        .set('Authorization', `Bearer ${buyerToken()}`)
        .expect(400);
    });
  });

  describe('endpoints', () => {
    it('GET /skin-analysis/latest should return the latest summary', async () => {
      serviceMock.getLatest.mockResolvedValue({
        analysisId: 'a1',
        analysisDate: '2026-01-10T00:00:00.000Z',
        healthScore: 85,
        hydration: 72,
        skinType: SkinType.OILY,
        skinAge: 27,
        remainingDailyQuota: 4,
      });

      const res = await request(server)
        .get('/skin-analysis/latest')
        .set('Authorization', `Bearer ${buyerToken()}`)
        .expect(200);

      expect(res.body.data.healthScore).toBe(85);
      expect(res.body.data.skinType).toBe(SkinType.OILY);
    });

    it('POST /skin-analysis/analyze should return 202 Accepted with analysisId', async () => {
      serviceMock.startAnalysis.mockResolvedValue({
        analysisId: 'a1',
        status: AnalysisStatus.PROCESSING,
        remainingDailyQuota: 4,
        estimatedWaitSeconds: 15,
      });

      const res = await request(server)
        .post('/skin-analysis/analyze')
        .send({ blobUrl: '/uploads/skin-scans/user/a1.png' })
        .set('Authorization', `Bearer ${buyerToken()}`)
        .expect(202);

      expect(res.body.data.analysisId).toBe('a1');
      expect(res.body.data.status).toBe(AnalysisStatus.PROCESSING);
    });

    it('GET /skin-analysis/:id/export should return PDF headers (BR-SKIN-014)', async () => {
      serviceMock.exportReport.mockImplementation(
        (_userId: string, _id: string, res: Response) => {
          res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition':
              'attachment; filename="skin-analysis-report.pdf"',
          });
          res.status(200).end('%PDF-1.4');
        },
      );

      const res = await request(server)
        .get('/skin-analysis/289c9a23-0d3b-4f9e-8d77-47ae410f2cc1/export')
        .set('Authorization', `Bearer ${buyerToken()}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('application/pdf');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      expect(res.body.toString('utf8')).toContain('%PDF');
    });

    it('POST /skin-analysis/recommendations/:id/feedback should record vote', async () => {
      serviceMock.updateRecommendationFeedback.mockResolvedValue({
        message: 'Feedback recorded successfully.',
      });

      await request(server)
        .post(
          '/skin-analysis/recommendations/289c9a23-0d3b-4f9e-8d77-47ae410f2cc1/feedback',
        )
        .send({ isHelpful: true })
        .set('Authorization', `Bearer ${buyerToken()}`)
        .expect(201);
    });
  });
});
