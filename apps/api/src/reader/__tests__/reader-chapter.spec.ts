import { NotFoundException } from '@nestjs/common';
import { ReaderService } from '../reader.service';

describe('Reader chapter endpoint', () => {
  it('returns chapter payload and increments chapter+novel view counts', async () => {
    const tx = {
      chapter: {
        findUnique: jest.fn().mockResolvedValue({ id: 4, novelId: 2 }),
        update: jest.fn().mockResolvedValue({
          id: 4,
          novelId: 2,
          title: 'Chapter 4',
          postContent: 'text',
          viewCount: BigInt(99),
        }),
      },
      novel: {
        update: jest.fn().mockResolvedValue({ id: 2 }),
      },
    };

    const prisma = {
      $transaction: jest.fn().mockImplementation((cb: any) => cb(tx)),
    };

    const service = new ReaderService(prisma as any);
    const result = await service.readChapter(4);

    expect(result.id).toBe(4);
    expect(tx.chapter.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { viewCount: { increment: 1 } } }),
    );
    expect(tx.novel.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { viewCount: { increment: 1 } } }),
    );
  });

  it('falls back to chapter order within novel when direct chapter id lookup misses', async () => {
    const tx = {
      chapter: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          { id: 501, novelId: 1042, title: 'Chapter 1', chapterNumber: 0 },
        ]),
        update: jest.fn().mockResolvedValue({
          id: 501,
          novelId: 1042,
          title: 'Mapped Chapter 1',
          postContent: 'body',
          viewCount: BigInt(12),
        }),
      },
      novel: {
        update: jest.fn().mockResolvedValue({ id: 1042 }),
      },
    };

    const prisma = {
      $transaction: jest.fn().mockImplementation((cb: any) => cb(tx)),
    };

    const service = new ReaderService(prisma as any);
    const result = await service.readChapter(1, 1042);

    expect(tx.chapter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { novelId: 1042 },
        orderBy: [{ chapterNumber: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        id: 501,
        novelId: 1042,
      }),
    );
  });

  it('throws not found when chapter does not exist', async () => {
    const tx = {
      chapter: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      novel: {
        update: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation((cb: any) => cb(tx)),
    };

    const service = new ReaderService(prisma as any);

    await expect(service.readChapter(999)).rejects.toThrow(NotFoundException);
    expect(tx.chapter.update).not.toHaveBeenCalled();
    expect(tx.novel.update).not.toHaveBeenCalled();
  });

  it('returns chapter payload by id', async () => {
    const tx = {
      chapter: {
        findUnique: jest.fn().mockResolvedValue({ id: 1, novelId: 1 }),
        update: jest.fn().mockResolvedValue({
          id: 1,
          novelId: 1,
          title: 'Chapter 1',
          postContent: 'body',
          viewCount: BigInt(5),
        }),
      },
      novel: {
        update: jest.fn().mockResolvedValue({ id: 1 }),
      },
    };
    const prisma = {
      $transaction: jest.fn().mockImplementation((cb: any) => cb(tx)),
    };

    const service = new ReaderService(prisma as any);
    const result = await service.readChapter(1);

    expect(result).toEqual(
      expect.objectContaining({
        id: 1,
        title: 'Chapter 1',
        postContent: 'body',
        novelId: 1,
      }),
    );
  });
});
