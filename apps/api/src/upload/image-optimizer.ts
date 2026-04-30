import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

const WEBP_QUALITY = 80;

export type UploadKind = 'avatar' | 'featured' | 'banner';

type ImageProfile = {
  segments: string[];
  maxWidth: number;
  maxHeight: number;
};

const IMAGE_PROFILES: Record<UploadKind, ImageProfile> = {
  avatar: {
    segments: ['users', 'avatars'],
    maxWidth: 512,
    maxHeight: 512,
  },
  featured: {
    segments: ['novels', 'featured'],
    maxWidth: 1200,
    maxHeight: 1800,
  },
  banner: {
    segments: ['novels', 'banners'],
    maxWidth: 1920,
    maxHeight: 1080,
  },
};

export type OptimizableImage = {
  buffer?: Buffer;
  size: number;
  mimetype: string;
};

export type OptimizedImageResult = {
  url: string;
  originalSize: number;
  optimizedSize: number;
};

type OptimizeOptions = {
  filenameBase?: string;
};

function monthYearFolder(...segments: string[]): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const dir = path.join(
    process.cwd(),
    'uploads',
    ...segments,
    String(year),
    month,
  );
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeFilenameBase(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+|-+$/g, '');
}

function uniqueFilename(filenameBase?: string): string {
  const safeBase = filenameBase ? safeFilenameBase(filenameBase) : '';
  if (safeBase) {
    return `${safeBase}.webp`;
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.webp`;
}

export function imageFilter(
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, accept: boolean) => void,
) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(
      new BadRequestException(
        'Only JPEG, PNG, WebP, and GIF images are accepted',
      ),
      false,
    );
    return;
  }
  cb(null, true);
}

function toPublicUrl(filePath: string): string {
  const uploadsRoot = path.join(process.cwd(), 'uploads');
  const relative = path.relative(uploadsRoot, filePath).replace(/\\/g, '/');
  return `/uploads/${relative}`;
}

export async function optimizeAndSaveImage(
  file: OptimizableImage,
  kind: UploadKind,
  options: OptimizeOptions = {},
): Promise<OptimizedImageResult> {
  if (!file.buffer?.length) {
    throw new BadRequestException('File buffer is empty');
  }

  const profile = IMAGE_PROFILES[kind];
  const outputDir = monthYearFolder(...profile.segments);
  const outputPath = path.join(outputDir, uniqueFilename(options.filenameBase));

  let output: Buffer;
  try {
    output = await sharp(file.buffer, {
      animated: file.mimetype === 'image/gif',
      failOn: 'warning',
    })
      .rotate()
      .resize({
        width: profile.maxWidth,
        height: profile.maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({
        quality: WEBP_QUALITY,
        effort: 4,
      })
      .toBuffer();
  } catch {
    throw new BadRequestException('Uploaded file is not a valid image');
  }

  fs.writeFileSync(outputPath, output);

  return {
    url: toPublicUrl(outputPath),
    originalSize: file.size,
    optimizedSize: output.length,
  };
}
