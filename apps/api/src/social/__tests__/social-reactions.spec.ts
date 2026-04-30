import { Reflector } from '@nestjs/core';
import { CommentReactionType } from '@prisma/client';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SocialReactionsController } from '../social-reactions.controller';
import { SocialService } from '../social.service';

describe('Social reactions', () => {
  const prisma = {
    comment: {
      findUnique: jest.fn(),
    },
    commentReaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(async (callback: any) => callback(prisma)),
  } as any;

  let service: SocialService;
  let controller: SocialReactionsController;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SocialService(prisma);
    controller = new SocialReactionsController(service);
    prisma.comment.findUnique.mockResolvedValue({ id: 55 });
  });

  it.each(Object.values(CommentReactionType))(
    'allows authenticated users to create reaction %s',
    async (type) => {
      prisma.commentReaction.findUnique.mockResolvedValue(null);
      prisma.commentReaction.create.mockResolvedValue({
        id: 11,
        userId: 7,
        commentId: 55,
        type,
        createdAt: new Date('2026-04-08T11:00:00.000Z'),
      });

      await expect(
        service.toggleReaction(7, { commentId: 55, type }),
      ).resolves.toEqual(
        expect.objectContaining({
          id: 11,
          userId: 7,
          commentId: 55,
          type,
        }),
      );
    },
  );

  it('removes the row when the same reaction is toggled twice', async () => {
    prisma.commentReaction.findUnique.mockResolvedValue({
      id: 12,
      userId: 7,
      commentId: 55,
      type: CommentReactionType.LIKE,
    });
    prisma.commentReaction.delete.mockResolvedValue({ id: 12 });

    await expect(
      service.toggleReaction(7, {
        commentId: 55,
        type: CommentReactionType.LIKE,
      }),
    ).resolves.toBeNull();
    expect(prisma.commentReaction.delete).toHaveBeenCalledWith({
      where: { id: 12 },
    });
  });

  it('updates the existing row when the user changes reaction type', async () => {
    prisma.commentReaction.findUnique.mockResolvedValue({
      id: 13,
      userId: 7,
      commentId: 55,
      type: CommentReactionType.LIKE,
    });
    prisma.commentReaction.update.mockResolvedValue({
      id: 13,
      userId: 7,
      commentId: 55,
      type: CommentReactionType.HEART,
      createdAt: new Date('2026-04-08T11:01:00.000Z'),
    });

    await expect(
      service.toggleReaction(7, {
        commentId: 55,
        type: CommentReactionType.HEART,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 13,
        type: CommentReactionType.HEART,
      }),
    );
    expect(prisma.commentReaction.update).toHaveBeenCalledWith({
      where: { id: 13 },
      data: { type: CommentReactionType.HEART },
    });
  });

  it('exposes guarded reaction metadata and blocks unauthenticated access', async () => {
    const roles = Reflect.getMetadata(ROLES_KEY, controller.toggleReaction);
    expect(roles).toEqual(['USER', 'AUTHOR', 'ADMIN']);

    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['USER', 'AUTHOR', 'ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const unauthenticatedContext = {
      getHandler: () => 'handler',
      getClass: () => 'classRef',
      switchToHttp: () => ({ getRequest: () => ({}) }),
    };

    await expect(
      guard.canActivate(unauthenticatedContext as any),
    ).rejects.toThrow('Authentication required');
  });

  it('passes parsed comment ids and reaction type through the controller', async () => {
    prisma.commentReaction.findUnique.mockResolvedValue(null);
    prisma.commentReaction.create.mockResolvedValue({
      id: 14,
      userId: 8,
      commentId: 55,
      type: CommentReactionType.WOW,
      createdAt: new Date('2026-04-08T11:02:00.000Z'),
    });

    await expect(
      controller.toggleReaction(
        { user: { id: 8 } },
        55,
        CommentReactionType.WOW,
      ),
    ).resolves.toMatchObject({
      id: 14,
      commentId: 55,
      type: CommentReactionType.WOW,
    });
  });
});
