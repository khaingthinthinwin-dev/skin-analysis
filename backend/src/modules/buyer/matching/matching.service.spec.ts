import { MatchingService } from './matching.service';

const mockPrisma = {};
const mockRedis = {};

describe('MatchingService', () => {
  let service: MatchingService;

  beforeEach(() => {
    service = new MatchingService(mockPrisma as never, mockRedis as never);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw not implemented for getPersonalized', () => {
    expect(() => service.getPersonalized({})).toThrow('Not implemented');
  });

  it('should throw not implemented for getSimilar', () => {
    expect(() => service.getSimilar('product-1')).toThrow('Not implemented');
  });

  it('should throw not implemented for getHistory', () => {
    expect(() => service.getHistory({ page: 1, limit: 10 })).toThrow(
      'Not implemented',
    );
  });
});
