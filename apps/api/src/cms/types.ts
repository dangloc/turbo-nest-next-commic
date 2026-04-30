export interface ParsedChapter {
  chapterNumber: number;
  title: string;
  postContent: string;
}

export interface ParseResult {
  chapters: ParsedChapter[];
  warnings: string[];
  errors: string[];
}
