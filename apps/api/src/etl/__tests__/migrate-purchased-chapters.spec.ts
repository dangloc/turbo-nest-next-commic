import { QuarantineRepository } from '../quarantine-repository';
import { migratePurchasedChapters } from '../migrate-purchased-chapters';

describe('migrate-purchased-chapters', () => {
  it('chunks per user and skips quarantined users', async () => {
    const writes: number[] = [];
    const quarantineRepo = new QuarantineRepository();

    const result = await migratePurchasedChapters(
      [
        {
          userId: 1,
          purchasesRaw: JSON.stringify([
            {
              novelId: 10,
              chapterId: 1,
              pricePaid: 1,
              purchasedAt: '2026-04-01T00:00:00.000Z',
            },
            {
              novelId: 10,
              chapterId: 2,
              pricePaid: 1,
              purchasedAt: '2026-04-01T00:01:00.000Z',
            },
          ]),
        },
        {
          userId: 2,
          purchasesRaw: JSON.stringify([
            {
              novelId: 11,
              chapterId: 3,
              pricePaid: 1,
              purchasedAt: '2026-04-01T00:02:00.000Z',
            },
          ]),
        },
      ],
      {
        repo: {
          createMany(rows) {
            writes.push(rows.length);
            return Promise.resolve(rows.length);
          },
        },
        chunkSize: 1,
        quarantinedUserIds: new Set([2]),
        quarantineRepo,
        validNovelIds: new Set([10]),
        validChapterIds: new Set([1, 2]),
      },
    );

    expect(result.skippedUsers).toBe(1);
    expect(result.chaptersInserted).toBe(2);
    expect(writes).toEqual([1, 1]);
  });

  it('skips purchases whose chapter ids are missing from the loaded catalog', async () => {
    const writes: Array<unknown[]> = [];
    const quarantineRepo = new QuarantineRepository();

    const result = await migratePurchasedChapters(
      [
        {
          userId: 1,
          purchasesRaw: JSON.stringify([
            {
              novelId: 10,
              chapterId: 1,
              pricePaid: 1,
              purchasedAt: '2026-04-01T00:00:00.000Z',
            },
            {
              novelId: 10,
              chapterId: 99,
              pricePaid: 1,
              purchasedAt: '2026-04-01T00:01:00.000Z',
            },
          ]),
        },
      ],
      {
        repo: {
          createMany(rows) {
            writes.push(rows);
            return Promise.resolve(rows.length);
          },
        },
        quarantinedUserIds: new Set(),
        quarantineRepo,
        validNovelIds: new Set([10]),
        validChapterIds: new Set([1]),
      },
    );

    expect(result.chaptersInserted).toBe(1);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toHaveLength(1);
    expect((writes[0][0] as { chapterId: number }).chapterId).toBe(1);
  });
});
