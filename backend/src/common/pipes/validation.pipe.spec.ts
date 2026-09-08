import { ValidationPipe } from './validation.pipe';
import { BadRequestException } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';

class TestDto {
  @IsString()
  @MinLength(3)
  name: string;
}

describe('ValidationPipe', () => {
  let pipe: ValidationPipe;

  beforeEach(() => {
    pipe = new ValidationPipe();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should return value for primitive types', async () => {
    const result = await pipe.transform('test', { metatype: String });
    expect(result).toBe('test');
  });

  it('should return value if no metatype', async () => {
    const result = await pipe.transform(
      { name: 'test' },
      { metatype: undefined },
    );
    expect(result).toEqual({ name: 'test' });
  });

  it('should pass valid data through', async () => {
    const result = await pipe.transform(
      { name: 'hello' },
      { metatype: TestDto },
    );
    expect(result).toEqual({ name: 'hello' });
  });

  it('should throw BadRequestException for invalid data', async () => {
    await expect(
      pipe.transform({ name: 'ab' }, { metatype: TestDto }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should return value for Boolean type', async () => {
    const result = await pipe.transform(true, { metatype: Boolean });
    expect(result).toBe(true);
  });

  it('should return value for Number type', async () => {
    const result = await pipe.transform(42, { metatype: Number });
    expect(result).toBe(42);
  });

  it('should return value for Array type', async () => {
    const result = await pipe.transform([1, 2], { metatype: Array });
    expect(result).toEqual([1, 2]);
  });

  it('should return value for Object type', async () => {
    const result = await pipe.transform({}, { metatype: Object });
    expect(result).toEqual({});
  });
});
