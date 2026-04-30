import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthorApprovalStatus } from '@prisma/client';
import { NovelsService } from '../novels.service';

describe('NovelsService', () => {
  const prisma = {
    authorProfile: {
      findUnique: jest.fn(),
    },
    chapter: {
      findFirst: jest.fn(),
    },
    novel: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  } as any;

  let service: NovelsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NovelsService(prisma);
  });

  it('defaults to the first page with newest sorting when query params are omitted', async () => {
    prisma.novel.count.mockResolvedValue(2);
    prisma.novel.findMany.mockResolvedValue([
      { id: 2, title: 'B', postContent: 'body b', uploaderId: 1 },
      { id: 1, title: 'A', postContent: 'body a', uploaderId: 1 },
    ]);

    const result = await service.findAll({}, { id: 11, role: 'ADMIN' });

    expect(prisma.novel.count).toHaveBeenCalledWith({ where: {} });
    expect(prisma.novel.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 0,
      take: 10,
      include: { terms: true },
    });
    expect(result).toEqual({
      items: [
        { id: 2, title: 'B', postContent: 'body b', uploaderId: 1 },
        { id: 1, title: 'A', postContent: 'body a', uploaderId: 1 },
      ],
      total: 2,
      page: 1,
      pageSize: 10,
    });
  });

  it('applies search, scope, sort, and pagination filters', async () => {
    prisma.novel.count.mockResolvedValue(12);
    prisma.novel.findMany.mockResolvedValue([
      {
        id: 9,
        title: 'Alpha story',
        postContent: 'Alpha body',
        uploaderId: 42,
      },
    ]);

    const result = await service.findAll(
      {
        q: 'Alpha',
        scope: 'mine',
        sort: 'title',
        page: 2,
        pageSize: 5,
      },
      { id: 42, role: 'ADMIN' },
    );

    expect(prisma.novel.count).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            title: {
              contains: 'Alpha',
              mode: 'insensitive',
            },
          },
          {
            postContent: {
              contains: 'Alpha',
              mode: 'insensitive',
            },
          },
        ],
        uploaderId: 42,
      },
    });
    expect(prisma.novel.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            title: {
              contains: 'Alpha',
              mode: 'insensitive',
            },
          },
          {
            postContent: {
              contains: 'Alpha',
              mode: 'insensitive',
            },
          },
        ],
        uploaderId: 42,
      },
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
      skip: 5,
      take: 5,
      include: { terms: true },
    });
    expect(result).toEqual({
      items: [
        {
          id: 9,
          title: 'Alpha story',
          postContent: 'Alpha body',
          uploaderId: 42,
        },
      ],
      total: 12,
      page: 2,
      pageSize: 5,
    });
  });

  it('forces authors to see only their own novels regardless of requested scope', async () => {
    prisma.novel.count.mockResolvedValue(1);
    prisma.novel.findMany.mockResolvedValue([
      { id: 8, title: 'Mine', postContent: 'body', uploaderId: 7 },
    ]);

    await service.findAll(
      {
        scope: 'all',
      },
      { id: 7, role: 'AUTHOR' },
    );

    expect(prisma.novel.count).toHaveBeenCalledWith({
      where: { uploaderId: 7 },
    });
    expect(prisma.novel.findMany).toHaveBeenCalledWith({
      where: { uploaderId: 7 },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 0,
      take: 10,
      include: { terms: true },
    });
  });

  it('rejects author novel creation when author profile is not approved', async () => {
    prisma.authorProfile.findUnique.mockResolvedValue({
      approvalStatus: AuthorApprovalStatus.PENDING,
    });

    await expect(
      service.create(
        { id: 7, role: 'AUTHOR' },
        { title: 'Draft', postContent: 'Body' },
      ),
    ).rejects.toThrow('Author profile is not approved');
  });

  it('blocks authors from updating novels they do not own', async () => {
    prisma.novel.findUnique.mockResolvedValue({
      id: 15,
      uploaderId: 8,
    });

    await expect(
      service.update(15, { id: 7, role: 'AUTHOR' }, { title: 'new title' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFoundException when updating missing novel', async () => {
    prisma.novel.findUnique.mockResolvedValue(null);

    await expect(
      service.update(999, { id: 1, role: 'ADMIN' }, { title: 'new title' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when deleting missing novel', async () => {
    prisma.novel.findUnique.mockResolvedValue(null);

    await expect(
      service.remove(404, { id: 1, role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
