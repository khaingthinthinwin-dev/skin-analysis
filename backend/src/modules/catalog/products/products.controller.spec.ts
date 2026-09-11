import { ProductsController } from './products.controller';

const mockProductsService = {
  getDetail: jest.fn(),
  findReviews: jest.fn(),
  findSimilar: jest.fn(),
  createReview: jest.fn(),
};

describe('ProductsController', () => {
  let controller: ProductsController;

  beforeEach(() => {
    controller = new ProductsController(mockProductsService as never);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get product detail', async () => {
    mockProductsService.getDetail.mockResolvedValue({
      id: '1',
      name: 'Product',
    });
    const result = await controller.getDetail('product-1');
    expect(result.id).toBe('1');
  });

  it('should get reviews', async () => {
    mockProductsService.findReviews.mockResolvedValue({ items: [] });
    const result = await controller.findReviews('product-1', {});
    expect(result.items).toBeDefined();
  });

  it('should get similar products', async () => {
    mockProductsService.findSimilar.mockResolvedValue([]);
    const result = await controller.findSimilar('product-1', 4);
    expect(result).toBeDefined();
  });

  it('should create review', async () => {
    mockProductsService.createReview.mockResolvedValue({ id: 'r1' });
    const result = await controller.createReview(
      'product-1',
      { id: 'user-1', email: 'test@test.com', roleCode: 'buyer' },
      { rating: 5, title: 'Great', body: 'Love it' },
    );
    expect(result.id).toBe('r1');
  });
});
