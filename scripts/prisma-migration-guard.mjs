#!/usr/bin/env node
import { execSync } from 'node:child_process';

function run(command) {
  return execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function tryRun(command) {
  try {
    return run(command);
  } catch {
    return '';
  }
}

const schemaPath = 'apps/api/prisma/schema.prisma';
const migrationGlob = 'apps/api/prisma/migrations/**/migration.sql';

const explicitBase = process.argv.find((arg) => arg.startsWith('--base='))?.split('=')[1];
const envBase = process.env.SCHEMA_GUARD_BASE_REF || process.env.GITHUB_BASE_REF;
const baseCandidate = explicitBase || envBase || 'HEAD~1';

const baseExists = tryRun(`git rev-parse --verify ${baseCandidate}`);
if (!baseExists) {
  console.log(`[prisma-guard] Base ref ${baseCandidate} not found. Skipping guard.`);
  process.exit(0);
}

const schemaChanges = tryRun(`git diff --name-only ${baseCandidate}...HEAD -- ${schemaPath}`)
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

if (schemaChanges.length === 0) {
  console.log('[prisma-guard] No Prisma schema changes detected.');
  process.exit(0);
}

const migrationChanges = tryRun(`git diff --name-only ${baseCandidate}...HEAD -- ${migrationGlob}`)
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

if (migrationChanges.length === 0) {
  console.error('[prisma-guard] ERROR: schema.prisma changed but no migration.sql file changed.');
  console.error('[prisma-guard] Add a Prisma migration under apps/api/prisma/migrations/<timestamp>_<name>/migration.sql');
  process.exit(1);
}

console.log('[prisma-guard] OK: schema and migration changes are present.');
for (const file of migrationChanges) {
  console.log(`[prisma-guard] migration: ${file}`);
}
