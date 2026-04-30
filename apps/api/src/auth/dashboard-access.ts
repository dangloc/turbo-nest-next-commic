import { Role, type Prisma } from '@prisma/client';

export const ADMIN_DASHBOARD_MODULES = [
  'overview',
  'users',
  'author',
  'novels',
  'terms',
  'wallets',
  'settings',
] as const;

export const AUTHOR_DASHBOARD_MODULES = [
  'author',
  'novels',
  'terms',
  'earnings',
] as const;

export type AdminDashboardModule = (typeof ADMIN_DASHBOARD_MODULES)[number];
export type AuthorDashboardModule = (typeof AUTHOR_DASHBOARD_MODULES)[number];
export type DashboardAccessModule =
  | AdminDashboardModule
  | AuthorDashboardModule;

type DashboardAccessSource = {
  id: number;
  role: Role | string;
  adminDashboardModules?: Prisma.JsonValue | null;
  authorDashboardModules?: Prisma.JsonValue | null;
};

export interface DashboardRoleDefaults {
  adminDashboardModules?: readonly AdminDashboardModule[];
  authorDashboardModules?: readonly AuthorDashboardModule[];
}

export interface DashboardAccess {
  isSuperAdmin: boolean;
  adminDashboardModules: AdminDashboardModule[];
  authorDashboardModules: AuthorDashboardModule[];
  hasDashboardAccess: boolean;
}

function uniqueStrings<T extends string>(
  values: readonly unknown[],
  allowed: readonly T[],
) {
  const allowedSet = new Set<string>(allowed);
  const normalized: T[] = [];

  for (const value of values) {
    if (typeof value !== 'string' || !allowedSet.has(value)) {
      continue;
    }

    if (!normalized.includes(value as T)) {
      normalized.push(value as T);
    }
  }

  return normalized;
}

function normalizeExplicitModules<T extends string>(
  value: Prisma.JsonValue | null | undefined,
  allowed: readonly T[],
) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Array.isArray(value)) {
    return [] as T[];
  }

  return uniqueStrings(value, allowed);
}

function resolveConfiguredModules<T extends string>(
  value: Prisma.JsonValue | null | undefined,
  allowed: readonly T[],
  fallback: readonly T[],
) {
  const explicit = normalizeExplicitModules(value, allowed);
  if (explicit === null) {
    return [...fallback];
  }

  return explicit;
}

export function isSuperAdminId(userId: number | null | undefined) {
  return userId === 1;
}

export function getConfiguredAdminDashboardModules(
  value: Prisma.JsonValue | null | undefined,
  fallback: readonly AdminDashboardModule[] = ADMIN_DASHBOARD_MODULES,
) {
  return resolveConfiguredModules(
    value,
    ADMIN_DASHBOARD_MODULES,
    fallback,
  );
}

export function getConfiguredAuthorDashboardModules(
  value: Prisma.JsonValue | null | undefined,
  fallback: readonly AuthorDashboardModule[] = AUTHOR_DASHBOARD_MODULES,
) {
  return resolveConfiguredModules(
    value,
    AUTHOR_DASHBOARD_MODULES,
    fallback,
  );
}

export function getRoleDefaultAdminDashboardModules(
  value: Prisma.JsonValue | null | undefined,
) {
  return resolveConfiguredModules(
    value,
    ADMIN_DASHBOARD_MODULES,
    ADMIN_DASHBOARD_MODULES,
  );
}

export function getRoleDefaultAuthorDashboardModules(
  value: Prisma.JsonValue | null | undefined,
) {
  return resolveConfiguredModules(
    value,
    AUTHOR_DASHBOARD_MODULES,
    AUTHOR_DASHBOARD_MODULES,
  );
}

export function getExplicitAdminDashboardModules(
  value: Prisma.JsonValue | null | undefined,
) {
  return normalizeExplicitModules(value, ADMIN_DASHBOARD_MODULES);
}

export function getExplicitAuthorDashboardModules(
  value: Prisma.JsonValue | null | undefined,
) {
  return normalizeExplicitModules(value, AUTHOR_DASHBOARD_MODULES);
}

export function resolveDashboardAccess(
  source: DashboardAccessSource,
  defaults?: DashboardRoleDefaults,
): DashboardAccess {
  if (isSuperAdminId(source.id)) {
    return {
      isSuperAdmin: true,
      adminDashboardModules: [...ADMIN_DASHBOARD_MODULES],
      authorDashboardModules: [...AUTHOR_DASHBOARD_MODULES],
      hasDashboardAccess: true,
    };
  }

  const configuredAdminModules = resolveConfiguredModules(
    source.adminDashboardModules,
    ADMIN_DASHBOARD_MODULES,
    defaults?.adminDashboardModules ?? ADMIN_DASHBOARD_MODULES,
  );
  const configuredAuthorModules = resolveConfiguredModules(
    source.authorDashboardModules,
    AUTHOR_DASHBOARD_MODULES,
    defaults?.authorDashboardModules ?? AUTHOR_DASHBOARD_MODULES,
  );

  const adminDashboardModules =
    source.role === Role.ADMIN ? configuredAdminModules : [];
  const authorDashboardModules =
    source.role === Role.AUTHOR ? configuredAuthorModules : [];

  return {
    isSuperAdmin: false,
    adminDashboardModules,
    authorDashboardModules,
    hasDashboardAccess:
      adminDashboardModules.length > 0 || authorDashboardModules.length > 0,
  };
}

export function hasDashboardModuleAccess(
  access: DashboardAccess,
  requiredModules: readonly DashboardAccessModule[],
) {
  const allowedModules = new Set<DashboardAccessModule>([
    ...access.adminDashboardModules,
    ...access.authorDashboardModules,
  ]);

  return requiredModules.some((module) => allowedModules.has(module));
}
