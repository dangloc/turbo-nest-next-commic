import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

type Bucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class AuthRateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  consume(kind: 'login' | 'register', key: string) {
    const config =
      kind === 'login'
        ? { maxAttempts: 20, windowMs: 10 * 60 * 1000 }
        : { maxAttempts: 10, windowMs: 15 * 60 * 1000 };

    const now = Date.now();
    const bucketKey = `${kind}:${key}`;
    const current = this.buckets.get(bucketKey);

    if (!current || current.resetAt <= now) {
      this.buckets.set(bucketKey, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      return;
    }

    if (current.count >= config.maxAttempts) {
      throw new HttpException(
        `Too many ${kind} attempts. Please try again later.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    current.count += 1;
  }
}
