import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CmsImportService } from '../cms-import.service';

function file(name: string): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: name,
    encoding: '7bit',
    mimetype: 'text/plain',
    size: 5,
    buffer: Buffer.from('hello', 'utf8'),
    destination: '',
    filename: name,
    path: '',
    stream: null as never,
  };
}

describe('CmsImportService', () => {
  it('appends chapters to an existing novel in a single transaction', async () => {
    const parserService = {
      parse: jest.fn().mockResolvedValue({
        chapters: [
          { chapterNumber: 1, title: 'Chapter 1', postContent: 'A' },
          { chapterNumber: 2, title: 'Chapter 2', postContent: 'B' },
        ],
        warnings: [],
        errors: [],
      }),
    };

    const tx = {
      chapter: {
        findFirst: jest.fn().mockResolvedValue({ id: 1000 }),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };

    const prisma = {
      novel: { findUnique: jest.fn().mockResolvedValue({ id: 5 }) },
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(tx)),
    };

    const service = new CmsImportService(parserService as any, prisma as any);
    const result = await service.importChapters(5, file('chapters.txt'));

    expect(result.novelId).toBe(5);
    expect(result.errors).toEqual([]);
    expect(result.chaptersCreated).toHaveLength(2);
    expect(tx.chapter.createMany).toHaveBeenCalled();
  });

  it('throws NotFoundException when novel does not exist', async () => {
    const parserService = { parse: jest.fn() };
    const prisma = {
      novel: { findUnique: jest.fn().mockResolvedValue(null) },
    };

    const service = new CmsImportService(parserService as any, prisma as any);
    await expect(service.importChapters(99, file('x.txt'))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws BadRequestException when parser returns errors', async () => {
    const parserService = {
      parse: jest.fn().mockResolvedValue({
        chapters: [],
        warnings: [],
        errors: ['Only .txt, .doc, and .docx files are supported'],
      }),
    };
    const prisma = {
      novel: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
      $transaction: jest.fn(),
    };

    const service = new CmsImportService(parserService as any, prisma as any);
    await expect(service.importChapters(1, file('book.pdf'))).rejects.toThrow(
      BadRequestException,
    );
  });
});
