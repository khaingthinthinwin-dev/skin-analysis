import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductDetail } from '../services/product.service';
import { ProductReviews } from './ProductReviews';
import { ReviewForm } from './ReviewForm';

interface ProductTabsProps {
  product: ProductDetail;
  focusReviewsRequest?: number;
}

type ProductTab = 'description' | 'ingredients' | 'reviews';

export function ProductTabs({ product, focusReviewsRequest = 0 }: ProductTabsProps) {
  const location = useLocation();

  // A "reviews request" is either a #reviews deep link or an in-page click on the
  // rating summary (parent bumps the counter).
  const requestKey = `${location.hash === '#reviews' ? 'hash' : ''}:${focusReviewsRequest}`;
  const [selection, setSelection] = useState<{ tab: ProductTab; key: string }>(() => ({
    tab: location.hash === '#reviews' ? 'reviews' : 'description',
    key: requestKey,
  }));

  // A new request always shows the reviews tab. Manually picking a tab records the
  // current request key, so that pick wins until the next request arrives.
  const tab = selection.key === requestKey ? selection.tab : 'reviews';

  // Scroll once the reviews tab content is actually mounted.
  useEffect(() => {
    if (tab !== 'reviews') return;
    if (location.hash !== '#reviews' && focusReviewsRequest === 0) return;

    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
  }, [tab, location.hash, focusReviewsRequest]);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setSelection({ tab: value as ProductTab, key: requestKey })}
      className="mt-8 w-full"
    >
      <TabsList className="w-full justify-start border-b bg-transparent">
        <TabsTrigger value="description">Description</TabsTrigger>
        <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
        <TabsTrigger value="reviews" className="flex items-center gap-2">
          Reviews ({product.reviewCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="description" className="py-4">
        {product.description ? (
          <div
            className="space-y-3 text-sm text-muted-foreground [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-foreground [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:py-0.5 [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-primary/80"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        ) : (
          <p className="text-muted-foreground">No description available.</p>
        )}
      </TabsContent>

      <TabsContent value="ingredients" className="py-4">
        {product.ingredients.length > 0 ? (
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            {product.ingredients.map((ing) => (
              <li key={ing}>{ing}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No ingredients listed.</p>
        )}
      </TabsContent>

      <TabsContent value="reviews" className="py-4">
        <div id="reviews">
          <ProductReviews idOrSlug={product.id} />
        </div>
        <ReviewForm idOrSlug={product.id} />
      </TabsContent>
    </Tabs>
  );
}
