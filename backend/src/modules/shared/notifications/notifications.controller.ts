import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { SkinCheckReminderService } from './skin-check-reminder.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly skinCheckReminderService: SkinCheckReminderService,
  ) {}

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

  @Post('test/analysis-complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test: Trigger Analysis Complete notification for current user',
  })
  async testAnalysisComplete(@CurrentUser() user: AuthUser) {
    const notification = await this.notificationsService.create({
      userId: user.id,
      type: 'analysis',
      title: 'Analysis completed 🔔',
      message:
        'Your skin analysis is ready. Check your results and personalized recommendations.',
      entityType: 'skin_analysis',
      entityId: 'test-analysis-id',
    });
    return {
      data: notification,
      message: 'Test Analysis Complete notification sent',
    };
  }

  @Post('test/skin-check-reminder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test: Trigger Skin Check Reminder notification for current user',
  })
  async testSkinCheckReminder(@CurrentUser() user: AuthUser) {
    await this.skinCheckReminderService.triggerForUser(user.id);
    return { message: 'Test Skin Check Reminder notification sent' };
  }

  @Post('test/cron/skin-check-reminder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Test: Manually run the skin check reminder cron job',
  })
  async testRunCron() {
    await this.skinCheckReminderService.checkAndSendReminders();
    return { message: 'Skin check reminder cron job executed manually' };
  }
}
