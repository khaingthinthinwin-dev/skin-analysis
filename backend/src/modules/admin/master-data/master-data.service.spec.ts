import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MasterDataService } from './master-data.service';

interface MockModel {
  findMany: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
}

interface MockPrisma {
  userRole: MockModel;
  orderStatus: MockModel;
  discountType: MockModel;
  category: MockModel;
  auditLog: MockModel;
  $transaction: jest.Mock;
}

const mockPrisma: MockPrisma = {
  userRole: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  orderStatus: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  discountType: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  category: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

const prismaP2002 = (): Error => {
  const error = Object.create(
    Prisma.PrismaClientKnownRequestError.prototype,
  ) as Error & { code: string };
  error.code = 'P2002';
  error.message = 'Unique constraint failed';
  return error;
};

describe('MasterDataService', () => {
  let service: MasterDataService;

  beforeEach(() => {
    service = new MasterDataService(mockPrisma as never);
    mockPrisma.$transaction.mockImplementation(
      async (fn: (tx: MockPrisma) => Promise<unknown>) => fn(mockPrisma),
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('list', () => {
    it('returns user roles', async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([{ id: 1 }]);

      const result = await service.list('user-roles');

      expect(result).toEqual([{ id: 1 }]);
      expect(mockPrisma.userRole.findMany).toHaveBeenCalled();
    });

    it('returns order statuses ordered by display order', async () => {
      mockPrisma.orderStatus.findMany.mockResolvedValue([{ id: 1 }]);

      await service.list('order-statuses');

      const call = mockPrisma.orderStatus.findMany.mock.calls[0] as never[];
      const opts = call[0] as { orderBy: { displayOrder: string }[] };
      expect(opts.orderBy[0].displayOrder).toBe('asc');
    });

    it('returns categories with parent relation', async () => {
      mockPrisma.category.findMany.mockResolvedValue([{ id: 'c1' }]);

      await service.list('categories');

      const call = mockPrisma.category.findMany.mock.calls[0] as never[];
      const opts = call[0] as { include: { parent: boolean } };
      expect(opts.include.parent).toBeDefined();
    });

    it('rejects an unknown type', async () => {
      await expect(service.list('ad-placements')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('create', () => {
    it('rejects create for non category types', async () => {
      await expect(
        service.create('user-roles', { name: 'admin' }, 'admin-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a category and writes an audit log', async () => {
      mockPrisma.category.create.mockResolvedValue({
        id: 'c1',
        name: 'Red Lipsticks',
        slug: 'red-lipsticks',
      });

      const result = await service.create(
        'categories',
        { name: 'Red Lipsticks' },
        'admin-1',
      );

      const call = mockPrisma.category.create.mock.calls[0] as never[];
      const opts = call[0] as { data: { name: string; slug: string } };
      expect(opts.data.name).toBe('Red Lipsticks');
      expect(opts.data.slug).toBe('red-lipsticks');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
      expect(result.slug).toBe('red-lipsticks');
    });

    it('keeps a provided slug', async () => {
      mockPrisma.category.create.mockResolvedValue({ id: 'c1' });

      await service.create(
        'categories',
        { name: 'Red Lipsticks', slug: 'custom-slug' },
        'admin-1',
      );

      const call = mockPrisma.category.create.mock.calls[0] as never[];
      const opts = call[0] as { data: { slug: string } };
      expect(opts.data.slug).toBe('custom-slug');
    });

    it('maps a duplicate slug to a conflict', async () => {
      mockPrisma.category.create.mockRejectedValue(prismaP2002());

      await expect(
        service.create(
          'categories',
          { name: 'Red Lipsticks', slug: 'taken' },
          'admin-1',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  it('does not expose an update method', () => {
    expect(service).not.toHaveProperty('update');
  });
});
