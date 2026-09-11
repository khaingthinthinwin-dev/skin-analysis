import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ImageIcon } from 'lucide-react';
import type { CheckoutItem, CouponValidation } from '@/types/checkout.types';

interface OrderSummaryProps {
	items: CheckoutItem[];
	subtotal: string;
	appliedCoupon: CouponValidation | null;
	onApplyCoupon: (code: string) => void;
	onRemoveCoupon: () => void;
	isCouponLoading: boolean;
}

function getImageUrl(url: string | null | undefined): string {
	if (!url) return '';
	if (url.startsWith('http')) return url;
	const raw = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
	const base = raw.replace(/\/api\/v1\/?$/, '');
	return `${base}${url.startsWith('/') ? url : `/${url}`}`;
}

function formatPrice(value: string | number) {
	return `$${Number.parseFloat(String(value) || '0').toFixed(2)}`;
}

export function OrderSummary({
	items,
	subtotal,
	appliedCoupon,
	onApplyCoupon,
	onRemoveCoupon,
	isCouponLoading,
}: OrderSummaryProps) {
	const [couponCode, setCouponCode] = useState('');
	const discount = appliedCoupon?.discountAmount ?? '0';
	const total = appliedCoupon?.newTotal ?? subtotal;

	const handleApplyCoupon = () => {
		const code = couponCode.trim();
		if (code) onApplyCoupon(code);
	};

	return (
		<Card className="border-border/80 shadow-xs">
			<CardHeader>
				<CardTitle className="text-base">Order Summary</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-3">
					{items.map((item) => (
						<div key={item.id} className="flex items-center gap-3 border-b border-border/60 pb-3">
						{item.productImage ? (
							<img
								src={getImageUrl(item.productImage)}
								alt={item.productName}
								className="h-16 w-16 rounded-md object-cover"
							/>
						) : (
							<div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
								<ImageIcon className="h-6 w-6 text-muted-foreground/40" />
							</div>
						)}
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">{item.productName}</p>
								<p className="text-xs text-muted-foreground">
									Qty: {item.quantity} x {formatPrice(item.unitPrice)}
								</p>
							</div>
							<span className="text-sm font-medium">{formatPrice(item.lineTotal)}</span>
						</div>
					))}
				</div>

				<div className="flex gap-2">
					<Input
						value={couponCode}
						onChange={(event) => setCouponCode(event.target.value)}
						placeholder="Enter coupon code"
						aria-label="Coupon code"
						disabled={Boolean(appliedCoupon) || isCouponLoading}
					/>
					{appliedCoupon ? (
						<Button type="button" variant="outline" onClick={onRemoveCoupon}>
							Remove
						</Button>
					) : (
						<Button
							type="button"
							variant="outline"
							onClick={handleApplyCoupon}
							disabled={!couponCode.trim() || isCouponLoading}
						>
							{isCouponLoading ? 'Applying...' : 'Apply'}
						</Button>
					)}
				</div>

				<div className="space-y-2 border-t border-border pt-3 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Subtotal</span>
						<span>{formatPrice(subtotal)}</span>
					</div>
					{appliedCoupon && (
						<div className="flex justify-between text-green-600">
							<span>Discount</span>
							<span>-{formatPrice(discount)}</span>
						</div>
					)}
					<div className="flex justify-between text-base font-bold">
						<span>Total</span>
						<span>{formatPrice(total)}</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

export default OrderSummary;
