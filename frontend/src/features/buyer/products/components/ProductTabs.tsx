import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductDetail } from '../services/product.service';
import { ProductReviews } from './ProductReviews';
import { ReviewForm } from './ReviewForm';

interface ProductTabsProps {
  product: ProductDetail;
}

export function ProductTabs({ product }: ProductTabsProps) {
  return (
    <Tabs defaultValue="description" className="mt-8 w-full">
      <TabsList className="w-full justify-start border-b bg-transparent">
        <TabsTrigger value="description">Description</TabsTrigger>
        <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
        <TabsTrigger value="reviews" className="flex items-center gap-2">
          Reviews ({product.reviewCount})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="description" className="py-4">
        {product.description ? (
          <p className="whitespace-pre-line text-muted-foreground">{product.description}</p>
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
