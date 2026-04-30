import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function stableStringify(value: JsonValue): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return '[' + value.map((item) => stableStringify(item)).join(',') + ']';
  }

  const keys = Object.keys(value).sort();
  const entries = keys.map(
    (key) => JSON.stringify(key) + ':' + stableStringify(value[key] as JsonValue),
  );
  return '{' + entries.join(',') + '}';
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function computeSePayIpnSignature(
  payload: Record<string, unknown>,
  secretKey: string,
): string {
  const canonical = stableStringify(payload as JsonValue);
  return createHmac('sha256', secretKey).update(canonical).digest('hex');
}

@Injectable()
export class SePayIpnGuard implements CanActivate {
  private readonly logger = new Logger(SePayIpnGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | string[] | undefined>;
      body?: Record<string, unknown>;
      ip?: string;
    }>();

    const secretKey = process.env.SEPAY_SECRET_KEY;
    if (!secretKey) {
      this.logger.warn('IPN rejected: missing SEPAY_SECRET_KEY configuration');
      throw new UnauthorizedException('IPN signature verification unavailable');
    }

    const headers = request.headers ?? {};
    const signatureHeader =
      headers['x-sepay-signature'] ??
      headers['x-signature'] ??
      headers.signature ??
      headers['x-webhook-signature'];

    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;

    if (!signature || typeof signature !== 'string') {
      this.logger.warn(`IPN rejected: missing signature from ${request.ip ?? 'unknown-ip'}`);
      throw new UnauthorizedException('Missing IPN signature');
    }

    const body = request.body ?? {};
    const expectedHex = computeSePayIpnSignature(body, secretKey);
    const expectedBase64 = Buffer.from(expectedHex, 'hex').toString('base64');
    const normalized = signature.trim().toLowerCase();

    const isValid =
      safeEqual(normalized, expectedHex.toLowerCase()) ||
      safeEqual(signature.trim(), expectedBase64);

    if (!isValid) {
      this.logger.warn(`IPN rejected: invalid signature from ${request.ip ?? 'unknown-ip'}`);
      throw new UnauthorizedException('Invalid IPN signature');
    }

    return true;
  }
}
