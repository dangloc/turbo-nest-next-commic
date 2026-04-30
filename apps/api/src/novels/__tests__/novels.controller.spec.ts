import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DASHBOARD_MODULES_KEY } from '../../auth/decorators/dashboard-modules.decorator';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { NovelsController } from '../novels.controller';

describe('NovelsController RBAC integration', () => {
  const novelsService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  } as any;

  let controller: NovelsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new NovelsController(novelsService);
  });

  function guardFor(roles: string[]) {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === ROLES_KEY) {
          return roles;
        }

        if (key === DASHBOARD_MODULES_KEY) {
          return undefined;
        }

        return undefined;
      }),
    } as unknown as Reflector;
    return new RolesGuard(reflector);
  }

  function contextWithRole(role: string): any {
    return {
      getHandler: () => 'handler',
      getClass: () => 'classRef',
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 10, role } }),
      }),
    };
  }

  it('passes paginated list queries and requester id to the service', async () => {
    novelsService.findAll.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    await expect(
      controller.findAll({ user: { id: 44, role: 'AUTHOR' } }, {
        q: 'alpha',
        scope: 'mine',
        sort: 'title',
        page: 2,
        pageSize: 5,
      } as any),
    ).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: 10,
    });

    expect(novelsService.findAll).toHaveBeenCalledWith(
      {
        q: 'alpha',
        scope: 'mine',
        sort: 'title',
        page: 2,
        pageSize: 5,
      },
      { id: 44, role: 'AUTHOR' },
    );
  });

  it('allows ADMIN to create, update, and delete novels', async () => {
    novelsService.create.mockResolvedValue({
      id: 3,
      title: 'T',
      postContent: 'C',
    });
    novelsService.update.mockResolvedValue({
      id: 3,
      title: 'T2',
      postContent: 'C2',
    });
    novelsService.remove.mockResolvedValue({ id: 3 });

    const createGuard = guardFor(['ADMIN', 'AUTHOR']);
    const updateGuard = guardFor(['ADMIN', 'AUTHOR']);
    const deleteGuard = guardFor(['ADMIN', 'AUTHOR']);

    await expect(
      createGuard.canActivate(contextWithRole('ADMIN')),
    ).resolves.toBe(true);
    await expect(
      updateGuard.canActivate(contextWithRole('ADMIN')),
    ).resolves.toBe(true);
    await expect(
      deleteGuard.canActivate(contextWithRole('ADMIN')),
    ).resolves.toBe(true);

    await expect(
      controller.create(
        { user: { id: 10, role: 'ADMIN' } },
        { title: 'T', postContent: 'C' },
      ),
    ).resolves.toEqual({ id: 3, title: 'T', postContent: 'C' });
    await expect(
      controller.update({ user: { id: 10, role: 'ADMIN' } }, 3, {
        title: 'T2',
        postContent: 'C2',
      }),
    ).resolves.toEqual({ id: 3, title: 'T2', postContent: 'C2' });
    await expect(
      controller.remove({ user: { id: 10, role: 'ADMIN' } }, 3),
    ).resolves.toEqual({ id: 3 });
  });

  it('allows AUTHOR to create, update, and delete novels', async () => {
    novelsService.create.mockResolvedValue({
      id: 5,
      title: 'A',
      postContent: 'B',
    });
    novelsService.update.mockResolvedValue({
      id: 5,
      title: 'A2',
      postContent: 'B2',
    });
    novelsService.remove.mockResolvedValue({ id: 5 });

    const createGuard = guardFor(['ADMIN', 'AUTHOR']);
    const updateGuard = guardFor(['ADMIN', 'AUTHOR']);
    const deleteGuard = guardFor(['ADMIN', 'AUTHOR']);

    await expect(
      createGuard.canActivate(contextWithRole('AUTHOR')),
    ).resolves.toBe(true);
    await expect(
      updateGuard.canActivate(contextWithRole('AUTHOR')),
    ).resolves.toBe(true);
    await expect(
      deleteGuard.canActivate(contextWithRole('AUTHOR')),
    ).resolves.toBe(true);

    await expect(
      controller.create(
        { user: { id: 11, role: 'AUTHOR' } },
        { title: 'A', postContent: 'B' },
      ),
    ).resolves.toEqual({ id: 5, title: 'A', postContent: 'B' });
    await expect(
      controller.update({ user: { id: 11, role: 'AUTHOR' } }, 5, {
        title: 'A2',
        postContent: 'B2',
      }),
    ).resolves.toEqual({ id: 5, title: 'A2', postContent: 'B2' });
    await expect(
      controller.remove({ user: { id: 11, role: 'AUTHOR' } }, 5),
    ).resolves.toEqual({ id: 5 });
  });

  it('rejects USER from creating novels', async () => {
    const createGuard = guardFor(['ADMIN', 'AUTHOR']);

    await expect(
      createGuard.canActivate(contextWithRole('USER')),
    ).rejects.toThrow(ForbiddenException);
  });
});
