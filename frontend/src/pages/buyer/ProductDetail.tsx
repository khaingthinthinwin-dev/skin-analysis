import { useParams } from 'react-router';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ProductGallery } from '@/features/buyer/products/components/ProductGallery';
import { ProductInfo } from '@/features/buyer/products/components/ProductInfo';
import { ProductTabs } from '@/features/buyer/products/components/ProductTabs';
import { SimilarProducts } from '@/features/buyer/products/components/SimilarProducts';
import { SidebarAdvertisements } from '@/features/buyer/products/components/SidebarAdvertisements';
import { ProductPurchaseActions } from '@/features/buyer/products/components/ProductPurchaseActions';
import { useProductDetail } from '@/features/buyer/products/hooks/useProductDetail';
import { useAuth } from '@/providers/AuthProvider';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();
  const idOrSlug = id ?? '';

  const { data: product, isLoading, isError } = useProductDetail(idOrSlug);

  if (!id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-muted-foreground">Invalid product.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">Product not found.</p>
        <Button asChild>
          <a href="/buyer/search">Browse products</a>
        </Button>
      </div>
    );
  }

  const showCTA = !isAuthenticated || user?.role === 'buyer';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />
        <div className="space-y-4">
          <ProductInfo product={product} />
          <SidebarAdvertisements idOrSlug={product.id} />
        </div>
      </div>

      <ProductTabs product={product} />
      <SimilarProducts idOrSlug={product.id} />

      {showCTA && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur md:hidden">
          <ProductPurchaseActions product={product} />
        </div>
      )}
    </div>
  );
}
