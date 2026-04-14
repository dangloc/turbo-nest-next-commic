const fs = require('fs');
const filePath = 'apps/api/src/finance/finance.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Add debug logging after vipSubscription is fetched
const oldVipLogic = `    const vipSubscription =
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
        : null;

    const hasVipReaderAccess = Boolean(`;

const newVipLogic = `    const vipSubscription =
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
        : null;

    // DEBUG: Log VIP subscription data
    if (userId && userId > 0) {
      console.log('[VIP-DEBUG] User:', userId);
      console.log('[VIP-DEBUG] VIP Subscription:', vipSubscription);
    }

    const hasVipReaderAccess = Boolean(`;

if (content.includes(oldVipLogic)) {
  content = content.replace(oldVipLogic, newVipLogic);
  console.log('✓ Added debug logging for VIP subscription');
} else {
  console.error('✗ Could not find vipSubscription pattern for logging');
  process.exit(1);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✓ Debug logging added to finance.service.ts');
