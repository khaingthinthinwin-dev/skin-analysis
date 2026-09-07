import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const mockUsersService = {
  findById: jest.fn(),
  update: jest.fn(),
  findAll: jest.fn(),
  delete: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return current user profile', async () => {
      mockUsersService.findById.mockResolvedValue({
        id: 'user-1',
        name: 'Test',
      });

      const result = await controller.getProfile({
        id: 'user-1',
        email: 'test@test.com',
        roleCode: 'buyer',
      });

      expect(result.id).toBe('user-1');
    });
  });

  describe('updateProfile', () => {
    it('should update current user profile', async () => {
      mockUsersService.update.mockResolvedValue({
        id: 'user-1',
        name: 'Updated',
      });

      const result = await controller.updateProfile(
        { id: 'user-1', email: 'test@test.com', roleCode: 'buyer' },
        { name: 'Updated' },
      );

      expect(result.name).toBe('Updated');
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      mockUsersService.findAll.mockResolvedValue([{ id: '1' }]);

      const result = await controller.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      mockUsersService.findById.mockResolvedValue({ id: 'user-1' });

      const result = await controller.findOne('user-1');
      expect(result.id).toBe('user-1');
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      mockUsersService.delete.mockResolvedValue({});

      await controller.remove('user-1');
      expect(mockUsersService.delete).toHaveBeenCalledWith('user-1');
    });
  });
});
