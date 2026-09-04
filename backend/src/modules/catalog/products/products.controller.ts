import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/product-query.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Get product detail by id or slug (public)' })
  getDetail(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.getDetail(idOrSlug);
  }

  @Get(':idOrSlug/reviews')
  @ApiOperation({ summary: 'List approved reviews for a product (public)' })
  findReviews(
    @Param('idOrSlug') idOrSlug: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.productsService.findReviews(idOrSlug, query);
  }

  @Get(':idOrSlug/similar')
  @ApiOperation({
    summary: 'List similar products in the same category (public)',
  })
  findSimilar(
    @Param('idOrSlug') idOrSlug: string,
    @Query('limit', new DefaultValuePipe(4), ParseIntPipe) limit: number,
  ) {
    return this.productsService.findSimilar(idOrSlug, limit);
  }

  @Post(':idOrSlug/reviews')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review (buyer only, one per product)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('buyer')
  createReview(
    @Param('idOrSlug') idOrSlug: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateReviewDto,
  ) {
    return this.productsService.createReview(idOrSlug, user.id, dto);
  }
}
