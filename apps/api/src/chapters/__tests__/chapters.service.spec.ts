import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChaptersService } from '../chapters.service';

describe('ChaptersService', () => {
  const prisma = {
    novel: {
      findUnique: jest.fn(),
    },
    chapter: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;

  let service: ChaptersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ChaptersService(prisma);
  });

  it('creates chapter when author owns the novel', async () => {
    prisma.novel.findUnique.mockResolvedValue({ id: 9, uploaderId: 77 });
    prisma.chapter.findFirst.mockResolvedValue({ id: 110 });
    prisma.chapter.create.mockResolvedValue({ id: 111, novelId: 9, title: 'C' });

    const result = await service.create(
      9,
      { id: 77, role: 'AUTHOR' },
      { title: 'C', postContent: 'Body' },
    );

    expect(prisma.chapter.create).toHaveBeenCalledWith({
      data: {
        id: 111,
        novelId: 9,
        title: 'C',
        postContent: 'Body',
        priceOverride: undefined,
        chapterNumber: 1,
      },
    });
    expect(result).toEqual({ id: 111, novelId: 9, title: 'C' });
  });

  it('blocks author from managing another authors novel', async () => {
    prisma.novel.findUnique.mockResolvedValue({ id: 9, uploaderId: 99 });

    await expect(
      service.create(
        9,
        { id: 77, role: 'AUTHOR' },
        { title: 'C', postContent: 'Body' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFoundException when novel does not exist on create', async () => {
    prisma.novel.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        999,
        { id: 1, role: 'ADMIN' },
        { title: 'C', postContent: 'Body' },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when updating missing chapter', async () => {
    prisma.chapter.findUnique.mockResolvedValue(null);

    await expect(
      service.update(999, { id: 1, role: 'ADMIN' }, { title: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when deleting missing chapter', async () => {
    prisma.chapter.findUnique.mockResolvedValue(null);

    await expect(
      service.remove(404, { id: 1, role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
