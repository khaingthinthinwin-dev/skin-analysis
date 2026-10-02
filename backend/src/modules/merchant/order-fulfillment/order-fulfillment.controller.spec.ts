import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { OrderFulfillmentController } from './order-fulfillment.controller';
import { OrderFulfillmentService } from './order-fulfillment.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

describe('OrderFulfillmentController', () => {
  const getOrderDetail = jest.fn();
  const getOrderTracking = jest.fn();
  const updateOrderStatus = jest.fn();
  const orderFulfillmentService = {
    getOrderDetail,
    getOrderTracking,
    updateOrderStatus,
  } as unknown as OrderFulfillmentService;
  const controller = new OrderFulfillmentController(orderFulfillmentService);
  const user: AuthUser = {
    id: 'user-m1',
    email: 'merchant@example.com',
    roleCode: 'merchant',
  };

  beforeEach(() => jest.clearAllMocks());

  it('applies JwtAuthGuard, RolesGuard, and the merchant role only', () => {
    expect(
      Reflect.getMetadata('__guards__', OrderFulfillmentController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata('roles', OrderFulfillmentController)).toEqual([
      'merchant',
    ]);
  });

  it('mounts under the merchant/orders base route', () => {
    expect(Reflect.getMetadata('path', OrderFulfillmentController)).toEqual(
      'merchant/orders',
    );
  });

  it('delegates order detail to the service with the current user and id', async () => {
    const response = { id: 'order-1' };
    getOrderDetail.mockResolvedValue(response);

    await expect(controller.getOrderDetail(user, 'order-1')).resolves.toEqual(
      response,
    );
    expect(getOrderDetail).toHaveBeenCalledWith(user, 'order-1');
  });

  it('delegates tracking to the service with the current user and id', async () => {
    const response = { timeline: [] };
    getOrderTracking.mockResolvedValue(response);

    await expect(controller.getOrderTracking(user, 'order-1')).resolves.toEqual(
      response,
    );
    expect(getOrderTracking).toHaveBeenCalledWith(user, 'order-1');
  });

  it('delegates status updates to the service with the current user, id, and body', async () => {
    const body = new UpdateOrderStatusDto();
    body.status = 'packed';
    const response = { id: 'order-1', status: 'packed' };
    updateOrderStatus.mockResolvedValue(response);

    await expect(
      controller.updateOrderStatus(user, 'order-1', body),
    ).resolves.toEqual(response);
    expect(updateOrderStatus).toHaveBeenCalledWith(user, 'order-1', body);
  });
});
