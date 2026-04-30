import { unserialize } from 'php-serialize';
import type {
  ParseFailure,
  ParseResult,
  ParsedChapterPurchase,
  ParsedVipPackage,
} from './types';

type SerializedRecord = Record<string, unknown>;

function asRecord(value: unknown): SerializedRecord | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as SerializedRecord;
  }
  return null;
}

function asString(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toDate(value: unknown, fallback: Date): Date {
  const d = new Date(asString(value, ''));
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function decodeRaw(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error('Empty serialized payload');
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      return unserialize(trimmed);
    } catch {
      throw new Error('Unrecognized serialized payload format');
    }
  }
}

function normalizeArrayLike(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  const record = asRecord(value);
  if (!record) {
    return [];
  }

  return Object.keys(record)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => record[key]);
}

export function parseVipPackage(
  sourceUserId: number,
  raw: string,
): ParseResult<ParsedVipPackage> {
  try {
    const decoded = decodeRaw(raw);
    const record = asRecord(decoded);
    if (!record) {
      throw new Error('VIP payload is not an object');
    }

    const packageType = asString(
      record.packageType ?? record.package_type ?? record.type,
      'unknown',
    );

    const purchaseDate = toDate(
      record.purchaseDate ?? record.purchase_date,
      new Date(0),
    );

    const expiryRaw =
      record.expiresAt ?? record.expiry_date ?? record.expiryDate;
    const expiryStr = asString(expiryRaw, '');
    const expiresAt =
      !expiryRaw || expiryStr.toLowerCase() === 'permanent'
        ? null
        : toDate(expiryRaw, new Date(0));

    const activeRaw = record.isActive ?? record.is_active ?? record.active;
    const isActive =
      activeRaw !== undefined
        ? Boolean(activeRaw)
        : expiresAt === null || expiresAt.getTime() > Date.now();

    let vipLevelId = toNumber(
      record.vipLevelId ?? record.vip_level_id ?? record.level,
      0,
    );
    if (vipLevelId <= 0) {
      // Derive a stable fallback from package naming when explicit level is absent.
      if (packageType.includes('3_month')) vipLevelId = 3;
      else if (packageType.includes('permanent')) vipLevelId = 9;
      else if (packageType.includes('vip_')) vipLevelId = 1;
    }

    return {
      ok: true,
      value: {
        vipLevelId,
        packageType,
        isActive,
        purchaseDate,
        expiresAt,
      },
    };
  } catch (error) {
    const failure: ParseFailure = {
      sourceUserId,
      field: 'vip_package',
      reason: (error as Error).message,
      raw,
    };
    return { ok: false, failure };
  }
}

export function parsePurchasedChapters(
  sourceUserId: number,
  raw: string,
): ParseResult<ParsedChapterPurchase[]> {
  try {
    const decoded = decodeRaw(raw);
    const rows = normalizeArrayLike(decoded);
    if (rows.length === 0) {
      throw new Error('Purchased chapters payload must decode to an array');
    }

    const out: ParsedChapterPurchase[] = rows.map((item) => {
      const row = asRecord(item);
      if (!row) {
        throw new Error('Chapter purchase row must be an object');
      }
      return {
        novelId: toNumber(row.novelId ?? row.novel_id ?? row.truyen_id),
        chapterId: toNumber(row.chapterId ?? row.chapter_id),
        pricePaid: toNumber(row.pricePaid ?? row.price_paid ?? row.price),
        purchasedAt: toDate(
          row.purchasedAt ?? row.purchased_at ?? row.purchase_date ?? row.time,
          new Date(0),
        ),
      };
    });

    return { ok: true, value: out };
  } catch (error) {
    const failure: ParseFailure = {
      sourceUserId,
      field: '_purchased_chapters',
      reason: (error as Error).message,
      raw,
    };
    return { ok: false, failure };
  }
}
