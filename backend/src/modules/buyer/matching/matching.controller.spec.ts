import { MatchingController } from './matching.controller';

const mockMatchingService = {
  getPersonalized: jest.fn(),
  getSimilar: jest.fn(),
  getHistory: jest.fn(),
};

describe('MatchingController', () => {
  let controller: MatchingController;

  beforeEach(() => {
    controller = new MatchingController(mockMatchingService as never);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPersonalized', () => {
    it('should delegate to service', () => {
      mockMatchingService.getPersonalized.mockReturnValue([]);
      const result = controller.getPersonalized({});
      expect(result).toBeDefined();
    });
  });

  describe('getSimilar', () => {
    it('should delegate to service', () => {
      mockMatchingService.getSimilar.mockReturnValue([]);
      const result = controller.getSimilar('product-1');
      expect(result).toBeDefined();
    });
  });

  describe('getHistory', () => {
    it('should delegate to service', () => {
      mockMatchingService.getHistory.mockReturnValue({ items: [] });
      const result = controller.getHistory({});
      expect(result).toBeDefined();
    });
  });
});
