import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDto', () => {
  it('should pass with valid data', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'test@example.com',
      name: 'John Doe',
      passwordHash: 'password123',
      roleCode: 'buyer',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail with invalid email', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'invalid',
      name: 'John Doe',
      passwordHash: 'password123',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with short name', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'test@example.com',
      name: 'J',
      passwordHash: 'password123',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail with short password', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'test@example.com',
      name: 'John Doe',
      passwordHash: '123',
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should pass without optional roleCode', async () => {
    const dto = plainToInstance(CreateUserDto, {
      email: 'test@example.com',
      name: 'John Doe',
      passwordHash: 'password123',
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
