import { shouldSkipUser } from './idempotence';
import { parseVipPackage } from './parse-wordpress';
import type { QuarantineRepository } from './quarantine-repository';
import type { SourceVipRow } from './types';

export type VipUpsertInput = {
  userId: number;
  vipLevelId: number;
  packageType: string;
  isActive: boolean;
  purchaseDate: Date;
  expiresAt: Date | null;
};

export interface VipRepo {
  upsert(input: VipUpsertInput): Promise<void>;
}

function derivePackageType(
  packageType: string,
  vipLevelId: number,
  isActive: boolean,
): string {
  if (packageType && packageType !== 'unknown') {
    return packageType;
  }
  if (vipLevelId > 0) {
    return `vip_level_${vipLevelId}`;
  }
  return isActive ? 'vip_active_unknown' : 'vip_inactive';
}

function deriveExpiryDate(
  packageType: string,
  purchaseDate: Date,
  expiresAt: Date | null,
): Date | null {
  if (expiresAt) return expiresAt;
  if (purchaseDate.getTime() <= 0) return null;

  if (packageType.includes('2_month')) {
    const out = new Date(purchaseDate);
    out.setUTCMonth(out.getUTCMonth() + 1);
    return out;
  }

  if (packageType.includes('3_month')) {
    const out = new Date(purchaseDate);
    out.setUTCMonth(out.getUTCMonth() + 2);
    return out;
  }

  return null;
}

export async function migrateVipSubscriptions(
  rows: SourceVipRow[],
  deps: {
    repo: VipRepo;
    quarantinedUserIds: Set<number>;
    quarantineRepo: QuarantineRepository;
  },
): Promise<{ vipUpserted: number; skippedUsers: number }> {
  let vipUpserted = 0;
  let skippedUsers = 0;

  for (const row of rows) {
    if (shouldSkipUser(row.userId, deps.quarantinedUserIds)) {
      skippedUsers += 1;
      continue;
    }

    const parsed = parseVipPackage(row.userId, row.vipPackageRaw);
    if (!parsed.ok) {
      deps.quarantineRepo.add({
        sourceUserId: row.userId,
        field: 'vip_package',
        reason: parsed.failure.reason,
        raw: parsed.failure.raw,
      });
      skippedUsers += 1;
      continue;
    }

    const vipLevelId =
      parsed.value.vipLevelId > 0
        ? parsed.value.vipLevelId
        : row.vipLevelId > 0
          ? row.vipLevelId
          : parsed.value.isActive
            ? 1
            : 0;

    if (vipLevelId <= 0) {
      if (parsed.value.isActive) {
        deps.quarantineRepo.add({
          sourceUserId: row.userId,
          field: 'vip_package',
          reason: 'Active VIP package did not contain a valid vip level',
          raw: row.vipPackageRaw,
        });
      }
      skippedUsers += 1;
      continue;
    }

    const packageType = derivePackageType(
      parsed.value.packageType,
      vipLevelId,
      parsed.value.isActive,
    );

    const expiresAt = deriveExpiryDate(
      packageType,
      parsed.value.purchaseDate,
      parsed.value.expiresAt,
    );

    await deps.repo.upsert({
      userId: row.userId,
      vipLevelId,
      packageType,
      isActive: parsed.value.isActive,
      purchaseDate: parsed.value.purchaseDate,
      expiresAt,
    });
    vipUpserted += 1;
  }

  return { vipUpserted, skippedUsers };
}
