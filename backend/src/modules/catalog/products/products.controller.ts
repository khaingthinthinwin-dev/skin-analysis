import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
  CurrentUser,
  AuthUser,
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
@UseGuards(JwtAuthGuard, RolesGuard, RequireApprovedMerchantGuard)
@Roles('merchant')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products for the authenticated merchant' })
  @ApiResponse({ status: 200, description: 'Products returned successfully' })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: ProductQueryDto,
  ) {
    return this.productsService.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({ status: 200, description: 'Product returned successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.productsService.findById(id, user.id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a product by slug' })
  @ApiResponse({ status: 200, description: 'Product returned successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findBySlug(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.productsService.findBySlug(slug, user.id);
  }

  @Post()
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

  @Patch(':id')
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
    return this.productsService.update(id, user.id, dto, newImageUrls);
  }

  @Patch(':id/stock')
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

  @Delete('all')
  @ApiOperation({ summary: 'Delete all products matching filters' })
  @ApiResponse({ status: 200, description: 'Products deleted successfully' })
  async deleteAll(
    @CurrentUser() user: AuthUser,
    @Body() dto: DeleteAllProductsDto,
  ) {
    return this.productsService.deleteAll(user.id, dto);
  }

  @Delete(':id')
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

  @Patch('bulk')
  @ApiOperation({ summary: 'Bulk update product status' })
  @ApiResponse({ status: 200, description: 'Products updated successfully' })
  @ApiResponse({ status: 404, description: 'Some products not found' })
  async bulkUpdateStatus(
    @CurrentUser() user: AuthUser,
    @Body() dto: BulkActionDto,
  ) {
    return this.productsService.bulkUpdateStatus(user.id, dto);
  }

  @Post('bulk-delete')
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
}
