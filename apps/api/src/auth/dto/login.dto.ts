import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

function normalizeIdentifier({ value }: { value: unknown }) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().toLowerCase();
}

function normalizeRememberMe({ value }: { value: unknown }) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 'true' || value === 1 || value === '1') {
    return true;
  }

  if (value === false || value === 'false' || value === 0 || value === '0') {
    return false;
  }

  return value;
}

export class LoginDto {
  @Transform(normalizeIdentifier)
  @IsString()
  @Length(3, 254)
  username!: string;

  @IsString()
  @Length(1, 4096)
  password!: string;

  @Transform(normalizeRememberMe)
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
