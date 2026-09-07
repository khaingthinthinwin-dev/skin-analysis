import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator';
import { RequireApprovedMerchantGuard } from '../../auth/guards/require-approved-merchant.guard';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { BulkActionDto } from './dto/bulk-action.dto';
import { BulkDeleteDto } from './dto/bulk-delete.dto';
import { DeleteAllProductsDto } from './dto/delete-all-products.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/product-query.dto';
import { createProductStorage } from './multer.config';

const IMAGE_FILTER = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.mimetype)) {
    return cb(
      new BadRequestException('Only JPG, PNG, and WebP images are allowed'),
      false,
    );
  }
  cb(null, true);
};

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('merchant')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('public/:idOrSlug')
  @ApiOperation({ summary: 'Get product detail by id or slug (public)' })
  getDetail(@Param('idOrSlug') idOrSlug: string) {
    return this.productsService.getDetail(idOrSlug);
  }

  @Get('public/:idOrSlug/reviews')
  @ApiOperation({ summary: 'List approved reviews for a product (public)' })
  findReviews(
    @Param('idOrSlug') idOrSlug: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.productsService.findReviews(idOrSlug, query);
  }

  @Get('public/:idOrSlug/similar')
  @ApiOperation({
    summary: 'List similar products in the same category (public)',
  })
  findSimilar(
    @Param('idOrSlug') idOrSlug: string,
    @Query('limit', new DefaultValuePipe(4), ParseIntPipe) limit: number,
  ) {
    return this.productsService.findSimilar(idOrSlug, limit);
  }

  @Post('public/:idOrSlug/reviews')
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

  @Get()
  @ApiOperation({ summary: 'List products for the authenticated merchant' })
  @ApiResponse({ status: 200, description: 'Products returned successfully' })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ProductQueryDto,
  ) {
    return this.productsService.findAll(user.id, query);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a product by slug' })
  @ApiResponse({ status: 200, description: 'Product returned successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findBySlug(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.productsService.findBySlug(slug, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({ status: 200, description: 'Product returned successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.findById(id, user.id);
  }

  @Post()
  @UseGuards(RequireApprovedMerchantGuard)
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: createProductStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: IMAGE_FILTER,
    }),
  )
  @ApiOperation({ summary: 'Create a new product' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        shortDescription: { type: 'string' },
        description: { type: 'string' },
        categoryId: { type: 'string' },
        sku: { type: 'string' },
        price: { type: 'number' },
        compareAtPrice: { type: 'number' },
        stockQuantity: { type: 'integer' },
        lowStockThreshold: { type: 'integer' },
        skinTypes: { type: 'array', items: { type: 'string' } },
        ingredients: { type: 'array', items: { type: 'string' } },
        tags: { type: 'array', items: { type: 'string' } },
        isActive: { type: 'boolean' },
        isFeatured: { type: 'boolean' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: [
        'name',
        'shortDescription',
        'description',
        'categoryId',
        'price',
      ],
    },
  })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'SKU already exists' })
  async create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProductDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    const imageUrls = (images || []).map(
      (f) => `/uploads/products/${f.filename}`,
    );
    return this.productsService.create(user.id, dto, imageUrls);
  }

  @Post('bulk-delete')
  @UseGuards(RequireApprovedMerchantGuard)
  @ApiOperation({ summary: 'Bulk delete products' })
  @ApiResponse({ status: 200, description: 'Products deleted successfully' })
  @ApiResponse({ status: 404, description: 'Some products not found' })
  @ApiResponse({
    status: 403,
    description: 'Cannot delete products with active orders',
  })
  async bulkDelete(@CurrentUser() user: AuthUser, @Body() dto: BulkDeleteDto) {
    return this.productsService.bulkDelete(user.id, dto);
  }

  @Patch('bulk')
  @UseGuards(RequireApprovedMerchantGuard)
  @ApiOperation({ summary: 'Bulk update product status' })
  @ApiResponse({ status: 200, description: 'Products updated successfully' })
  @ApiResponse({ status: 404, description: 'Some products not found' })
  async bulkUpdateStatus(
    @CurrentUser() user: AuthUser,
    @Body() dto: BulkActionDto,
  ) {
    return this.productsService.bulkUpdateStatus(user.id, dto);
  }

  @Patch(':id/stock')
  @UseGuards(RequireApprovedMerchantGuard)
  @ApiOperation({ summary: 'Update product stock quantity' })
  @ApiResponse({ status: 200, description: 'Stock updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateStock(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateStockDto,
  ) {
    return this.productsService.updateStock(id, user.id, dto);
  }

  @Patch(':id')
  @UseGuards(RequireApprovedMerchantGuard)
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: createProductStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: IMAGE_FILTER,
    }),
  )
  @ApiOperation({ summary: 'Update a product' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        shortDescription: { type: 'string' },
        description: { type: 'string' },
        categoryId: { type: 'string' },
        sku: { type: 'string' },
        price: { type: 'number' },
        compareAtPrice: { type: 'number' },
        stockQuantity: { type: 'integer' },
        lowStockThreshold: { type: 'integer' },
        skinTypes: { type: 'array', items: { type: 'string' } },
        ingredients: { type: 'array', items: { type: 'string' } },
        tags: { type: 'array', items: { type: 'string' } },
        isActive: { type: 'boolean' },
        isFeatured: { type: 'boolean' },
        retainedImageUrls: {
          type: 'array',
          items: { type: 'string' },
        },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'SKU already exists' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    const newImageUrls = (images || []).map(
      (f) => `/uploads/products/${f.filename}`,
    );
    const updateDto = {
      ...dto,
      ...(dto.isFeatured !== undefined && {
        isFeatured: String(dto.isFeatured) === 'true',
      }),
    };
    return this.productsService.update(id, user.id, updateDto, newImageUrls);
  }

  @Patch(':id/toggle')
  @UseGuards(RequireApprovedMerchantGuard)
  @ApiOperation({ summary: 'Toggle product active status' })
  @ApiResponse({
    status: 200,
    description: 'Product status toggled successfully',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async toggleStatus(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.toggleStatus(id, user.id);
  }

  @Patch(':id/toggle-featured')
  @UseGuards(RequireApprovedMerchantGuard)
  @ApiOperation({ summary: 'Toggle product featured status' })
  @ApiResponse({
    status: 200,
    description: 'Product featured status toggled successfully',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async toggleFeatured(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.toggleFeatured(id, user.id);
  }

  @Delete('all')
  @UseGuards(RequireApprovedMerchantGuard)
  @ApiOperation({ summary: 'Delete all products matching filters' })
  @ApiResponse({ status: 200, description: 'Products deleted successfully' })
  async deleteAll(
    @CurrentUser() user: AuthUser,
    @Body() dto: DeleteAllProductsDto,
  ) {
    return this.productsService.deleteAll(user.id, dto);
  }

  @Delete(':id/hard')
  @UseGuards(RequireApprovedMerchantGuard)
  @ApiOperation({
    summary: 'Permanently delete a product with no order history',
  })
  @ApiResponse({ status: 200, description: 'Product permanently deleted' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({
    status: 409,
    description: 'Product has order or inventory history',
  })
  async hardRemove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.hardDelete(id, user.id);
  }

  @Delete(':id')
  @UseGuards(RequireApprovedMerchantGuard)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({
    status: 403,
    description: 'Cannot delete product with active orders',
  })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.remove(id, user.id);
  }
}
