import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, normalize, resolve, sep } from 'node:path';
import type { QuarantineEntry } from './types';

function normalizeQuarantinePath(filePath: string): string {
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

export class QuarantineRepository {
  private readonly entries: QuarantineEntry[] = [];

  add(entry: Omit<QuarantineEntry, 'createdAt'>): void {
    this.entries.push({
      ...entry,
      createdAt: new Date().toISOString(),
    });
  }

  hasUser(sourceUserId: number): boolean {
    return this.entries.some((entry) => entry.sourceUserId === sourceUserId);
  }

  all(): QuarantineEntry[] {
    return [...this.entries];
  }

  async persist(filePath: string): Promise<void> {
    const outputPath = normalizeQuarantinePath(filePath);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(this.entries, null, 2), 'utf8');
  }
}
