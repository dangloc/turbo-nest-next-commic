import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export interface CreateGifAssetInput {
  url: string;
  previewUrl: string;
  keyword: string;
  category: string;
  width: number;
  height: number;
}

export interface ListGifAssetsQuery {
  keyword?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class GifAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateGifAssetInput) {
    this.validateInput(input);

    return this.prisma.gifAsset.create({
      data: {
        url: input.url.trim(),
        previewUrl: input.previewUrl.trim(),
        keyword: input.keyword.trim().toLowerCase(),
        category: input.category.trim().toLowerCase(),
        width: Math.floor(Number(input.width)),
        height: Math.floor(Number(input.height)),
      },
    });
  }

  async listAdmin(query: ListGifAssetsQuery) {
    const where = this.buildWhere(query, false);
    const page = this.safePage(query.page);
    const pageSize = this.safePageSize(query.pageSize);

    const [total, items] = await Promise.all([
      this.prisma.gifAsset.count({ where }),
      this.prisma.gifAsset.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { items, total, page, pageSize };
  }

  async listPublic(query: ListGifAssetsQuery) {
    const where = this.buildWhere(query, true);
    return this.prisma.gifAsset.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
    });
  }

  async delete(id: number) {
    await this.ensureExists(id);
    await this.prisma.gifAsset.delete({ where: { id } });
    return { success: true };
  }

  async toggleActive(id: number) {
    const gif = await this.ensureExists(id);
    return this.prisma.gifAsset.update({
      where: { id },
      data: { isActive: !gif.isActive },
    });
  }

  private buildWhere(query: ListGifAssetsQuery, activeOnly: boolean) {
    const where: Record<string, unknown> = {};

    if (activeOnly) {
      where['isActive'] = true;
    }

    if (query.keyword?.trim()) {
      where['keyword'] = { contains: query.keyword.trim().toLowerCase() };
    }

    if (query.category?.trim()) {
      where['category'] = query.category.trim().toLowerCase();
    }

    return where;
  }

  private async ensureExists(id: number) {
    const gif = await this.prisma.gifAsset.findUnique({ where: { id } });
    if (!gif) throw new NotFoundException('GIF not found');
    return gif;
  }

  private validateInput(input: CreateGifAssetInput) {
    this.validateHttpsUrl(input.url, 'url');
    this.validateHttpsUrl(input.previewUrl, 'previewUrl');

    if (!input.keyword?.trim()) {
      throw new BadRequestException('keyword is required');
    }

    if (input.keyword.trim().length > 100) {
      throw new BadRequestException('keyword must be 100 characters or fewer');
    }

    if (!input.category?.trim()) {
      throw new BadRequestException('category is required');
    }

    const width = Number(input.width);
    const height = Number(input.height);

    if (!Number.isInteger(width) || width <= 0 || width > 4096) {
      throw new BadRequestException('width must be a positive integer ≤ 4096');
    }

    if (!Number.isInteger(height) || height <= 0 || height > 4096) {
      throw new BadRequestException('height must be a positive integer ≤ 4096');
    }
  }

  private validateHttpsUrl(url: string, field: string) {
    if (!url?.trim()) {
      throw new BadRequestException(`${field} is required`);
    }

    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      throw new BadRequestException(`${field} must be a valid URL`);
    }

    if (parsed.protocol !== 'https:') {
      throw new BadRequestException(`${field} must use HTTPS`);
    }
  }

  private safePage(page?: number) {
    return Math.max(1, Math.floor(Number(page) || 1));
  }

  private safePageSize(pageSize?: number) {
    return Math.min(50, Math.max(1, Math.floor(Number(pageSize) || 20)));
  }
}
