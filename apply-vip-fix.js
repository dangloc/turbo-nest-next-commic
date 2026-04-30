#!/usr/bin/env node
/**
 * Applies the VIP permanence detection fix to finance.service.ts
 * Changes:
 * 1. Adds legacy package types ('permanent', 'lifetime') to VIP_ACCESS_PACKAGES
 * 2. Adds vipLevelId to the vipSubscription query select
 * 3. Updates hasVipReaderAccess logic to handle case-insensitive comparison and legacy level IDs
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/api/src/finance/finance.service.ts');

console.log('Reading finance.service.ts...');
let content = fs.readFileSync(filePath, 'utf8');

// ============================================================================
// PART 1: Expand VIP_ACCESS_PACKAGES
// ============================================================================
console.log('\n[1/3] Expanding VIP_ACCESS_PACKAGES to include legacy values...');

const part1Old = `const VIP_ACCESS_PACKAGES = new Set([
  'vip_2_months',
  'vip_3_months',
  'vip_permanent',
]);`;

const part1New = `const VIP_ACCESS_PACKAGES = new Set([
  'vip_2_months',
  'vip_3_months',
  'vip_permanent',
  'permanent',
  'lifetime',
]);`;

if (content.includes(part1Old)) {
  content = content.replace(part1Old, part1New);
  console.log('      ✓ Added permanent and lifetime to VIP_ACCESS_PACKAGES');
} else {
  console.error('      ✗ ERROR: Could not find VIP_ACCESS_PACKAGES pattern');
  console.error('         Pattern searched:');
  console.error(part1Old);
  process.exit(1);
}

// ============================================================================
// PART 2: Add vipLevelId to select
// ============================================================================
console.log('\n[2/3] Adding vipLevelId to vipSubscription query...');

const part2Old = `const vipSubscription =
      userId && userId > 0
        ? await tx.vipSubscription.findUnique({
            where: { userId },
            select: {
              packageType: true,
              isActive: true,
              expiresAt: true,
            },
          })
        : null;`;

const part2New = `const vipSubscription =
      userId && userId > 0
        ? await tx.vipSubscription.findUnique({
            where: { userId },
            select: {
              packageType: true,
              isActive: true,
              expiresAt: true,
              vipLevelId: true,
            },
          })
        : null;`;

if (content.includes(part2Old)) {
  content = content.replace(part2Old, part2New);
  console.log('      ✓ Added vipLevelId to query select');
} else {
  console.error('      ✗ ERROR: Could not find vipSubscription select pattern');
  process.exit(1);
}

// ============================================================================
// PART 3: Update hasVipReaderAccess logic
// ============================================================================
console.log('\n[3/3] Updating hasVipReaderAccess logic for legacy support...');

const part3Old = `const hasVipReaderAccess = Boolean(
      vipSubscription &&
      vipSubscription.isActive &&
      VIP_ACCESS_PACKAGES.has(vipSubscription.packageType) &&
      (vipSubscription.packageType === 'vip_permanent' ||
        (vipSubscription.expiresAt !== null &&
          vipSubscription.expiresAt.getTime() > Date.now())),
    );`;

const part3New = `const hasVipReaderAccess = Boolean(
      vipSubscription &&
      vipSubscription.isActive &&
      (() => {
        const pkgType = (vipSubscription.packageType ?? '').toLowerCase();
        // Check for permanent VIP: modern names, legacy names, or level 9
        const isPermanent =
          pkgType.includes('permanent') ||
          pkgType.includes('lifetime') ||
          vipSubscription.vipLevelId === 9;
        // Check for time-limited VIP that hasn't expired
        const isTimeBasedValid =
          VIP_ACCESS_PACKAGES.has(pkgType) &&
          vipSubscription.expiresAt !== null &&
          vipSubscription.expiresAt.getTime() > Date.now();
        return isPermanent || isTimeBasedValid;
      })(),
    );`;

if (content.includes(part3Old)) {
  content = content.replace(part3Old, part3New);
  console.log('      ✓ Updated hasVipReaderAccess with legacy support');
} else {
  console.error('      ✗ ERROR: Could not find hasVipReaderAccess pattern');
  process.exit(1);
}

// ============================================================================
// Write file
// ============================================================================
console.log('\n[✓] Writing changes to file...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('\n' + '='.repeat(70));
console.log('SUCCESS: All VIP permanence fixes applied!');
console.log('='.repeat(70));
console.log('\nChanges made:');
console.log('  1. VIP_ACCESS_PACKAGES now includes legacy types');
console.log('  2. vipSubscription query now fetches vipLevelId');
console.log('  3. hasVipReaderAccess logic now supports:');
console.log('     - Case-insensitive package type matching');
console.log('     - Legacy permanent/lifetime package names');
console.log('     - Level ID fallback (id === 9)');
console.log('\nNext steps:');
console.log('  npm run build --workspace api');
console.log('  npm run check-types --workspace api');
