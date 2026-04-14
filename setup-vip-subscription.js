#!/usr/bin/env node
/**
 * Helper script to setup or fix VipSubscription records
 * Usage: node setup-vip-subscription.js --userId=123 --packageType=vip_permanent [--activate]
 */

const args = process.argv.slice(2);
const config = {};

args.forEach((arg) => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  config[key] = value || true;
});

console.log('VIP Subscription Setup Helper');
console.log('============================\n');

if (!config.userId) {
  console.error(
    'Usage: node setup-vip-subscription.js --userId=123 --packageType=vip_permanent [--activate]',
  );
  console.error('');
  console.error('Options:');
  console.error('  --userId=N         User ID (required)');
  console.error('  --packageType=TYPE Package type (default: vip_permanent)');
  console.error('  --activate         Activate the subscription (default: false)');
  console.error('  --vipLevelId=N     VIP Level ID (default: 9 for permanent)');
  console.error('');
  console.error('Examples:');
  console.error('  node setup-vip-subscription.js --userId=5');
  console.error('  node setup-vip-subscription.js --userId=5 --packageType=vip_2_months --activate');
  process.exit(1);
}

const userId = parseInt(config.userId);
const packageType = config.packageType || 'vip_permanent';
const isActive = config.activate || false;
const vipLevelId = parseInt(config.vipLevelId) || (packageType.includes('permanent') ? 9 : 1);

const SQL = {
  check: `SELECT id, userId, packageType, isActive FROM vip_subscriptions WHERE userId = ${userId};`,

  create: `
INSERT INTO vip_subscriptions 
  (userId, vipLevelId, packageType, isActive, purchaseDate, expiresAt)
VALUES
  (${userId}, ${vipLevelId}, '${packageType}', ${isActive ? 'true' : 'false'}, NOW(), null);
  `,

  updateActivate: `
UPDATE vip_subscriptions
SET isActive = true
WHERE userId = ${userId};
  `,
};

console.log('Configuration:');
console.log(`  User ID: ${userId}`);
console.log(`  Package Type: ${packageType}`);
console.log(`  VIP Level ID: ${vipLevelId}`);
console.log(`  Activate: ${isActive}`);
console.log('\n1. First, check if record exists:\n');
console.log(SQL.check);
console.log('\n2. If exists and inactive, activate with:\n');
console.log(SQL.updateActivate);
console.log('\n3. If does not exist, create with:\n');
console.log(SQL.create);
console.log('\nAfter running these queries, restart the backend:');
console.log('  npm run build --workspace api');
