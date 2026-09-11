import { useSimilarProducts } from '../hooks/useProductDetail';
import { ProductCard } from './ProductCard';

interface SimilarProductsProps {
  idOrSlug: string;
}

export function SimilarProducts({ idOrSlug }: SimilarProductsProps) {
  const { data: products = [], isLoading, isError } = useSimilarProducts(idOrSlug, 8);

  if (isLoading) {
    return (
      <div className="mt-12 space-y-4">
        <h2 className="text-xl font-bold">Similar Products</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || products.length === 0) {
    return null;
  }

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xl font-bold">Similar Products</h2>
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
