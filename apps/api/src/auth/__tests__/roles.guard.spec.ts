import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { DASHBOARD_MODULES_KEY } from '../decorators/dashboard-modules.decorator';
import { RolesGuard } from '../guards/roles.guard';

describe('RolesGuard', () => {
  it('resolves the current role from the database instead of trusting a stale token role', async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === ROLES_KEY) {
          return ['AUTHOR'];
        }

        if (key === DASHBOARD_MODULES_KEY) {
          return undefined;
        }

        return undefined;
      }),
    } as unknown as Reflector;

    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 9,
          role: 'AUTHOR',
          adminDashboardModules: null,
          authorDashboardModules: null,
        }),
      },
    } as any;

    const request = {
      user: {
        id: 9,
        role: 'USER',
      },
    };
    const context = {
      getHandler: () => 'handler',
      getClass: () => 'classRef',
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    };

    const guard = new RolesGuard(reflector, prisma);

    await expect(guard.canActivate(context as any)).resolves.toBe(true);
    expect(request.user.role).toBe('AUTHOR');
  });
});
