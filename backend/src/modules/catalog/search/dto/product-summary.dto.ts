import { ApiProperty } from '@nestjs/swagger';

export class ProductCategoryDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
}

export class ProductSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty() shortDescription: string;
  @ApiProperty({ description: 'Decimal serialized as string' }) price: string;
  @ApiProperty({ nullable: true }) compareAtPrice: string | null;
  @ApiProperty({ type: [String] }) images: string[];
  @ApiProperty({ type: [String] }) skinTypes: string[];
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiProperty({ description: 'Decimal serialized as string' })
  avgRating: string;
  @ApiProperty() reviewCount: number;
  @ApiProperty() isInStock: boolean;
  @ApiProperty({ type: ProductCategoryDto }) category: ProductCategoryDto;
}

export class PaginationMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
}

export class ProductListResponseDto {
  @ApiProperty({ type: [ProductSummaryDto] }) data: ProductSummaryDto[];
  @ApiProperty({ type: PaginationMetaDto }) meta: PaginationMetaDto;
}
