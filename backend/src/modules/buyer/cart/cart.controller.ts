import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
import {
  CurrentUser,
  AuthUser,
} from '../../../common/decorators/current-user.decorator';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartQuantityDto } from './dto/update-cart-quantity.dto';

@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('buyer')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart items with summary' })
  async getCart(@CurrentUser() user: AuthUser) {
    const result = await this.cartService.getCartItems(user.id);
    return { data: result };
  }

  @Delete('items')
  @ApiOperation({ summary: 'Clear all items from cart' })
  @HttpCode(HttpStatus.OK)
  async clearCart(@CurrentUser() user: AuthUser) {
    const result = await this.cartService.clearCart(user.id);
    return { data: result };
  }

  @Post('items')
  @ApiOperation({ summary: 'Add product to cart' })
  @HttpCode(HttpStatus.CREATED)
  async addToCart(@CurrentUser() user: AuthUser, @Body() dto: AddToCartDto) {
    const result = await this.cartService.addToCart(user.id, dto);
    return { data: result };
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiParam({ name: 'id', description: 'Cart item UUID' })
  async updateQuantity(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCartQuantityDto,
  ) {
    const result = await this.cartService.updateQuantity(user.id, id, dto);
    return { data: result };
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'id', description: 'Cart item UUID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFromCart(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cartService.removeFromCart(user.id, id);
  }
}
