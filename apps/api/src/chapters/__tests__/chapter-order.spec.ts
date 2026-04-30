import {
  getChapterNumberFromTitle,
  sortChaptersByReadableOrder,
} from '../chapter-order';

describe('chapter readable ordering', () => {
  it('extracts Vietnamese and English chapter numbers from title text', () => {
    expect(getChapterNumberFromTitle('Chương 51')).toBe(51);
    expect(getChapterNumberFromTitle('Chapter 12: Title')).toBe(12);
    expect(getChapterNumberFromTitle('Ngoại truyện')).toBeNull();
  });

  it('sorts chapters by the number embedded in the title first', () => {
    const chapters = [
      { id: 3, title: 'Chương 100', chapterNumber: 1 },
      { id: 1, title: 'Chương 51', chapterNumber: 10 },
      { id: 2, title: 'Chương 52', chapterNumber: 5 },
    ];

    expect(sortChaptersByReadableOrder(chapters).map((chapter) => chapter.id)).toEqual([
      1,
      2,
      3,
    ]);
  });
});
