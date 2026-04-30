import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type {
  NotificationType,
  Notification,
  NotificationPreference,
} from '@prisma/client';

export interface NotificationFilterInput {
  userId: number;
  limit?: number;
  skip?: number;
  isRead?: boolean;
}

export type NotificationPreferenceInput = Partial<Record<NotificationType, boolean>>;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(input: NotificationFilterInput) {
    const { userId, limit = 20, skip = 0, isRead } = input;

    const where = { userId, ...(isRead !== undefined && { isRead }) };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' } as const,
        take: limit,
        skip,
      }),
      this.prisma.notification.count({ where }),
    ]);

    // Group by read status
    const unread = notifications.filter((n) => !n.isRead);
    const read = notifications.filter((n) => n.isRead);

    return {
      unread,
      read,
      total,
      unreadCount: unread.length,
      readCount: read.length,
    };
  }

  async markRead(
    userId: number,
    notificationId: number,
  ): Promise<Notification | null> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return null;
    }

    if (notification.userId !== userId) {
      throw new Error('Forbidden: notification does not belong to user');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markReadAll(userId: number): Promise<{ affectedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { affectedCount: result.count };
  }

  async getPreferences(userId: number): Promise<NotificationPreference> {
    let prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!prefs) {
      // Create default preferences
      prefs = await this.prisma.notificationPreference.create({
        data: {
          userId,
          SYSTEM: true,
          NOVEL_UPDATE: true,
          COMMENT_REPLY: true,
          COMMENT_REACTION: true,
          MISSION: true,
          REWARD: true,
        },
      });
    }

    return prefs;
  }

  async updatePreferences(
    userId: number,
    input: NotificationPreferenceInput,
  ): Promise<NotificationPreference> {
    // Ensure user has preferences record
    await this.getPreferences(userId);

    return this.prisma.notificationPreference.update({
      where: { userId },
      data: input,
    });
  }
}
