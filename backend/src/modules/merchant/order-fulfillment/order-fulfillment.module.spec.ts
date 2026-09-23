import { PrismaModule } from '../../../shared/prisma/prisma.module';
import { OrderFulfillmentModule } from './order-fulfillment.module';
import { OrderFulfillmentController } from './order-fulfillment.controller';
import { OrderFulfillmentService } from './order-fulfillment.service';

describe('OrderFulfillmentModule', () => {
  it('should be defined', () => {
    expect(OrderFulfillmentModule).toBeDefined();
  });

  it('imports PrismaModule only', () => {
    const metadata = Reflect.getMetadata('imports', OrderFulfillmentModule) as
      unknown[] | undefined;
    expect(metadata).toContain(PrismaModule);
  });

  it('declares the controller and service', () => {
    const controllers = Reflect.getMetadata(
      'controllers',
      OrderFulfillmentModule,
    ) as unknown[] | undefined;
    const providers = Reflect.getMetadata(
      'providers',
      OrderFulfillmentModule,
    ) as unknown[] | undefined;
    expect(controllers).toContain(OrderFulfillmentController);
    expect(providers).toContain(OrderFulfillmentService);
  });

  it('exports the service', () => {
    const metadata = Reflect.getMetadata('exports', OrderFulfillmentModule) as
      unknown[] | undefined;
    expect(metadata).toContain(OrderFulfillmentService);
  });
});
