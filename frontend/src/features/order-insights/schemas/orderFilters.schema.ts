import { z } from 'zod';

export const orderStatusCodes = [
  'placed', 'confirmed', 'packed', 'shipped',
  'out_for_delivery', 'delivered',
] as const;

export const orderListFilterSchema = z.object({
  status: z.enum(['all', ...orderStatusCodes]),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1, 'Invalid page number').default(1),
  limit: z.coerce.number().int().min(1).max(100, 'Invalid limit').default(20),
  sort: z.enum(['createdAt', 'totalAmount', 'status'], { message: 'Invalid sort option' }).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
}).refine((data) => !data.from || !data.to || data.to >= data.from, {
  message: 'Invalid date range',
  path: ['to'],
});

export const adminOrderFilterSchema = orderListFilterSchema.extend({
  merchantId: z.string().uuid().optional(),
  shopId: z.string().uuid().optional(),
});

export const revenuePeriodSchema = z.object({
  period: z.enum(['today', 'this_month', 'last_month', 'custom'], {
    message: 'Invalid period',
  }),
  from: z.string().optional(),
  to: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.period === 'custom' && (!data.from || !data.to || data.to < data.from)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['from'],
      message: 'Select a start and end date',
    });
  }
});

// Explicitly define the form data type to avoid inference issues with .default()
export type OrderListFilterFormData = {
  status: 'all' | 'placed' | 'confirmed' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered';
  from?: string;
  to?: string;
  page: number;
  limit: number;
  sort: 'createdAt' | 'totalAmount' | 'status';
  order: 'asc' | 'desc';
};

export type AdminOrderFilterFormData = OrderListFilterFormData & {
  merchantId?: string;
  shopId?: string;
};

export type RevenuePeriodFormData = {
  period: 'today' | 'this_month' | 'last_month' | 'custom';
  from?: string;
  to?: string;
};