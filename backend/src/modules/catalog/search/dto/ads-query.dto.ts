import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

export enum AdPlacement {
  HOMEPAGE_SLIDER = 'homepage_slider',
  PRODUCT_SIDEBAR = 'product_sidebar',
  CATEGORY_BANNER = 'category_banner',
  SEARCH_TOP = 'search_top',
}

export class AdsQueryDto {
  @ApiProperty({ enum: AdPlacement, description: 'Ad placement location' })
  @IsEnum(AdPlacement, { message: 'Invalid placement value' })
  @IsNotEmpty({ message: 'Placement is required' })
  placement: AdPlacement;
}
