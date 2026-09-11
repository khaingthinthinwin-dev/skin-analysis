import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdsService } from './ads.service';

@ApiTags('ads')
@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get()
  @ApiOperation({ summary: 'Get sponsored ads by placement' })
  @ApiQuery({ name: 'placement', required: false, type: String })
  async getAds(@Query('placement') placement?: string) {
    return this.adsService.getAdsByPlacement(placement || 'general');
  }

  @Get('panel')
  @ApiOperation({ summary: 'Get ad panel by placement' })
  @ApiQuery({ name: 'placement', required: false, type: String })
  @ApiQuery({ name: 'sessionId', required: false, type: String })
  async getAdPanel(
    @Query('placement') placement?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    return this.adsService.getAdsByPlacement(
      placement || 'category_banner',
      sessionId,
    );
  }

  @Post('track/click')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track ad click' })
  trackClick(@Body() body: { adId: string; placement?: string }) {
    return this.adsService.trackClick(body.adId, body.placement);
  }

  @Post('track/impression')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track ad impressions' })
  trackImpression(@Body() body: { adIds: string[] }) {
    return this.adsService.trackImpression(body.adIds);
  }
}
