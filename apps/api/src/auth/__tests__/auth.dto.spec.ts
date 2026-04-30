import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';

describe('Auth DTOs', () => {
  it('normalizes and validates register payloads', () => {
    const dto = plainToInstance(RegisterDto, {
      username: '  Reader_One  ',
      email: '  READER@example.com  ',
      password: 'reader123',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
    expect(dto.username).toBe('reader_one');
    expect(dto.email).toBe('reader@example.com');
  });

  it('rejects weak register passwords', () => {
    const dto = plainToInstance(RegisterDto, {
      username: 'reader_one',
      email: 'reader@example.com',
      password: 'password',
    });

    const errors = validateSync(dto);
    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });

  it('rejects extra register fields when whitelist is enabled', () => {
    const dto = plainToInstance(RegisterDto, {
      username: 'reader_one',
      email: 'reader@example.com',
      password: 'reader123',
      extraField: 'ignored',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.some((error) => error.property === 'extraField')).toBe(true);
  });

  it('normalizes login identifier and rememberMe flag', () => {
    const dto = plainToInstance(LoginDto, {
      username: '  Reader@example.com  ',
      password: 'reader123',
      rememberMe: 'true',
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
    expect(dto.username).toBe('reader@example.com');
    expect(dto.rememberMe).toBe(true);
  });

  it('accepts WordPress-compatible long login passwords', () => {
    const dto = plainToInstance(LoginDto, {
      username: 'reader@example.com',
      password: 'a'.repeat(4096),
    });

    const errors = validateSync(dto);

    expect(errors).toHaveLength(0);
  });
});
