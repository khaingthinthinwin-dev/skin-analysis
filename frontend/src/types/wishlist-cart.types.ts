export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface WishlistItem {
  id: string;
  productId: string;
  productName: string;
  category: string | null;
  productSlug: string;
  productImage: string | null;
  productPrice: string;
  compareAtPrice: string | null;
  stockStatus: StockStatus;
  isInStock: boolean;
  createdAt: string;
}

export interface WishlistResponse {
  items: WishlistItem[];
  totalCount: number;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  unitPrice: string;
  quantity: number;
  subtotal: string;
  stockQuantity: number;
  stockStatus: StockStatus;
  isAvailable: boolean;
}

export interface CartSummary {
  totalItems: number;
  subtotal: string;
  shippingEstimate: string;
  total: string;
  hasOutOfStock: boolean;
  canCheckout: boolean;
}

export interface CartResponse {
  items: CartItem[];
  summary: CartSummary;
}

export interface MoveToCartResponse {
  cartItem: CartItem;
  wishlistRemoved: boolean;
}
