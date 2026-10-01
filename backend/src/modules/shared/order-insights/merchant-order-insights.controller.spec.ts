import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { MerchantOrderInsightsController } from './merchant-order-insights.controller';
import { MerchantSummaryService } from './merchant-summary.service';
import { MerchantScopeQueryDto } from './dto/merchant-scope-query.dto';
import { SummaryQueryDto } from './dto/summary-query.dto';

describe('MerchantOrderInsightsController', () => {
  const getSalesSummary = jest.fn();
  const getRevenueSummary = jest.fn();
  const merchantSummaryService = {
    getSalesSummary,
    getRevenueSummary,
  } as unknown as MerchantSummaryService;
  const controller = new MerchantOrderInsightsController(
    merchantSummaryService,
  );
  const user: AuthUser = {
    id: 'user-m1',
    email: 'merchant@example.com',
    roleCode: 'merchant',
  };

  beforeEach(() => jest.clearAllMocks());

  it('applies JwtAuthGuard, RolesGuard, and merchant/admin/super_admin roles', () => {
    expect(
      Reflect.getMetadata('__guards__', MerchantOrderInsightsController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
    expect(
      Reflect.getMetadata('roles', MerchantOrderInsightsController),
    ).toEqual(['merchant', 'admin', 'super_admin']);
  });

  it('delegates sales-summary to the service with the current user', async () => {
    const query = new MerchantScopeQueryDto();
    const response = {
      salesSummary: { todayCount: 1, thisMonthCount: 2, completedCount: 3 },
    };
    getSalesSummary.mockResolvedValue(response);

    await expect(controller.getSalesSummary(user, query)).resolves.toEqual(
      response,
    );
    expect(getSalesSummary).toHaveBeenCalledWith(user, query);
  });

  it('delegates revenue-summary to the service with the current user', async () => {
    const query = new SummaryQueryDto();
    const response = {
      revenueSummary: {
        sales: '0.00',
        commission: '0.00',
        revenue: '0.00',
        aov: '0.00',
        orderCount: 0,
      },
    };
    getRevenueSummary.mockResolvedValue(response);

    await expect(controller.getRevenueSummary(user, query)).resolves.toEqual(
      response,
    );
    expect(getRevenueSummary).toHaveBeenCalledWith(user, query);
  });
});
