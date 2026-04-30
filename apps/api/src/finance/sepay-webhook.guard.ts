import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class SePayWebhookAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers?: Record<string, string | string[] | undefined> }>();
    const header = request.headers?.authorization;
    const token = Array.isArray(header) ? header[0] : header;
    const expected = process.env.SEPAY_WEBHOOK_TOKEN;

    if (!expected) {
      throw new UnauthorizedException('SePay webhook token not configured');
    }

    if (!token || !token.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid Authorization header');
    }

    const provided = token.slice('Bearer '.length).trim();
    if (provided !== expected) {
      throw new UnauthorizedException('Invalid SePay webhook token');
    }

    return true;
  }
}
