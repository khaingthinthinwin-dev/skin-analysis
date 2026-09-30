import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateProductDto } from './update-product.dto';
import { CreateProductDto } from './create-product.dto';

describe('UpdateProductDto compareAtPrice', () => {
  it('treats empty string as null and passes validation', async () => {
    const dto = plainToInstance(UpdateProductDto, {
      price: 20000,
      compareAtPrice: '',
    });
    const errors = await validate(dto);
    expect(dto.compareAtPrice).toBeNull();
    expect(errors.length).toBe(0);
  });

  it('allows null compareAtPrice with a selling price', async () => {
    const dto = plainToInstance(UpdateProductDto, {
      price: 20000,
      compareAtPrice: null,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('still rejects compareAtPrice <= selling price', async () => {
    const dto = plainToInstance(UpdateProductDto, {
      price: 50,
      compareAtPrice: 40,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints?.ComparePriceGreaterThanPrice).toBe(
      'Compare price must be greater than selling price',
    );
  });
});

describe('CreateProductDto compareAtPrice', () => {
  it('allows omitting compareAtPrice when price is provided', async () => {
    const dto = plainToInstance(CreateProductDto, {
      name: 'Test',
      shortDescription: 'Test',
      description: 'Test',
      categoryId: 'cat-1',
      price: 20000,
      stockQuantity: 5,
      lowStockThreshold: 0,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('treats empty string compareAtPrice as null', async () => {
    const dto = plainToInstance(CreateProductDto, {
      name: 'Test',
      shortDescription: 'Test',
      description: 'Test',
      categoryId: 'cat-1',
      price: 20000,
      compareAtPrice: '',
      stockQuantity: 5,
      lowStockThreshold: 0,
    });
    const errors = await validate(dto);
    expect(dto.compareAtPrice).toBeNull();
    expect(errors.length).toBe(0);
  });
});
