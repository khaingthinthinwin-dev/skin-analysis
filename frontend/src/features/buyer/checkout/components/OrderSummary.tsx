import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageIcon } from 'lucide-react';
import { ShopVoucherRow } from './ShopVoucherRow';
import type { CheckoutItem, CouponValidation } from '@/types/checkout.types';

interface MerchantCoupon {
  coupon: CouponValidation;
  code: string;
}

interface OrderSummaryProps {
	items: CheckoutItem[];
	subtotal: string;
	appliedByMerchant: Record<string, MerchantCoupon>;
	onApplyCoupon: (merchantId: string, code: string, shopSubtotal: number) => void;
	onRemoveCoupon: (merchantId: string) => void;
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

interface ShopGroup {
	merchantId: string;
	items: CheckoutItem[];
	subtotal: number;
}

export function OrderSummary({
	items,
	subtotal,
	appliedByMerchant,
	onApplyCoupon,
	onRemoveCoupon,
	isCouponLoading,
}: OrderSummaryProps) {
	const shopGroups = useMemo(() => {
		const groupMap = new Map<string, ShopGroup>();
		for (const item of items) {
			const existing = groupMap.get(item.merchantId);
			if (existing) {
				existing.items.push(item);
				existing.subtotal += Number.parseFloat(item.lineTotal);
			} else {
				groupMap.set(item.merchantId, {
					merchantId: item.merchantId,
					items: [item],
					subtotal: Number.parseFloat(item.lineTotal),
				});
			}
		}
		return Array.from(groupMap.values());
	}, [items]);

	const totalDiscount = useMemo(() => {
		let sum = 0;
		for (const group of shopGroups) {
			const entry = appliedByMerchant[group.merchantId];
			if (entry) {
				sum += Number.parseFloat(entry.coupon.discountAmount || '0');
			}
		}
		return sum;
	}, [shopGroups, appliedByMerchant]);

	const rawSubtotal = Number.parseFloat(String(subtotal) || '0');
	const total = Math.max(rawSubtotal - totalDiscount, 0).toFixed(2);

	return (
		<Card className="border-border/80 shadow-xs">
			<CardHeader>
				<CardTitle className="text-base">Order Summary</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{shopGroups.map((group) => {
					const merchantCoupon = appliedByMerchant[group.merchantId] ?? null;
					return (
						<div key={group.merchantId} className="space-y-3">
							{group.items.map((item) => (
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
										{item.merchantName && (
											<p className="text-xs text-muted-foreground">
												Sold by {item.merchantName}
											</p>
										)}
										<p className="text-xs text-muted-foreground">
											Qty: {item.quantity} x {formatPrice(item.unitPrice)}
										</p>
									</div>
									<span className="text-sm font-medium">{formatPrice(item.lineTotal)}</span>
								</div>
							))}

							<ShopVoucherRow
								merchantId={group.merchantId}
								appliedCoupon={merchantCoupon?.coupon ?? null}
								appliedCode={merchantCoupon?.code ?? null}
								onSelectPromotion={(code) => onApplyCoupon(group.merchantId, code, group.subtotal)}
								onRemovePromotion={() => onRemoveCoupon(group.merchantId)}
								onEnterCode={(code) => onApplyCoupon(group.merchantId, code, group.subtotal)}
								isCouponLoading={isCouponLoading}
								subtotal={group.subtotal}
							/>
						</div>
					);
				})}

				<div className="space-y-2 border-t border-border pt-3 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">Subtotal</span>
						<span>{formatPrice(subtotal)}</span>
					</div>
					{totalDiscount > 0 && (
						<div className="flex justify-between text-green-600">
							<span>Discount</span>
							<span>-{formatPrice(totalDiscount)}</span>
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
