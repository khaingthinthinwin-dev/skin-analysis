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
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService(mockPrisma as never);
    jest.clearAllMocks();
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
