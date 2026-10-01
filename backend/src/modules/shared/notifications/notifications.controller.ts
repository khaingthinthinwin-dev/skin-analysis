import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  AuthUser,
  CurrentUser,
} from '../../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List my notifications, newest first' })
  async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListNotificationsDto,
  ) {
    const result = await this.notificationsService.list(user, query);
    return { data: result };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Count my unread notifications' })
  async unreadCount(@CurrentUser() user: AuthUser) {
    const result = await this.notificationsService.unreadCount(user);
    return { data: result };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@CurrentUser() user: AuthUser) {
    const result = await this.notificationsService.markAllAsRead(user);
    return { data: result };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const result = await this.notificationsService.markAsRead(user, id);
    return { data: result };
  }
}
