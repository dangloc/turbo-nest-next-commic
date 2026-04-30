import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, Matches } from 'class-validator';

function normalizeUsername({ value }: { value: unknown }) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().toLowerCase();
}

function normalizeEmail({ value }: { value: unknown }) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().toLowerCase();
}

export class RegisterDto {
  @Transform(normalizeUsername)
  @IsString()
  @Length(3, 32)
  @Matches(/^[a-z0-9._-]+$/i, {
    message:
      'username may only contain letters, numbers, dots, underscores, and hyphens',
  })
  username!: string;

  @Transform(normalizeEmail)
  @IsEmail()
  email!: string;

  @IsString()
  @Length(8, 128)
  @Matches(/[A-Za-z]/, {
    message: 'password must contain at least one letter',
  })
  @Matches(/\d/, { message: 'password must contain at least one number' })
  password!: string;
}
