import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

const AUTHOR_APPLICATION_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;

function normalizeOptionalString({ value }: { value: unknown }) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizePositiveInteger({ value }: { value: unknown }) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeStatus({ value }: { value: unknown }) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  return (AUTHOR_APPLICATION_STATUS as readonly string[]).includes(normalized)
    ? normalized
    : undefined;
}

export class ListAuthorApplicationsQueryDto {
  @Transform(normalizeStatus)
  @IsOptional()
  @IsIn(AUTHOR_APPLICATION_STATUS)
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';

  @Transform(normalizeOptionalString)
  @IsOptional()
  @IsString()
  search?: string;

  @Transform(normalizePositiveInteger)
  @IsOptional()
  page?: number;

  @Transform(normalizePositiveInteger)
  @IsOptional()
  pageSize?: number;
}
