import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum AdPlacement {
  SEARCH_PAGE_BANNER = 'search_page_banner',
  RECOMMENDATION_PAGE_BANNER = 'recommendation_page_banner',
  CHECKOUT_PAGE_BANNER = 'checkout_page_banner',
  PRODUCTDETAIL_PAGE_BANNER = 'productDetail_page_banner',
}

export class AdsQueryDto {
  @ApiProperty({ enum: AdPlacement, description: 'Ad placement location' })
  @IsEnum(AdPlacement, { message: 'Invalid placement value' })
  @IsNotEmpty({ message: 'Placement is required' })
  placement: AdPlacement;
}
