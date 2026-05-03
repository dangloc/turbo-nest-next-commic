export interface GifAsset {
  id: number;
  url: string;
  previewUrl: string;
  keyword: string;
  category: string;
  width: number;
  height: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GifAssetListResponse {
  items: GifAsset[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateGifAssetInput {
  url: string;
  previewUrl: string;
  keyword: string;
  category: string;
  width: number;
  height: number;
}

export const GIF_CATEGORIES = [
  "reactions",
  "greetings",
  "celebratory",
  "animals",
  "memes",
  "food",
  "other",
] as const;

export type GifCategory = (typeof GIF_CATEGORIES)[number];
