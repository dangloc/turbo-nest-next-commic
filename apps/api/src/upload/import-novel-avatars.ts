import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { optimizeAndSaveImage } from './image-optimizer';

const SUPPORTED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
]);

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

type CliOptions = {
  dryRun: boolean;
  skipExisting: boolean;
  sourceDir?: string;
};

type AvatarFile = {
  novelId: number;
  path: string;
  name: string;
  extension: string;
  size: number;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    skipExisting: false,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--skip-existing') {
      options.skipExisting = true;
    } else if (arg.startsWith('--source=')) {
      options.sourceDir = arg.slice('--source='.length);
    } else if (!options.sourceDir) {
      options.sourceDir = arg;
    }
  }

  return options;
}

function applyEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separator = trimmed.indexOf('=');
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    if (process.env[key] !== undefined) {
      continue;
    }

    const rawValue = trimmed.slice(separator + 1).trim();
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

function loadDatabaseUrl(): string {
  applyEnvFile(path.resolve(process.cwd(), '.env'));
  applyEnvFile(path.resolve(process.cwd(), '..', '..', '.env'));

  if (!process.env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL. Add it to apps/api/.env or root .env.');
  }

  return process.env.DATABASE_URL;
}

function createPrismaClient(databaseUrl: string): PrismaClient {
  const PrismaCtor = PrismaClient as unknown as new (args: {
    datasources: { db: { url: string } };
  }) => PrismaClient;

  return new PrismaCtor({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
}

function resolveSourceDir(options: CliOptions, initialCwd: string): string {
  if (options.sourceDir) {
    return path.resolve(initialCwd, options.sourceDir);
  }

  const candidates = [
    path.resolve(initialCwd, 'avata_novels'),
    path.resolve(process.cwd(), '..', '..', 'avata_novels'),
  ];

  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  if (!existing) {
    throw new Error(
      `Cannot find avata_novels folder. Checked: ${candidates.join(', ')}`,
    );
  }

  return existing;
}

function parseNovelId(filename: string): number | null {
  const extension = path.extname(filename);
  const basename = path.basename(filename, extension);
  if (!/^\d+$/.test(basename)) {
    return null;
  }

  const id = Number(basename);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function readAvatarFiles(sourceDir: string): {
  files: AvatarFile[];
  invalidNames: string[];
  unsupportedFiles: string[];
} {
  const files: AvatarFile[] = [];
  const invalidNames: string[] = [];
  const unsupportedFiles: string[] = [];

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      unsupportedFiles.push(entry.name);
      continue;
    }

    const novelId = parseNovelId(entry.name);
    if (!novelId) {
      invalidNames.push(entry.name);
      continue;
    }

    const filePath = path.join(sourceDir, entry.name);
    const stat = fs.statSync(filePath);
    files.push({
      novelId,
      path: filePath,
      name: entry.name,
      extension,
      size: stat.size,
    });
  }

  files.sort((a, b) => a.novelId - b.novelId || a.name.localeCompare(b.name));
  return { files, invalidNames, unsupportedFiles };
}

function formatBytes(value: number): string {
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

async function run(): Promise<void> {
  const initialCwd = process.cwd();
  const apiRoot = path.resolve(__dirname, '..', '..');
  process.chdir(apiRoot);

  const options = parseArgs(process.argv.slice(2));
  const sourceDir = resolveSourceDir(options, initialCwd);
  const { files, invalidNames, unsupportedFiles } = readAvatarFiles(sourceDir);
  const databaseUrl = loadDatabaseUrl();
  const prisma = createPrismaClient(databaseUrl);

  await prisma.$connect();
  try {
    const novelIds = Array.from(new Set(files.map((file) => file.novelId)));
    const novels = await prisma.novel.findMany({
      where: { id: { in: novelIds } },
      select: { id: true, title: true, featuredImage: true },
    });
    const novelMap = new Map(novels.map((novel) => [novel.id, novel]));
    const missingNovelIds = novelIds.filter((id) => !novelMap.has(id));
    const importableFiles = files.filter((file) => {
      const novel = novelMap.get(file.novelId);
      return novel && (!options.skipExisting || !novel.featuredImage);
    });
    const skippedExisting = files.filter((file) => {
      const novel = novelMap.get(file.novelId);
      return Boolean(novel?.featuredImage && options.skipExisting);
    });

    console.log(`Source folder: ${sourceDir}`);
    console.log(`Image files found: ${files.length}`);
    console.log(`Matching novels: ${novels.length}`);
    console.log(`Missing novels: ${missingNovelIds.length}`);
    console.log(`Invalid filenames: ${invalidNames.length}`);
    console.log(`Unsupported files: ${unsupportedFiles.length}`);
    console.log(`Skipped existing: ${skippedExisting.length}`);
    console.log(`Importable files: ${importableFiles.length}`);

    if (options.dryRun) {
      if (missingNovelIds.length) {
        console.log(
          `Missing novel IDs: ${missingNovelIds.slice(0, 30).join(', ')}${
            missingNovelIds.length > 30 ? ', ...' : ''
          }`,
        );
      }
      return;
    }

    let updated = 0;
    let failed = 0;
    let originalBytes = 0;
    let optimizedBytes = 0;
    const failures: Array<{ file: string; novelId: number; error: string }> = [];

    for (const file of importableFiles) {
      try {
        const input = fs.readFileSync(file.path);
        const result = await optimizeAndSaveImage(
          {
            buffer: input,
            size: file.size,
            mimetype: MIME_TYPES[file.extension],
          },
          'featured',
          { filenameBase: String(file.novelId) },
        );

        await prisma.novel.update({
          where: { id: file.novelId },
          data: { featuredImage: result.url },
        });

        updated += 1;
        originalBytes += result.originalSize;
        optimizedBytes += result.optimizedSize;

        if (updated % 25 === 0 || updated === importableFiles.length) {
          console.log(`Updated ${updated}/${importableFiles.length} novels...`);
        }
      } catch (error) {
        failed += 1;
        failures.push({
          file: file.name,
          novelId: file.novelId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const report = {
      generatedAt: new Date().toISOString(),
      sourceDir,
      dryRun: false,
      filesFound: files.length,
      matchingNovels: novels.length,
      missingNovelIds,
      invalidNames,
      unsupportedFiles,
      skippedExisting: skippedExisting.map((file) => file.name),
      updated,
      failed,
      originalBytes,
      optimizedBytes,
      originalSize: formatBytes(originalBytes),
      optimizedSize: formatBytes(optimizedBytes),
      failures,
    };
    const reportPath = path.resolve(process.cwd(), 'tmp', 'novel-avatar-import-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`Updated novels: ${updated}`);
    console.log(`Failed files: ${failed}`);
    console.log(`Original total: ${formatBytes(originalBytes)}`);
    console.log(`Optimized total: ${formatBytes(optimizedBytes)}`);
    console.log(`Report: ${reportPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Novel avatar import failed: ${message}`);
  process.exitCode = 1;
});
