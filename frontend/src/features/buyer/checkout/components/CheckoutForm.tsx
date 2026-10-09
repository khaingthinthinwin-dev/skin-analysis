import { useForm } from 'react-hook-form';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Loader2, ShoppingBag } from 'lucide-react';
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
  useFormField,
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
    .regex(/^\d*$/, 'Phone number must contain digits only')
    .refine(
      (val) => val.length === 0 || (val.startsWith('0') && (val.length === 9 || val.length === 11)),
      'Phone must start with 0 and be 9 or 11 digits',
    ),
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
    .regex(/^\d*$/, 'Postal code must contain digits only')
    .refine(
      (val) => val.length === 0 || (val.length >= 4 && val.length <= 7),
      'Postal code must be between 4 and 7 digits',
    ),
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
  { value: 'JP', key: 'jp', label: 'Japan' },
  { value: 'US', key: 'us', label: 'United States' },
  { value: 'GB', key: 'gb', label: 'United Kingdom' },
  { value: 'MM', key: 'mm', label: 'Myanmar' },
  { value: 'TH', key: 'th', label: 'Thailand' },
  { value: 'KR', key: 'kr', label: 'South Korea' },
  { value: 'CN', key: 'cn', label: 'China' },
  { value: 'SG', key: 'sg', label: 'Singapore' },
];

const VALIDATION_KEYS: Record<string, string> = {
  'Recipient name is required': 'buyer.checkout.shippingAddress.recipientNameRequired',
  'Name must not exceed 200 characters':
    'buyer.checkout.shippingAddress.recipientNameMaxLength',
  'Phone number is required': 'buyer.checkout.shippingAddress.phoneRequired',
  'Phone number must contain digits only':
    'buyer.checkout.shippingAddress.phoneDigitsOnly',
  'Phone must start with 0 and be 9 or 11 digits':
    'buyer.checkout.shippingAddress.phoneFormatInvalid',
  'Address is required': 'buyer.checkout.shippingAddress.addressLine1Required',
  'Address must not exceed 255 characters':
    'buyer.checkout.shippingAddress.addressLine1MaxLength',
  'City is required': 'buyer.checkout.shippingAddress.cityRequired',
  'City must not exceed 100 characters':
    'buyer.checkout.shippingAddress.cityMaxLength',
  'State is required': 'buyer.checkout.shippingAddress.stateRequired',
  'State must not exceed 100 characters':
    'buyer.checkout.shippingAddress.stateMaxLength',
  'Postal code is required': 'buyer.checkout.shippingAddress.postalCodeRequired',
  'Postal code must contain digits only':
    'buyer.checkout.shippingAddress.postalCodeDigitsOnly',
  'Postal code must be between 4 and 7 digits':
    'buyer.checkout.shippingAddress.postalCodeFormatInvalid',
  'Country is required': 'buyer.checkout.shippingAddress.countryRequired',
};

function CheckoutValidationMessage() {
  const { error, formMessageId } = useFormField();
  const { t } = useTranslation();
  const englishMessage = error?.message;

  if (!englishMessage) return null;

  const message = String(englishMessage);
  const key = VALIDATION_KEYS[message];

  return (
    <p id={formMessageId} className="text-sm font-medium text-destructive">
      {key ? t(key, message) : message}
    </p>
  );
}

export function CheckoutForm({ summary, onSubmit, isSubmitting }: CheckoutFormProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
            <CardTitle className="text-base">
              {t('orders.detail.shippingTitle', 'Shipping Address')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="recipientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('buyer.checkout.shippingAddress.recipientNameLabel', 'Recipient Name')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('buyer.checkout.shippingAddress.recipientNamePlaceholder', 'Full name')}
                      {...field}
                    />
                  </FormControl>
                  <CheckoutValidationMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('buyer.checkout.shippingAddress.phoneLabel', 'Phone Number')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('buyer.checkout.shippingAddress.phonePlaceholder', 'Phone number')}
                      type="tel"
                      maxLength={11}
                      {...field}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, '');
                        field.onChange(digitsOnly);
                      }}
                    />
                  </FormControl>
                  <CheckoutValidationMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="addressLine1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('buyer.checkout.shippingAddress.addressLine1Label', 'Address Line 1')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('buyer.checkout.shippingAddress.addressLine1Placeholder', 'Street address')}
                      {...field}
                    />
                  </FormControl>
                  <CheckoutValidationMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="addressLine2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('buyer.checkout.shippingAddress.addressLine2Label', 'Address Line 2 (optional)')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('buyer.checkout.shippingAddress.addressLine2Placeholder', 'Apartment, suite, unit, etc.')}
                      {...field}
                    />
                  </FormControl>
                  <CheckoutValidationMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('buyer.checkout.shippingAddress.cityLabel', 'City')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('buyer.checkout.shippingAddress.cityPlaceholder', 'City')}
                        {...field}
                      />
                    </FormControl>
                    <CheckoutValidationMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('buyer.checkout.shippingAddress.stateLabel', 'State/Province')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('buyer.checkout.shippingAddress.statePlaceholder', 'State/Province')}
                        {...field}
                      />
                    </FormControl>
                    <CheckoutValidationMessage />
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
                    <FormLabel>
                      {t('buyer.checkout.shippingAddress.postalCodeLabel', 'Postal Code')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('buyer.checkout.shippingAddress.postalCodePlaceholder', 'Postal code')}
                        maxLength={7}
                        {...field}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/\D/g, '');
                          field.onChange(digitsOnly);
                        }}
                      />
                    </FormControl>
                    <CheckoutValidationMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('buyer.checkout.shippingAddress.countryLabel', 'Country')}
                    </FormLabel>
                    <FormControl>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {t(`buyer.checkout.countries.${c.key}`, c.label)}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <CheckoutValidationMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {t('buyer.checkout.payment.title', 'Payment Method')}
            </CardTitle>
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
                  <p className="text-sm font-medium">
                    {t('buyer.checkout.payment.cod', 'Cash on Delivery')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('buyer.checkout.payment.codDescription', 'Pay when order arrives')}
                  </p>
                </Label>
              </div>
              <div className={`flex items-center space-x-3 rounded-lg border p-3 ${paymentMethod === 'bank_transfer' ? 'border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20' : 'border-border'}`}>
                <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                <Label htmlFor="bank_transfer" className="cursor-pointer flex-1">
                  <p className="text-sm font-medium">
                    {t('buyer.checkout.payment.bankTransfer', 'Bank Transfer')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('buyer.checkout.payment.bankTransferDescription', 'Pay via bank transfer')}
                  </p>
                </Label>
              </div>
              <div className={`flex items-center space-x-3 rounded-lg border p-3 ${paymentMethod === 'card' ? 'border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20' : 'border-border'}`}>
                <RadioGroupItem value="card" id="card" />
                <Label htmlFor="card" className="cursor-pointer flex-1">
                  <p className="text-sm font-medium">
                    {t('buyer.checkout.payment.card', 'Credit/Debit Card')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('buyer.checkout.payment.cardDescription', 'Card payment (stubbed for MVP)')}
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-xs lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {t('buyer.checkout.orderNotes.title', 'Order Notes (optional)')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder={t('buyer.checkout.orderNotes.placeholder', 'Notes for the merchant...')}
              className="min-h-[80px]"
              maxLength={500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center lg:col-span-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full font-bold sm:w-48"
            disabled={isSubmitting}
            onClick={() => navigate('/buyer/cart')}
            aria-label={t('common.cancel', 'Cancel')}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="submit"
            size="lg"
            className="w-full font-bold sm:w-48"
            disabled={isSubmitting || !form.formState.isValid}
            aria-label={t('buyer.checkout.actions.placeOrder', 'Place Order')}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('buyer.checkout.actions.placingOrder', 'Placing order...')}
              </>
            ) : (
              <>
                <ShoppingBag className="mr-2 h-4 w-4" />
                {t('buyer.checkout.actions.placeOrder', 'Place Order')}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
