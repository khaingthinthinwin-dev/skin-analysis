import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator';
import { ProductsService } from './products.service';
import { ReviewQueryDto } from './dto/product-query.dto';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('Buyer Products')
@Controller('products')
export class BuyerProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get product detail by id or slug (public)' })
  async getDetail(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.getDetail(idOrSlug);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':idOrSlug/reviews')
  @ApiOperation({
    summary:
      'List approved reviews for a product (public; signed-in buyers also see their own pending review)',
  })
  async findReviews(
    @Param('idOrSlug') idOrSlug: string,
    @Query() query: ReviewQueryDto,
    @CurrentUser() user?: AuthUser,
  ) {
    const result = await this.productsService.findReviews(
      idOrSlug,
      query,
      user?.id,
    );
    return {
      items: result.items,
      total: result.meta.total,
      page: result.meta.page,
      limit: result.meta.limit,
      totalPages: result.meta.totalPages,
    };
  }

  @Public()
  @Get(':idOrSlug/similar')
  @ApiOperation({
    summary: 'List similar products in the same category (public)',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findSimilar(
    @Param('idOrSlug') idOrSlug: string,
    @Query('limit', new DefaultValuePipe(4), ParseIntPipe) limit: number,
  ) {
    return this.productsService.findSimilar(idOrSlug, limit);
  }

  @Get(':idOrSlug/can-review')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if the current buyer can review a product' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('buyer')
  async canReview(
    @Param('idOrSlug') idOrSlug: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.productsService.canReview(idOrSlug, user.id);
  }

  @Post(':idOrSlug/reviews')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review (buyer only, one per product)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('buyer')
  async createReview(
    @Param('idOrSlug') idOrSlug: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReviewDto,
  ) {
    return this.productsService.createReview(idOrSlug, user.id, dto);
  }
}
