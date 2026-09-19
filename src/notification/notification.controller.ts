import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notification.service';
import { CurrentUser } from 'src/users/decorator/current-user.decorator';
import { AuthGuard } from 'src/users/auth.guard';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(@CurrentUser() user: { sub: string }) {
    return this.notificationsService.getUserNotifications(user.sub);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: { sub: string }) {
    const count = await this.notificationsService.getUnreadCount(user.sub);

    return {
      count,
    };
  }

  @Patch(':id/read')
  async markAsRead(
    @CurrentUser() user: { sub: string },
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(user.sub, notificationId);
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: { sub: string }) {
    return this.notificationsService.markAllAsRead(user.sub);
  }
}
