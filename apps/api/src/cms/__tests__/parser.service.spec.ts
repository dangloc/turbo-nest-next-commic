import mammoth from 'mammoth';
import { ParserService } from '../parser.service';

jest.mock('mammoth', () => ({
  __esModule: true,
  default: {
    extractRawText: jest.fn(),
  },
}));

function file(input: {
  originalname: string;
  content: string;
}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: input.originalname,
    encoding: '7bit',
    mimetype: 'text/plain',
    size: Buffer.byteLength(input.content),
    buffer: Buffer.from(input.content, 'utf8'),
    destination: '',
    filename: input.originalname,
    path: '',
    stream: null as never,
  };
}

describe('ParserService', () => {
  const service = new ParserService();

  it('splits txt content by Chapter markers', async () => {
    const input = file({
      originalname: 'novel.txt',
      content: 'Chapter 1\nAlpha content\nChapter 2\nBeta content',
    });

    const result = await service.parse(input);

    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0]).toMatchObject({
      chapterNumber: 1,
      title: 'Chapter 1',
      postContent: 'Alpha content',
    });
    expect(result.chapters[1]).toMatchObject({
      chapterNumber: 2,
      title: 'Chapter 2',
      postContent: 'Beta content',
    });
  });

  it('recognizes Vietnamese chapter markers', async () => {
    const input = file({
      originalname: 'truyen.txt',
      content: 'Chương 1\nNội dung một\nChuong 2\nNội dung hai',
    });

    const result = await service.parse(input);

    expect(result.chapters).toHaveLength(2);
    expect(result.chapters[0].title).toBe('Chương 1');
    expect(result.chapters[1].title).toBe('Chuong 2');
  });

  it('returns single chapter with warning when no markers found', async () => {
    const input = file({
      originalname: 'plain.txt',
      content: 'Just some text with no chapter markers',
    });

    const result = await service.parse(input);

    expect(result.chapters).toHaveLength(1);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('returns validation error for unsupported extensions', async () => {
    const input = file({
      originalname: 'book.pdf',
      content: 'ignored',
    });

    const result = await service.parse(input);

    expect(result.errors).toContain('Only .txt, .doc, and .docx files are supported');
    expect(result.chapters).toHaveLength(0);
  });

  it('extracts chapters from docx via mammoth', async () => {
    const mocked = mammoth as unknown as { extractRawText: jest.Mock };
    mocked.extractRawText.mockResolvedValue({
      value: 'Chap. 1\nDoc chapter text',
    });

    const result = await service.parse(
      file({ originalname: 'doc-novel.docx', content: 'binary-placeholder' }),
    );

    expect(mocked.extractRawText).toHaveBeenCalled();
    expect(result.chapters).toHaveLength(1);
  });
});
