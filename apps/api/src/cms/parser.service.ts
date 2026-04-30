import { Injectable } from '@nestjs/common';
import mammoth from 'mammoth';
import WordExtractor from 'word-extractor';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import type { ParseResult, ParsedChapter } from './types';

// Matches: "Chương 1", "Chương 2", "chapter 1", etc.
const CHAPTER_LINE =
  /^\s*(chapter|chap\.?|chương|chuong)\s*[:.-]?\s*(\d+)\b.*$/i;

@Injectable()
export class ParserService {
  async parse(file: Express.Multer.File): Promise<ParseResult> {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!['.txt', '.doc', '.docx'].includes(extension)) {
      return {
        chapters: [],
        warnings: [],
        errors: ['Only .txt, .doc, and .docx files are supported'],
      };
    }

    const rawText = await this.extractText(file, extension);
    // Normalize line endings, then force chapter markers and --- onto their own lines
    // so that files extracted as a single continuous blob are still parsed correctly.
    const normalized = this.normalizeStructure(rawText);
    const lines = normalized.split('\n');

    const chapters = this.extractChapters(lines);
    const warnings: string[] = [];

    if (chapters.length === 0) {
      warnings.push('No chapter markers found. Imported as a single chapter.');
      chapters.push({
        chapterNumber: 1,
        title: 'Chapter 1',
        postContent: normalized,
      });
    }

    return { chapters, warnings, errors: [] };
  }

  private async extractText(
    file: Express.Multer.File,
    extension: string,
  ): Promise<string> {
    if (extension === '.txt') {
      return file.buffer.toString('utf8');
    }
    if (extension === '.docx') {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value ?? '';
    }

    // .doc — detect format by magic bytes, try multiple strategies.
    const b0 = file.buffer[0];
    const b1 = file.buffer[1];
    const b2 = file.buffer[2];
    const b3 = file.buffer[3];
    const hexHead = `${b0?.toString(16).padStart(2, '0')} ${b1?.toString(16).padStart(2, '0')} ${b2?.toString(16).padStart(2, '0')} ${b3?.toString(16).padStart(2, '0')}`;
    console.log(`[CMS] .doc magic bytes: ${hexHead} | size: ${file.buffer.length}`);

    // 0. UTF-8 BOM (EF BB BF) — text saved by many Vietnamese editors
    //    Word "Web Page" format: BOM + <html ...>  → must strip HTML too
    if (b0 === 0xef && b1 === 0xbb && b2 === 0xbf) {
      const text = file.buffer.slice(3).toString('utf8');
      const head = text.trimStart().toLowerCase();
      if (head.startsWith('<html') || head.startsWith('<!')) {
        return this.stripHtml(text);
      }
      return text;
    }

    // 1. RTF: starts with "{\rtf"
    if (b0 === 0x7b && b1 === 0x5c) {
      const head6 = file.buffer.slice(0, 6).toString('ascii');
      if (head6.startsWith('{\\rtf')) {
        return this.stripRtf(file.buffer.toString('latin1'));
      }
    }

    // 2. OOXML zip (.docx named .doc): PK 0x50 0x4B
    if (b0 === 0x50 && b1 === 0x4b) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      if (result.value?.trim()) return result.value;
    }

    // 3. OLE2 binary .doc: D0 CF 11 E0
    if (b0 === 0xd0 && b1 === 0xcf && b2 === 0x11 && b3 === 0xe0) {
      const tmp = path.join(os.tmpdir(), `cms-import-${Date.now()}.doc`);
      try {
        fs.writeFileSync(tmp, file.buffer);
        const extractor = new WordExtractor();
        const doc = await extractor.extract(tmp);
        const body = doc.getBody() ?? '';
        if (body.trim()) return body;
      } catch (err) {
        console.warn('[CMS] word-extractor failed, trying mammoth fallback:', (err as Error).message);
      } finally {
        try { fs.unlinkSync(tmp); } catch { /* ignore */ }
      }
      // Fallback: some OLE2 .doc files can be read by mammoth
      try {
        const mResult = await mammoth.extractRawText({ buffer: file.buffer });
        if (mResult.value?.trim()) return mResult.value;
      } catch { /* ignore */ }
    }

    // 4. UTF-16 LE with BOM (FF FE)
    if (b0 === 0xff && b1 === 0xfe) {
      return file.buffer.slice(2).toString('utf16le');
    }

    // 5. UTF-16 BE with BOM (FE FF)
    if (b0 === 0xfe && b1 === 0xff) {
      return file.buffer.slice(2).swap16().toString('utf16le');
    }

    // 6. HTML saved as .doc (Word "Web Page" format)
    const headAscii = file.buffer.slice(0, 512).toString('utf8').trimStart().toLowerCase();
    if (headAscii.startsWith('<html') || headAscii.startsWith('<!')) {
      return this.stripHtml(file.buffer.toString('utf8'));
    }

    // 7. Plain UTF-8 text
    const asText = file.buffer.toString('utf8');
    const printableRatio =
      (asText.match(/[\x20-\x7E\u00C0-\u024F\u1E00-\u1EFF\n\r\t]/g) ?? []).length /
      asText.length;
    if (printableRatio > 0.5) {
      return asText;
    }

    // 8. Windows-1252 / Latin-1 encoded text
    const asLatin1 = file.buffer.toString('latin1');
    const latin1Ratio =
      (asLatin1.match(/[\x20-\x7E\x80-\xFF\n\r\t]/g) ?? []).length / asLatin1.length;
    if (latin1Ratio > 0.7) {
      return asLatin1;
    }

    throw new Error(
      `Không thể đọc file .doc này (magic: ${hexHead}). Vui lòng lưu lại dưới định dạng .docx hoặc .txt và thử lại.`,
    );
  }

  /**
   * Normalize raw extracted text so that chapter markers and --- separators
   * always start on their own lines.
   *
   * This is needed because some extractors (word-extractor, certain HTML
   * strippers) return text with missing paragraph breaks, producing one long
   * continuous line.  Without this step, the CHAPTER_LINE regex — anchored to
   * line start — would only match the very first chapter.
   */
  private normalizeStructure(raw: string): string {
    let t = raw
      .replace(/\r\n/g, '\n')  // Windows line endings
      .replace(/\r/g, '\n');   // old Mac line endings

    // Ensure --- separators occupy their own line
    t = t.replace(/[ \t]*---+[ \t]*/g, '\n---\n');

    // Ensure every chapter marker (Chapter N / Chương N / etc.) starts a new line.
    // The replacement puts a newline in FRONT of the matched keyword so that text
    // immediately before it (without a line break) is properly separated.
    //   "content Chương 1..." → "content\nChương 1..."
    t = t.replace(
      /((?:chapter|chap\.?|chương|chuong)\s*[:.-]?\s*\d+)/gi,
      '\n$1',
    );

    // Collapse 3+ blank lines into 2
    t = t.replace(/\n{3,}/g, '\n\n');

    return t.trim();
  }

  private stripRtf(rtf: string): string {
    let text = rtf.replace(/\{\\pict[^}]*\}/gi, '');
    text = text.replace(/\\u(-?\d+)\??/g, (_, n) =>
      String.fromCharCode(Number(n) < 0 ? Number(n) + 65536 : Number(n)),
    );
    text = text.replace(/\\'([0-9a-f]{2})/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
    text = text.replace(/\\par[d]?\b/gi, '\n');
    text = text.replace(/\\line\b/gi, '\n');
    text = text.replace(/\\tab\b/gi, '\t');
    text = text.replace(/\\\w+\*?[-\d]*/g, '');
    text = text.replace(/[{}]/g, '');
    text = text.replace(/[ \t]+/g, ' ');
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Extract chapters by chapter header lines ("Chương 1 ...", "Chapter 2 ...", etc.)
   */
  private extractChapters(lines: string[]): ParsedChapter[] {
    const markers: Array<{ index: number; line: string; number: number }> = [];

    lines.forEach((line, index) => {
      const match = line.match(CHAPTER_LINE);
      if (match) {
        markers.push({
          index,
          line: line.trim(),
          number: Number(match[2] || markers.length + 1),
        });
      }
    });

    if (markers.length === 0) return [];

    return markers.map((marker, idx) => {
      const nextMarkerIndex = markers[idx + 1]?.index ?? lines.length;
      const content = lines
        .slice(marker.index + 1, nextMarkerIndex)
        .join('\n')
        .trim();

      return {
        chapterNumber: marker.number,
        title: marker.line,
        postContent: content,
      };
    });
  }
}
