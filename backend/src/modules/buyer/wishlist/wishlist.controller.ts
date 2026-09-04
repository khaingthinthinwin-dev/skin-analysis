import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { WishlistService } from './wishlist.service';

@ApiTags('wishlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get user wishlist items' })
  async getWishlist(@CurrentUser() user: AuthUser) {
    console.log('[wishlist.controller] GET /wishlist user:', user);
    try {
      const result = await this.wishlistService.getWishlistItems(user.id);
      console.log('[wishlist.controller] GET /wishlist result:', result);
      return { data: result };
    } catch (error) {
      console.error('[wishlist.controller] GET /wishlist error:', error);
      throw error;
    }
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all wishlist items' })
  @HttpCode(HttpStatus.OK)
  async clearAllWishlist(@CurrentUser() user: AuthUser) {
    const result = await this.wishlistService.clearAllWishlist(user.id);
    return { data: result };
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Add product to wishlist' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @HttpCode(HttpStatus.CREATED)
  async addToWishlist(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
  ) {
    const result = await this.wishlistService.addToWishlist(user.id, {
      productId,
    });
    return { data: result };
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFromWishlist(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeFromWishlist(user.id, productId);
  }

  @Post(':productId/move-to-cart')
  @ApiOperation({ summary: 'Move wishlist item to cart' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  async moveToCart(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
  ) {
    const result = await this.wishlistService.moveToCart(user.id, productId);
    return { data: result };
  }
}
