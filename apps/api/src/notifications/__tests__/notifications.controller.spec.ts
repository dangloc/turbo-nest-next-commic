import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { NotificationsController } from '../notifications.controller';
import { NotificationsService } from '../notifications.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: {
            notification: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            notificationPreference: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('GET /notifications', () => {
    it('returns paginated notifications grouped by read status', async () => {
      const mockNotifications = [
        {
          id: 1,
          userId: 1,
          type: 'SYSTEM',
          title: 'Welcome',
          message: 'Welcome to Commic',
          metadata: null,
          isRead: false,
          createdAt: new Date(),
          readAt: null,
        },
        {
          id: 2,
          userId: 1,
          type: 'NOVEL_UPDATE',
          title: 'New Chapter',
          message: 'A new chapter was released',
          metadata: null,
          isRead: true,
          createdAt: new Date(),
          readAt: new Date(),
        },
      ];

      (prisma.notification.findMany as jest.Mock).mockResolvedValue(
        mockNotifications,
      );
      (prisma.notification.count as jest.Mock).mockResolvedValue(2);

      const req = { user: { id: 1 } };
      const result = await controller.listNotifications(req as never);

      expect(result.unread).toHaveLength(1);
      expect(result.read).toHaveLength(1);
      expect(result.total).toBe(2);
    });

    it('throws ForbiddenException if user not authenticated', async () => {
      const req = {} as never;

      await expect(controller.listNotifications(req)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('marks a single notification as read', async () => {
      const mockNotification = {
        id: 1,
        userId: 1,
        type: 'SYSTEM',
        title: 'Test',
        message: 'Test message',
        metadata: null,
        isRead: false,
        createdAt: new Date(),
        readAt: null,
      };

      (prisma.notification.findUnique as jest.Mock).mockResolvedValue(
        mockNotification,
      );
      (prisma.notification.update as jest.Mock).mockResolvedValue({
        ...mockNotification,
        isRead: true,
        readAt: new Date(),
      });

      const req = { user: { id: 1 } };
      const result = await controller.markRead(req as never, '1');

      expect(result.isRead).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ isRead: true }),
      });
    });

    it('throws ForbiddenException if notification belongs to another user', async () => {
      const mockNotification = {
        id: 1,
        userId: 2, // Different user
        type: 'SYSTEM',
        title: 'Test',
        message: 'Test message',
        metadata: null,
        isRead: false,
        createdAt: new Date(),
        readAt: null,
      };

      (prisma.notification.findUnique as jest.Mock).mockResolvedValue(
        mockNotification,
      );

      const req = { user: { id: 1 } };

      await expect(controller.markRead(req as never, '1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException if notification does not exist', async () => {
      (prisma.notification.findUnique as jest.Mock).mockResolvedValue(null);

      const req = { user: { id: 1 } };

      await expect(controller.markRead(req as never, '999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('PATCH /notifications/read-all', () => {
    it('marks all unread notifications as read', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({
        count: 5,
      });

      const req = { user: { id: 1 } };
      const result = await controller.markReadAll(req as never);

      expect(result.affectedCount).toBe(5);
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, isRead: false },
        data: expect.objectContaining({ isRead: true }),
      });
    });
  });

  describe('GET /notifications/preferences', () => {
    it('returns user notification preferences', async () => {
      const mockPrefs = {
        userId: 1,
        SYSTEM: true,
        NOVEL_UPDATE: true,
        COMMENT_REPLY: true,
        COMMENT_REACTION: false,
        MISSION: true,
        REWARD: true,
      };

      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(
        mockPrefs,
      );

      const req = { user: { id: 1 } };
      const result = await controller.getPreferences(req as never);

      expect(result.userId).toBe(1);
      expect(result.COMMENT_REACTION).toBe(false);
    });

    it('creates default preferences if not found', async () => {
      const mockPrefs = {
        userId: 1,
        SYSTEM: true,
        NOVEL_UPDATE: true,
        COMMENT_REPLY: true,
        COMMENT_REACTION: true,
        MISSION: true,
        REWARD: true,
      };

      (
        prisma.notificationPreference.findUnique as jest.Mock
      ).mockResolvedValueOnce(null);
      (prisma.notificationPreference.create as jest.Mock).mockResolvedValue(
        mockPrefs,
      );

      const req = { user: { id: 1 } };
      const result = await controller.getPreferences(req as never);

      expect(result.SYSTEM).toBe(true);
      expect(prisma.notificationPreference.create).toHaveBeenCalled();
    });
  });

  describe('PATCH /notifications/preferences', () => {
    it('updates user notification preferences', async () => {
      const mockPrefs = {
        userId: 1,
        SYSTEM: true,
        NOVEL_UPDATE: false,
        COMMENT_REPLY: true,
        COMMENT_REACTION: false,
        MISSION: true,
        REWARD: true,
      };

      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(
        mockPrefs,
      );
      (prisma.notificationPreference.update as jest.Mock).mockResolvedValue(
        mockPrefs,
      );

      const req = { user: { id: 1 } };
      const result = await controller.updatePreferences(req as never, {
        NOVEL_UPDATE: false,
      });

      expect(result.NOVEL_UPDATE).toBe(false);
      expect(prisma.notificationPreference.update).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { NOVEL_UPDATE: false },
      });
    });
  });
});
