import { ApiProperty } from '@nestjs/swagger';

export class ProductShopDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty() isApproved: boolean;
}

export class ProductDetailDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
  @ApiProperty() shortDescription: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty({ description: 'Decimal serialized as string' }) price: string;
  @ApiProperty({ nullable: true }) compareAtPrice: string | null;
  @ApiProperty({ type: [String] }) images: string[];
  @ApiProperty({ type: [String] }) skinTypes: string[];
  @ApiProperty({ type: [String] }) ingredients: string[];
  @ApiProperty({ type: [String] }) tags: string[];
  @ApiProperty({ description: 'Decimal serialized as string' })
  avgRating: string;
  @ApiProperty() reviewCount: number;
  @ApiProperty() stockQuantity: number;
  @ApiProperty() isInStock: boolean;
  @ApiProperty() isActive: boolean;
  @ApiProperty() category: { id: string; name: string; slug: string };
  @ApiProperty({ type: ProductShopDto }) shop: ProductShopDto;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
