import { SetMetadata } from '@nestjs/common';
import type { DashboardAccessModule } from '../dashboard-access';

export const DASHBOARD_MODULES_KEY = 'dashboardModules';

export const DashboardModules = (...modules: DashboardAccessModule[]) =>
  SetMetadata(DASHBOARD_MODULES_KEY, modules);
