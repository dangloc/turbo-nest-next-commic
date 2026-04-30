import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ChaptersController } from '../chapters.controller';

describe('ChaptersController RBAC integration', () => {
  const chaptersService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  } as any;

  let controller: ChaptersController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ChaptersController(chaptersService);
  });

  function guardFor(roles: string[]) {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(roles),
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

  it('allows ADMIN to create, update, and delete chapters', async () => {
    chaptersService.create.mockResolvedValue({ id: 101, novelId: 9 });
    chaptersService.update.mockResolvedValue({ id: 101, title: 'U' });
    chaptersService.remove.mockResolvedValue({ id: 101 });

    const createGuard = guardFor(['ADMIN', 'AUTHOR']);
    const updateGuard = guardFor(['ADMIN', 'AUTHOR']);
    const deleteGuard = guardFor(['ADMIN', 'AUTHOR']);

    expect(createGuard.canActivate(contextWithRole('ADMIN'))).toBe(true);
    expect(updateGuard.canActivate(contextWithRole('ADMIN'))).toBe(true);
    expect(deleteGuard.canActivate(contextWithRole('ADMIN'))).toBe(true);

    await expect(
      controller.create(
        9,
        { user: { id: 1, role: 'ADMIN' } },
        { title: 'C1', postContent: 'Body' },
      ),
    ).resolves.toEqual({ id: 101, novelId: 9 });

    await expect(
      controller.update(101, { user: { id: 1, role: 'ADMIN' } }, { title: 'U' }),
    ).resolves.toEqual({ id: 101, title: 'U' });

    await expect(
      controller.remove(101, { user: { id: 1, role: 'ADMIN' } }),
    ).resolves.toEqual({ id: 101 });
  });

  it('allows AUTHOR to create, update, and delete chapters', async () => {
    chaptersService.create.mockResolvedValue({ id: 202, novelId: 10 });
    chaptersService.update.mockResolvedValue({ id: 202, title: 'U2' });
    chaptersService.remove.mockResolvedValue({ id: 202 });

    const createGuard = guardFor(['ADMIN', 'AUTHOR']);
    const updateGuard = guardFor(['ADMIN', 'AUTHOR']);
    const deleteGuard = guardFor(['ADMIN', 'AUTHOR']);

    expect(createGuard.canActivate(contextWithRole('AUTHOR'))).toBe(true);
    expect(updateGuard.canActivate(contextWithRole('AUTHOR'))).toBe(true);
    expect(deleteGuard.canActivate(contextWithRole('AUTHOR'))).toBe(true);

    await expect(
      controller.create(
        10,
        { user: { id: 7, role: 'AUTHOR' } },
        { title: 'C2', postContent: 'Body2' },
      ),
    ).resolves.toEqual({ id: 202, novelId: 10 });

    await expect(
      controller.update(
        202,
        { user: { id: 7, role: 'AUTHOR' } },
        { title: 'U2' },
      ),
    ).resolves.toEqual({ id: 202, title: 'U2' });

    await expect(
      controller.remove(202, { user: { id: 7, role: 'AUTHOR' } }),
    ).resolves.toEqual({ id: 202 });
  });

  it('rejects USER from chapter management routes', () => {
    const createGuard = guardFor(['ADMIN', 'AUTHOR']);

    expect(() => createGuard.canActivate(contextWithRole('USER'))).toThrow(
      ForbiddenException,
    );
  });
});
