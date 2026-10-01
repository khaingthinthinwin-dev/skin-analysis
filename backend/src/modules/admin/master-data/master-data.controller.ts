import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  CurrentUser,
  AuthUser,
} from '../../../common/decorators/current-user.decorator';
import { MasterDataService } from './master-data.service';
import { CreateMasterDataDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/master-data')
export class MasterDataController {
  constructor(private readonly masterDataService: MasterDataService) {}

  @Get(':type')
  async list(@Param('type') type: string) {
    return this.masterDataService.list(type);
  }

  @Post(':type')
  async create(
    @Param('type') type: string,
    @Body() dto: CreateMasterDataDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.masterDataService.create(type, dto, user.id);
  }
}
