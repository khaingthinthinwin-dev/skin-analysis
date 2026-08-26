import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { MerchantsService } from './merchants.service';

@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Get()
  async findAll(
    @Query() query: { status?: string; page?: number; limit?: number },
  ) {
    return this.merchantsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.merchantsService.findOne(id);
  }

  @Patch(':id/approve')
  async approve(@Param('id') id: string, @Body('adminId') adminId: string) {
    return this.merchantsService.approve(id, adminId);
  }

  @Patch(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: { adminId: string; reason: string },
  ) {
    return this.merchantsService.reject(id, body.adminId, body.reason);
  }
}
