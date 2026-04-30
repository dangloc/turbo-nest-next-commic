import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DashboardModules, Roles, RolesGuard } from '../auth';
import { isSuperAdminId } from '../auth/dashboard-access';
import {
  AdSettingsService,
  type UpdateAdSettingsInput,
} from './ad-settings.service';

@Controller()
@DashboardModules('settings')
export class AdSettingsController {
  constructor(private readonly adSettingsService: AdSettingsService) {}

  private assertSuperAdmin(userId: number | undefined) {
    if (!isSuperAdminId(userId)) {
      throw new ForbiddenException(
        'Only super admin can manage dashboard role settings',
      );
    }
  }

  @Get('ad-settings/public')
  async getPublicSettings() {
    return this.adSettingsService.getPublicSettings();
  }

  @Get('admin/ad-settings')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getAdminSettings() {
    return this.adSettingsService.getAdminSettings();
  }

  @Patch('admin/ad-settings')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async updateAdminSettings(
    @Req() req: { user?: { id?: number } },
    @Body() body: UpdateAdSettingsInput,
  ) {
    if (
      body.adminRoleDashboardModules !== undefined ||
      body.authorRoleDashboardModules !== undefined
    ) {
      this.assertSuperAdmin(req.user?.id);
    }

    const adSettingsBody: UpdateAdSettingsInput = { ...body };
    delete adSettingsBody.adminRoleDashboardModules;
    delete adSettingsBody.authorRoleDashboardModules;

    return this.adSettingsService.updateSettings(adSettingsBody);
  }

  @Get('admin/dashboard-role-settings')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async getDashboardRoleSettings(@Req() req: { user?: { id?: number } }) {
    this.assertSuperAdmin(req.user?.id);

    const settings = await this.adSettingsService.getAdminSettings();

    return {
      adminRoleDashboardModules: settings.adminRoleDashboardModules,
      authorRoleDashboardModules: settings.authorRoleDashboardModules,
    };
  }

  @Patch('admin/dashboard-role-settings')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  async updateDashboardRoleSettings(
    @Req() req: { user?: { id?: number } },
    @Body()
    body: Pick<
      UpdateAdSettingsInput,
      'adminRoleDashboardModules' | 'authorRoleDashboardModules'
    >,
  ) {
    this.assertSuperAdmin(req.user?.id);

    const settings = await this.adSettingsService.updateSettings(body);

    return {
      adminRoleDashboardModules: settings.adminRoleDashboardModules,
      authorRoleDashboardModules: settings.authorRoleDashboardModules,
    };
  }
}
