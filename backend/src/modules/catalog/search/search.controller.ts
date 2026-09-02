import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
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
