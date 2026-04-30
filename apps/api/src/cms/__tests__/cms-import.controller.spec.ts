import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  CmsImportController,
  cmsImportFileFilter,
} from '../cms-import.controller';

describe('CmsImportController', () => {
  const service = {
    importChapters: jest.fn(),
  };

  const controller = new CmsImportController(service as any);

  const file = {
    fieldname: 'file',
    originalname: 'novel.txt',
    encoding: '7bit',
    mimetype: 'text/plain',
    size: 10,
    buffer: Buffer.from('x'),
    destination: '',
    filename: 'novel.txt',
    path: '',
    stream: null as never,
  } as Express.Multer.File;

  it('rejects unsupported file extension in multer filter', () => {
    const cb = jest.fn();
    cmsImportFileFilter({}, { ...file, originalname: 'x.pdf' }, cb);

    expect(cb).toHaveBeenCalled();
    expect(cb.mock.calls[0]?.[0]).toBeInstanceOf(BadRequestException);
  });

  it('throws when file is missing', async () => {
    await expect(
      controller.importChapters(1, undefined),
    ).rejects.toThrow(BadRequestException);
  });

  it('delegates to service with novelId and file', async () => {
    const payload = {
      novelId: 11,
      chaptersCreated: [{ id: 21, chapterNumber: 1, title: 'Chapter 1' }],
      errors: [],
      warnings: [],
    };
    service.importChapters.mockResolvedValue(payload);

    await expect(
      controller.importChapters(11, file),
    ).resolves.toEqual(payload);
    expect(service.importChapters).toHaveBeenCalledWith(11, file);
  });

  it('roles guard denies USER and requires authentication', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN', 'AUTHOR']),
    } as unknown as Reflector;

    const guard = new RolesGuard(reflector);
    const userCtx = {
      getHandler: () => 'handler',
      getClass: () => 'classRef',
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 1, role: 'USER' } }),
      }),
    };
    const noUserCtx = {
      getHandler: () => 'handler',
      getClass: () => 'classRef',
      switchToHttp: () => ({ getRequest: () => ({}) }),
    };

    expect(() => guard.canActivate(userCtx as any)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(noUserCtx as any)).toThrow(
      UnauthorizedException,
    );
  });
});
