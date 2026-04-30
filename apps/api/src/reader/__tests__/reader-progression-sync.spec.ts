import { NotFoundException } from '@nestjs/common';
import { ReaderService } from '../reader.service';

describe('Reader progression sync', () => {
  it('first chapter open increments chapter and novel view counts', async () => {
    const chapterUpdate = jest.fn().mockResolvedValue({ id: 10, novelId: 3 });
    const novelUpdate = jest.fn().mockResolvedValue({ id: 3 });
    const readingHistoryCreate = jest.fn().mockResolvedValue({
      id: 101,
      chapterId: 10,
      novelId: 3,
      progressPercent: 5,
      lastReadAt: new Date('2026-04-11T00:00:00.000Z'),
    });

    const tx = {
      chapter: {
        findUnique: jest.fn().mockResolvedValue({ id: 10, novelId: 3 }),
        update: chapterUpdate,
      },
      novel: {
        update: novelUpdate,
      },
      readingHistory: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: readingHistoryCreate,
        update: jest.fn(),
      },
    };

    const prisma = {
      $transaction: jest.fn(async (callback: any) => callback(tx)),
      bookmark: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
      readingHistory: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      chapter: { update: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
      novel: { update: jest.fn() },
      user: { findUnique: jest.fn() },
    };

    const service = new ReaderService(prisma as any);
    const result = await service.syncChapterOpen(7, { chapterId: 10 });

    expect(result.firstOpen).toBe(true);
    expect(result.appliedPolicy).toBe('first-open-create');
    expect(result.serverAcceptedProgress).toBe(true);
    expect(chapterUpdate).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { viewCount: { increment: 1 } },
    });
    expect(novelUpdate).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { viewCount: { increment: 1 } },
    });
  });

  it('stale update is rejected with server-wins metadata', async () => {
    const chapterUpdate = jest.fn();
    const novelUpdate = jest.fn();
    const serverTime = new Date('2026-04-11T00:30:00.000Z');

    const tx = {
      chapter: {
        findUnique: jest.fn().mockResolvedValue({ id: 10, novelId: 3 }),
        update: chapterUpdate,
      },
      novel: {
        update: novelUpdate,
      },
      readingHistory: {
        findFirst: jest.fn().mockResolvedValue({
          id: 101,
          progressPercent: 80,
          lastReadAt: serverTime,
        }),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const prisma = {
      $transaction: jest.fn(async (callback: any) => callback(tx)),
      bookmark: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
      readingHistory: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      chapter: { update: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
      novel: { update: jest.fn() },
      user: { findUnique: jest.fn() },
    };

    const service = new ReaderService(prisma as any);
    const result = await service.syncChapterOpen(7, {
      chapterId: 10,
      progressPercent: 40,
      clientUpdatedAt: '2026-04-11T00:20:00.000Z',
    });

    expect(result.firstOpen).toBe(false);
    expect(result.serverAcceptedProgress).toBe(false);
    expect(result.conflictDetected).toBe(true);
    expect(result.appliedPolicy).toBe('last-write-keep-server');
    expect(result.effectiveProgressPercent).toBe(80);
    expect(tx.readingHistory.update).not.toHaveBeenCalled();
    expect(chapterUpdate).not.toHaveBeenCalled();
    expect(novelUpdate).not.toHaveBeenCalled();
  });

  it('newer update is accepted and persisted with deterministic metadata', async () => {
    const chapterUpdate = jest.fn();
    const novelUpdate = jest.fn();
    const updatedAt = new Date('2026-04-11T01:00:00.000Z');

    const tx = {
      chapter: {
        findUnique: jest.fn().mockResolvedValue({ id: 10, novelId: 3 }),
        update: chapterUpdate,
      },
      novel: {
        update: novelUpdate,
      },
      readingHistory: {
        findFirst: jest.fn().mockResolvedValue({
          id: 101,
          progressPercent: 60,
          lastReadAt: new Date('2026-04-11T00:30:00.000Z'),
        }),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({
          id: 101,
          chapterId: 10,
          novelId: 3,
          progressPercent: 92,
          lastReadAt: updatedAt,
        }),
      },
    };

    const prisma = {
      $transaction: jest.fn(async (callback: any) => callback(tx)),
      bookmark: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
      readingHistory: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      chapter: { update: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
      novel: { update: jest.fn() },
      user: { findUnique: jest.fn() },
    };

    const service = new ReaderService(prisma as any);
    const result = await service.syncChapterOpen(7, {
      chapterId: 10,
      progressPercent: 92,
      clientUpdatedAt: '2026-04-11T00:59:00.000Z',
    });

    expect(result.serverAcceptedProgress).toBe(true);
    expect(result.conflictDetected).toBe(false);
    expect(result.appliedPolicy).toBe('last-write-accept-client');
    expect(result.effectiveProgressPercent).toBe(92);
    expect(tx.readingHistory.update).toHaveBeenCalled();
    expect(chapterUpdate).not.toHaveBeenCalled();
    expect(novelUpdate).not.toHaveBeenCalled();
  });

  it('unknown chapter throws not found', async () => {
    const tx = {
      chapter: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      novel: {
        update: jest.fn(),
      },
      readingHistory: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const prisma = {
      $transaction: jest.fn(async (callback: any) => callback(tx)),
      bookmark: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
      readingHistory: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      chapter: { update: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn() },
      novel: { update: jest.fn() },
      user: { findUnique: jest.fn() },
    };

    const service = new ReaderService(prisma as any);

    await expect(service.syncChapterOpen(7, { chapterId: 99999 })).rejects.toThrow(
      NotFoundException,
    );
  });
});
