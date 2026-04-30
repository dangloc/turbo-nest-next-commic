import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

function trimString({ value }: { value: unknown }) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim();
}

export class InitSePayCheckoutDto {
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  orderInvoiceNumber!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1000)
  orderAmount!: number;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  orderDescription?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsIn(['VND'])
  currency?: 'VND';

  @Transform(trimString)
  @IsOptional()
  @IsString()
  @IsIn(['BANK_TRANSFER', 'NAPAS_BANK_TRANSFER'])
  paymentMethod?: 'BANK_TRANSFER' | 'NAPAS_BANK_TRANSFER';

  @Transform(trimString)
  @IsOptional()
  @IsString()
  successUrl?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  errorUrl?: string;

  @Transform(trimString)
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}
