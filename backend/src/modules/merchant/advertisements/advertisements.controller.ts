import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CurrentUser,
  AuthUser,
} from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AdListQueryDto } from './dto/ad-list-query.dto';
import { PayAdFeeDto } from './dto/pay-ad-fee.dto';
import { ToggleAdActiveDto } from './dto/toggle-ad-active.dto';
import { UpdateAdContentDto } from './dto/update-ad-content.dto';
import { UploadAdContentDto } from './dto/upload-ad-content.dto';
import { AdvertisementsService } from './advertisements.service';

@Controller('ads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdvertisementsController {
  constructor(private readonly advertisementsService: AdvertisementsService) {}

  @Get('active')
  @Public()
  async listActive() {
    return { data: await this.advertisementsService.listActiveAds() };
  }

  @Get('packages')
  @Roles('merchant', 'admin')
  async listPackages() {
    return { data: await this.advertisementsService.listPackages() };
  }

  @Post('packages/:feeSettingId/select')
  @Roles('merchant')
  async selectPackage(
    @Param('feeSettingId', ParseUUIDPipe) feeSettingId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return {
      data: await this.advertisementsService.selectPackage(
        feeSettingId,
        user.id,
      ),
    };
  }

  @Get('my-ads')
  @Roles('merchant')
  async listOwnAds(
    @CurrentUser() user: AuthUser,
    @Query() query: AdListQueryDto,
  ) {
    return this.advertisementsService.listOwnAds(query, user.id);
  }

  @Patch(':id/content')
  @Roles('merchant')
  @UseInterceptors(FileInterceptor('image'))
  async uploadContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadAdContentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return {
      data: await this.advertisementsService.uploadContent(
        id,
        dto,
        file,
        user.id,
      ),
    };
  }

  @Post(':id/pay')
  @Roles('merchant')
  async payFee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayAdFeeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return { data: await this.advertisementsService.payFee(id, dto, user.id) };
  }

  @Patch(':id')
  @Roles('merchant')
  @UseInterceptors(FileInterceptor('image'))
  async updateContent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdContentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return {
      data: await this.advertisementsService.updateContent(
        id,
        dto,
        file,
        user.id,
      ),
    };
  }

  @Delete(':id')
  @Roles('merchant')
  async deleteAd(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.advertisementsService.deleteAd(id, user.id);
  }

  @Patch(':id/toggle')
  @Roles('merchant')
  async toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ToggleAdActiveDto,
    @CurrentUser() user: AuthUser,
  ) {
    return {
      data: await this.advertisementsService.toggleActive(id, dto, user.id),
    };
  }
}
