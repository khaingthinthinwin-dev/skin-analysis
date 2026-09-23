import { useForm } from 'react-hook-form';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import type { ShippingAddress, PaymentMethod } from '@/types/checkout.types';

const shippingSchema = z.object({
  recipientName: z
    .string()
    .min(1, 'Recipient name is required')
    .max(200, 'Name must not exceed 200 characters'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .max(20, 'Phone must not exceed 20 characters'),
  addressLine1: z
    .string()
    .min(1, 'Address is required')
    .max(255, 'Address must not exceed 255 characters'),
  addressLine2: z.string().max(255).optional(),
  city: z
    .string()
    .min(1, 'City is required')
    .max(100, 'City must not exceed 100 characters'),
  state: z
    .string()
    .min(1, 'State is required')
    .max(100, 'State must not exceed 100 characters'),
  postalCode: z
    .string()
    .min(1, 'Postal code is required')
    .max(20, 'Postal code must not exceed 20 characters'),
  country: z.string().min(1, 'Country is required'),
});

type ShippingFormValues = z.infer<typeof shippingSchema>;

interface CheckoutFormProps {
  summary: ReactNode;
  onSubmit: (data: {
    shippingAddress: ShippingAddress;
    paymentMethod: PaymentMethod;
    notes: string;
  }) => void;
  isSubmitting: boolean;
}

const COUNTRIES = [
  { value: 'JP', label: 'Japan' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'MM', label: 'Myanmar' },
  { value: 'TH', label: 'Thailand' },
  { value: 'KR', label: 'South Korea' },
  { value: 'CN', label: 'China' },
  { value: 'SG', label: 'Singapore' },
];

export function CheckoutForm({ summary, onSubmit, isSubmitting }: CheckoutFormProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [notes, setNotes] = useState('');
  const form = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingSchema),
    mode: 'onChange',
    defaultValues: {
      recipientName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'JP',
    },
  });

  const handleSubmit = (data: ShippingFormValues) => {
    onSubmit({
      shippingAddress: data as ShippingAddress,
      paymentMethod,
      notes,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-6 lg:grid-cols-2">
        <div>{summary}</div>

        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="recipientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Phone number" type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="addressLine1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 1</FormLabel>
                  <FormControl>
                    <Input placeholder="Street address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="addressLine2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 2 (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Apartment, suite, unit, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State/Province</FormLabel>
                    <FormControl>
                      <Input placeholder="State/Province" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Postal code" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
              className="space-y-3"
            >
              <div className={`flex items-center space-x-3 rounded-lg border p-3 ${paymentMethod === 'cod' ? 'border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20' : 'border-border'}`}>
                <RadioGroupItem value="cod" id="cod" />
                <Label htmlFor="cod" className="cursor-pointer flex-1">
                  <p className="text-sm font-medium">Cash on Delivery</p>
                  <p className="text-xs text-muted-foreground">
                    Pay when order arrives
                  </p>
                </Label>
              </div>
              <div className={`flex items-center space-x-3 rounded-lg border p-3 ${paymentMethod === 'bank_transfer' ? 'border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20' : 'border-border'}`}>
                <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                <Label htmlFor="bank_transfer" className="cursor-pointer flex-1">
                  <p className="text-sm font-medium">Bank Transfer</p>
                  <p className="text-xs text-muted-foreground">
                    Pay via bank transfer
                  </p>
                </Label>
              </div>
              <div className={`flex items-center space-x-3 rounded-lg border p-3 ${paymentMethod === 'card' ? 'border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20' : 'border-border'}`}>
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="cursor-pointer flex-1">
                  <p className="text-sm font-medium">Credit/Debit Card</p>
                  <p className="text-xs text-muted-foreground">
                    Card payment (stubbed for MVP)
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Order Notes (optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Notes for the merchant..."
              className="min-h-[80px]"
              maxLength={500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </CardContent>
        </Card>

        <Button
          type="submit"
          size="lg"
          className="w-full font-bold"
          disabled={isSubmitting || !form.formState.isValid}
          aria-label="Place Order"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Placing order...
            </>
          ) : (
            'Place Order'
          )}
        </Button>
      </form>
    </Form>
  );
}
