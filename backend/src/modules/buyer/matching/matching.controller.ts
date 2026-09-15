import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../../common/decorators/current-user.decorator';
import { MatchingService } from './matching.service';
import { MatchQueryDto } from './dto/match-query.dto';
import { SimilarQueryDto } from './dto/similar-query.dto';
import { HistoryQueryDto } from './dto/history-query.dto';

@ApiTags('Recommendations')
@Controller('recommendations')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('personalized')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('buyer')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get personalized or generic product recommendations',
  })
  @ApiResponse({
    status: 200,
    description: 'Recommendations returned successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - non-buyer role' })
  getPersonalized(
    @CurrentUser() user: AuthUser,
    @Query() query: MatchQueryDto,
  ) {
    return this.matchingService.getPersonalized(user.id, query);
  }

  @Get('similar/:productId')
  @ApiOperation({ summary: 'Get similar products for a given product' })
  @ApiResponse({
    status: 200,
    description: 'Similar products returned successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid product ID' })
  getSimilar(
    @Param('productId') productId: string,
    @Query() query: SimilarQueryDto,
  ) {
    return this.matchingService.getSimilar(productId, query.limit);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('buyer')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get recommendation history from past AI analysis sessions',
  })
  @ApiResponse({ status: 200, description: 'History returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - non-buyer role' })
  getHistory(@CurrentUser() user: AuthUser, @Query() query: HistoryQueryDto) {
    return this.matchingService.getHistory(user.id, query.page, query.limit);
  }
}
