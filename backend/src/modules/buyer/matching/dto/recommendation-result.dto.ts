export class RecommendationResultDto {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  shortDescription: string | null;
  price: string;
  compareAtPrice: string | null;
  images: string[];
  skinTypes: string[];
  avgRating: string;
  reviewCount: number;
  isFeatured: boolean;
  isInStock: boolean;
  matchScore: number | null;
  categoryBadge: 'featured' | 'topRated' | 'bestSeller' | 'new' | null;
}

export class PaginationMetaDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class RecommendationResponseDto {
  data: RecommendationResultDto[];
  meta: PaginationMetaDto;
  source: 'ai' | 'generic';
  analysisAge: number | null;
  skinTypes: string[];
}

export class SimilarProductsResponseDto {
  data: RecommendationResultDto[];
  meta: PaginationMetaDto;
  source: null;
}
