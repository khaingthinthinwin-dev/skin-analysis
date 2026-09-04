import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator';
import { SearchService } from './search.service';
import {
  ProductQueryDto,
  AdsQueryDto,
  ProductSlugParamDto,
  ProductListResponseDto,
  CategoryTreeResponseDto,
  ProductDetailDto,
  AdsResponseDto,
} from './dto';

@ApiTags('search')
@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get('products')
  @ApiOperation({ summary: 'Search, filter, sort, and paginate products' })
  @ApiResponse({
    status: 200,
    description: 'Paginated product list',
    type: ProductListResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  async searchProducts(
    @Query() query: ProductQueryDto,
  ): Promise<ProductListResponseDto> {
    return this.searchService.searchProducts(query);
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Fetch the nested category tree' })
  @ApiResponse({
    status: 200,
    description: 'Category tree',
    type: CategoryTreeResponseDto,
  })
  async getCategoryTree(): Promise<CategoryTreeResponseDto> {
    return this.searchService.getCategoryTree();
  }

  @Public()
  @Get('products/:slug')
  @ApiOperation({ summary: 'Fetch full product detail by slug' })
  @ApiResponse({
    status: 200,
    description: 'Product detail',
    type: ProductDetailDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductBySlug(
    @Param() params: ProductSlugParamDto,
  ): Promise<{ data: ProductDetailDto }> {
    return this.searchService.getProductBySlug(params.slug);
  }

  @Public()
  @Get('ads')
  @ApiOperation({ summary: 'Fetch sponsored advertisements by placement' })
  @ApiResponse({
    status: 200,
    description: 'Sponsored ads list',
    type: AdsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid placement value' })
  async getAdsByPlacement(
    @Query() query: AdsQueryDto,
  ): Promise<AdsResponseDto> {
    return this.searchService.getAdsByPlacement(query.placement);
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('products')
  @ApiOperation({ summary: 'Search products (public)' })
  @ApiResponse({ status: 200, description: 'Products returned successfully' })
  async searchProducts(@Query() query: SearchQueryDto) {
    return this.searchService.searchProducts(query);
  }

  @Get('products/:slug')
  @ApiOperation({ summary: 'Get product by slug (public)' })
  @ApiResponse({ status: 200, description: 'Product returned successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findBySlug(@Param('slug') slug: string) {
    const product = await this.searchService.findBySlug(slug);
    if (!product) {
      return { statusCode: 404, message: 'Product not found' };
    }
    return { data: product };
  }
}
