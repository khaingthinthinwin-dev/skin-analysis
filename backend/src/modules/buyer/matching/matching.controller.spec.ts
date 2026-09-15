import { Test, TestingModule } from '@nestjs/testing';
import { MatchingController } from './matching.controller';
import { MatchingService } from './matching.service';

const mockMatchingService = {
  getPersonalized: jest.fn(),
  getSimilar: jest.fn(),
  getHistory: jest.fn(),
};

describe('MatchingController', () => {
  let controller: MatchingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchingController],
      providers: [{ provide: MatchingService, useValue: mockMatchingService }],
    }).compile();

    controller = module.get<MatchingController>(MatchingController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPersonalized', () => {
    it('should call service.getPersonalized with userId and query', async () => {
      const user = { id: 'user-1', email: 'test@test.com', roleCode: 'buyer' };
      const query = { skinTypes: 'oily', page: 1, limit: 20 };
      const expected = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
        source: 'generic',
      };
      mockMatchingService.getPersonalized.mockResolvedValue(expected);

      const result = await controller.getPersonalized(user, query);

      expect(mockMatchingService.getPersonalized).toHaveBeenCalledWith(
        'user-1',
        query,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('getSimilar', () => {
    it('should call service.getSimilar with productId and limit', async () => {
      const expected = {
        data: [],
        meta: { page: 1, limit: 8, total: 0, totalPages: 0 },
        source: null,
      };
      mockMatchingService.getSimilar.mockResolvedValue(expected);

      const result = await controller.getSimilar('product-123', { limit: 8 });

      expect(mockMatchingService.getSimilar).toHaveBeenCalledWith(
        'product-123',
        8,
      );
      expect(result).toEqual(expected);
    });
  });

  describe('getHistory', () => {
    it('should call service.getHistory with userId and pagination', async () => {
      const user = { id: 'user-1', email: 'test@test.com', roleCode: 'buyer' };
      const query = { page: 1, limit: 20 };
      const expected = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
      mockMatchingService.getHistory.mockResolvedValue(expected);

      const result = await controller.getHistory(user, query);

      expect(mockMatchingService.getHistory).toHaveBeenCalledWith(
        'user-1',
        1,
        20,
      );
      expect(result).toEqual(expected);
    });
  });
});
