import { serialize } from 'php-serialize';
import { parsePurchasedChapters, parseVipPackage } from '../parse-wordpress';

describe('parse-wordpress', () => {
  it('parses VIP package JSON payload', () => {
    const result = parseVipPackage(
      100,
      JSON.stringify({
        vipLevelId: 3,
        packageType: 'monthly',
        isActive: true,
        purchaseDate: '2026-03-01T00:00:00.000Z',
        expiresAt: '2026-04-01T00:00:00.000Z',
      }),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.vipLevelId).toBe(3);
      expect(result.value.packageType).toBe('monthly');
      expect(result.value.isActive).toBe(true);
    }
  });

  it('fails for malformed serialized payload', () => {
    const result = parseVipPackage(101, 'not-serialized');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.sourceUserId).toBe(101);
      expect(result.failure.field).toBe('vip_package');
    }
  });

  it('parses purchased chapters JSON array', () => {
    const result = parsePurchasedChapters(
      102,
      JSON.stringify([
        {
          novelId: 10,
          chapterId: 1,
          pricePaid: 5,
          purchasedAt: '2026-03-10T00:00:00.000Z',
        },
        {
          novelId: 10,
          chapterId: 2,
          pricePaid: 5,
          purchasedAt: '2026-03-10T00:01:00.000Z',
        },
      ]),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0].chapterId).toBe(1);
    }
  });

  it('fails when purchases payload is not an array', () => {
    const result = parsePurchasedChapters(
      103,
      JSON.stringify({ chapterId: 1 }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.field).toBe('_purchased_chapters');
    }
  });
  it('parses PHP serialized purchases with numeric-key objects', () => {
    const payload = serialize({
      0: {
        truyen_id: 77,
        chapter_id: 8,
        price: '25',
        purchase_date: '2026-03-11T00:00:00.000Z',
      },
    });

    const result = parsePurchasedChapters(104, payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0].novelId).toBe(77);
      expect(result.value[0].chapterId).toBe(8);
      expect(result.value[0].pricePaid).toBe(25);
    }
  });

});
