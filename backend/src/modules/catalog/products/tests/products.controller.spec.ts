import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductsController } from '../products.controller';
import { ProductsService } from '../products.service';
import { RequireApprovedMerchantGuard } from '../../../auth/guards/require-approved-merchant.guard';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: Record<string, jest.Mock>;

  const mockUser: AuthUser = {
    id: 'user-1',
    email: 'merchant@test.com',
    roleCode: 'merchant',
  };

  const mockProduct = {
    id: 'prod-1',
    merchantId: 'merchant-1',
    name: 'Hydrating Serum',
    slug: 'hydrating-serum',
    shortDescription: 'Serum',
    description: 'Detailed description',
    price: 29.99,
    compareAtPrice: 39.99,
    sku: 'HS-001',
    stockQuantity: 50,
    lowStockThreshold: 10,
    images: [],
    skinTypes: [],
    ingredients: [],
    tags: [],
    isActive: true,
    isFeatured: false,
    avgRating: 0,
    reviewCount: 0,
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Skincare', slug: 'skincare' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findBySlug: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStock: jest.fn(),
      toggleStatus: jest.fn(),
      toggleFeatured: jest.fn(),
      remove: jest.fn(),
      hardDelete: jest.fn(),
      bulkUpdateStatus: jest.fn(),
      bulkDelete: jest.fn(),
      deleteAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: service }],
    })
      .overrideGuard(RequireApprovedMerchantGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  describe('GET /products', () => {
    it('calls findAll and returns products', async () => {
      service.findAll.mockResolvedValue({ items: [mockProduct], meta: {} });
      const result = await controller.findAll(mockUser, {});
      expect(result.items).toHaveLength(1);
      expect(service.findAll).toHaveBeenCalledWith('user-1', {});
    });
  });

  describe('GET /products/slug/:slug', () => {
    it('calls findBySlug and returns product', async () => {
      service.findBySlug.mockResolvedValue(mockProduct);
      const result = await controller.findBySlug('hydrating-serum', mockUser);
      expect(result.slug).toBe('hydrating-serum');
    });

    it('throws NotFoundException for invalid slug', async () => {
      service.findBySlug.mockRejectedValue(new NotFoundException());
      await expect(controller.findBySlug('bad-slug', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('GET /products/:id', () => {
    it('calls findById and returns product', async () => {
      service.findById.mockResolvedValue(mockProduct);
      const result = await controller.findOne('prod-1', mockUser);
      expect(result.id).toBe('prod-1');
    });

    it('throws NotFoundException for non-existent product', async () => {
      service.findById.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne('bad-id', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('POST /products', () => {
    it('calls create and returns product', async () => {
      service.create.mockResolvedValue(mockProduct);
      const result = await controller.create(
        mockUser,
        {
          name: 'Hydrating Serum',
          shortDescription: 'Serum',
          description: 'Description',
          categoryId: 'cat-1',
          price: 29.99,
          compareAtPrice: 39.99,
          stockQuantity: 50,
        },
        [],
      );
      expect(result.name).toBe('Hydrating Serum');
    });

    it('passes image URLs to service', async () => {
      service.create.mockResolvedValue(mockProduct);
      const files = [
        { filename: 'img1.jpg' } as Express.Multer.File,
        { filename: 'img2.jpg' } as Express.Multer.File,
      ];
      await controller.create(
        mockUser,
        {
          name: 'Test',
          shortDescription: 'Test',
          description: 'Test',
          categoryId: 'cat-1',
          price: 10,
          compareAtPrice: 15,
          stockQuantity: 5,
        },
        files,
      );
      expect(service.create).toHaveBeenCalledWith('user-1', expect.anything(), [
        '/uploads/products/img1.jpg',
        '/uploads/products/img2.jpg',
      ]);
    });

    it('throws ConflictException for SKU conflict', async () => {
      service.create.mockRejectedValue(new ConflictException());
      await expect(
        controller.create(
          mockUser,
          {
            name: 'Test',
            shortDescription: 'Test',
            description: 'Test',
            categoryId: 'cat-1',
            sku: 'TAKEN',
            price: 10,
            compareAtPrice: 15,
            stockQuantity: 5,
          },
          [],
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('PATCH /products/:id', () => {
    it('calls update and returns product', async () => {
      service.update.mockResolvedValue({ ...mockProduct, name: 'Updated' });
      const result = await controller.update(
        'prod-1',
        mockUser,
        { name: 'Updated' },
        [],
      );
      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundException for non-existent product', async () => {
      service.update.mockRejectedValue(new NotFoundException());
      await expect(
        controller.update('bad-id', mockUser, { name: 'Test' }, []),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH /products/:id/stock', () => {
    it('calls updateStock and returns updated stock', async () => {
      service.updateStock.mockResolvedValue({
        ...mockProduct,
        stockQuantity: 100,
      });
      const result = await controller.updateStock('prod-1', mockUser, {
        stockQuantity: 100,
      });
      expect(result.stockQuantity).toBe(100);
    });

    it('throws NotFoundException for non-existent product', async () => {
      service.updateStock.mockRejectedValue(new NotFoundException());
      await expect(
        controller.updateStock('bad-id', mockUser, { stockQuantity: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH /products/:id/toggle', () => {
    it('calls toggleStatus', async () => {
      service.toggleStatus.mockResolvedValue({
        ...mockProduct,
        isActive: false,
      });
      const result = await controller.toggleStatus('prod-1', mockUser);
      expect(result.isActive).toBe(false);
    });

    it('throws NotFoundException for non-existent product', async () => {
      service.toggleStatus.mockRejectedValue(new NotFoundException());
      await expect(controller.toggleStatus('bad-id', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PATCH /products/:id/toggle-featured', () => {
    it('calls toggleFeatured', async () => {
      service.toggleFeatured.mockResolvedValue({
        id: 'prod-1',
        isFeatured: true,
      });
      const result = await controller.toggleFeatured('prod-1', mockUser);
      expect(result.isFeatured).toBe(true);
    });

    it('throws NotFoundException for non-existent product', async () => {
      service.toggleFeatured.mockRejectedValue(new NotFoundException());
      await expect(
        controller.toggleFeatured('bad-id', mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /products/:id', () => {
    it('calls remove (soft delete)', async () => {
      service.remove.mockResolvedValue(undefined);
      await expect(
        controller.remove('prod-1', mockUser),
      ).resolves.toBeUndefined();
    });

    it('throws NotFoundException for non-existent product', async () => {
      service.remove.mockRejectedValue(new NotFoundException());
      await expect(controller.remove('bad-id', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException for product with active orders', async () => {
      service.remove.mockRejectedValue(new ConflictException());
      await expect(controller.remove('prod-1', mockUser)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('DELETE /products/:id/hard', () => {
    it('calls hardDelete', async () => {
      service.hardDelete.mockResolvedValue({
        message: 'Product permanently deleted',
      });
      const result = await controller.hardRemove('prod-1', mockUser);
      expect(result.message).toBe('Product permanently deleted');
    });

    it('throws NotFoundException for non-existent product', async () => {
      service.hardDelete.mockRejectedValue(new NotFoundException());
      await expect(controller.hardRemove('bad-id', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PATCH /products/bulk', () => {
    it('calls bulkUpdateStatus', async () => {
      service.bulkUpdateStatus.mockResolvedValue({ updated: 3 });
      const result = await controller.bulkUpdateStatus(mockUser, {
        ids: ['p1', 'p2', 'p3'],
        action: 'activate',
      });
      expect(result.updated).toBe(3);
    });

    it('throws NotFoundException when some products not found', async () => {
      service.bulkUpdateStatus.mockRejectedValue(new NotFoundException());
      await expect(
        controller.bulkUpdateStatus(mockUser, {
          ids: ['p1', 'p2'],
          action: 'activate',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /products/bulk-delete', () => {
    it('calls bulkDelete', async () => {
      service.bulkDelete.mockResolvedValue({ deleted: 2 });
      const result = await controller.bulkDelete(mockUser, {
        ids: ['p1', 'p2'],
      });
      expect(result.deleted).toBe(2);
    });

    it('throws ConflictException for products with active orders', async () => {
      service.bulkDelete.mockRejectedValue(new ConflictException());
      await expect(
        controller.bulkDelete(mockUser, { ids: ['p1', 'p2'] }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('DELETE /products/all', () => {
    it('calls deleteAll', async () => {
      service.deleteAll.mockResolvedValue({
        deactivated: 3,
        deleted: 2,
        skipped: 0,
      });
      const result = await controller.deleteAll(mockUser, {});
      expect(result.deactivated).toBe(3);
      expect(result.deleted).toBe(2);
    });
  });
});
