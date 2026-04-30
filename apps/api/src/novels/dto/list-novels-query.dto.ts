import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

export const NOVEL_LIST_SCOPE = ['all', 'mine', 'others'] as const;
export type NovelListScope = (typeof NOVEL_LIST_SCOPE)[number];

export const NOVEL_LIST_SORT = ['newest', 'oldest', 'title', 'views'] as const;
export type NovelListSort = (typeof NOVEL_LIST_SORT)[number];

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  return (allowed as readonly string[]).includes(normalized) ? (normalized as T) : undefined;
}

function normalizePositiveInteger(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
}

export class ListNovelsQueryDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => normalizeText(value))
  q?: string;

  @IsOptional()
  @IsIn(NOVEL_LIST_SCOPE)
  @Transform(({ value }) => normalizeEnum(value, NOVEL_LIST_SCOPE))
  scope?: NovelListScope;

  @IsOptional()
  @IsIn(NOVEL_LIST_SORT)
  @Transform(({ value }) => normalizeEnum(value, NOVEL_LIST_SORT))
  sort?: NovelListSort;

  @IsOptional()
  @Transform(({ value }) => normalizePositiveInteger(value))
  page?: number;

  @IsOptional()
  @Transform(({ value }) => normalizePositiveInteger(value))
  pageSize?: number;
}
