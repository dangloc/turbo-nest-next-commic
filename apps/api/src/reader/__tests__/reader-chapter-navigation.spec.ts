import { NotFoundException } from '@nestjs/common';
import { ReaderService } from '../reader.service';

describe('Reader chapter context', () => {
  it('returns chapter context with previous and next ids for middle chapter', async () => {
    const tx = {
      chapter: {
        findUnique: jest.fn().mockResolvedValue({ id: 11, novelId: 5 }),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          { id: 10, title: 'Chapter 10' },
          { id: 11, title: 'Chapter 11' },
          { id: 12, title: 'Chapter 12' },
        ]),
      },
    };

    const prisma = {
      $transaction: jest.fn().mockImplementation((cb: any) => cb(tx)),
    };

    const service = new ReaderService(prisma as any);
    const result = await service.getChapterContext(11);

    expect(result).toEqual({
      novelId: 5,
      currentChapterId: 11,
      previousChapterId: 10,
      nextChapterId: 12,
      chapters: [
        { id: 10, title: 'Chapter 10' },
        { id: 11, title: 'Chapter 11' },
        { id: 12, title: 'Chapter 12' },
      ],
    });
  });

  it('returns null previousChapterId on first chapter boundary', async () => {
    const tx = {
      chapter: {
        findUnique: jest.fn().mockResolvedValue({ id: 3, novelId: 9 }),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          { id: 3, title: 'Chapter 1' },
          { id: 4, title: 'Chapter 2' },
        ]),
      },
    };

    const prisma = {
      $transaction: jest.fn().mockImplementation((cb: any) => cb(tx)),
    };

    const service = new ReaderService(prisma as any);
    const result = await service.getChapterContext(3);

    expect(result.previousChapterId).toBeNull();
    expect(result.nextChapterId).toBe(4);
  });

  it('returns null nextChapterId on last chapter boundary', async () => {
    const tx = {
      chapter: {
        findUnique: jest.fn().mockResolvedValue({ id: 8, novelId: 9 }),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([
          { id: 6, title: 'Chapter 1' },
          { id: 7, title: 'Chapter 2' },
          { id: 8, title: 'Chapter 3' },
        ]),
      },
    };

    const prisma = {
      $transaction: jest.fn().mockImplementation((cb: any) => cb(tx)),
    };

    const service = new ReaderService(prisma as any);
    const result = await service.getChapterContext(8);

    expect(result.previousChapterId).toBe(7);
    expect(result.nextChapterId).toBeNull();
  });

  it('throws not found when chapter identity cannot be resolved', async () => {
    const tx = {
      chapter: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const prisma = {
      $transaction: jest.fn().mockImplementation((cb: any) => cb(tx)),
    };

    const service = new ReaderService(prisma as any);

    await expect(service.getChapterContext(404, 50)).rejects.toThrow(NotFoundException);
    expect(tx.chapter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { novelId: 50 },
        orderBy: [{ chapterNumber: 'asc' }, { id: 'asc' }],
      }),
    );
  });
});
