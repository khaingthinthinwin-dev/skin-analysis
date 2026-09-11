import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from './config.module';

describe('ConfigModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule],
    }).compile();
  });

  it('should compile', () => {
    expect(module).toBeDefined();
  });

  afterAll(async () => {
    await module.close();
  });
});
