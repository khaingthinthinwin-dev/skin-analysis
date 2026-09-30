import { MasterDataController } from './master-data.controller';

interface MockMasterDataService {
  list: jest.Mock;
  create: jest.Mock;
}

const mockMasterDataService: MockMasterDataService = {
  list: jest.fn(),
  create: jest.fn(),
};

describe('MasterDataController', () => {
  let controller: MasterDataController;

  beforeEach(() => {
    controller = new MasterDataController(mockMasterDataService as never);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('lists a master data type', async () => {
    mockMasterDataService.list.mockResolvedValue([{ id: 1 }]);

    const result = await controller.list('user-roles');

    expect(mockMasterDataService.list).toHaveBeenCalledWith('user-roles');
    expect(result).toEqual([{ id: 1 }]);
  });

  it('creates with the current admin as actor', async () => {
    mockMasterDataService.create.mockResolvedValue({ id: 'c1' });
    const user = { id: 'admin-1', email: 'a@b.c', roleCode: 'admin' };

    await controller.create('categories', { name: 'Lipstick' }, user);

    expect(mockMasterDataService.create).toHaveBeenCalledWith(
      'categories',
      { name: 'Lipstick' },
      'admin-1',
    );
  });

  it('does not expose an update route', () => {
    expect(controller).not.toHaveProperty('update');
  });
});
