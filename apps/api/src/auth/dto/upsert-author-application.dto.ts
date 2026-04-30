import { Transform } from 'class-transformer';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

function normalizeRequiredString({ value }: { value: unknown }) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim();
}

function normalizeOptionalString({ value }: { value: unknown }) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export class UpsertAuthorApplicationDto {
  @Transform(normalizeRequiredString)
  @IsString()
  @Length(2, 80)
  penName!: string;

  @Transform(normalizeOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @Transform(normalizeRequiredString)
  @IsString()
  @Length(5, 255)
  facebookUrl!: string;

  @Transform(normalizeOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  telegramUrl?: string;

  @Transform(normalizeOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(80)
  otherPlatformName?: string;

  @Transform(normalizeOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  otherPlatformUrl?: string;

  @Transform(normalizeRequiredString)
  @IsString()
  @Length(2, 120)
  bankAccountName!: string;

  @Transform(normalizeRequiredString)
  @IsString()
  @Length(4, 40)
  bankAccountNumber!: string;

  @Transform(normalizeRequiredString)
  @IsString()
  @Length(2, 120)
  bankName!: string;

  @Transform(normalizeOptionalString)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankBranch?: string;
}
