import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { MatchingService } from './matching.service';
import { MatchQueryDto } from './dto/match-query.dto';

@Controller('recommendations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Get('personalized')
  @Roles('buyer')
  async getPersonalized(@Query() query: MatchQueryDto) {
    // TODO: Implement personalized recommendations
    return this.matchingService.getPersonalized(query);
  }

  @Get('similar/:productId')
  async getSimilar(@Param('productId') productId: string) {
    // TODO: Implement similar products
    return this.matchingService.getSimilar(productId);
  }

  @Get('history')
  @Roles('buyer')
  async getHistory(@Query() query: { page?: number; limit?: number }) {
    // TODO: Implement recommendation history
    return this.matchingService.getHistory(query);
  }
}
