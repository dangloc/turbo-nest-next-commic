import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, normalize, resolve, sep } from 'node:path';

function resolveFromRuntime(filePath: string): string {
  if (isAbsolute(filePath)) {
    return filePath;
  }

  const normalizedPath = normalize(filePath);
  const cwd = normalize(process.cwd());
  const appApiPrefix = `apps${sep}api${sep}`;

  if (
    cwd.endsWith(`${sep}apps${sep}api`) &&
    normalizedPath.startsWith(appApiPrefix)
  ) {
    return resolve(cwd, normalizedPath.slice(appApiPrefix.length));
  }

  return resolve(cwd, normalizedPath);
}

export function loadTransactionUserOverrides(
  path: string,
): Map<number, number> {
  const resolved = resolveFromRuntime(path);
  if (!existsSync(resolved)) {
    return new Map<number, number>();
  }

  const raw = JSON.parse(readFileSync(resolved, 'utf8')) as Record<
    string,
    unknown
  >;
  const out = new Map<number, number>();

  for (const [txIdRaw, userIdRaw] of Object.entries(raw)) {
    const txId = Number(txIdRaw);
    const userId = Number(userIdRaw);
    if (
      Number.isInteger(txId) &&
      txId > 0 &&
      Number.isInteger(userId) &&
      userId > 0
    ) {
      out.set(txId, userId);
    }
  }

  return out;
}
