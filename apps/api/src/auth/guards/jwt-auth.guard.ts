import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { id?: number } }>();

    if (!Number.isInteger(request.user?.id) || (request.user?.id ?? 0) <= 0) {
      throw new UnauthorizedException('Authentication required');
    }

    return true;
  }
}
