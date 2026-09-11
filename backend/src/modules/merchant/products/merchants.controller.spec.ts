import { MerchantsController } from './merchants.controller';

const mockMerchantsService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
};

describe('MerchantsController', () => {
  let controller: MerchantsController;

  beforeEach(() => {
    controller = new MerchantsController(mockMerchantsService as never);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get merchants', async () => {
    mockMerchantsService.findAll.mockResolvedValue({ items: [] });
    const result = await controller.findAll({});
    expect(result.items).toBeDefined();
  });

  it('should get merchant by id', async () => {
    mockMerchantsService.findOne.mockResolvedValue({ id: '1' });
    const result = await controller.findOne('1');
    expect(result.id).toBe('1');
  });

  it('should approve merchant', async () => {
    mockMerchantsService.approve.mockResolvedValue({});
    await controller.approve('1', 'admin-1');
    expect(mockMerchantsService.approve).toHaveBeenCalledWith('1', 'admin-1');
  });

  it('should reject merchant', async () => {
    mockMerchantsService.reject.mockResolvedValue({});
    await controller.reject('1', {
      adminId: 'admin-1',
      reason: 'Bad license',
    });
    expect(mockMerchantsService.reject).toHaveBeenCalledWith(
      '1',
      'admin-1',
      'Bad license',
    );
  });
});
