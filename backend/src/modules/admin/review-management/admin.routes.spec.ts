import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

const ADMIN = { id: 'admin-1', email: 'admin@example.com', roleCode: 'admin' };

const serviceMock = {
  getReviews: jest.fn().mockResolvedValue({ items: [] }),
  getReviewById: jest.fn().mockResolvedValue({ id: 'r1' }),
  moderateReview: jest.fn().mockResolvedValue({ id: 'r1', status: 'approved' }),
  reportReview: jest.fn().mockResolvedValue({ id: 'rp1' }),
  deleteReview: jest.fn().mockResolvedValue(undefined),
  bulkModerateReviews: jest
    .fn()
    .mockResolvedValue({ processed: 2, failed: 0, results: [] }),
  bulkDeleteReviews: jest
    .fn()
    .mockResolvedValue({ processed: 2, failed: 0, results: [] }),
  getProducts: jest.fn().mockResolvedValue({ items: [] }),
  getProductById: jest.fn().mockResolvedValue({ id: 'p1' }),
  moderateProduct: jest.fn().mockResolvedValue({ id: 'p1', isActive: true }),
  bulkModerateProducts: jest
    .fn()
    .mockResolvedValue({ processed: 2, failed: 0, results: [] }),
};

describe('AdminController HTTP routing', () => {
  let app: INestApplication;
  let server: App;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: serviceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: {
          switchToHttp: () => { getRequest: () => Record<string, unknown> };
        }) => {
          ctx.switchToHttp().getRequest().user = ADMIN;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    // Mirrors main.ts so DTO validation is exercised exactly as in production.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    server = app.getHttpServer() as App;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes DELETE /admin/reviews/bulk to bulkDeleteReviews, not deleteReview', async () => {
    await request(server)
      .delete('/api/v1/admin/reviews/bulk')
      .send({ ids: ['r1', 'r2'] })
      .expect(200);

    expect(serviceMock.bulkDeleteReviews).toHaveBeenCalledWith(
      { ids: ['r1', 'r2'] },
      ADMIN.id,
    );
    expect(serviceMock.deleteReview).not.toHaveBeenCalled();
  });

  it('routes PATCH /admin/content/bulk/status to bulkModerateProducts, not moderateProduct', async () => {
    await request(server)
      .patch('/api/v1/admin/content/bulk/status')
      .send({ ids: ['p1', 'p2'], isActive: false, reason: 'violates policy' })
      .expect(200);

    expect(serviceMock.bulkModerateProducts).toHaveBeenCalledWith(
      { ids: ['p1', 'p2'], isActive: false, reason: 'violates policy' },
      ADMIN.id,
    );
    expect(serviceMock.moderateProduct).not.toHaveBeenCalled();
  });

  it('routes POST /admin/reviews/bulk/moderate to bulkModerateReviews', async () => {
    await request(server)
      .post('/api/v1/admin/reviews/bulk/moderate')
      .send({ ids: ['r1', 'r2'], action: 'approve' })
      .expect(201);

    expect(serviceMock.bulkModerateReviews).toHaveBeenCalledWith(
      { ids: ['r1', 'r2'], action: 'approve' },
      ADMIN.id,
    );
    expect(serviceMock.moderateReview).not.toHaveBeenCalled();
  });

  it('routes PATCH /admin/content/:id/status to moderateProduct for a real id', async () => {
    await request(server)
      .patch('/api/v1/admin/content/p1/status')
      .send({ isActive: false, reason: 'violates policy' })
      .expect(200);

    expect(serviceMock.moderateProduct).toHaveBeenCalledWith(
      'p1',
      { isActive: false, reason: 'violates policy' },
      ADMIN.id,
    );
  });

  it('routes POST /admin/reviews/:id/moderate to moderateReview for a real id', async () => {
    await request(server)
      .post('/api/v1/admin/reviews/r1/moderate')
      .send({ action: 'approve' })
      .expect(201);

    expect(serviceMock.moderateReview).toHaveBeenCalledWith(
      'r1',
      { action: 'approve' },
      ADMIN.id,
    );
  });

  it('routes DELETE /admin/reviews/:id to deleteReview for a real id', async () => {
    await request(server).delete('/api/v1/admin/reviews/r1').expect(204);

    expect(serviceMock.deleteReview).toHaveBeenCalledWith('r1', ADMIN.id);
  });
});
