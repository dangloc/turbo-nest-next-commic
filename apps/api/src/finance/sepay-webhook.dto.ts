import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

function normalizeString({ value }: { value: unknown }) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim();
}

export class SePayWebhookDto {
  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  gateway!: string;

  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  transactionDate!: string;

  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  accountNumber!: string;

  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  subAccount!: string;

  @Transform(normalizeString)
  @IsString()
  @IsIn(['in'])
  transferType!: 'in';

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  transferAmount!: number;

  @Type(() => Number)
  @IsNumber()
  accumulated!: number;

  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  code!: string;

  @Transform(normalizeString)
  @IsString()
  @IsNotEmpty()
  content!: string;

  @Transform(normalizeString)
  @IsOptional()
  @IsString()
  referenceCode?: string;
}
