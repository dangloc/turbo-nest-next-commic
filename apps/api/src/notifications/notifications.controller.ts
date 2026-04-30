import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles, RolesGuard } from '../auth';
import { NotificationsService } from './notifications.service';
import type { NotificationPreferenceInput } from './notifications.service';
import type { Notification, NotificationPreference } from '@prisma/client';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('USER', 'AUTHOR', 'ADMIN')
  async listNotifications(
    @Req() req: { user?: { id: number } },
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('isRead') isRead?: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const parsedLimit = limit ? this.parseInteger(limit, 'limit') : 20;
    const parsedSkip = skip ? this.parseInteger(skip, 'skip') : 0;
    const parsedIsRead =
      isRead === 'true' ? true : isRead === 'false' ? false : undefined;

    return this.notificationsService.getNotifications({
      userId,
      limit: parsedLimit,
      skip: parsedSkip,
      isRead: parsedIsRead,
    });
  }

  @Patch(':id/read')
  @UseGuards(RolesGuard)
  @Roles('USER', 'AUTHOR', 'ADMIN')
  async markRead(
    @Req() req: { user?: { id: number } },
    @Param('id') id: string,
  ): Promise<Notification> {
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    const notificationId = this.parseInteger(id, 'id');

    try {
      const updated = await this.notificationsService.markRead(
        userId,
        notificationId,
      );

      if (!updated) {
        throw new NotFoundException('Notification not found');
      }

      return updated;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Forbidden')) {
        throw new ForbiddenException(error.message);
      }

      throw error;
    }
  }

  @Patch('read-all')
  @UseGuards(RolesGuard)
  @Roles('USER', 'AUTHOR', 'ADMIN')
  async markReadAll(@Req() req: { user?: { id: number } }) {
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    return this.notificationsService.markReadAll(userId);
  }

  @Get('preferences')
  @UseGuards(RolesGuard)
  @Roles('USER', 'AUTHOR', 'ADMIN')
  async getPreferences(
    @Req() req: { user?: { id: number } },
  ): Promise<NotificationPreference> {
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    return this.notificationsService.getPreferences(userId);
  }

  @Patch('preferences')
  @UseGuards(RolesGuard)
  @Roles('USER', 'AUTHOR', 'ADMIN')
  async updatePreferences(
    @Req() req: { user?: { id: number } },
    @Body() body: NotificationPreferenceInput,
  ): Promise<NotificationPreference> {
    const userId = req.user?.id;
    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    return this.notificationsService.updatePreferences(userId, body);
  }

  private parseInteger(value: string, fieldName: string): number {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException(
        `${fieldName} must be a non-negative integer`,
      );
    }

    return parsed;
  }
}
