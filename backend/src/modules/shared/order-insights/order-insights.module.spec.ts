import { OrderInsightsModule } from './order-insights.module';
import { MerchantSummaryService } from './merchant-summary.service';

describe('OrderInsightsModule', () => {
  it('should be defined', () => {
    expect(OrderInsightsModule).toBeDefined();
  });

  it('exports MerchantSummaryService', () => {
    const metadata = Reflect.getMetadata('exports', OrderInsightsModule) as
      unknown[] | undefined;
    expect(metadata).toContain(MerchantSummaryService);
  });
});
