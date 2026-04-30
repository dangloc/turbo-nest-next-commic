import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { getCookieValue, verifySessionToken } from './session-token';

const SESSION_COOKIE = 'commic_session';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request & { user?: { id: number; role: string } }, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const bearer = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : null;
    const cookieToken = getCookieValue(req.headers.cookie, SESSION_COOKIE);
    const token = bearer ?? cookieToken;

    if (token) {
      const parsed = verifySessionToken(token);
      if (parsed) {
        req.user = {
          id: parsed.id,
          role: parsed.role,
        };
      }
    }

    next();
  }
}
