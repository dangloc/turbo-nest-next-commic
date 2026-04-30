import { createHmac, timingSafeEqual } from 'crypto';
import { Role } from '@prisma/client';

export type SessionTokenPayload = {
  id: number;
  email: string;
  role: Role;
  iat: number;
  exp: number;
};

const DEFAULT_SESSION_SECRET =
  'dev-only-session-secret-change-this-in-production';

function getSessionSecret() {
  return process.env.AUTH_SESSION_SECRET ?? DEFAULT_SESSION_SECRET;
}

function signPayload(payloadBase64: string) {
  return createHmac('sha256', getSessionSecret())
    .update(payloadBase64)
    .digest('base64url');
}

export function createSessionToken(
  payload: Pick<SessionTokenPayload, 'id' | 'email' | 'role'>,
  maxAgeMs: number,
) {
  const now = Date.now();
  const tokenPayload: SessionTokenPayload = {
    ...payload,
    iat: now,
    exp: now + maxAgeMs,
  };

  const payloadBase64 = Buffer.from(
    JSON.stringify(tokenPayload),
    'utf8',
  ).toString('base64url');
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

export function verifySessionToken(value: string) {
  const [payloadBase64, signature] = value.split('.');
  if (!payloadBase64 || !signature) {
    return null;
  }

  const expected = signPayload(payloadBase64);
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');
  if (expectedBuffer.length !== signatureBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadBase64, 'base64url').toString('utf8'),
    ) as SessionTokenPayload;

    if (
      typeof parsed?.id !== 'number' ||
      typeof parsed?.email !== 'string' ||
      typeof parsed?.role !== 'string' ||
      typeof parsed?.iat !== 'number' ||
      typeof parsed?.exp !== 'number'
    ) {
      return null;
    }

    if (parsed.exp <= Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getCookieValue(rawCookie: string | undefined, key: string) {
  if (!rawCookie) {
    return null;
  }

  const target = `${key}=`;
  const part = rawCookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(target));

  return part ? part.slice(target.length) : null;
}
