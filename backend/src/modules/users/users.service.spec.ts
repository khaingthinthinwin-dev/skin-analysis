import { UsersService } from './users.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  user: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  shop: {
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService(mockPrisma as never);
    jest.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a user', async () => {
      mockPrisma.user.create.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
      });

      const result = await service.create({
        email: 'test@test.com',
        name: 'Test',
        passwordHash: 'hash',
      });

      expect(result.id).toBe('1');
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: '1', email: 'test@test.com' },
      ]);

      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return user with enriched fields', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: 'Test',
        roleCode: 'buyer',
        avatarUrl: null,
        merchantProfile: null,
      });

      const result = await service.findById('1');
      expect(result.id).toBe('1');
      expect(result.role).toBe('buyer');
      expect(result.licenseStatus).toBeNull();
    });

    it('should include merchant profile data', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'merchant@test.com',
        name: 'Merchant',
        roleCode: 'merchant',
        avatarUrl: '/avatar.jpg',
        merchantProfile: {
          licenseStatus: 'approved',
          businessLicenseUrl: '/license.pdf',
        },
      });

      const result = await service.findById('1');
      expect(result.licenseStatus).toBe('approved');
      expect(result.licenseUrl).toBe('/license.pdf');
      expect(result.avatar).toBe('/avatar.jpg');
    });

    it('should expose the shop address and phone for a merchant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'merchant@test.com',
        name: 'Merchant',
        roleCode: 'merchant',
        avatarUrl: null,
        phone: null,
        merchantProfile: null,
        shop: {
          name: 'Merchant',
          slug: 'merchant',
          address: '123 Yangon Street, Yangon',
          phone: '+95912345678',
          isApproved: false,
        },
      });

      const result = await service.findById('1');
      expect(result.address).toBe('123 Yangon Street, Yangon');
      expect(result.phone).toBe('+95912345678');
    });

    it('should return null address and phone when there is no shop row', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'buyer@test.com',
        name: 'Buyer',
        roleCode: 'buyer',
        avatarUrl: null,
        phone: null,
        merchantProfile: null,
        shop: null,
      });

      const result = await service.findById('1');
      expect(result.address).toBeNull();
      expect(result.phone).toBeNull();
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
      });

      const result = await service.findByEmail('test@test.com');
      expect(result).not.toBeNull();
      expect(result!.email).toBe('test@test.com');
    });

    it('should return null if not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.findByEmail('none@test.com');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        roleCode: 'buyer',
        avatarUrl: null,
        merchantProfile: null,
      });
      mockPrisma.user.update.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        name: 'Updated',
        roleCode: 'buyer',
        avatarUrl: null,
        merchantProfile: null,
      });

      const result = await service.update('1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should save address and phone on the shop row for a merchant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'merchant@test.com',
        roleCode: 'merchant',
        avatarUrl: null,
        phone: null,
        merchantProfile: null,
        shop: null,
      });
      mockPrisma.user.update.mockResolvedValue({
        id: '1',
        email: 'merchant@test.com',
        name: 'Merchant',
        roleCode: 'merchant',
        avatarUrl: null,
        phone: '+95999999999',
        merchantProfile: null,
        shop: {
          name: 'Merchant',
          slug: 'merchant',
          address: '456 Mandalay Road, Mandalay',
          phone: '+95999999999',
          isApproved: true,
        },
      });
      mockPrisma.shop.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.update('1', {
        phone: '+95999999999',
        address: '456 Mandalay Road, Mandalay',
      });

      expect(mockPrisma.shop.updateMany).toHaveBeenCalledWith({
        where: { userId: '1' },
        data: {
          address: '456 Mandalay Road, Mandalay',
          phone: '+95999999999',
        },
      });
      expect(result.address).toBe('456 Mandalay Road, Mandalay');
      expect(result.phone).toBe('+95999999999');
    });

    it('should clear shop address and phone when blank values are sent', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'merchant@test.com',
        roleCode: 'merchant',
        avatarUrl: null,
        phone: '+95999999999',
        merchantProfile: null,
        shop: null,
      });
      mockPrisma.user.update.mockResolvedValue({
        id: '1',
        email: 'merchant@test.com',
        name: 'Merchant',
        roleCode: 'merchant',
        avatarUrl: null,
        phone: null,
        merchantProfile: null,
        shop: null,
      });
      mockPrisma.shop.updateMany.mockResolvedValue({ count: 1 });

      await service.update('1', { phone: '', address: '   ' });

      expect(mockPrisma.shop.updateMany).toHaveBeenCalledWith({
        where: { userId: '1' },
        data: { address: null, phone: null },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { phone: null } }),
      );
    });

    it('should not touch the shop row when address and phone are absent', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: 'buyer@test.com',
        roleCode: 'buyer',
        avatarUrl: null,
        phone: null,
        merchantProfile: null,
        shop: null,
      });
      mockPrisma.user.update.mockResolvedValue({
        id: '1',
        email: 'buyer@test.com',
        name: 'Renamed',
        roleCode: 'buyer',
        avatarUrl: null,
        phone: null,
        merchantProfile: null,
        shop: null,
      });

      await service.update('1', { name: 'Renamed' });

      expect(mockPrisma.shop.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('updatePassword', () => {
    it('should update password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.user.update.mockResolvedValue({});

      await service.updatePassword('1', 'new-hash');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { passwordHash: 'new-hash' },
      });
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1' });
      mockPrisma.user.delete.mockResolvedValue({});

      await service.delete('1');
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });
});
