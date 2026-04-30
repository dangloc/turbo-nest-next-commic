import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type Prisma } from '@prisma/client';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma.service';
import { DASHBOARD_MODULES_KEY } from '../decorators/dashboard-modules.decorator';
import {
  getRoleDefaultAdminDashboardModules,
  getRoleDefaultAuthorDashboardModules,
  hasDashboardModuleAccess,
  isSuperAdminId,
  resolveDashboardAccess,
  type DashboardAccessModule,
} from '../dashboard-access';
import { ROLES_KEY } from '../decorators/roles.decorator';

type RequestUser = {
  id?: number;
  role?: string;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma?: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredDashboardModules = this.reflector.getAllAndOverride<
      DashboardAccessModule[]
    >(DASHBOARD_MODULES_KEY, [context.getHandler(), context.getClass()]);

    if (
      (!requiredRoles || requiredRoles.length === 0) &&
      (!requiredDashboardModules || requiredDashboardModules.length === 0)
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    if (isSuperAdminId(user.id)) {
      return true;
    }

    let resolvedRole = user.role;
    let dashboardUser: {
      id: number;
      role: string;
      adminDashboardModules: Prisma.JsonValue | null;
      authorDashboardModules: Prisma.JsonValue | null;
    } | null = null;

    if (
      (requiredRoles?.length || requiredDashboardModules?.length) &&
      this.prisma
    ) {
      dashboardUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          role: true,
          adminDashboardModules: true,
          authorDashboardModules: true,
        },
      });

      if (!dashboardUser) {
        throw new UnauthorizedException('Session user not found');
      }

      resolvedRole = dashboardUser.role;
      request.user = {
        ...user,
        role: resolvedRole,
      };
    }

    if (requiredRoles?.length && !resolvedRole) {
      throw new UnauthorizedException('Authentication required');
    }

    if (
      requiredRoles?.length &&
      !requiredRoles.includes(resolvedRole as string)
    ) {
      throw new ForbiddenException(
        `User role ${resolvedRole} insufficient for this operation`,
      );
    }

    if (requiredDashboardModules?.length) {
      if (!this.prisma || !dashboardUser) {
        throw new ForbiddenException(
          'Dashboard module access cannot be evaluated',
        );
      }

      const roleSettings = await this.prisma.adSettings?.findUnique({
        where: { id: 1 },
        select: {
          adminRoleDashboardModules: true,
          authorRoleDashboardModules: true,
        },
      });

      const access = resolveDashboardAccess(dashboardUser, {
        adminDashboardModules: getRoleDefaultAdminDashboardModules(
          roleSettings?.adminRoleDashboardModules,
        ),
        authorDashboardModules: getRoleDefaultAuthorDashboardModules(
          roleSettings?.authorRoleDashboardModules,
        ),
      });
      if (!hasDashboardModuleAccess(access, requiredDashboardModules)) {
        throw new ForbiddenException(
          'Dashboard module access insufficient for this operation',
        );
      }
    }

    return true;
  }
}
